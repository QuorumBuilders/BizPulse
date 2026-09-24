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

import { db } from './db';
import type { OutboxEntry, OutboxEntity, OutboxOperation } from '../domain/types';

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
  operation: OutboxOperation
): Promise<void> {
  const existing = await db.outbox
    .where('[entity+client_id]')
    .equals([entity, clientId])
    .first();

  if (existing) {
    // Upgrade a 'create' to remain 'create' if it hasn't synced yet;
    // an 'update' over an existing 'update' stays 'update'.
    // The important thing: don't lose a 'create' by overwriting with 'update'.
    await db.outbox
      .where('[entity+client_id]')
      .equals([entity, clientId])
      .modify({
        operation: existing.operation === 'create' ? 'create' : operation,
        attempted_at: null,
        attempts: 0,
      });
  } else {
    const entry: OutboxEntry = {
      entity,
      client_id: clientId,
      operation,
      attempted_at: null,
      attempts: 0,
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
