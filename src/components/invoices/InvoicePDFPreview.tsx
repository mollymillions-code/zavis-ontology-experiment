'use client';

import type { Invoice, Client } from '@/lib/models/platform-types';
import { CURRENCY_SYMBOLS } from '@/lib/models/platform-types';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import InvoiceStatusBadge from './InvoiceStatusBadge';

interface InvoicePDFPreviewProps {
  invoice: Invoice;
  client: Client;
}

export default function InvoicePDFPreview({ invoice, client }: InvoicePDFPreviewProps) {
  const { companyConfig } = useInvoiceStore();
  const sym = CURRENCY_SYMBOLS[invoice.currency] || invoice.currency;
  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 4,
      boxShadow: '0 2px 16px rgba(0,0,0,0.1)',
      padding: 40,
      maxWidth: 680,
      margin: '0 auto',
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 12,
      color: '#1a1a1a',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <div style={{
            fontSize: 28,
            fontWeight: 900,
            fontFamily: "'Space Mono', monospace",
            letterSpacing: 4,
            color: '#1a1a1a',
            marginBottom: 8,
          }}>
            {companyConfig.logoText}
          </div>
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>
            <div style={{ fontWeight: 600 }}>{companyConfig.name}</div>
            <div>{companyConfig.address}</div>
            <div>{companyConfig.phone}</div>
            <div>{companyConfig.email}</div>
            <div>{companyConfig.website}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#1a1a1a',
            marginBottom: 8,
            letterSpacing: 1,
          }}>
            TAX INVOICE
          </div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#1a1a1a',
            fontFamily: "'Space Mono', monospace",
            marginBottom: 4,
          }}>
            # {invoice.invoiceNumber}
          </div>
          <InvoiceStatusBadge status={invoice.status} />
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 }}>Balance Due</div>
            <div style={{
              fontSize: 18,
              fontWeight: 700,
              color: '#1a1a1a',
              fontFamily: "'Space Mono', monospace",
            }}>
              {fmt(invoice.balanceDue)} {sym}
            </div>
          </div>
        </div>
      </div>

      {/* Bill To */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 24,
        padding: '16px 0',
        borderTop: '1px solid #e0dbd2',
        borderBottom: '1px solid #e0dbd2',
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
            Bill To
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#2196f3', marginBottom: 2 }}>
            {client.companyLegalName || client.name}
          </div>
          {client.billingAddress && (
            <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>
              {client.billingAddress.attention && <div>{client.billingAddress.attention}</div>}
              {client.billingAddress.street1 && <div>{client.billingAddress.street1}</div>}
              {client.billingAddress.street2 && <div>{client.billingAddress.street2}</div>}
              {[client.billingAddress.city, client.billingAddress.state, client.billingAddress.zip]
                .filter(Boolean).join(', ') && (
                <div>{[client.billingAddress.city, client.billingAddress.state, client.billingAddress.zip].filter(Boolean).join(', ')}</div>
              )}
              {client.billingAddress.country && <div>{client.billingAddress.country}</div>}
            </div>
          )}
          {client.email && (
            <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{client.email}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            <div>
              <span style={{ fontSize: 10, color: '#999', marginRight: 8 }}>Invoice Date:</span>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: '#999', marginRight: 8 }}>Terms:</span>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{invoice.terms.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
            </div>
            <div>
              <span style={{ fontSize: 10, color: '#999', marginRight: 8 }}>Due Date:</span>
              <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{formatDate(invoice.dueDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#1a1a1a' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#ffffff', fontWeight: 600, letterSpacing: 0.5 }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: '#ffffff', fontWeight: 600, letterSpacing: 0.5 }}>Item & Description</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#ffffff', fontWeight: 600, letterSpacing: 0.5 }}>Qty</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#ffffff', fontWeight: 600, letterSpacing: 0.5 }}>Rate</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontSize: 10, color: '#ffffff', fontWeight: 600, letterSpacing: 0.5 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item, i) => (
            <tr key={item.id} style={{ borderBottom: '1px solid #e0dbd2' }}>
              <td style={{ padding: '10px', fontSize: 11, color: '#999', fontFamily: "'Space Mono', monospace" }}>{i + 1}</td>
              <td style={{ padding: '10px', fontSize: 12, fontWeight: 500 }}>{item.description}</td>
              <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{item.quantity}</td>
              <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontFamily: "'Space Mono', monospace" }}>{fmt(item.rate)}</td>
              <td style={{ padding: '10px', textAlign: 'right', fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{fmt(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 260 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e0dbd2' }}>
            <span style={{ fontSize: 11, color: '#666' }}>Subtotal</span>
            <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{fmt(invoice.subtotal)} {sym}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #1a1a1a' }}>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Total ({invoice.currency})</span>
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{fmt(invoice.total)} {sym}</span>
          </div>
          {invoice.amountPaid > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e0dbd2' }}>
              <span style={{ fontSize: 11, color: '#00a844' }}>Payment Made</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#00a844', fontFamily: "'Space Mono', monospace" }}>(-) {fmt(invoice.amountPaid)} {sym}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', background: '#f5f0e8', borderRadius: 6, marginTop: 6, paddingLeft: 8, paddingRight: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Balance Due</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1a1a1a' }}>
              {fmt(invoice.balanceDue)} {sym}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {invoice.customerNotes && (
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e0dbd2' }}>
          <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Notes</div>
          <div style={{ fontSize: 11, color: '#666', lineHeight: 1.5 }}>{invoice.customerNotes}</div>
        </div>
      )}

      {/* Terms & Conditions */}
      {invoice.termsAndConditions && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e0dbd2' }}>
          <div style={{ fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Terms & Conditions</div>
          <div style={{ fontSize: 10, color: '#666', lineHeight: 1.6, fontFamily: "'Space Mono', monospace", whiteSpace: 'pre-line' }}>
            {invoice.termsAndConditions}
          </div>
        </div>
      )}
    </div>
  );
}
