'use client';

import { useState, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import ClientTable from '@/components/customers/CustomerTable';
import ClientDetailPanel from '@/components/customers/CustomerDetailPanel';
import { useClientStore } from '@/lib/store/customer-store';
import type { Client, ClientStatus } from '@/lib/models/platform-types';
import { SALES_PARTNERS } from '@/lib/models/platform-types';
import { formatAED, formatNumber } from '@/lib/utils/currency';
import { Plus } from 'lucide-react';

export default function ClientsPage() {
  const clients = useClientStore((s) => s.clients);
  const addClient = useClientStore((s) => s.addClient);
  const updateClient = useClientStore((s) => s.updateClient);
  const deleteClient = useClientStore((s) => s.deleteClient);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | undefined>();
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [partnerFilter, setPartnerFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (partnerFilter !== 'all' && (c.salesPartner || 'Direct') !== partnerFilter) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [clients, statusFilter, partnerFilter, search]);

  const summary = useMemo(() => {
    let activeClients = 0;
    let subscribers = 0;
    let activeSubscribers = 0;
    let oneTimeClients = 0;
    let activeOneTimeClients = 0;
    let totalMRR = 0;
    let totalOneTime = 0;

    for (const client of clients) {
      const isActive = client.status === 'active';
      const isSubscriber = client.pricingModel === 'per_seat' || client.pricingModel === 'flat_mrr';
      const isOneTime = client.pricingModel === 'one_time_only';

      totalOneTime += client.oneTimeRevenue;

      if (isActive) {
        activeClients += 1;
        totalMRR += client.mrr;
      }
      if (isSubscriber) {
        subscribers += 1;
        if (isActive) activeSubscribers += 1;
      }
      if (isOneTime) {
        oneTimeClients += 1;
        if (isActive) activeOneTimeClients += 1;
      }
    }

    return {
      activeClients,
      subscribers,
      activeSubscribers,
      oneTimeClients,
      activeOneTimeClients,
      totalMRR,
      totalOneTime,
    };
  }, [clients]);

  function handleSave(client: Client) {
    const existing = clients.find((c) => c.id === client.id);
    if (existing) {
      updateClient(client.id, client);
    } else {
      addClient(client);
    }
  }

  const pillStyle = (active: boolean) => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: 'none',
    background: active ? '#ffffff' : 'transparent',
    color: active ? '#1a1a1a' : '#666',
    fontWeight: active ? 700 : 500,
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer' as const,
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
    transition: 'all 0.15s ease',
  });

  const btnStyle = {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid #e0dbd2',
    background: '#ffffff',
    fontSize: 12,
    fontWeight: 600 as const,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer' as const,
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 6,
  };

  return (
    <PageShell
      title="Clients"
      subtitle={`${clients.length} clients · ${summary.activeClients} active`}
      actions={
        <button
          style={{
            ...btnStyle,
            background: '#00c853',
            border: 'none',
            color: '#1a1a1a',
            fontWeight: 700,
          }}
          onClick={() => {
            setEditingClient(undefined);
            setPanelOpen(true);
          }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Client
        </button>
      }
    >
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard title="Subscribers" value={formatNumber(summary.subscribers)} subtitle={`${summary.activeSubscribers} active`} accent="#00c853" />
        <KPICard title="One-Time Clients" value={formatNumber(summary.oneTimeClients)} subtitle={`${summary.activeOneTimeClients} active`} accent="#fbbf24" />
        <KPICard title="Total Clients" value={formatNumber(clients.length)} subtitle={`${summary.activeClients} active`} accent="#2979ff" />
        <KPICard title="Subscription MRR" value={formatAED(summary.totalMRR)} accent="#00c853" />
        <KPICard title="One-Time Revenue" value={formatAED(summary.totalOneTime)} accent="#fbbf24" />
        <KPICard title="Revenue Quality" value={`${(summary.totalMRR + summary.totalOneTime) > 0 ? ((summary.totalMRR / (summary.totalMRR + summary.totalOneTime)) * 100).toFixed(0) : 0}%`} subtitle="recurring" accent="#10b981" />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Status Filter */}
        <div style={{ display: 'flex', gap: 4, background: '#f0ebe0', borderRadius: 10, padding: 4 }}>
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button key={s} style={pillStyle(statusFilter === s)} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Partner Filter */}
        <div style={{ display: 'flex', gap: 4, background: '#f0ebe0', borderRadius: 10, padding: 4 }}>
          <button style={pillStyle(partnerFilter === 'all')} onClick={() => setPartnerFilter('all')}>
            All Partners
          </button>
          {[...SALES_PARTNERS, 'Direct' as const].map((p) => (
            <button key={p} style={pillStyle(partnerFilter === p)} onClick={() => setPartnerFilter(p)}>
              {p}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            marginLeft: 'auto',
            padding: '6px 14px',
            borderRadius: 8,
            border: '1px solid #e0dbd2',
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            color: '#1a1a1a',
            background: '#ffffff',
            width: 200,
            outline: 'none',
          }}
        />
      </div>

      {/* Client Table */}
      <ClientTable
        clients={filtered}
        onEdit={(c) => {
          setEditingClient(c);
          setPanelOpen(true);
        }}
        onDelete={deleteClient}
      />

      {/* Detail Panel */}
      <ClientDetailPanel
        client={editingClient}
        open={panelOpen}
        onClose={() => {
          setPanelOpen(false);
          setEditingClient(undefined);
        }}
        onSave={handleSave}
      />
    </PageShell>
  );
}
