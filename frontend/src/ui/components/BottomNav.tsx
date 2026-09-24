'use client';

import { type SyncStatus } from '@/domain/types';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenSettings: () => void;
}

export type Tab = 'home' | 'dashboard' | 'followup';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'Tally', icon: '📋' },
  { id: 'dashboard', label: 'Dashboard', icon: '📈' },
  { id: 'followup', label: 'Follow Up', icon: '💬' },
];

export default function BottomNav({ activeTab, onTabChange, onOpenSettings }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          id={`nav-${tab.id}`}
          className={`nav-item ${activeTab === tab.id ? 'nav-item--active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          aria-current={activeTab === tab.id ? 'page' : undefined}
          aria-label={tab.label}
        >
          <span style={{ fontSize: '1.25rem' }}>{tab.icon}</span>
          <span className="nav-item__label">{tab.label}</span>
        </button>
      ))}
      <button
        id="nav-settings"
        className="nav-item"
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        <span style={{ fontSize: '1.25rem' }}>⚙️</span>
        <span className="nav-item__label">Settings</span>
      </button>
    </nav>
  );
}
