'use client';

import React, { useState } from 'react';
import type { Business } from '@/domain/types';
import { formatMoneyInput, parseMoneyInput } from '@/domain/derivations';

interface Props {
  onComplete: (patch: Partial<Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at'>>) => Promise<void>;
}

/**
 * OnboardingScreen is shown when the user is authenticated but their
 * Business record doesn't exist in local IndexedDB yet.
 */
export default function OnboardingScreen({ onComplete }: Props) {
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('Provisions / Grocery');
  const [startingCash, setStartingCash] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!businessName.trim()) {
      setError('Business name is required');
      return;
    }
    setIsLoading(true);
    await onComplete({
      name: businessName,
      type: businessType,
      starting_cash: parseMoneyInput(startingCash),
      language: 'en',
      voice_enabled: false,
    });
  };

  return (
    <div className="page page--auth fade-in">
      <div className="auth-logo">
        <div className="auth-logo__icon">📊</div>
        <span className="auth-logo__name">BizPulse</span>
      </div>

      <h1 style={{ marginBottom: 8 }}>Set up your business</h1>
      <p className="text-muted text-sm" style={{ marginBottom: 32 }}>
        Just a few quick details. You can change these later.
      </p>

      <div className="flex flex-col gap-4">
        <div className="form-group">
          <label className="form-label" htmlFor="onboard-biz-name">Business name</label>
          <input
            id="onboard-biz-name"
            className="form-input"
            type="text"
            placeholder="e.g. Mama Ada Provisions"
            value={businessName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setBusinessName(e.target.value);
              setError('');
            }}
          />
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="onboard-biz-type">What do you sell?</label>
          <select
            id="onboard-biz-type"
            className="form-input"
            value={businessType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setBusinessType(e.target.value)}
            style={{ appearance: 'none' }}
          >
            {[
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
            ].map((t: string) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="onboard-cash">Starting cash (₦) — optional</label>
          <input
            id="onboard-cash"
            className="form-input form-input--money"
            type="text"
            placeholder="0"
            value={startingCash}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartingCash(formatMoneyInput(e.target.value))}
            inputMode="numeric"
          />
          <p className="text-xs text-muted mt-2">
            How much cash your business has right now.
          </p>
        </div>

        <button
          id="onboard-submit-btn"
          type="button"
          className="btn btn--primary mt-4"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? 'Setting up…' : 'Start tracking →'}
        </button>
      </div>
    </div>
  );
}
