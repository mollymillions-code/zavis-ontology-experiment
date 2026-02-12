'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Mail, Copy, ExternalLink, Check } from 'lucide-react';
import type { Invoice, Client } from '@/lib/models/platform-types';
import { CURRENCY_SYMBOLS } from '@/lib/models/platform-types';
import { useInvoiceStore } from '@/lib/store/invoice-store';

interface EmailSendDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  client: Client;
}

export default function EmailSendDialog({
  open,
  onClose,
  invoice,
  client,
}: EmailSendDialogProps) {
  const { companyConfig, updateInvoice } = useInvoiceStore();
  const sym = CURRENCY_SYMBOLS[invoice.currency] || invoice.currency;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2 });

  const [to, setTo] = useState(client.email || '');
  const [cc, setCc] = useState('');
  const [copied, setCopied] = useState(false);

  const subject = `Invoice ${invoice.invoiceNumber} from ${companyConfig.name}`;
  const body = `Dear ${client.name},

Please find attached invoice ${invoice.invoiceNumber} for ${fmt(invoice.total)} ${sym}.

Invoice Date: ${new Date(invoice.invoiceDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
Amount Due: ${fmt(invoice.balanceDue)} ${sym}

You can download the invoice PDF from the link below.

${companyConfig.defaultNotes}

Best regards,
${companyConfig.name}
${companyConfig.phone}
${companyConfig.email}`;

  function handleCopy() {
    const text = `To: ${to}\n${cc ? `CC: ${cc}\n` : ''}Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenGmail() {
    const mailtoUrl = `mailto:${to}?${cc ? `cc=${cc}&` : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  }

  function handleMarkSent() {
    updateInvoice(invoice.id, {
      status: 'sent',
      sentAt: new Date().toISOString(),
    });
    onClose();
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
          width: 540, maxWidth: '90vw',
          background: '#f5f0e8',
          borderRadius: 16,
          zIndex: 51,
          boxShadow: '0 16px 48px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            background: '#1a1a1a',
            padding: '16px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <Dialog.Title style={{
              fontSize: 16, fontWeight: 700, color: '#ffffff',
              fontFamily: "'DM Sans', sans-serif", margin: 0,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Mail size={18} style={{ color: '#00c853' }} />
              Send Invoice
            </Dialog.Title>
            <Dialog.Close asChild>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', padding: 4 }}>
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
            {/* From */}
            <div>
              <label style={labelStyle}>From</label>
              <div style={{
                ...inputStyle,
                background: '#faf8f4',
                color: '#666',
              }}>
                ZAVIS Support &lt;{companyConfig.email}&gt;
              </div>
            </div>

            {/* To */}
            <div>
              <label style={labelStyle}>To</label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="client@example.com"
                style={inputStyle}
              />
            </div>

            {/* CC */}
            <div>
              <label style={labelStyle}>CC (optional)</label>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com"
                style={inputStyle}
              />
            </div>

            {/* Subject */}
            <div>
              <label style={labelStyle}>Subject</label>
              <div style={{
                ...inputStyle,
                background: '#faf8f4',
                fontWeight: 600,
              }}>
                {subject}
              </div>
            </div>

            {/* Amount callout */}
            <div style={{
              padding: 16,
              borderRadius: 10,
              background: '#ffffff',
              border: '1px solid #e0dbd2',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Invoice Amount
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace", margin: '4px 0 0 0' }}>
                {fmt(invoice.total)} {sym}
              </p>
            </div>

            {/* Body preview */}
            <div>
              <label style={labelStyle}>Message Preview</label>
              <div style={{
                ...inputStyle,
                background: '#faf8f4',
                fontSize: 11,
                lineHeight: 1.5,
                fontFamily: "'DM Sans', sans-serif",
                whiteSpace: 'pre-line',
                maxHeight: 160,
                overflowY: 'auto',
              }}>
                {body}
              </div>
            </div>

            {/* PDF link note */}
            <div style={{
              padding: 10, borderRadius: 6,
              background: '#fff8e1', border: '1px solid #ffe082',
              fontSize: 11, color: '#f57f17',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Attach the PDF manually after copying. PDF download: /api/invoices/{invoice.id}/pdf
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: '1px solid #e0dbd2',
                  background: '#ffffff', color: '#1a1a1a',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                {copied ? <Check size={14} style={{ color: '#00c853' }} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
              <button
                onClick={handleOpenGmail}
                style={{
                  flex: 1, padding: '12px', borderRadius: 8,
                  border: 'none',
                  background: '#00c853', color: '#1a1a1a',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <ExternalLink size={14} />
                Open in Email
              </button>
            </div>

            <button
              onClick={handleMarkSent}
              style={{
                width: '100%', padding: '10px', borderRadius: 8,
                border: '1px solid #e0dbd2',
                background: 'transparent', color: '#666',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Mark as Sent (I sent it manually)
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
