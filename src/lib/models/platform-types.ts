// ========== ZAVIS FINANCIAL PLATFORM v3.0 — CORE TYPES ==========

export type ClientStatus = 'active' | 'inactive';
export type PricingModel = 'per_seat' | 'flat_mrr' | 'one_time_only';

export const SALES_PARTNERS = [
  'Dr. Faisal',
  'Thousif',
  'Sagar',
  'Wasim',
  'Code Latis',
  'Cloudlink',
] as const;
export type SalesPartner = (typeof SALES_PARTNERS)[number];

export const STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
};

export const PRICING_MODEL_LABELS: Record<PricingModel, string> = {
  per_seat: 'Per Seat',
  flat_mrr: 'Flat MRR',
  one_time_only: 'One-Time Only',
};

// ========== ZAVIS PLANS ==========

export interface ZavisPlan {
  id: string;
  name: string;
  suggestedPerSeat: number | null; // AED per seat, null = manual
  pricingModel: PricingModel;
}

export const ZAVIS_PLANS: ZavisPlan[] = [
  { id: 'pro', name: 'Pro Plan', suggestedPerSeat: 225, pricingModel: 'per_seat' },
  { id: 'elite', name: 'Elite Plan', suggestedPerSeat: 249, pricingModel: 'per_seat' },
  { id: 'ultimate', name: 'Ultimate Plan', suggestedPerSeat: 269, pricingModel: 'per_seat' },
  { id: 'custom', name: 'Custom', suggestedPerSeat: null, pricingModel: 'flat_mrr' },
  { id: 'one_time', name: 'One-Time Only', suggestedPerSeat: null, pricingModel: 'one_time_only' },
];

// ========== CLIENT ==========

export interface BillingAddress {
  attention?: string;
  street1?: string;
  street2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
}

export interface Client {
  id: string;
  name: string;
  salesPartner: string | null;
  status: ClientStatus;
  pricingModel: PricingModel;
  perSeatCost: number | null;
  seatCount: number | null;
  billingCycle?: string | null;
  plan?: string | null;
  discount?: number | null;
  mrr: number;
  oneTimeRevenue: number;
  annualRunRate: number;
  onboardingDate: string | null;
  notes?: string;
  // Billing/invoice fields
  email?: string | null;
  phone?: string | null;
  companyLegalName?: string | null;
  trn?: string | null; // Tax Registration Number (UAE TRN)
  billingAddress?: BillingAddress | null;
  defaultTerms?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ========== RECEIVABLES ==========

export type ReceivableStatus = 'pending' | 'invoiced' | 'paid' | 'overdue';

export interface ReceivableEntry {
  id: string;
  clientId: string;
  month: string;
  amount: number;
  description: string;
  status: ReceivableStatus;
  dueDate?: string;
  paidDate?: string;
}

// ========== MONTHLY COSTS ==========

export type CostCategory = 'aws' | 'chatwoot_seats' | 'payroll' | 'sales_spend' | 'chatwoot_sub' | 'commissions';
export type CostType = 'actual' | 'projected';

export const COST_CATEGORY_LABELS: Record<CostCategory, string> = {
  aws: 'AWS Costs',
  chatwoot_seats: 'Chatwoot Seats',
  payroll: 'Payroll',
  sales_spend: 'Sales Spend',
  chatwoot_sub: 'Chatwoot Subscription',
  commissions: 'Monthly Commissions',
};

export interface MonthlyCost {
  id: string;
  month: string;
  category: CostCategory;
  amount: number;
  type: CostType;
  notes?: string;
  createdAt: string;
}

// ========== MONTHLY SNAPSHOTS ==========

export interface ClientSnapshotEntry {
  clientId: string;
  name: string;
  salesPartner: string | null;
  status: ClientStatus;
  mrr: number;
}

export interface MonthlySnapshot {
  month: string;
  capturedAt: string;
  totalMRR: number;
  totalARR: number;
  clientCount: number;
  mrrByPartner: Record<string, number>;
  clientsByPartner: Record<string, number>;
  totalOneTimeRevenue: number;
  newMRR: number;
  expansionMRR: number;
  contractionMRR: number;
  churnedMRR: number;
  netNewMRR: number;
  clientSnapshots: ClientSnapshotEntry[];
}

// ========== PRICING LAB ==========

export interface DealAnalysisSnapshot {
  customerName: string;
  summary: string;
  comparisonVerdict: string;
  riskCount: { low: number; medium: number; high: number };
  effectivePerSeatRate: number | null;
  recommendations: string[];
}

export interface PricingWhatIf {
  id: string;
  name: string;
  createdAt: string;
  modifiedPerSeatPrice: number;
  // Extended fields for contract-derived scenarios
  source?: 'manual' | 'contract_extraction';
  lineItemValues?: Record<string, number>;
  costOverrides?: Record<string, number>;
  dealAnalysis?: DealAnalysisSnapshot;
}

export interface WhatIfClientImpact {
  clientId: string;
  clientName: string;
  pricingModel: PricingModel;
  currentMRR: number;
  projectedMRR: number;
  delta: number;
  isAffected: boolean;
}

// ========== CONTRACT (NEW — Ontology) ==========

export type ContractStatus = 'active' | 'expired' | 'terminated';

export interface Contract {
  id: string;
  customerId: string;
  startDate: string;
  endDate?: string | null;
  billingCycle?: string | null;
  plan?: string | null;
  terms?: Record<string, unknown> | null;
  status: ContractStatus;
  createdAt: string;
}

// ========== REVENUE STREAM (NEW — Ontology) ==========

export type RevenueStreamType = 'subscription' | 'one_time' | 'add_on' | 'managed_service';
export type RevenueFrequency = 'monthly' | 'quarterly' | 'annual' | 'one_time';

export interface RevenueStream {
  id: string;
  contractId: string;
  type: RevenueStreamType;
  amount: number;
  frequency: RevenueFrequency;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
}

// ========== PARTNER (NEW — Ontology, promoted from config) ==========

export interface Partner {
  id: string;
  name: string;
  commissionPct: number;
  oneTimeCommissionPct: number;
  totalPaid: number;
  isActive: boolean;
  joinedDate?: string | null;
  createdAt: string;
}

// ========== CUSTOMER-PARTNER LINK (NEW — Ontology) ==========

export interface CustomerPartnerLink {
  id: string;
  customerId: string;
  partnerId: string;
  attributionPct: number; // default 100
  createdAt: string;
}

// ========== ACTION LOG (NEW — Ontology) ==========

export interface ActionMutationRecord {
  objectType: string;
  objectId: string;
  operation: 'create' | 'update' | 'delete';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface ActionLogEntry {
  id: string;
  actionType: string;
  actor: string;
  timestamp: string;
  inputs: Record<string, unknown>;
  mutations: ActionMutationRecord[];
  metadata?: Record<string, unknown>;
}

// ========== INVOICING ==========

export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'unpaid' | 'overdue' | 'paid' | 'void';

export type PaymentTerms = 'due_on_receipt' | 'net_14' | 'net_30' | 'net_45' | 'net_60' | 'due_end_of_month' | 'due_end_of_next_month';

export type InvoiceCurrency = 'AED' | 'USD' | 'INR' | 'GBP';

export type PaymentMode = 'bank_transfer' | 'cash' | 'cheque' | 'card' | 'other';

export type PaymentStatus = 'draft' | 'confirmed' | 'void';

export type ItemType = 'service' | 'product';

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  due_on_receipt: 'Due on Receipt',
  net_14: 'Net 14',
  net_30: 'Net 30',
  net_45: 'Net 45',
  net_60: 'Net 60',
  due_end_of_month: 'Due End of Month',
  due_end_of_next_month: 'Due End of Next Month',
};

export const PAYMENT_TERMS_DAYS: Record<PaymentTerms, number | null> = {
  due_on_receipt: 0,
  net_14: 14,
  net_30: 30,
  net_45: 45,
  net_60: 60,
  due_end_of_month: null, // calculated dynamically
  due_end_of_next_month: null,
};

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: '#9e9e9e',
  sent: '#2196f3',
  partially_paid: '#ff9800',
  unpaid: '#f44336',
  overdue: '#d32f2f',
  paid: '#00c853',
  void: '#757575',
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially Paid',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
  paid: 'Paid',
  void: 'Void',
};

export const CURRENCY_SYMBOLS: Record<InvoiceCurrency, string> = {
  AED: 'AED',
  USD: '$',
  INR: '₹',
  GBP: '£',
};

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  cheque: 'Cheque',
  card: 'Card',
  other: 'Other',
};

export interface InvoiceLineItem {
  id: string;
  itemId?: string; // FK to catalog_items (optional)
  revenueStreamId?: string; // FK to revenue_streams — links line item to the stream it bills for
  description: string;
  quantity: number;
  rate: number;
  discountType: 'percent' | 'flat';
  discountValue: number;
  amount: number; // calculated: qty * rate - discount
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  contractId?: string | null; // FK to contract — links invoice to the source contract
  receivableId?: string | null;
  currency: InvoiceCurrency;
  status: InvoiceStatus;
  invoiceDate: string;
  terms: PaymentTerms;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  customerNotes?: string | null;
  termsAndConditions?: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  voidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string | null;
  type: ItemType;
  rate: number;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentReceived {
  id: string;
  paymentNumber: string;
  clientId: string;
  invoiceId: string;
  date: string;
  amount: number;
  mode: PaymentMode;
  referenceNumber?: string | null;
  status: PaymentStatus;
  notes?: string | null;
  createdAt: string;
}

export interface CompanyConfig {
  name: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  logoText: string;
  defaultNotes: string;
  bankDetails: string;
}

// ========== DASHBOARD METRICS ==========

export interface DashboardMetrics {
  totalMRR: number;
  totalARR: number;
  activeClientCount: number;
  totalClients: number;
  totalOneTimeRevenue: number;
  avgRevenuePerClient: number;
  mrrByPartner: Record<string, number>;
  clientsByPartner: Record<string, number>;
  totalReceivables: number;
  receivablesPaid: number;
  receivablesPending: number;
  // Subscriber vs One-Time breakdown
  subscriberCount: number;
  activeSubscriberCount: number;
  oneTimeClientCount: number;
  activeOneTimeClientCount: number;
  avgMRRPerSubscriber: number;
  avgOneTimePerClient: number;
  totalSeats: number;
}
