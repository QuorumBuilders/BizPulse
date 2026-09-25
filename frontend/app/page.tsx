import Link from 'next/link';

export const metadata = {
  title: 'BizPulse — Financial Clarity for Micro-Traders',
  description: 'Digital daily tally, debtor follow-ups, and automated monthly profit numbers for Nigerian businesses. Works 100% offline.',
};

export default function LandingPage() {
  return (
    <div className="page fade-in" style={{ padding: '0 20px 40px', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
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
        <Link
          href="/login"
          className="btn btn--secondary btn--sm"
          style={{ padding: '8px 16px', fontSize: '0.875rem', textDecoration: 'none' }}
        >
          Sign in
        </Link>
      </header>

      {/* Hero Section */}
      <section style={{ textAlign: 'center', marginTop: 16, marginBottom: 32 }}>
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
            textTransform: 'uppercase',
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
            maxWidth: 380,
            margin: '0 auto 24px',
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

      {/* 4 Feature Highlights */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
        <div
          className="card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            background: 'var(--color-surface-2)',
          }}
        >
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>⏱️</div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 2 }}>
              Daily entry in seconds
            </h3>
            <p className="text-xs text-muted" style={{ lineHeight: 1.45 }}>
              Type cash sales and credit with zero clutter. Complete your tally in under 30 seconds.
            </p>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            background: 'var(--color-surface-2)',
          }}
        >
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>💬</div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 2 }}>
              Debtor follow-up reminders
            </h3>
            <p className="text-xs text-muted" style={{ lineHeight: 1.45 }}>
              Never forget who owes you. One tap sends polite WhatsApp reminder messages to customers.
            </p>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            background: 'var(--color-surface-2)',
          }}
        >
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>📈</div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 2 }}>
              Automatic monthly numbers
            </h3>
            <p className="text-xs text-muted" style={{ lineHeight: 1.45 }}>
              See net profit, total revenue, and cash in hand without crunching paper notes.
            </p>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: '16px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            background: 'var(--color-surface-2)',
          }}
        >
          <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>📶</div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 2 }}>
              Works offline, installs like an app
            </h3>
            <p className="text-xs text-muted" style={{ lineHeight: 1.45 }}>
              No data? No problem. Record tallies even with zero signal; syncs securely when reconnected.
            </p>
          </div>
        </div>
      </section>

      {/* Footer / Login Link */}
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
