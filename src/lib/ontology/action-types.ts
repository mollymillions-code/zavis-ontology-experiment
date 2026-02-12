// ========== PALANTIR ONTOLOGY — ACTION TYPE DEFINITIONS ==========
// Each Action is an atomic, auditable mutation. Every write goes through an Action.
// Actions validate inputs, execute mutations, and log to the immutable audit trail.

export interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'json';
  required: boolean;
  description?: string;
}

export interface ActionMutation {
  objectType: string;
  operation: 'create' | 'update' | 'delete';
  description: string;
}

export interface ActionSideEffect {
  description: string;
  /** Describes what happens after the core mutations */
  trigger: string;
}

export interface ActionTypeDefinition {
  actionName: string;
  description: string;
  parameters: ActionParameter[];
  mutations: ActionMutation[];
  sideEffects: ActionSideEffect[];
}

// ───────── SignNewCustomer ─────────
export const SignNewCustomer: ActionTypeDefinition = {
  actionName: 'SignNewCustomer',
  description: 'Onboard a new customer with a contract and initial revenue streams.',
  parameters: [
    { name: 'name', type: 'string', required: true },
    { name: 'partnerId', type: 'string', required: false, description: 'Sales partner ID (if referred)' },
    { name: 'pricingModel', type: 'string', required: true, description: 'per_seat | flat_mrr | one_time_only' },
    { name: 'plan', type: 'string', required: false },
    { name: 'perSeatCost', type: 'number', required: false },
    { name: 'seatCount', type: 'number', required: false },
    { name: 'mrr', type: 'number', required: false, description: 'Subscription amount (monthly)' },
    { name: 'oneTimeRevenue', type: 'number', required: false, description: 'One-time revenue amount' },
    { name: 'billingCycle', type: 'string', required: false },
    { name: 'onboardingDate', type: 'date', required: false },
    { name: 'notes', type: 'string', required: false },
  ],
  mutations: [
    { objectType: 'Customer', operation: 'create', description: 'Create new Customer record' },
    { objectType: 'Contract', operation: 'create', description: 'Create initial Contract for this customer' },
    { objectType: 'RevenueStream', operation: 'create', description: 'Create RevenueStream(s) from MRR and one-time amounts' },
    { objectType: 'CustomerPartnerLink', operation: 'create', description: 'Link customer to partner (if partnerId provided)' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
    { description: 'Recalculate platform metrics', trigger: 'always' },
  ],
};

// ───────── UpdateCustomerPricing ─────────
export const UpdateCustomerPricing: ActionTypeDefinition = {
  actionName: 'UpdateCustomerPricing',
  description: 'Change pricing for an existing customer. Updates the relevant RevenueStream.',
  parameters: [
    { name: 'customerId', type: 'string', required: true },
    { name: 'newAmount', type: 'number', required: true, description: 'New monthly amount' },
    { name: 'reason', type: 'string', required: false, description: 'Reason for price change' },
  ],
  mutations: [
    { objectType: 'RevenueStream', operation: 'update', description: 'Update subscription RevenueStream amount' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail with reason', trigger: 'always' },
    { description: 'Recalculate customer MRR (derived property)', trigger: 'always' },
  ],
};

// ───────── ProcessChurn ─────────
export const ProcessChurn: ActionTypeDefinition = {
  actionName: 'ProcessChurn',
  description: 'Mark a customer as churned (inactive). End their contract(s).',
  parameters: [
    { name: 'customerId', type: 'string', required: true },
    { name: 'reason', type: 'string', required: false },
    { name: 'effectiveDate', type: 'date', required: true },
  ],
  mutations: [
    { objectType: 'Customer', operation: 'update', description: 'Set status = inactive' },
    { objectType: 'Contract', operation: 'update', description: 'Set status = terminated, endDate = effectiveDate' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
    { description: 'Update snapshot waterfall churnedMRR', trigger: 'always' },
  ],
};

// ───────── CreateInvoice ─────────
export const CreateInvoice: ActionTypeDefinition = {
  actionName: 'CreateInvoice',
  description: 'Create a new invoice for a customer with line items.',
  parameters: [
    { name: 'invoiceId', type: 'string', required: true },
    { name: 'invoiceNumber', type: 'string', required: true },
    { name: 'clientId', type: 'string', required: true },
    { name: 'total', type: 'number', required: true },
    { name: 'currency', type: 'string', required: false },
    { name: 'lineItemCount', type: 'number', required: false },
  ],
  mutations: [
    { objectType: 'Invoice', operation: 'create', description: 'Create Invoice with line items' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
  ],
};

// ───────── SendInvoice ─────────
export const SendInvoice: ActionTypeDefinition = {
  actionName: 'SendInvoice',
  description: 'Mark an invoice as sent to the customer.',
  parameters: [
    { name: 'invoiceId', type: 'string', required: true },
    { name: 'invoiceNumber', type: 'string', required: true },
    { name: 'sentTo', type: 'string', required: false, description: 'Email address' },
  ],
  mutations: [
    { objectType: 'Invoice', operation: 'update', description: 'Set status = sent, sentAt = now' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
  ],
};

// ───────── RecordPayment ─────────
export const RecordPayment: ActionTypeDefinition = {
  actionName: 'RecordPayment',
  description: 'Record a payment against an invoice. Updates invoice amountPaid and balanceDue.',
  parameters: [
    { name: 'paymentId', type: 'string', required: true },
    { name: 'paymentNumber', type: 'string', required: true },
    { name: 'invoiceId', type: 'string', required: true },
    { name: 'amount', type: 'number', required: true },
    { name: 'mode', type: 'string', required: false },
  ],
  mutations: [
    { objectType: 'PaymentReceived', operation: 'create', description: 'Create payment record' },
    { objectType: 'Invoice', operation: 'update', description: 'Update amountPaid, balanceDue, status' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
  ],
};

// ───────── VoidInvoice ─────────
export const VoidInvoice: ActionTypeDefinition = {
  actionName: 'VoidInvoice',
  description: 'Void an invoice. Cannot be undone.',
  parameters: [
    { name: 'invoiceId', type: 'string', required: true },
    { name: 'invoiceNumber', type: 'string', required: true },
  ],
  mutations: [
    { objectType: 'Invoice', operation: 'update', description: 'Set status = void, voidedAt = now' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
  ],
};

// ───────── CaptureSnapshot ─────────
export const CaptureSnapshot: ActionTypeDefinition = {
  actionName: 'CaptureSnapshot',
  description: 'Capture a monthly snapshot of platform metrics from live data.',
  parameters: [
    { name: 'month', type: 'string', required: true, description: 'YYYY-MM format' },
  ],
  mutations: [
    { objectType: 'Snapshot', operation: 'create', description: 'Create or upsert monthly snapshot from derived metrics' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
  ],
};

// ───────── AssignPartner ─────────
export const AssignPartner: ActionTypeDefinition = {
  actionName: 'AssignPartner',
  description: 'Assign or reassign a sales partner to a customer.',
  parameters: [
    { name: 'customerId', type: 'string', required: true },
    { name: 'partnerId', type: 'string', required: true },
    { name: 'attributionPct', type: 'number', required: false, description: 'Revenue attribution % (default 100)' },
  ],
  mutations: [
    { objectType: 'CustomerPartnerLink', operation: 'create', description: 'Create/update link between customer and partner' },
  ],
  sideEffects: [
    { description: 'Log action to audit trail', trigger: 'always' },
    { description: 'Recalculate partner commissions', trigger: 'always' },
  ],
};

// ═══════ REGISTRY MAP ═══════
export const ACTION_TYPES = {
  SignNewCustomer,
  UpdateCustomerPricing,
  ProcessChurn,
  CreateInvoice,
  SendInvoice,
  RecordPayment,
  VoidInvoice,
  CaptureSnapshot,
  AssignPartner,
} as const;

export type ActionTypeName = keyof typeof ACTION_TYPES;
