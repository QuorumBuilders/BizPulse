'use client';

import React, { useState, useCallback } from 'react';

interface Props {
  onLogin: (phoneOrEmail: string, password: string) => Promise<void>;
  onGoToSignup: () => void;
}

export default function LoginScreen({ onLogin, onGoToSignup }: Props) {
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ phoneOrEmail?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    if (!phoneOrEmail.trim()) e.phoneOrEmail = 'Phone number or email is required';
    if (!password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = useCallback(async () => {
    if (!validate()) return;
    setIsLoading(true);
    setApiError('');
    try {
      await onLogin(phoneOrEmail, password);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Login failed. Check your details.');
      setIsLoading(false);
    }
  }, [phoneOrEmail, password, onLogin]);

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
          <label className="form-label" htmlFor="login-identifier">Phone number or email</label>
          <input
            id="login-identifier"
            className="form-input"
            type="text"
            placeholder="08012345678 or you@email.com"
            value={phoneOrEmail}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPhoneOrEmail(e.target.value);
              setErrors({});
              setApiError('');
            }}
            autoComplete="username"
            inputMode="email"
            onKeyDown={handleKeyDown}
          />
          {errors.phoneOrEmail && <p className="form-error">{errors.phoneOrEmail}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">Password</label>
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
            style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.06)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-rose)' }}>{apiError}</p>
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
