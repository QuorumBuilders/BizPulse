'use client';

import React, { useState } from 'react';
import { useDashboard } from '@/state/useDashboard';
import { formatNaira } from '@/domain/derivations';
import type { Business } from '@/domain/types';
import SyncIndicator from '@/ui/components/SyncIndicator';
import { seedDemoData } from '@/data/seed';
import MetricCard from '@/ui/components/MetricCard';
import { useFollowUpList } from '@/state/useFollowUpList';

interface Props {
  business: Business;
  onGoToExport?: () => void;
  onGoToFollowUp?: () => void;
}

export default function DashboardScreen({ business, onGoToExport, onGoToFollowUp }: Props) {
  const { metrics, insights, isLoading, period, setPeriod, refresh } = useDashboard(business);
  const { debtors } = useFollowUpList(business);
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
  const overdueDebtors = debtors.filter((d) => d.totalOutstanding > 0);

  return (
    <div className="page fade-in" style={{ padding: 0 }}>
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-header__title">{business.name}</h1>
          <p className="dashboard-header__sub">Business Performance &amp; Cashflow</p>
        </div>
        <SyncIndicator />
      </header>

      <div className="dashboard-toolbar">
        <div className="period-toggle" role="group" aria-label="Select time period">
          <button
            type="button"
            id="period-month-btn"
            className={`period-toggle__btn${period === 'month' ? ' period-toggle__btn--active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            This Month
          </button>
          <button
            type="button"
            id="period-year-btn"
            className={`period-toggle__btn${period === 'year' ? ' period-toggle__btn--active' : ''}`}
            onClick={() => setPeriod('year')}
          >
            This Year
          </button>
        </div>

        <div className="dashboard-toolbar__actions">
          {onGoToExport && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={onGoToExport}
              style={{ padding: '7px 14px', fontSize: '0.8125rem' }}
            >
              Export CSV
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={refresh}
            title="Refresh metrics"
            style={{ padding: '7px 10px', fontSize: '0.8125rem' }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div className="skeleton skeleton--card" />
              <div className="skeleton skeleton--card" />
              <div className="skeleton skeleton--card" />
              <div className="skeleton skeleton--card" />
            </div>
          </div>
        ) : metrics ? (
          <>
            <div className="dashboard-metrics-grid">
              <MetricCard
                label="Total Revenue"
                amount={metrics.revenue}
                accentColor="var(--color-emerald)"
                color="var(--color-emerald-light)"
                subLabel={
                  revenueDelta !== null ? (
                    <span
                      className="font-semibold"
                      style={{ color: revenueDelta >= 0 ? 'var(--color-emerald)' : 'var(--color-rose)' }}
                    >
                      {revenueDelta >= 0 ? `▲ +${revenueDelta}%` : `▼ ${revenueDelta}%`} vs last {period}
                    </span>
                  ) : (
                    <span className="text-muted">No prior record</span>
                  )
                }
              />

              <MetricCard
                label="Expenses"
                amount={metrics.expenses}
                accentColor="var(--color-rose)"
                color="var(--color-rose)"
                subLabel={
                  expenseDelta !== null ? (
                    <span
                      className="font-semibold"
                      style={{ color: expenseDelta > 0 ? 'var(--color-rose)' : 'var(--color-emerald)' }}
                    >
                      {expenseDelta > 0 ? `▲ +${expenseDelta}%` : `▼ ${expenseDelta}%`} vs last {period}
                    </span>
                  ) : (
                    <span className="text-muted">No prior record</span>
                  )
                }
              />

              <MetricCard
                label="Cash Position"
                amount={metrics.cashAtHand}
                accentColor="var(--color-blue)"
                subLabel={<span className="text-muted">In hand &amp; bank</span>}
              />

              <MetricCard
                label="Owed to You"
                amount={metrics.outstandingDebt}
                accentColor="var(--color-amber)"
                color="var(--color-amber-light)"
                subLabel={<span className="text-muted">{overdueDebtors.length} active debtors</span>}
              />
            </div>

            <div className="dashboard-layout-split">
              <div className="flex flex-col gap-4">
                <div
                  className={`card card--hero${isProfitable ? ' card--hero-profit' : ' card--hero-deficit'}`}
                >
                  <div className="card-hero__header">
                    <span className="text-xs uppercase tracking-wider text-muted font-semibold">
                      Net Business Result
                    </span>
                    <span className={`badge ${isProfitable ? 'badge--paid' : 'badge--overdue'}`}>
                      {isProfitable ? 'Profitable' : 'Deficit'}
                    </span>
                  </div>

                  <div
                    className="metric-value"
                    style={{
                      fontSize: 'clamp(2rem, 5vw, 3rem)',
                      color: isProfitable ? 'var(--color-emerald-light)' : 'var(--color-rose)',
                      marginBottom: 8,
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                    aria-label={`Net result: ${formatNaira(metrics.businessResult)}`}
                  >
                    {formatNaira(metrics.businessResult)}
                  </div>

                  <p className="text-xs text-muted" style={{ lineHeight: 1.7 }}>
                    Total revenue minus expenses for this {period === 'month' ? 'month' : 'year'}.
                    {metrics.businessResultLastPeriod !== 0 && (
                      <span style={{ display: 'block', marginTop: 4 }}>
                        Previous {period === 'month' ? 'month' : 'year'}:{' '}
                        {formatNaira(metrics.businessResultLastPeriod)}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="card">
                  <div className="section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="section-title">Overdue Debtors</span>
                      <span className="badge badge--partial" style={{ fontSize: '0.6875rem' }}>
                        {overdueDebtors.length} Pending
                      </span>
                    </div>
                    {onGoToFollowUp && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={onGoToFollowUp}
                        style={{ fontSize: '0.75rem' }}
                      >
                        View All →
                      </button>
                    )}
                  </div>

                  {overdueDebtors.length === 0 ? (
                    <p className="text-xs text-muted">All customer credits are fully settled.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {overdueDebtors.slice(0, 3).map((debtor) => (
                        <div
                          key={debtor.customer.client_id}
                          className="debtor-item-compact"
                        >
                          <div className="debtor-item-compact__avatar">
                            {debtor.customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="font-semibold text-xs" style={{ color: 'var(--color-text-primary)' }}>
                              {debtor.customer.name}
                            </div>
                            <div className="text-xs text-muted">
                              {debtor.isOverdue ? 'Overdue' : 'Due soon'}
                            </div>
                          </div>
                          <div className="font-bold text-xs" style={{ color: 'var(--color-amber-light)', whiteSpace: 'nowrap' }}>
                            {formatNaira(debtor.totalOutstanding)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="card">
                  <div className="section-header" style={{ marginBottom: 12 }}>
                    <span className="section-title">Smart Insights</span>
                    <span className="badge badge--paid" style={{ fontSize: '0.6875rem' }}>
                      Offline Derived
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={`insight-card insight-card--${insight.type}`}
                      >
                        <p className="text-xs" style={{ lineHeight: 1.6 }}>
                          {insight.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card text-center" style={{ padding: '40px 24px' }}>
            <div style={{ marginBottom: 12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }} aria-hidden="true">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: 8 }}>No Records For This Period</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 20, maxWidth: 300, margin: '0 auto 20px' }}>
              Record your daily tally on the Home tab, or populate sample data to preview the full dashboard.
            </p>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handleSeedData}
              disabled={isSeeding}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, margin: '0 auto', padding: '10px 18px' }}
            >
              {isSeeding ? 'Populating Sample Records…' : 'Load 60 Days Demo Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
