import type {
  Client,
  BillingAddress,
  ReceivableEntry,
  MonthlySnapshot,
  PricingWhatIf,
  MonthlyCost,
  Contract,
  RevenueStream,
  Partner,
  CustomerPartnerLink,
  ActionLogEntry,
  ActionMutationRecord,
  Invoice,
  InvoiceLineItem,
  CatalogItem,
  PaymentReceived,
} from '@/lib/models/platform-types';

// ===== CLIENTS =====

export function dbRowToClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    salesPartner: (row.salesPartner as string) || null,
    status: row.status as Client['status'],
    pricingModel: row.pricingModel as Client['pricingModel'],
    perSeatCost: row.perSeatCost != null ? Number(row.perSeatCost) : null,
    seatCount: row.seatCount != null ? Number(row.seatCount) : null,
    billingCycle: (row.billingCycle as string) || null,
    plan: (row.plan as string) || null,
    discount: row.discount != null ? Number(row.discount) : null,
    mrr: Number(row.mrr) || 0,
    oneTimeRevenue: Number(row.oneTimeRevenue) || 0,
    annualRunRate: Number(row.annualRunRate) || 0,
    onboardingDate: (row.onboardingDate as string) || null,
    notes: (row.notes as string) || undefined,
    email: (row.email as string) || null,
    phone: (row.phone as string) || null,
    companyLegalName: (row.companyLegalName as string) || null,
    billingAddress: (row.billingAddress as BillingAddress) || null,
    defaultTerms: (row.defaultTerms as string) || null,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date
      ? (row.updatedAt as Date).toISOString()
      : (row.updatedAt as string),
  };
}

export function clientToDbValues(c: Client) {
  return {
    id: c.id,
    name: c.name,
    salesPartner: c.salesPartner,
    status: c.status,
    pricingModel: c.pricingModel,
    perSeatCost: c.perSeatCost != null ? String(c.perSeatCost) : null,
    seatCount: c.seatCount,
    billingCycle: c.billingCycle ?? null,
    plan: c.plan ?? null,
    discount: c.discount != null ? String(c.discount) : null,
    mrr: String(c.mrr),
    oneTimeRevenue: String(c.oneTimeRevenue),
    annualRunRate: String(c.annualRunRate),
    onboardingDate: c.onboardingDate,
    notes: c.notes ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    companyLegalName: c.companyLegalName ?? null,
    billingAddress: c.billingAddress ?? null,
    defaultTerms: c.defaultTerms ?? null,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
  };
}

// ===== RECEIVABLES =====

export function dbRowToReceivable(row: Record<string, unknown>): ReceivableEntry {
  return {
    id: row.id as string,
    clientId: row.clientId as string,
    month: row.month as string,
    amount: Number(row.amount) || 0,
    description: row.description as string,
    status: row.status as ReceivableEntry['status'],
  };
}

export function receivableToDbValues(r: ReceivableEntry) {
  return {
    id: r.id,
    clientId: r.clientId,
    month: r.month,
    amount: String(r.amount),
    description: r.description,
    status: r.status,
  };
}

// ===== MONTHLY SNAPSHOTS =====

export function dbRowToSnapshot(row: Record<string, unknown>): MonthlySnapshot {
  const data = row.data as Omit<MonthlySnapshot, 'month' | 'capturedAt'>;
  return {
    month: row.month as string,
    capturedAt: row.capturedAt instanceof Date
      ? (row.capturedAt as Date).toISOString()
      : (row.capturedAt as string),
    ...data,
  };
}

export function snapshotToDbValues(s: MonthlySnapshot) {
  const { month, capturedAt, ...data } = s;
  return {
    month,
    capturedAt: new Date(capturedAt),
    data,
  };
}

// ===== WHAT-IF SCENARIOS =====

export function dbRowToWhatIf(row: Record<string, unknown>): PricingWhatIf {
  const base: PricingWhatIf = {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
    modifiedPerSeatPrice: Number(row.modifiedPerSeatPrice) || 0,
  };

  // Merge extended scenario data if present
  if (row.scenarioData && typeof row.scenarioData === 'object') {
    const data = row.scenarioData as Record<string, unknown>;
    if (data.source) base.source = data.source as PricingWhatIf['source'];
    if (data.lineItemValues) base.lineItemValues = data.lineItemValues as Record<string, number>;
    if (data.costOverrides) base.costOverrides = data.costOverrides as Record<string, number>;
    if (data.dealAnalysis) base.dealAnalysis = data.dealAnalysis as PricingWhatIf['dealAnalysis'];
  }

  return base;
}

export function whatIfToDbValues(w: PricingWhatIf) {
  // Pack extended fields into scenarioData JSONB
  const scenarioData: Record<string, unknown> = {};
  if (w.source) scenarioData.source = w.source;
  if (w.lineItemValues) scenarioData.lineItemValues = w.lineItemValues;
  if (w.costOverrides) scenarioData.costOverrides = w.costOverrides;
  if (w.dealAnalysis) scenarioData.dealAnalysis = w.dealAnalysis;

  return {
    id: w.id,
    name: w.name,
    modifiedPerSeatPrice: String(w.modifiedPerSeatPrice),
    scenarioData: Object.keys(scenarioData).length > 0 ? scenarioData : null,
    createdAt: new Date(w.createdAt),
  };
}

// ===== MONTHLY COSTS =====

export function dbRowToCost(row: Record<string, unknown>): MonthlyCost {
  return {
    id: row.id as string,
    month: row.month as string,
    category: row.category as MonthlyCost['category'],
    amount: Number(row.amount) || 0,
    type: row.type as MonthlyCost['type'],
    notes: (row.notes as string) || undefined,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
  };
}

export function costToDbValues(c: MonthlyCost) {
  return {
    id: c.id,
    month: c.month,
    category: c.category,
    amount: String(c.amount),
    type: c.type,
    notes: c.notes ?? null,
    createdAt: new Date(c.createdAt),
  };
}

// ═══════════════════════════════════════════════════════════
// ONTOLOGY TABLE MAPPERS
// ═══════════════════════════════════════════════════════════

// ===== PARTNERS =====

export function dbRowToPartner(row: Record<string, unknown>): Partner {
  return {
    id: row.id as string,
    name: row.name as string,
    commissionPct: Number(row.commissionPct) || 0,
    oneTimeCommissionPct: Number(row.oneTimeCommissionPct) || 0,
    totalPaid: Number(row.totalPaid) || 0,
    isActive: row.isActive as boolean,
    joinedDate: (row.joinedDate as string) || null,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
  };
}

export function partnerToDbValues(p: Partner) {
  return {
    id: p.id,
    name: p.name,
    commissionPct: String(p.commissionPct),
    oneTimeCommissionPct: String(p.oneTimeCommissionPct),
    totalPaid: String(p.totalPaid),
    isActive: p.isActive,
    joinedDate: p.joinedDate ?? null,
    createdAt: new Date(p.createdAt),
  };
}

// ===== CONTRACTS =====

export function dbRowToContract(row: Record<string, unknown>): Contract {
  return {
    id: row.id as string,
    customerId: row.customerId as string,
    startDate: row.startDate as string,
    endDate: (row.endDate as string) || null,
    billingCycle: (row.billingCycle as string) || null,
    plan: (row.plan as string) || null,
    terms: (row.terms as Record<string, unknown>) || null,
    status: row.status as Contract['status'],
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
  };
}

export function contractToDbValues(c: Contract) {
  return {
    id: c.id,
    customerId: c.customerId,
    startDate: c.startDate,
    endDate: c.endDate ?? null,
    billingCycle: c.billingCycle ?? null,
    plan: c.plan ?? null,
    terms: c.terms ?? null,
    status: c.status,
    createdAt: new Date(c.createdAt),
  };
}

// ===== REVENUE STREAMS =====

export function dbRowToRevenueStream(row: Record<string, unknown>): RevenueStream {
  return {
    id: row.id as string,
    contractId: row.contractId as string,
    type: row.type as RevenueStream['type'],
    amount: Number(row.amount) || 0,
    frequency: row.frequency as RevenueStream['frequency'],
    startDate: (row.startDate as string) || null,
    endDate: (row.endDate as string) || null,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
  };
}

export function revenueStreamToDbValues(rs: RevenueStream) {
  return {
    id: rs.id,
    contractId: rs.contractId,
    type: rs.type,
    amount: String(rs.amount),
    frequency: rs.frequency,
    startDate: rs.startDate ?? null,
    endDate: rs.endDate ?? null,
    createdAt: new Date(rs.createdAt),
  };
}

// ===== CUSTOMER-PARTNER LINKS =====

export function dbRowToCustomerPartnerLink(row: Record<string, unknown>): CustomerPartnerLink {
  return {
    id: row.id as string,
    customerId: row.customerId as string,
    partnerId: row.partnerId as string,
    attributionPct: Number(row.attributionPct) || 100,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
  };
}

export function customerPartnerLinkToDbValues(l: CustomerPartnerLink) {
  return {
    id: l.id,
    customerId: l.customerId,
    partnerId: l.partnerId,
    attributionPct: String(l.attributionPct),
    createdAt: new Date(l.createdAt),
  };
}

// ===== ACTION LOG =====

export function dbRowToActionLogEntry(row: Record<string, unknown>): ActionLogEntry {
  return {
    id: row.id as string,
    actionType: row.actionType as string,
    actor: row.actor as string,
    timestamp: row.timestamp instanceof Date
      ? (row.timestamp as Date).toISOString()
      : (row.timestamp as string),
    inputs: row.inputs as Record<string, unknown>,
    mutations: row.mutations as ActionMutationRecord[],
    metadata: (row.metadata as Record<string, unknown>) || undefined,
  };
}

export function actionLogEntryToDbValues(e: ActionLogEntry) {
  return {
    id: e.id,
    actionType: e.actionType,
    actor: e.actor,
    timestamp: new Date(e.timestamp),
    inputs: e.inputs,
    mutations: e.mutations,
    metadata: e.metadata ?? null,
  };
}

// ═══════════════════════════════════════════════════════════
// INVOICING TABLE MAPPERS
// ═══════════════════════════════════════════════════════════

// ===== INVOICES =====

export function dbRowToInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: row.id as string,
    invoiceNumber: row.invoiceNumber as string,
    clientId: row.clientId as string,
    contractId: (row.contractId as string) || null,
    receivableId: (row.receivableId as string) || null,
    currency: (row.currency as Invoice['currency']) || 'AED',
    status: row.status as Invoice['status'],
    invoiceDate: row.invoiceDate as string,
    terms: row.terms as Invoice['terms'],
    dueDate: row.dueDate as string,
    lineItems: (row.lineItems as InvoiceLineItem[]) || [],
    subtotal: Number(row.subtotal) || 0,
    total: Number(row.total) || 0,
    amountPaid: Number(row.amountPaid) || 0,
    balanceDue: Number(row.balanceDue) || 0,
    customerNotes: (row.customerNotes as string) || null,
    termsAndConditions: (row.termsAndConditions as string) || null,
    sentAt: row.sentAt instanceof Date ? (row.sentAt as Date).toISOString() : (row.sentAt as string) || null,
    paidAt: row.paidAt instanceof Date ? (row.paidAt as Date).toISOString() : (row.paidAt as string) || null,
    voidedAt: row.voidedAt instanceof Date ? (row.voidedAt as Date).toISOString() : (row.voidedAt as string) || null,
    createdAt: row.createdAt instanceof Date ? (row.createdAt as Date).toISOString() : (row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? (row.updatedAt as Date).toISOString() : (row.updatedAt as string),
  };
}

export function invoiceToDbValues(inv: Invoice) {
  return {
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientId: inv.clientId,
    contractId: inv.contractId ?? null,
    receivableId: inv.receivableId ?? null,
    currency: inv.currency,
    status: inv.status,
    invoiceDate: inv.invoiceDate,
    terms: inv.terms,
    dueDate: inv.dueDate,
    lineItems: inv.lineItems,
    subtotal: String(inv.subtotal),
    total: String(inv.total),
    amountPaid: String(inv.amountPaid),
    balanceDue: String(inv.balanceDue),
    customerNotes: inv.customerNotes ?? null,
    termsAndConditions: inv.termsAndConditions ?? null,
    sentAt: inv.sentAt ? new Date(inv.sentAt) : null,
    paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
    voidedAt: inv.voidedAt ? new Date(inv.voidedAt) : null,
    createdAt: new Date(inv.createdAt),
    updatedAt: new Date(inv.updatedAt),
  };
}

// ===== CATALOG ITEMS =====

export function dbRowToCatalogItem(row: Record<string, unknown>): CatalogItem {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || null,
    type: (row.type as CatalogItem['type']) || 'service',
    rate: Number(row.rate) || 0,
    unit: (row.unit as string) || 'month',
    isActive: row.isActive as boolean,
    createdAt: row.createdAt instanceof Date ? (row.createdAt as Date).toISOString() : (row.createdAt as string),
    updatedAt: row.updatedAt instanceof Date ? (row.updatedAt as Date).toISOString() : (row.updatedAt as string),
  };
}

export function catalogItemToDbValues(item: CatalogItem) {
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? null,
    type: item.type,
    rate: String(item.rate),
    unit: item.unit,
    isActive: item.isActive,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

// ===== PAYMENTS RECEIVED =====

export function dbRowToPayment(row: Record<string, unknown>): PaymentReceived {
  return {
    id: row.id as string,
    paymentNumber: row.paymentNumber as string,
    clientId: row.clientId as string,
    invoiceId: row.invoiceId as string,
    date: row.date as string,
    amount: Number(row.amount) || 0,
    mode: (row.mode as PaymentReceived['mode']) || 'bank_transfer',
    referenceNumber: (row.referenceNumber as string) || null,
    status: (row.status as PaymentReceived['status']) || 'confirmed',
    notes: (row.notes as string) || null,
    createdAt: row.createdAt instanceof Date ? (row.createdAt as Date).toISOString() : (row.createdAt as string),
  };
}

export function paymentToDbValues(p: PaymentReceived) {
  return {
    id: p.id,
    paymentNumber: p.paymentNumber,
    clientId: p.clientId,
    invoiceId: p.invoiceId,
    date: p.date,
    amount: String(p.amount),
    mode: p.mode,
    referenceNumber: p.referenceNumber ?? null,
    status: p.status,
    notes: p.notes ?? null,
    createdAt: new Date(p.createdAt),
  };
}
