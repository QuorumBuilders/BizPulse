'use client';

import React, { useState, useCallback } from 'react';

interface Props {
  onSignup: (payload: {
    name: string;
    phoneOrEmail: string;
    password: string;
    businessName: string;
    businessType: string;
    startingCash: number;
  }) => Promise<void>;
  onGoToLogin: () => void;
}

const BUSINESS_TYPES = [
  'Provisions / Grocery',
  'Foodstuff / Farm Produce',
  'Food Vendor / Canteen',
  'Salon / Beauty',
  'Clothing / Fashion',
  'Electronics / Accessories',
  'Pharmacy / Chemist',
  'Drinks / Beverages',
  'Building Materials',
  'Other',
];

export default function SignupScreen({ onSignup, onGoToLogin }: Props) {
  // Step 1: account, Step 2: business (onboarding merged in)
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '',
    phoneOrEmail: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: BUSINESS_TYPES[0],
    startingCash: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (field: string, value: string) => {
    setForm((f: typeof form) => ({ ...f, [field]: value }));
    setErrors((e: Record<string, string>) => ({ ...e, [field]: '' }));
    setApiError('');
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.phoneOrEmail.trim()) e.phoneOrEmail = 'Phone number or email is required';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!form.businessName.trim()) e.businessName = 'Business name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validateStep1()) setStep(2);
  };

  const handleSubmit = useCallback(async () => {
    if (!validateStep2()) return;
    setIsLoading(true);
    try {
      await onSignup({
        name: form.name,
        phoneOrEmail: form.phoneOrEmail,
        password: form.password,
        businessName: form.businessName,
        businessType: form.businessType,
        startingCash: parseFloat(form.startingCash || '0'),
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setIsLoading(false);
    }
  }, [form, onSignup]);

  return (
    <div className="page page--auth fade-in">
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo__icon">📊</div>
        <span className="auth-logo__name">BizPulse</span>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2].map((s: number) => (
          <div
            key={s}
            style={{
              height: 4,
              flex: 1,
              borderRadius: 999,
              background: step >= s ? 'var(--color-emerald)' : 'var(--color-border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>

      <h1 style={{ marginBottom: 8 }}>
        {step === 1 ? 'Create your account' : 'Set up your business'}
      </h1>
      <p className="text-muted text-sm" style={{ marginBottom: 32 }}>
        {step === 1
          ? 'Your financial history starts today.'
          : 'Tell us a bit about what you sell.'}
      </p>

      {step === 1 ? (
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="signup-name">Full name</label>
            <input
              id="signup-name"
              className="form-input"
              type="text"
              placeholder="e.g. Adaeze Okafor"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('name', e.target.value)}
              autoComplete="name"
            />
            {errors.name && <p className="form-error">{errors.name}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-identifier">Phone number or email</label>
            <input
              id="signup-identifier"
              className="form-input"
              type="text"
              placeholder="08012345678 or you@email.com"
              value={form.phoneOrEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('phoneOrEmail', e.target.value)}
              autoComplete="username"
              inputMode="email"
            />
            {errors.phoneOrEmail && <p className="form-error">{errors.phoneOrEmail}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-password">Password</label>
            <input
              id="signup-password"
              className="form-input"
              type="password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('password', e.target.value)}
              autoComplete="new-password"
            />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-confirm">Confirm password</label>
            <input
              id="signup-confirm"
              className="form-input"
              type="password"
              placeholder="Same password again"
              value={form.confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('confirmPassword', e.target.value)}
              autoComplete="new-password"
            />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
          </div>

          <button id="signup-next-btn" type="button" className="btn btn--primary mt-4" onClick={handleNext}>
            Continue →
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="biz-name">Business name</label>
            <input
              id="biz-name"
              className="form-input"
              type="text"
              placeholder="e.g. Mama Ada Provisions"
              value={form.businessName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('businessName', e.target.value)}
            />
            {errors.businessName && <p className="form-error">{errors.businessName}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="biz-type">What do you sell?</label>
            <select
              id="biz-type"
              className="form-input"
              value={form.businessType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => set('businessType', e.target.value)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              {BUSINESS_TYPES.map((t: string) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="starting-cash">
              Starting cash (₦) — optional
            </label>
            <input
              id="starting-cash"
              className="form-input form-input--money"
              type="number"
              placeholder="0"
              value={form.startingCash}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('startingCash', e.target.value)}
              inputMode="decimal"
            />
            <p className="text-xs text-muted mt-2">
              How much cash your business currently has. Used to calculate your cash position.
            </p>
          </div>

          {apiError && (
            <div className="card" style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'var(--color-rose-glow)' }}>
              <p className="text-sm" style={{ color: 'var(--color-rose)' }}>{apiError}</p>
              <p className="text-xs text-muted mt-2">
                No network? Your account will sync once you&apos;re online. Your tally still works offline.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              id="signup-back-btn"
              type="button"
              className="btn btn--secondary"
              onClick={() => setStep(1)}
              style={{ flex: '0 0 auto', width: 'auto', paddingLeft: 20, paddingRight: 20 }}
            >
              ← Back
            </button>
            <button
              id="signup-submit-btn"
              type="button"
              className="btn btn--primary flex-1"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Setting up…</>
              ) : (
                'Start tracking →'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="text-center mt-6">
        <p className="text-sm text-muted">
          Already have an account?{' '}
          <button id="go-to-login-btn" type="button" className="btn btn--ghost" style={{ padding: '4px 8px', display: 'inline-flex' }} onClick={onGoToLogin}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
