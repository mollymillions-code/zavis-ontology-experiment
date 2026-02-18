import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SalesPartnerInfo } from '../config/sales-partners';
import { SALES_PARTNER_INFO } from '../config/sales-partners';
import { fetchFromApi, putToApi } from '../db-sync';

interface PartnerState {
  partners: Record<string, SalesPartnerInfo>;

  addPartner: (partner: SalesPartnerInfo) => void;
  updateCommission: (name: string, field: 'commissionPercentage' | 'oneTimeCommissionPercentage', value: number) => void;
  updateTotalPaid: (name: string, totalPaid: number) => void;
  getPartner: (name: string) => SalesPartnerInfo | null;
  getAllPartners: () => SalesPartnerInfo[];
  getPartnerNames: () => string[];
  hydrateFromDb: () => Promise<void>;
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
        // Sync to ontology partners table
        const partner = get().partners[name];
        if (partner) {
          const dbField = field === 'commissionPercentage' ? 'commissionPct' : 'oneTimeCommissionPct';
          putToApi(`/partners/${partner.id}`, { [dbField]: value }).catch(() => {
            // Partners API may not have PUT — silently ignore
          });
        }
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

      hydrateFromDb: async () => {
        try {
          const dbPartners = await fetchFromApi<{
            id: string;
            name: string;
            commissionPct: number;
            oneTimeCommissionPct: number;
            totalPaid: number;
            isActive: boolean;
            joinedDate?: string | null;
          }[]>('/partners');

          if (dbPartners.length > 0) {
            const merged: Record<string, SalesPartnerInfo> = { ...get().partners };
            for (const p of dbPartners) {
              merged[p.name] = {
                id: p.id,
                name: p.name,
                joinedDate: p.joinedDate || '',
                commissionPercentage: p.commissionPct,
                oneTimeCommissionPercentage: p.oneTimeCommissionPct,
                totalPaid: p.totalPaid,
                isActive: p.isActive,
              };
            }
            set({ partners: merged });
          }
        } catch {
          // Silently fall back to localStorage data
        }
      },
    }),
    { name: 'zavis-partners-v1' }
  )
);
