'use client';

import { useState, useMemo, useEffect } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import ReceivablesTable from '@/components/receivables/ReceivablesTable';
import { useClientStore } from '@/lib/store/customer-store';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import type { ReceivableStatus } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import {
  getReceivableTotals,
  getMonthlyReceivableSummary,
  classifyRevenue,
  type RevenueType,
} from '@/lib/utils/receivables';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function ReceivablesPage() {
  const clients = useClientStore((s) => s.clients);
  const receivables = useClientStore((s) => s.receivables);
  const { invoices, hydrateFromDb } = useInvoiceStore();
  const [statusFilter, setStatusFilter] = useState<ReceivableStatus | 'all'>('all');

  useEffect(() => { hydrateFromDb(); }, [hydrateFromDb]);
  const [revenueFilter, setRevenueFilter] = useState<RevenueType | 'all'>('all');

  const clientNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of clients) map[c.id] = c.name;
    return map;
  }, [clients]);

  const totals = useMemo(() => getReceivableTotals(receivables), [receivables]);
  const monthlySummary = useMemo(() => getMonthlyReceivableSummary(receivables), [receivables]);

  // Revenue type breakdown for KPIs
  const revTypeTotals = useMemo(() => {
    let mrr = 0;
    let oneTime = 0;
    let mixed = 0;
    for (const r of receivables) {
      const t = classifyRevenue(r.description);
      if (t === 'mrr') mrr += r.amount;
      else if (t === 'one_time') oneTime += r.amount;
      else mixed += r.amount;
    }
    return { mrr, oneTime, mixed };
  }, [receivables]);

  const filtered = useMemo(() => {
    let result = receivables;
    if (statusFilter !== 'all') {
      result = result.filter((r) => r.status === statusFilter);
    }
    if (revenueFilter !== 'all') {
      result = result.filter((r) => classifyRevenue(r.description) === revenueFilter);
    }
    return result;
  }, [receivables, statusFilter, revenueFilter]);

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

  return (
    <PageShell
      title="Receivables"
      subtitle={`${receivables.length} entries · ${monthlySummary.length} months`}
    >
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 20 }}>
        <KPICard title="Total Receivables" value={formatAED(totals.total)} accent="#2979ff" />
        <KPICard title="Recurring" value={formatAED(revTypeTotals.mrr)} accent="#10b981" />
        <KPICard title="One-Time" value={formatAED(revTypeTotals.oneTime)} accent="#f59e0b" />
        <KPICard title="Paid" value={formatAED(totals.paid)} accent="#34d399" />
        <KPICard title="Outstanding" value={formatAED(totals.invoiced + totals.pending + totals.overdue)} accent="#ef4444" />
      </div>

      {/* Monthly Receivables Chart */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#1a1a1a',
          fontFamily: "'DM Sans', sans-serif",
          marginBottom: 8,
        }}>
          Monthly Receivables
        </h3>
        <div
          style={{
            height: 220,
            background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
            borderRadius: 12,
            padding: '16px 12px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
            backgroundSize: '20px 20px',
            borderRadius: 12,
            pointerEvents: 'none',
          }} />
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlySummary} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
              <defs>
                <linearGradient id="rcv-bar-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
                <filter id="rcv-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.3)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${Math.round(v / 1000)}K`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{
                      background: 'rgba(20,20,35,0.95)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: '10px 14px',
                      color: '#ffffff',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                        {d.month}
                      </p>
                      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                        {formatAED(d.total)}
                      </p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                        {d.count} invoices &middot; {formatAED(d.paid)} paid
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]} barSize={24} fill="url(#rcv-bar-grad)" style={{ filter: 'url(#rcv-glow)' }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap" style={{ marginBottom: 16 }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4, background: '#f0ebe0', borderRadius: 10, padding: 4 }}>
          {(['all', 'paid', 'invoiced', 'pending', 'overdue'] as const).map((s) => (
            <button key={s} style={pillStyle(statusFilter === s)} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* Revenue type filter */}
        <div style={{ display: 'flex', gap: 4, background: '#f0ebe0', borderRadius: 10, padding: 4 }}>
          {([
            { key: 'all' as const, label: 'All Types', color: undefined },
            { key: 'mrr' as const, label: 'Recurring', color: '#10b981' },
            { key: 'one_time' as const, label: 'One-Time', color: '#f59e0b' },
            { key: 'mixed' as const, label: 'Mixed', color: '#a78bfa' },
          ]).map((item) => (
            <button
              key={item.key}
              style={{
                ...pillStyle(revenueFilter === item.key),
                ...(revenueFilter === item.key && item.color
                  ? { borderBottom: `2px solid ${item.color}` }
                  : {}),
              }}
              onClick={() => setRevenueFilter(item.key)}
            >
              {item.color && (
                <span style={{
                  display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                  backgroundColor: item.color, marginRight: 5, verticalAlign: 'middle',
                }} />
              )}
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Receivables Table */}
      <ReceivablesTable receivables={filtered} clientNames={clientNames} invoices={invoices} />
    </PageShell>
  );
}
