/**
 * BizPulse — Daily Tally Repository
 *
 * Manages the one-per-business-per-day tally record.
 */

import { db } from '../db';
import { generateClientId, nowISO } from './utils';
import { enqueueOutbox } from '../outbox';
import type { DailyTally } from '../../domain/types';

/**
 * Get today's tally for a business (may return undefined if none saved yet).
 */
export async function getTallyForDate(
  businessClientId: string,
  date: string
): Promise<DailyTally | undefined> {
  return db.daily_tallies
    .where('[business_client_id+date]')
    .equals([businessClientId, date])
    .first();
}

/**
 * Get all tallies for a business (used for dashboard / full-pull sync).
 */
export async function getAllTallies(businessClientId: string): Promise<DailyTally[]> {
  return db.daily_tallies
    .where('business_client_id')
    .equals(businessClientId)
    .toArray();
}

/**
 * Get tallies within a date range (inclusive).
 */
export async function getTalliesInRange(
  businessClientId: string,
  startDate: string,
  endDate: string
): Promise<DailyTally[]> {
  const all = await getAllTallies(businessClientId);
  return all.filter((t) => t.date >= startDate && t.date <= endDate);
}

/**
 * Upsert today's tally:
 * - If a tally exists for this date, update it.
 * - If not, create a new one.
 *
 * This is an upsert, not an insert, because the user may edit today's
 * tally multiple times before closing (e.g., add expenses later).
 * Must be called inside the coordinated transaction in useHomeScreen.
 */
export async function upsertTallyForDate(
  businessClientId: string,
  date: string,
  data: Pick<DailyTally, 'cash_sales' | 'expenses' | 'note'>
): Promise<DailyTally> {
  const existing = await getTallyForDate(businessClientId, date);
  const now = nowISO();

  if (existing) {
    await db.daily_tallies
      .where('client_id')
      .equals(existing.client_id)
      .modify({ ...data, updated_at: now, synced: false });
    const updated = { ...existing, ...data, updated_at: now, synced: false };
    await enqueueOutbox('daily_tally', existing.client_id, 'update');
    return updated;
  } else {
    const tally: DailyTally = {
      client_id: generateClientId(),
      business_client_id: businessClientId,
      date,
      ...data,
      synced: false,
      updated_at: now,
    };
    await db.daily_tallies.add(tally);
    await enqueueOutbox('daily_tally', tally.client_id, 'create');
    return tally;
  }
}
