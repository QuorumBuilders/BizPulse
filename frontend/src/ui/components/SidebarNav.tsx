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

const NAV_ITEMS: { id: Tab; label: string; icon: string; description: string }[] = [
  { id: 'home', label: 'Daily Tally', icon: '📋', description: 'Record sales & expenses' },
  { id: 'dashboard', label: 'Performance', icon: '📈', description: 'Metrics & profit / loss' },
  { id: 'followup', label: 'Debtor Follow-Ups', icon: '💬', description: 'Track & remind debtors' },
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
      {/* Brand logo */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div
          className="auth-logo__icon"
          style={{
            width: 38,
            height: 38,
            fontSize: '1.25rem',
            background: 'var(--color-emerald-glow)',
            color: 'var(--color-emerald)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          📊
        </div>
        <div>
          <span className="font-bold text-base tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            BizPulse
          </span>
          {business?.name && (
            <p className="text-xs text-muted truncate" style={{ maxWidth: 160 }}>
              {business.name}
            </p>
          )}
        </div>
      </div>

      {/* Nav List */}
      <div className="flex flex-col gap-1.5 flex-1">
        <span className="text-xs uppercase tracking-wider text-muted font-semibold px-2 mb-1">
          Menu
        </span>

        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`sidebar-nav-${item.id}`}
              type="button"
              className={`flex items-center gap-3 w-full text-left rounded-lg transition-all ${
                isActive ? 'bg-emerald-500/10 text-emerald-400 font-semibold' : 'text-muted hover:bg-slate-800/50 hover:text-white'
              }`}
              style={{
                padding: '10px 14px',
                border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
                background: isActive ? 'var(--color-emerald-glow)' : 'transparent',
                color: isActive ? 'var(--color-emerald-light)' : 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? 'page' : undefined}
            >
              <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: '0.875rem' }}>{item.label}</div>
                <div className="text-xs text-muted font-normal" style={{ fontSize: '0.7rem' }}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer controls: Settings & Theme toggle */}
      <div className="pt-4 border-t border-slate-800 flex flex-col gap-2" style={{ borderColor: 'var(--color-border)' }}>
        <button
          id="sidebar-nav-settings"
          type="button"
          className="flex items-center gap-3 w-full text-left rounded-lg px-3 py-2 text-muted hover:text-white transition-colors"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '8px 12px',
          }}
          onClick={onOpenSettings}
        >
          <span style={{ fontSize: '1.15rem' }}>⚙️</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Settings &amp; Preferences</span>
        </button>

        <button
          id="sidebar-theme-toggle"
          type="button"
          className="flex items-center justify-between w-full rounded-lg px-3 py-2 text-xs text-muted"
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '8px 12px',
          }}
          onClick={toggle}
        >
          <span>Theme: {theme === 'light' ? 'Light mode' : 'Dark mode'}</span>
          <span>{theme === 'light' ? '☀️' : '🌙'}</span>
        </button>
      </div>
    </aside>
  );
}
