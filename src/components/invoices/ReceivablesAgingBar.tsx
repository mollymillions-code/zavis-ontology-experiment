'use client';

import type { AgingSummary } from '@/lib/utils/invoice-utils';

interface ReceivablesAgingBarProps {
  aging: AgingSummary;
  currency?: string;
}

const BUCKET_COLORS: Record<string, string> = {
  current: '#00c853',
  '1-15': '#66bb6a',
  '16-30': '#ffa726',
  '31-45': '#ef5350',
  '45+': '#d32f2f',
};

const BUCKET_LABELS: Record<string, string> = {
  current: 'Current',
  '1-15': '1-15 days',
  '16-30': '16-30 days',
  '31-45': '31-45 days',
  '45+': '45+ days',
};

export default function ReceivablesAgingBar({ aging, currency = 'AED' }: ReceivablesAgingBarProps) {
  const buckets = ['current', '1-15', '16-30', '31-45', '45+'] as const;

  if (aging.total === 0) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #e0dbd2',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
          No outstanding invoices
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      padding: 16,
      border: '1px solid #e0dbd2',
    }}>
      <h4 style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#1a1a1a',
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: 12,
      }}>
        Receivables Aging
      </h4>

      {/* Stacked bar */}
      <div style={{
        display: 'flex',
        height: 24,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
      }}>
        {buckets.map((bucket) => {
          const value = aging[bucket];
          if (value === 0) return null;
          const pct = (value / aging.total) * 100;
          return (
            <div
              key={bucket}
              title={`${BUCKET_LABELS[bucket]}: ${value.toLocaleString()} ${currency}`}
              style={{
                width: `${pct}%`,
                background: BUCKET_COLORS[bucket],
                minWidth: pct > 0 ? 4 : 0,
                transition: 'width 0.3s',
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {buckets.map((bucket) => (
          <div key={bucket} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: BUCKET_COLORS[bucket],
            }} />
            <span style={{
              fontSize: 10,
              color: '#666',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {BUCKET_LABELS[bucket]}
            </span>
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: '#1a1a1a',
              fontFamily: "'Space Mono', monospace",
            }}>
              {aging[bucket].toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
