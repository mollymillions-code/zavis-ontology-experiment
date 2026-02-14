import type { Client } from '../models/platform-types';

// ========== UNIT ASSUMPTIONS ==========

export interface UnitAssumptions {
  // Direct per-seat costs (tied to specific revenue streams)
  platformLicensePerSeat: number;  // Chat/Root platform license per seat (AED)
  aiApiCostRate: number;           // % of AI revenue → API provider fees

  // Shared costs (monthly totals, allocated across all seats)
  serverHosting: number;           // Total monthly hosting (AED)
  engineering: number;             // Engineering team allocation (AED)
  softwareTools: number;           // SaaS tool subscriptions (AED)

  // Per-client costs
  accountMgmtPerClient: number;    // Support/ops per client per month (AED)
  partnerCommissionRate: number;   // % of partner-referred revenue

  // Revenue per seat (configurable future streams)
  aiAgentRevPerSeat: number;       // AI feature revenue per seat (AED)
  addOnRevPerSeat: number;         // Add-on revenue per seat (AED)
}

export const DEFAULT_ASSUMPTIONS: UnitAssumptions = {
  platformLicensePerSeat: 48,
  aiApiCostRate: 0.60,
  serverHosting: 800,
  engineering: 500,
  softwareTools: 300,
  accountMgmtPerClient: 100,
  partnerCommissionRate: 0.10,
  aiAgentRevPerSeat: 0,
  addOnRevPerSeat: 0,
};

// ========== UNIT ECONOMICS (PER-SEAT) ==========

export interface UnitEconomics {
  // Revenue per seat
  subscriptionPerSeat: number;
  aiRevenuePerSeat: number;
  addOnPerSeat: number;
  totalRevenuePerSeat: number;

  // Direct costs per seat (paired with revenue)
  platformLicensePerSeat: number;
  aiApiCostPerSeat: number;
  totalDirectCostPerSeat: number;

  // Shared costs per seat (allocated)
  serverPerSeat: number;
  engineeringPerSeat: number;
  softwarePerSeat: number;
  accountMgmtPerSeat: number;
  commissionPerSeat: number;
  totalSharedCostPerSeat: number;

  // Bottom line
  totalCostPerSeat: number;
  contributionPerSeat: number;
  marginPercent: number;

  // Context
  totalSeats: number;
  activeClients: number;
  avgPerSeatPrice: number;
  totalMRR: number;
}

export function computeUnitEconomics(clients: Client[], a: UnitAssumptions): UnitEconomics {
  let activeCount = 0;
  let totalSeats = 0;
  let totalMRR = 0;
  let perSeatRevenue = 0;
  let perSeatSeats = 0;
  let partnerMRR = 0;

  for (const client of clients) {
    if (client.status !== 'active') continue;

    const seats = client.seatCount || 0;
    activeCount += 1;
    totalSeats += seats;
    totalMRR += client.mrr;

    if (client.pricingModel === 'per_seat' && seats > 0) {
      perSeatRevenue += client.mrr;
      perSeatSeats += seats;
    }

    if (client.salesPartner && client.salesPartner !== 'Direct') {
      partnerMRR += client.mrr;
    }
  }

  const avgPerSeatPrice = perSeatSeats > 0 ? perSeatRevenue / perSeatSeats : 0;

  // Revenue per seat
  const subscriptionPerSeat = totalSeats > 0 ? totalMRR / totalSeats : avgPerSeatPrice;
  const aiRevenuePerSeat = a.aiAgentRevPerSeat;
  const addOnPerSeat = a.addOnRevPerSeat;
  const totalRevenuePerSeat = subscriptionPerSeat + aiRevenuePerSeat + addOnPerSeat;

  // Direct costs per seat
  const platformLicensePerSeat = a.platformLicensePerSeat;
  const aiApiCostPerSeat = aiRevenuePerSeat * a.aiApiCostRate;
  const totalDirectCostPerSeat = platformLicensePerSeat + aiApiCostPerSeat;

  // Shared costs per seat
  const serverPerSeat = totalSeats > 0 ? a.serverHosting / totalSeats : a.serverHosting;
  const engineeringPerSeat = totalSeats > 0 ? a.engineering / totalSeats : a.engineering;
  const softwarePerSeat = totalSeats > 0 ? a.softwareTools / totalSeats : a.softwareTools;
  const accountMgmtPerSeat = totalSeats > 0 && activeCount > 0
    ? (a.accountMgmtPerClient * activeCount) / totalSeats
    : 0;
  // Commission: only partner clients contribute commission
  const totalCommission = partnerMRR * a.partnerCommissionRate;
  const commissionPerSeat = totalSeats > 0 ? totalCommission / totalSeats : 0;
  const totalSharedCostPerSeat = serverPerSeat + engineeringPerSeat + softwarePerSeat + accountMgmtPerSeat + commissionPerSeat;

  // Bottom line
  const totalCostPerSeat = totalDirectCostPerSeat + totalSharedCostPerSeat;
  const contributionPerSeat = totalRevenuePerSeat - totalCostPerSeat;
  const marginPercent = totalRevenuePerSeat > 0 ? (contributionPerSeat / totalRevenuePerSeat) * 100 : 0;

  return {
    subscriptionPerSeat, aiRevenuePerSeat, addOnPerSeat, totalRevenuePerSeat,
    platformLicensePerSeat, aiApiCostPerSeat, totalDirectCostPerSeat,
    serverPerSeat, engineeringPerSeat, softwarePerSeat, accountMgmtPerSeat, commissionPerSeat, totalSharedCostPerSeat,
    totalCostPerSeat, contributionPerSeat, marginPercent,
    totalSeats, activeClients: activeCount, avgPerSeatPrice, totalMRR,
  };
}

// ========== SCALE SIMULATION ==========

export interface ScalePoint {
  seats: number;
  revenuePerSeat: number;
  costPerSeat: number;
  marginPercent: number;
  contributionPerSeat: number;
  totalContribution: number;
}

export function computeScaleEffect(
  baseUnit: UnitEconomics,
  a: UnitAssumptions,
  activeClients: number,
): ScalePoint[] {
  const points: ScalePoint[] = [];
  const seatCounts = [10, 20, 40, 60, 80, 100, 150, 200, 300, 500];

  for (const seats of seatCounts) {
    const rev = baseUnit.subscriptionPerSeat + a.aiAgentRevPerSeat + a.addOnRevPerSeat;
    // Direct costs stay constant per seat
    const direct = a.platformLicensePerSeat + (a.aiAgentRevPerSeat * a.aiApiCostRate);
    // Shared costs decrease per seat as seats increase
    const shared =
      (a.serverHosting / seats) +
      (a.engineering / seats) +
      (a.softwareTools / seats) +
      (activeClients > 0 ? (a.accountMgmtPerClient * activeClients) / seats : 0) +
      baseUnit.commissionPerSeat; // commission stays proportional
    const cost = direct + shared;
    const contribution = rev - cost;
    const margin = rev > 0 ? (contribution / rev) * 100 : 0;

    points.push({
      seats,
      revenuePerSeat: rev,
      costPerSeat: cost,
      marginPercent: margin,
      contributionPerSeat: contribution,
      totalContribution: contribution * seats,
    });
  }

  return points;
}

// ========== CLIENT UNIT ECONOMICS ==========

export interface ClientUnitRow {
  clientId: string;
  clientName: string;
  salesPartner: string;
  pricingModel: string;
  seats: number;
  revenuePerSeat: number;
  directCostPerSeat: number;
  sharedCostPerSeat: number;
  totalCostPerSeat: number;
  contributionPerSeat: number;
  marginPercent: number;
  totalContribution: number;
  totalRevenue: number;
}

// ========== PLAN-LEVEL UNIT ECONOMICS ==========

export interface PlanConfig {
  id: string;
  name: string;
  monthlyPrice: number;
  estimatedSeats: number;
  color: string;
}

export const PLAN_CONFIGS: PlanConfig[] = [
  { id: 'pro', name: 'Pro', monthlyPrice: 899, estimatedSeats: 5, color: '#60a5fa' },
  { id: 'elite', name: 'Elite', monthlyPrice: 1499, estimatedSeats: 15, color: '#a78bfa' },
  { id: 'ultimate', name: 'Ultimate', monthlyPrice: 2499, estimatedSeats: 30, color: '#fbbf24' },
];

export interface PlanEconomics {
  planId: string;
  planName: string;
  monthlyPrice: number;
  estimatedSeats: number;
  // Revenue
  subscriptionRevenue: number;
  aiRevenue: number;
  addOnRevenue: number;
  totalRevenue: number;
  // Direct costs
  platformLicense: number;
  aiApiCost: number;
  totalDirectCost: number;
  // Shared costs (per plan)
  serverCost: number;
  engineeringCost: number;
  softwareCost: number;
  accountMgmt: number;
  commission: number;
  totalSharedCost: number;
  // Bottom line
  totalCost: number;
  contribution: number;
  marginPercent: number;
  // Per-seat equivalents
  revenuePerSeat: number;
  costPerSeat: number;
  contributionPerSeat: number;
}

export function computePlanEconomics(
  plan: PlanConfig,
  a: UnitAssumptions,
  totalActivePlans: number,
): PlanEconomics {
  const subscriptionRevenue = plan.monthlyPrice;
  const aiRevenue = a.aiAgentRevPerSeat * plan.estimatedSeats;
  const addOnRevenue = a.addOnRevPerSeat * plan.estimatedSeats;
  const totalRevenue = subscriptionRevenue + aiRevenue + addOnRevenue;

  // Direct costs scale with seats in the plan
  const platformLicense = a.platformLicensePerSeat * plan.estimatedSeats;
  const aiApiCost = aiRevenue * a.aiApiCostRate;
  const totalDirectCost = platformLicense + aiApiCost;

  // Shared costs divided across all active plans
  const planShare = totalActivePlans > 0 ? 1 / totalActivePlans : 1;
  const serverCost = a.serverHosting * planShare;
  const engineeringCost = a.engineering * planShare;
  const softwareCost = a.softwareTools * planShare;
  const accountMgmt = a.accountMgmtPerClient;
  const commission = subscriptionRevenue * a.partnerCommissionRate;
  const totalSharedCost = serverCost + engineeringCost + softwareCost + accountMgmt + commission;

  const totalCost = totalDirectCost + totalSharedCost;
  const contribution = totalRevenue - totalCost;
  const marginPercent = totalRevenue > 0 ? (contribution / totalRevenue) * 100 : 0;

  return {
    planId: plan.id,
    planName: plan.name,
    monthlyPrice: plan.monthlyPrice,
    estimatedSeats: plan.estimatedSeats,
    subscriptionRevenue, aiRevenue, addOnRevenue, totalRevenue,
    platformLicense, aiApiCost, totalDirectCost,
    serverCost, engineeringCost, softwareCost, accountMgmt, commission, totalSharedCost,
    totalCost, contribution, marginPercent,
    revenuePerSeat: plan.estimatedSeats > 0 ? totalRevenue / plan.estimatedSeats : 0,
    costPerSeat: plan.estimatedSeats > 0 ? totalCost / plan.estimatedSeats : 0,
    contributionPerSeat: plan.estimatedSeats > 0 ? contribution / plan.estimatedSeats : 0,
  };
}

// ========== CLIENT UNIT ECONOMICS ==========

export function computeClientUnitRows(clients: Client[], a: UnitAssumptions): ClientUnitRow[] {
  const active: Client[] = [];
  let totalSeats = 0;
  for (const client of clients) {
    if (client.status !== 'active') continue;
    active.push(client);
    totalSeats += client.seatCount || 0;
  }
  const activeCount = active.length;

  if (activeCount === 0) return [];

  return active.map((c) => {
    const seats = c.seatCount || 1; // treat flat clients as 1 "unit"
    const revenuePerSeat = seats > 0 ? c.mrr / seats : c.mrr;
    const aiRevPerSeat = a.aiAgentRevPerSeat;
    const addOnPerSeat = a.addOnRevPerSeat;
    const totalRevPerSeat = revenuePerSeat + aiRevPerSeat + addOnPerSeat;

    // Direct
    const directCostPerSeat = a.platformLicensePerSeat + (aiRevPerSeat * a.aiApiCostRate);

    // Shared (allocated by seat count proportion)
    const seatFraction = totalSeats > 0 ? seats / totalSeats : 1 / activeCount;
    const sharedTotal =
      (a.serverHosting * seatFraction) +
      (a.engineering * seatFraction) +
      (a.softwareTools * seatFraction) +
      a.accountMgmtPerClient + // 1 client = 1 allocation
      (c.salesPartner && c.salesPartner !== 'Direct' ? c.mrr * a.partnerCommissionRate : 0);
    const sharedCostPerSeat = sharedTotal / seats;

    const totalCostPerSeat = directCostPerSeat + sharedCostPerSeat;
    const contributionPerSeat = totalRevPerSeat - totalCostPerSeat;
    const marginPercent = totalRevPerSeat > 0 ? (contributionPerSeat / totalRevPerSeat) * 100 : 0;

    return {
      clientId: c.id,
      clientName: c.name,
      salesPartner: c.salesPartner || 'Direct',
      pricingModel: c.pricingModel,
      seats,
      revenuePerSeat: totalRevPerSeat,
      directCostPerSeat,
      sharedCostPerSeat,
      totalCostPerSeat,
      contributionPerSeat,
      marginPercent,
      totalContribution: contributionPerSeat * seats,
      totalRevenue: c.mrr,
    };
  });
}
