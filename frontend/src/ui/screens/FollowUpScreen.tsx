'use client';

import React, { useState } from 'react';
import { useFollowUpList } from '@/state/useFollowUpList';
import { formatNaira, formatDate } from '@/domain/derivations';
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
    setPaymentAmount(String(debtor.totalOutstanding));
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebtor) return;
    const amount = parseFloat(paymentAmount || '0');
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
          <h1 style={{ fontSize: '1.375rem', marginBottom: 2 }}>Follow-Up List</h1>
          <p className="text-xs text-muted">Who owes you &amp; promised pay dates</p>
        </div>
        <SyncIndicator />
      </header>

      {/* Summary Banner */}
      <div style={{ padding: '0 20px 16px' }}>
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(15,23,42,0.6))',
            borderColor: 'rgba(245,158,11,0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span className="text-xs text-muted block mb-1">Total Outstanding Debt</span>
            <span className="font-bold" style={{ fontSize: '1.5rem', color: 'var(--color-amber-light)' }}>
              {formatNaira(totalOwed)}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="badge badge--overdue" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
              {overdueCount} Overdue
            </span>
            <p className="text-xs text-muted mt-1">{debtors.length} customer(s)</p>
          </div>
        </div>
      </div>

      {/* Debtors List */}
      <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          <div className="card text-center" style={{ padding: 36 }}>
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p className="text-sm text-muted">Loading debtor records…</p>
          </div>
        ) : debtors.length === 0 ? (
          <div className="card text-center" style={{ padding: 36 }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🎉</div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 6 }}>No Outstanding Debts</h3>
            <p className="text-xs text-muted">
              All customer credit has been settled or no credit was given. Good job!
            </p>
          </div>
        ) : (
          debtors.map((debtor) => (
            <div
              key={debtor.customer.client_id}
              className={`card ${debtor.isOverdue ? 'card--glow-amber' : ''}`}
              style={{
                borderColor: debtor.isOverdue ? 'rgba(244,63,94,0.3)' : 'var(--color-border)',
                padding: '16px',
              }}
            >
              <div className="flex justify-between items-start" style={{ marginBottom: 8 }}>
                <div>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {debtor.customer.name}
                  </h4>
                  {debtor.customer.phone && (
                    <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                      📞 {debtor.customer.phone}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="font-bold" style={{ fontSize: '1.125rem', color: 'var(--color-amber-light)' }}>
                    {formatNaira(debtor.totalOutstanding)}
                  </div>
                  <span
                    className={`badge ${debtor.isOverdue ? 'badge--overdue' : 'badge--partial'}`}
                    style={{ fontSize: '0.7rem', marginTop: 4, display: 'inline-block' }}
                  >
                    {debtor.isOverdue ? '⚠️ Overdue' : 'Active'}
                  </span>
                </div>
              </div>

              {debtor.oldestDueDate && (
                <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
                  📅 Promised due date: <strong style={{ color: 'var(--color-text-primary)' }}>{formatDate(debtor.oldestDueDate)}</strong>
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn--secondary btn--sm flex-1"
                  onClick={() => handleSendReminder(debtor)}
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                >
                  💬 Remind
                </button>
                <button
                  type="button"
                  className="btn btn--primary btn--sm flex-1"
                  onClick={() => handleOpenPayment(debtor)}
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                >
                  💵 Received Money
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Record Repayment Modal */}
      {selectedDebtor && (
        <div className="modal-overlay" onClick={() => setSelectedDebtor(null)}>
          <div className="modal-sheet" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
            <h3 style={{ marginBottom: 12 }}>Record Payment</h3>
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
                  type="number"
                  placeholder="0"
                  value={paymentAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                  inputMode="decimal"
                  style={{ paddingLeft: 36 }}
                />
              </div>
              <p className="text-xs text-muted mt-2">
                Total owed: {formatNaira(selectedDebtor.totalOutstanding)}. You can enter partial amounts.
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
                {isSubmitting ? 'Saving…' : '✓ Confirm Received'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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
