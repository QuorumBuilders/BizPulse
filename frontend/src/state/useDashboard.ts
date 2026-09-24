/**
 * BizPulse — useDashboard hook
 *
 * Composes repositories + domain derivations to provide dashboard metrics
 * to the UI. Reads entirely from IndexedDB — no network call.
 * All numbers are computed fresh on read; none are stored.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getAllTallies, getTalliesInRange } from '../data/repositories/dailyTallyRepo';
import {
  getCreditRecordsForBusiness,
} from '../data/repositories/creditRecordRepo';
import { getAllRepaymentsForBusiness } from '../data/repositories/repaymentRepo';
import {
  buildDashboardMetrics,
  generateInsights,
  todayISO,
  yearMonthOf,
  yearOf,
  previousMonth,
  previousYear,
} from '../domain/derivations';
import type { Business } from '../domain/types';
import type { DashboardMetrics, Insight } from '../domain/derivations';

export type DashboardPeriod = 'month' | 'year';

export interface DashboardState {
  metrics: DashboardMetrics | null;
  insights: Insight[];
  isLoading: boolean;
  period: DashboardPeriod;
  setPeriod: (p: DashboardPeriod) => void;
  refresh: () => void;
}

export function useDashboard(business: Business | null): DashboardState {
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const compute = useCallback(async () => {
    if (!business) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const today = todayISO();

    // Determine date ranges
    let currentStart: string;
    let currentEnd: string;
    let prevStart: string;
    let prevEnd: string;

    if (period === 'month') {
      const ym = yearMonthOf(today);
      currentStart = `${ym}-01`;
      currentEnd = today;
      const prevYm = previousMonth(ym);
      prevStart = `${prevYm}-01`;
      // Last day of previous month
      const [y, m] = prevYm.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      prevEnd = `${prevYm}-${String(lastDay).padStart(2, '0')}`;
    } else {
      const yr = yearOf(today);
      currentStart = `${yr}-01-01`;
      currentEnd = today;
      const prevYr = previousYear(yr);
      prevStart = `${prevYr}-01-01`;
      prevEnd = `${prevYr}-12-31`;
    }

    const [
      allTallies,
      allCreditRecords,
    ] = await Promise.all([
      getAllTallies(business.client_id),
      getCreditRecordsForBusiness(business.client_id),
    ]);

    const allCreditClientIds = allCreditRecords.map((c) => c.client_id);
    const allRepayments = await getAllRepaymentsForBusiness(allCreditClientIds);

    const currentTallies = allTallies.filter(
      (t) => t.date >= currentStart && t.date <= currentEnd
    );
    const currentCredits = allCreditRecords.filter(
      (c) => c.issued_date >= currentStart && c.issued_date <= currentEnd
    );
    const prevTallies = allTallies.filter(
      (t) => t.date >= prevStart && t.date <= prevEnd
    );
    const prevCredits = allCreditRecords.filter(
      (c) => c.issued_date >= prevStart && c.issued_date <= prevEnd
    );

    const m = buildDashboardMetrics({
      business,
      currentTallies,
      currentCreditRecords: currentCredits,
      previousTallies: prevTallies,
      previousCreditRecords: prevCredits,
      allTallies,
      allRepayments,
      allCreditRecords,
    });

    setMetrics(m);
    setInsights(generateInsights(m));
    setIsLoading(false);
  }, [business, period]);

  useEffect(() => {
    compute();
  }, [compute]);

  return { metrics, insights, isLoading, period, setPeriod, refresh: compute };
}
