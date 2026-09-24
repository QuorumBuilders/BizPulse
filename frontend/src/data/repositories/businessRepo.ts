/**
 * BizPulse — Business Repository
 *
 * Reads and writes Business records in IndexedDB.
 * All writes go through here so we can consistently manage
 * client_id, updated_at, and outbox enqueuing.
 */

import { db } from '../db';
import { generateClientId, nowISO } from './utils';
import { enqueueOutbox } from '../outbox';
import type { Business } from '../../domain/types';

/**
 * Get the current business (first business in the local store).
 * BizPulse MVP is single-business-per-device.
 */
export async function getBusiness(): Promise<Business | undefined> {
  return db.businesses.toCollection().first();
}

/**
 * Create the business during onboarding.
 * Returns the new business with its generated client_id.
 */
export async function createBusiness(
  data: Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at' | 'deleted_at' | 'purge_at'>
): Promise<Business> {
  const now = nowISO();
  const business: Business = {
    ...data,
    client_id: generateClientId(),
    deleted_at: null,
    purge_at: null,
    synced: false,
    updated_at: now,
  };
  await db.businesses.add(business);
  await enqueueOutbox('business', business.client_id, 'create');
  return business;
}

/**
 * Update business settings (name, type, voice_enabled, etc.)
 */
export async function updateBusiness(
  clientId: string,
  patch: Partial<Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at'>>
): Promise<void> {
  const now = nowISO();
  await db.businesses
    .where('client_id')
    .equals(clientId)
    .modify({ ...patch, updated_at: now, synced: false });
  await enqueueOutbox('business', clientId, 'update');
}
