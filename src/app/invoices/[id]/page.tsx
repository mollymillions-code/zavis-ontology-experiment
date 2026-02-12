'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Pencil, Send, Printer, Ban, Copy, ArrowLeft, CreditCard, Download, Mail } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import InvoicePDFPreview from '@/components/invoices/InvoicePDFPreview';
import EmailSendDialog from '@/components/invoices/EmailSendDialog';
import RecordPaymentDialog from '@/components/payments/RecordPaymentDialog';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import { useClientStore } from '@/lib/store/customer-store';
import { canEditInvoice, canVoidInvoice, canRecordPayment } from '@/lib/utils/invoice-utils';

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { invoices, updateInvoice, hydrateFromDb } = useInvoiceStore();
  const clients = useClientStore((s) => s.clients);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  const invoice = useMemo(
    () => invoices.find((inv) => inv.id === params.id),
    [invoices, params.id]
  );

  const client = useMemo(
    () => (invoice ? clients.find((c) => c.id === invoice.clientId) : null),
    [invoice, clients]
  );

  if (!invoice || !client) {
    return (
      <PageShell title="Invoice Not Found">
        <div style={{
          textAlign: 'center', padding: 48,
          background: '#ffffff', borderRadius: 12,
          border: '1px solid #e0dbd2',
        }}>
          <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
            Invoice not found. It may have been deleted.
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

  function handleMarkSent() {
    if (!invoice) return;
    updateInvoice(invoice.id, {
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
  }

  function handleVoid() {
    if (!invoice) return;
    if (!window.confirm('Are you sure you want to void this invoice? This cannot be undone.')) return;
    updateInvoice(invoice.id, {
      status: 'void',
      voidedAt: new Date().toISOString(),
    });
  }

  function handleClone() {
    if (!invoice) return;
    router.push(`/invoices/new?clientId=${invoice.clientId}`);
  }

  function handlePrint() {
    window.print();
  }

  function handleDownloadPDF() {
    if (!invoice) return;
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
  }

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent', color: '#ffffff',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <PageShell
      title={invoice.invoiceNumber}
      subtitle={`${client.name} — ${invoice.currency}`}
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => router.push('/invoices')} style={{ ...btnStyle, color: '#999' }}>
            <ArrowLeft size={14} /> Back
          </button>
          {canEditInvoice(invoice.status) && (
            <button
              onClick={() => router.push(`/invoices/${invoice.id}/edit`)}
              style={btnStyle}
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          {invoice.status === 'draft' && (
            <button
              onClick={handleMarkSent}
              style={{ ...btnStyle, background: '#00c853', color: '#1a1a1a', border: 'none' }}
            >
              <Send size={14} /> Mark as Sent
            </button>
          )}
          <button
            onClick={() => setEmailDialogOpen(true)}
            style={btnStyle}
          >
            <Mail size={14} /> Email
          </button>
          {canRecordPayment(invoice.status) && (
            <button
              onClick={() => setPaymentDialogOpen(true)}
              style={{ ...btnStyle, background: '#2196f3', color: '#ffffff', border: 'none' }}
            >
              <CreditCard size={14} /> Record Payment
            </button>
          )}
          <button onClick={handleDownloadPDF} style={btnStyle}>
            <Download size={14} /> PDF
          </button>
          <button onClick={handlePrint} style={btnStyle}>
            <Printer size={14} /> Print
          </button>
          <button onClick={handleClone} style={btnStyle}>
            <Copy size={14} /> Clone
          </button>
          {canVoidInvoice(invoice.status) && (
            <button
              onClick={handleVoid}
              style={{ ...btnStyle, color: '#ff5252' }}
            >
              <Ban size={14} /> Void
            </button>
          )}
        </div>
      }
    >
      <InvoicePDFPreview invoice={invoice} client={client} />

      {/* Email Dialog */}
      <EmailSendDialog
        open={emailDialogOpen}
        onClose={() => setEmailDialogOpen(false)}
        invoice={invoice}
        client={client}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onClose={() => setPaymentDialogOpen(false)}
        invoice={invoice}
        client={client}
      />
    </PageShell>
  );
}
