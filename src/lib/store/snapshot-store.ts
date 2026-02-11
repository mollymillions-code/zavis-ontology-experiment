import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MonthlySnapshot } from '../models/platform-types';
import { fetchFromApi, postToApi, deleteFromApi } from '../db-sync';

interface SnapshotState {
  snapshots: MonthlySnapshot[];

  captureSnapshot: (snapshot: MonthlySnapshot) => void;
  deleteSnapshot: (month: string) => void;
  getSnapshot: (month: string) => MonthlySnapshot | undefined;
  getLatestSnapshot: () => MonthlySnapshot | undefined;
  getPreviousSnapshot: (month: string) => MonthlySnapshot | undefined;

  // DB hydration
  hydrateFromDb: () => Promise<void>;
}

export const useSnapshotStore = create<SnapshotState>()(
  persist(
    (set, get) => ({
      snapshots: [],

      captureSnapshot: (snapshot) => {
        set((state) => {
          const existing = state.snapshots.findIndex((s) => s.month === snapshot.month);
          if (existing >= 0) {
            const updated = [...state.snapshots];
            updated[existing] = snapshot;
            return { snapshots: updated };
          }
          return {
            snapshots: [...state.snapshots, snapshot].sort((a, b) => a.month.localeCompare(b.month)),
          };
        });
        postToApi('/snapshots', snapshot).catch(console.error);
      },

      deleteSnapshot: (month) => {
        set((state) => ({
          snapshots: state.snapshots.filter((s) => s.month !== month),
        }));
        deleteFromApi(`/snapshots/${month}`).catch(console.error);
      },

      getSnapshot: (month) => get().snapshots.find((s) => s.month === month),

      getLatestSnapshot: () => {
        const snaps = get().snapshots;
        return snaps.length > 0 ? snaps[snaps.length - 1] : undefined;
      },

      getPreviousSnapshot: (month) => {
        const snaps = get().snapshots.filter((s) => s.month < month);
        return snaps.length > 0 ? snaps[snaps.length - 1] : undefined;
      },

      hydrateFromDb: async () => {
        try {
          const snapshots = await fetchFromApi<MonthlySnapshot[]>('/snapshots');
          if (snapshots.length > 0) {
            set({ snapshots });
          }
        } catch {
          // Silently fall back to localStorage data
        }
      },
    }),
    { name: 'zavis-snapshots' }
  )
);
