// ========== ZAVIS PROJECTION ENGINE v3.0 — SEAT-BASED MODEL ==========

export interface ProjectionInputs {
  // Starting position (from current client data)
  startingClients: number;
  startingSeats: number;
  avgSeatPrice: number;

  // Growth
  newClientsPerMonth: number;
  acquisitionGrowthRate: number; // monthly compound (0 = flat, 0.1 = 10% more each month)
  avgSeatsPerNewClient: number;
  monthlyChurnRate: number; // 0.03 = 3%
  monthlySeatExpansionRate: number; // 0.02 = 2% existing clients add seats

  // One-time revenue
  avgOneTimePerNewClient: number; // setup/onboarding fee

  // Costs (simplified)
  infraCostPerSeat: number;
  fixedMonthlyOverhead: number;

  // Timeline
  months: number;
}

export interface ProjectionMonth {
  month: number;
  label: string;

  // Clients
  totalClients: number;
  newClients: number;
  churnedClients: number;
  totalSeats: number;
  newSeats: number;

  // Revenue
  subscriptionRevenue: number;
  oneTimeRevenue: number;
  totalRevenue: number;

  // Costs
  infraCosts: number;
  fixedCosts: number;
  totalCosts: number;

  // Profitability
  grossProfit: number;
  grossMarginPercent: number;

  // Cumulative
  cumulativeRevenue: number;
  cumulativeCosts: number;
  cumulativeProfit: number;
}

export interface ProjectionResult {
  months: ProjectionMonth[];
  breakEvenMonth: number | null;
  endingMRR: number;
  endingARR: number;
  endingClients: number;
  endingSeats: number;
  endingGrossMargin: number;
  totalRevenue: number;
  totalCosts: number;
}

export function runProjection(inputs: ProjectionInputs): ProjectionResult {
  const results: ProjectionMonth[] = [];
  const now = new Date();

  let totalClients = inputs.startingClients;
  let totalSeats = inputs.startingSeats;
  let cumRevenue = 0;
  let cumCosts = 0;
  let breakEvenMonth: number | null = null;

  for (let m = 1; m <= inputs.months; m++) {
    // --- New client acquisition ---
    const rawNew = inputs.newClientsPerMonth * Math.pow(1 + inputs.acquisitionGrowthRate, m - 1);
    const newClients = Math.round(rawNew);
    const newSeatsFromNewClients = newClients * inputs.avgSeatsPerNewClient;

    // --- Seat expansion from existing clients ---
    const expansionSeats = Math.round(totalSeats * inputs.monthlySeatExpansionRate);

    // --- Churn ---
    const churnedClients = Math.round(totalClients * inputs.monthlyChurnRate);
    const avgSeatsPerClient = totalClients > 0 ? totalSeats / totalClients : inputs.avgSeatsPerNewClient;
    const churnedSeats = Math.round(churnedClients * avgSeatsPerClient);

    // Apply changes
    totalClients = totalClients + newClients - churnedClients;
    totalSeats = totalSeats + newSeatsFromNewClients + expansionSeats - churnedSeats;
    if (totalClients < 0) totalClients = 0;
    if (totalSeats < 0) totalSeats = 0;

    const newSeats = newSeatsFromNewClients + expansionSeats;

    // --- Revenue ---
    const subscriptionRevenue = totalSeats * inputs.avgSeatPrice;
    const oneTimeRevenue = newClients * inputs.avgOneTimePerNewClient;
    const totalRevenue = subscriptionRevenue + oneTimeRevenue;

    // --- Costs ---
    const infraCosts = totalSeats * inputs.infraCostPerSeat;
    const fixedCosts = inputs.fixedMonthlyOverhead;
    const totalCosts = infraCosts + fixedCosts;

    const grossProfit = totalRevenue - totalCosts;
    const grossMarginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    cumRevenue += totalRevenue;
    cumCosts += totalCosts;
    const cumProfit = cumRevenue - cumCosts;

    if (breakEvenMonth === null && cumProfit >= 0) {
      breakEvenMonth = m;
    }

    // Month label
    const d = new Date(now);
    d.setMonth(d.getMonth() + m);
    const label = `M${m} \u2014 ${d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

    results.push({
      month: m,
      label,
      totalClients,
      newClients,
      churnedClients,
      totalSeats,
      newSeats,
      subscriptionRevenue,
      oneTimeRevenue,
      totalRevenue,
      infraCosts,
      fixedCosts,
      totalCosts,
      grossProfit,
      grossMarginPercent,
      cumulativeRevenue: cumRevenue,
      cumulativeCosts: cumCosts,
      cumulativeProfit: cumProfit,
    });
  }

  const last = results[results.length - 1];

  return {
    months: results,
    breakEvenMonth,
    endingMRR: last?.subscriptionRevenue || 0,
    endingARR: (last?.subscriptionRevenue || 0) * 12,
    endingClients: last?.totalClients || 0,
    endingSeats: last?.totalSeats || 0,
    endingGrossMargin: last?.grossMarginPercent || 0,
    totalRevenue: cumRevenue,
    totalCosts: cumCosts,
  };
}

// ========== PRESET SCENARIOS ==========

export type PresetScenario = {
  name: string;
  description: string;
  overrides: Partial<ProjectionInputs>;
};

export const PRESET_SCENARIOS: PresetScenario[] = [
  {
    name: 'Current Trajectory',
    description: 'Steady state — 2 new clients/month, low churn',
    overrides: {
      newClientsPerMonth: 2,
      acquisitionGrowthRate: 0,
      monthlyChurnRate: 0.02,
      monthlySeatExpansionRate: 0,
    },
  },
  {
    name: 'Conservative Growth',
    description: '1 new client/month, 5% churn, no seat expansion',
    overrides: {
      newClientsPerMonth: 1,
      acquisitionGrowthRate: 0,
      monthlyChurnRate: 0.05,
      monthlySeatExpansionRate: 0,
    },
  },
  {
    name: 'Moderate Growth',
    description: '3 new/month, 3% churn, 2% seat expansion',
    overrides: {
      newClientsPerMonth: 3,
      acquisitionGrowthRate: 0,
      monthlyChurnRate: 0.03,
      monthlySeatExpansionRate: 0.02,
    },
  },
  {
    name: 'Aggressive Growth',
    description: '5 new/month accelerating, low churn, seat expansion',
    overrides: {
      newClientsPerMonth: 5,
      acquisitionGrowthRate: 0.1,
      monthlyChurnRate: 0.02,
      monthlySeatExpansionRate: 0.03,
    },
  },
  {
    name: 'Price Increase',
    description: 'Raise per-seat price to 300 AED',
    overrides: {
      avgSeatPrice: 300,
      newClientsPerMonth: 2,
      monthlyChurnRate: 0.03,
    },
  },
  {
    name: 'High Churn Stress Test',
    description: 'No new clients, 8% monthly churn',
    overrides: {
      newClientsPerMonth: 0,
      monthlyChurnRate: 0.08,
      monthlySeatExpansionRate: 0,
    },
  },
];
