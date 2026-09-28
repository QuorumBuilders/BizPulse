'use client';

import React from 'react';
import type { Tab } from './BottomNav';
import type { Business } from '@/domain/types';
import { useTheme } from '@/state/useTheme';

interface SidebarNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenSettings: () => void;
  business?: Business | null;
}


function IconTally() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h7M14 17.5h7M14 21h7" />
    </svg>
  );
}
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IconFollowUp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
function IconSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}
function IconMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}


const NAV_ITEMS: { id: Tab; label: string; description: string; Icon: React.FC }[] = [
  { id: 'home',      label: 'Daily Tally',      description: 'Record sales & expenses', Icon: IconTally },
  { id: 'dashboard', label: 'Performance',       description: 'Metrics & profit / loss', Icon: IconDashboard },
  { id: 'followup',  label: 'Debtor Follow-Ups', description: 'Track & remind debtors',  Icon: IconFollowUp },
];

export default function SidebarNav({
  activeTab,
  onTabChange,
  onOpenSettings,
  business,
}: SidebarNavProps) {
  const { theme, toggle } = useTheme();

  return (
    <aside className="app-sidebar" role="navigation" aria-label="Sidebar navigation">
      <div className="sidebar-brand">
        <div className="sidebar-brand__icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div className="sidebar-brand__text">
          <span className="sidebar-brand__name">BizPulse</span>
          {business?.name && (
            <span className="sidebar-brand__biz" title={business.name}>
              {business.name}
            </span>
          )}
        </div>
      </div>

      <nav className="sidebar-nav-list" aria-label="Main navigation">
        <span className="sidebar-nav-section-label">Menu</span>

        {NAV_ITEMS.map(({ id, label, description, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              id={`sidebar-nav-${id}`}
              type="button"
              className={`sidebar-nav-item${isActive ? ' sidebar-nav-item--active' : ''}`}
              onClick={() => onTabChange(id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="sidebar-nav-item__icon">
                <Icon />
              </span>
              <span className="sidebar-nav-item__text">
                <span className="sidebar-nav-item__label">{label}</span>
                <span className="sidebar-nav-item__desc">{description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          id="sidebar-nav-settings"
          type="button"
          className="sidebar-footer-btn"
          onClick={onOpenSettings}
        >
          <IconSettings />
          <span>Settings</span>
        </button>

        <button
          id="sidebar-theme-toggle"
          type="button"
          className="sidebar-theme-toggle"
          onClick={toggle}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          <span className="sidebar-theme-toggle__label">
            {theme === 'light' ? 'Light mode' : 'Dark mode'}
          </span>
          <span className="sidebar-theme-toggle__icon">
            {theme === 'light' ? <IconSun /> : <IconMoon />}
          </span>
        </button>
      </div>
    </aside>
  );
}
