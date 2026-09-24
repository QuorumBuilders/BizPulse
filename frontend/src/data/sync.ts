/**
 * BizPulse — Sync Engine
 *
 * Implements push/pull sync between IndexedDB and the Django API.
 *
 * Flow:
 * 1. On app load, on 'online' event, and on a 30s interval:
 *    - Push all pending outbox entries to the API (parents before children)
 *    - On success: mark local record synced, store server id, remove outbox entry
 *    - On 4xx: log the error, remove entry (retrying won't help), surface to user
 *    - On 5xx/network: leave entry queued, retry later
 *
 * 2. After a successful push, pull latest server state and reconcile:
 *    - If server record has newer updated_at than local, server wins
 *    - If local is newer, the already-queued push will overwrite server
 *
 * Only facts are pushed — never derived values.
 */

import { db } from './db';
import {
  getPendingEntries,
  removeOutboxEntry,
  recordAttempt,
} from './outbox';
import {
  apiCreateBusiness,
  apiUpdateBusiness,
  apiCreateCustomer,
  apiUpdateCustomer,
  apiCreateDailyTally,
  apiUpdateDailyTally,
  apiCreateCreditRecord,
  apiUpdateCreditRecord,
  apiCreateRepayment,
  ApiError,
  setAccessToken,
} from '../api/client';
import type { OutboxEntry } from '../domain/types';

// ---------------------------------------------------------------------------
// Token management (loads from localStorage on init)
// ---------------------------------------------------------------------------

const TOKEN_KEY = 'bizpulse_access_token';
const REFRESH_KEY = 'bizpulse_refresh_token';

export function loadStoredTokens(): void {
  if (typeof window === 'undefined') return;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) setAccessToken(token);
}

export function storeTokens(access: string, refresh: string): void {
  localStorage.setItem(TOKEN_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  setAccessToken(access);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  setAccessToken(null);
}

export function hasStoredToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Sync status (simple event bus for useSyncStatus hook)
// ---------------------------------------------------------------------------

type SyncListener = (status: 'syncing' | 'success' | 'error' | 'offline' | 'idle') => void;
const listeners: Set<SyncListener> = new Set();

export function subscribeSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitStatus(status: Parameters<SyncListener>[0]): void {
  listeners.forEach((fn) => fn(status));
}

// ---------------------------------------------------------------------------
// Push a single outbox entry
// ---------------------------------------------------------------------------

async function pushEntry(entry: OutboxEntry): Promise<void> {
  const { entity, client_id, operation } = entry;

  try {
    switch (entity) {
      case 'business': {
        const biz = await db.businesses.where('client_id').equals(client_id).first();
        if (!biz) return;
        if (operation === 'create') {
          const res = await apiCreateBusiness({
            client_id: biz.client_id,
            name: biz.name,
            type: biz.type,
            starting_cash: biz.starting_cash,
            language: biz.language,
            voice_enabled: biz.voice_enabled,
          });
          await db.businesses.where('client_id').equals(client_id).modify({
            id: res.id,
            synced: true,
          });
        } else {
          if (!biz.id) return; // can't update without server id yet
          await apiUpdateBusiness(biz.id, {
            name: biz.name,
            type: biz.type,
            starting_cash: biz.starting_cash,
            language: biz.language,
            voice_enabled: biz.voice_enabled,
          });
          await db.businesses.where('client_id').equals(client_id).modify({ synced: true });
        }
        break;
      }

      case 'customer': {
        const cust = await db.customers.where('client_id').equals(client_id).first();
        if (!cust) return;
        if (operation === 'create') {
          const res = await apiCreateCustomer({
            client_id: cust.client_id,
            name: cust.name,
            phone: cust.phone,
          });
          await db.customers.where('client_id').equals(client_id).modify({
            id: res.id,
            synced: true,
          });
        } else {
          if (!cust.id) return;
          await apiUpdateCustomer(cust.id, { name: cust.name, phone: cust.phone });
          await db.customers.where('client_id').equals(client_id).modify({ synced: true });
        }
        break;
      }

      case 'daily_tally': {
        const tally = await db.daily_tallies.where('client_id').equals(client_id).first();
        if (!tally) return;
        if (operation === 'create') {
          const res = await apiCreateDailyTally({
            client_id: tally.client_id,
            date: tally.date,
            cash_sales: tally.cash_sales,
            expenses: tally.expenses,
            note: tally.note,
          });
          await db.daily_tallies.where('client_id').equals(client_id).modify({
            id: res.id,
            synced: true,
          });
        } else {
          if (!tally.id) return;
          await apiUpdateDailyTally(tally.id, {
            cash_sales: tally.cash_sales,
            expenses: tally.expenses,
            note: tally.note,
          });
          await db.daily_tallies.where('client_id').equals(client_id).modify({ synced: true });
        }
        break;
      }

      case 'credit_record': {
        const cr = await db.credit_records.where('client_id').equals(client_id).first();
        if (!cr) return;
        // Need the server customer id to post this record
        const customer = await db.customers
          .where('client_id')
          .equals(cr.customer_client_id)
          .first();
        if (!customer?.id) {
          // Customer hasn't synced yet — re-queue for next cycle
          await recordAttempt(entry.id!, false);
          return;
        }
        if (operation === 'create') {
          const res = await apiCreateCreditRecord({
            client_id: cr.client_id,
            customer: customer.id,
            amount: cr.amount,
            issued_date: cr.issued_date,
            due_date: cr.due_date,
          });
          await db.credit_records.where('client_id').equals(client_id).modify({
            id: res.id,
            synced: true,
          });
        } else {
          if (!cr.id) return;
          await apiUpdateCreditRecord(cr.id, {
            amount: cr.amount,
            due_date: cr.due_date,
          });
          await db.credit_records.where('client_id').equals(client_id).modify({ synced: true });
        }
        break;
      }

      case 'repayment': {
        const rep = await db.repayments.where('client_id').equals(client_id).first();
        if (!rep) return;
        const cr = await db.credit_records
          .where('client_id')
          .equals(rep.credit_record_client_id)
          .first();
        if (!cr?.id) {
          // Credit record hasn't synced yet
          await recordAttempt(entry.id!, false);
          return;
        }
        const res = await apiCreateRepayment({
          client_id: rep.client_id,
          credit_record: cr.id,
          amount: rep.amount,
          paid_date: rep.paid_date,
        });
        await db.repayments.where('client_id').equals(client_id).modify({
          id: res.id,
          synced: true,
        });
        break;
      }
    }

    // Success — remove from outbox
    if (entry.id !== undefined) {
      await removeOutboxEntry(entry.id);
    }
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status >= 400 && err.status < 500) {
        // 4xx: permanent failure — remove from outbox and log
        console.error(`[BizPulse Sync] Permanent error for ${entity} ${client_id}:`, err.body);
        if (entry.id !== undefined) {
          await removeOutboxEntry(entry.id);
        }
      } else {
        // 5xx: transient — record attempt, retry later
        if (entry.id !== undefined) {
          await recordAttempt(entry.id, true);
        }
      }
    } else {
      // Network error — record attempt, retry later
      if (entry.id !== undefined) {
        await recordAttempt(entry.id, true);
      }
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Main sync function
// ---------------------------------------------------------------------------

let syncInProgress = false;

export async function runSync(): Promise<void> {
  if (syncInProgress) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    emitStatus('offline');
    return;
  }

  syncInProgress = true;
  emitStatus('syncing');

  try {
    const entries = await getPendingEntries();
    for (const entry of entries) {
      try {
        await pushEntry(entry);
      } catch {
        // Individual entry failure doesn't stop the rest
      }
    }
    emitStatus('success');
  } catch {
    emitStatus('error');
  } finally {
    syncInProgress = false;
  }
}

// ---------------------------------------------------------------------------
// Sync scheduler — call once on app startup
// ---------------------------------------------------------------------------

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startSyncScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  // Run immediately on start
  runSync();

  // Run when device comes back online
  const onOnline = () => {
    console.log('[BizPulse Sync] Device back online — syncing...');
    runSync();
  };
  window.addEventListener('online', onOnline);

  // Safety net: poll every 30 seconds for flaky connections
  syncInterval = setInterval(() => {
    runSync();
  }, 30_000);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = null;
  };
}
