'use client';

import Link from 'next/link';
import { useTheme } from '@/state/useTheme';

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  return (
    <div
      className="page fade-in"
      style={{
        padding: '0 20px 48px',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ── Top Navbar ── */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 0 20px',
        }}
      >
        <div className="auth-logo" style={{ marginBottom: 0 }}>
          <div className="auth-logo__icon" style={{ width: 36, height: 36, fontSize: '1.25rem' }}>📊</div>
          <span className="auth-logo__name" style={{ fontSize: '1.25rem' }}>BizPulse</span>
        </div>

        {/* Nav actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Theme toggle */}
          <button
            id="landing-theme-toggle"
            type="button"
            onClick={toggle}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title={theme === 'light' ? 'Dark mode' : 'Light mode'}
            style={{
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
              transition: 'background 0.2s',
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          <Link
            href="/login"
            className="btn btn--secondary btn--sm"
            style={{ padding: '8px 16px', fontSize: '0.875rem', textDecoration: 'none' }}
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* ── Hero Section ── */}
      <section style={{ textAlign: 'center', marginTop: 16, marginBottom: 40 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-emerald-glow)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: 'var(--color-emerald-light)',
            fontSize: '0.75rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.05em',
            marginBottom: 16,
          }}
        >
          ⚡ Built for Nigerian Micro-Traders
        </div>

        <h1
          style={{
            fontSize: 'clamp(1.75rem, 6vw, 2.35rem)',
            fontWeight: 800,
            lineHeight: 1.18,
            marginBottom: 14,
            letterSpacing: '-0.03em',
          }}
        >
          She keeps doing what she already does.
          <br />
          <span style={{ color: 'var(--color-emerald-light)' }}>
            Only now, it doesn&apos;t get lost.
          </span>
        </h1>

        <p
          className="text-muted"
          style={{
            fontSize: '0.95rem',
            lineHeight: 1.6,
            maxWidth: 420,
            margin: '0 auto 28px',
          }}
        >
          Your daily sales, debtor follow-ups, and true cash position at closing time.
          Zero complicated bookkeeping.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3" style={{ maxWidth: 360, margin: '0 auto' }}>
          <Link
            href="/signup"
            id="landing-cta-signup"
            className="btn btn--primary"
            style={{
              padding: '16px 24px',
              fontSize: '1rem',
              fontWeight: 700,
              textDecoration: 'none',
              borderRadius: 'var(--radius-md)',
            }}
          >
            Start tracking free →
          </Link>
          <p className="text-xs text-muted">
            No bank details required • Works completely offline
          </p>
        </div>
      </section>

      {/* ── Feature Highlights: responsive grid ── */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}
      >
        {[
          {
            icon: '⏱️',
            title: 'Daily entry in seconds',
            desc: 'Type cash sales and credit with zero clutter. Complete your tally in under 30 seconds.',
          },
          {
            icon: '💬',
            title: 'Debtor follow-up reminders',
            desc: 'Never forget who owes you. One tap sends polite WhatsApp reminder messages to customers.',
          },
          {
            icon: '📈',
            title: 'Automatic monthly numbers',
            desc: 'See net profit, total revenue, and cash in hand without crunching paper notes.',
          },
          {
            icon: '📶',
            title: 'Works offline, installs like an app',
            desc: 'No data? No problem. Record tallies even with zero signal; syncs securely when reconnected.',
          },
        ].map(({ icon, title, desc }) => (
          <div
            key={title}
            className="card"
            style={{
              padding: '20px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'var(--color-surface-2)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = '';
            }}
          >
            <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>{icon}</div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>{title}</h3>
              <p className="text-xs text-muted" style={{ lineHeight: 1.5 }}>{desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ── Footer / Login Link ── */}
      <footer style={{ marginTop: 'auto', textAlign: 'center', paddingTop: 16 }}>
        <p className="text-xs text-muted">
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--color-emerald-light)', textDecoration: 'none', fontWeight: 600 }}>
            Sign in here
          </Link>
        </p>
      </footer>
    </div>
  );
}
