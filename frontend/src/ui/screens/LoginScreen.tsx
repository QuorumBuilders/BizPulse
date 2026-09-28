'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { AuthApiError, resendVerificationEmail } from '@/api/authApi';

interface Props {
  onLogin: (email: string, password: string) => Promise<void>;
  onGoToSignup: () => void;
  onGoToForgotPassword?: () => void;
}

export default function LoginScreen({ onLogin, onGoToSignup, onGoToForgotPassword }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUnverified, setIsUnverified] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) {
      e.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      e.email = 'Please enter a valid email address';
    }
    if (!password) {
      e.password = 'Password is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = useCallback(async () => {
    if (!validate()) return;
    setIsLoading(true);
    setApiError('');
    setIsUnverified(false);
    setResendStatus(null);
    try {
      await onLogin(email.trim().toLowerCase(), password);
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        const detail = typeof err.details?.detail === 'string' ? err.details.detail : '';
        const msg = err.message || '';
        const combined = `${detail} ${msg}`.toLowerCase();

        if (combined.includes('verify your email') || combined.includes('unverified')) {
          setIsUnverified(true);
          setApiError('Please verify your email address before logging in.');
        } else if (err.status === 401) {
          setApiError(detail || 'Incorrect email or password. Please try again.');
        } else {
          setApiError(msg || 'Login failed. Please check your credentials.');
        }
      } else {
        setApiError(err instanceof Error ? err.message : 'Login failed. Check your details.');
      }
      setIsLoading(false);
    }
  }, [email, password, onLogin]);

  /** Demo login — uses the exact same login() call as real users. */
  const handleDemoLogin = useCallback(async () => {
    setIsDemoLoading(true);
    setDemoError('');
    try {
      await onLogin('addergranzl@example.com', 'DemoPassword123!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed. Please try again.';
      setDemoError(msg);
      setIsDemoLoading(false);
    }
  }, [onLogin]);

  // Auto-fill/auto-login if navigated from "View live demo" on landing page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('demo') === '1') {
        handleDemoLogin();
      }
    }
  }, [handleDemoLogin]);

  const handleResend = async () => {
    if (!email.trim() || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await resendVerificationEmail(email.trim().toLowerCase());
      setResendStatus('Verification email sent! Please check your inbox and spam folder.');
    } catch (err: unknown) {
      setResendStatus(err instanceof Error ? err.message : 'Could not resend email right now.');
    } finally {
      setIsResending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="page page--auth fade-in">
      <div className="auth-logo">
        <div className="auth-logo__icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <span className="auth-logo__name">BizPulse</span>
      </div>

      <h1 style={{ marginBottom: 8 }}>Welcome back</h1>
      <p className="text-muted text-sm" style={{ marginBottom: 32 }}>
        Sign in to see your business numbers.
      </p>

      <div className="flex flex-col gap-4">
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            className="form-input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setEmail(e.target.value);
              setErrors({});
              setApiError('');
              setIsUnverified(false);
            }}
            autoComplete="email"
            inputMode="email"
            onKeyDown={handleKeyDown}
          />
          {errors.email && <p className="form-error">{errors.email}</p>}
        </div>

        <div className="form-group">
          <div className="flex justify-between items-center">
            <label className="form-label" htmlFor="login-password">Password</label>
            {onGoToForgotPassword ? (
              <button
                type="button"
                className="text-xs text-muted"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                onClick={onGoToForgotPassword}
              >
                Forgot password?
              </button>
            ) : (
              <Link href="/forgot-password" className="text-xs text-muted" style={{ textDecoration: 'none' }}>
                Forgot password?
              </Link>
            )}
          </div>
          <input
            id="login-password"
            className="form-input"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value);
              setErrors({});
              setApiError('');
            }}
            autoComplete="current-password"
            onKeyDown={handleKeyDown}
          />
          {errors.password && <p className="form-error">{errors.password}</p>}
        </div>

        {apiError && (
          <div
            className="card"
            style={{
              borderColor: isUnverified ? 'rgba(234,179,8,0.4)' : 'rgba(244,63,94,0.3)',
              background: isUnverified ? 'rgba(234,179,8,0.08)' : 'rgba(244,63,94,0.06)',
            }}
          >
            <p className="text-sm" style={{ color: isUnverified ? '#eab308' : 'var(--color-rose)' }}>
              {apiError}
            </p>

            {isUnverified && (
              <div className="mt-3">
                <button
                  type="button"
                  id="resend-from-login-btn"
                  className="btn btn--secondary btn--sm"
                  onClick={handleResend}
                  disabled={isResending}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  {isResending ? 'Sending verification email…' : 'Resend verification email'}
                </button>
              </div>
            )}
          </div>
        )}

        {resendStatus && (
          <div className="card" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.3)' }}>
            <p className="text-xs" style={{ color: 'var(--color-emerald)' }}>{resendStatus}</p>
          </div>
        )}

        <button
          id="login-submit-btn"
          type="button"
          className="btn btn--primary mt-2"
          onClick={handleLogin}
          disabled={isLoading || isDemoLoading}
        >
          {isLoading ? (
            <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in…</>
          ) : (
            'Sign in →'
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
          <span className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-border)' }} />
        </div>

        <button
          id="demo-login-btn"
          type="button"
          className="demo-access-btn"
          onClick={handleDemoLogin}
          disabled={isLoading || isDemoLoading}
          title="Log in with the pre-seeded demo account to explore the dashboard"
        >
          {isDemoLoading ? (
            <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Opening demo…</>
          ) : (
            <>
              <span className="demo-badge">Demo</span>
              Try Demo Account
            </>
          )}
        </button>

        {demoError && (
          <p className="text-xs" style={{ color: 'var(--color-rose)', textAlign: 'center' }}>
            {demoError}
          </p>
        )}
      </div>

      <div className="text-center mt-6">
        <p className="text-sm text-muted">
          No account yet?{' '}
          <button
            id="go-to-signup-btn"
            type="button"
            className="btn btn--ghost"
            style={{ padding: '4px 8px', display: 'inline-flex' }}
            onClick={onGoToSignup}
          >
            Create one free
          </button>
        </p>
      </div>

      <div className="pwa-banner mt-6" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
          💡 <strong style={{ color: 'var(--color-text-primary)' }}>Works offline.</strong>{' '}
          You can log today&apos;s tally even with no network. Your data syncs automatically when you reconnect.
        </p>
      </div>
    </div>
  );
}
