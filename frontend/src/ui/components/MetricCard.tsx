'use client';

import React, { useState } from 'react';
import { formatNaira, formatNairaCompact } from '@/domain/derivations';

interface MetricCardProps {
  label: string;
  amount: number;
  color?: string;
  /** 2px top-border accent that gives each metric card a semantic color identity */
  accentColor?: string;
  subLabel?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * Responsive metric card: compact notation on mobile (tap to reveal full),
 * full notation on tablet/desktop.
 */
export default function MetricCard({
  label,
  amount,
  color,
  accentColor,
  subLabel,
  style,
}: MetricCardProps) {
  const [showFull, setShowFull] = useState(false);

  const fullText = formatNaira(amount);
  const compactText = formatNairaCompact(amount);

  return (
    <div
      className="card metric-card-bp"
      style={{
        padding: '20px',
        position: 'relative',
        background: 'var(--color-surface-2)',
        boxShadow: 'none',
        borderTop: accentColor ? `2px solid ${accentColor}` : undefined,
        ...style,
      }}
    >
      <div className="metric-label" style={{ marginBottom: 6 }}>
        {label}
      </div>

      <div style={{ position: 'relative' }}>
        <div
          className="font-bold metric-value-desktop"
          style={{
            fontSize: '1.25rem',
            color: color ?? 'var(--color-text-primary)',
            lineHeight: 1.2,
            marginBottom: 6,
            fontFamily: "'Space Grotesk', sans-serif",
          }}
          aria-label={fullText}
        >
          {fullText}
        </div>

        <button
          type="button"
          className="font-bold metric-value-mobile"
          style={{
            fontSize: '1.25rem',
            color: color ?? 'var(--color-text-primary)',
            lineHeight: 1.2,
            marginBottom: 6,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'block',
            textAlign: 'left',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
          }}
          onClick={() => setShowFull((v) => !v)}
          aria-label={`${compactText} — tap for full amount: ${fullText}`}
          aria-expanded={showFull}
          title={fullText}
        >
          {compactText}
        </button>

        {showFull && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 49 }}
              onClick={() => setShowFull(false)}
              aria-hidden="true"
            />
            <div
              role="tooltip"
              className="metric-full-tooltip"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 0,
                zIndex: 50,
                background: 'var(--color-surface-3)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                whiteSpace: 'nowrap',
                boxShadow: 'var(--shadow-md)',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
            >
              {fullText}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 16,
                  width: 0,
                  height: 0,
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid var(--color-surface-3)',
                }}
              />
            </div>
          </>
        )}
      </div>

      {subLabel && (
        <div className="text-xs" style={{ marginTop: 2, lineHeight: 1.4 }}>
          {subLabel}
        </div>
      )}
    </div>
  );
}
