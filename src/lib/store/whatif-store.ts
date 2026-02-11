import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PricingWhatIf } from '../models/platform-types';
import { fetchFromApi, postToApi, putToApi, deleteFromApi } from '../db-sync';

interface WhatIfState {
  scenarios: PricingWhatIf[];

  addScenario: (scenario: PricingWhatIf) => void;
  updateScenario: (id: string, updates: Partial<PricingWhatIf>) => void;
  deleteScenario: (id: string) => void;

  // DB hydration
  hydrateFromDb: () => Promise<void>;
}

export const useWhatIfStore = create<WhatIfState>()(
  persist(
    (set) => ({
      scenarios: [],

      addScenario: (scenario) => {
        set((state) => ({
          scenarios: [...state.scenarios, scenario],
        }));
        postToApi('/whatif', scenario).catch(console.error);
      },

      updateScenario: (id, updates) => {
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
        putToApi(`/whatif/${id}`, updates).catch(console.error);
      },

      deleteScenario: (id) => {
        set((state) => ({
          scenarios: state.scenarios.filter((s) => s.id !== id),
        }));
        deleteFromApi(`/whatif/${id}`).catch(console.error);
      },

      hydrateFromDb: async () => {
        try {
          const scenarios = await fetchFromApi<PricingWhatIf[]>('/whatif');
          if (scenarios.length > 0) {
            set({ scenarios });
          }
        } catch {
          // Silently fall back to localStorage data
        }
      },
    }),
    { name: 'zavis-whatif' }
  )
);
