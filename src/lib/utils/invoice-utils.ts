import type {
  Invoice,
  InvoiceLineItem,
  InvoiceStatus,
  PaymentTerms,
  CatalogItem,
} from '../models/platform-types';

// ===== DUE DATE CALCULATION =====

export function calculateDueDate(invoiceDate: string, terms: PaymentTerms): string {
  const date = new Date(invoiceDate);

  switch (terms) {
    case 'due_on_receipt':
      return invoiceDate;
    case 'net_14':
      date.setDate(date.getDate() + 14);
      return date.toISOString().split('T')[0];
    case 'net_30':
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
    case 'net_45':
      date.setDate(date.getDate() + 45);
      return date.toISOString().split('T')[0];
    case 'net_60':
      date.setDate(date.getDate() + 60);
      return date.toISOString().split('T')[0];
    case 'due_end_of_month':
      date.setMonth(date.getMonth() + 1, 0); // last day of current month
      return date.toISOString().split('T')[0];
    case 'due_end_of_next_month':
      date.setMonth(date.getMonth() + 2, 0); // last day of next month
      return date.toISOString().split('T')[0];
    default:
      date.setDate(date.getDate() + 30);
      return date.toISOString().split('T')[0];
  }
}

// ===== LINE ITEM CALCULATIONS =====

export function calculateLineItemAmount(item: Omit<InvoiceLineItem, 'amount' | 'id'>): number {
  const gross = item.quantity * item.rate;
  if (item.discountType === 'percent') {
    return gross * (1 - item.discountValue / 100);
  }
  return Math.max(0, gross - item.discountValue);
}

export function calculateInvoiceTotals(lineItems: InvoiceLineItem[]): { subtotal: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  return { subtotal, total: subtotal }; // no tax for now
}

// ===== NUMBER FORMATTING =====

export function formatInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(6, '0')}`;
}

export function formatPaymentNumber(seq: number): string {
  return `PAY-${String(seq).padStart(6, '0')}`;
}

// ===== BILLING CYCLE → TERMS MAPPING =====

export function billingCycleToTerms(billingCycle?: string | null): PaymentTerms {
  if (!billingCycle) return 'net_30';
  const cycle = billingCycle.toLowerCase();
  if (cycle === 'monthly') return 'net_30';
  if (cycle === 'quarterly') return 'net_45';
  if (cycle === 'half-yearly' || cycle === 'semi-annually') return 'net_60';
  if (cycle === 'annually' || cycle === 'yearly') return 'net_60';
  if (cycle === 'one-time') return 'due_on_receipt';
  return 'net_30';
}

// ===== RECEIVABLE → LINE ITEMS PARSER =====

export function parseReceivableToLineItems(
  description: string,
  amount: number,
  catalogItems: CatalogItem[]
): InvoiceLineItem[] {
  // Try to match description to a catalog item
  const lowerDesc = description.toLowerCase();
  const match = catalogItems.find(
    (item) =>
      lowerDesc.includes(item.name.toLowerCase()) ||
      item.name.toLowerCase().includes(lowerDesc)
  );

  return [
    {
      id: `li-${Date.now()}`,
      itemId: match?.id,
      description: match?.name || description,
      quantity: 1,
      rate: amount,
      discountType: 'flat' as const,
      discountValue: 0,
      amount,
    },
  ];
}

// ===== AGING ANALYSIS =====

export type AgingBucket = 'current' | '1-15' | '16-30' | '31-45' | '45+';

export function getAgingBucket(dueDate: string): AgingBucket {
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'current';
  if (diffDays <= 15) return '1-15';
  if (diffDays <= 30) return '16-30';
  if (diffDays <= 45) return '31-45';
  return '45+';
}

export interface AgingSummary {
  current: number;
  '1-15': number;
  '16-30': number;
  '31-45': number;
  '45+': number;
  total: number;
}

export function getAgingSummary(invoices: Invoice[]): AgingSummary {
  const summary: AgingSummary = {
    current: 0,
    '1-15': 0,
    '16-30': 0,
    '31-45': 0,
    '45+': 0,
    total: 0,
  };

  const unpaidInvoices = invoices.filter(
    (inv) => !['paid', 'void', 'draft'].includes(inv.status)
  );

  for (const inv of unpaidInvoices) {
    const bucket = getAgingBucket(inv.dueDate);
    summary[bucket] += inv.balanceDue;
    summary.total += inv.balanceDue;
  }

  return summary;
}

// ===== INVOICE METRICS =====

export interface InvoiceMetrics {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  totalOverdue: number;
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
}

export function getInvoiceMetrics(invoices: Invoice[]): InvoiceMetrics {
  const now = new Date();
  let totalInvoiced = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let totalOverdue = 0;
  let draftCount = 0;
  let sentCount = 0;
  let paidCount = 0;
  let overdueCount = 0;

  for (const inv of invoices) {
    if (inv.status === 'void') continue;

    totalInvoiced += inv.total;
    totalPaid += inv.amountPaid;

    if (inv.status === 'draft') {
      draftCount++;
    } else if (inv.status === 'paid') {
      paidCount++;
    } else {
      // sent, unpaid, partially_paid, overdue
      totalOutstanding += inv.balanceDue;
      sentCount++;

      if (new Date(inv.dueDate) < now && inv.balanceDue > 0) {
        totalOverdue += inv.balanceDue;
        overdueCount++;
      }
    }
  }

  return {
    totalInvoiced,
    totalPaid,
    totalOutstanding,
    totalOverdue,
    draftCount,
    sentCount,
    paidCount,
    overdueCount,
  };
}

// ===== STATUS HELPERS =====

export function canEditInvoice(status: InvoiceStatus): boolean {
  return status === 'draft';
}

export function canVoidInvoice(status: InvoiceStatus): boolean {
  return !['void', 'paid'].includes(status);
}

export function canRecordPayment(status: InvoiceStatus): boolean {
  return ['sent', 'unpaid', 'partially_paid', 'overdue'].includes(status);
}
