import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Invoice,
  CatalogItem,
  PaymentReceived,
  CompanyConfig,
} from '../models/platform-types';
import { SEED_CATALOG_ITEMS } from '../models/seed-catalog-items';
import { fetchFromApi, postToApi, putToApi, deleteFromApi } from '../db-sync';

interface InvoiceState {
  invoices: Invoice[];
  catalogItems: CatalogItem[];
  payments: PaymentReceived[];
  companyConfig: CompanyConfig;

  // Invoice CRUD
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;

  // Catalog CRUD
  addCatalogItem: (item: CatalogItem) => void;
  updateCatalogItem: (id: string, updates: Partial<CatalogItem>) => void;
  deleteCatalogItem: (id: string) => void;

  // Payments
  addPayment: (payment: PaymentReceived) => void;
  updatePayment: (id: string, updates: Partial<PaymentReceived>) => void;

  // Sequence
  getNextNumber: (type: 'invoice' | 'payment') => Promise<string>;

  // DB hydration
  hydrateFromDb: () => Promise<void>;
}

const DEFAULT_COMPANY_CONFIG: CompanyConfig = {
  name: 'H A S H Information Technology Co. L.L.C',
  address: 'Dubai, U.A.E',
  phone: '+971 555312595',
  email: 'support@zavis.ai',
  website: 'https://zavis.ai',
  logoText: 'ZAVIS',
  defaultNotes: 'Thanks for your business.',
  bankDetails: `Bank Name: WIO Bank
Account Name: H A S H INFORMATION TECHNOLOGY CO. L.L.C
IBAN: AE900860000009544848890
BIC/SWIFT: WIOBAEADXXX`,
};

export const useInvoiceStore = create<InvoiceState>()(
  persist(
    (set, get) => ({
      invoices: [],
      catalogItems: SEED_CATALOG_ITEMS,
      payments: [],
      companyConfig: DEFAULT_COMPANY_CONFIG,

      // ===== INVOICE CRUD =====
      addInvoice: (invoice) => {
        set((state) => ({
          invoices: [...state.invoices, invoice],
        }));
        postToApi('/invoices', invoice).catch(console.error);
      },

      updateInvoice: (id, updates) => {
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv
          ),
        }));
        putToApi(`/invoices/${id}`, updates).catch(console.error);
      },

      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
          payments: state.payments.filter((p) => p.invoiceId !== id),
        }));
        deleteFromApi(`/invoices/${id}`).catch(console.error);
      },

      // ===== CATALOG CRUD =====
      addCatalogItem: (item) => {
        set((state) => ({
          catalogItems: [...state.catalogItems, item],
        }));
        postToApi('/catalog-items', item).catch(console.error);
      },

      updateCatalogItem: (id, updates) => {
        set((state) => ({
          catalogItems: state.catalogItems.map((item) =>
            item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
          ),
        }));
        putToApi(`/catalog-items/${id}`, updates).catch(console.error);
      },

      deleteCatalogItem: (id) => {
        set((state) => ({
          catalogItems: state.catalogItems.filter((item) => item.id !== id),
        }));
        deleteFromApi(`/catalog-items/${id}`).catch(console.error);
      },

      // ===== PAYMENTS =====
      addPayment: (payment) => {
        set((state) => {
          // Also update the linked invoice locally
          const invoices = state.invoices.map((inv) => {
            if (inv.id === payment.invoiceId) {
              const newPaid = inv.amountPaid + payment.amount;
              const newBalance = Math.max(0, inv.total - newPaid);
              const newStatus = newBalance <= 0 ? 'paid' as const : newPaid > 0 ? 'partially_paid' as const : inv.status;
              return {
                ...inv,
                amountPaid: newPaid,
                balanceDue: newBalance,
                status: newStatus,
                paidAt: newBalance <= 0 ? new Date().toISOString() : inv.paidAt,
                updatedAt: new Date().toISOString(),
              };
            }
            return inv;
          });
          return {
            payments: [...state.payments, payment],
            invoices,
          };
        });
        postToApi('/payments', payment).catch(console.error);
      },

      updatePayment: (id, updates) => {
        set((state) => ({
          payments: state.payments.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
        putToApi(`/payments/${id}`, updates).catch(console.error);
      },

      // ===== SEQUENCE =====
      getNextNumber: async (type) => {
        try {
          // Peek: get next number without incrementing (just for display)
          const res = await postToApi<{ formatted: string }>('/sequences/next', { name: type, peek: true });
          return res.formatted;
        } catch {
          // Fallback: generate from local state
          const state = get();
          const count = type === 'invoice' ? state.invoices.length : state.payments.length;
          const prefix = type === 'invoice' ? 'INV' : 'PAY';
          return `${prefix}-${String(count + 1).padStart(6, '0')}`;
        }
      },

      // ===== DB HYDRATION =====
      hydrateFromDb: async () => {
        try {
          const [invoices, catalogItems, payments] = await Promise.all([
            fetchFromApi<Invoice[]>('/invoices'),
            fetchFromApi<CatalogItem[]>('/catalog-items'),
            fetchFromApi<PaymentReceived[]>('/payments'),
          ]);
          if (invoices.length > 0) set({ invoices });
          if (catalogItems.length > 0) set({ catalogItems });
          if (payments.length > 0) set({ payments });
        } catch {
          // Silently fall back to localStorage data
        }
      },
    }),
    { name: 'zavis-invoices-v1' }
  )
);
