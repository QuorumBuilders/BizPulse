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
import SidebarNav from '@/ui/components/SidebarNav';
import InstallNudge from '@/ui/components/InstallNudge';

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

  useEffect(() => {
    if (!isAuthenticated) return;
    const stopSync = startSyncScheduler();
    return stopSync;
  }, [isAuthenticated]);

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
          <div className="auth-logo__icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <div className="spinner" />
          <p className="text-muted text-sm">Loading BizPulse...</p>
        </div>
      </div>
    );
  }

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

  if (!business) {
    return (
      <OnboardingScreen
        onComplete={saveBusiness}
      />
    );
  }

  return (
    <div className="app-shell">
      <SidebarNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setIsExporting(false);
          setActiveTab(tab);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        business={business}
      />

      <div className="app-main" style={{ height: '100dvh', overflowY: 'auto' }}>
        <InstallNudge />

        <main className="flex-1 w-full" style={{ paddingBottom: 'calc(var(--space-xl) + 20px)' }}>
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
      </div>
    </div>
  );
}
