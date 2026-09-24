/**
 * BizPulse — useFollowUpList hook
 *
 * Provides the ranked debtor list to the FollowUpScreen.
 * Reads from IndexedDB. All ordering logic lives in domain/derivations.ts.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getCustomers } from '../data/repositories/customerRepo';
import { getCreditRecordsForBusiness } from '../data/repositories/creditRecordRepo';
import { getAllRepaymentsForBusiness } from '../data/repositories/repaymentRepo';
import { createRepayment } from '../data/repositories/repaymentRepo';
import {
  buildDebtorSummaries,
  todayISO,
} from '../domain/derivations';
import type { Business, DebtorSummary } from '../domain/types';

export interface FollowUpState {
  debtors: DebtorSummary[];
  isLoading: boolean;
  recordPayment: (creditRecordClientId: string, amount: number) => Promise<void>;
  refresh: () => void;
}

export function useFollowUpList(business: Business | null): FollowUpState {
  const [debtors, setDebtors] = useState<DebtorSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!business) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const [customers, credits] = await Promise.all([
      getCustomers(business.client_id),
      getCreditRecordsForBusiness(business.client_id),
    ]);

    const creditClientIds = credits.map((c) => c.client_id);
    const repayments = await getAllRepaymentsForBusiness(creditClientIds);

    const today = todayISO();
    const summaries = buildDebtorSummaries(customers, credits, repayments, today);

    setDebtors(summaries);
    setIsLoading(false);
  }, [business]);

  useEffect(() => {
    load();
  }, [load]);

  const recordPayment = useCallback(async (
    creditRecordClientId: string,
    amount: number
  ) => {
    await createRepayment({
      credit_record_client_id: creditRecordClientId,
      amount,
      paid_date: todayISO(),
    });
    await load();
  }, [load]);

  return { debtors, isLoading, recordPayment, refresh: load };
}
