import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Client, ClientStatus, ReceivableEntry } from '../models/platform-types';
import { SEED_CLIENTS } from '../models/seed-clients';
import { SEED_RECEIVABLES } from '../models/seed-receivables';
import { fetchFromApi, postToApi, putToApi, deleteFromApi } from '../db-sync';

interface ClientState {
  clients: Client[];
  receivables: ReceivableEntry[];

  // Client CRUD
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  setClientStatus: (id: string, status: ClientStatus) => void;

  // Receivables
  addReceivable: (entry: ReceivableEntry) => void;
  updateReceivable: (id: string, updates: Partial<ReceivableEntry>) => void;

  // Bulk
  importClients: (clients: Client[]) => void;

  // DB hydration
  hydrateFromDb: () => Promise<void>;
}

export const useClientStore = create<ClientState>()(
  persist(
    (set, get) => ({
      clients: SEED_CLIENTS,
      receivables: SEED_RECEIVABLES,

      addClient: (client) => {
        set((state) => ({
          clients: [...state.clients, client],
        }));
        postToApi('/clients', client).catch(console.error);
      },

      updateClient: (id, updates) => {
        // Capture old client before update for receivables sync
        const oldClient = get().clients.find((c) => c.id === id);

        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));

        // If MRR changed, proportionally scale all pending/overdue receivables for this client
        if (
          oldClient &&
          updates.mrr !== undefined &&
          updates.mrr !== oldClient.mrr &&
          oldClient.mrr > 0
        ) {
          const ratio = updates.mrr / oldClient.mrr;
          const currentReceivables = get().receivables;

          for (const r of currentReceivables) {
            if (r.clientId !== id) continue;
            // Only update future/outstanding entries — don't touch paid or already invoiced
            if (r.status === 'paid' || r.status === 'invoiced') continue;

            const newAmount = Math.round(r.amount * ratio * 100) / 100;
            set((state) => ({
              receivables: state.receivables.map((x) =>
                x.id === r.id ? { ...x, amount: newAmount } : x
              ),
            }));
            putToApi(`/receivables/${r.id}`, { amount: newAmount }).catch(console.error);
          }
        }

        putToApi(`/clients/${id}`, updates).catch(console.error);
      },

      deleteClient: (id) => {
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          receivables: state.receivables.filter((r) => r.clientId !== id),
        }));
        deleteFromApi(`/clients/${id}`).catch(console.error);
      },

      setClientStatus: (id, status) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c
          ),
        }));
        putToApi(`/clients/${id}`, { status }).catch(console.error);
      },

      addReceivable: (entry) => {
        set((state) => ({
          receivables: [...state.receivables, entry],
        }));
        postToApi('/receivables', entry).catch(console.error);
      },

      updateReceivable: (id, updates) => {
        set((state) => ({
          receivables: state.receivables.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
        // Persist to DB — requires PUT /api/receivables/[id]
        putToApi(`/receivables/${id}`, updates).catch(console.error);
      },

      importClients: (clients) => {
        set((state) => ({
          clients: [...state.clients, ...clients],
        }));
        for (const c of clients) {
          postToApi('/clients', c).catch(console.error);
        }
      },

      hydrateFromDb: async () => {
        try {
          const [clients, receivables] = await Promise.all([
            fetchFromApi<Client[]>('/clients'),
            fetchFromApi<ReceivableEntry[]>('/receivables'),
          ]);
          if (clients.length > 0) {
            set({ clients });
          }
          if (receivables.length > 0) {
            set({ receivables });
          }
        } catch {
          // Silently fall back to localStorage data
        }
      },
    }),
    { name: 'zavis-clients-v3' }
  )
);
