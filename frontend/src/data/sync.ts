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
  apiListCustomers,
  apiCreateCustomer,
  apiUpdateCustomer,
  apiListDailyTallies,
  apiCreateDailyTally,
  apiUpdateDailyTally,
  apiListCreditRecords,
  apiCreateCreditRecord,
  apiUpdateCreditRecord,
  apiListRepayments,
  apiCreateRepayment,
  ApiError,
  CustomerResponse,
} from '../api/client';
import { _setTokens as setTokensInStore, authLogout, getUser } from '../state/authStore';
import { generateClientId, nowISO } from './repositories/utils';
import { storeClientId, getUserKey, getBusiness as getBusinessRepo } from './repositories/businessRepo';
import type { OutboxEntry, Business } from '../domain/types';


const REFRESH_KEY = 'bp_refresh_token';

export function loadStoredTokens(): void {
  // No-op: authStore.hydrateAuth() handles token hydration on boot.
}

export function storeTokens(access: string, refresh: string): void {
  setTokensInStore({ access, refresh });
}

export function clearTokens(): void {
  authLogout();
}

export function hasStoredToken(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem(REFRESH_KEY);
}

type SyncListener = (status: 'syncing' | 'success' | 'error' | 'offline' | 'idle') => void;
const listeners: Set<SyncListener> = new Set();

export function subscribeSyncStatus(fn: SyncListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emitStatus(status: Parameters<SyncListener>[0]): void {
  listeners.forEach((fn) => fn(status));
}

async function pushEntry(entry: OutboxEntry): Promise<void> {
  const { entity, client_id, operation } = entry;

  try {
    // Ownership check: only push entries that belong to the current user and business
    const currentUser = getUser();
    if (!currentUser) {
      // Unauthenticated session — leave queued until user logs in
      return;
    }
    const currentUserKey = getUserKey(currentUser);

    // 1. Verify User Identity
    if (entry.user_id && String(entry.user_id) !== currentUserKey) {
      // Entry belongs to a different user — do NOT push, leave queued
      return;
    }

    // 2. Verify Business Identity & Client ID
    const currentBiz = await getBusinessRepo(currentUser);
    if (!currentBiz) {
      // Active business not loaded yet — leave queued
      return;
    }

    if (entry.business_client_id && entry.business_client_id !== currentBiz.client_id) {
      // Entry belongs to a different business client_id — do NOT push, leave queued
      return;
    }

    if (entry.business_id && currentBiz.id && entry.business_id !== currentBiz.id) {
      // Entry belongs to a different server business ID — do NOT push, leave queued
      return;
    }

    if (entity !== 'business' && !currentBiz?.id) {
      if (entry.id !== undefined) {
        await recordAttempt(entry.id, false);
      }
      return;
    }

    switch (entity) {
      case 'business': {
        const biz = await db.businesses.where('client_id').equals(client_id).first();
        if (!biz) return;
        if (operation === 'create') {
          const res = await apiCreateBusiness({
            name: biz.name,
            starting_cash: biz.starting_cash,
          });
          await db.businesses.where('client_id').equals(client_id).modify({
            id: res.id,
            synced: true,
          });
          storeClientId(currentUserKey, res.id, client_id);
        } else {
          if (!biz.id) return;
          await apiUpdateBusiness(biz.id, {
            name: biz.name,
          });
          await db.businesses.where('client_id').equals(client_id).modify({ synced: true });
        }
        break;
      }

      case 'customer': {
        const cust = await db.customers.where('client_id').equals(client_id).first();
        if (!cust || !currentBiz?.id) return;
        // Use currentBiz from ownership-checked lookup
        if (operation === 'create') {
          const res = await apiCreateCustomer(currentBiz.id, {
            name: cust.name,
            phone: cust.phone,
          });
          await db.customers.where('client_id').equals(client_id).modify({
            id: res.id,
            synced: true,
          });
        } else {
          if (!cust.id) return;
          await apiUpdateCustomer(currentBiz.id, cust.id, { name: cust.name, phone: cust.phone });
          await db.customers.where('client_id').equals(client_id).modify({ synced: true });
        }
        break;
      }

      case 'daily_tally': {
        const tally = await db.daily_tallies.where('client_id').equals(client_id).first();
        if (!tally || !currentBiz?.id) return;
        if (operation === 'create') {
          try {
            const res = await apiCreateDailyTally(currentBiz.id, {
              date: tally.date,
              cash_sales: tally.cash_sales,
              expenses: tally.expenses,
              note: tally.note,
            });
            await db.daily_tallies.where('client_id').equals(client_id).modify({
              id: res.id,
              synced: true,
            });
          } catch (err) {
            if (err instanceof ApiError && err.status === 409) {
              console.info(`[BizPulse Sync] 409 Conflict for daily tally date ${tally.date}. Reconciling with existing backend tally...`);
              const existingTallies = await apiListDailyTallies(currentBiz.id, {
                from_date: tally.date,
                to_date: tally.date,
              });
              const existingTally = existingTallies.find((t) => t.date === tally.date);
              if (existingTally) {
                // Link local tally with server ID
                await db.daily_tallies.where('client_id').equals(client_id).modify({
                  id: existingTally.id,
                  synced: true,
                });
                // Update existing backend tally with local edits via PATCH
                await apiUpdateDailyTally(currentBiz.id, existingTally.id, {
                  cash_sales: tally.cash_sales,
                  expenses: tally.expenses,
                  note: tally.note,
                });
                return;
              }
            }
            throw err;
          }
        } else {
          if (!tally.id) return;
          await apiUpdateDailyTally(currentBiz.id, tally.id, {
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
        if (!cr || !currentBiz?.id) return;
        // Need the server customer id to post this record
        const customer = await db.customers
          .where('client_id')
          .equals(cr.customer_client_id)
          .first();
        if (!customer?.id) {
          // Customer hasn't synced yet — re-queue for next cycle
          if (entry.id !== undefined) {
            await recordAttempt(entry.id, false);
          }
          return;
        }
        if (operation === 'create') {
          const res = await apiCreateCreditRecord(currentBiz.id, {
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
          await apiUpdateCreditRecord(currentBiz.id, cr.id, {
            amount: cr.amount,
            due_date: cr.due_date,
          });
          await db.credit_records.where('client_id').equals(client_id).modify({ synced: true });
        }
        break;
      }

      case 'repayment': {
        const rep = await db.repayments.where('client_id').equals(client_id).first();
        if (!rep || !currentBiz?.id) return;
        const cr = await db.credit_records
          .where('client_id')
          .equals(rep.credit_record_client_id)
          .first();
        if (!cr?.id) {
          // Credit record hasn't synced yet
          if (entry.id !== undefined) {
            await recordAttempt(entry.id, false);
          }
          return;
        }
        const res = await apiCreateRepayment(currentBiz.id, cr.id, {
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

/**
 * Synchronize server data into IndexedDB for the given business.
 * Upserts records, preserves server IDs, marks them synced,
 * and preserves local unsynced edits.
 */
export async function pullServerData(business: Business): Promise<void> {
  if (!business.id) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;

  try {
    // 1. Customers
    let serverCustomers: CustomerResponse[] = [];
    let customersPullFailed = false;

    try {
      serverCustomers = await apiListCustomers(business.id);
    } catch (firstErr) {
      console.warn('[BizPulse Sync] Customers pull initial attempt failed, retrying...', firstErr);
      try {
        serverCustomers = await apiListCustomers(business.id);
      } catch (retryErr) {
        console.error('[BizPulse Sync] Customers pull failed after retry; aborting credit sync cycle to protect data integrity:', retryErr);
        customersPullFailed = true;
      }
    }

    if (!customersPullFailed && serverCustomers && serverCustomers.length > 0) {
      for (const sc of serverCustomers) {
        let local = await db.customers
          .where('business_client_id')
          .equals(business.client_id)
          .filter((c) => c.id === sc.id)
          .first();

        if (!local) {
          const sameNameList = await db.customers
            .where('business_client_id')
            .equals(business.client_id)
            .toArray();
          local = sameNameList.find(
            (c) => c.name.toLowerCase().trim() === sc.name.toLowerCase().trim()
          );
        }

        if (local) {
          if (!local.synced) {
            if (local.id === undefined) {
              await db.customers.where('client_id').equals(local.client_id).modify({ id: sc.id });
            }
          } else {
            await db.customers.where('client_id').equals(local.client_id).modify({
              id: sc.id,
              name: sc.name,
              phone: sc.phone || '',
              business_client_id: business.client_id,
              synced: true,
            });
          }
        } else {
          await db.customers.put({
            client_id: generateClientId(),
            id: sc.id,
            business_client_id: business.client_id,
            name: sc.name,
            phone: sc.phone || '',
            synced: true,
            updated_at: nowISO(),
          });
        }
      }
    }

    // 2. Daily Tallies (independent of customer relationships)
    try {
      const serverTallies = await apiListDailyTallies(business.id);
      if (serverTallies && serverTallies.length > 0) {
        for (const st of serverTallies) {
          let local = await db.daily_tallies
            .where('[business_client_id+date]')
            .equals([business.client_id, st.date])
            .first();

          if (!local) {
            local = await db.daily_tallies
              .where('business_client_id')
              .equals(business.client_id)
              .filter((t) => t.id === st.id)
              .first();
          }

          if (local) {
            if (!local.synced) {
              if (local.id === undefined) {
                await db.daily_tallies.where('client_id').equals(local.client_id).modify({ id: st.id });
              }
            } else {
              await db.daily_tallies.where('client_id').equals(local.client_id).modify({
                id: st.id,
                business_client_id: business.client_id,
                date: st.date,
                cash_sales: Number(st.cash_sales) || 0,
                expenses: Number(st.expenses) || 0,
                note: st.note || '',
                synced: true,
              });
            }
          } else {
            await db.daily_tallies.put({
              client_id: generateClientId(),
              id: st.id,
              business_client_id: business.client_id,
              date: st.date,
              cash_sales: Number(st.cash_sales) || 0,
              expenses: Number(st.expenses) || 0,
              note: st.note || '',
              synced: true,
              updated_at: nowISO(),
            });
          }
        }
      }
    } catch (err) {
      console.warn('[BizPulse Sync] Daily tallies pull skipped:', err);
    }

    // 3. Credit Records
    // ABORT if customers pull failed: never write credit records without verified customers
    if (customersPullFailed) {
      console.warn('[BizPulse Sync] Credit records pull aborted because customer sync failed.');
      return;
    }

    try {
      const serverCredits = await apiListCreditRecords(business.id);

      // Build customer map: server customer id -> local customer client_id
      const localCustomers = await db.customers
        .where('business_client_id')
        .equals(business.client_id)
        .toArray();
      const customerByServerId = new Map<number, string>();
      for (const c of localCustomers) {
        if (c.id !== undefined) {
          customerByServerId.set(c.id, c.client_id);
        }
      }

      if (serverCredits && serverCredits.length > 0) {
        for (const scr of serverCredits) {
          const customerClientId = customerByServerId.get(scr.customer);
          if (!customerClientId) {
            console.warn(`[BizPulse Sync] Skipping credit record ${scr.id}: customer server ID ${scr.customer} not found locally.`);
            continue; // NEVER write credit record with empty customer_client_id!
          }

          let local = await db.credit_records
            .where('business_client_id')
            .equals(business.client_id)
            .filter((cr) => cr.id === scr.id)
            .first();

          if (!local && customerClientId) {
            const candidates = await db.credit_records
              .where('business_client_id')
              .equals(business.client_id)
              .toArray();
            local = candidates.find(
              (c) =>
                c.customer_client_id === customerClientId &&
                c.issued_date === scr.issued_date &&
                Math.abs(c.amount - Number(scr.amount)) < 0.01
            );
          }

          if (local) {
            if (!local.synced) {
              if (local.id === undefined) {
                await db.credit_records.where('client_id').equals(local.client_id).modify({ id: scr.id });
              }
            } else {
              await db.credit_records.where('client_id').equals(local.client_id).modify({
                id: scr.id,
                business_client_id: business.client_id,
                customer_client_id: customerClientId,
                amount: Number(scr.amount) || 0,
                issued_date: scr.issued_date,
                due_date: scr.due_date ?? null,
                synced: true,
              });
            }
          } else {
            await db.credit_records.put({
              client_id: generateClientId(),
              id: scr.id,
              business_client_id: business.client_id,
              customer_client_id: customerClientId,
              amount: Number(scr.amount) || 0,
              issued_date: scr.issued_date,
              due_date: scr.due_date ?? null,
              synced: true,
              updated_at: nowISO(),
            });
          }

          // Pull repayments for this credit record
          try {
            const serverReps = await apiListRepayments(business.id, scr.id);
            if (serverReps && serverReps.length > 0) {
              const localCredit = await db.credit_records
                .where('business_client_id')
                .equals(business.client_id)
                .filter((c) => c.id === scr.id)
                .first();
              if (localCredit) {
                for (const srep of serverReps) {
                  const localRep = await db.repayments
                    .where('credit_record_client_id')
                    .equals(localCredit.client_id)
                    .filter((r) => r.id === srep.id)
                    .first();
                  if (!localRep) {
                    await db.repayments.put({
                      client_id: generateClientId(),
                      id: srep.id,
                      credit_record_client_id: localCredit.client_id,
                      amount: Number(srep.amount) || 0,
                      paid_date: srep.paid_date,
                      synced: true,
                      updated_at: nowISO(),
                    });
                  }
                }
              }
            }
          } catch {
            // Repayment pull failure is non-blocking
          }
        }
      }

      // 4. Self-healing reconciliation pass:
      // If any existing local credit_records have customer_client_id = '' or missing,
      // backfill with matching customer_client_id using server credit record mapping.
      const orphanedCredits = await db.credit_records
        .where('business_client_id')
        .equals(business.client_id)
        .filter((cr) => !cr.customer_client_id || cr.customer_client_id === '')
        .toArray();

      if (orphanedCredits.length > 0 && serverCredits && serverCredits.length > 0) {
        const serverCreditToCustomer = new Map<number, number>();
        for (const scr of serverCredits) {
          serverCreditToCustomer.set(scr.id, scr.customer);
        }

        for (const orphan of orphanedCredits) {
          if (orphan.id !== undefined) {
            const serverCustId = serverCreditToCustomer.get(orphan.id);
            if (serverCustId !== undefined) {
              const matchedClientId = customerByServerId.get(serverCustId);
              if (matchedClientId) {
                await db.credit_records.where('client_id').equals(orphan.client_id).modify({
                  customer_client_id: matchedClientId,
                });
                console.log(`[BizPulse Sync] Self-healed orphaned credit record ${orphan.client_id} -> customer ${matchedClientId}`);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('[BizPulse Sync] Credit records pull skipped:', err);
    }
  } catch (err) {
    console.warn('[BizPulse Sync] Pull sync error:', err);
  }
}

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
    // Scope pull to the current user's business
    const currentUser = getUser();
    const currentBiz = await getBusinessRepo(currentUser);
    if (currentBiz?.id) {
      await pullServerData(currentBiz);
    }
    emitStatus('success');
  } catch {
    emitStatus('error');
  } finally {
    syncInProgress = false;
  }
}

let syncInterval: ReturnType<typeof setInterval> | null = null;
let activeListenersCount = 0;
let onlineHandler: (() => void) | null = null;

export function startSyncScheduler(): () => void {
  if (typeof window === 'undefined') return () => {};

  activeListenersCount++;
  if (activeListenersCount === 1) {
    runSync();

    onlineHandler = () => {
      runSync();
    };
    window.addEventListener('online', onlineHandler);

    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      runSync();
    }, 30_000);
  }

  return () => {
    activeListenersCount = Math.max(0, activeListenersCount - 1);
    if (activeListenersCount === 0) {
      if (onlineHandler) {
        window.removeEventListener('online', onlineHandler);
        onlineHandler = null;
      }
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
    }
  };
}
