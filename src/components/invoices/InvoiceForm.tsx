'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Send, ArrowLeft, Loader2, CreditCard } from 'lucide-react';
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
import { useOntologyStore } from '@/lib/store/ontology-store';
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
  const { getCustomerContracts, getContractRevenueStreams } = useOntologyStore();

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
  const [customTermsLabel, setCustomTermsLabel] = useState(invoice?.customTermsLabel || '');
  const [showTrn, setShowTrn] = useState(invoice?.showTrn ?? false);
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
  const [contractId, setContractId] = useState<string | null>(invoice?.contractId || null);
  const [enableStripe, setEnableStripe] = useState(true);
  const [enableBank, setEnableBank] = useState(true);

  const selectedClient = clients.find((c) => c.id === clientId) || null;

  // Auto-generate invoice number
  useEffect(() => {
    if (!isEdit && !invoiceNumber) {
      getNextNumber('invoice').then(setInvoiceNumber);
    }
  }, [isEdit, invoiceNumber, getNextNumber]);

  // Recalculate due date when invoice date or terms change (skip for custom — user sets it)
  useEffect(() => {
    if (invoiceDate && terms && terms !== 'custom') {
      setDueDate(calculateDueDate(invoiceDate, terms));
    }
  }, [invoiceDate, terms]);

  // Auto-enable TRN when client has a TRN
  useEffect(() => {
    if (selectedClient?.trn) {
      setShowTrn(true);
    }
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set terms + resolve contract + pre-populate line items from revenue streams
  function handleClientSelect(client: Client) {
    setClientId(client.id);
    if (client.defaultTerms) {
      setTerms(client.defaultTerms as PaymentTerms);
    } else if (client.billingCycle) {
      setTerms(billingCycleToTerms(client.billingCycle));
    }

    // Auto-resolve active contract and pre-populate line items from revenue streams
    const customerContracts = getCustomerContracts(client.id);
    const activeContract = customerContracts.find((c) => c.status === 'active') || customerContracts[0];
    if (activeContract) {
      setContractId(activeContract.id);

      // Only auto-populate if no prefilled items and no existing items
      if (!prefillLineItems && lineItems.length === 0) {
        const streams = getContractRevenueStreams(activeContract.id);
        if (streams.length > 0) {
          const autoItems: InvoiceLineItem[] = streams
            .filter((s) => s.type !== 'one_time') // skip one-time for recurring invoices
            .map((s) => ({
              id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              revenueStreamId: s.id,
              description: `${s.type === 'subscription' ? 'Subscription' : s.type === 'add_on' ? 'Add-on' : s.type === 'managed_service' ? 'Managed Service' : s.type} — ${s.frequency}`,
              quantity: 1,
              rate: s.amount,
              discountType: 'percent' as const,
              discountValue: 0,
              amount: s.amount,
            }));
          if (autoItems.length > 0) {
            setLineItems(autoItems);
          }
        }
      }
    } else {
      setContractId(null);
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
          customTermsLabel: terms === 'custom' ? customTermsLabel : null,
          showTrn,
          invoiceDate,
          terms,
          dueDate,
          currency,
          contractId,
          status: markAsSent ? 'sent' : invoice.status,
          sentAt: markAsSent ? now : invoice.sentAt,
        });
      } else {
        const newInvoice: Invoice = {
          id: `inv-${Date.now()}`,
          invoiceNumber,
          clientId,
          contractId,
          receivableId,
          currency,
          status,
          invoiceDate,
          terms,
          dueDate,
          customTermsLabel: terms === 'custom' ? customTermsLabel : null,
          showTrn,
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

            {terms === 'custom' && (
              <div>
                <label style={labelStyle}>Custom Terms Description</label>
                <input
                  type="text"
                  value={customTermsLabel}
                  onChange={(e) => setCustomTermsLabel(e.target.value)}
                  placeholder="e.g. 50% upfront, 50% on delivery"
                  style={inputStyle}
                />
              </div>
            )}

            <div>
              <label style={labelStyle}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                readOnly={terms !== 'custom'}
                style={{ ...inputStyle, background: terms !== 'custom' ? '#faf8f4' : '#ffffff' }}
              />
            </div>

            {selectedClient?.trn && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  id="showTrn"
                  checked={showTrn}
                  onChange={(e) => setShowTrn(e.target.checked)}
                  style={{ width: 14, height: 14, cursor: 'pointer', accentColor: '#2979ff' }}
                />
                <label
                  htmlFor="showTrn"
                  style={{ ...labelStyle, marginBottom: 0, cursor: 'pointer', textTransform: 'none', fontSize: 12 }}
                >
                  Include TRN on invoice ({selectedClient.trn})
                </label>
              </div>
            )}
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

        {/* Notes */}
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

        {/* Payment Method Selection */}
        <div style={{
          background: '#ffffff',
          borderRadius: 12,
          padding: 20,
          border: '1px solid #e0dbd2',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CreditCard size={16} style={{ color: '#1a1a1a' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#666', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Payment Method
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#999', fontFamily: "'DM Sans', sans-serif", marginBottom: 16 }}>
            Select how your client can pay this invoice. You can enable one or both.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Stripe Option */}
            <div style={{
              padding: 14, borderRadius: 10,
              border: enableStripe ? '2px solid #635bff' : '1px solid #e0dbd2',
              background: enableStripe ? 'rgba(99,91,255,0.04)' : '#fff',
              transition: 'all 0.15s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="enableStripe"
                  checked={enableStripe}
                  onChange={(e) => setEnableStripe(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#635bff' }}
                />
                <label htmlFor="enableStripe" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                  <span style={{
                    background: '#635bff', color: '#ffffff', padding: '3px 10px',
                    borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  }}>
                    Stripe
                  </span>
                  <span style={{ fontSize: 12, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                    Pay online with credit/debit card
                  </span>
                </label>
              </div>
              {enableStripe && (
                <p style={{ fontSize: 10, color: '#635bff', fontFamily: "'DM Sans', sans-serif", marginTop: 8, marginLeft: 26 }}>
                  A &ldquo;Pay Online&rdquo; button will appear on the invoice for your client.
                </p>
              )}
            </div>

            {/* Bank Transfer Option */}
            <div style={{
              padding: 14, borderRadius: 10,
              border: enableBank ? '2px solid #00a844' : '1px solid #e0dbd2',
              background: enableBank ? 'rgba(0,168,68,0.04)' : '#fff',
              transition: 'all 0.15s ease',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="enableBank"
                  checked={enableBank}
                  onChange={(e) => setEnableBank(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#00a844' }}
                />
                <label htmlFor="enableBank" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', flex: 1 }}>
                  <span style={{
                    background: '#1a1a1a', color: '#ffffff', padding: '3px 10px',
                    borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  }}>
                    Bank
                  </span>
                  <span style={{ fontSize: 12, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                    Pay via bank transfer / wire
                  </span>
                </label>
              </div>
              {enableBank && (
                <div style={{ marginTop: 10, marginLeft: 26 }}>
                  <label style={{ ...labelStyle, marginBottom: 6 }}>Bank Details (shown on invoice)</label>
                  <textarea
                    value={termsAndConditions || ''}
                    onChange={(e) => setTermsAndConditions(e.target.value)}
                    placeholder="Account holder, bank name, IBAN, BIC/SWIFT..."
                    rows={4}
                    style={{
                      ...inputStyle,
                      resize: 'vertical',
                      minHeight: 80,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
