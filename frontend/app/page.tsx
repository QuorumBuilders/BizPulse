'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { useTheme } from '@/state/useTheme';

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Daily entry in seconds',
    desc: 'Type cash sales and credit with zero clutter. Complete your tally in under 30 seconds.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: 'Debtor follow-up reminders',
    desc: 'Never forget who owes you. One tap sends a polite WhatsApp reminder to customers.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Automatic monthly numbers',
    desc: 'See net profit, total revenue, and cash in hand without crunching paper notes.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="1" y1="1" x2="23" y2="23" /><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
      </svg>
    ),
    title: 'Works offline, installs like an app',
    desc: 'No data? No problem. Record tallies even with zero signal; syncs securely when reconnected.',
  },
];

export default function LandingPage() {
  const { theme, toggle } = useTheme();

  // Intersection Observer for feature card scroll reveals
  const featureSectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const section = featureSectionRef.current;
    if (!section) return;

    const cards = section.querySelectorAll<HTMLElement>('.anim-card-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="page"
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
      <header
        className="anim-fade-up"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '24px 0 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--color-emerald-glow)',
              border: '1px solid rgba(16,185,129,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-emerald)',
            }}
            aria-hidden="true"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            BizPulse
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-text-secondary)',
              transition: 'background 0.2s',
            }}
          >
            {theme === 'light' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
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

      <section style={{ textAlign: 'center', marginTop: 16, marginBottom: 48 }}>
        <div
          className="anim-fade-up anim-fade-up-delay-1"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-emerald-glow)',
            border: '1px solid rgba(16,185,129,0.3)',
            color: 'var(--color-emerald-light)',
            fontSize: '0.6875rem',
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: '0.06em',
            marginBottom: 20,
          }}
        >
          Built for Nigerian Micro-Traders
        </div>

        <h1
          className="anim-fade-up anim-fade-up-delay-2"
          style={{
            fontSize: 'clamp(1.85rem, 6vw, 2.5rem)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 16,
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
          className="anim-fade-up anim-fade-up-delay-3 text-muted"
          style={{
            fontSize: '1rem',
            lineHeight: 1.65,
            maxWidth: 440,
            margin: '0 auto 32px',
          }}
        >
          Your daily sales, debtor follow-ups, and true cash position at closing time.
          Zero complicated bookkeeping.
        </p>

        <div
          className="anim-fade-up anim-fade-up-delay-4"
          style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 340, margin: '0 auto' }}
        >
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

          <Link
            href="/login?demo=1"
            id="landing-demo-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 7,
              padding: '10px 20px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              color: 'var(--color-text-secondary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-2)';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--color-text-secondary)';
            }}
          >
            <span className="demo-badge">Demo</span>
            View live demo →
          </Link>

          <p className="text-xs text-muted" style={{ marginTop: 4 }}>
            No bank details required · Works completely offline
          </p>
        </div>
      </section>

      <section
        ref={featureSectionRef}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}
        aria-label="Key features"
      >
        {FEATURES.map(({ icon, title, desc }, i) => (
          <div
            key={title}
            className="card anim-card-reveal"
            style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              background: 'var(--color-surface-2)',
              transitionDelay: `${i * 60}ms`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--color-emerald-glow)',
                border: '1px solid rgba(16,185,129,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-emerald)',
              }}
            >
              {icon}
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 6 }}>{title}</h3>
              <p className="text-xs text-muted" style={{ lineHeight: 1.6 }}>{desc}</p>
            </div>
          </div>
        ))}
      </section>

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
