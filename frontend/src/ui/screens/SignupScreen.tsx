'use client';

import React, { useState, useCallback } from 'react';
import { AuthApiError, resendVerificationEmail } from '@/api/authApi';
import { formatMoneyInput, parseMoneyInput } from '@/domain/derivations';

interface SignupPayload {
  displayName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  businessName: string;
  businessType: string;
  startingCash: number;
}

interface Props {
  onSignup: (payload: SignupPayload) => Promise<void>;
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
    displayName: '',
    email: '',
    password: '',
    passwordConfirmation: '',
    businessName: '',
    businessType: BUSINESS_TYPES[0],
    startingCash: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  
  // Verification pending state after successful registration
  const [isRegistered, setIsRegistered] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const set = (field: string, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: '' }));
    setApiError('');
  };

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!form.displayName.trim()) e.displayName = 'Full name is required';
    if (!form.email.trim()) {
      e.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = 'Please enter a valid email address';
    }
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    if (form.password !== form.passwordConfirmation) e.passwordConfirmation = 'Passwords do not match';
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
    setApiError('');
    try {
      await onSignup({
        displayName: form.displayName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        passwordConfirmation: form.passwordConfirmation,
        businessName: form.businessName.trim(),
        businessType: form.businessType,
        startingCash: parseMoneyInput(form.startingCash),
      });
      setIsRegistered(true);
    } catch (err: unknown) {
      if (err instanceof AuthApiError && err.details) {
        const fieldErrors: Record<string, string> = {};
        for (const [key, val] of Object.entries(err.details)) {
          const msg = Array.isArray(val) ? val.join(' ') : String(val);
          if (key === 'email') fieldErrors.email = msg;
          else if (key === 'display_name') fieldErrors.displayName = msg;
          else if (key === 'password') fieldErrors.password = msg;
          else if (key === 'password_confirmation') fieldErrors.passwordConfirmation = msg;
          else if (key === 'non_field_errors') setApiError(msg);
          else fieldErrors[key] = msg;
        }
        setErrors(fieldErrors);
        // If there are step 1 errors, jump back to step 1
        if (fieldErrors.email || fieldErrors.displayName || fieldErrors.password || fieldErrors.passwordConfirmation) {
          setStep(1);
        }
        if (!Object.keys(fieldErrors).length && !apiError) {
          setApiError(err.message || 'Registration failed. Please check your inputs.');
        }
      } else {
        setApiError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [form, onSignup, apiError]);

  const handleResendVerification = async () => {
    if (!form.email || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await resendVerificationEmail(form.email.trim().toLowerCase());
      setResendStatus('Verification email resent! Check your inbox or spam folder.');
    } catch (err: unknown) {
      setResendStatus(
        err instanceof Error ? err.message : 'Could not resend email right now. Please try again later.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // If successfully registered, show verification pending screen
  if (isRegistered) {
    return (
      <div className="page page--auth fade-in">
        <div className="auth-logo">
          <div className="auth-logo__icon">✉️</div>
          <span className="auth-logo__name">BizPulse</span>
        </div>

        <h1 style={{ marginBottom: 8 }}>Check your email</h1>
        <p className="text-muted text-sm" style={{ marginBottom: 24, lineHeight: 1.6 }}>
          We sent an activation link to <strong style={{ color: 'var(--color-text-primary)' }}>{form.email}</strong>.
          Please click the link in your email to activate your account before signing in.
        </p>

        <div className="card" style={{ marginBottom: 24, background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.3)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--color-emerald)', marginBottom: 4 }}>
            ✓ Account registered successfully
          </p>
          <p className="text-xs text-muted">
            Your business details and offline tallies are safely saved on this device.
          </p>
        </div>

        {resendStatus && (
          <div className="card" style={{ marginBottom: 20, background: 'var(--color-surface-overlay)' }}>
            <p className="text-xs text-muted">{resendStatus}</p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            id="go-to-login-after-signup-btn"
            type="button"
            className="btn btn--primary"
            onClick={onGoToLogin}
          >
            Go to Sign in →
          </button>
          <button
            id="resend-verification-btn"
            type="button"
            className="btn btn--secondary"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? 'Resending email…' : 'Didn’t receive it? Resend link'}
          </button>
        </div>
      </div>
    );
  }

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
              value={form.displayName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('displayName', e.target.value)}
              autoComplete="name"
            />
            {errors.displayName && <p className="form-error">{errors.displayName}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="signup-email">Email address</label>
            <input
              id="signup-email"
              className="form-input"
              type="email"
              placeholder="you@email.com"
              value={form.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('email', e.target.value)}
              autoComplete="email"
              inputMode="email"
            />
            {errors.email && <p className="form-error">{errors.email}</p>}
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
              value={form.passwordConfirmation}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('passwordConfirmation', e.target.value)}
              autoComplete="new-password"
            />
            {errors.passwordConfirmation && <p className="form-error">{errors.passwordConfirmation}</p>}
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
              type="text"
              placeholder="0"
              value={form.startingCash}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => set('startingCash', formatMoneyInput(e.target.value))}
              inputMode="numeric"
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
