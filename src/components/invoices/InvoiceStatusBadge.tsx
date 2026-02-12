'use client';

import type { InvoiceStatus } from '@/lib/models/platform-types';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/lib/models/platform-types';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
}

export default function InvoiceStatusBadge({ status }: InvoiceStatusBadgeProps) {
  const color = INVOICE_STATUS_COLORS[status];
  const label = INVOICE_STATUS_LABELS[status];

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
