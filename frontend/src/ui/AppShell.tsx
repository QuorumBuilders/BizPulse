'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '@/state/useBusiness';
import { useTheme } from '@/state/useTheme';
import { startSyncScheduler } from '@/data/sync';
import SignupScreen from '@/ui/screens/SignupScreen';
import LoginScreen from '@/ui/screens/LoginScreen';
import OnboardingScreen from '@/ui/screens/OnboardingScreen';
import HomeScreen from '@/ui/screens/HomeScreen';
import DashboardScreen from '@/ui/screens/DashboardScreen';
import FollowUpScreen from '@/ui/screens/FollowUpScreen';
import ExportScreen from '@/ui/screens/ExportScreen';
import SettingsModal from '@/ui/components/SettingsModal';
import BottomNav, { type Tab } from '@/ui/components/BottomNav';
import InstallNudge from '@/ui/components/InstallNudge';

/**
 * Root client component — handles routing and auth state.
 * BizPulse uses a simple state-based router (no Next.js routing needed
 * for a single-page PWA with a bottom nav).
 */
export interface AppShellProps {
  initialTab?: Tab;
  initialAuthView?: 'login' | 'signup';
  initialExport?: boolean;
}

export default function AppShell({
  initialTab = 'home',
  initialAuthView = 'login',
  initialExport = false,
}: AppShellProps = {}) {
  const { isAuthenticated, isLoading, business, signup, login, logout, saveBusiness } = useBusiness();
  const { theme, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isExporting, setIsExporting] = useState(initialExport);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>(initialAuthView);

  // Start sync scheduler once authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    const stopSync = startSyncScheduler();
    return stopSync;
  }, [isAuthenticated]);

  // Keep URL aligned when user is already authenticated
  // MUST be before any early returns to satisfy Rules of Hooks
  useEffect(() => {
    if (isAuthenticated && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/login' || path === '/signup') {
        window.history.replaceState(null, '', '/dashboard');
      }
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ minHeight: '100dvh' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="auth-logo__icon">📊</div>
          <div className="spinner" />
          <p className="text-muted text-sm">Loading BizPulse...</p>
        </div>
      </div>
    );
  }

  // Not authenticated — show auth screens
  if (!isAuthenticated) {
    if (authView === 'signup') {
      return (
        <SignupScreen
          onSignup={signup}
          onGoToLogin={() => {
            setAuthView('login');
            if (typeof window !== 'undefined') window.history.replaceState(null, '', '/login');
          }}
        />
      );
    }
    return (
      <LoginScreen
        onLogin={login}
        onGoToSignup={() => {
          setAuthView('signup');
          if (typeof window !== 'undefined') window.history.replaceState(null, '', '/signup');
        }}
      />
    );
  }

  // Authenticated but no business yet — show onboarding
  if (!business) {
    return (
      <OnboardingScreen
        onComplete={saveBusiness}
      />
    );
  }

  // Authenticated + has business — show main app
  return (
    <>
      {/* Quick-access theme toggle — visible in the authenticated shell */}
      <button
        id="appshell-theme-toggle"
        type="button"
        className="btn btn--icon"
        onClick={toggle}
        aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        title={theme === 'light' ? 'Dark mode' : 'Light mode'}
        style={{
          position: 'fixed',
          top: 12,
          right: 16,
          zIndex: 90,
          width: 36,
          height: 36,
          padding: 0,
          fontSize: '1rem',
          lineHeight: 1,
        }}
      >
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
      <InstallNudge />
      <main style={{ paddingBottom: 80 }}>
        {isExporting ? (
          <ExportScreen business={business} onBack={() => setIsExporting(false)} />
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeScreen
                business={business}
                onGoToFollowUp={() => setActiveTab('followup')}
                onOpenSettings={() => setIsSettingsOpen(true)}
              />
            )}
            {activeTab === 'dashboard' && (
              <DashboardScreen business={business} onGoToExport={() => setIsExporting(true)} />
            )}
            {activeTab === 'followup' && <FollowUpScreen business={business} />}
          </>
        )}
      </main>
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setIsExporting(false);
          setActiveTab(tab);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <SettingsModal
        business={business}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateBusiness={saveBusiness}
        onLogout={logout}
      />
    </>
  );
}
