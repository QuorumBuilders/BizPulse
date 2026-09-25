'use client';

import React, { useState } from 'react';
import type { Business } from '@/domain/types';
import { formatNaira } from '@/domain/derivations';
import { useSyncStatus } from '@/state/useSyncStatus';
import { pendingCount } from '@/data/outbox';
import { changePassword, AuthApiError } from '@/api/authApi';
import { getAccessToken } from '@/state/authStore';

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

  // Change Password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      setPwdError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPwdError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match.');
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setPwdError('Session expired. Please sign out and sign in again.');
      return;
    }

    setPwdLoading(true);
    setPwdError(null);
    setPwdSuccess(null);

    try {
      await changePassword(
        {
          current_password: currentPassword,
          new_password: newPassword,
          password_confirmation: confirmNewPassword,
        },
        token
      );
      setPwdSuccess('Password changed! Signing out so you can sign in with your new password...');
      setTimeout(() => {
        onLogout();
      }, 1500);
    } catch (err: unknown) {
      if (err instanceof AuthApiError) {
        if (err.details && typeof err.details.current_password !== 'undefined') {
          const msg = Array.isArray(err.details.current_password) ? err.details.current_password.join(' ') : String(err.details.current_password);
          setPwdError(msg);
        } else if (err.details && typeof err.details.new_password !== 'undefined') {
          const msg = Array.isArray(err.details.new_password) ? err.details.new_password.join(' ') : String(err.details.new_password);
          setPwdError(msg);
        } else {
          setPwdError(err.message || 'Failed to change password. Check your current password.');
        }
      } else {
        setPwdError('Network error. Check connection and try again.');
      }
    } finally {
      setPwdLoading(false);
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

        {/* WhatsApp Bot Touchpoint */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">
            WhatsApp Integration
          </div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                <span>💬 WhatsApp Bot Assistant</span>
                <span className="badge badge--paid" style={{ fontSize: '0.65rem' }}>Ready</span>
              </div>
              <p className="text-xs text-muted mt-1" style={{ maxWidth: 260 }}>
                Log daily sales and check customer debts straight from WhatsApp.
              </p>
            </div>
          </div>
          <div
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.03)',
              border: '1px dashed var(--color-border)',
              margin: '8px 0 12px',
            }}
          >
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted">Your Linking Code:</span>
              <strong style={{ fontFamily: 'monospace', color: 'var(--color-emerald-light)' }}>
                BP-{business.client_id.slice(0, 6).toUpperCase()}
              </strong>
            </div>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Connect BizPulse account: BP-${business.client_id.slice(0, 6).toUpperCase()}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--secondary btn--sm w-full"
            style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 6 }}
          >
            <span>📲 Open WhatsApp to Connect</span>
          </a>
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

        {/* Security & Password Section */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: showChangePassword ? 12 : 0 }}>
            <div className="text-xs text-muted font-semibold uppercase tracking-wider">
              Security &amp; Password
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setShowChangePassword(!showChangePassword);
                setPwdError(null);
                setPwdSuccess(null);
              }}
              style={{ fontSize: '0.8rem', padding: '2px 8px' }}
            >
              {showChangePassword ? 'Close' : 'Change Password'}
            </button>
          </div>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="flex flex-col gap-3 mt-2">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Current Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>New Password (min 8 chars)</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Confirm New Password</label>
                <input
                  type="password"
                  className="form-input"
                  placeholder="Confirm new password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  style={{ padding: '8px 12px', fontSize: '0.875rem' }}
                />
              </div>

              {pwdError && (
                <p className="form-error" style={{ fontSize: '0.75rem' }}>{pwdError}</p>
              )}

              {pwdSuccess && (
                <p className="text-xs" style={{ color: 'var(--color-emerald)' }}>{pwdSuccess}</p>
              )}

              <button
                type="submit"
                className="btn btn--primary btn--sm mt-1"
                disabled={pwdLoading}
                style={{ width: '100%' }}
              >
                {pwdLoading ? 'Updating…' : 'Update Password'}
              </button>
            </form>
          )}
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
