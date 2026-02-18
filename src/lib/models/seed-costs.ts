import { MonthlyCost } from './platform-types';

const now = new Date().toISOString();

// Real cost data from ZAVIS Financial Dashboard - Monthly Cost Breakdown
// Source: Google Sheets (Feb 2026)
export const SEED_COSTS: MonthlyCost[] = [
  // Current (actual) costs - Feb 2026
  {
    id: 'cost-001',
    month: '2026-02',
    category: 'aws',
    amount: 0,
    type: 'actual',
    notes: 'Cloud infrastructure',
    createdAt: now,
  },
  {
    id: 'cost-002',
    month: '2026-02',
    category: 'chatwoot_seats',
    amount: 1538.73,
    type: 'actual',
    notes: 'Seats + subscription',
    createdAt: now,
  },
  {
    id: 'cost-003',
    month: '2026-02',
    category: 'payroll',
    amount: 13400,
    type: 'actual',
    notes: 'Staff compensation',
    createdAt: now,
  },
  {
    id: 'cost-004',
    month: '2026-02',
    category: 'sales_spend',
    amount: 2463,
    type: 'actual',
    notes: 'Sales expenses',
    createdAt: now,
  },
  {
    id: 'cost-006',
    month: '2026-02',
    category: 'commissions',
    amount: 1494.40,
    type: 'actual',
    notes: '10-20% MRR revenue share',
    createdAt: now,
  },

  // Projected costs - Feb 2026 (after key revenue milestones)
  {
    id: 'cost-007',
    month: '2026-02',
    category: 'aws',
    amount: 4000,
    type: 'projected',
    notes: 'Cloud infrastructure',
    createdAt: now,
  },
  {
    id: 'cost-008',
    month: '2026-02',
    category: 'chatwoot_seats',
    amount: 2750.60,
    type: 'projected',
    notes: 'Seats + subscription',
    createdAt: now,
  },
  {
    id: 'cost-009',
    month: '2026-02',
    category: 'payroll',
    amount: 81000,
    type: 'projected',
    notes: 'Staff compensation',
    createdAt: now,
  },
  {
    id: 'cost-010',
    month: '2026-02',
    category: 'sales_spend',
    amount: 4926,
    type: 'projected',
    notes: 'Sales expenses',
    createdAt: now,
  },
  {
    id: 'cost-012',
    month: '2026-02',
    category: 'commissions',
    amount: 8219.20,
    type: 'projected',
    notes: '10-20% MRR revenue share',
    createdAt: now,
  },
];
