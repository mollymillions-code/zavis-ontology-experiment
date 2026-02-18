// ========== PALANTIR ONTOLOGY — OBJECT TYPE DEFINITIONS ==========
// Each Object Type defines:
//   - properties (stored columns)
//   - derivedProperties (computed from links / aggregation)
//   - linkTypes (outgoing edges from this object)

export interface ObjectTypeProperty {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  nullable?: boolean;
  description?: string;
}

export interface DerivedProperty {
  name: string;
  type: 'number' | 'string' | 'boolean';
  description: string;
  /** How the value is computed — e.g. 'SUM(linked:RevenueStream.amount)' */
  expression: string;
}

export interface ObjectTypeDefinition {
  typeName: string;
  pluralName: string;
  description: string;
  primaryKey: string;
  backedByTable: string;
  properties: ObjectTypeProperty[];
  derivedProperties: DerivedProperty[];
  outgoingLinks: string[]; // link type names
}

// ───────── CUSTOMER ─────────
export const CustomerObjectType: ObjectTypeDefinition = {
  typeName: 'Customer',
  pluralName: 'Customers',
  description: 'A Zavis client (healthcare provider). Revenue is now derived from linked RevenueStream objects.',
  primaryKey: 'id',
  backedByTable: 'clients',
  properties: [
    { name: 'id', type: 'string', description: 'UUID' },
    { name: 'name', type: 'string', description: 'Display name' },
    { name: 'status', type: 'string', description: 'active | inactive' },
    { name: 'pricingModel', type: 'string', description: 'per_seat | flat_mrr | one_time_only' },
    { name: 'perSeatCost', type: 'number', nullable: true },
    { name: 'seatCount', type: 'number', nullable: true },
    { name: 'billingCycle', type: 'string', nullable: true },
    { name: 'plan', type: 'string', nullable: true },
    { name: 'discount', type: 'number', nullable: true },
    { name: 'onboardingDate', type: 'date', nullable: true },
    { name: 'notes', type: 'string', nullable: true },
    { name: 'createdAt', type: 'date' },
    { name: 'updatedAt', type: 'date' },
  ],
  derivedProperties: [
    {
      name: 'mrr',
      type: 'number',
      description: 'Monthly Recurring Revenue — sum of linked subscription RevenueStreams',
      expression: "SUM(linked:ContractGeneratesRevenue.amount WHERE type='subscription' AND frequency='monthly')",
    },
    {
      name: 'oneTimeRevenue',
      type: 'number',
      description: 'Total one-time revenue — sum of linked one_time RevenueStreams',
      expression: "SUM(linked:ContractGeneratesRevenue.amount WHERE type='one_time')",
    },
    {
      name: 'annualRunRate',
      type: 'number',
      description: 'MRR * 12',
      expression: 'derived:mrr * 12',
    },
    {
      name: 'concentrationPct',
      type: 'number',
      description: 'This customer MRR as % of total platform MRR',
      expression: 'derived:mrr / GLOBAL(totalMRR) * 100',
    },
    {
      name: 'riskFlag',
      type: 'boolean',
      description: 'True if concentrationPct > 20',
      expression: 'derived:concentrationPct > 20',
    },
  ],
  outgoingLinks: [
    'CustomerRepresentedBy',
    'CustomerHasContract',
    'CustomerOwesInvoice',
  ],
};

// ───────── SALES PARTNER ─────────
export const SalesPartnerObjectType: ObjectTypeDefinition = {
  typeName: 'SalesPartner',
  pluralName: 'SalesPartners',
  description: 'A sales partner / referral agent. Promoted from config to a first-class DB entity.',
  primaryKey: 'id',
  backedByTable: 'partners',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'commissionPct', type: 'number', description: 'MRR commission %' },
    { name: 'oneTimeCommissionPct', type: 'number', description: 'One-time commission %' },
    { name: 'totalPaid', type: 'number', description: 'Total commissions paid to date (AED)' },
    { name: 'isActive', type: 'boolean' },
    { name: 'joinedDate', type: 'date', nullable: true },
    { name: 'createdAt', type: 'date' },
  ],
  derivedProperties: [
    {
      name: 'totalAttributedMRR',
      type: 'number',
      description: 'Sum of MRR from all linked customers',
      expression: 'SUM(linked:CustomerRepresentedBy[reverse].derived:mrr)',
    },
    {
      name: 'customerCount',
      type: 'number',
      description: 'Number of linked customers',
      expression: 'COUNT(linked:CustomerRepresentedBy[reverse])',
    },
    {
      name: 'monthlyCommissionOwed',
      type: 'number',
      description: 'totalAttributedMRR * commissionPct / 100',
      expression: 'derived:totalAttributedMRR * property:commissionPct / 100',
    },
  ],
  outgoingLinks: ['PartnerEarnsCommission'],
};

// ───────── CONTRACT ─────────
export const ContractObjectType: ObjectTypeDefinition = {
  typeName: 'Contract',
  pluralName: 'Contracts',
  description: 'A binding agreement between Zavis and a Customer.',
  primaryKey: 'id',
  backedByTable: 'contracts',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'customerId', type: 'string', description: 'FK to Customer' },
    { name: 'startDate', type: 'date' },
    { name: 'endDate', type: 'date', nullable: true },
    { name: 'billingCycle', type: 'string', nullable: true },
    { name: 'plan', type: 'string', nullable: true },
    { name: 'terms', type: 'json', nullable: true },
    { name: 'status', type: 'string', description: 'active | expired | terminated' },
    { name: 'createdAt', type: 'date' },
  ],
  derivedProperties: [
    {
      name: 'totalMonthlyValue',
      type: 'number',
      description: 'Sum of monthly RevenueStreams under this contract',
      expression: "SUM(linked:ContractGeneratesRevenue.amount WHERE frequency='monthly')",
    },
    {
      name: 'totalOneTimeValue',
      type: 'number',
      description: 'Sum of one-time RevenueStreams under this contract',
      expression: "SUM(linked:ContractGeneratesRevenue.amount WHERE frequency='one_time')",
    },
  ],
  outgoingLinks: ['ContractGeneratesRevenue', 'ContractBilledByInvoice'],
};

// ───────── REVENUE STREAM ─────────
export const RevenueStreamObjectType: ObjectTypeDefinition = {
  typeName: 'RevenueStream',
  pluralName: 'RevenueStreams',
  description: 'A single line of revenue (subscription, one-time, add-on, managed service). Replaces embedded mrr/oneTimeRevenue on the client row.',
  primaryKey: 'id',
  backedByTable: 'revenue_streams',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'contractId', type: 'string', description: 'FK to Contract' },
    { name: 'type', type: 'string', description: 'subscription | one_time | add_on | managed_service' },
    { name: 'amount', type: 'number', description: 'AED amount' },
    { name: 'frequency', type: 'string', description: 'monthly | quarterly | annual | one_time' },
    { name: 'startDate', type: 'date', nullable: true },
    { name: 'endDate', type: 'date', nullable: true },
    { name: 'createdAt', type: 'date' },
  ],
  derivedProperties: [],
  outgoingLinks: [],
};

// ───────── INVOICE ─────────
export const InvoiceObjectType: ObjectTypeDefinition = {
  typeName: 'Invoice',
  pluralName: 'Invoices',
  description: 'A tax invoice issued to a Customer. Tracks line items, payments, and aging.',
  primaryKey: 'id',
  backedByTable: 'invoices',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'invoiceNumber', type: 'string', description: 'INV-000XXX' },
    { name: 'clientId', type: 'string', description: 'FK to Customer' },
    { name: 'contractId', type: 'string', nullable: true, description: 'FK to Contract — source contract for this invoice' },
    { name: 'receivableId', type: 'string', nullable: true, description: 'Link to legacy receivable' },
    { name: 'currency', type: 'string', description: 'AED | USD | INR | GBP' },
    { name: 'status', type: 'string', description: 'draft | sent | partially_paid | unpaid | overdue | paid | void' },
    { name: 'invoiceDate', type: 'date' },
    { name: 'terms', type: 'string', description: 'Payment terms (net_30, etc.)' },
    { name: 'dueDate', type: 'date' },
    { name: 'lineItems', type: 'json', description: 'InvoiceLineItem[]' },
    { name: 'subtotal', type: 'number' },
    { name: 'total', type: 'number' },
    { name: 'amountPaid', type: 'number' },
    { name: 'balanceDue', type: 'number' },
    { name: 'customerNotes', type: 'string', nullable: true },
    { name: 'termsAndConditions', type: 'string', nullable: true },
    { name: 'sentAt', type: 'date', nullable: true },
    { name: 'paidAt', type: 'date', nullable: true },
    { name: 'voidedAt', type: 'date', nullable: true },
    { name: 'createdAt', type: 'date' },
    { name: 'updatedAt', type: 'date' },
  ],
  derivedProperties: [],
  outgoingLinks: ['InvoiceHasPayment'],
};

// ───────── CATALOG ITEM ─────────
export const CatalogItemObjectType: ObjectTypeDefinition = {
  typeName: 'CatalogItem',
  pluralName: 'CatalogItems',
  description: 'A product or service in the Zavis catalog, used as line items on invoices.',
  primaryKey: 'id',
  backedByTable: 'catalog_items',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'description', type: 'string', nullable: true },
    { name: 'type', type: 'string', description: 'service | product' },
    { name: 'rate', type: 'number', description: 'Default selling price (AED)' },
    { name: 'unit', type: 'string', description: 'seat | month | project | etc.' },
    { name: 'isActive', type: 'boolean' },
    { name: 'createdAt', type: 'date' },
    { name: 'updatedAt', type: 'date' },
  ],
  derivedProperties: [],
  outgoingLinks: [],
};

// ───────── PAYMENT RECEIVED ─────────
export const PaymentReceivedObjectType: ObjectTypeDefinition = {
  typeName: 'PaymentReceived',
  pluralName: 'PaymentsReceived',
  description: 'A payment recorded against an Invoice. Updates invoice balance on creation.',
  primaryKey: 'id',
  backedByTable: 'payments_received',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'paymentNumber', type: 'string', description: 'PAY-000XXX' },
    { name: 'clientId', type: 'string', description: 'FK to Customer' },
    { name: 'invoiceId', type: 'string', description: 'FK to Invoice' },
    { name: 'date', type: 'date' },
    { name: 'amount', type: 'number' },
    { name: 'mode', type: 'string', description: 'bank_transfer | cash | cheque | card | other' },
    { name: 'referenceNumber', type: 'string', nullable: true },
    { name: 'status', type: 'string', description: 'draft | confirmed | void' },
    { name: 'notes', type: 'string', nullable: true },
    { name: 'createdAt', type: 'date' },
  ],
  derivedProperties: [],
  outgoingLinks: [],
};

// ───────── COST ENTRY ─────────
export const CostEntryObjectType: ObjectTypeDefinition = {
  typeName: 'CostEntry',
  pluralName: 'CostEntries',
  description: 'A monthly cost entry (AWS, payroll, commissions, etc.).',
  primaryKey: 'id',
  backedByTable: 'monthly_costs',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'month', type: 'string' },
    { name: 'category', type: 'string' },
    { name: 'amount', type: 'number' },
    { name: 'type', type: 'string', description: 'actual' },
    { name: 'notes', type: 'string', nullable: true },
    { name: 'createdAt', type: 'date' },
  ],
  derivedProperties: [],
  outgoingLinks: [],
};

// ───────── SNAPSHOT ─────────
export const SnapshotObjectType: ObjectTypeDefinition = {
  typeName: 'Snapshot',
  pluralName: 'Snapshots',
  description: 'A point-in-time capture of platform metrics.',
  primaryKey: 'month',
  backedByTable: 'monthly_snapshots',
  properties: [
    { name: 'month', type: 'string' },
    { name: 'capturedAt', type: 'date' },
    { name: 'data', type: 'json', description: 'Full snapshot metrics blob' },
  ],
  derivedProperties: [],
  outgoingLinks: [],
};

// ───────── PRICING SCENARIO ─────────
export const PricingScenarioObjectType: ObjectTypeDefinition = {
  typeName: 'PricingScenario',
  pluralName: 'PricingScenarios',
  description: 'A what-if pricing scenario for price sensitivity analysis.',
  primaryKey: 'id',
  backedByTable: 'whatif_scenarios',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'modifiedPerSeatPrice', type: 'number' },
    { name: 'createdAt', type: 'date' },
  ],
  derivedProperties: [],
  outgoingLinks: [],
};

// ═══════ REGISTRY MAP ═══════
export const OBJECT_TYPES = {
  Customer: CustomerObjectType,
  SalesPartner: SalesPartnerObjectType,
  Contract: ContractObjectType,
  RevenueStream: RevenueStreamObjectType,
  Invoice: InvoiceObjectType,
  CatalogItem: CatalogItemObjectType,
  PaymentReceived: PaymentReceivedObjectType,
  CostEntry: CostEntryObjectType,
  Snapshot: SnapshotObjectType,
  PricingScenario: PricingScenarioObjectType,
} as const;

export type ObjectTypeName = keyof typeof OBJECT_TYPES;
