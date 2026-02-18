// Sales Partner Configuration
// Defines commission structure and metadata for each sales partner

export interface SalesPartnerInfo {
  id: string;
  name: string;
  joinedDate: string; // ISO date
  commissionPercentage: number; // % of MRR (e.g., 10 = 10%)
  oneTimeCommissionPercentage: number; // % of one-time revenue (e.g., 15 = 15%)
  totalPaid: number; // Total commissions paid to date (AED)
  isActive: boolean;
}

export const SALES_PARTNER_INFO: Record<string, SalesPartnerInfo> = {
  'Dr. Faisal': {
    id: 'dr-faisal',
    name: 'Dr. Faisal',
    joinedDate: '',
    commissionPercentage: 10, // 10% of MRR
    oneTimeCommissionPercentage: 15, // 15% of one-time revenue
    totalPaid: 8500, // AED paid so far
    isActive: true,
  },
  'Wasim': {
    id: 'wasim',
    name: 'Wasim',
    joinedDate: '',
    commissionPercentage: 12, // 12% of MRR
    oneTimeCommissionPercentage: 20, // 20% of one-time revenue
    totalPaid: 6200,
    isActive: true,
  },
  'Thousif': {
    id: 'thousif',
    name: 'Thousif',
    joinedDate: '',
    commissionPercentage: 10,
    oneTimeCommissionPercentage: 15,
    totalPaid: 4800,
    isActive: true,
  },
  'Code Latis': {
    id: 'code-latis',
    name: 'Code Latis',
    joinedDate: '',
    commissionPercentage: 8, // 8% of MRR
    oneTimeCommissionPercentage: 10, // 10% of one-time revenue
    totalPaid: 2100,
    isActive: true,
  },
  'Sagar': {
    id: 'sagar',
    name: 'Sagar',
    joinedDate: '',
    commissionPercentage: 10,
    oneTimeCommissionPercentage: 15,
    totalPaid: 1500,
    isActive: true,
  },
  'Cloudlink': {
    id: 'cloudlink',
    name: 'Cloudlink',
    joinedDate: '',
    commissionPercentage: 5, // 5% of MRR (corporate partner)
    oneTimeCommissionPercentage: 8, // 8% of one-time revenue
    totalPaid: 900,
    isActive: true,
  },
};

export const getAllPartners = (): SalesPartnerInfo[] => {
  return Object.values(SALES_PARTNER_INFO);
};

export const getPartnerInfo = (partnerName: string): SalesPartnerInfo | null => {
  return SALES_PARTNER_INFO[partnerName] || null;
};
