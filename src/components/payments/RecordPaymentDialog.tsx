'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Loader2, CreditCard } from 'lucide-react';
import type { Invoice, PaymentMode, Client } from '@/lib/models/platform-types';
import { PAYMENT_MODE_LABELS, CURRENCY_SYMBOLS } from '@/lib/models/platform-types';
import { useInvoiceStore } from '@/lib/store/invoice-store';

interface RecordPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  client: Client;
}

export default function RecordPaymentDialog({
  open,
  onClose,
  invoice,
  client,
}: RecordPaymentDialogProps) {
  const { addPayment, getNextNumber } = useInvoiceStore();

  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState(invoice.balanceDue);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<PaymentMode>('bank_transfer');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const sym = CURRENCY_SYMBOLS[invoice.currency] || invoice.currency;

  async function handleSave() {
    setSaving(true);
    try {
      const paymentNumber = await getNextNumber('payment');
      addPayment({
        id: `pay-${Date.now()}`,
        paymentNumber,
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        date,
        amount,
        mode,
        referenceNumber: referenceNumber || null,
        status: 'confirmed',
        notes: notes || null,
        createdAt: new Date().toISOString(),
      });
      onClose();
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
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)', zIndex: 50,
        }} />
        <Dialog.Content style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480, maxWidth: '90vw',
          background: '#f5f0e8',
          borderRadius: 16,
          zIndex: 51,
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            background: '#1a1a1a',
            padding: '16px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Dialog.Title style={{
              fontSize: 16, fontWeight: 700, color: '#ffffff',
              fontFamily: "'DM Sans', sans-serif", margin: 0,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <CreditCard size={18} style={{ color: '#00c853' }} />
              Record Payment
            </Dialog.Title>
            <Dialog.Close asChild>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Invoice info */}
            <div style={{
              padding: 12, borderRadius: 8,
              background: '#ffffff', border: '1px solid #e0dbd2',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                  {invoice.invoiceNumber}
                </p>
                <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", margin: '2px 0 0 0' }}>
                  {client.name}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>Balance Due</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#d32f2f', fontFamily: "'Space Mono', monospace", margin: 0 }}>
                  {invoice.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} {sym}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Amount Received</label>
                <input
                  type="number"
                  min={0}
                  max={invoice.balanceDue}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  style={{ ...inputStyle, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}
                />
              </div>
              <div>
                <label style={labelStyle}>Payment Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Payment Mode</label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PaymentMode)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {Object.entries(PAYMENT_MODE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Reference #</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Transaction ID / Cheque #"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
                style={inputStyle}
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving || amount <= 0}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                border: 'none',
                background: saving || amount <= 0 ? '#e0dbd2' : '#00c853',
                color: saving || amount <= 0 ? '#999' : '#1a1a1a',
                fontSize: 13, fontWeight: 700,
                cursor: saving || amount <= 0 ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
              Record Payment
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
