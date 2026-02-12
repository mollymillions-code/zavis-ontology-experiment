'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import PageShell from '@/components/layout/PageShell';

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const { invoices, hydrateFromDb } = useInvoiceStore();

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  const invoice = useMemo(
    () => invoices.find((inv) => inv.id === params.id),
    [invoices, params.id]
  );

  if (!invoice) {
    return (
      <PageShell title="Invoice Not Found">
        <div style={{
          textAlign: 'center', padding: 48,
          background: '#ffffff', borderRadius: 12,
          border: '1px solid #e0dbd2',
        }}>
          <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
            Invoice not found.
          </p>
          <button
            onClick={() => router.push('/invoices')}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 8,
              border: '1px solid #e0dbd2', background: '#ffffff',
              color: '#1a1a1a', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Back to Invoices
          </button>
        </div>
      </PageShell>
    );
  }

  if (invoice.status !== 'draft') {
    return (
      <PageShell title="Cannot Edit">
        <div style={{
          textAlign: 'center', padding: 48,
          background: '#ffffff', borderRadius: 12,
          border: '1px solid #e0dbd2',
        }}>
          <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
            Only draft invoices can be edited. This invoice has been {invoice.status}.
          </p>
          <button
            onClick={() => router.push(`/invoices/${invoice.id}`)}
            style={{
              marginTop: 16, padding: '8px 20px', borderRadius: 8,
              border: '1px solid #e0dbd2', background: '#ffffff',
              color: '#1a1a1a', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            View Invoice
          </button>
        </div>
      </PageShell>
    );
  }

  return <InvoiceForm invoice={invoice} />;
}
