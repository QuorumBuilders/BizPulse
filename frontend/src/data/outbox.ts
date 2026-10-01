/**
 * BizPulse — Sync Outbox
 *
 * Implements the outbox pattern for local-first sync.
 *
 * Every local write (create/update) appends one OutboxEntry.
 * A background process reads pending entries, pushes them to the API,
 * and removes them on success.
 *
 * WHY AN OUTBOX, NOT "JUST POST ON SAVE":
 * Posting immediately fails silently the moment the network is down,
 * which is the exact condition this app is designed around. The outbox
 * decouples "the user saved something" from "the network happened to
 * be up at that moment."
 */

import Dexie from 'dexie';
import { db } from './db';
import type { OutboxEntry, OutboxEntity, OutboxOperation } from '../domain/types';
import { getUser } from '../state/authStore';

/**
 * Add a record to the outbox queue.
 * Called after every successful local write.
 *
 * Deduplication: if an entry for (entity, client_id) already exists
 * in the outbox (e.g., the user edited the same record twice offline),
 * we update the existing entry rather than appending a second one —
 * there's no point syncing the same entity twice.
 */
export async function enqueueOutbox(
  entity: OutboxEntity,
  clientId: string,
  operation: OutboxOperation,
  businessClientId?: string,
  userId?: string | number,
  businessId?: number
): Promise<void> {
  let resolvedBusinessClientId = businessClientId;
  let resolvedUserId = userId;
  let resolvedBusinessId = businessId;

  if (entity === 'business') {
    resolvedBusinessClientId = clientId;
  }

  // Only look up the business record when we are NOT already inside a Dexie
  // transaction. If we ARE inside one, db.businesses is not in scope and
  // Dexie will throw NotFoundError. The caller already passes businessClientId
  // (and optionally businessId), so the lookup is only needed as a fallback.
  const insideTransaction = !!Dexie.currentTransaction;
  if (!insideTransaction && resolvedBusinessClientId && (!resolvedUserId || !resolvedBusinessId)) {
    try {
      const biz = await db.businesses.where('client_id').equals(resolvedBusinessClientId).first();
      if (biz) {
        if (!resolvedUserId && biz.user_id) resolvedUserId = biz.user_id;
        if (!resolvedBusinessId && biz.id) resolvedBusinessId = biz.id;
      }
    } catch {
      // Non-fatal — we'll still enqueue with the data we have
    }
  }

  // If still missing user_id, resolve from current session (no DB access needed)
  if (!resolvedUserId) {
    const currentUser = getUser();
    if (currentUser) {
      resolvedUserId = currentUser.id ? String(currentUser.id) : (currentUser.email ? currentUser.email.toLowerCase().trim() : undefined);
    }
  }

  const existing = await db.outbox
    .where('[entity+client_id]')
    .equals([entity, clientId])
    .first();

  if (existing) {
    await db.outbox
      .where('[entity+client_id]')
      .equals([entity, clientId])
      .modify({
        operation: existing.operation === 'create' ? 'create' : operation,
        attempted_at: null,
        attempts: 0,
        business_client_id: resolvedBusinessClientId ?? existing.business_client_id,
        user_id: resolvedUserId ?? existing.user_id,
        business_id: resolvedBusinessId ?? existing.business_id,
      });
  } else {
    const entry: OutboxEntry = {
      entity,
      client_id: clientId,
      operation,
      attempted_at: null,
      attempts: 0,
      business_client_id: resolvedBusinessClientId,
      user_id: resolvedUserId,
      business_id: resolvedBusinessId,
    };
    await db.outbox.add(entry);
  }
}

/**
 * Get all pending outbox entries, sorted by id (creation order).
 * Parents (Customer) must be synced before children (CreditRecord),
 * so we sort by entity priority first, then by creation id.
 */
export async function getPendingEntries(): Promise<OutboxEntry[]> {
  const all = await db.outbox.toArray();

  const ENTITY_ORDER: Record<OutboxEntity, number> = {
    business: 0,
    customer: 1,
    daily_tally: 2,
    credit_record: 3,
    repayment: 4,
  };

  return all.sort((a, b) => {
    const entityDiff = ENTITY_ORDER[a.entity] - ENTITY_ORDER[b.entity];
    if (entityDiff !== 0) return entityDiff;
    return (a.id ?? 0) - (b.id ?? 0);
  });
}

/**
 * Remove an outbox entry after successful sync.
 */
export async function removeOutboxEntry(entryId: number): Promise<void> {
  await db.outbox.delete(entryId);
}

/**
 * Record a failed attempt. After 5 failures, the entry is considered
 * permanently failed (likely a 4xx validation error) and is flagged.
 */
export async function recordAttempt(
  entryId: number,
  failed: boolean
): Promise<void> {
  await db.outbox.where('id').equals(entryId).modify((entry) => {
    entry.attempted_at = new Date().toISOString();
    if (failed) {
      entry.attempts = (entry.attempts ?? 0) + 1;
    }
  });
}

/**
 * Count of entries waiting to sync (shown in the sync status indicator).
 */
export async function pendingCount(): Promise<number> {
  return db.outbox.count();
}
