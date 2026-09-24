'use client';

import React, { useState } from 'react';
import { useDashboard, type DashboardPeriod } from '@/state/useDashboard';
import { formatNaira } from '@/domain/derivations';
import type { Business } from '@/domain/types';
import SyncIndicator from '@/ui/components/SyncIndicator';
import { seedDemoData } from '@/data/seed';

interface Props {
  business: Business;
  onGoToExport?: () => void;
}

export default function DashboardScreen({ business, onGoToExport }: Props) {
  const { metrics, insights, isLoading, period, setPeriod, refresh } = useDashboard(business);
  const [isSeeding, setIsSeeding] = useState(false);

  const handleSeedData = async () => {
    setIsSeeding(true);
    try {
      await seedDemoData(business.client_id);
      refresh();
    } catch (err) {
      console.error('Failed to seed demo data:', err);
    } finally {
      setIsSeeding(false);
    }
  };

  const calculateChange = (current: number, previous: number) => {
    if (previous <= 0) return null;
    const diff = ((current - previous) / previous) * 100;
    return Math.round(diff);
  };

  const revenueDelta = metrics ? calculateChange(metrics.revenue, metrics.revenueLastPeriod) : null;
  const expenseDelta = metrics ? calculateChange(metrics.expenses, metrics.expensesLastPeriod) : null;
  const isProfitable = (metrics?.businessResult ?? 0) >= 0;

  return (
    <div className="page fade-in" style={{ padding: 0 }}>
      {/* Header */}
      <header
        style={{
          padding: '20px 20px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.375rem', marginBottom: 2 }}>{business.name}</h1>
          <p className="text-xs text-muted">Business Performance &amp; Cashflow</p>
        </div>
        <SyncIndicator />
      </header>

      {/* Period Toggle & Refresh */}
      <div style={{ padding: '0 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="flex gap-2">
          <button
            type="button"
            className={`btn btn--sm ${period === 'month' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setPeriod('month')}
            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
          >
            This Month
          </button>
          <button
            type="button"
            className={`btn btn--sm ${period === 'year' ? 'btn--primary' : 'btn--secondary'}`}
            onClick={() => setPeriod('year')}
            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
          >
            This Year
          </button>
        </div>
        <div className="flex gap-2 items-center">
          {onGoToExport && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={onGoToExport}
              style={{ padding: '6px 12px', fontSize: '0.8125rem' }}
            >
              📥 Export
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={refresh}
            title="Refresh metrics"
            style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {isLoading ? (
          <div className="card text-center" style={{ padding: 36 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p className="text-sm text-muted">Calculating figures from your records…</p>
          </div>
        ) : metrics ? (
          <>
            {/* HERO CARD: Business Result */}
            <div
              className={`card card--elevated ${isProfitable ? 'card--glow-emerald' : ''}`}
              style={{
                background: isProfitable
                  ? 'linear-gradient(145deg, rgba(16,185,129,0.12), rgba(15,23,42,0.6))'
                  : 'linear-gradient(145deg, rgba(244,63,94,0.12), rgba(15,23,42,0.6))',
                borderColor: isProfitable ? 'rgba(16,185,129,0.35)' : 'rgba(244,63,94,0.35)',
              }}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                <span className="text-xs uppercase tracking-wider text-muted font-semibold">
                  Net Business Result
                </span>
                <span
                  className={`badge ${isProfitable ? 'badge--paid' : 'badge--overdue'}`}
                  style={{ fontSize: '0.75rem' }}
                >
                  {isProfitable ? 'Profit' : 'Deficit'}
                </span>
              </div>
              <div
                className="metric-value"
                style={{
                  fontSize: '2.25rem',
                  color: isProfitable ? 'var(--color-emerald-light)' : 'var(--color-rose)',
                  marginBottom: 6,
                }}
              >
                {formatNaira(metrics.businessResult)}
              </div>
              <p className="text-xs text-muted">
                Revenue minus expenses for this {period === 'month' ? 'month' : 'year'}.
                {metrics.businessResultLastPeriod !== 0 && (
                  <span style={{ display: 'block', marginTop: 4 }}>
                    Previous {period === 'month' ? 'month' : 'year'}: {formatNaira(metrics.businessResultLastPeriod)}
                  </span>
                )}
              </p>
            </div>

            {/* KEY FINANCIAL CARDS GRID */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {/* Revenue */}
              <div className="card" style={{ padding: '16px' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>
                  💰 Total Revenue
                </div>
                <div
                  className="font-bold"
                  style={{ fontSize: '1.25rem', color: 'var(--color-emerald-light)', marginBottom: 4 }}
                >
                  {formatNaira(metrics.revenue)}
                </div>
                {revenueDelta !== null ? (
                  <div
                    className="text-xs font-semibold"
                    style={{ color: revenueDelta >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)' }}
                  >
                    {revenueDelta >= 0 ? `▲ +${revenueDelta}%` : `▼ ${revenueDelta}%`} vs last {period}
                  </div>
                ) : (
                  <div className="text-xs text-muted">No prior record</div>
                )}
              </div>

              {/* Expenses */}
              <div className="card" style={{ padding: '16px' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>
                  🧾 Expenses
                </div>
                <div
                  className="font-bold"
                  style={{ fontSize: '1.25rem', color: 'var(--color-rose)', marginBottom: 4 }}
                >
                  {formatNaira(metrics.expenses)}
                </div>
                {expenseDelta !== null ? (
                  <div
                    className="text-xs font-semibold"
                    style={{ color: expenseDelta > 0 ? 'var(--color-rose)' : 'var(--color-emerald)' }}
                  >
                    {expenseDelta > 0 ? `▲ +${expenseDelta}%` : `▼ ${expenseDelta}%`} vs last {period}
                  </div>
                ) : (
                  <div className="text-xs text-muted">No prior record</div>
                )}
              </div>

              {/* Cash Position */}
              <div className="card" style={{ padding: '16px' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>
                  💵 Cash Position
                </div>
                <div
                  className="font-bold"
                  style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: 4 }}
                >
                  {formatNaira(metrics.cashAtHand)}
                </div>
                <div className="text-xs text-muted">In hand &amp; bank</div>
              </div>

              {/* Outstanding Debt */}
              <div className="card" style={{ padding: '16px' }}>
                <div className="text-xs text-muted" style={{ marginBottom: 4 }}>
                  💳 Owed to You
                </div>
                <div
                  className="font-bold"
                  style={{ fontSize: '1.25rem', color: 'var(--color-amber-light)', marginBottom: 4 }}
                >
                  {formatNaira(metrics.outstandingDebt)}
                </div>
                <div className="text-xs text-muted">Total debtors balance</div>
              </div>
            </div>

            {/* AUTOMATED INSIGHTS */}
            <div className="card">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <span className="section-title">💡 Smart Insights</span>
                <span className="badge badge--partial" style={{ fontSize: '0.7rem' }}>Offline Derived</span>
              </div>
              <div className="flex flex-col gap-2">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg"
                    style={{
                      background:
                        insight.type === 'positive'
                          ? 'rgba(16,185,129,0.08)'
                          : insight.type === 'warning'
                          ? 'rgba(245,158,11,0.08)'
                          : 'rgba(255,255,255,0.03)',
                      borderLeft: `3px solid ${
                        insight.type === 'positive'
                          ? 'var(--color-emerald)'
                          : insight.type === 'warning'
                          ? 'var(--color-amber)'
                          : 'var(--color-border)'
                      }`,
                    }}
                  >
                    <p className="text-xs" style={{ lineHeight: 1.5, color: 'var(--color-text-primary)' }}>
                      {insight.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card text-center" style={{ padding: '36px 20px' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📊</div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: 6 }}>No Records For This Period</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 16, maxWidth: 300, margin: '0 auto 16px' }}>
              Record your daily tally on the Home tab, or populate sample Nigerian trading data to preview the full dashboard.
            </p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleSeedData}
              disabled={isSeeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 auto', padding: '10px 18px' }}
            >
              {isSeeding ? '✨ Populating Sample Records…' : '✨ Load 60 Days Demo Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
