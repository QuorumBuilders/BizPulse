
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { db } from '@/data/db';
import { upsertTallyForDate } from '@/data/repositories/dailyTallyRepo';
import { findOrCreateCustomer, getCustomers } from '@/data/repositories/customerRepo';
import { createCreditRecord, getCreditRecordsForDate } from '@/data/repositories/creditRecordRepo';
import {
  formatNaira,
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
          type="number"
          placeholder="₦ Amount"
          value={line.amount === 0 ? '' : String(line.amount)}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(index, 'amount', e.target.value)}
          inputMode="decimal"
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
  const totalSold = parseFloat(form.totalSold || '0');
  const totalCredit = form.creditLines.reduce((s: number, l: CreditLine) => s + l.amount, 0);
  const cashSales = Math.max(0, totalSold - totalCredit);
  const expenses = parseFloat(form.expenses || '0');

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
          <button id="confirm-edit-btn" type="button" className="btn btn--secondary flex-1" onClick={onEdit}>
            ✏️ Edit
          </button>
          <button id="confirm-save-btn" type="button" className="btn btn--primary flex-1" onClick={onConfirm}>
            ✅ Save tally
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

    // Load customer names for lookup
    const allCustomers = await getCustomers(business.client_id);
    const map: Record<string, string> = {};
    for (const c of allCustomers) {
      map[c.client_id] = c.name;
    }
    setCustomersMap(map);

    // Pre-fill form if tally exists
    if (tally) {
      setForm((f: FormState) => ({
        ...f,
        totalSold: String(totalSales || ''),
        expenses: String(tally.expenses || ''),
        note: tally.note,
      }));
    }
  }, [business.client_id, today]);

  // Load today's existing tally on mount (for editing)
  useEffect(() => {
    loadTodaySummary();
  }, [loadTodaySummary]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Speech-to-text recording
  const [isListening, setIsListening] = useState(false);
  const [voiceHeard, setVoiceHeard] = useState<string | null>(null);

  const startVoiceInput = () => {
    // Check Web Speech API support
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
          if (parsed.totalSold !== undefined) next.totalSold = String(parsed.totalSold);
          if (parsed.expenses !== undefined) next.expenses = String(parsed.expenses);
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

  // Credit line helpers
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
        lines[idx] = { ...lines[idx], amount: parseFloat(value) || 0 };
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

    const totalSold = parseFloat(form.totalSold || '0');
    const totalCredit = form.creditLines.reduce((s: number, l: CreditLine) => s + l.amount, 0);
    const cashSales = Math.max(0, totalSold - totalCredit);
    const expenses = parseFloat(form.expenses || '0');

    try {
      await db.transaction('rw', [db.daily_tallies, db.customers, db.credit_records, db.outbox], async () => {
        // 1. Upsert the DailyTally (cash_sales = totalSold - credit)
        await upsertTallyForDate(business.client_id, today, {
          cash_sales: cashSales,
          expenses,
          note: form.note,
        });

        // 2. Create a CreditRecord per named debtor
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
      showToast("Today's tally saved!", 'success');
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Could not save. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [form, business, today, loadTodaySummary]);

  const handleSubmitForm = () => {
    const totalSold = parseFloat(form.totalSold || '0');
    if (totalSold === 0 && parseFloat(form.expenses || '0') === 0) {
      showToast('Enter at least one number to save.', 'error');
      return;
    }
    setShowConfirm(true);
  };

  return (
    <div className="page fade-in" style={{ padding: 0 }}>
      {/* Header */}
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

        {/* TOP METRIC CARDS — Revenue this month + Cash position */}
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div className="metric-label" style={{ marginBottom: 4 }}>💰 Revenue (month)</div>
              <div className="font-bold" style={{ fontSize: '1.2rem', color: 'var(--color-emerald-light)' }}>
                {formatNaira(metrics.revenue)}
              </div>
            </div>
            <div className="card" style={{ padding: '14px 16px' }}>
              <div className="metric-label" style={{ marginBottom: 4 }}>💵 Cash position</div>
              <div className="font-bold" style={{ fontSize: '1.2rem', color: 'var(--color-text-primary)' }}>
                {formatNaira(metrics.cashAtHand)}
              </div>
            </div>
          </div>
        )}

        {/* TODAY'S SAVED SUMMARY (if already logged today) */}
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

        {/* TODAY'S TALLY ENTRY */}
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
                background: 'rgba(255,255,255,0.03)',
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
              <label className="form-label" htmlFor="total-sold">
                💰 Total sold today (₦)
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
                  type="number"
                  placeholder="0"
                  value={form.totalSold}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, totalSold: e.target.value }))}
                  inputMode="decimal"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Expenses */}
            <div className="form-group">
              <label className="form-label" htmlFor="expenses">
                🧾 Total expenses (₦)
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
                  type="number"
                  placeholder="0"
                  value={form.expenses}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, expenses: e.target.value }))}
                  inputMode="decimal"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            {/* Credit section */}
            <div>
              <div className="section-header" style={{ marginBottom: 8 }}>
                <span className="form-label">💳 On credit — optional</span>
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
              <label className="form-label" htmlFor="note">
                📝 Note (optional)
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
              className="btn btn--primary"
              onClick={handleSubmitForm}
              disabled={isSaving}
            >
              {isSaving ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Saving…</>
              ) : (
                "✅ Save today's tally"
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

        {/* DEBTORS TODAY (if any credit was given today) */}
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

        {/* MINI FOLLOW-UP LIST — top 3 debtors */}
        {topDebtors.length > 0 && (
          <div>
            <div className="section-header">
              <span className="section-title">⚠️ Who to follow up with</span>
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
                    <div className="font-semibold text-amber" style={{ fontSize: '0.875rem' }}>
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

      {/* Confirmation overlay */}
      {showConfirm && (
        <ConfirmationOverlay
          form={form}
          onConfirm={handleSave}
          onEdit={() => setShowConfirm(false)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
