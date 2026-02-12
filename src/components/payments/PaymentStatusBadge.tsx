'use client';

import type { PaymentStatus } from '@/lib/models/platform-types';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  draft: '#9e9e9e',
  confirmed: '#00c853',
  void: '#757575',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  void: 'Void',
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export default function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const color = STATUS_COLORS[status];
  const label = STATUS_LABELS[status];

  return (
    <span
      style={{
        padding: '3px 10px',
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: "'DM Sans', sans-serif",
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        background: `${color}18`,
        color,
      }}
    >
      {label}
    </span>
  );
}
