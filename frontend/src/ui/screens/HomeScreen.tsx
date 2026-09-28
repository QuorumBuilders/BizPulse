
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { db } from '@/data/db';
import { upsertTallyForDate } from '@/data/repositories/dailyTallyRepo';
import { findOrCreateCustomer, getCustomers } from '@/data/repositories/customerRepo';
import { createCreditRecord, getCreditRecordsForDate } from '@/data/repositories/creditRecordRepo';
import {
  formatNaira,
  formatMoneyInput,
  parseMoneyInput,
  todayISO,
  formatDate,
  creditSalesForDate,
  totalSalesForDay,
} from '@/domain/derivations';
import { useDashboard } from '@/state/useDashboard';
import { useFollowUpList } from '@/state/useFollowUpList';
import type { Business, CreditLine, DailyTally, CreditRecord, Customer } from '@/domain/types';
import SyncIndicator from '@/ui/components/SyncIndicator';
import { parseVoiceTranscript } from '@/domain/voiceParser';

interface Props {
  business: Business;
  onGoToFollowUp?: () => void;
  onOpenSettings?: () => void;
}

interface FormState {
  totalSold: string;
  expenses: string;
  creditLines: CreditLine[];
  note: string;
}

interface TodaySummary {
  tally: DailyTally | null;
  credits: CreditRecord[];
  totalSales: number;
  creditSales: number;
}

const emptyForm = (): FormState => ({
  totalSold: '',
  expenses: '',
  creditLines: [],
  note: '',
});

/** A single credit line input row */
function CreditLineInput({
  line,
  index,
  onChange,
  onRemove,
}: {
  line: CreditLine;
  index: number;
  onChange: (idx: number, field: keyof CreditLine, value: string) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div
      className="credit-line"
      style={{ flexDirection: 'column', gap: 8, paddingTop: 12, paddingBottom: 4 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted">
          Debtor #{index + 1}
        </span>
        <button
          id={`remove-credit-${index}`}
          type="button"
          className="btn btn--ghost"
          style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'var(--color-rose)' }}
          onClick={() => onRemove(index)}
          aria-label={`Remove debtor ${index + 1}`}
        >
          Remove
        </button>
      </div>

      <div className="flex gap-2">
        <input
          id={`credit-name-${index}`}
          className="form-input flex-1"
          type="text"
          placeholder="Name (e.g. Bola)"
          value={line.customerName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(index, 'customerName', e.target.value)}
          style={{ padding: '10px 12px' }}
        />
        <input
          id={`credit-amount-${index}`}
          className="form-input"
          type="text"
          placeholder="₦ Amount"
          value={line.amount === 0 ? '' : formatMoneyInput(line.amount)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(index, 'amount', e.target.value)}
          inputMode="numeric"
          style={{ width: 120, padding: '10px 12px', textAlign: 'right' }}
        />
      </div>

      <div className="form-group">
        <input
          id={`credit-due-${index}`}
          className="form-input"
          type="date"
          value={line.dueDate ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(index, 'dueDate', e.target.value)}
          min={todayISO()}
          style={{ padding: '8px 12px', fontSize: '0.875rem' }}
        />
        <p className="text-xs text-muted">Due date — optional</p>
      </div>
    </div>
  );
}

/** Confirmation overlay before saving */
function ConfirmationOverlay({
  form,
  onConfirm,
  onEdit,
}: {
  form: FormState;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const totalSold = parseMoneyInput(form.totalSold);
  const totalCredit = form.creditLines.reduce((s: number, l: CreditLine) => s + l.amount, 0);
  const cashSales = Math.max(0, totalSold - totalCredit);
  const expenses = parseMoneyInput(form.expenses);

  return (
    <div className="modal-overlay" onClick={onEdit}>
      <div className="modal-sheet" onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
        <h3 style={{ marginBottom: 16 }}>Confirm today&apos;s tally</h3>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-muted text-sm">Total sold</span>
            <span className="font-semibold" style={{ color: 'var(--color-emerald-light)', fontSize: '1.1rem' }}>
              {formatNaira(totalSold)}
            </span>
          </div>

          {totalCredit > 0 && (
            <>
              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">Cash received</span>
                <span className="font-semibold">{formatNaira(cashSales)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted text-sm">On credit</span>
                <span className="font-semibold" style={{ color: 'var(--color-amber-light)' }}>
                  {formatNaira(totalCredit)}
                </span>
              </div>
              {form.creditLines.map((l: CreditLine, i: number) => (
                <div key={i} className="flex justify-between items-center" style={{ paddingLeft: 16 }}>
                  <span className="text-xs text-muted">• {l.customerName || 'Unknown'}</span>
                  <span className="text-xs text-muted">{formatNaira(l.amount)}</span>
                </div>
              ))}
            </>
          )}

          {expenses > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-muted text-sm">Expenses</span>
              <span className="font-semibold" style={{ color: 'var(--color-rose)' }}>
                − {formatNaira(expenses)}
              </span>
            </div>
          )}

          {form.note && (
            <div className="flex justify-between items-start">
              <span className="text-muted text-sm">Note</span>
              <span className="text-sm" style={{ maxWidth: '60%', textAlign: 'right' }}>{form.note}</span>
            </div>
          )}
        </div>

        <div className="divider" />

        <div className="flex gap-3">
          <button
            id="confirm-edit-btn"
            type="button"
            className="btn btn--secondary flex-1"
            onClick={onEdit}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Edit
          </button>
          <button
            id="confirm-save-btn"
            type="button"
            className="btn btn--primary flex-1"
            onClick={onConfirm}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Save tally
          </button>
        </div>
      </div>
    </div>
  );
}

/** Toast notification */
function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className="toast"
      style={{
        borderColor: type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)',
        color: type === 'success' ? 'var(--color-emerald-light)' : 'var(--color-rose)',
      }}
    >
      {type === 'success' ? '✅ ' : '❌ '}{message}
    </div>
  );
}

export default function HomeScreen({ business, onGoToFollowUp, onOpenSettings }: Props) {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [customersMap, setCustomersMap] = useState<Record<string, string>>({});
  const today = todayISO();

  // Metric cards — this month's revenue and cash position
  const { metrics } = useDashboard(business);
  // Mini follow-up list — top 3 debtors by overdue status
  const { debtors } = useFollowUpList(business);
  const topDebtors = debtors.slice(0, 3);

  const loadTodaySummary = useCallback(async () => {
    const tally = await db.daily_tallies
      .where('[business_client_id+date]')
      .equals([business.client_id, today])
      .first() ?? null;
    const credits = await getCreditRecordsForDate(business.client_id, today);
    const creditSales = creditSalesForDate(credits, today);
    const totalSales = totalSalesForDay(tally ?? undefined, creditSales);
    setTodaySummary({ tally, credits, totalSales, creditSales });

    const allCustomers = await getCustomers(business.client_id);
    const map: Record<string, string> = {};
    for (const c of allCustomers) {
      map[c.client_id] = c.name;
    }
    setCustomersMap(map);

    if (tally) {
      setForm((f: FormState) => ({
        ...f,
        totalSold: String(totalSales || ''),
        expenses: String(tally.expenses || ''),
        note: tally.note,
      }));
    }
  }, [business.client_id, today]);

  useEffect(() => {
    loadTodaySummary();
  }, [loadTodaySummary]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [isListening, setIsListening] = useState(false);
  const [voiceHeard, setVoiceHeard] = useState<string | null>(null);

  const startVoiceInput = () => {
    const SpeechRec = typeof window !== 'undefined' && (
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition
    );

    if (!SpeechRec) {
      showToast('Speech recognition not supported in this browser. Please type your numbers.', 'error');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = business.language === 'yo' ? 'yo-NG' : business.language === 'pcm' ? 'pcm-NG' : 'en-NG';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceHeard(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setVoiceHeard(transcript);
        const parsed = parseVoiceTranscript(transcript);

        setForm((prev) => {
          const next = { ...prev };
          if (parsed.totalSold !== undefined) next.totalSold = formatMoneyInput(parsed.totalSold);
          if (parsed.expenses !== undefined) next.expenses = formatMoneyInput(parsed.expenses);
          if (parsed.creditLines.length > 0) {
            next.creditLines = parsed.creditLines.map((c) => ({ customerName: c.customerName, amount: c.amount }));
          }
          return next;
        });

        showToast('Voice tally populated! Check your figures below.', 'success');
      };

      recognition.onerror = () => {
        setIsListening(false);
        showToast('Could not recognize voice. Please type your numbers.', 'error');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      showToast('Microphone error. Please type your numbers.', 'error');
    }
  };

  const addCreditLine = () => {
    setForm((f: FormState) => ({
      ...f,
      creditLines: [...f.creditLines, { customerName: '', amount: 0 }],
    }));
  };

  const updateCreditLine = (idx: number, field: keyof CreditLine, value: string) => {
    setForm((f: FormState) => {
      const lines = [...f.creditLines];
      if (field === 'amount') {
        lines[idx] = { ...lines[idx], amount: parseMoneyInput(value) };
      } else {
        lines[idx] = { ...lines[idx], [field]: value };
      }
      return { ...f, creditLines: lines };
    });
  };

  const removeCreditLine = (idx: number) => {
    setForm((f: FormState) => ({
      ...f,
      creditLines: f.creditLines.filter((_: CreditLine, i: number) => i !== idx),
    }));
  };

  const handleSave = useCallback(async () => {
    setShowConfirm(false);
    setIsSaving(true);

    const totalSold = parseMoneyInput(form.totalSold);
    const totalCredit = form.creditLines.reduce((s: number, l: CreditLine) => s + l.amount, 0);
    const cashSales = Math.max(0, totalSold - totalCredit);
    const expenses = parseMoneyInput(form.expenses);

    try {
      await db.transaction('rw', [db.daily_tallies, db.customers, db.credit_records, db.outbox], async () => {
        await upsertTallyForDate(business.client_id, today, {
          cash_sales: cashSales,
          expenses,
          note: form.note,
        });

        for (const line of form.creditLines) {
          if (!line.customerName.trim() || line.amount <= 0) continue;
          const customer = await findOrCreateCustomer(
            business.client_id,
            line.customerName
          );
          await createCreditRecord({
            customer_client_id: customer.client_id,
            business_client_id: business.client_id,
            amount: line.amount,
            issued_date: today,
            due_date: line.dueDate ?? null,
          });
        }
      });

      await loadTodaySummary();
      setForm(emptyForm());
      setIsSaveSuccess(true);
      setTimeout(() => setIsSaveSuccess(false), 2000);
      showToast("Today's tally saved!", 'success');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Could not save. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [form, business, today, loadTodaySummary]);

  const handleSubmitForm = () => {
    const totalSold = parseMoneyInput(form.totalSold);
    if (totalSold === 0 && parseMoneyInput(form.expenses) === 0) {
      showToast('Enter at least one number to save.', 'error');
      return;
    }
    setShowConfirm(true);
  };

  return (
    <div className="page fade-in" style={{ padding: 0 }}>
      <header
        style={{
          padding: '20px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.375rem', marginBottom: 2 }}>
            {business.name}
          </h1>
          <p className="text-xs text-muted">{formatDate(today)}</p>
        </div>
        <SyncIndicator />
      </header>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div className="card" style={{ padding: '16px 18px', borderTop: '2px solid var(--color-emerald)', background: 'var(--color-surface)' }}>
              <div className="metric-label" style={{ marginBottom: 6 }}>Revenue (Month)</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-emerald-light)' }}>
                {formatNaira(metrics.revenue)}
              </div>
            </div>
            <div className="card" style={{ padding: '16px 18px', borderTop: '2px solid var(--color-emerald)', background: 'var(--color-surface)' }}>
              <div className="metric-label" style={{ marginBottom: 6 }}>Cash Position</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.25rem', color: 'var(--color-text-primary)' }}>
                {formatNaira(metrics.cashAtHand)}
              </div>
            </div>
          </div>
        )}

        <div className="tally-workspace-split">
          <div className="flex flex-col gap-4">
        {todaySummary?.tally && (
          <div className="card card--glow-emerald fade-in">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <span className="section-title">Today so far</span>
              <span className="badge badge--paid">✓ Saved</span>
            </div>
            <div className="flex justify-between">
              <div>
                <div className="metric-label">Total sold</div>
                <div className="metric-value metric-value--emerald" style={{ fontSize: '1.5rem' }}>
                  {formatNaira(todaySummary.totalSales)}
                </div>
              </div>
              {todaySummary.creditSales > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div className="metric-label">On credit</div>
                  <div className="metric-value metric-value--amber" style={{ fontSize: '1.5rem' }}>
                    {formatNaira(todaySummary.creditSales)}
                  </div>
                </div>
              )}
              {(todaySummary.tally.expenses > 0) && (
                <div style={{ textAlign: 'right' }}>
                  <div className="metric-label">Expenses</div>
                  <div className="metric-value" style={{ fontSize: '1.5rem', color: 'var(--color-rose)' }}>
                    {formatNaira(todaySummary.tally.expenses)}
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted mt-2">
              Tap fields below to update today&apos;s tally.
            </p>
          </div>
        )}

        <div className="card card--elevated">
          <div className="section-header">
            <h2 style={{ fontSize: '1rem' }}>Today&apos;s tally</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="voice-tally-btn"
                className={`btn btn--sm ${isListening ? 'btn--primary' : 'btn--secondary'}`}
                onClick={startVoiceInput}
                disabled={isListening}
                style={{ padding: '6px 12px', fontSize: '0.8rem', gap: 6 }}
                title="Speak today's tally"
              >
                {isListening ? (
                  <>
                    <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Listening…
                  </>
                ) : (
                  <>🎙️ Speak tally</>
                )}
              </button>
              {isSaving && <div className="spinner" style={{ width: 18, height: 18 }} />}
            </div>
          </div>

          {isListening && (
            <div
              className="card fade-in"
              style={{
                background: 'rgba(16,185,129,0.08)',
                borderColor: 'var(--color-emerald)',
                padding: '12px 16px',
                marginBottom: 12,
              }}
            >
              <p className="text-xs font-semibold" style={{ color: 'var(--color-emerald-light)' }}>
                🎙️ Listening... speak clearly:
              </p>
              <p className="text-xs text-muted mt-1">
                e.g. &ldquo;Sold 25000, expenses 4000, and Bola took 5000 credit&rdquo;
              </p>
            </div>
          )}

          {voiceHeard && !isListening && (
            <div
              className="card fade-in"
              style={{
                background: 'var(--color-surface-overlay)',
                borderColor: 'var(--color-border)',
                padding: '10px 14px',
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <p className="text-xs text-muted" style={{ fontStyle: 'italic' }}>
                🗣️ Heard: &ldquo;{voiceHeard}&rdquo;
              </p>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setVoiceHeard(null)}
                style={{ padding: '2px 6px', fontSize: '0.75rem' }}
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex flex-col gap-4">
            {/* Total Sold */}
            <div className="form-group">
              <label className="form-label" htmlFor="total-sold" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Total sold today (₦)
              </label>
              <div className="relative">
                <span style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)', fontSize: '1.25rem', pointerEvents: 'none',
                }}>₦</span>
                <input
                  id="total-sold"
                  className="form-input form-input--money"
                  type="text"
                  placeholder="0"
                  value={form.totalSold}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, totalSold: formatMoneyInput(e.target.value) }))}
                  inputMode="numeric"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Expenses */}
            <div className="form-group">
              <label className="form-label" htmlFor="expenses" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                  <polyline points="17 18 23 18 23 12" />
                </svg>
                Total expenses (₦)
              </label>
              <div className="relative">
                <span style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-text-muted)', fontSize: '1.25rem', pointerEvents: 'none',
                }}>₦</span>
                <input
                  id="expenses"
                  className="form-input form-input--money"
                  type="text"
                  placeholder="0"
                  value={form.expenses}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, expenses: formatMoneyInput(e.target.value) }))}
                  inputMode="numeric"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Credit section */}
            <div>
              <div className="section-header" style={{ marginBottom: 8 }}>
                <span className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  On credit — optional
                </span>
                <button
                  id="add-credit-btn"
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={addCreditLine}
                  style={{ padding: '4px 10px' }}
                >
                  + Add debtor
                </button>
              </div>

              {form.creditLines.length === 0 ? (
                <p className="text-xs text-muted" style={{ paddingBottom: 4 }}>
                  No credit sales today? Leave this empty — it&apos;s optional.
                </p>
              ) : (
                <div className="flex flex-col">
                  {form.creditLines.map((line: CreditLine, idx: number) => (
                    <CreditLineInput
                      key={idx}
                      line={line}
                      index={idx}
                      onChange={updateCreditLine}
                      onRemove={removeCreditLine}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Note */}
            <div className="form-group">
              <label className="form-label" htmlFor="note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                Note (optional)
              </label>
              <textarea
                id="note"
                className="form-input"
                placeholder="e.g. Bought market ticket, light bill"
                value={form.note}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f: FormState) => ({ ...f, note: e.target.value }))}
                rows={2}
                style={{ resize: 'none' }}
              />
            </div>

            <button
              id="save-tally-btn"
              type="button"
              className={`btn btn--primary ${isSaveSuccess ? 'btn--save-success' : ''}`}
              onClick={handleSubmitForm}
              disabled={isSaving}
              style={{
                transition: 'background-color 0.2s ease, transform 0.1s ease',
              }}
            >
              {isSaving ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving…</>
              ) : isSaveSuccess ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Saved!
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Save today&apos;s tally
                </span>
              )}
            </button>
          </div>

          {/* Voice toggle hint */}
          <div className="text-center mt-4">
            {business.voice_enabled ? (
              <span
                className="badge badge--paid"
                style={{ fontSize: '0.75rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                🎙️ Voice Tally Enabled
              </span>
            ) : (
              <p className="text-xs text-muted">
                Prefer to speak this?{' '}
                {onOpenSettings ? (
                  <button
                    type="button"
                    onClick={onOpenSettings}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-emerald-light)',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      padding: 0,
                      font: 'inherit',
                      fontSize: 'inherit',
                    }}
                  >
                    Turn on in settings
                  </button>
                ) : (
                  'Turn on in settings.'
                )}
              </p>
            )}
          </div>
        </div>

          </div>

          <div className="flex flex-col gap-4">
        {todaySummary && todaySummary.credits.length > 0 && (
          <div>
            <div className="section-header">
              <span className="section-title">Credit given today</span>
            </div>
            <div className="flex flex-col gap-2">
              {todaySummary.credits.map((cr: CreditRecord) => (
                <div key={cr.client_id} className="card" style={{ padding: '12px 16px' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium" style={{ fontSize: '0.9rem' }}>
                      {customersMap[cr.customer_client_id] || 'Debtor'}
                    </span>
                    <span className="font-semibold text-amber">{formatNaira(cr.amount)}</span>
                  </div>
                  {cr.due_date && (
                    <p className="text-xs text-muted mt-1">
                      Due: {formatDate(cr.due_date)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {topDebtors.length > 0 && (
          <div>
            <div className="section-header">
              <span className="section-title">Who to follow up with</span>
              {onGoToFollowUp && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={onGoToFollowUp}
                  style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  See all →
                </button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {topDebtors.map((debtor) => (
                <div
                  key={debtor.customer.client_id}
                  className={`debtor-item ${debtor.isOverdue ? 'debtor-item--overdue' : ''}`}
                >
                  <div
                    className={`debtor-avatar ${debtor.isOverdue ? 'debtor-avatar--overdue' : ''}`}
                  >
                    {debtor.customer.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-medium truncate" style={{ fontSize: '0.875rem' }}>
                      {debtor.customer.name}
                    </div>
                    {debtor.oldestDueDate && (
                      <div className="text-xs text-muted">
                        Due: {formatDate(debtor.oldestDueDate)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontFamily: "'Space Grotesk', sans-serif",
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        color: debtor.isOverdue ? 'var(--color-rose)' : 'var(--color-amber-light)',
                      }}
                    >
                      {formatNaira(debtor.totalOutstanding)}
                    </div>
                    {debtor.isOverdue && (
                      <span className="badge badge--overdue" style={{ fontSize: '0.6rem', marginTop: 2, display: 'inline-block' }}>Overdue</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

          </div>

        </div>

      </div>

      {showConfirm && (
        <ConfirmationOverlay
          form={form}
          onConfirm={handleSave}
          onEdit={() => setShowConfirm(false)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
