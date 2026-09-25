'use client';

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { confirmPasswordReset, AuthApiError } from '@/api/authApi';

export default function ResetPasswordScreen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!password) {
      e.password = 'New password is required';
    } else if (password.length < 8) {
      e.password = 'Password must be at least 8 characters';
    }
    if (password !== confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (!token) {
      setApiError('Missing reset token. Please open the link directly from your email.');
      return;
    }

    setIsLoading(true);
    setApiError(null);

    try {
      await confirmPasswordReset({
        token,
        new_password: password,
        password_confirmation: confirmPassword,
      });
      setIsSuccess(true);
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        if (err.code === 'INVALID_PASSWORD_RESET_TOKEN') {
          setApiError('This password reset link is invalid or has expired. Please request a new one.');
        } else if (err.details && typeof err.details.password !== 'undefined') {
          const pwdErr = Array.isArray(err.details.password)
            ? err.details.password.join(' ')
            : String(err.details.password);
          setErrors((prev) => ({ ...prev, password: pwdErr }));
        } else {
          setApiError(err.message || 'Failed to reset password. Please try again.');
        }
      } else {
        setApiError('Network error. Check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page--auth fade-in">
      {/* Brand logo */}
      <div className="auth-logo">
        <div className="auth-logo__icon">🔑</div>
        <span className="auth-logo__name">BizPulse</span>
      </div>

      {isSuccess ? (
        <div className="fade-in">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-emerald-glow)',
              border: '2px solid var(--color-emerald)',
              color: 'var(--color-emerald-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              margin: '0 auto 16px',
            }}
          >
            ✓
          </div>
          <h1 style={{ marginBottom: 8, textAlign: 'center' }}>Password updated!</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 24, textAlign: 'center' }}>
            Your BizPulse password has been successfully reset. You can now sign in with your new password.
          </p>

          <Link
            href="/login"
            className="btn btn--primary"
            style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}
          >
            Sign in now →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <h1 style={{ marginBottom: 4 }}>Set new password</h1>
          <p className="text-muted text-sm" style={{ marginBottom: 16 }}>
            Enter your new password below to secure your BizPulse account.
          </p>

          {!token && (
            <div className="card" style={{ borderColor: 'rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.08)' }}>
              <p className="text-xs" style={{ color: 'var(--color-rose)' }}>
                ⚠️ No reset token was found in the link. Please make sure you clicked the complete link from your email.
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="reset-password">
              New password
            </label>
            <input
              id="reset-password"
              className="form-input"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors((prev) => ({ ...prev, password: '' }));
                setApiError(null);
              }}
              autoComplete="new-password"
              disabled={isLoading}
              required
            />
            {errors.password && <p className="form-error">{errors.password}</p>}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reset-confirm-password">
              Confirm new password
            </label>
            <input
              id="reset-confirm-password"
              className="form-input"
              type="password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: '' }));
                setApiError(null);
              }}
              autoComplete="new-password"
              disabled={isLoading}
              required
            />
            {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
          </div>

          {apiError && (
            <div className="card" style={{ borderColor: 'rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.08)' }}>
              <p className="text-xs" style={{ color: 'var(--color-rose)' }}>
                {apiError}
              </p>
              <div className="mt-2">
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold"
                  style={{ color: 'var(--color-emerald-light)', textDecoration: 'none' }}
                >
                  Request a new reset link →
                </Link>
              </div>
            </div>
          )}

          <button
            id="reset-submit-btn"
            type="submit"
            className="btn btn--primary mt-2"
            disabled={isLoading || !token}
          >
            {isLoading ? (
              <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Updating password…</>
            ) : (
              'Save new password →'
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
