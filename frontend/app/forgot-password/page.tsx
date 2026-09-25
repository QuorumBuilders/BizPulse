'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset, AuthApiError } from '@/api/authApi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setIsSubmitted(true);
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        setError(err.message || 'Could not send reset link. Try again.');
      } else {
        setError('Network error. Please check your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page--auth fade-in">
      {/* Brand logo */}
      <div className="auth-logo">
        <div className="auth-logo__icon">🔐</div>
        <span className="auth-logo__name">BizPulse</span>
      </div>

      {isSubmitted ? (
        <div className="fade-in">
          <h1 style={{ marginBottom: 8 }}>Check your email</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 24, lineHeight: 1.6 }}>
            If an account exists for <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>,
            we&apos;ve sent a link to reset your password. The link expires in 1 hour.
          </p>

          <div
            className="card"
            style={{
              marginBottom: 24,
              background: 'rgba(16,185,129,0.06)',
              borderColor: 'rgba(16,185,129,0.3)',
            }}
          >
            <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>
              💡 Check your spam or promotions folder if you don&apos;t see the email within a couple of minutes.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/login" className="btn btn--primary" style={{ textDecoration: 'none', textAlign: 'center' }}>
              Return to Sign in →
            </Link>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => setIsSubmitted(false)}
            >
              Try another email
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 style={{ marginBottom: 4 }}>Reset your password</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
            Enter your registered email address and we&apos;ll send you a link to reset your password.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="forgot-email">
              Email address
            </label>
            <input
              id="forgot-email"
              className="form-input"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              autoComplete="email"
              inputMode="email"
              disabled={isLoading}
              required
            />
            {error && <p className="form-error">{error}</p>}
          </div>

          <button
            id="forgot-submit-btn"
            type="submit"
            className="btn btn--primary mt-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Sending link…</>
            ) : (
              'Send reset link →'
            )}
          </button>

          <div className="text-center mt-4">
            <Link
              href="/login"
              className="text-sm text-muted"
              style={{ textDecoration: 'none' }}
            >
              ← Back to Sign in
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
