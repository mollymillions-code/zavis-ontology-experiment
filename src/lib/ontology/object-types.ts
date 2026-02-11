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
  outgoingLinks: ['ContractGeneratesRevenue'],
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

// ───────── INVOICE (evolved from Receivable) ─────────
export const InvoiceObjectType: ObjectTypeDefinition = {
  typeName: 'Invoice',
  pluralName: 'Invoices',
  description: 'A receivable / invoice owed by a Customer. Evolved from the receivables table.',
  primaryKey: 'id',
  backedByTable: 'receivables',
  properties: [
    { name: 'id', type: 'string' },
    { name: 'clientId', type: 'string', description: 'FK to Customer' },
    { name: 'month', type: 'string' },
    { name: 'amount', type: 'number' },
    { name: 'description', type: 'string' },
    { name: 'status', type: 'string', description: 'pending | invoiced | paid | overdue' },
    { name: 'dueDate', type: 'date', nullable: true },
    { name: 'paidDate', type: 'date', nullable: true },
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
    { name: 'type', type: 'string', description: 'actual | projected' },
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
  CostEntry: CostEntryObjectType,
  Snapshot: SnapshotObjectType,
  PricingScenario: PricingScenarioObjectType,
} as const;

export type ObjectTypeName = keyof typeof OBJECT_TYPES;
