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
    (set) => ({
      clients: SEED_CLIENTS,
      receivables: SEED_RECEIVABLES,

      addClient: (client) => {
        set((state) => ({
          clients: [...state.clients, client],
        }));
        postToApi('/clients', client).catch(console.error);
      },

      updateClient: (id, updates) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
          ),
        }));
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
