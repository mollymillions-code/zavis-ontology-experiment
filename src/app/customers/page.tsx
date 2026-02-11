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

  const activeClients = clients.filter((c) => c.status === 'active');
  const subscribers = clients.filter((c) => c.pricingModel === 'per_seat' || c.pricingModel === 'flat_mrr');
  const activeSubscribers = subscribers.filter((c) => c.status === 'active');
  const oneTimeClients = clients.filter((c) => c.pricingModel === 'one_time_only');
  const activeOneTimeClients = oneTimeClients.filter((c) => c.status === 'active');
  const totalMRR = activeClients.reduce((sum, c) => sum + c.mrr, 0);
  const totalOneTime = clients.reduce((sum, c) => sum + c.oneTimeRevenue, 0);

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
      subtitle={`${clients.length} clients · ${activeClients.length} active`}
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
        <KPICard title="Subscribers" value={formatNumber(subscribers.length)} subtitle={`${activeSubscribers.length} active`} accent="#00c853" />
        <KPICard title="One-Time Clients" value={formatNumber(oneTimeClients.length)} subtitle={`${activeOneTimeClients.length} active`} accent="#fbbf24" />
        <KPICard title="Total Clients" value={formatNumber(clients.length)} subtitle={`${activeClients.length} active`} accent="#2979ff" />
        <KPICard title="Subscription MRR" value={formatAED(totalMRR)} accent="#00c853" />
        <KPICard title="One-Time Revenue" value={formatAED(totalOneTime)} accent="#fbbf24" />
        <KPICard title="Revenue Quality" value={`${(totalMRR + totalOneTime) > 0 ? ((totalMRR / (totalMRR + totalOneTime)) * 100).toFixed(0) : 0}%`} subtitle="recurring" accent="#10b981" />
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
