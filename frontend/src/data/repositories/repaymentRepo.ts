/**
 * BizPulse — Repayment Repository
 */

import { db } from '../db';
import { generateClientId, nowISO } from './utils';
import { enqueueOutbox } from '../outbox';
import type { Repayment } from '../../domain/types';

/**
 * Record a payment against a credit record.
 * The amount can be partial or full — the outstanding derivation handles both.
 */
export async function createRepayment(
  data: Omit<Repayment, 'id' | 'client_id' | 'synced' | 'updated_at'>
): Promise<Repayment> {
  const repayment: Repayment = {
    ...data,
    client_id: generateClientId(),
    synced: false,
    updated_at: nowISO(),
  };
  await db.repayments.add(repayment);
  await enqueueOutbox('repayment', repayment.client_id, 'create');
  return repayment;
}

/**
 * Get all repayments for a specific credit record.
 */
export async function getRepaymentsForCredit(
  creditRecordClientId: string
): Promise<Repayment[]> {
  return db.repayments
    .where('credit_record_client_id')
    .equals(creditRecordClientId)
    .toArray();
}

/**
 * Get all repayments for a business (needed for cashAtHand calculation).
 * Since repayments only reference credit_record_client_id, we fetch all
 * credit records for the business first, then filter repayments.
 */
export async function getAllRepaymentsForBusiness(
  creditRecordClientIds: string[]
): Promise<Repayment[]> {
  if (creditRecordClientIds.length === 0) return [];
  return db.repayments
    .where('credit_record_client_id')
    .anyOf(creditRecordClientIds)
    .toArray();
}
