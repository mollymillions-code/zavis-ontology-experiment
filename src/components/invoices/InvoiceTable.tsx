'use client';

import type { Invoice, Client } from '@/lib/models/platform-types';
import { CURRENCY_SYMBOLS } from '@/lib/models/platform-types';
import InvoiceStatusBadge from './InvoiceStatusBadge';
import { Eye, Pencil } from 'lucide-react';
import Link from 'next/link';

interface InvoiceTableProps {
  invoices: Invoice[];
  clients: Client[];
  onView: (invoice: Invoice) => void;
}

export default function InvoiceTable({ invoices, clients, onView }: InvoiceTableProps) {
  const getClientName = (clientId: string) => {
    return clients.find((c) => c.id === clientId)?.name || 'Unknown';
  };

  const fmt = (n: number, currency: string) => {
    const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
    return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (invoices.length === 0) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e0dbd2',
        padding: 48,
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
          No invoices yet. Create your first invoice to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid #e0dbd2',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflowX: 'auto',
    }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
            {['Date', 'Invoice #', 'Customer', 'Status', 'Due Date', 'Amount', 'Balance Due', ''].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 12px',
                  textAlign: ['Amount', 'Balance Due'].includes(h) ? 'right' : 'left',
                  fontWeight: 600,
                  color: '#666666',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  letterSpacing: 0.5,
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv, i) => (
            <tr
              key={inv.id}
              style={{
                borderBottom: '1px solid #e0dbd2',
                background: i % 2 === 0 ? '#fafafa' : '#ffffff',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onClick={() => onView(inv)}
            >
              <td style={{
                padding: '10px 12px',
                fontFamily: "'Space Mono', monospace",
                color: '#666',
                fontSize: 11,
              }}>
                {formatDate(inv.invoiceDate)}
              </td>
              <td style={{
                padding: '10px 12px',
                fontWeight: 700,
                color: '#1a1a1a',
                fontFamily: "'Space Mono', monospace",
              }}>
                {inv.invoiceNumber}
              </td>
              <td style={{
                padding: '10px 12px',
                fontWeight: 600,
                color: '#1a1a1a',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                {getClientName(inv.clientId)}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <InvoiceStatusBadge status={inv.status} />
              </td>
              <td style={{
                padding: '10px 12px',
                fontFamily: "'Space Mono', monospace",
                color: '#666',
                fontSize: 11,
              }}>
                {formatDate(inv.dueDate)}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                color: '#1a1a1a',
              }}>
                {fmt(inv.total, inv.currency)}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 600,
                color: inv.balanceDue > 0 ? '#d32f2f' : '#00c853',
              }}>
                {fmt(inv.balanceDue, inv.currency)}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onView(inv)}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', padding: 4 }}
                    title="View"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  {inv.status === 'draft' && (
                    <Link
                      href={`/invoices/${inv.id}/edit`}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', padding: 4 }}
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
