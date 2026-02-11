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

export interface PricingWhatIf {
  id: string;
  name: string;
  createdAt: string;
  modifiedPerSeatPrice: number;
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
