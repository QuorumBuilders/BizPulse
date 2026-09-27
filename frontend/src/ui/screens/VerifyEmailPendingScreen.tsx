'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { resendVerificationEmail } from '@/api/authApi';

interface Props {
  email?: string;
  onGoToLogin?: () => void;
}

export default function VerifyEmailPendingScreen({ email = '', onGoToLogin }: Props) {
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email || isResending) return;
    setIsResending(true);
    setResendStatus(null);
    try {
      await resendVerificationEmail(email.trim().toLowerCase());
      setResendStatus('Verification email resent! Check your inbox or spam folder.');
    } catch (err: unknown) {
      setResendStatus(
        err instanceof Error ? err.message : 'Could not resend email right now. Please try again later.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="page page--auth fade-in">
      <div className="auth-logo">
        <div className="auth-logo__icon">✉️</div>
        <span className="auth-logo__name">BizPulse</span>
      </div>

      <h1 style={{ marginBottom: 8 }}>Check your email</h1>
      <p className="text-muted text-sm" style={{ marginBottom: 24, lineHeight: 1.6 }}>
        {email ? (
          <>We sent an activation link to <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>.</>
        ) : (
          'Please verify your email address to activate your account.'
        )}
        <br />
        Click the link in your email before logging in.
      </p>

      <div className="card" style={{ marginBottom: 24, background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.3)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--color-emerald)', marginBottom: 4 }}>
          ✓ Account registration received
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
        {onGoToLogin ? (
          <button
            id="go-to-login-after-signup-btn"
            type="button"
            className="btn btn--primary"
            onClick={onGoToLogin}
          >
            Go to Sign in →
          </button>
        ) : (
          <Link
            href="/login"
            id="go-to-login-after-signup-btn"
            className="btn btn--primary"
            style={{ textAlign: 'center', textDecoration: 'none' }}
          >
            Go to Sign in →
          </Link>
        )}

        {email && (
          <button
            id="resend-verification-btn"
            type="button"
            className="btn btn--secondary"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Resending email…' : 'Didn’t receive it? Resend link'}
          </button>
        )}
      </div>
    </div>
  );
}
