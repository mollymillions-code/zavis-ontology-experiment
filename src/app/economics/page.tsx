'use client';

import { useState, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import { PartnerBadge } from '@/components/customers/PartnerBadge';
import { useClientStore } from '@/lib/store/customer-store';
import { formatAED, formatPercent } from '@/lib/utils/currency';
import {
  DEFAULT_ASSUMPTIONS,
  computeUnitEconomics,
  computeScaleEffect,
  computeClientUnitRows,
  PLAN_CONFIGS,
  computePlanEconomics,
} from '@/lib/utils/unit-economics';
import type { PlanEconomics } from '@/lib/utils/unit-economics';
import {
  ComposedChart, AreaChart, Area, BarChart, Bar, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
  CartesianGrid, ReferenceLine,
} from 'recharts';
import { RotateCcw, ArrowUpDown, ChevronDown } from 'lucide-react';

// ========== STYLES ==========

const chartCardStyle: React.CSSProperties = {
  background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
  borderRadius: 14,
  padding: 24,
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)',
  position: 'relative',
  overflow: 'hidden',
};

const chartTitleStyle: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700,
  fontSize: 13,
  color: 'rgba(255,255,255,0.7)',
  marginBottom: 16,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
};

const dotGrid: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
  backgroundSize: '24px 24px',
  borderRadius: 14,
  pointerEvents: 'none',
};

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  padding: 24,
  border: '1px solid #e0dbd2',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};

const mono: React.CSSProperties = { fontFamily: "'Space Mono', monospace" };
const dm: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const fieldLabel: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, color: '#666', ...dm, marginBottom: 2,
};

const sliderStyle = { width: '100%', accentColor: '#00c853', height: 4, marginTop: 2 };

// ========== REVENUE/COST STREAM BAR ==========

function StreamBar({ label, revenue, cost, maxVal }: {
  label: string; revenue: number; cost: number; maxVal: number;
}) {
  const revPct = maxVal > 0 ? (revenue / maxVal) * 100 : 0;
  const costPct = maxVal > 0 ? (cost / maxVal) * 100 : 0;
  const net = revenue - cost;

  return (
    <div style={{ marginBottom: 14 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', ...dm }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: net >= 0 ? '#00a844' : '#ff3d00', ...mono }}>
          {net >= 0 ? '+' : ''}{formatAED(Math.round(net))}
        </span>
      </div>
      {/* Revenue bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
        <span style={{ fontSize: 8, fontWeight: 600, color: '#10b981', ...dm, width: 24, textAlign: 'right' }}>REV</span>
        <div style={{ flex: 1, height: 16, background: '#f0ebe0', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${Math.min(revPct, 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #10b981, #00e676)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 6,
            transition: 'width 0.3s ease',
          }}>
            {revPct > 20 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', ...mono }}>{formatAED(Math.round(revenue))}</span>
            )}
          </div>
        </div>
        {revPct <= 20 && revenue > 0 && (
          <span style={{ fontSize: 9, fontWeight: 600, color: '#10b981', ...mono }}>{formatAED(Math.round(revenue))}</span>
        )}
      </div>
      {/* Cost bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 8, fontWeight: 600, color: '#ff6e40', ...dm, width: 24, textAlign: 'right' }}>COST</span>
        <div style={{ flex: 1, height: 16, background: '#f0ebe0', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${Math.min(costPct, 100)}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #ff6e40, #ff3d00)',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 6,
            transition: 'width 0.3s ease',
          }}>
            {costPct > 20 && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', ...mono }}>{formatAED(Math.round(cost))}</span>
            )}
          </div>
        </div>
        {costPct <= 20 && cost > 0 && (
          <span style={{ fontSize: 9, fontWeight: 600, color: '#ff6e40', ...mono }}>{formatAED(Math.round(cost))}</span>
        )}
      </div>
    </div>
  );
}

// ========== MAIN PAGE ==========

type SortKey = 'contributionPerSeat' | 'marginPercent' | 'revenuePerSeat' | 'totalContribution' | 'seats' | 'clientName';

export default function EconomicsPage() {
  const clients = useClientStore((s) => s.clients);

  // ===== ASSUMPTIONS STATE =====
  const [platLic, setPlatLic] = useState(DEFAULT_ASSUMPTIONS.platformLicensePerSeat);
  const [aiApiRate, setAiApiRate] = useState(DEFAULT_ASSUMPTIONS.aiApiCostRate);
  const [serverHost, setServerHost] = useState(DEFAULT_ASSUMPTIONS.serverHosting);
  const [eng, setEng] = useState(DEFAULT_ASSUMPTIONS.engineering);
  const [sw, setSw] = useState(DEFAULT_ASSUMPTIONS.softwareTools);
  const [acctMgmt, setAcctMgmt] = useState(DEFAULT_ASSUMPTIONS.accountMgmtPerClient);
  const [commRate, setCommRate] = useState(DEFAULT_ASSUMPTIONS.partnerCommissionRate);
  const [aiRev, setAiRev] = useState(DEFAULT_ASSUMPTIONS.aiAgentRevPerSeat);
  const [addOnRev, setAddOnRev] = useState(DEFAULT_ASSUMPTIONS.addOnRevPerSeat);

  // Seat price override for simulation
  const [seatPriceOverride, setSeatPriceOverride] = useState<number | null>(null);

  // Perspective: per-seat vs plan
  const [perspective, setPerspective] = useState<'seat' | 'plan'>('seat');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('pro');

  const assumptions = useMemo(() => ({
    platformLicensePerSeat: platLic,
    aiApiCostRate: aiApiRate,
    serverHosting: serverHost,
    engineering: eng,
    softwareTools: sw,
    accountMgmtPerClient: acctMgmt,
    partnerCommissionRate: commRate,
    aiAgentRevPerSeat: aiRev,
    addOnRevPerSeat: addOnRev,
  }), [platLic, aiApiRate, serverHost, eng, sw, acctMgmt, commRate, aiRev, addOnRev]);

  // ===== TABLE SORT =====
  const [sortKey, setSortKey] = useState<SortKey>('contributionPerSeat');
  const [sortAsc, setSortAsc] = useState(false);
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  // ===== COMPUTED =====
  const unit = useMemo(() => computeUnitEconomics(clients, assumptions), [clients, assumptions]);
  const scaleData = useMemo(() => computeScaleEffect(unit, assumptions, unit.activeClients), [unit, assumptions]);
  const clientRows = useMemo(() => {
    const rows = computeClientUnitRows(clients, assumptions);
    return rows.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string')
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [clients, assumptions, sortKey, sortAsc]);

  // Plan economics
  const planEcons = useMemo(() =>
    PLAN_CONFIGS.map((p) => computePlanEconomics(p, assumptions, unit.activeClients)),
    [assumptions, unit.activeClients],
  );
  const selectedPlanEcon: PlanEconomics | undefined = planEcons.find((p) => p.planId === selectedPlanId);

  // Simulated seat price (override or computed)
  const simSeatPrice = seatPriceOverride ?? Math.round(unit.subscriptionPerSeat);

  // 12-month stacked data — works for both seat and plan perspectives
  const stackedData = useMemo(() => {
    const months = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9', 'M10', 'M11', 'M12'];

    let platformLicenseVal: number, aiApiVal: number, serverVal: number,
        engVal: number, swVal: number, acctMgmtVal: number, commVal: number,
        totalCostVal: number, revVal: number;

    if (perspective === 'plan' && selectedPlanEcon) {
      platformLicenseVal = selectedPlanEcon.platformLicense;
      aiApiVal = selectedPlanEcon.aiApiCost;
      serverVal = selectedPlanEcon.serverCost;
      engVal = selectedPlanEcon.engineeringCost;
      swVal = selectedPlanEcon.softwareCost;
      acctMgmtVal = selectedPlanEcon.accountMgmt;
      commVal = selectedPlanEcon.commission;
      totalCostVal = selectedPlanEcon.totalCost;
      revVal = selectedPlanEcon.totalRevenue;
    } else {
      platformLicenseVal = unit.platformLicensePerSeat;
      aiApiVal = unit.aiApiCostPerSeat;
      serverVal = unit.serverPerSeat;
      engVal = unit.engineeringPerSeat;
      swVal = unit.softwarePerSeat;
      acctMgmtVal = unit.accountMgmtPerSeat;
      commVal = unit.commissionPerSeat;
      totalCostVal = unit.totalCostPerSeat;
      revVal = simSeatPrice + aiRev + addOnRev;
    }

    const profit = Math.max(revVal - totalCostVal, 0);

    return months.map((m) => ({
      month: m,
      platformLicense: platformLicenseVal,
      aiApi: aiApiVal,
      server: serverVal,
      engineering: engVal,
      software: swVal,
      accountMgmt: acctMgmtVal,
      commission: commVal,
      profit,
      revenue: revVal,
      totalCost: totalCostVal,
    }));
  }, [perspective, selectedPlanEcon, unit, simSeatPrice, aiRev, addOnRev]);

  const simMargin = useMemo(() => {
    if (perspective === 'plan' && selectedPlanEcon) {
      return selectedPlanEcon.marginPercent;
    }
    const rev = simSeatPrice + aiRev + addOnRev;
    const cost = unit.totalCostPerSeat;
    return rev > 0 ? ((rev - cost) / rev) * 100 : 0;
  }, [perspective, selectedPlanEcon, simSeatPrice, aiRev, addOnRev, unit.totalCostPerSeat]);

  function reset() {
    setSeatPriceOverride(null);
    setPlatLic(DEFAULT_ASSUMPTIONS.platformLicensePerSeat);
    setAiApiRate(DEFAULT_ASSUMPTIONS.aiApiCostRate);
    setServerHost(DEFAULT_ASSUMPTIONS.serverHosting);
    setEng(DEFAULT_ASSUMPTIONS.engineering);
    setSw(DEFAULT_ASSUMPTIONS.softwareTools);
    setAcctMgmt(DEFAULT_ASSUMPTIONS.accountMgmtPerClient);
    setCommRate(DEFAULT_ASSUMPTIONS.partnerCommissionRate);
    setAiRev(DEFAULT_ASSUMPTIONS.aiAgentRevPerSeat);
    setAddOnRev(DEFAULT_ASSUMPTIONS.addOnRevPerSeat);
  }

  const fmtAED = (n: number) => formatAED(Math.round(n));

  // Waterfall data for the cost breakdown chart
  const waterfallData = useMemo(() => [
    { name: 'Revenue', value: unit.totalRevenuePerSeat, fill: '#00e676' },
    { name: 'Platform License', value: -unit.platformLicensePerSeat, fill: '#ff6e40' },
    { name: 'AI API', value: -unit.aiApiCostPerSeat, fill: '#ff6e40' },
    { name: 'Server', value: -unit.serverPerSeat, fill: '#fbbf24' },
    { name: 'Engineering', value: -unit.engineeringPerSeat, fill: '#fbbf24' },
    { name: 'Software', value: -unit.softwarePerSeat, fill: '#fbbf24' },
    { name: 'Acct Mgmt', value: -unit.accountMgmtPerSeat, fill: '#a78bfa' },
    { name: 'Commission', value: -unit.commissionPerSeat, fill: '#a78bfa' },
    { name: 'Profit', value: unit.contributionPerSeat, fill: unit.contributionPerSeat >= 0 ? '#00c853' : '#ff3d00' },
  ].filter(d => Math.abs(d.value) > 0.5), [unit]);

  // Max value for stream bars
  const maxStreamVal = unit.totalRevenuePerSeat;

  // Health color
  const marginColor = unit.marginPercent >= 60 ? '#00c853' : unit.marginPercent >= 30 ? '#fbbf24' : '#ff3d00';

  const tdNum: React.CSSProperties = {
    padding: '7px 5px', textAlign: 'right', ...mono, fontSize: 10, color: 'rgba(255,255,255,0.6)',
  };

  return (
    <PageShell
      title="Unit Economics"
      subtitle="Per-seat cost anatomy & revenue stream analysis"
      actions={
        <button onClick={reset} style={{
          padding: '6px 12px', borderRadius: 8, border: '1px solid #e0dbd2', background: '#fff',
          fontSize: 11, fontWeight: 600, color: '#666', cursor: 'pointer', ...dm,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      }
    >
      {/* ===== PERSPECTIVE SELECTOR ===== */}
      <div className="flex items-center gap-4" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 4, background: '#f0ebe0', borderRadius: 10, padding: 4 }}>
          <button
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: perspective === 'seat' ? '#ffffff' : 'transparent',
              color: perspective === 'seat' ? '#1a1a1a' : '#666',
              fontWeight: perspective === 'seat' ? 700 : 500,
              fontSize: 12, ...dm, cursor: 'pointer',
              boxShadow: perspective === 'seat' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setPerspective('seat')}
          >
            Per Seat
          </button>
          <button
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: perspective === 'plan' ? '#ffffff' : 'transparent',
              color: perspective === 'plan' ? '#1a1a1a' : '#666',
              fontWeight: perspective === 'plan' ? 700 : 500,
              fontSize: 12, ...dm, cursor: 'pointer',
              boxShadow: perspective === 'plan' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
            onClick={() => setPerspective('plan')}
          >
            By Plan
          </button>
        </div>

        {perspective === 'plan' && (
          <div style={{ position: 'relative' }}>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              style={{
                padding: '8px 32px 8px 14px', borderRadius: 8,
                border: '1px solid #e0dbd2', background: '#ffffff',
                fontSize: 12, fontWeight: 600, ...dm, color: '#1a1a1a',
                cursor: 'pointer', appearance: 'none', outline: 'none',
              }}
            >
              {PLAN_CONFIGS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatAED(p.monthlyPrice)}/mo ({p.estimatedSeats} seats)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#999' }} />
          </div>
        )}

        {perspective === 'seat' && (
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 11, fontWeight: 600, color: '#666', ...dm }}>Avg. Seat Price</span>
            <input
              type="range"
              min={50}
              max={800}
              step={5}
              value={simSeatPrice}
              onChange={(e) => setSeatPriceOverride(+e.target.value)}
              style={{ width: 160, accentColor: '#00c853', height: 4 }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#00c853', ...mono, minWidth: 70 }}>{formatAED(simSeatPrice)}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, ...mono,
              padding: '3px 10px', borderRadius: 20,
              background: simMargin >= 60 ? 'rgba(0,200,83,0.12)' : simMargin >= 30 ? 'rgba(251,191,36,0.12)' : 'rgba(255,61,0,0.12)',
              color: simMargin >= 60 ? '#00c853' : simMargin >= 30 ? '#fbbf24' : '#ff3d00',
            }}>
              {formatPercent(simMargin)} margin
            </span>
          </div>
        )}
      </div>

      {/* ===== REVENUE ENVELOPE (Stacked Area Chart) ===== */}
      <div style={{ ...chartCardStyle, marginBottom: 20 }}>
        <div style={dotGrid} />
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <h3 style={chartTitleStyle}>
            {perspective === 'plan' && selectedPlanEcon
              ? `${selectedPlanEcon.planName} Plan — Revenue Envelope`
              : 'Per-Seat Revenue Envelope'}
          </h3>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', ...dm }}>
              12-month steady-state projection
            </span>
          </div>
        </div>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', ...dm, marginTop: -8, marginBottom: 16 }}>
          {perspective === 'plan' && selectedPlanEcon
            ? `Unit: 1 ${selectedPlanEcon.planName} subscription (${selectedPlanEcon.estimatedSeats} seats) · ${formatAED(selectedPlanEcon.totalRevenue)}/mo revenue`
            : `Unit: 1 seat · ${formatAED(simSeatPrice + aiRev + addOnRev)}/mo revenue`
          }
        </p>

        <div style={{ height: 320, position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stackedData} margin={{ top: 10, right: 12, bottom: 4, left: 12 }}>
              <defs>
                <linearGradient id="env-plat" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff6e40" stopOpacity={0.85} />
                  <stop offset="100%" stopColor="#ff6e40" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="env-ai" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff8a65" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#ff8a65" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="env-server" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity={0.55} />
                </linearGradient>
                <linearGradient id="env-eng" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="env-sw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d97706" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#d97706" stopOpacity={0.45} />
                </linearGradient>
                <linearGradient id="env-acct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.75} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="env-comm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.7} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.45} />
                </linearGradient>
                <linearGradient id="env-profit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00c853" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#00e676" stopOpacity={0.15} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.4)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.3)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${Math.round(v)}`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0]?.payload;
                  if (!d) return null;
                  const costItems = [
                    { label: 'Platform License', value: d.platformLicense, color: '#ff6e40' },
                    { label: 'AI API', value: d.aiApi, color: '#ff8a65' },
                    { label: 'Server', value: d.server, color: '#fbbf24' },
                    { label: 'Engineering', value: d.engineering, color: '#f59e0b' },
                    { label: 'Software', value: d.software, color: '#d97706' },
                    { label: 'Acct Mgmt', value: d.accountMgmt, color: '#a78bfa' },
                    { label: 'Commission', value: d.commission, color: '#8b5cf6' },
                  ].filter(c => c.value > 0.5);
                  return (
                    <div style={{
                      background: 'rgba(20,20,35,0.95)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                      padding: '12px 16px', color: '#fff', minWidth: 200,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                      <div className="flex justify-between" style={{ marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, ...dm, color: 'rgba(255,255,255,0.5)' }}>{d.month}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, ...mono, color: '#60a5fa' }}>Rev: {fmtAED(d.revenue)}</span>
                      </div>
                      {costItems.map((c) => (
                        <div key={c.label} className="flex justify-between" style={{ marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: c.color, ...dm }}>{c.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, ...mono, color: 'rgba(255,255,255,0.5)' }}>−{fmtAED(c.value)}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 6, paddingTop: 6 }}>
                        <div className="flex justify-between">
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#00e676', ...dm }}>Profit</span>
                          <span style={{ fontSize: 12, fontWeight: 700, ...mono, color: d.profit > 0 ? '#00e676' : '#ff3d00' }}>{fmtAED(d.profit)}</span>
                        </div>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', ...mono }}>
                          {d.revenue > 0 ? formatPercent((d.profit / d.revenue) * 100) : '0%'} margin
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
              {/* Stacked cost areas */}
              <Area stackId="envelope" type="monotone" dataKey="platformLicense" fill="url(#env-plat)" stroke="none" />
              <Area stackId="envelope" type="monotone" dataKey="aiApi" fill="url(#env-ai)" stroke="none" />
              <Area stackId="envelope" type="monotone" dataKey="server" fill="url(#env-server)" stroke="none" />
              <Area stackId="envelope" type="monotone" dataKey="engineering" fill="url(#env-eng)" stroke="none" />
              <Area stackId="envelope" type="monotone" dataKey="software" fill="url(#env-sw)" stroke="none" />
              <Area stackId="envelope" type="monotone" dataKey="accountMgmt" fill="url(#env-acct)" stroke="none" />
              <Area stackId="envelope" type="monotone" dataKey="commission" fill="url(#env-comm)" stroke="none" />
              {/* Profit fills the gap to revenue */}
              <Area stackId="envelope" type="monotone" dataKey="profit" fill="url(#env-profit)" stroke="none" />
              {/* Revenue ceiling line */}
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#60a5fa"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#60a5fa', stroke: 'rgba(96,165,250,0.3)', strokeWidth: 4 }}
              />
              {/* Cost reference line */}
              <ReferenceLine
                y={stackedData[0]?.totalCost ?? 0}
                stroke="rgba(255,107,64,0.5)"
                strokeDasharray="6 4"
                label={{ value: `Total Cost: ${fmtAED(stackedData[0]?.totalCost ?? 0)}`, fill: 'rgba(255,255,255,0.35)', fontSize: 9 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4" style={{ marginTop: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Platform License', color: '#ff6e40' },
            { label: 'AI API', color: '#ff8a65' },
            { label: 'Server', color: '#fbbf24' },
            { label: 'Engineering', color: '#f59e0b' },
            { label: 'Software', color: '#d97706' },
            { label: 'Acct Mgmt', color: '#a78bfa' },
            { label: 'Commission', color: '#8b5cf6' },
            { label: 'Profit', color: '#00c853' },
            { label: 'Revenue', color: '#60a5fa' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div style={{ width: 8, height: 8, borderRadius: item.label === 'Revenue' ? '50%' : 2, background: item.color }} />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.45)', ...dm }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ===== PERSPECTIVE: PER SEAT ===== */}
      {perspective === 'seat' && (
        <>
          {/* ROW 1: The Unit Hero + Revenue ↔ Cost Streams */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
            {/* THE UNIT CARD */}
            <div style={{
              background: 'linear-gradient(135deg, #0a2a1a 0%, #0d1a0d 40%, #1a2e1a 100%)',
              borderRadius: 16, padding: 28,
              border: '1px solid rgba(0,200,83,0.15)',
              boxShadow: '0 8px 40px rgba(0,200,83,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,200,83,0.04) 1px, transparent 0)', backgroundSize: '20px 20px', pointerEvents: 'none' }} />
              <div style={{ position: 'relative', marginBottom: 24 }}>
                <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(0,200,83,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>💺</div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', ...dm, textTransform: 'uppercase', letterSpacing: 1 }}>Anatomy of One Seat</p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', ...dm }}>{unit.totalSeats} total seats · {unit.activeClients} clients</p>
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', ...dm, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Revenue per seat</p>
                <p style={{ fontSize: 32, fontWeight: 700, color: '#00e676', ...mono, lineHeight: 1 }}>{fmtAED(unit.totalRevenuePerSeat)}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', ...mono, marginTop: 2 }}>/month</p>
              </div>
              <div style={{ position: 'relative', marginBottom: 20 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', ...dm, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Total cost per seat</p>
                <p style={{ fontSize: 24, fontWeight: 700, color: '#ff6e40', ...mono, lineHeight: 1 }}>{fmtAED(unit.totalCostPerSeat)}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', ...mono }}>Direct: {fmtAED(unit.totalDirectCostPerSeat)}</span>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', ...mono }}>Shared: {fmtAED(unit.totalSharedCostPerSeat)}</span>
                </div>
              </div>
              <div style={{ borderTop: '2px solid rgba(0,200,83,0.2)', margin: '0 0 16px' }} />
              <div style={{ position: 'relative' }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', ...dm, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Contribution per seat</p>
                <div className="flex items-end gap-3">
                  <p style={{ fontSize: 28, fontWeight: 700, color: marginColor, ...mono, lineHeight: 1 }}>{fmtAED(unit.contributionPerSeat)}</p>
                  <div style={{ padding: '3px 10px', borderRadius: 20, background: `${marginColor}20`, marginBottom: 2 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: marginColor, ...mono }}>{formatPercent(unit.marginPercent)}</span>
                  </div>
                </div>
              </div>
              <div style={{ position: 'relative', marginTop: 16 }}>
                <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ width: `${(unit.totalDirectCostPerSeat / unit.totalRevenuePerSeat) * 100}%`, background: '#ff6e40', transition: 'width 0.3s' }} />
                  <div style={{ width: `${(unit.totalSharedCostPerSeat / unit.totalRevenuePerSeat) * 100}%`, background: '#fbbf24', transition: 'width 0.3s' }} />
                  <div style={{ flex: 1, background: '#00c853' }} />
                </div>
                <div className="flex justify-between" style={{ marginTop: 4 }}>
                  <span style={{ fontSize: 8, color: '#ff6e40', ...dm, fontWeight: 600 }}>Direct {formatPercent((unit.totalDirectCostPerSeat / unit.totalRevenuePerSeat) * 100, 0)}</span>
                  <span style={{ fontSize: 8, color: '#fbbf24', ...dm, fontWeight: 600 }}>Shared {formatPercent((unit.totalSharedCostPerSeat / unit.totalRevenuePerSeat) * 100, 0)}</span>
                  <span style={{ fontSize: 8, color: '#00c853', ...dm, fontWeight: 600 }}>Profit {formatPercent(unit.marginPercent, 0)}</span>
                </div>
              </div>
            </div>

            {/* REVENUE ↔ COST STREAMS */}
            <div style={{ ...cardStyle, borderLeft: '4px solid #10b981' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Revenue ↔ Cost Per Seat</p>
              <p style={{ fontSize: 10, color: '#999', ...dm, marginBottom: 16 }}>Each revenue stream paired with its direct cost</p>
              <StreamBar label="Subscription ↔ Platform License" revenue={unit.subscriptionPerSeat} cost={unit.platformLicensePerSeat} maxVal={maxStreamVal} />
              <StreamBar label="AI Agent Usage ↔ API Fees" revenue={unit.aiRevenuePerSeat} cost={unit.aiApiCostPerSeat} maxVal={maxStreamVal} />
              <StreamBar label="Add-Ons ↔ Delivery Cost" revenue={unit.addOnPerSeat} cost={0} maxVal={maxStreamVal} />
              <div style={{ borderTop: '1px solid #e0dbd2', paddingTop: 12, marginTop: 4 }}>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#999', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Shared Platform Costs (allocated per seat)</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Server Hosting', value: unit.serverPerSeat, total: assumptions.serverHosting, color: '#fbbf24' },
                    { label: 'Engineering', value: unit.engineeringPerSeat, total: assumptions.engineering, color: '#fbbf24' },
                    { label: 'Software Tools', value: unit.softwarePerSeat, total: assumptions.softwareTools, color: '#fbbf24' },
                    { label: 'Account Mgmt', value: unit.accountMgmtPerSeat, total: assumptions.accountMgmtPerClient * unit.activeClients, color: '#a78bfa' },
                    { label: 'Commission', value: unit.commissionPerSeat, total: unit.commissionPerSeat * unit.totalSeats, color: '#a78bfa' },
                  ].filter(c => c.value > 0.5).map((c) => (
                    <div key={c.label} style={{ padding: '8px 10px', borderRadius: 8, background: `${c.color}08`, border: `1px solid ${c.color}15` }}>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#666', ...dm }}>{c.label}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.color, ...mono }}>{fmtAED(c.value)}</span>
                      </div>
                      <span style={{ fontSize: 8, color: '#999', ...mono }}>{fmtAED(c.total)} total ÷ {unit.totalSeats} seats</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ROW 2: Cost Waterfall + Scale Effect */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
            <div style={chartCardStyle}>
              <div style={dotGrid} />
              <h3 style={chartTitleStyle}>Per-Seat Cost Waterfall</h3>
              <div style={{ height: 260, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={waterfallData} margin={{ top: 8, right: 8, bottom: 4, left: 8 }}>
                    <defs><filter id="wf-glow"><feGaussianBlur stdDeviation="2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: "'DM Sans', sans-serif", fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}`} />
                    <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'rgba(20,20,35,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, ...dm, color: 'rgba(255,255,255,0.6)' }}>{d.name}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, ...mono, color: d.value >= 0 ? '#00e676' : '#ff6e40', marginTop: 2 }}>{d.value >= 0 ? '' : '-'}{fmtAED(Math.abs(d.value))}/seat</p>
                          {unit.totalRevenuePerSeat > 0 && <p style={{ fontSize: 10, ...mono, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{formatPercent(Math.abs(d.value) / unit.totalRevenuePerSeat * 100, 1)} of revenue</p>}
                        </div>
                      );
                    }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} style={{ filter: 'url(#wf-glow)' }}>
                      {waterfallData.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={chartCardStyle}>
              <div style={dotGrid} />
              <h3 style={chartTitleStyle}>Margin at Scale</h3>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', ...dm, marginTop: -10, marginBottom: 12 }}>How per-seat margin improves as shared costs dilute across more seats</p>
              <div style={{ height: 220, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={scaleData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <defs><linearGradient id="scale-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#00c853" stopOpacity={0.3} /><stop offset="100%" stopColor="#00c853" stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="seats" tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} domain={[0, 100]} />
                    <ReferenceLine y={unit.marginPercent} stroke="#00c853" strokeDasharray="5 5" strokeOpacity={0.5} label={{ value: `Current: ${formatPercent(unit.marginPercent)}`, fill: '#00c853', fontSize: 9 }} />
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div style={{ background: 'rgba(20,20,35,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, ...dm, color: 'rgba(255,255,255,0.6)' }}>{d.seats} seats</p>
                          <p style={{ fontSize: 14, fontWeight: 700, ...mono, color: '#00e676', marginTop: 2 }}>{formatPercent(d.marginPercent)} margin</p>
                          <p style={{ fontSize: 10, ...mono, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{fmtAED(d.contributionPerSeat)}/seat · {fmtAED(d.totalContribution)} total</p>
                        </div>
                      );
                    }} />
                    <Area type="monotone" dataKey="marginPercent" stroke="#00c853" strokeWidth={2} fill="url(#scale-fill)" dot={{ r: 4, fill: '#00c853', stroke: 'rgba(0,200,83,0.3)', strokeWidth: 4 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c853', boxShadow: '0 0 6px rgba(0,200,83,0.5)' }} />
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', ...dm }}>You are at <strong style={{ color: '#fff' }}>{unit.totalSeats} seats</strong> · {formatPercent(unit.marginPercent)} margin</span>
              </div>
            </div>
          </div>

          {/* CLIENT UNIT ECONOMICS TABLE */}
          <div style={chartCardStyle}>
            <div style={dotGrid} />
            <h3 style={chartTitleStyle}>Client Unit Economics</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: 900 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    {[
                      { key: 'clientName', label: 'Client', align: 'left' },
                      { key: null, label: 'Partner', align: 'left' },
                      { key: 'seats', label: 'Seats', align: 'right' },
                      { key: 'revenuePerSeat', label: 'Rev/Seat', align: 'right' },
                      { key: null, label: 'Direct', align: 'right' },
                      { key: null, label: 'Shared', align: 'right' },
                      { key: null, label: 'Cost/Seat', align: 'right' },
                      { key: 'contributionPerSeat', label: 'Contribution/Seat', align: 'right' },
                      { key: 'marginPercent', label: 'Margin', align: 'right' },
                      { key: 'totalContribution', label: 'Total Contribution', align: 'right' },
                      { key: null, label: '', align: 'center' },
                    ].map((col) => (
                      <th key={col.label || 'health'} onClick={col.key ? () => toggleSort(col.key as SortKey) : undefined} style={{ padding: '8px 5px', textAlign: col.align as 'left' | 'right' | 'center', fontWeight: 600, color: sortKey === col.key ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)', textTransform: 'uppercase', fontSize: 8, letterSpacing: 0.3, ...dm, whiteSpace: 'nowrap', cursor: col.key ? 'pointer' : 'default', userSelect: 'none' }}>
                        {col.label}
                        {col.key && sortKey === col.key && <ArrowUpDown className="w-2 h-2 inline-block ml-0.5" style={{ color: '#00c853', verticalAlign: 'text-bottom' }} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientRows.map((r, i) => {
                    const mColor = r.marginPercent >= 60 ? '#00e676' : r.marginPercent >= 30 ? '#fbbf24' : '#ff6e40';
                    const health = r.marginPercent >= 60 ? '#00c853' : r.marginPercent >= 30 ? '#fbbf24' : '#ff3d00';
                    return (
                      <tr key={r.clientId} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: r.marginPercent < 30 ? 'rgba(255,61,0,0.03)' : i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                        <td style={{ padding: '7px 5px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', ...dm, fontSize: 10, whiteSpace: 'nowrap', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.clientName}</td>
                        <td style={{ padding: '7px 5px' }}><PartnerBadge partner={r.salesPartner === 'Direct' ? null : r.salesPartner} /></td>
                        <td style={tdNum}>{r.seats}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: '#00e676' }}>{fmtAED(r.revenuePerSeat)}</td>
                        <td style={{ ...tdNum, color: '#ff6e40' }}>{fmtAED(r.directCostPerSeat)}</td>
                        <td style={{ ...tdNum, color: '#fbbf24' }}>{fmtAED(r.sharedCostPerSeat)}</td>
                        <td style={{ ...tdNum, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{fmtAED(r.totalCostPerSeat)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: r.contributionPerSeat >= 0 ? '#00e676' : '#ff6e40' }}>{fmtAED(r.contributionPerSeat)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: mColor }}>{formatPercent(r.marginPercent)}</td>
                        <td style={{ ...tdNum, fontWeight: 700, color: r.totalContribution >= 0 ? '#00e676' : '#ff6e40' }}>{fmtAED(r.totalContribution)}</td>
                        <td style={{ ...tdNum, textAlign: 'center' }}><span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', backgroundColor: health, boxShadow: `0 0 5px ${health}60` }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}>
                    <td style={{ padding: '8px 5px', fontWeight: 700, color: 'rgba(255,255,255,0.8)', ...dm, fontSize: 10 }}>Total ({clientRows.length})</td>
                    <td />
                    <td style={tdNum}>{clientRows.reduce((s, r) => s + r.seats, 0)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#00e676' }}>{fmtAED(unit.totalRevenuePerSeat)}</td>
                    <td style={{ ...tdNum, color: '#ff6e40' }}>{fmtAED(unit.totalDirectCostPerSeat)}</td>
                    <td style={{ ...tdNum, color: '#fbbf24' }}>{fmtAED(unit.totalSharedCostPerSeat)}</td>
                    <td style={{ ...tdNum, fontWeight: 600 }}>{fmtAED(unit.totalCostPerSeat)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#00e676' }}>{fmtAED(unit.contributionPerSeat)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: marginColor }}>{formatPercent(unit.marginPercent)}</td>
                    <td style={{ ...tdNum, fontWeight: 700, color: '#00e676' }}>{fmtAED(clientRows.reduce((s, r) => s + r.totalContribution, 0))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== PERSPECTIVE: BY PLAN ===== */}
      {perspective === 'plan' && (
        <>
          {/* PLAN COMPARISON CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
            {planEcons.map((pe) => {
              const isSelected = pe.planId === selectedPlanId;
              const planColor = PLAN_CONFIGS.find(p => p.id === pe.planId)?.color ?? '#60a5fa';
              const pMarginColor = pe.marginPercent >= 60 ? '#00c853' : pe.marginPercent >= 30 ? '#fbbf24' : '#ff3d00';
              return (
                <div
                  key={pe.planId}
                  onClick={() => setSelectedPlanId(pe.planId)}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, ${planColor}12 0%, ${planColor}05 100%)`
                      : '#ffffff',
                    borderRadius: 14, padding: 20, cursor: 'pointer',
                    border: isSelected ? `2px solid ${planColor}` : '1px solid #e0dbd2',
                    boxShadow: isSelected ? `0 4px 20px ${planColor}20` : '0 1px 3px rgba(0,0,0,0.04)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                    <div className="flex items-center gap-2">
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: planColor, boxShadow: isSelected ? `0 0 8px ${planColor}60` : 'none' }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', ...dm }}>{pe.planName}</span>
                    </div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: planColor, ...mono }}>{fmtAED(pe.monthlyPrice)}</span>
                  </div>
                  <p style={{ fontSize: 9, color: '#999', ...dm, marginBottom: 10 }}>{pe.estimatedSeats} seats included · {fmtAED(pe.revenuePerSeat)}/seat effective</p>

                  {/* Mini P&L */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                    <div style={{ padding: '6px 8px', borderRadius: 6, background: '#f5f0e8' }}>
                      <p style={{ fontSize: 8, fontWeight: 600, color: '#999', ...dm, textTransform: 'uppercase' }}>Revenue</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#00a844', ...mono }}>{fmtAED(pe.totalRevenue)}</p>
                    </div>
                    <div style={{ padding: '6px 8px', borderRadius: 6, background: '#f5f0e8' }}>
                      <p style={{ fontSize: 8, fontWeight: 600, color: '#999', ...dm, textTransform: 'uppercase' }}>Total Cost</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#ff6e40', ...mono }}>{fmtAED(pe.totalCost)}</p>
                    </div>
                  </div>

                  {/* Contribution + Margin */}
                  <div className="flex items-center justify-between" style={{ padding: '8px 10px', borderRadius: 8, background: `${pMarginColor}08`, border: `1px solid ${pMarginColor}20` }}>
                    <div>
                      <p style={{ fontSize: 8, fontWeight: 600, color: '#999', ...dm, textTransform: 'uppercase' }}>Contribution</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: pMarginColor, ...mono }}>{fmtAED(pe.contribution)}</p>
                    </div>
                    <div style={{ padding: '4px 12px', borderRadius: 20, background: `${pMarginColor}15` }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: pMarginColor, ...mono }}>{formatPercent(pe.marginPercent)}</span>
                    </div>
                  </div>

                  {/* Cost bar */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', display: 'flex', background: '#f0ebe0' }}>
                      <div style={{ width: `${pe.totalRevenue > 0 ? (pe.totalDirectCost / pe.totalRevenue) * 100 : 0}%`, background: '#ff6e40', transition: 'width 0.3s' }} />
                      <div style={{ width: `${pe.totalRevenue > 0 ? (pe.totalSharedCost / pe.totalRevenue) * 100 : 0}%`, background: '#fbbf24', transition: 'width 0.3s' }} />
                      <div style={{ flex: 1, background: '#00c853' }} />
                    </div>
                    <div className="flex justify-between" style={{ marginTop: 3 }}>
                      <span style={{ fontSize: 7, color: '#ff6e40', ...dm, fontWeight: 600 }}>Direct {fmtAED(pe.totalDirectCost)}</span>
                      <span style={{ fontSize: 7, color: '#fbbf24', ...dm, fontWeight: 600 }}>Shared {fmtAED(pe.totalSharedCost)}</span>
                      <span style={{ fontSize: 7, color: '#00c853', ...dm, fontWeight: 600 }}>Profit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* SELECTED PLAN DEEP DIVE */}
          {selectedPlanEcon && (() => {
            const planColor = PLAN_CONFIGS.find(p => p.id === selectedPlanEcon.planId)?.color ?? '#60a5fa';
            const pMarginColor = selectedPlanEcon.marginPercent >= 60 ? '#00c853' : selectedPlanEcon.marginPercent >= 30 ? '#fbbf24' : '#ff3d00';
            const planMaxStream = selectedPlanEcon.totalRevenue;
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 20 }}>
                {/* PLAN ANATOMY CARD */}
                <div style={{
                  background: `linear-gradient(135deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)`,
                  borderRadius: 16, padding: 28,
                  border: `1px solid ${planColor}40`,
                  boxShadow: `0 8px 40px ${planColor}15, inset 0 1px 0 rgba(255,255,255,0.04)`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={dotGrid} />
                  <div style={{ position: 'relative', marginBottom: 24 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${planColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: planColor }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', ...dm, textTransform: 'uppercase', letterSpacing: 1 }}>Anatomy of {selectedPlanEcon.planName} Plan</p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', ...dm }}>{selectedPlanEcon.estimatedSeats} seats included · {fmtAED(selectedPlanEcon.monthlyPrice)}/mo</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 20 }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', ...dm, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Revenue per plan</p>
                    <p style={{ fontSize: 32, fontWeight: 700, color: planColor, ...mono, lineHeight: 1 }}>{fmtAED(selectedPlanEcon.totalRevenue)}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', ...mono, marginTop: 2 }}>{fmtAED(selectedPlanEcon.revenuePerSeat)}/seat · {selectedPlanEcon.estimatedSeats} seats</p>
                  </div>
                  <div style={{ position: 'relative', marginBottom: 20 }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', ...dm, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Total cost per plan</p>
                    <p style={{ fontSize: 24, fontWeight: 700, color: '#ff6e40', ...mono, lineHeight: 1 }}>{fmtAED(selectedPlanEcon.totalCost)}</p>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', ...mono }}>Direct: {fmtAED(selectedPlanEcon.totalDirectCost)}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', ...mono }}>Shared: {fmtAED(selectedPlanEcon.totalSharedCost)}</span>
                    </div>
                  </div>
                  <div style={{ borderTop: `2px solid ${planColor}30`, margin: '0 0 16px' }} />
                  <div style={{ position: 'relative' }}>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', ...dm, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Contribution per plan</p>
                    <div className="flex items-end gap-3">
                      <p style={{ fontSize: 28, fontWeight: 700, color: pMarginColor, ...mono, lineHeight: 1 }}>{fmtAED(selectedPlanEcon.contribution)}</p>
                      <div style={{ padding: '3px 10px', borderRadius: 20, background: `${pMarginColor}20`, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: pMarginColor, ...mono }}>{formatPercent(selectedPlanEcon.marginPercent)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PLAN REVENUE ↔ COST STREAMS */}
                <div style={{ ...cardStyle, borderLeft: `4px solid ${planColor}` }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Revenue ↔ Cost — {selectedPlanEcon.planName} Plan</p>
                  <p style={{ fontSize: 10, color: '#999', ...dm, marginBottom: 16 }}>Each revenue stream paired with its direct cost per {selectedPlanEcon.planName} subscription</p>
                  <StreamBar label="Subscription ↔ Platform License" revenue={selectedPlanEcon.subscriptionRevenue} cost={selectedPlanEcon.platformLicense} maxVal={planMaxStream} />
                  <StreamBar label="AI Agent Usage ↔ API Fees" revenue={selectedPlanEcon.aiRevenue} cost={selectedPlanEcon.aiApiCost} maxVal={planMaxStream} />
                  <StreamBar label="Add-Ons ↔ Delivery Cost" revenue={selectedPlanEcon.addOnRevenue} cost={0} maxVal={planMaxStream} />
                  <div style={{ borderTop: '1px solid #e0dbd2', paddingTop: 12, marginTop: 4 }}>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#999', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Shared Platform Costs (allocated per plan)</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Server Hosting', value: selectedPlanEcon.serverCost, color: '#fbbf24' },
                        { label: 'Engineering', value: selectedPlanEcon.engineeringCost, color: '#fbbf24' },
                        { label: 'Software Tools', value: selectedPlanEcon.softwareCost, color: '#fbbf24' },
                        { label: 'Account Mgmt', value: selectedPlanEcon.accountMgmt, color: '#a78bfa' },
                        { label: 'Commission', value: selectedPlanEcon.commission, color: '#a78bfa' },
                      ].filter(c => c.value > 0.5).map((c) => (
                        <div key={c.label} style={{ padding: '8px 10px', borderRadius: 8, background: `${c.color}08`, border: `1px solid ${c.color}15` }}>
                          <div className="flex items-center justify-between">
                            <span style={{ fontSize: 10, fontWeight: 600, color: '#666', ...dm }}>{c.label}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: c.color, ...mono }}>{fmtAED(c.value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* ===== ASSUMPTION CONTROLS (shared across perspectives) ===== */}
      <div style={{ ...cardStyle, marginBottom: 20, padding: 16 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#1a1a1a', ...dm, textTransform: 'uppercase', letterSpacing: 0.5 }}>Assumptions</p>
          <span style={{ fontSize: 10, color: '#999', ...dm }}>Adjust to model what-if scenarios</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: '#ff6e40', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Direct Costs</p>
            <div style={{ marginBottom: 8 }}>
              <div className="flex justify-between"><span style={fieldLabel}>Platform License/Seat</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{platLic} AED</span></div>
              <input type="range" min={0} max={50} step={1} value={platLic} onChange={(e) => setPlatLic(+e.target.value)} style={sliderStyle} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div className="flex justify-between"><span style={fieldLabel}>AI API Cost Rate</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{(aiApiRate * 100).toFixed(0)}%</span></div>
              <input type="range" min={0.1} max={0.90} step={0.05} value={aiApiRate} onChange={(e) => setAiApiRate(+e.target.value)} style={sliderStyle} />
            </div>
            <div>
              <div className="flex justify-between"><span style={fieldLabel}>Partner Commission</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{(commRate * 100).toFixed(0)}%</span></div>
              <input type="range" min={0} max={0.30} step={0.01} value={commRate} onChange={(e) => setCommRate(+e.target.value)} style={sliderStyle} />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: '#fbbf24', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Shared Platform Costs</p>
            <div style={{ marginBottom: 8 }}>
              <div className="flex justify-between"><span style={fieldLabel}>Server Hosting (total)</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{serverHost} AED</span></div>
              <input type="range" min={100} max={5000} step={100} value={serverHost} onChange={(e) => setServerHost(+e.target.value)} style={sliderStyle} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div className="flex justify-between"><span style={fieldLabel}>Engineering</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{eng} AED</span></div>
              <input type="range" min={0} max={5000} step={100} value={eng} onChange={(e) => setEng(+e.target.value)} style={sliderStyle} />
            </div>
            <div style={{ marginBottom: 8 }}>
              <div className="flex justify-between"><span style={fieldLabel}>Software Tools</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{sw} AED</span></div>
              <input type="range" min={0} max={3000} step={50} value={sw} onChange={(e) => setSw(+e.target.value)} style={sliderStyle} />
            </div>
            <div>
              <div className="flex justify-between"><span style={fieldLabel}>Account Mgmt/Client</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{acctMgmt} AED</span></div>
              <input type="range" min={0} max={500} step={25} value={acctMgmt} onChange={(e) => setAcctMgmt(+e.target.value)} style={sliderStyle} />
            </div>
          </div>
          <div>
            <p style={{ fontSize: 8, fontWeight: 700, color: '#10b981', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Revenue Per Seat</p>
            <div style={{ marginBottom: 8 }}>
              <div className="flex justify-between"><span style={fieldLabel}>AI Agent Revenue</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{aiRev} AED</span></div>
              <input type="range" min={0} max={300} step={5} value={aiRev} onChange={(e) => setAiRev(+e.target.value)} style={sliderStyle} />
            </div>
            <div>
              <div className="flex justify-between"><span style={fieldLabel}>Add-On Revenue</span><span style={{ fontSize: 11, fontWeight: 700, ...mono, color: '#1a1a1a' }}>{addOnRev} AED</span></div>
              <input type="range" min={0} max={200} step={5} value={addOnRev} onChange={(e) => setAddOnRev(+e.target.value)} style={sliderStyle} />
            </div>
            <div style={{ marginTop: 16, padding: '10px 12px', background: '#f5f0e8', borderRadius: 8 }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: '#999', ...dm, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Monthly Totals</p>
              <div className="flex justify-between"><span style={{ fontSize: 10, color: '#666', ...dm }}>Total MRR</span><span style={{ fontSize: 11, fontWeight: 700, color: '#00a844', ...mono }}>{fmtAED(unit.totalMRR)}</span></div>
              <div className="flex justify-between"><span style={{ fontSize: 10, color: '#666', ...dm }}>Total Contribution</span><span style={{ fontSize: 11, fontWeight: 700, color: marginColor, ...mono }}>{fmtAED(unit.contributionPerSeat * unit.totalSeats)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
