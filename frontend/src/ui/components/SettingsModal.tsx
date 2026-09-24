'use client';

import React, { useState } from 'react';
import type { Business } from '@/domain/types';
import { formatNaira } from '@/domain/derivations';
import { useSyncStatus } from '@/state/useSyncStatus';
import { pendingCount } from '@/data/outbox';

interface Props {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBusiness: (patch: Partial<Omit<Business, 'id' | 'client_id' | 'synced' | 'updated_at'>>) => Promise<void>;
  onLogout: () => void;
}

export default function SettingsModal({
  business,
  isOpen,
  onClose,
  onUpdateBusiness,
  onLogout,
}: Props) {
  const status = useSyncStatus();
  const [outboxCount, setOutboxCount] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(business.voice_enabled);
  const [selectedLanguage, setSelectedLanguage] = useState(business.language || 'en');
  const [isSaving, setIsSaving] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  React.useEffect(() => {
    pendingCount().then(setOutboxCount).catch(() => {});
  }, [status, isOpen]);

  if (!isOpen) return null;

  const handleToggleVoice = async () => {
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    setIsSaving(true);
    try {
      await onUpdateBusiness({ voice_enabled: nextVal });
    } catch (err) {
      console.error('Failed to update voice setting:', err);
      setVoiceEnabled(!nextVal);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangeLanguage = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    try {
      await onUpdateBusiness({ language: lang });
    } catch (err) {
      console.error('Failed to update language:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-sheet fade-in"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div className="flex justify-between items-center" style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Settings &amp; Preferences</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            style={{ fontSize: '1.25rem', padding: '4px 8px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Business Profile Summary */}
        <div className="card" style={{ marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
          <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">
            Business Profile
          </div>
          <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
            <span className="font-semibold" style={{ fontSize: '1.1rem' }}>{business.name}</span>
            <span className="badge badge--paid">{business.type || 'Trader'}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-muted">
            <span>Starting Cash Balance:</span>
            <span className="font-medium text-emerald">{formatNaira(business.starting_cash)}</span>
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-3">
            Input Preferences
          </div>

          {/* Voice Input Toggle */}
          <div className="flex justify-between items-center" style={{ padding: '8px 0' }}>
            <div>
              <div className="font-medium text-sm flex items-center gap-2">
                <span>🎙️ Voice Tally Entry</span>
                <span className="badge badge--partial" style={{ fontSize: '0.65rem' }}>Optional</span>
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 2, maxWidth: 240 }}>
                Speak today&apos;s totals instead of typing. Recommended for quiet environments.
              </p>
            </div>
            <button
              type="button"
              className={`btn btn--sm ${voiceEnabled ? 'btn--primary' : 'btn--secondary'}`}
              onClick={handleToggleVoice}
              disabled={isSaving}
              style={{ minWidth: 60, padding: '6px 12px', fontSize: '0.8125rem' }}
            >
              {voiceEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="divider" style={{ margin: '12px 0' }} />

          {/* Language Preference */}
          <div className="flex justify-between items-center" style={{ padding: '8px 0' }}>
            <div>
              <div className="font-medium text-sm">🌐 Language / Éde</div>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                Display language and market terms
              </p>
            </div>
            <select
              className="form-input"
              value={selectedLanguage}
              onChange={handleChangeLanguage}
              style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8125rem' }}
            >
              <option value="en">English</option>
              <option value="yo">Yorùbá</option>
              <option value="ha">Hausa</option>
              <option value="ig">Igbo</option>
              <option value="pcm">Pidgin</option>
            </select>
          </div>
        </div>

        {/* Sync & Offline Status */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">
            Storage &amp; Sync Status
          </div>
          <div className="flex justify-between items-center text-xs" style={{ marginBottom: 6 }}>
            <span className="text-muted">Database:</span>
            <span className="font-semibold text-emerald">Offline IndexedDB (Active)</span>
          </div>
          <div className="flex justify-between items-center text-xs" style={{ marginBottom: 6 }}>
            <span className="text-muted">Network Status:</span>
            <span className="font-semibold" style={{ color: status === 'offline' ? 'var(--color-rose)' : 'var(--color-emerald)' }}>
              {status === 'offline' ? 'Offline (Saved Locally)' : 'Connected'}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted">Sync Outbox Queue:</span>
            <span className="font-semibold">
              {outboxCount === 0 ? 'All records up to date' : `${outboxCount} pending upload`}
            </span>
          </div>
        </div>

        {/* Logout Section */}
        {showLogoutConfirm ? (
          <div className="card" style={{ borderColor: 'rgba(244,63,94,0.3)', background: 'rgba(244,63,94,0.05)', marginBottom: 8 }}>
            <p className="text-xs" style={{ marginBottom: 12, lineHeight: 1.4 }}>
              ⚠️ Are you sure you want to sign out? Your records remain safely stored on this phone.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn--secondary btn--sm flex-1"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--sm flex-1"
                style={{ background: 'var(--color-rose)', color: '#fff' }}
                onClick={onLogout}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--secondary w-full"
            onClick={() => setShowLogoutConfirm(true)}
            style={{ color: 'var(--color-rose)', borderColor: 'rgba(244,63,94,0.2)' }}
          >
            Sign Out of BizPulse
          </button>
        )}
      </div>
    </div>
  );
}
