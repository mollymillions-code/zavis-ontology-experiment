'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Send, ArrowLeft, Loader2 } from 'lucide-react';
import type {
  Invoice,
  InvoiceLineItem,
  InvoiceCurrency,
  PaymentTerms,
  Client,
} from '@/lib/models/platform-types';
import { PAYMENT_TERMS_LABELS, CURRENCY_SYMBOLS } from '@/lib/models/platform-types';
import { useClientStore } from '@/lib/store/customer-store';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import { calculateDueDate, calculateInvoiceTotals, billingCycleToTerms } from '@/lib/utils/invoice-utils';
import CustomerSelector from './CustomerSelector';
import LineItemsTable from './LineItemsTable';
import InvoiceTotalsSection from './InvoiceTotalsSection';
import PageShell from '@/components/layout/PageShell';

interface InvoiceFormProps {
  invoice?: Invoice; // if editing
  prefillClientId?: string;
  prefillReceivableId?: string;
  prefillLineItems?: InvoiceLineItem[];
}

export default function InvoiceForm({
  invoice,
  prefillClientId,
  prefillReceivableId,
  prefillLineItems,
}: InvoiceFormProps) {
  const router = useRouter();
  const clients = useClientStore((s) => s.clients);
  const { catalogItems, addInvoice, updateInvoice, getNextNumber, companyConfig } = useInvoiceStore();

  const isEdit = !!invoice;

  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoiceNumber || '');
  const [clientId, setClientId] = useState(invoice?.clientId || prefillClientId || '');
  const [currency, setCurrency] = useState<InvoiceCurrency>(invoice?.currency || 'AED');
  const [invoiceDate, setInvoiceDate] = useState(
    invoice?.invoiceDate || new Date().toISOString().split('T')[0]
  );
  const [terms, setTerms] = useState<PaymentTerms>(invoice?.terms || 'net_30');
  const [dueDate, setDueDate] = useState(invoice?.dueDate || '');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    invoice?.lineItems || prefillLineItems || []
  );
  const [customerNotes, setCustomerNotes] = useState(
    invoice?.customerNotes || companyConfig.defaultNotes
  );
  const [termsAndConditions, setTermsAndConditions] = useState(
    invoice?.termsAndConditions || companyConfig.bankDetails
  );
  const [receivableId] = useState(invoice?.receivableId || prefillReceivableId || null);

  // Auto-generate invoice number
  useEffect(() => {
    if (!isEdit && !invoiceNumber) {
      getNextNumber('invoice').then(setInvoiceNumber);
    }
  }, [isEdit, invoiceNumber, getNextNumber]);

  // Recalculate due date when invoice date or terms change
  useEffect(() => {
    if (invoiceDate && terms) {
      setDueDate(calculateDueDate(invoiceDate, terms));
    }
  }, [invoiceDate, terms]);

  // Auto-set terms when customer is selected
  function handleClientSelect(client: Client) {
    setClientId(client.id);
    if (client.defaultTerms) {
      setTerms(client.defaultTerms as PaymentTerms);
    } else if (client.billingCycle) {
      setTerms(billingCycleToTerms(client.billingCycle));
    }
  }

  const totals = calculateInvoiceTotals(lineItems);

  async function handleSave(markAsSent = false) {
    if (!clientId || !invoiceNumber) return;
    setSaving(true);

    try {
      const now = new Date().toISOString();
      const status = markAsSent ? 'sent' as const : 'draft' as const;

      if (isEdit && invoice) {
        updateInvoice(invoice.id, {
          lineItems,
          subtotal: totals.subtotal,
          total: totals.total,
          balanceDue: totals.total - (invoice.amountPaid || 0),
          customerNotes,
          termsAndConditions,
          invoiceDate,
          terms,
          dueDate,
          currency,
          status: markAsSent ? 'sent' : invoice.status,
          sentAt: markAsSent ? now : invoice.sentAt,
        });
      } else {
        const newInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          invoiceNumber,
          clientId,
          receivableId,
          currency,
          status,
          invoiceDate,
          terms,
          dueDate,
          lineItems,
          subtotal: totals.subtotal,
          total: totals.total,
          amountPaid: 0,
          balanceDue: totals.total,
          customerNotes,
          termsAndConditions,
          sentAt: markAsSent ? now : null,
          paidAt: null,
          voidedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        addInvoice(newInvoice);
      }

      router.push('/invoices');
    } finally {
      setSaving(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: '#666',
    fontFamily: "'DM Sans', sans-serif",
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #e0dbd2',
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a',
    background: '#ffffff',
    outline: 'none',
  };

  return (
    <PageShell
      title={isEdit ? `Edit ${invoiceNumber}` : 'New Invoice'}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => router.push('/invoices')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#999',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <ArrowLeft size={14} /> Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={saving || !clientId || lineItems.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: '1px solid #e0dbd2',
              background: '#ffffff', color: '#1a1a1a',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: saving || !clientId || lineItems.length === 0 ? 0.5 : 1,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save as Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || !clientId || lineItems.length === 0}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 8,
              border: 'none',
              background: '#00c853', color: '#1a1a1a',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              opacity: saving || !clientId || lineItems.length === 0 ? 0.5 : 1,
            }}
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Save & Send
          </button>
        </div>
      }
    >
      <div style={{ maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Top row: Customer + Invoice meta */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: Customer */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e0dbd2',
          }}>
            <CustomerSelector
              clients={clients}
              selectedClientId={clientId || null}
              onSelect={handleClientSelect}
              onClear={() => setClientId('')}
            />
          </div>

          {/* Right: Invoice details */}
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e0dbd2',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Invoice #</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  readOnly
                  style={{ ...inputStyle, background: '#faf8f4', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as InvoiceCurrency)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {Object.entries(CURRENCY_SYMBOLS).map(([code, sym]) => (
                    <option key={code} value={code}>{code} ({sym})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Terms</label>
                <select
                  value={terms}
                  onChange={(e) => setTerms(e.target.value as PaymentTerms)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {Object.entries(PAYMENT_TERMS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                readOnly
                style={{ ...inputStyle, background: '#faf8f4' }}
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <LineItemsTable
          items={lineItems}
          catalogItems={catalogItems}
          onChange={setLineItems}
        />

        {/* Totals */}
        <InvoiceTotalsSection
          subtotal={totals.subtotal}
          total={totals.total}
          amountPaid={invoice?.amountPaid || 0}
          balanceDue={totals.total - (invoice?.amountPaid || 0)}
          currency={currency}
        />

        {/* Notes & Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e0dbd2',
          }}>
            <label style={labelStyle}>Customer Notes</label>
            <textarea
              value={customerNotes || ''}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Notes visible on the invoice..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 80,
              }}
            />
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            padding: 20,
            border: '1px solid #e0dbd2',
          }}>
            <label style={labelStyle}>Terms & Conditions</label>
            <textarea
              value={termsAndConditions || ''}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              placeholder="Bank details, payment instructions..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: 80,
                fontFamily: "'Space Mono', monospace",
                fontSize: 11,
              }}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}
