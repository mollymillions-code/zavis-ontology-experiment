// ========== PALANTIR ONTOLOGY — LINK TYPE DEFINITIONS ==========
// Each Link Type defines an explicit typed relationship between two Object Types.
// Replaces implicit FK joins and text-field references.

export type Cardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export interface LinkTypeDefinition {
  linkName: string;
  description: string;
  sourceObjectType: string;
  targetObjectType: string;
  cardinality: Cardinality;
  /** How this link is persisted — FK column, join table, or computed */
  storage:
    | { kind: 'fk'; table: string; column: string }
    | { kind: 'join_table'; table: string; sourceColumn: string; targetColumn: string }
    | { kind: 'computed'; expression: string };
  /** What this link replaced from the old schema */
  replaces?: string;
}

// ───────── CustomerRepresentedBy ─────────
// Customer → SalesPartner (many-to-one, via join table for attribution %)
export const CustomerRepresentedBy: LinkTypeDefinition = {
  linkName: 'CustomerRepresentedBy',
  description: 'Links a Customer to their Sales Partner with attribution percentage.',
  sourceObjectType: 'Customer',
  targetObjectType: 'SalesPartner',
  cardinality: 'many-to-one',
  storage: {
    kind: 'join_table',
    table: 'customer_partner_links',
    sourceColumn: 'customer_id',
    targetColumn: 'partner_id',
  },
  replaces: "clients.sales_partner text field",
};

// ───────── CustomerHasContract ─────────
// Customer → Contract (one-to-many)
export const CustomerHasContract: LinkTypeDefinition = {
  linkName: 'CustomerHasContract',
  description: 'Links a Customer to their Contracts. A customer may have multiple contracts over time.',
  sourceObjectType: 'Customer',
  targetObjectType: 'Contract',
  cardinality: 'one-to-many',
  storage: {
    kind: 'fk',
    table: 'contracts',
    column: 'customer_id',
  },
  replaces: 'New — contracts were implicit in the old schema',
};

// ───────── ContractGeneratesRevenue ─────────
// Contract → RevenueStream (one-to-many)
export const ContractGeneratesRevenue: LinkTypeDefinition = {
  linkName: 'ContractGeneratesRevenue',
  description: 'Links a Contract to its Revenue Streams. Each contract may have subscription + one-time + add-on streams.',
  sourceObjectType: 'Contract',
  targetObjectType: 'RevenueStream',
  cardinality: 'one-to-many',
  storage: {
    kind: 'fk',
    table: 'revenue_streams',
    column: 'contract_id',
  },
  replaces: 'clients.mrr + clients.one_time_revenue embedded fields',
};

// ───────── ContractBilledByInvoice ─────────
// Contract → Invoice (one-to-many)
export const ContractBilledByInvoice: LinkTypeDefinition = {
  linkName: 'ContractBilledByInvoice',
  description: 'Links a Contract to Invoices generated from it. Closes the contract-to-cash loop.',
  sourceObjectType: 'Contract',
  targetObjectType: 'Invoice',
  cardinality: 'one-to-many',
  storage: {
    kind: 'fk',
    table: 'invoices',
    column: 'contract_id',
  },
};

// ───────── CustomerOwesInvoice ─────────
// Customer → Invoice (one-to-many)
export const CustomerOwesInvoice: LinkTypeDefinition = {
  linkName: 'CustomerOwesInvoice',
  description: 'Links a Customer to their Invoices.',
  sourceObjectType: 'Customer',
  targetObjectType: 'Invoice',
  cardinality: 'one-to-many',
  storage: {
    kind: 'fk',
    table: 'invoices',
    column: 'client_id',
  },
  replaces: 'receivables.client_id FK → invoices.client_id FK',
};

// ───────── InvoiceHasPayment ─────────
// Invoice → PaymentReceived (one-to-many)
export const InvoiceHasPayment: LinkTypeDefinition = {
  linkName: 'InvoiceHasPayment',
  description: 'Links an Invoice to its PaymentReceived records. Payments reduce balanceDue.',
  sourceObjectType: 'Invoice',
  targetObjectType: 'PaymentReceived',
  cardinality: 'one-to-many',
  storage: {
    kind: 'fk',
    table: 'payments_received',
    column: 'invoice_id',
  },
};

// ───────── PartnerEarnsCommission ─────────
// SalesPartner → RevenueStream (many-to-many, computed via customer links)
export const PartnerEarnsCommission: LinkTypeDefinition = {
  linkName: 'PartnerEarnsCommission',
  description: 'Computed link: partner earns commission on revenue streams of their customers.',
  sourceObjectType: 'SalesPartner',
  targetObjectType: 'RevenueStream',
  cardinality: 'many-to-many',
  storage: {
    kind: 'computed',
    expression: 'SalesPartner → CustomerRepresentedBy[reverse] → CustomerHasContract → ContractGeneratesRevenue',
  },
  replaces: 'Computed in client-side utility code',
};

// ═══════ REGISTRY MAP ═══════
export const LINK_TYPES = {
  CustomerRepresentedBy,
  CustomerHasContract,
  ContractGeneratesRevenue,
  ContractBilledByInvoice,
  CustomerOwesInvoice,
  InvoiceHasPayment,
  PartnerEarnsCommission,
} as const;

export type LinkTypeName = keyof typeof LINK_TYPES;
