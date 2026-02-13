'use client';

import type { InvoiceCurrency } from '@/lib/models/platform-types';
import { CURRENCY_SYMBOLS } from '@/lib/models/platform-types';

interface InvoiceTotalsSectionProps {
  subtotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  currency: InvoiceCurrency;
}

export default function InvoiceTotalsSection({
  subtotal,
  total,
  amountPaid,
  balanceDue,
  currency,
}: InvoiceTotalsSectionProps) {
  const sym = CURRENCY_SYMBOLS[currency];
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: 16,
    }}>
      <div style={{ width: 280 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 0',
          borderBottom: '1px solid #e0dbd2',
        }}>
          <span style={{ fontSize: 12, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>Subtotal</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
            {fmt(subtotal)} {sym}
          </span>
        </div>

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '10px 0',
          borderBottom: '2px solid #1a1a1a',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>Total ({currency})</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
            {fmt(total)} {sym}
          </span>
        </div>

        {amountPaid > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: '1px solid #e0dbd2',
          }}>
            <span style={{ fontSize: 12, color: '#00a844', fontFamily: "'DM Sans', sans-serif" }}>Payment Made</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#00a844', fontFamily: "'Space Mono', monospace" }}>
              (-) {fmt(amountPaid)} {sym}
            </span>
          </div>
        )}

        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 0',
          background: '#f5f0e8',
          borderRadius: 8,
          marginTop: 8,
          paddingLeft: 12,
          paddingRight: 12,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>Balance Due</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
            {fmt(balanceDue)} {sym}
          </span>
        </div>
      </div>
    </div>
  );
}
