'use client';

import React, { useState, useCallback } from 'react';
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
      {/* Logo */}
      <div className="auth-logo">
        <div className="auth-logo__icon">📊</div>
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
          disabled={isLoading}
        >
          {isLoading ? (
            <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Signing in…</>
          ) : (
            'Sign in →'
          )}
        </button>
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

      {/* Demo hint */}
      <div className="pwa-banner mt-6" style={{ marginTop: 'auto', paddingTop: 24 }}>
        <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>
          💡 <strong style={{ color: 'var(--color-text-primary)' }}>Works offline.</strong>{' '}
          You can log today&apos;s tally even with no network. Your data syncs automatically when you reconnect.
        </p>
      </div>
    </div>
  );
}
