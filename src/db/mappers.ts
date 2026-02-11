import type {
  Client,
  ReceivableEntry,
  MonthlySnapshot,
  PricingWhatIf,
  MonthlyCost,
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
  return {
    id: row.id as string,
    name: row.name as string,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).toISOString()
      : (row.createdAt as string),
    modifiedPerSeatPrice: Number(row.modifiedPerSeatPrice) || 0,
  };
}

export function whatIfToDbValues(w: PricingWhatIf) {
  return {
    id: w.id,
    name: w.name,
    modifiedPerSeatPrice: String(w.modifiedPerSeatPrice),
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
