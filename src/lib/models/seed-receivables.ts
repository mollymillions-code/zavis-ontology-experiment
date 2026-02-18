import { ReceivableEntry } from './platform-types';

// Receivables data from CSV: Nov 2025 - Dec 2026
// Status: past months = 'paid', current/near-future = 'invoiced', future = 'pending'
//
// IMPORTANT: Client ID mapping history —
//   cli-010 was formerly "Dr. Nadz" in the old schema. After a client list reshuffle,
//   Dr. Nadz became cli-008 and cli-010 became Neurosolution.
//   Receivables from Jan 2026 onwards that were created under cli-010 (Dr. Nadz's monthly
//   subscription) have been corrected to cli-008.
//   Similarly, Kent HealthCare was cli-016 in snapshots but is cli-013 in the current schema.

export const SEED_RECEIVABLES: ReceivableEntry[] = [
  // ===== November 2025 =====
  { id: 'rcv-001', clientId: 'cli-001', month: '2025-11', amount: 2422, description: 'Quarterly Subscription Fee', status: 'paid' },
  { id: 'rcv-002', clientId: 'cli-002', month: '2025-11', amount: 500, description: 'One-time Setup', status: 'paid' },

  // ===== December 2025 =====
  // Note: Modern Aesthetics Dec 2025 = 1 month subscription (1125) + partial setup (1000) = 2125
  //       Remaining setup (3000 of 4000 total one-time) not yet scheduled per contract.
  { id: 'rcv-003', clientId: 'cli-001', month: '2025-12', amount: 15897, description: '50% Go Live Fee + Care Retainer + Booking Module + Stripe + EMR Integration + White Glove Onboarding + Managed Marketing Service', status: 'paid' },
  { id: 'rcv-004', clientId: 'cli-003', month: '2025-12', amount: 4750, description: 'Quarterly Subscription Fee + Stripe', status: 'paid' },
  { id: 'rcv-005', clientId: 'cli-006', month: '2025-12', amount: 2125, description: 'Monthly Subscription + One-time Setup', status: 'paid' },
  { id: 'rcv-006', clientId: 'cli-010', month: '2025-12', amount: 2225, description: 'One-time Setup & Training Fee', status: 'paid' },
  { id: 'rcv-059', clientId: 'cli-009', month: '2025-12', amount: 10000, description: 'ECLA Platform Services (One-Time)', status: 'paid' },
  { id: 'rcv-007', clientId: 'cli-007', month: '2025-12', amount: 7475, description: 'Quarterly Subscription Fee + EMR Integrations', status: 'paid' },

  // ===== January 2026 =====
  { id: 'rcv-008', clientId: 'cli-001', month: '2026-01', amount: 8922, description: 'Website & Booking Module + Quarterly Subscription Fee', status: 'invoiced' },
  { id: 'rcv-009', clientId: 'cli-003', month: '2026-01', amount: 1000, description: 'Stripe Integration 3rd Party Fee', status: 'invoiced' },
  { id: 'rcv-010', clientId: 'cli-008', month: '2026-01', amount: 1125, description: 'Monthly Subscription Fee', status: 'invoiced' },
  { id: 'rcv-011', clientId: 'cli-013', month: '2026-01', amount: 3994, description: 'Zavis Pro Plan half yearly subscription + One-time Setup', status: 'invoiced' },

  // ===== February 2026 =====
  { id: 'rcv-012', clientId: 'cli-003', month: '2026-02', amount: 4375, description: 'Website Development 2nd Payment + Stripe 4th Payment', status: 'pending' },
  { id: 'rcv-013', clientId: 'cli-008', month: '2026-02', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-014', clientId: 'cli-017', month: '2026-02', amount: 5497, description: 'Elite Plan Subscription + One-Time Setup', status: 'pending' },

  // ===== March 2026 =====
  { id: 'rcv-015', clientId: 'cli-001', month: '2026-03', amount: 2397, description: 'Managed Marketing Service (Quarterly Fee)', status: 'pending' },
  { id: 'rcv-016', clientId: 'cli-003', month: '2026-03', amount: 3750, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-017', clientId: 'cli-008', month: '2026-03', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-018', clientId: 'cli-007', month: '2026-03', amount: 3375, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-055', clientId: 'cli-006', month: '2026-03', amount: 3375, description: 'Quarterly Subscription Fee (Pro Plan)', status: 'pending' },

  // ===== April 2026 =====
  { id: 'rcv-020', clientId: 'cli-001', month: '2026-04', amount: 2422, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-021', clientId: 'cli-003', month: '2026-04', amount: 3375, description: 'Website Development Third Payment', status: 'pending' },
  { id: 'rcv-022', clientId: 'cli-008', month: '2026-04', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },

  // ===== May 2026 =====
  { id: 'rcv-023', clientId: 'cli-008', month: '2026-05', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-024', clientId: 'cli-017', month: '2026-05', amount: 4497, description: 'Elite Plan Subscription', status: 'pending' },

  // ===== June 2026 =====
  { id: 'rcv-025', clientId: 'cli-001', month: '2026-06', amount: 2397, description: 'Managed Marketing Service (Quarterly Fee)', status: 'pending' },
  { id: 'rcv-026', clientId: 'cli-003', month: '2026-06', amount: 3750, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-027', clientId: 'cli-008', month: '2026-06', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-028', clientId: 'cli-007', month: '2026-06', amount: 3375, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-056', clientId: 'cli-006', month: '2026-06', amount: 3375, description: 'Quarterly Subscription Fee (Pro Plan)', status: 'pending' },

  // ===== July 2026 =====
  { id: 'rcv-029', clientId: 'cli-001', month: '2026-07', amount: 2422, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-030', clientId: 'cli-003', month: '2026-07', amount: 3375, description: 'Website Development Last Payment', status: 'pending' },
  { id: 'rcv-031', clientId: 'cli-008', month: '2026-07', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-032', clientId: 'cli-013', month: '2026-07', amount: 2994, description: 'Zavis Half Yearly Subscription', status: 'pending' },

  // ===== August 2026 =====
  { id: 'rcv-033', clientId: 'cli-008', month: '2026-08', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-034', clientId: 'cli-017', month: '2026-08', amount: 4497, description: 'Elite Plan Subscription', status: 'pending' },

  // ===== September 2026 =====
  { id: 'rcv-035', clientId: 'cli-001', month: '2026-09', amount: 2397, description: 'Managed Marketing Service (Quarterly Fee)', status: 'pending' },
  { id: 'rcv-036', clientId: 'cli-003', month: '2026-09', amount: 3750, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-037', clientId: 'cli-008', month: '2026-09', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-038', clientId: 'cli-007', month: '2026-09', amount: 3375, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-057', clientId: 'cli-006', month: '2026-09', amount: 3375, description: 'Quarterly Subscription Fee (Pro Plan)', status: 'pending' },

  // ===== October 2026 =====
  { id: 'rcv-039', clientId: 'cli-001', month: '2026-10', amount: 2422, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-040', clientId: 'cli-008', month: '2026-10', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },

  // ===== November 2026 =====
  { id: 'rcv-041', clientId: 'cli-008', month: '2026-11', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-042', clientId: 'cli-017', month: '2026-11', amount: 4497, description: 'Elite Plan Subscription', status: 'pending' },

  // ===== December 2026 =====
  { id: 'rcv-043', clientId: 'cli-001', month: '2026-12', amount: 2397, description: 'Managed Marketing Service (Quarterly Fee)', status: 'pending' },
  { id: 'rcv-044', clientId: 'cli-003', month: '2026-12', amount: 3750, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-045', clientId: 'cli-008', month: '2026-12', amount: 675, description: 'Monthly Subscription 3 Seats', status: 'pending' },
  { id: 'rcv-046', clientId: 'cli-007', month: '2026-12', amount: 3375, description: 'Quarterly Subscription Fee', status: 'pending' },
  { id: 'rcv-058', clientId: 'cli-006', month: '2026-12', amount: 3375, description: 'Quarterly Subscription Fee (Pro Plan)', status: 'pending' },
];
