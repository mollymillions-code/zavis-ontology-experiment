import { pgTable, text, numeric, jsonb, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

// ===== CLIENTS =====
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  salesPartner: text('sales_partner'),
  status: text('status').notNull().default('active'),
  pricingModel: text('pricing_model').notNull().default('per_seat'),
  perSeatCost: numeric('per_seat_cost', { precision: 10, scale: 2 }),
  seatCount: integer('seat_count'),
  billingCycle: text('billing_cycle'),
  plan: text('plan'),
  discount: numeric('discount', { precision: 5, scale: 2 }).default('0'),
  mrr: numeric('mrr', { precision: 10, scale: 2 }).notNull().default('0'),
  oneTimeRevenue: numeric('one_time_revenue', { precision: 10, scale: 2 }).notNull().default('0'),
  annualRunRate: numeric('annual_run_rate', { precision: 10, scale: 2 }).notNull().default('0'),
  onboardingDate: text('onboarding_date'),
  notes: text('notes'),
  // Billing/invoice fields
  email: text('email'),
  phone: text('phone'),
  companyLegalName: text('company_legal_name'),
  trn: text('trn'), // Tax Registration Number (UAE TRN)
  billingAddress: jsonb('billing_address'), // { attention, street1, street2, city, state, country, zip }
  billingPhases: jsonb('billing_phases'), // BillingPhase[] — phased billing schedules
  defaultTerms: text('default_terms'), // PaymentTerms for this client
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== RECEIVABLES =====
export const receivables = pgTable('receivables', {
  id: text('id').primaryKey(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('pending'),
});

// ===== MONTHLY SNAPSHOTS =====
export const monthlySnapshots = pgTable('monthly_snapshots', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  month: text('month').notNull().unique(),
  capturedAt: timestamp('captured_at', { withTimezone: true }).notNull().defaultNow(),
  data: jsonb('data').notNull(),
});

// ===== WHAT-IF SCENARIOS =====
export const whatifScenarios = pgTable('whatif_scenarios', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  modifiedPerSeatPrice: numeric('modified_per_seat_price', { precision: 10, scale: 2 }).notNull(),
  scenarioData: jsonb('scenario_data'), // Extended: source, lineItemValues, costOverrides, dealAnalysis
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== MONTHLY COSTS =====
export const monthlyCosts = pgTable('monthly_costs', {
  id: text('id').primaryKey(),
  month: text('month').notNull(),
  category: text('category').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  type: text('type').notNull().default('actual'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════
// ONTOLOGY TABLES (Palantir-inspired entity/link/action model)
// ═══════════════════════════════════════════════════════════

// ===== PARTNERS (promoted from config → first-class entity) =====
export const partners = pgTable('partners', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  commissionPct: numeric('commission_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  oneTimeCommissionPct: numeric('one_time_commission_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  totalPaid: numeric('total_paid', { precision: 10, scale: 2 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  joinedDate: text('joined_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== CONTRACTS (new — binds Customer to terms) =====
export const contracts = pgTable('contracts', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  billingCycle: text('billing_cycle'),
  plan: text('plan'),
  terms: jsonb('terms'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== REVENUE STREAMS (new — replaces embedded mrr/oneTimeRevenue) =====
export const revenueStreams = pgTable('revenue_streams', {
  id: text('id').primaryKey(),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'subscription' | 'one_time' | 'add_on' | 'managed_service'
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  frequency: text('frequency'), // 'monthly' | 'quarterly' | 'annual' | 'one_time'
  startDate: text('start_date'),
  endDate: text('end_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== CUSTOMER-PARTNER LINKS (explicit typed relationship) =====
export const customerPartnerLinks = pgTable('customer_partner_links', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  partnerId: text('partner_id').notNull().references(() => partners.id, { onDelete: 'cascade' }),
  attributionPct: numeric('attribution_pct', { precision: 5, scale: 2 }).notNull().default('100'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== ACTION LOG (immutable audit trail) =====
export const actionLog = pgTable('action_log', {
  id: text('id').primaryKey(),
  actionType: text('action_type').notNull(),
  actor: text('actor').notNull().default('system'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  inputs: jsonb('inputs').notNull(),
  mutations: jsonb('mutations').notNull(),
  metadata: jsonb('metadata'),
});

// ===== DOCUMENTS (S3-stored contract PDFs and files) =====
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  entityType: text('entity_type').notNull(), // 'client' | 'partner'
  entityId: text('entity_id').notNull(), // FK to clients.id or partners.id
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  mimeType: text('mime_type').notNull(),
  s3Key: text('s3_key').notNull(), // S3 object key
  documentType: text('document_type').notNull().default('contract'), // 'contract' | 'agreement' | 'other'
  extractionData: jsonb('extraction_data'), // LLM extraction result (if extracted)
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════
// INVOICING TABLES
// ═══════════════════════════════════════════════════════════

// ===== INVOICES =====
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  contractId: text('contract_id'), // optional link to source contract
  receivableId: text('receivable_id'), // optional link to receivable
  currency: text('currency').notNull().default('AED'),
  status: text('status').notNull().default('draft'), // draft/sent/partially_paid/unpaid/overdue/paid/void
  invoiceDate: text('invoice_date').notNull(),
  terms: text('terms').notNull().default('net_30'),
  dueDate: text('due_date').notNull(),
  lineItems: jsonb('line_items').notNull(), // InvoiceLineItem[]
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 10, scale: 2 }).notNull().default('0'),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull().default('0'),
  balanceDue: numeric('balance_due', { precision: 10, scale: 2 }).notNull().default('0'),
  customerNotes: text('customer_notes'),
  termsAndConditions: text('terms_and_conditions'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  voidedAt: timestamp('voided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== CATALOG ITEMS =====
export const catalogItems = pgTable('catalog_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull().default('service'), // service/product
  rate: numeric('rate', { precision: 10, scale: 2 }).notNull(),
  unit: text('unit').notNull().default('month'), // seat, month, project, etc
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== PAYMENTS RECEIVED =====
export const paymentsReceived = pgTable('payments_received', {
  id: text('id').primaryKey(),
  paymentNumber: text('payment_number').notNull().unique(),
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'restrict' }),
  date: text('date').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  mode: text('mode').notNull().default('bank_transfer'), // bank_transfer/cash/cheque/card/other
  referenceNumber: text('reference_number'),
  status: text('status').notNull().default('confirmed'), // draft/confirmed/void
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ═══════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// ===== SEQUENCES (auto-increment for invoice/payment numbers) =====
export const sequences = pgTable('sequences', {
  name: text('name').primaryKey(), // 'invoice' or 'payment'
  currentValue: integer('current_value').notNull().default(0),
});

// ═══════════════════════════════════════════════════════════
// PAYROLL
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// SALES GOALS
// ═══════════════════════════════════════════════════════════

export const salesGoals = pgTable('sales_goals', {
  id: text('id').primaryKey().default('active'),
  targetClients: integer('target_clients').notNull().default(50),
  targetYear: integer('target_year').notNull().default(2026),
  startMonth: text('start_month').notNull().default('2026-02'),
  endMonth: text('end_month').notNull().default('2026-12'),
  monthlyOverrides: jsonb('monthly_overrides').default({}),
  notes: text('notes'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: text('updated_by'),
});

export const payrollEntries = pgTable('payroll_entries', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  monthlySalary: numeric('monthly_salary', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
