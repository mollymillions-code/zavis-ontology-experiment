import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SalesPartnerInfo } from '../config/sales-partners';
import { SALES_PARTNER_INFO } from '../config/sales-partners';

interface PartnerState {
  partners: Record<string, SalesPartnerInfo>;

  addPartner: (partner: SalesPartnerInfo) => void;
  updateCommission: (name: string, field: 'commissionPercentage' | 'oneTimeCommissionPercentage', value: number) => void;
  updateTotalPaid: (name: string, totalPaid: number) => void;
  getPartner: (name: string) => SalesPartnerInfo | null;
  getAllPartners: () => SalesPartnerInfo[];
  getPartnerNames: () => string[];
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set, get) => ({
      partners: SALES_PARTNER_INFO,

      addPartner: (partner) => {
        set((state) => ({
          partners: {
            ...state.partners,
            [partner.name]: partner,
          },
        }));
      },

      updateCommission: (name, field, value) => {
        set((state) => {
          const partner = state.partners[name];
          if (!partner) return state;
          return {
            partners: {
              ...state.partners,
              [name]: { ...partner, [field]: value },
            },
          };
        });
      },

      updateTotalPaid: (name, totalPaid) => {
        set((state) => {
          const partner = state.partners[name];
          if (!partner) return state;
          return {
            partners: {
              ...state.partners,
              [name]: { ...partner, totalPaid },
            },
          };
        });
      },

      getPartner: (name) => {
        return get().partners[name] || null;
      },

      getAllPartners: () => {
        return Object.values(get().partners);
      },

      getPartnerNames: () => {
        return Object.keys(get().partners);
      },
    }),
    { name: 'zavis-partners-v1' }
  )
);
