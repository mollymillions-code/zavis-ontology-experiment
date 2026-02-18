'use client';

import { useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import RevenueDonut from '@/components/charts/RevenueDonut';
import CustomerRevenueBar from '@/components/charts/CustomerRevenueBar';
import StatusBadge from '@/components/customers/StatusBadge';
import { PartnerBadge } from '@/components/customers/PartnerBadge';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import { useMonthlyCosts } from '@/hooks/useMonthlyCosts';
import { useClientStore } from '@/lib/store/customer-store';
import { useSnapshotStore } from '@/lib/store/snapshot-store';
import { formatAED, formatNumber, formatDeltaAED } from '@/lib/utils/currency';
import { PARTNER_COLORS } from '@/lib/models/pricing-data';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { AlertTriangle } from 'lucide-react';

const cardStyle = {
  background: '#ffffff',
  borderRadius: 12,
  padding: 24,
  border: '1px solid #e0dbd2',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const sectionTitle = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700 as const,
  fontSize: 14,
  color: '#1a1a1a',
  marginBottom: 16,
};

const chartCardStyle = {
  background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
  borderRadius: 14,
  padding: 24,
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
};

const chartTitleStyle = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700 as const,
  fontSize: 13,
  color: 'rgba(255,255,255,0.7)',
  marginBottom: 16,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
};

const COMPOSITION_GRADIENTS: Record<string, string> = {
  'Recurring': 'url(#comp-recurring)',
  'One-Time': 'url(#comp-onetime)',
};

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTH_SHORT[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
}

export default function DashboardPage() {
  const metrics = useDashboardMetrics();
  const clients = useClientStore((s) => s.clients);
  const receivables = useClientStore((s) => s.receivables);
  const { costs: monthlyCosts, loading: costsLoading } = useMonthlyCosts();
  const latestSnapshot = useSnapshotStore((s) => s.getLatestSnapshot());
  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousSnapshot = useSnapshotStore((s) => s.getPreviousSnapshot(latestSnapshot?.month || currentMonth));

  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);

  // MoM deltas (from snapshots if available)
  const mrrDelta = useMemo(() => {
    if (!previousSnapshot) return null;
    return {
      value: formatDeltaAED(metrics.totalMRR - previousSnapshot.totalMRR),
      direction: metrics.totalMRR > previousSnapshot.totalMRR ? 'up' : metrics.totalMRR < previousSnapshot.totalMRR ? 'down' : 'neutral',
      isGood: metrics.totalMRR >= previousSnapshot.totalMRR,
    } as const;
  }, [metrics.totalMRR, previousSnapshot]);

  const clientDelta = useMemo(() => {
    if (!previousSnapshot) return null;
    const diff = metrics.activeClientCount - previousSnapshot.clientCount;
    return {
      value: `${diff >= 0 ? '+' : ''}${diff}`,
      direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
      isGood: diff >= 0,
    } as const;
  }, [metrics.activeClientCount, previousSnapshot]);

  // Donut data — by partner
  const donutData = useMemo(
    () =>
      Object.entries(metrics.mrrByPartner).map(([partner, value]) => ({
        name: partner,
        value,
        partner,
      })),
    [metrics.mrrByPartner],
  );

  // Bar chart data
  const barData = useMemo(
    () =>
      activeClients.map((c) => ({
        name: c.name,
        mrr: c.mrr,
        partner: c.salesPartner || 'Direct',
      })),
    [activeClients],
  );

  // Revenue composition: recurring vs one-time
  const compositionData = useMemo(
    () =>
      [
        { name: 'Recurring', value: metrics.totalMRR, color: '#60a5fa' },
        { name: 'One-Time', value: metrics.totalOneTimeRevenue, color: '#fbbf24' },
      ].filter((d) => d.value > 0),
    [metrics.totalMRR, metrics.totalOneTimeRevenue],
  );
  const compositionTotal = useMemo(
    () => compositionData.reduce((s, d) => s + d.value, 0),
    [compositionData],
  );

  // Concentration risk
  const clientData = useMemo(() => {
    return [...clients]
      .sort((a, b) => b.mrr - a.mrr)
      .map((c) => {
        const concentrationPct = metrics.totalMRR > 0 ? (c.mrr / metrics.totalMRR) * 100 : 0;
        return { ...c, concentrationPct };
      });
  }, [clients, metrics.totalMRR]);

  // Cash Flow pivot data
  const cashFlowData = useMemo(() => {
    // Collect all months from both receivables and costs
    const monthSet = new Set<string>();
    for (const r of receivables) monthSet.add(r.month);
    for (const c of monthlyCosts) monthSet.add(c.month);
    const months = Array.from(monthSet).sort();

    return months.map((m) => {
      // IN: receivables per month (paid only for actuals)
      const inAmount = receivables
        .filter((r) => r.month === m && r.status === 'paid')
        .reduce((s, r) => s + r.amount, 0);

      // OUT: costs per month
      const outAmount = monthlyCosts
        .filter((c) => c.month === m)
        .reduce((s, c) => s + c.amount, 0);

      const net = inAmount - outAmount;
      return { month: m, label: fmtMonth(m), inAmount, outAmount, net };
    });
  }, [receivables, monthlyCosts]);

  return (
    <PageShell
      title="Executive Dashboard"
      subtitle="CEO/CFO financial overview"
    >
      {/* ===== KPI ROW 1: Revenue ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPICard
          title="Subscription MRR"
          value={formatAED(metrics.totalMRR)}
          delta={mrrDelta || undefined}
          accent="#00c853"
          subtitle={`ARR: ${formatAED(metrics.totalARR)}`}
        />
        <KPICard
          title="One-Time Revenue"
          value={formatAED(metrics.totalOneTimeRevenue)}
          accent="#fbbf24"
          subtitle={`${metrics.oneTimeClientCount} one-time clients`}
        />
        <KPICard
          title="Avg MRR / Subscriber"
          value={formatAED(Math.round(metrics.avgMRRPerSubscriber))}
          subtitle={`${metrics.totalSeats} seats total`}
          accent="#ff9100"
        />
        <KPICard
          title="Receivables Outstanding"
          value={metrics.receivablesPending > 0 ? formatAED(metrics.receivablesPending) : 'None'}
          subtitle={`${formatAED(metrics.receivablesPaid)} collected`}
          accent={metrics.receivablesPending > 0 ? '#ff3d00' : '#00c853'}
        />
      </div>

      {/* ===== KPI ROW 2: Clients ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard
          title="Subscribers"
          value={formatNumber(metrics.activeSubscriberCount)}
          delta={clientDelta || undefined}
          accent="#00c853"
          subtitle={`${metrics.subscriberCount} total (${metrics.subscriberCount - metrics.activeSubscriberCount} inactive)`}
        />
        <KPICard
          title="One-Time Clients"
          value={formatNumber(metrics.activeOneTimeClientCount)}
          accent="#fbbf24"
          subtitle={`${metrics.oneTimeClientCount} total (${metrics.oneTimeClientCount - metrics.activeOneTimeClientCount} inactive)`}
        />
        <KPICard
          title="Total Clients"
          value={formatNumber(metrics.totalClients)}
          accent="#2979ff"
          subtitle={`${metrics.activeClientCount} active`}
        />
        <KPICard
          title="Revenue Quality"
          value={`${(metrics.totalMRR + metrics.totalOneTimeRevenue) > 0 ? ((metrics.totalMRR / (metrics.totalMRR + metrics.totalOneTimeRevenue)) * 100).toFixed(0) : 0}% recurring`}
          accent="#10b981"
        />
      </div>

      {/* ===== CHART ROW 1: Partner Donut + Revenue by Client ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 20, marginBottom: 20 }}>
        {/* Revenue by Partner */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Revenue by Partner</h3>
          {donutData.length > 0 ? (
            <>
              <RevenueDonut data={donutData} total={formatAED(metrics.totalMRR)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
                {donutData.map((d) => {
                  const pct = metrics.totalMRR > 0 ? ((d.value / metrics.totalMRR) * 100).toFixed(1) : '0';
                  return (
                    <div key={d.partner} className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: PARTNER_COLORS[d.partner] || '#999', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#666', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                          {d.name} <span style={{ color: '#999', fontSize: 10 }}>({metrics.clientsByPartner[d.partner] || 0})</span>
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1a1a1a' }}>{formatAED(d.value)}</span>
                        <span style={{ fontSize: 10, color: '#999', marginLeft: 6, fontFamily: "'Space Mono', monospace" }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: '#999', padding: 32, textAlign: 'center' }}>No active clients</p>
          )}
        </div>

        {/* Revenue by Client (with concentration warning) */}
        <div style={cardStyle}>
          <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
            <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Revenue by Client</h3>
            {clientData.some((c) => c.concentrationPct > 20) && (
              <div className="flex items-center gap-1.5" style={{ fontSize: 10, color: '#ff3d00', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                <AlertTriangle className="w-3.5 h-3.5" />
                Concentration risk
              </div>
            )}
          </div>
          {barData.length > 0 ? (
            <CustomerRevenueBar data={barData} />
          ) : (
            <p style={{ fontSize: 12, color: '#999', padding: 32, textAlign: 'center' }}>No active clients</p>
          )}
        </div>
      </div>

      {/* ===== CHART ROW 2: Revenue Composition + Financial Summary ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 20, marginBottom: 20 }}>
        {/* Revenue Composition Donut */}
        <div style={chartCardStyle}>
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
            backgroundSize: '24px 24px',
            borderRadius: 14,
            pointerEvents: 'none',
          }} />
          <h3 style={chartTitleStyle}>Revenue Composition</h3>
          <div className="relative" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <defs>
                  <linearGradient id="comp-recurring" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                  <linearGradient id="comp-onetime" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                  <filter id="comp-glow">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <Pie
                  data={compositionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                  style={{ filter: 'url(#comp-glow)' }}
                >
                  {compositionData.map((entry) => (
                    <Cell key={entry.name} fill={COMPOSITION_GRADIENTS[entry.name] || entry.color} />
                  ))}
                </Pie>
                <Pie
                  data={[{ value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={50}
                  dataKey="value"
                  strokeWidth={0}
                  fill="rgba(255,255,255,0.06)"
                  isAnimationActive={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    const pct = compositionTotal > 0 ? ((d.value / compositionTotal) * 100).toFixed(1) : '0';
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
                        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>{d.name}</p>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, marginTop: 2, color: '#ffffff' }}>{formatAED(d.value)} ({pct}%)</p>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            {compositionData.map((d) => {
              const pct = compositionTotal > 0 ? ((d.value / compositionTotal) * 100).toFixed(1) : '0';
              return (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>{d.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#ffffff' }}>{formatAED(d.value)}</span>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 6, fontFamily: "'Space Mono', monospace" }}>{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Financial Summary */}
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Financial Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div style={{ padding: 16, background: '#f5f0e8', borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 4 }}>Recurring Revenue</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#00a844', fontFamily: "'Space Mono', monospace" }}>{formatAED(metrics.totalMRR)}</p>
            </div>
            <div style={{ padding: 16, background: '#f5f0e8', borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 4 }}>Annual Run Rate</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#2979ff', fontFamily: "'Space Mono', monospace" }}>{formatAED(metrics.totalARR)}</p>
            </div>
            <div style={{ padding: 16, background: '#f5f0e8', borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 4 }}>One-Time Revenue</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24', fontFamily: "'Space Mono', monospace" }}>{formatAED(metrics.totalOneTimeRevenue)}</p>
            </div>
            <div style={{ padding: 16, background: '#f5f0e8', borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 4 }}>Total Receivables</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: metrics.receivablesPending > 0 ? '#ff3d00' : '#00a844', fontFamily: "'Space Mono', monospace" }}>
                {formatAED(metrics.totalReceivables)}
              </p>
            </div>
          </div>
          {/* Revenue composition bar (horizontal stacked) */}
          <div style={{ marginTop: 8 }}>
            <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 8 }}>Revenue Breakdown</p>
            <div style={{ height: 24, borderRadius: 6, overflow: 'hidden', display: 'flex', background: '#f0ebe0' }}>
              {compositionData.map((d) => {
                const pct = compositionTotal > 0 ? (d.value / compositionTotal) * 100 : 0;
                return pct > 0 ? (
                  <div
                    key={d.name}
                    style={{
                      width: `${pct}%`,
                      background: d.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'width 0.3s ease',
                    }}
                    title={`${d.name}: ${formatAED(d.value)} (${pct.toFixed(1)}%)`}
                  >
                    {pct > 15 && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>
                        {d.name} {pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CLIENT ROSTER TABLE ===== */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>Client Roster</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                {['Client', 'Partner', 'Model', 'Seats', 'Per Seat', 'Recurring', 'One-Time', 'Status'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 8px',
                    textAlign: ['Recurring', 'One-Time', 'Per Seat', 'Seats'].includes(h) ? 'right' : 'left',
                    fontWeight: 600, color: '#666', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5,
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientData.map((c, i) => (
                <tr
                  key={c.id}
                  style={{
                    borderBottom: '1px solid #e0dbd2',
                    background: c.concentrationPct > 20 ? '#fff5f5' : i % 2 === 0 ? '#fafafa' : '#fff',
                  }}
                >
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>
                    {c.name}
                    {c.concentrationPct > 20 && (
                      <AlertTriangle className="w-3 h-3 inline-block ml-1.5" style={{ color: '#ff3d00', verticalAlign: 'text-bottom' }} />
                    )}
                  </td>
                  <td style={{ padding: '10px 8px' }}><PartnerBadge partner={c.salesPartner} /></td>
                  <td style={{ padding: '10px 8px', color: '#666', fontFamily: "'DM Sans', sans-serif", fontSize: 11 }}>
                    {c.pricingModel === 'per_seat' ? 'Per Seat' : c.pricingModel === 'flat_mrr' ? 'Flat' : 'One-Time'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#666' }}>
                    {c.seatCount ?? '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#666' }}>
                    {c.perSeatCost != null ? formatAED(c.perSeatCost) : '—'}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#00a844' }}>{formatAED(c.mrr)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#666' }}>{formatAED(c.oneTimeRevenue)}</td>
                  <td style={{ padding: '10px 8px' }}><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8' }}>
                <td colSpan={5} style={{ padding: '10px 8px', fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>Total</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#00a844' }}>{formatAED(metrics.totalMRR)}</td>
                <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{formatAED(metrics.totalOneTimeRevenue)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ===== CASH FLOW OVERVIEW ===== */}
      <div style={{ ...cardStyle, marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ ...sectionTitle, marginBottom: 0 }}>Cash Flow Overview</h3>
        </div>

        {costsLoading ? (
          <div style={{
            height: 120,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafaf8',
            borderRadius: 10,
            border: '1px solid #e0dbd2',
          }}>
            <p style={{ fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
              Loading cost data…
            </p>
          </div>
        ) : cashFlowData.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>No cash flow data available.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: cashFlowData.length * 90 + 200 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontWeight: 600,
                    color: '#666',
                    textTransform: 'uppercase',
                    fontSize: 10,
                    letterSpacing: 0.5,
                    fontFamily: "'DM Sans', sans-serif",
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: 0,
                    background: '#fff',
                    zIndex: 2,
                    minWidth: 160,
                  }}>
                    Flow
                  </th>
                  {cashFlowData.map((d) => (
                    <th key={d.month} style={{
                      padding: '10px 8px',
                      textAlign: 'right',
                      fontWeight: 600,
                      color: '#666',
                      fontSize: 9,
                      letterSpacing: 0.3,
                      fontFamily: "'Space Mono', monospace",
                      whiteSpace: 'nowrap',
                      minWidth: 90,
                    }}>
                      {d.label}
                    </th>
                  ))}
                  <th style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    fontSize: 10,
                    letterSpacing: 0.5,
                    fontFamily: "'DM Sans', sans-serif",
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    borderLeft: '2px solid #e0dbd2',
                    minWidth: 100,
                  }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* IN — Receivables */}
                <tr style={{ borderBottom: '1px solid #e0dbd2', background: '#fafaf8' }}>
                  <td style={{
                    padding: '10px 12px',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: 0,
                    background: '#fafaf8',
                    zIndex: 1,
                  }}>
                    <span style={{ marginRight: 6, fontSize: 9, fontWeight: 700, color: '#00a844', background: 'rgba(0,168,68,0.1)', padding: '2px 6px', borderRadius: 4, fontFamily: "'DM Sans', sans-serif" }}>IN</span>
                    Receivables
                  </td>
                  {cashFlowData.map((d) => (
                    <td key={d.month} style={{
                      padding: '10px 8px',
                      textAlign: 'right',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#00a844',
                      background: d.inAmount > 0 ? 'rgba(0,168,68,0.06)' : undefined,
                    }}>
                      {d.inAmount > 0 ? formatAED(d.inAmount, 0) : '—'}
                    </td>
                  ))}
                  <td style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    fontSize: 11,
                    color: '#00a844',
                    borderLeft: '2px solid #e0dbd2',
                  }}>
                    {formatAED(cashFlowData.reduce((s, d) => s + d.inAmount, 0), 0)}
                  </td>
                </tr>

                {/* OUT — Costs */}
                <tr style={{ borderBottom: '1px solid #e0dbd2', background: '#ffffff' }}>
                  <td style={{
                    padding: '10px 12px',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: 0,
                    background: '#ffffff',
                    zIndex: 1,
                  }}>
                    <span style={{ marginRight: 6, fontSize: 9, fontWeight: 700, color: '#dc2626', background: 'rgba(220,38,38,0.1)', padding: '2px 6px', borderRadius: 4, fontFamily: "'DM Sans', sans-serif" }}>OUT</span>
                    Costs
                  </td>
                  {cashFlowData.map((d) => (
                    <td key={d.month} style={{
                      padding: '10px 8px',
                      textAlign: 'right',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#dc2626',
                      background: d.outAmount > 0 ? 'rgba(239,68,68,0.06)' : undefined,
                    }}>
                      {d.outAmount > 0 ? formatAED(d.outAmount, 0) : '—'}
                    </td>
                  ))}
                  <td style={{
                    padding: '10px 12px',
                    textAlign: 'right',
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    fontSize: 11,
                    color: '#dc2626',
                    borderLeft: '2px solid #e0dbd2',
                  }}>
                    {formatAED(cashFlowData.reduce((s, d) => s + d.outAmount, 0), 0)}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                {/* NET row */}
                <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8' }}>
                  <td style={{
                    padding: '12px 12px',
                    fontWeight: 700,
                    color: '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    position: 'sticky',
                    left: 0,
                    background: '#f5f0e8',
                    zIndex: 1,
                  }}>
                    NET
                  </td>
                  {cashFlowData.map((d) => (
                    <td key={d.month} style={{
                      padding: '12px 8px',
                      textAlign: 'right',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 11,
                      fontWeight: 700,
                      color: d.net >= 0 ? '#00a844' : '#dc2626',
                    }}>
                      {formatAED(d.net, 0)}
                    </td>
                  ))}
                  <td style={{
                    padding: '12px 12px',
                    textAlign: 'right',
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    fontSize: 13,
                    color: cashFlowData.reduce((s, d) => s + d.net, 0) >= 0 ? '#00a844' : '#dc2626',
                    borderLeft: '2px solid #e0dbd2',
                  }}>
                    {formatAED(cashFlowData.reduce((s, d) => s + d.net, 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p style={{ fontSize: 10, color: '#aaa', fontFamily: "'DM Sans', sans-serif", marginTop: 12, fontStyle: 'italic' }}>
          Paid receivables vs monthly costs
        </p>
      </div>
    </PageShell>
  );
}
