'use client';

import { useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
  Area, AreaChart,
} from 'recharts';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { useClientStore } from '@/lib/store/customer-store';
import { useSnapshotStore } from '@/lib/store/snapshot-store';
import { usePartnerStore } from '@/lib/store/partner-store';
import { formatAED, formatPercent, formatDeltaPercent } from '@/lib/utils/currency';
import { captureCurrentSnapshot } from '@/lib/utils/snapshot';
import { computeUnitEconomics, DEFAULT_ASSUMPTIONS } from '@/lib/utils/unit-economics';
import { PARTNER_COLORS } from '@/lib/models/pricing-data';
import { Camera } from 'lucide-react';

/* ========== Shared chart styles ========== */

const chartCard = {
  background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
  borderRadius: 14,
  padding: 24,
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
  position: 'relative' as const,
  overflow: 'hidden' as const,
};

const chartTitle = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700 as const,
  fontSize: 13,
  color: 'rgba(255,255,255,0.7)',
  marginBottom: 16,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
};

const dotGrid = {
  position: 'absolute' as const,
  inset: 0,
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
  backgroundSize: '24px 24px',
  borderRadius: 14,
  pointerEvents: 'none' as const,
};

const tooltipBox = {
  background: 'rgba(20,20,35,0.95)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  padding: '8px 12px',
  color: '#fff',
};

const ttLabel = { fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)' };
const ttValue = { fontFamily: "'Space Mono', monospace", fontSize: 12, marginTop: 2 };

const axisTick = { fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' };
const axisTickDm = { fontSize: 10, fontFamily: "'DM Sans', sans-serif", fill: 'rgba(255,255,255,0.5)' };

/* ========== Plan colors ========== */
const PLAN_COLORS: Record<string, string> = {
  'Pro Plan': '#60a5fa',
  'Elite Plan': '#a78bfa',
  'Ultimate Plan': '#fbbf24',
  'Custom': '#ff9100',
  'One-Time Only': '#e2e8f0',
  'NA': '#64748b',
};

export default function TrendsPage() {
  const clients = useClientStore((s) => s.clients);
  const snapshots = useSnapshotStore((s) => s.snapshots);
  const captureSnapshotAction = useSnapshotStore((s) => s.captureSnapshot);
  const getPreviousSnapshot = useSnapshotStore((s) => s.getPreviousSnapshot);
  const deleteSnapshot = useSnapshotStore((s) => s.deleteSnapshot);
  const getAllPartners = usePartnerStore((s) => s.getAllPartners);

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasCurrentMonth = snapshots.some((s) => s.month === currentMonth);

  function handleCapture() {
    const prev = getPreviousSnapshot(currentMonth);
    const snapshot = captureCurrentSnapshot(clients, prev, currentMonth);
    captureSnapshotAction(snapshot);
  }

  /* ========== Live metrics ========== */
  const metrics = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active');
    // Subscriber = has recurring revenue (per_seat or flat_mrr)
    const subscribers = clients.filter((c) => c.pricingModel === 'per_seat' || c.pricingModel === 'flat_mrr');
    const activeSubscribers = subscribers.filter((c) => c.status === 'active');
    const inactiveSubscribers = subscribers.filter((c) => c.status === 'inactive');

    // One-time = pricingModel is one_time_only
    const oneTimeClients = clients.filter((c) => c.pricingModel === 'one_time_only');
    const activeOneTimeClients = oneTimeClients.filter((c) => c.status === 'active');
    const inactiveOneTimeClients = oneTimeClients.filter((c) => c.status === 'inactive');

    // Revenue breakdown
    const subscriptionMRR = active.reduce((s, c) => s + c.mrr, 0);
    const totalARR = subscriptionMRR * 12;
    const totalOneTimeRevenue = clients.reduce((s, c) => s + c.oneTimeRevenue, 0);
    const totalSeats = active.reduce((s, c) => s + (c.seatCount || 0), 0);
    const avgMRRPerSubscriber = activeSubscribers.length > 0
      ? activeSubscribers.reduce((s, c) => s + c.mrr, 0) / activeSubscribers.length : 0;
    const avgOneTimePerClient = oneTimeClients.length > 0
      ? oneTimeClients.reduce((s, c) => s + c.oneTimeRevenue, 0) / oneTimeClients.length : 0;

    // Total revenue = subscription ARR + one-time
    const totalRevenue = subscriptionMRR + totalOneTimeRevenue;
    const subscriptionShare = totalRevenue > 0 ? (subscriptionMRR / totalRevenue) * 100 : 0;

    return {
      subscriptionMRR, totalARR, totalOneTimeRevenue, totalRevenue, subscriptionShare,
      activeCount: active.length, totalClients: clients.length,
      totalSeats,
      // Client breakdown
      subscriberCount: subscribers.length,
      activeSubscriberCount: activeSubscribers.length,
      inactiveSubscriberCount: inactiveSubscribers.length,
      oneTimeClientCount: oneTimeClients.length,
      activeOneTimeCount: activeOneTimeClients.length,
      inactiveOneTimeCount: inactiveOneTimeClients.length,
      // Averages
      avgMRRPerSubscriber, avgOneTimePerClient,
    };
  }, [clients]);

  /* ========== Snapshot-derived ========== */
  const latestSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
  const momGrowth = snapshots.length >= 2
    ? ((snapshots[snapshots.length - 1].totalMRR - snapshots[snapshots.length - 2].totalMRR) / snapshots[snapshots.length - 2].totalMRR) * 100
    : 0;

  /* ========== Unit economics ========== */
  const unitEcon = useMemo(() => computeUnitEconomics(clients, DEFAULT_ASSUMPTIONS), [clients]);

  /* ========== Chart 1: Revenue Over Time (Stacked Area) ========== */
  const revenueTimeData = useMemo(
    () => snapshots.map((s) => ({
      month: s.month,
      subscriptionMRR: s.totalMRR,
      oneTimeRevenue: s.totalOneTimeRevenue || 0,
      totalRevenue: s.totalMRR + (s.totalOneTimeRevenue || 0),
      clients: s.clientCount,
    })),
    [snapshots]
  );

  /* ========== Chart 2: Revenue by Partner (donut) ========== */
  const partnerRevenueData = useMemo(() => {
    const byPartner: Record<string, number> = {};
    clients.filter((c) => c.status === 'active').forEach((c) => {
      const p = c.salesPartner || 'Direct';
      byPartner[p] = (byPartner[p] || 0) + c.mrr;
    });
    return Object.entries(byPartner)
      .map(([name, value]) => ({ name, value, fill: PARTNER_COLORS[name] || '#94a3b8' }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [clients]);

  /* ========== Chart 4: Plan Distribution (donut) ========== */
  const planDistribution = useMemo(() => {
    const byPlan: Record<string, { count: number; mrr: number }> = {};
    clients.filter((c) => c.status === 'active').forEach((c) => {
      const plan = c.plan || 'NA';
      if (!byPlan[plan]) byPlan[plan] = { count: 0, mrr: 0 };
      byPlan[plan].count += 1;
      byPlan[plan].mrr += c.mrr;
    });
    return Object.entries(byPlan)
      .map(([name, { count, mrr }]) => ({
        name, count, mrr,
        fill: PLAN_COLORS[name] || '#94a3b8',
      }))
      .sort((a, b) => b.mrr - a.mrr);
  }, [clients]);

  /* ========== Chart 5: Top Clients by MRR (horizontal bar) ========== */
  const topClients = useMemo(() => {
    return clients
      .filter((c) => c.status === 'active' && c.mrr > 0)
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 8)
      .map((c) => ({
        name: c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name,
        mrr: c.mrr,
        partner: c.salesPartner || 'Direct',
        fill: PARTNER_COLORS[c.salesPartner || 'Direct'] || '#94a3b8',
      }));
  }, [clients]);

  /* ========== Chart 6: MRR by Partner over time (stacked area) ========== */
  const partnerNames = useMemo(() => {
    const names = new Set<string>();
    snapshots.forEach((s) => Object.keys(s.mrrByPartner).forEach((p) => names.add(p)));
    return Array.from(names);
  }, [snapshots]);

  const partnerTimeData = useMemo(() => {
    return snapshots.map((s) => {
      const row: Record<string, number | string> = { month: s.month };
      partnerNames.forEach((p) => { row[p] = s.mrrByPartner[p] || 0; });
      return row;
    });
  }, [snapshots, partnerNames]);

  /* ========== Commission summary ========== */
  const commissionSummary = useMemo(() => {
    const partners = getAllPartners();
    return partners.map((p) => {
      const partnerClients = clients.filter((c) => c.salesPartner === p.name && c.status === 'active');
      const partnerMRR = partnerClients.reduce((s, c) => s + c.mrr, 0);
      const monthlyCommission = (partnerMRR * p.commissionPercentage) / 100;
      return { name: p.name, mrr: partnerMRR, clients: partnerClients.length, rate: p.commissionPercentage, commission: monthlyCommission };
    }).filter((p) => p.mrr > 0);
  }, [clients, getAllPartners]);

  return (
    <PageShell
      title="Trends & Analytics"
      subtitle="Comprehensive revenue intelligence and business metrics"
      actions={
        <button
          onClick={handleCapture}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: '#00c853', color: '#1a1a1a', fontSize: 12, fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}
        >
          <Camera className="w-3.5 h-3.5" />
          {hasCurrentMonth ? `Update ${currentMonthLabel}` : `Capture ${currentMonthLabel}`}
        </button>
      }
    >
      {/* ===== Revenue Breakdown ===== */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24,
      }}>
        {/* Subscription Revenue */}
        <div style={{
          background: '#ffffff', borderRadius: 12, padding: 20,
          border: '1px solid #e0dbd2', borderLeft: '4px solid #00c853',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#00c853', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Subscription Revenue
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace", marginTop: 4 }}>
                {formatAED(metrics.subscriptionMRR)}
                <span style={{ fontSize: 12, color: '#999', fontWeight: 500, fontFamily: "'DM Sans', sans-serif" }}> /mo</span>
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>ARR</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>{formatAED(metrics.totalARR)}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f8f6f1', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>Subscribers</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
                {metrics.activeSubscriberCount}
                <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}> / {metrics.subscriberCount}</span>
              </p>
              <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>active / total</p>
            </div>
            <div style={{ background: '#f8f6f1', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>Avg MRR / Sub</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
                {formatAED(metrics.avgMRRPerSubscriber)}
              </p>
              <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>{metrics.totalSeats} seats total</p>
            </div>
            <div style={{ background: '#f8f6f1', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>MoM Growth</p>
              <p style={{
                fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                color: snapshots.length >= 2 ? (momGrowth >= 0 ? '#00a844' : '#ff3d00') : '#999',
              }}>
                {snapshots.length >= 2 ? formatDeltaPercent(momGrowth) : '—'}
              </p>
              <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>
                {latestSnapshot ? `${latestSnapshot.month}` : 'no snapshots'}
              </p>
            </div>
          </div>
        </div>

        {/* One-Time Revenue */}
        <div style={{
          background: '#ffffff', borderRadius: 12, padding: 20,
          border: '1px solid #e0dbd2', borderLeft: '4px solid #fbbf24',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#d97706', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 0.5 }}>
                One-Time Revenue
              </p>
              <p style={{ fontSize: 28, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace", marginTop: 4 }}>
                {formatAED(metrics.totalOneTimeRevenue)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>Revenue Mix</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
                {formatPercent(metrics.subscriptionShare)}
                <span style={{ fontSize: 10, color: '#999', fontWeight: 500 }}> recurring</span>
              </p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ background: '#f8f6f1', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>One-Time Clients</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
                {metrics.activeOneTimeCount}
                <span style={{ fontSize: 11, color: '#999', fontWeight: 500 }}> / {metrics.oneTimeClientCount}</span>
              </p>
              <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>active / total</p>
            </div>
            <div style={{ background: '#f8f6f1', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>Avg / Client</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Space Mono', monospace" }}>
                {formatAED(metrics.avgOneTimePerClient)}
              </p>
              <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>one-time avg</p>
            </div>
            <div style={{ background: '#f8f6f1', borderRadius: 8, padding: '10px 12px' }}>
              <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase' }}>Unit Economics</p>
              <p style={{
                fontSize: 18, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                color: unitEcon.marginPercent >= 40 ? '#00a844' : unitEcon.marginPercent >= 20 ? '#d97706' : '#ff3d00',
              }}>
                {formatPercent(unitEcon.marginPercent)}
              </p>
              <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>
                {formatAED(unitEcon.contributionPerSeat)}/seat
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Compact KPI row ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPICard
          title="Platform Cost / Seat"
          value={formatAED(DEFAULT_ASSUMPTIONS.platformLicensePerSeat)}
          accent="#ff6e40"
          subtitle={`${formatAED(unitEcon.totalCostPerSeat)} total cost/seat`}
        />
        <KPICard
          title="Net New MRR"
          value={latestSnapshot ? formatAED(latestSnapshot.netNewMRR) : '—'}
          accent="#7c4dff"
          subtitle={latestSnapshot ? `${latestSnapshot.month} snapshot` : 'no snapshots'}
        />
        <KPICard
          title="Total Clients"
          value={`${metrics.totalClients}`}
          accent="#2979ff"
          subtitle={`${metrics.activeCount} active`}
        />
        <KPICard
          title="Total Seats"
          value={`${metrics.totalSeats}`}
          accent="#10b981"
          subtitle={`across ${metrics.activeSubscriberCount} subscribers`}
        />
      </div>

      {/* ===== Revenue Over Time ===== */}
      <div style={{ marginBottom: 24 }}>
        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>Revenue Over Time</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#00c853' }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>Subscription</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#fbbf24' }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif" }}>One-Time</span>
            </div>
          </div>
          <div style={{ height: 230, position: 'relative' }}>
            {revenueTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTimeData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <defs>
                    <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c853" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#00c853" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="otGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}K`} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={tooltipBox}>
                        <p style={ttLabel}>{d.month}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 1, background: '#00c853' }} />
                          <span style={{ ...ttValue, color: 'rgba(255,255,255,0.6)', fontSize: 10, flex: 1, marginTop: 0 }}>Subscription</span>
                          <span style={{ ...ttValue, marginTop: 0 }}>{formatAED(d.subscriptionMRR)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 1, background: '#fbbf24' }} />
                          <span style={{ ...ttValue, color: 'rgba(255,255,255,0.6)', fontSize: 10, flex: 1, marginTop: 0 }}>One-Time</span>
                          <span style={{ ...ttValue, marginTop: 0 }}>{formatAED(d.oneTimeRevenue)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ ...ttValue, color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: 700, marginTop: 0 }}>Total</span>
                          <span style={{ ...ttValue, color: '#fff', fontWeight: 700, marginTop: 0 }}>{formatAED(d.totalRevenue)}</span>
                        </div>
                        <p style={{ ...ttValue, color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 4 }}>{d.clients} clients</p>
                      </div>
                    );
                  }} />
                  <Area type="monotone" dataKey="subscriptionMRR" stackId="revenue" stroke="#00c853" strokeWidth={2} fill="url(#subGrad)" />
                  <Area type="monotone" dataKey="oneTimeRevenue" stackId="revenue" stroke="#fbbf24" strokeWidth={2} fill="url(#otGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                  Capture monthly snapshots to see trends
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Row 2: Revenue by Partner + Plan Distribution ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>MRR by Sales Partner</h3>
          <div style={{ display: 'flex', gap: 24, position: 'relative' }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={partnerRevenueData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={80}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {partnerRevenueData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={tooltipBox}>
                        <p style={ttLabel}>{d.name}</p>
                        <p style={ttValue}>{formatAED(d.value)}</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
              {partnerRevenueData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif", flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 11, color: '#fff', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{formatAED(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>Revenue by Plan</h3>
          <div style={{ display: 'flex', gap: 24, position: 'relative' }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={80}
                    dataKey="mrr"
                    strokeWidth={0}
                  >
                    {planDistribution.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={tooltipBox}>
                        <p style={ttLabel}>{d.name}</p>
                        <p style={ttValue}>{formatAED(d.mrr)}/mo</p>
                        <p style={{ ...ttValue, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{d.count} client{d.count !== 1 ? 's' : ''}</p>
                      </div>
                    );
                  }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
              {planDistribution.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif", flex: 1 }}>{d.name}</span>
                  <span style={{ fontSize: 11, color: '#fff', fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>
                    {formatAED(d.mrr)} <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>({d.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Row 3: Top Clients + Partner Revenue Over Time ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>Top Clients by MRR</h3>
          <div style={{ height: 240, position: 'relative' }}>
            {topClients.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topClients} layout="vertical" margin={{ top: 4, right: 12, bottom: 4, left: 4 }}>
                  <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}K`} />
                  <YAxis type="category" dataKey="name" tick={{ ...axisTickDm, fontSize: 9 }} axisLine={false} tickLine={false} width={120} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={tooltipBox}>
                        <p style={ttLabel}>{d.name}</p>
                        <p style={ttValue}>{formatAED(d.mrr)}/mo</p>
                        <p style={{ ...ttValue, fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>via {d.partner}</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="mrr" radius={[0, 6, 6, 0]} barSize={16}>
                    {topClients.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>No active clients with MRR</p>
              </div>
            )}
          </div>
        </div>

        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>Partner Revenue Over Time</h3>
          <div style={{ height: 240, position: 'relative' }}>
            {partnerTimeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={partnerTimeData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${Math.round(v / 1000)}K`} />
                  <Tooltip content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div style={tooltipBox}>
                        <p style={ttLabel}>{label}</p>
                        {payload.filter((p) => Number(p.value) > 0).map((p) => (
                          <div key={p.dataKey as string} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <div style={{ width: 6, height: 6, borderRadius: 1, background: p.color }} />
                            <span style={{ ...ttValue, color: 'rgba(255,255,255,0.6)', fontSize: 10, flex: 1, marginTop: 0 }}>{p.dataKey as string}</span>
                            <span style={{ ...ttValue, marginTop: 0 }}>{formatAED(Number(p.value))}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }} />
                  {partnerNames.map((name) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stackId="1"
                      stroke={PARTNER_COLORS[name] || '#94a3b8'}
                      fill={PARTNER_COLORS[name] || '#94a3b8'}
                      fillOpacity={0.4}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Capture snapshots to see partner trends</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== Row 4: Unit Economics Summary + Commission Table ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Unit Economics */}
        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>Unit Economics (Per Seat)</h3>
          <div style={{ position: 'relative' }}>
            {[
              { label: 'Avg Revenue / Seat', value: formatAED(unitEcon.totalRevenuePerSeat), color: '#00c853' },
              { label: 'Platform Licence', value: formatAED(unitEcon.platformLicensePerSeat), color: '#ff6e40' },
              { label: 'Server / Seat', value: formatAED(unitEcon.serverPerSeat), color: '#fbbf24' },
              { label: 'Engineering / Seat', value: formatAED(unitEcon.engineeringPerSeat), color: '#a78bfa' },
              { label: 'Total Cost / Seat', value: formatAED(unitEcon.totalCostPerSeat), color: '#ff3d00' },
              { label: 'Contribution / Seat', value: formatAED(unitEcon.contributionPerSeat), color: unitEcon.contributionPerSeat >= 0 ? '#00c853' : '#ff3d00' },
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Sans', sans-serif" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color, fontFamily: "'Space Mono', monospace" }}>{row.value}</span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0', marginTop: 4,
            }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif" }}>Margin</span>
              <span style={{
                fontSize: 16, fontWeight: 700, fontFamily: "'Space Mono', monospace",
                color: unitEcon.marginPercent >= 40 ? '#00c853' : unitEcon.marginPercent >= 20 ? '#fbbf24' : '#ff3d00',
              }}>
                {formatPercent(unitEcon.marginPercent)}
              </span>
            </div>
          </div>
        </div>

        {/* Commission Summary */}
        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>Partner Commission Summary</h3>
          <div style={{ position: 'relative' }}>
            {commissionSummary.length > 0 ? (
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    {['Partner', 'Clients', 'MRR', 'Rate', 'Commission'].map((h) => (
                      <th key={h} style={{
                        padding: '8px 6px', textAlign: h === 'Partner' ? 'left' : 'right',
                        fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
                        fontSize: 9, letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {commissionSummary.map((p, i) => (
                    <tr key={p.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 600, color: PARTNER_COLORS[p.name] || 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif", fontSize: 11 }}>{p.name}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>{p.clients}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#fff' }}>{formatAED(p.mrr)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>{p.rate}%</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#fbbf24' }}>{formatAED(p.commission)}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '8px 6px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif", fontSize: 11 }}>Total</td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#fff' }}>
                      {commissionSummary.reduce((s, p) => s + p.clients, 0)}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#fff' }}>
                      {formatAED(commissionSummary.reduce((s, p) => s + p.mrr, 0))}
                    </td>
                    <td />
                    <td style={{ padding: '8px 6px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#fbbf24' }}>
                      {formatAED(commissionSummary.reduce((s, p) => s + p.commission, 0))}
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, fontFamily: "'DM Sans', sans-serif", padding: 24, textAlign: 'center' }}>
                No active partner-referred revenue
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Snapshot History Table ===== */}
      {snapshots.length > 0 && (
        <div style={chartCard}>
          <div style={dotGrid} />
          <h3 style={chartTitle}>Snapshot History</h3>
          <div style={{ overflowX: 'auto', position: 'relative' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                  {['Month', 'MRR', 'ARR', 'Clients', 'New', 'Expansion', 'Contraction', 'Churn', 'Net New', ''].map((h) => (
                    <th key={h} style={{
                      padding: '10px 8px',
                      textAlign: h === 'Month' || h === '' ? 'left' : 'right',
                      fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5,
                      fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...snapshots].reverse().map((snap, i) => (
                  <tr key={snap.month} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                    <td style={{ padding: '10px 8px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "'Space Mono', monospace" }}>{snap.month}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#fff' }}>{formatAED(snap.totalMRR)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>{formatAED(snap.totalARR)}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: 'rgba(255,255,255,0.6)' }}>{snap.clientCount}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#00c853' }}>{snap.newMRR > 0 ? `+${formatAED(snap.newMRR)}` : '—'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#2979ff' }}>{snap.expansionMRR > 0 ? `+${formatAED(snap.expansionMRR)}` : '—'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#ff9100' }}>{snap.contractionMRR > 0 ? `-${formatAED(snap.contractionMRR)}` : '—'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#ff3d00' }}>{snap.churnedMRR > 0 ? `-${formatAED(snap.churnedMRR)}` : '—'}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: snap.netNewMRR >= 0 ? '#00a844' : '#ff3d00' }}>
                      {snap.netNewMRR >= 0 ? '+' : ''}{formatAED(snap.netNewMRR)}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <button
                        onClick={() => { if (window.confirm(`Delete snapshot for ${snap.month}?`)) deleteSnapshot(snap.month); }}
                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: 2 }}
                        title="Delete"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
