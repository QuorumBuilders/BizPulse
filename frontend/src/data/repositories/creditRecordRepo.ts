/**
 * BizPulse — Credit Record Repository
 */

import { db } from '../db';
import { generateClientId, nowISO } from './utils';
import { enqueueOutbox } from '../outbox';
import type { CreditRecord } from '../../domain/types';

/**
 * Create a new credit record.
 * Called as part of the coordinated tally+credit transaction.
 */
export async function createCreditRecord(
  data: Omit<CreditRecord, 'id' | 'client_id' | 'synced' | 'updated_at'>
): Promise<CreditRecord> {
  const record: CreditRecord = {
    ...data,
    client_id: generateClientId(),
    synced: false,
    updated_at: nowISO(),
  };
  await db.credit_records.add(record);
  await enqueueOutbox('credit_record', record.client_id, 'create');
  return record;
}

/**
 * Get all credit records for a business (used for dashboard / follow-up list).
 */
export async function getCreditRecordsForBusiness(
  businessClientId: string
): Promise<CreditRecord[]> {
  return db.credit_records
    .where('business_client_id')
    .equals(businessClientId)
    .toArray();
}

/**
 * Get all credit records for a specific customer.
 */
export async function getCreditRecordsForCustomer(
  customerClientId: string
): Promise<CreditRecord[]> {
  return db.credit_records
    .where('customer_client_id')
    .equals(customerClientId)
    .toArray();
}

/**
 * Get all credit records issued on a specific date for a business.
 */
export async function getCreditRecordsForDate(
  businessClientId: string,
  date: string
): Promise<CreditRecord[]> {
  return db.credit_records
    .where('[business_client_id+issued_date]')
    .equals([businessClientId, date])
    .toArray();
}

/**
 * Mark a credit record as fully settled (when outstanding reaches 0).
 * This doesn't delete the record — it's part of the financial history.
 */
export async function updateCreditRecord(
  clientId: string,
  patch: Partial<Pick<CreditRecord, 'due_date' | 'amount'>>
): Promise<void> {
  await db.credit_records
    .where('client_id')
    .equals(clientId)
    .modify({ ...patch, updated_at: nowISO(), synced: false });
  await enqueueOutbox('credit_record', clientId, 'update');
}
