'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import InvoiceTable from '@/components/invoices/InvoiceTable';
import InvoiceFilterBar from '@/components/invoices/InvoiceFilterBar';
import ReceivablesAgingBar from '@/components/invoices/ReceivablesAgingBar';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import { useClientStore } from '@/lib/store/customer-store';
import { getInvoiceMetrics, getAgingSummary } from '@/lib/utils/invoice-utils';
import type { InvoiceStatus, Invoice } from '@/lib/models/platform-types';

export default function InvoicesPage() {
  const router = useRouter();
  const { invoices, hydrateFromDb } = useInvoiceStore();
  const clients = useClientStore((s) => s.clients);

  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  const metrics = useMemo(() => getInvoiceMetrics(invoices), [invoices]);
  const aging = useMemo(() => getAgingSummary(invoices), [invoices]);

  const filtered = useMemo(() => {
    let result = [...invoices];

    // Status filter
    if (filter !== 'all') {
      result = result.filter((inv) => inv.status === filter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((inv) => {
        const clientName = clients.find((c) => c.id === inv.clientId)?.name || '';
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          clientName.toLowerCase().includes(q)
        );
      });
    }

    // Sort by date desc
    result.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

    return result;
  }, [invoices, filter, search, clients]);

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  function handleView(invoice: Invoice) {
    router.push(`/invoices/${invoice.id}`);
  }

  return (
    <PageShell
      title="Invoices"
      subtitle="Create, manage, and track invoices"
      actions={
        <button
          onClick={() => router.push('/invoices/new')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#00c853',
            color: '#1a1a1a',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <Plus size={14} /> New Invoice
        </button>
      }
    >
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KPICard title="Total Invoiced" value={`${fmt(metrics.totalInvoiced)} AED`} accent="#1a1a1a" />
        <KPICard title="Paid" value={`${fmt(metrics.totalPaid)} AED`} accent="#00c853" />
        <KPICard title="Outstanding" value={`${fmt(metrics.totalOutstanding)} AED`} accent="#ff9800" />
        <KPICard title="Overdue" value={`${fmt(metrics.totalOverdue)} AED`} accent="#d32f2f" />
        <KPICard title="Drafts" value={String(metrics.draftCount)} accent="#9e9e9e" />
      </div>

      {/* Aging Bar */}
      <div style={{ marginBottom: 20 }}>
        <ReceivablesAgingBar aging={aging} />
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16 }}>
        <InvoiceFilterBar
          activeFilter={filter}
          onFilterChange={setFilter}
          searchQuery={search}
          onSearchChange={setSearch}
        />
      </div>

      {/* Table */}
      <InvoiceTable
        invoices={filtered}
        clients={clients}
        onView={handleView}
      />
    </PageShell>
  );
}
