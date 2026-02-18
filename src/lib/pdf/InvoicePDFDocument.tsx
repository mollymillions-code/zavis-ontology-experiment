import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Invoice, Client, CompanyConfig } from '@/lib/models/platform-types';
import { CURRENCY_SYMBOLS, INVOICE_STATUS_LABELS, PAYMENT_TERMS_LABELS } from '@/lib/models/platform-types';

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 4,
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
  companyName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#1a1a1a',
    marginBottom: 2,
  },
  titleBlock: {
    alignItems: 'flex-end',
  },
  taxInvoice: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  invoiceNumber: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  balanceDueLabel: {
    fontSize: 8,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  balanceDueValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0dbd2',
    marginVertical: 12,
  },
  billToSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0dbd2',
    borderBottomWidth: 1,
    borderBottomColor: '#e0dbd2',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 8,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2196f3',
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 8,
    color: '#999',
    marginRight: 6,
  },
  detailValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableHeaderText: {
    fontSize: 8,
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0dbd2',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  colNum: { width: '6%' },
  colDesc: { width: '44%' },
  colQty: { width: '12%', textAlign: 'right' },
  colRate: { width: '18%', textAlign: 'right' },
  colAmount: { width: '20%', textAlign: 'right' },
  totalsContainer: {
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  totalsBox: {
    width: 220,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0dbd2',
  },
  totalLabel: {
    fontSize: 9,
    color: '#666',
  },
  totalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  grandTotalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  grandTotalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },
  balanceDueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: '#f5f0e8',
    borderRadius: 4,
    marginTop: 4,
  },
  notesSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0dbd2',
  },
  notesText: {
    fontSize: 9,
    color: '#666',
    lineHeight: 1.5,
  },
});

interface InvoicePDFDocumentProps {
  invoice: Invoice;
  client: Client;
  companyConfig: CompanyConfig;
}

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export default function InvoicePDFDocument({ invoice, client, companyConfig }: InvoicePDFDocumentProps) {
  const sym = CURRENCY_SYMBOLS[invoice.currency] || invoice.currency;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>{companyConfig.logoText}</Text>
            <View style={{ marginTop: 6 }}>
              <Text style={styles.companyName}>{companyConfig.name}</Text>
              <Text style={styles.companyInfo}>{companyConfig.address}</Text>
              <Text style={styles.companyInfo}>{companyConfig.phone}</Text>
              <Text style={styles.companyInfo}>{companyConfig.email}</Text>
              <Text style={styles.companyInfo}>{companyConfig.website}</Text>
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.taxInvoice}>TAX INVOICE</Text>
            <Text style={styles.invoiceNumber}># {invoice.invoiceNumber}</Text>
            <Text style={[styles.statusBadge, {
              backgroundColor: invoice.status === 'paid' ? '#e8f5e9' : '#fff3e0',
              color: invoice.status === 'paid' ? '#00c853' : '#f57f17',
            }]}>
              {INVOICE_STATUS_LABELS[invoice.status]}
            </Text>
            <Text style={styles.balanceDueLabel}>Balance Due</Text>
            <Text style={[styles.balanceDueValue, {
              color: '#1a1a1a',
            }]}>
              {fmt(invoice.balanceDue)} {sym}
            </Text>
          </View>
        </View>

        {/* Bill To + Dates */}
        <View style={styles.billToSection}>
          <View>
            <Text style={styles.sectionLabel}>Bill To</Text>
            <Text style={styles.clientName}>{client.companyLegalName || client.name}</Text>
            {client.billingAddress && (
              <>
                {client.billingAddress.attention && <Text style={styles.companyInfo}>{client.billingAddress.attention}</Text>}
                {client.billingAddress.street1 && <Text style={styles.companyInfo}>{client.billingAddress.street1}</Text>}
                {client.billingAddress.city && <Text style={styles.companyInfo}>
                  {[client.billingAddress.city, client.billingAddress.state, client.billingAddress.zip].filter(Boolean).join(', ')}
                </Text>}
                {client.billingAddress.country && <Text style={styles.companyInfo}>{client.billingAddress.country}</Text>}
              </>
            )}
            {client.email && <Text style={styles.companyInfo}>{client.email}</Text>}
            {invoice.showTrn && client.trn && (
              <Text style={[styles.companyInfo, { marginTop: 4 }]}>TRN: {client.trn}</Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.invoiceDate)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Terms:</Text>
              <Text style={styles.detailValue}>
                {invoice.terms === 'custom'
                  ? (invoice.customTermsLabel || 'Custom Terms')
                  : PAYMENT_TERMS_LABELS[invoice.terms]}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Due Date:</Text>
              <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colNum]}>#</Text>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Item & Description</Text>
            <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
            <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
          </View>
          {invoice.lineItems.map((item, i) => (
            <View key={item.id} style={styles.tableRow}>
              <Text style={[{ fontSize: 9, color: '#999' }, styles.colNum]}>{i + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={{ fontSize: 9 }}>{item.description}</Text>
                {item.itemNote && (
                  <Text style={{ fontSize: 8, color: '#888', marginTop: 2, lineHeight: 1.4 }}>{item.itemNote}</Text>
                )}
              </View>
              <Text style={[{ fontSize: 9 }, styles.colQty]}>{item.quantity}</Text>
              <Text style={[{ fontSize: 9 }, styles.colRate]}>{fmt(item.rate)}</Text>
              <Text style={[{ fontSize: 9, fontFamily: 'Helvetica-Bold' }, styles.colAmount]}>{fmt(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{fmt(invoice.subtotal)} {sym}</Text>
            </View>
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total ({invoice.currency})</Text>
              <Text style={styles.grandTotalValue}>{fmt(invoice.total)} {sym}</Text>
            </View>
            {invoice.amountPaid > 0 && (
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: '#00a844' }]}>Payment Made</Text>
                <Text style={[styles.totalValue, { color: '#00a844' }]}>(-) {fmt(invoice.amountPaid)} {sym}</Text>
              </View>
            )}
            <View style={styles.balanceDueRow}>
              <Text style={[styles.grandTotalLabel, { fontSize: 11 }]}>Balance Due</Text>
              <Text style={[styles.grandTotalValue, {
                fontSize: 11,
                color: '#1a1a1a',
              }]}>
                {fmt(invoice.balanceDue)} {sym}
              </Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        {invoice.customerNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.customerNotes}</Text>
          </View>
        )}

        {/* Terms */}
        {invoice.termsAndConditions && (
          <View style={[styles.notesSection, { marginTop: 12 }]}>
            <Text style={styles.sectionLabel}>Terms & Conditions</Text>
            <Text style={[styles.notesText, { fontSize: 8 }]}>{invoice.termsAndConditions}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
