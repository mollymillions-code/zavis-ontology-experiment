import { MonthlySnapshot } from './platform-types';

// Pre-baked MRR history from CSV MoM data
export const SEED_SNAPSHOTS: MonthlySnapshot[] = [
  {
    month: '2025-09',
    capturedAt: '2025-09-30T00:00:00Z',
    totalMRR: 600,
    totalARR: 7200,
    clientCount: 3,
    mrrByPartner: {
      'Thousif': 600,
    },
    clientsByPartner: {
      'Thousif': 1,
      'Wasim': 1,
      'Code Latis': 1,
    },
    totalOneTimeRevenue: 1500,
    newMRR: 600,
    expansionMRR: 0,
    contractionMRR: 0,
    churnedMRR: 0,
    netNewMRR: 600,
    clientSnapshots: [
      { clientId: 'cli-004', name: 'Etisalat Assist', salesPartner: 'Thousif', status: 'active', mrr: 600 },
    ],
  },
  {
    month: '2025-10',
    capturedAt: '2025-10-31T00:00:00Z',
    totalMRR: 4456,
    totalARR: 53472,
    clientCount: 5,
    mrrByPartner: {
      'Dr. Faisal': 3856,
      'Thousif': 600,
    },
    clientsByPartner: {
      'Dr. Faisal': 2,
      'Thousif': 1,
      'Wasim': 1,
      'Code Latis': 1,
    },
    totalOneTimeRevenue: 47500,
    newMRR: 3856,
    expansionMRR: 0,
    contractionMRR: 0,
    churnedMRR: 0,
    netNewMRR: 3856,
    clientSnapshots: [
      { clientId: 'cli-001', name: 'Dental Nation General Clinic LLC SOC', salesPartner: 'Dr. Faisal', status: 'active', mrr: 2606 },
      { clientId: 'cli-003', name: 'FLOW WELLNESS POLYNESS CLINIC', salesPartner: 'Dr. Faisal', status: 'active', mrr: 1250 },
      { clientId: 'cli-004', name: 'Etisalat Assist', salesPartner: 'Thousif', status: 'active', mrr: 600 },
    ],
  },
  {
    month: '2025-11',
    capturedAt: '2025-11-30T00:00:00Z',
    totalMRR: 13701.33,
    totalARR: 164416,
    clientCount: 11,
    mrrByPartner: {
      'Dr. Faisal': 6139.3,
      'Thousif': 3572,
      'Sagar': 1992,
    },
    clientsByPartner: {
      'Dr. Faisal': 4,
      'Thousif': 4,
      'Sagar': 1,
      'Wasim': 1,
      'Code Latis': 1,
    },
    totalOneTimeRevenue: 41000,
    newMRR: 9245.33,
    expansionMRR: 0,
    contractionMRR: 0,
    churnedMRR: 0,
    netNewMRR: 9245.33,
    clientSnapshots: [
      { clientId: 'cli-001', name: 'Dental Nation General Clinic LLC SOC', salesPartner: 'Dr. Faisal', status: 'active', mrr: 2606 },
      { clientId: 'cli-003', name: 'FLOW WELLNESS POLYNESS CLINIC', salesPartner: 'Dr. Faisal', status: 'active', mrr: 1250 },
      { clientId: 'cli-006', name: 'Modern Aesthetics', salesPartner: 'Dr. Faisal', status: 'active', mrr: 1158.3 },  // was cli-007 pre-reshuffle
      { clientId: 'cli-008', name: 'Dr. Nadz', salesPartner: 'Dr. Faisal', status: 'active', mrr: 1125 },             // was cli-010 pre-reshuffle
      { clientId: 'cli-004', name: 'Etisalat Assist', salesPartner: 'Thousif', status: 'active', mrr: 600 },
      { clientId: 'cli-H06', name: 'GS Polyclinic', salesPartner: 'Thousif', status: 'active', mrr: 1125 },           // historical only, no longer active
      { clientId: 'cli-015', name: 'AIMS', salesPartner: 'Thousif', status: 'active', mrr: 1349 },                    // historical only
      { clientId: 'cli-H08', name: 'First City', salesPartner: 'Thousif', status: 'active', mrr: 498 },               // historical only, no longer active
      { clientId: 'cli-007', name: 'My London Skin Clinic', salesPartner: 'Sagar', status: 'active', mrr: 1992 },     // was cli-009 pre-reshuffle
      { clientId: 'cli-013', name: 'Kent HealthCare', salesPartner: null, status: 'active', mrr: 499 },               // was cli-016 pre-reshuffle
      { clientId: 'cli-017', name: 'Fathi Omara', salesPartner: null, status: 'active', mrr: 1499 },
    ],
  },
];
