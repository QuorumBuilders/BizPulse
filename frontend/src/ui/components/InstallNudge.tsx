'use client';

import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'bp_install_nudge_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallNudge() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if dismissed previously
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Check if running in standalone PWA mode already
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // On iOS or if event didn't fire after 1 second, show nudge banner anyway
    const timer = setTimeout(() => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsVisible(true);
      }
    }, 1200);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        handleDismiss();
      }
    } else if (isIOS) {
      alert('To install BizPulse on your iPhone or iPad: tap the Share button in Safari, then select "Add to Home Screen".');
      handleDismiss();
    } else {
      alert('To install BizPulse: tap the browser menu (⋮) and select "Add to Home Screen" or "Install App".');
      handleDismiss();
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="card fade-in"
      style={{
        margin: '12px 16px 4px',
        padding: '12px 14px',
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(17,24,39,0.95))',
        borderColor: 'rgba(16,185,129,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderRadius: 'var(--radius-md)',
      }}
    >
      <div className="flex items-center gap-3">
        <div style={{ fontSize: '1.4rem' }}>📲</div>
        <div>
          <p className="text-xs font-semibold" style={{ color: 'var(--color-emerald-light)' }}>
            Install BizPulse for faster access
          </p>
          <p className="text-xs text-muted">
            Add to Home Screen for one-tap daily tallies and offline speed.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={handleInstallClick}
          style={{ padding: '6px 12px', fontSize: '0.75rem', height: 32 }}
        >
          Install
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={handleDismiss}
          style={{ padding: '4px 6px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
