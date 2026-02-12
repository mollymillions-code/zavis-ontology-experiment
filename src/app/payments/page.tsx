'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import PageShell from '@/components/layout/PageShell';
import PaymentStatusBadge from '@/components/payments/PaymentStatusBadge';
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import { useClientStore } from '@/lib/store/customer-store';
import { PAYMENT_MODE_LABELS, CURRENCY_SYMBOLS } from '@/lib/models/platform-types';
import type { PaymentStatus } from '@/lib/models/platform-types';
import { CreditCard } from 'lucide-react';

function PaymentsContent() {
  const searchParams = useSearchParams();
  const invoiceIdParam = searchParams.get('invoiceId');

  const { invoices, payments, hydrateFromDb } = useInvoiceStore();
  const clients = useClientStore((s) => s.clients);

  const [filter, setFilter] = useState<PaymentStatus | 'all'>('all');
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  // Auto-open dialog if invoiceId param present
  useEffect(() => {
    if (invoiceIdParam) {
      setPaymentDialogOpen(true);
    }
  }, [invoiceIdParam]);

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => inv.id === invoiceIdParam),
    [invoices, invoiceIdParam]
  );

  const selectedClient = useMemo(
    () => selectedInvoice ? clients.find((c) => c.id === selectedInvoice.clientId) : null,
    [selectedInvoice, clients]
  );

  const filtered = useMemo(() => {
    let result = [...payments];
    if (filter !== 'all') {
      result = result.filter((p) => p.status === filter);
    }
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [payments, filter]);

  const getClientName = (clientId: string) => clients.find((c) => c.id === clientId)?.name || 'Unknown';
  const getInvoiceNumber = (invoiceId: string) => invoices.find((inv) => inv.id === invoiceId)?.invoiceNumber || '—';
  const getInvoiceCurrency = (invoiceId: string) => invoices.find((inv) => inv.id === invoiceId)?.currency || 'AED';

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  const fmt = (n: number, currency: string) => {
    const sym = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS] || currency;
    return `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
  };

  const statusFilters: { value: PaymentStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'void', label: 'Void' },
  ];

  return (
    <PageShell
      title="Payments Received"
      subtitle="Track payments against invoices"
    >
      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {statusFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === f.value ? '#00c853' : '#e0dbd2',
              background: filter === f.value ? '#00c853' : '#ffffff',
              color: filter === f.value ? '#1a1a1a' : '#666',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e0dbd2',
          padding: 48,
          textAlign: 'center',
        }}>
          <CreditCard size={32} style={{ color: '#ccc', marginBottom: 8 }} />
          <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
            No payments recorded yet.
          </p>
        </div>
      ) : (
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e0dbd2',
          overflowX: 'auto',
        }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                {['Date', 'Payment #', 'Reference', 'Customer', 'Invoice #', 'Mode', 'Amount', 'Status'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 12px',
                    textAlign: h === 'Amount' ? 'right' : 'left',
                    fontWeight: 600, color: '#666',
                    textTransform: 'uppercase', fontSize: 11,
                    letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment, i) => {
                const currency = getInvoiceCurrency(payment.invoiceId);
                return (
                  <tr key={payment.id} style={{
                    borderBottom: '1px solid #e0dbd2',
                    background: i % 2 === 0 ? '#fafafa' : '#ffffff',
                  }}>
                    <td style={{ padding: '10px 12px', fontFamily: "'Space Mono', monospace", color: '#666', fontSize: 11 }}>
                      {formatDate(payment.date)}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1a1a1a' }}>
                      {payment.paymentNumber}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#666', fontFamily: "'DM Sans', sans-serif" }}>
                      {payment.referenceNumber || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                      {getClientName(payment.clientId)}
                    </td>
                    <td style={{ padding: '10px 12px', fontFamily: "'Space Mono', monospace", color: '#666' }}>
                      {getInvoiceNumber(payment.invoiceId)}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>
                      {PAYMENT_MODE_LABELS[payment.mode]}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#00c853' }}>
                      {fmt(payment.amount, currency)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payment dialog */}
      {selectedInvoice && selectedClient && (
        <RecordPaymentDialog
          open={paymentDialogOpen}
          onClose={() => setPaymentDialogOpen(false)}
          invoice={selectedInvoice}
          client={selectedClient}
        />
      )}
    </PageShell>
  );
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsContent />
    </Suspense>
  );
}
