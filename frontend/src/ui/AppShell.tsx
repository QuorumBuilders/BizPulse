'use client';

import { useEffect, useState } from 'react';
import { useBusiness } from '@/state/useBusiness';
import { startSyncScheduler } from '@/data/sync';
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
  initialExport?: boolean;
}

export default function AppShell({
  initialTab = 'home',
  initialExport = false,
}: AppShellProps = {}) {
  const { isAuthenticated, isLoading, business, logout, saveBusiness } = useBusiness();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [isExporting, setIsExporting] = useState(initialExport);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const stopSync = startSyncScheduler();
    return stopSync;
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
