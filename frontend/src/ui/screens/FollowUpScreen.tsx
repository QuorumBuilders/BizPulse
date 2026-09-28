'use client';

import React, { useState } from 'react';
import { useFollowUpList } from '@/state/useFollowUpList';
import { formatNaira, formatDate, formatMoneyInput, parseMoneyInput } from '@/domain/derivations';
import type { Business, DebtorSummary } from '@/domain/types';
import SyncIndicator from '@/ui/components/SyncIndicator';

interface Props {
  business: Business;
}

export default function FollowUpScreen({ business }: Props) {
  const { debtors, isLoading, recordPayment, refresh } = useFollowUpList(business);

  const [selectedDebtor, setSelectedDebtor] = useState<DebtorSummary | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenPayment = (debtor: DebtorSummary) => {
    setSelectedDebtor(debtor);
    setPaymentAmount(formatMoneyInput(debtor.totalOutstanding));
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebtor) return;
    const amount = parseMoneyInput(paymentAmount);
    if (amount <= 0) {
      showToast('Enter a valid amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find oldest credit record with outstanding balance
      const targetCredit = selectedDebtor.creditRecords[0];
      if (targetCredit) {
        await recordPayment(targetCredit.client_id, amount);
        showToast(`Payment of ${formatNaira(amount)} recorded for ${selectedDebtor.customer.name}!`);
        setSelectedDebtor(null);
      }
    } catch (err) {
      console.error('Payment record failed:', err);
      showToast('Could not record payment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReminder = (debtor: DebtorSummary) => {
    const text = encodeURIComponent(
      `Hello ${debtor.customer.name}, trust you are having a productive day. This is a gentle reminder regarding your balance of ${formatNaira(
        debtor.totalOutstanding
      )} with ${business.name}. Please let us know when it will be convenient to settle this. Thank you and God bless!`
    );

    if (debtor.customer.phone) {
      window.open(`https://wa.me/${debtor.customer.phone.replace(/\D/g, '')}?text=${text}`, '_blank');
    } else {
      navigator.clipboard?.writeText(decodeURIComponent(text));
      showToast('Reminder copied to clipboard!');
    }
  };

  const totalOwed = debtors.reduce((sum, d) => sum + d.totalOutstanding, 0);
  const overdueCount = debtors.filter((d) => d.isOverdue).length;

  return (
    <div className="page fade-in" style={{ padding: 0 }}>
      <header
        style={{
          padding: '24px 20px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: 4, letterSpacing: '-0.02em' }}>
            Follow-Up List
          </h1>
          <p className="text-xs text-muted">Who owes you &amp; promised pay dates</p>
        </div>
        <SyncIndicator />
      </header>

      <div style={{ padding: '0 20px 20px' }}>
        <div
          className="card"
          style={{
            borderTop: '2px solid var(--color-amber)',
            background: 'var(--color-surface)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '18px 20px',
          }}
        >
          <div>
            <span className="text-xs text-muted block mb-1 font-medium">Total Outstanding Debt</span>
            <span
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '1.625rem',
                fontWeight: 700,
                color: 'var(--color-amber-light)',
                letterSpacing: '-0.02em',
              }}
            >
              {formatNaira(totalOwed)}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              className="badge"
              style={{
                fontSize: '0.75rem',
                padding: '4px 10px',
                background: overdueCount > 0 ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)',
                color: overdueCount > 0 ? 'var(--color-rose)' : 'var(--color-emerald)',
                border: `1px solid ${overdueCount > 0 ? 'rgba(244,63,94,0.25)' : 'rgba(16,185,129,0.25)'}`,
                fontWeight: 600,
              }}
            >
              {overdueCount} Overdue
            </span>
            <p className="text-xs text-muted mt-1.5">{debtors.length} customer{debtors.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
            <div className="skeleton skeleton--card" />
          </div>
        ) : debtors.length === 0 ? (
          <div className="card text-center" style={{ padding: '48px 24px', background: 'var(--color-surface)' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--color-emerald)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 6 }}>No Outstanding Debts</h3>
            <p className="text-xs text-muted" style={{ maxWidth: 320, margin: '0 auto' }}>
              All customer credit has been settled or no credit was issued. Your ledger is clear.
            </p>
          </div>
        ) : (
          debtors.map((debtor) => (
            <div
              key={debtor.customer.client_id}
              className="card debtor-item-card"
              style={{
                borderTop: debtor.isOverdue ? '2px solid var(--color-rose)' : '2px solid var(--color-border)',
                padding: '18px 20px',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
              }}
            >
              <div className="flex justify-between items-start" style={{ marginBottom: 10 }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {debtor.customer.name}
                  </h4>
                  {debtor.customer.phone && (
                    <p className="text-xs text-muted" style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      {debtor.customer.phone}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontWeight: 700,
                      fontSize: '1.15rem',
                      color: debtor.isOverdue ? 'var(--color-rose)' : 'var(--color-amber-light)',
                    }}
                  >
                    {formatNaira(debtor.totalOutstanding)}
                  </div>
                  <span
                    className={`badge ${debtor.isOverdue ? 'badge--overdue' : 'badge--partial'}`}
                    style={{ fontSize: '0.6875rem', marginTop: 4, display: 'inline-block' }}
                  >
                    {debtor.isOverdue ? 'Overdue' : 'Active'}
                  </span>
                </div>
              </div>

              {debtor.oldestDueDate && (
                <p className="text-xs text-muted" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Promised date: <strong style={{ color: 'var(--color-text-primary)' }}>{formatDate(debtor.oldestDueDate)}</strong>
                </p>
              )}

              <div className="flex gap-2" style={{ marginTop: 6 }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm flex-1"
                  onClick={() => handleSendReminder(debtor)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                  WhatsApp Remind
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm flex-1"
                  onClick={() => handleOpenPayment(debtor)}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.8125rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Record Payment
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedDebtor && (
        <div className="modal-overlay" onClick={() => setSelectedDebtor(null)}>
          <div className="modal-sheet" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 8, fontSize: '1.2rem', fontWeight: 700 }}>Record Payment</h3>
            <p className="text-xs text-muted" style={{ marginBottom: 16 }}>
              Recording money received from <strong style={{ color: 'var(--color-text-primary)' }}>{selectedDebtor.customer.name}</strong>.
            </p>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" htmlFor="payment-amount">
                Amount received (₦)
              </label>
              <div className="relative">
                <span
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)',
                    fontSize: '1.25rem',
                    pointerEvents: 'none',
                  }}
                >
                  ₦
                </span>
                <input
                  id="payment-amount"
                  className="form-input form-input--money"
                  type="text"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(formatMoneyInput(e.target.value))}
                  inputMode="numeric"
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <p className="text-xs text-muted mt-2">
                Total owed: {formatNaira(selectedDebtor.totalOutstanding)}. Partial payments are supported.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                className="btn btn--secondary flex-1"
                onClick={() => setSelectedDebtor(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary flex-1"
                onClick={handleConfirmPayment}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div
          className="toast"
          style={{
            borderColor: 'rgba(16,185,129,0.3)',
            color: 'var(--color-emerald-light)',
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
}
