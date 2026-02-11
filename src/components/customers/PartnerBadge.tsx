'use client';

import { PARTNER_COLORS } from '@/lib/models/pricing-data';

interface PartnerBadgeProps {
  partner: string | null;
}

export function PartnerBadge({ partner }: PartnerBadgeProps) {
  const label = partner || 'Direct';
  const color = PARTNER_COLORS[label] || PARTNER_COLORS['Direct'];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 12,
        fontSize: 12,
        fontFamily: "'Space Mono', monospace",
        fontWeight: 500,
        color,
        backgroundColor: `${color}18`,
        border: `1px solid ${color}30`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: color,
        }}
      />
      {label}
    </span>
  );
}
