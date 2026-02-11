import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Contract,
  RevenueStream,
  Partner,
  CustomerPartnerLink,
  ActionLogEntry,
} from '../models/platform-types';
import { fetchFromApi, postToApi } from '../db-sync';

interface OntologyState {
  // Entities
  partners: Partner[];
  contracts: Contract[];
  revenueStreams: RevenueStream[];
  customerPartnerLinks: CustomerPartnerLink[];
  actionLog: ActionLogEntry[];

  // Setters (for hydration)
  setPartners: (partners: Partner[]) => void;
  setContracts: (contracts: Contract[]) => void;
  setRevenueStreams: (streams: RevenueStream[]) => void;
  setCustomerPartnerLinks: (links: CustomerPartnerLink[]) => void;
  setActionLog: (entries: ActionLogEntry[]) => void;

  // Individual add
  addPartner: (partner: Partner) => void;
  addContract: (contract: Contract) => void;
  addRevenueStream: (stream: RevenueStream) => void;
  addCustomerPartnerLink: (link: CustomerPartnerLink) => void;

  // Derived queries
  getCustomerContracts: (customerId: string) => Contract[];
  getContractRevenueStreams: (contractId: string) => RevenueStream[];
  getCustomerPartner: (customerId: string) => Partner | null;
  getCustomerMRR: (customerId: string) => number;
  getCustomerOneTimeRevenue: (customerId: string) => number;
  getPartnerCustomerIds: (partnerId: string) => string[];

  // Execute an ontology action via API
  executeAction: (actionType: string, inputs: Record<string, unknown>) => Promise<ActionLogEntry | null>;

  // Hydrate from DB
  hydrateFromDb: () => Promise<void>;
}

export const useOntologyStore = create<OntologyState>()(
  persist(
    (set, get) => ({
      partners: [],
      contracts: [],
      revenueStreams: [],
      customerPartnerLinks: [],
      actionLog: [],

      setPartners: (partners) => set({ partners }),
      setContracts: (contracts) => set({ contracts }),
      setRevenueStreams: (revenueStreams) => set({ revenueStreams }),
      setCustomerPartnerLinks: (customerPartnerLinks) => set({ customerPartnerLinks }),
      setActionLog: (actionLog) => set({ actionLog }),

      addPartner: (partner) => {
        set((s) => ({ partners: [...s.partners, partner] }));
        postToApi('/partners', partner).catch(console.error);
      },

      addContract: (contract) => {
        set((s) => ({ contracts: [...s.contracts, contract] }));
        postToApi('/contracts', contract).catch(console.error);
      },

      addRevenueStream: (stream) => {
        set((s) => ({ revenueStreams: [...s.revenueStreams, stream] }));
        postToApi('/revenue-streams', stream).catch(console.error);
      },

      addCustomerPartnerLink: (link) => {
        set((s) => ({ customerPartnerLinks: [...s.customerPartnerLinks, link] }));
      },

      // ── Derived Queries (client-side graph traversal) ──

      getCustomerContracts: (customerId) => {
        return get().contracts.filter((c) => c.customerId === customerId);
      },

      getContractRevenueStreams: (contractId) => {
        return get().revenueStreams.filter((rs) => rs.contractId === contractId);
      },

      getCustomerPartner: (customerId) => {
        const link = get().customerPartnerLinks.find((l) => l.customerId === customerId);
        if (!link) return null;
        return get().partners.find((p) => p.id === link.partnerId) || null;
      },

      getCustomerMRR: (customerId) => {
        const state = get();
        const customerContracts = state.contracts.filter(
          (c) => c.customerId === customerId && c.status === 'active'
        );
        let totalMRR = 0;
        for (const contract of customerContracts) {
          const streams = state.revenueStreams.filter((rs) => rs.contractId === contract.id);
          for (const stream of streams) {
            if (stream.type === 'subscription' || stream.type === 'add_on' || stream.type === 'managed_service') {
              if (stream.frequency === 'monthly') totalMRR += stream.amount;
              else if (stream.frequency === 'quarterly') totalMRR += stream.amount / 3;
              else if (stream.frequency === 'annual') totalMRR += stream.amount / 12;
            }
          }
        }
        return totalMRR;
      },

      getCustomerOneTimeRevenue: (customerId) => {
        const state = get();
        const customerContracts = state.contracts.filter((c) => c.customerId === customerId);
        let total = 0;
        for (const contract of customerContracts) {
          const streams = state.revenueStreams.filter((rs) => rs.contractId === contract.id);
          for (const stream of streams) {
            if (stream.type === 'one_time' || stream.frequency === 'one_time') {
              total += stream.amount;
            }
          }
        }
        return total;
      },

      getPartnerCustomerIds: (partnerId) => {
        return get().customerPartnerLinks
          .filter((l) => l.partnerId === partnerId)
          .map((l) => l.customerId);
      },

      // ── Execute Ontology Action ──

      executeAction: async (actionType, inputs) => {
        try {
          const result = await postToApi<{
            success: boolean;
            logEntry: ActionLogEntry;
            error?: string;
          }>('/ontology/actions', { actionType, inputs, actor: 'user' });

          if (result.success) {
            set((s) => ({
              actionLog: [result.logEntry, ...s.actionLog].slice(0, 100),
            }));
            // Re-hydrate to pick up server-side mutations
            get().hydrateFromDb().catch(console.error);
            return result.logEntry;
          } else {
            console.error('Action failed:', result.error);
            return null;
          }
        } catch (err) {
          console.error('executeAction error:', err);
          return null;
        }
      },

      // ── DB Hydration ──

      hydrateFromDb: async () => {
        try {
          const [partnersData, contractsData, streamsData, actionLogData] = await Promise.all([
            fetchFromApi<Partner[]>('/partners'),
            fetchFromApi<Contract[]>('/contracts'),
            fetchFromApi<RevenueStream[]>('/revenue-streams'),
            fetchFromApi<ActionLogEntry[]>('/ontology/action-log?limit=100'),
          ]);

          if (partnersData.length > 0) set({ partners: partnersData });
          if (contractsData.length > 0) set({ contracts: contractsData });
          if (streamsData.length > 0) set({ revenueStreams: streamsData });
          if (actionLogData.length > 0) set({ actionLog: actionLogData });
        } catch {
          // Silently fall back to localStorage data
        }
      },
    }),
    { name: 'zavis-ontology-v1' }
  )
);
