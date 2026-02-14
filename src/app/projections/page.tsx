'use client';

import { useState, useMemo, useCallback } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { useClientStore } from '@/lib/store/customer-store';
import { formatAED, formatNumber, formatPercent } from '@/lib/utils/currency';
import { isPerSeatClient } from '@/lib/utils/customer-mrr';
import {
  runProjection,
  ProjectionInputs,
  ProjectionResult,
  PRESET_SCENARIOS,
} from '@/lib/utils/projection-engine';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';

// ========== STYLES ==========

const sectionHeaderStyle = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  padding: '10px 0',
  cursor: 'pointer' as const,
  borderBottom: '1px solid #e0dbd2',
  marginBottom: 12,
};

const sectionTitleStyle = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700 as const,
  fontSize: 12,
  color: '#1a1a1a',
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
};

const fieldLabel = {
  fontSize: 11,
  fontWeight: 500 as const,
  color: '#666',
  fontFamily: "'DM Sans', sans-serif",
  marginBottom: 4,
  display: 'block' as const,
};

const numInput = {
  width: '100%',
  padding: '6px 10px',
  borderRadius: 6,
  border: '1px solid #e0dbd2',
  fontSize: 12,
  fontFamily: "'Space Mono', monospace",
  fontWeight: 700 as const,
  color: '#1a1a1a',
  background: '#ffffff',
  outline: 'none',
};

const sliderStyle = {
  width: '100%',
  accentColor: '#00c853',
  height: 4,
  marginTop: 4,
};

const cardStyle = {
  background: '#ffffff',
  borderRadius: 12,
  padding: 24,
  border: '1px solid #e0dbd2',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
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

const dotGridOverlay = {
  position: 'absolute' as const,
  inset: 0,
  backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
  backgroundSize: '24px 24px',
  borderRadius: 14,
  pointerEvents: 'none' as const,
};

// ========== COLLAPSIBLE SECTION ==========

function Section({
  title,
  summary,
  defaultOpen = true,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={sectionHeaderStyle} onClick={() => setOpen(!open)}>
        <div>
          <span style={sectionTitleStyle}>{title}</span>
          {!open && summary && (
            <span style={{ fontSize: 10, color: '#999', fontFamily: "'Space Mono', monospace", marginLeft: 8 }}>
              {summary}
            </span>
          )}
        </div>
        {open ? <ChevronDown className="w-4 h-4" style={{ color: '#999' }} /> : <ChevronRight className="w-4 h-4" style={{ color: '#999' }} />}
      </div>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
    </div>
  );
}

// ========== FIELD COMPONENTS ==========

function NumberField({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={fieldLabel}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: 8, top: 7, fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          style={{ ...numInput, ...(prefix ? { paddingLeft: 32 } : {}), ...(suffix ? { paddingRight: 32 } : {}) }}
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 8, top: 7, fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  suffix = '%',
  displayMultiplier = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  displayMultiplier?: number;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={fieldLabel}>{label}</label>
        <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1a1a1a' }}>
          {(value * displayMultiplier).toFixed(step < 1 ? 1 : 0)}{suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={sliderStyle}
      />
    </div>
  );
}

// ========== CHART TOOLTIP ==========

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(20,20,35,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '10px 14px', color: '#fff' }}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#999' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
          <span style={{ fontSize: 11, color: p.color, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</span>
          <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{formatAED(Math.round(p.value))}</span>
        </div>
      ))}
    </div>
  );
}

// ========== MAIN PAGE ==========

export default function ProjectionsPage() {
  const clients = useClientStore((s) => s.clients);

  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);

  // Compute starting position from real data
  const startingClients = activeClients.length;
  const startingSeats = useMemo(() => {
    return activeClients.reduce((sum, c) => sum + (c.seatCount || 0), 0);
  }, [activeClients]);

  const avgSeatPrice = useMemo(() => {
    const perSeat = activeClients.filter(isPerSeatClient);
    if (perSeat.length === 0) return 249;
    return Math.round(perSeat.reduce((s, c) => s + (c.perSeatCost || 0), 0) / perSeat.length);
  }, [activeClients]);

  const currentMRR = useMemo(() => activeClients.reduce((s, c) => s + c.mrr, 0), [activeClients]);

  // ===== STATE =====
  const [timeline, setTimeline] = useState(12);
  const [preset, setPreset] = useState('Current Trajectory');

  const defaultInputs: ProjectionInputs = useMemo(() => ({
    startingClients,
    startingSeats,
    avgSeatPrice,
    newClientsPerMonth: 2,
    acquisitionGrowthRate: 0,
    avgSeatsPerNewClient: 5,
    monthlyChurnRate: 0.02,
    monthlySeatExpansionRate: 0,
    avgOneTimePerNewClient: 3000,
    infraCostPerSeat: 20,
    fixedMonthlyOverhead: 5000,
    months: timeline,
  }), [startingClients, startingSeats, avgSeatPrice, timeline]);

  const [inputs, setInputs] = useState<ProjectionInputs>(defaultInputs);

  const updateInput = useCallback(<K extends keyof ProjectionInputs>(key: K, value: ProjectionInputs[K]) => {
    setInputs((prev) => ({ ...prev, [key]: value }));
    setPreset('Custom');
  }, []);

  function applyPreset(name: string) {
    const scenario = PRESET_SCENARIOS.find((s) => s.name === name);
    if (!scenario) return;
    setInputs({ ...defaultInputs, ...scenario.overrides, months: timeline });
    setPreset(name);
  }

  function resetToDefaults() {
    setInputs({ ...defaultInputs, months: timeline });
    setPreset('Current Trajectory');
  }

  // Run projection
  const result: ProjectionResult = useMemo(
    () => runProjection({ ...inputs, months: timeline }),
    [inputs, timeline]
  );

  const chartData = result.months;

  // ===== TIMELINE PILL =====
  const timelinePill = (m: number) => ({
    padding: '6px 14px',
    borderRadius: 8,
    border: 'none',
    background: timeline === m ? '#00c853' : 'transparent',
    color: timeline === m ? '#1a1a1a' : '#666',
    fontWeight: timeline === m ? 700 : 500,
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer' as const,
  });

  return (
    <PageShell
      title="Projections"
      subtitle="Forward-looking revenue & growth simulator"
      actions={
        <div className="flex items-center gap-3">
          <select
            value={preset}
            onChange={(e) => applyPreset(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e0dbd2',
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              color: '#1a1a1a',
              background: '#fff',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {PRESET_SCENARIOS.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
            {preset === 'Custom' && <option value="Custom">Custom</option>}
          </select>

          <div style={{ display: 'flex', gap: 2, background: '#f0ebe0', borderRadius: 10, padding: 3 }}>
            {[6, 12, 18, 24].map((m) => (
              <button key={m} style={timelinePill(m)} onClick={() => setTimeline(m)}>
                {m}M
              </button>
            ))}
          </div>

          <button
            onClick={resetToDefaults}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e0dbd2',
              background: '#fff',
              fontSize: 11,
              fontWeight: 600,
              color: '#666',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'start' }}>
        {/* ===== SIDEBAR ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'sticky', top: 100 }}>
          <div style={{ ...cardStyle, padding: 20, maxHeight: 'calc(100vh - 130px)', overflowY: 'auto' }}>
            {/* Starting Position */}
            <Section title="Starting Position" summary={`${startingClients} clients, ${startingSeats} seats`}>
              <NumberField label="Active Clients" value={inputs.startingClients} onChange={(v) => updateInput('startingClients', v)} />
              <NumberField label="Total Seats" value={inputs.startingSeats} onChange={(v) => updateInput('startingSeats', v)} />
              <NumberField label="Avg Seat Price" value={inputs.avgSeatPrice} onChange={(v) => updateInput('avgSeatPrice', v)} prefix="AED" step={5} />
            </Section>

            {/* Growth */}
            <Section title="Growth" summary={`+${inputs.newClientsPerMonth}/mo, ${(inputs.monthlyChurnRate * 100).toFixed(0)}% churn`}>
              <NumberField label="New Clients / Month" value={inputs.newClientsPerMonth} onChange={(v) => updateInput('newClientsPerMonth', v)} min={0} max={50} />
              <NumberField label="Avg Seats per New Client" value={inputs.avgSeatsPerNewClient} onChange={(v) => updateInput('avgSeatsPerNewClient', v)} min={1} max={50} />
              <SliderField label="Acquisition Growth Rate" value={inputs.acquisitionGrowthRate * 100} onChange={(v) => updateInput('acquisitionGrowthRate', v / 100)} min={0} max={50} step={1} suffix="% /mo" displayMultiplier={1} />
              <SliderField label="Monthly Churn Rate" value={inputs.monthlyChurnRate * 100} onChange={(v) => updateInput('monthlyChurnRate', v / 100)} min={0} max={20} step={0.5} suffix="%" displayMultiplier={1} />
              <SliderField label="Seat Expansion Rate" value={inputs.monthlySeatExpansionRate * 100} onChange={(v) => updateInput('monthlySeatExpansionRate', v / 100)} min={0} max={20} step={0.5} suffix="% /mo" displayMultiplier={1} />
            </Section>

            {/* One-Time & Costs */}
            <Section title="Costs & One-Time" defaultOpen={false} summary={`${formatAED(inputs.fixedMonthlyOverhead)} fixed`}>
              <NumberField label="Avg One-Time / New Client" value={inputs.avgOneTimePerNewClient} onChange={(v) => updateInput('avgOneTimePerNewClient', v)} prefix="AED" />
              <NumberField label="Infrastructure / Seat" value={inputs.infraCostPerSeat} onChange={(v) => updateInput('infraCostPerSeat', v)} prefix="AED" />
              <NumberField label="Fixed Monthly Overhead" value={inputs.fixedMonthlyOverhead} onChange={(v) => updateInput('fixedMonthlyOverhead', v)} prefix="AED" />
            </Section>
          </div>
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Summary KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
            <KPICard title="Current MRR" value={formatAED(currentMRR)} accent="#666" />
            <KPICard title={`Projected MRR (M${timeline})`} value={formatAED(Math.round(result.endingMRR))} accent="#00c853" />
            <KPICard title="Projected ARR" value={formatAED(Math.round(result.endingARR))} accent="#2979ff" />
            <KPICard title={`Clients (M${timeline})`} value={formatNumber(result.endingClients)} accent="#7c4dff" />
            <KPICard title={`Seats (M${timeline})`} value={formatNumber(result.endingSeats)} accent="#ff9100" />
            <KPICard
              title="Breakeven"
              value={result.breakEvenMonth ? `Month ${result.breakEvenMonth}` : 'N/A'}
              accent={result.breakEvenMonth ? '#00c853' : '#ff3d00'}
              subtitle={result.breakEvenMonth ? chartData[result.breakEvenMonth - 1]?.label.split(' \u2014 ')[1] : 'Not in range'}
            />
          </div>

          {/* Chart 1: MRR Projection */}
          <div style={chartCardStyle}>
            <div style={dotGridOverlay} />
            <h3 style={chartTitleStyle}>MRR Projection</h3>
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                  <defs>
                    <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00c853" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00c853" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(timeline / 6) - 1)} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <ReferenceLine y={currentMRR} stroke="#999" strokeDasharray="4 4" label={{ value: 'Current', position: 'right', fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                  <Area type="monotone" dataKey="totalRevenue" name="Total Revenue" stroke="#00c853" fill="url(#mrrGrad)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="subscriptionRevenue" name="Subscription" stroke="#60a5fa" fill="none" strokeWidth={1.5} strokeDasharray="4 3" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Charts Row: Clients+Seats + Revenue vs Cost */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Client & Seat Count */}
            <div style={chartCardStyle}>
              <div style={dotGridOverlay} />
              <h3 style={chartTitleStyle}>Clients & Seats</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(timeline / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(20,20,35,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '10px 14px', color: '#fff' }}>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, marginBottom: 6, color: '#999' }}>{label}</p>
                          {payload.map((p) => (
                            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, color: p.color as string, fontFamily: "'DM Sans', sans-serif" }}>{p.name}</span>
                              <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700 }}>{p.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.5)' }} />
                    <Area type="monotone" dataKey="totalClients" name="Clients" stroke="#7c4dff" fill="#7c4dff" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="totalSeats" name="Seats" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue vs Cost */}
            <div style={chartCardStyle}>
              <div style={dotGridOverlay} />
              <h3 style={chartTitleStyle}>Revenue vs Cost</h3>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00c853" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#00c853" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ff3d00" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ff3d00" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(timeline / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.5)' }} />
                    <Area type="monotone" dataKey="totalRevenue" name="Revenue" stroke="#00c853" fill="url(#revGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="totalCosts" name="Costs" stroke="#ff6e40" fill="url(#costGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row: Gross Margin + Cumulative P&L */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Gross Margin */}
            <div style={chartCardStyle}>
              <div style={dotGridOverlay} />
              <h3 style={chartTitleStyle}>Gross Margin Trajectory</h3>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(timeline / 6) - 1)} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div style={{ background: 'rgba(20,20,35,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '8px 12px', color: '#fff' }}>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#999' }}>{label}</p>
                          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700 }}>{formatPercent(payload[0].value as number)}</p>
                        </div>
                      );
                    }} />
                    <ReferenceLine y={70} stroke="#00c853" strokeDasharray="4 4" label={{ value: '70% target', position: 'right', fontSize: 9, fill: '#00c853' }} />
                    <Line type="monotone" dataKey="grossMarginPercent" name="Margin %" stroke="#a78bfa" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cumulative P&L */}
            <div style={chartCardStyle}>
              <div style={dotGridOverlay} />
              <h3 style={chartTitleStyle}>Cumulative Revenue & Profit</h3>
              <div style={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(timeline / 6) - 1)} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10, fontFamily: "'DM Sans', sans-serif", color: 'rgba(255,255,255,0.5)' }} />
                    <Area type="monotone" dataKey="cumulativeRevenue" name="Cum. Revenue" stroke="#00c853" fill="#00c853" fillOpacity={0.1} strokeWidth={2} />
                    <Area type="monotone" dataKey="cumulativeCosts" name="Cum. Costs" stroke="#ff6e40" fill="#ff6e40" fillOpacity={0.1} strokeWidth={2} />
                    <Line type="monotone" dataKey="cumulativeProfit" name="Cum. Profit" stroke="#60a5fa" strokeWidth={2.5} dot={false} />
                    {result.breakEvenMonth && (
                      <ReferenceLine x={chartData[result.breakEvenMonth - 1]?.label} stroke="#00c853" strokeDasharray="4 4" label={{ value: 'Breakeven', position: 'top', fontSize: 10, fill: '#00c853' }} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detail Table */}
          <div style={chartCardStyle}>
            <div style={dotGridOverlay} />
            <h3 style={chartTitleStyle}>Month-by-Month Breakdown</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: 1000 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
                    {[
                      'Month', 'Clients', 'Seats',
                      '+New', '-Churn', '+Seats',
                      'Sub Rev', 'One-Time', 'Total Rev',
                      'Costs', 'Profit', 'Margin',
                      'Cum Rev', 'Cum Profit',
                    ].map((h) => (
                      <th key={h} style={{
                        padding: '8px 5px',
                        textAlign: h === 'Month' ? 'left' : 'right',
                        fontWeight: 600,
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        fontSize: 9,
                        letterSpacing: 0.3,
                        fontFamily: "'DM Sans', sans-serif",
                        whiteSpace: 'nowrap',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, i) => (
                    <tr
                      key={row.month}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        background:
                          result.breakEvenMonth === row.month
                            ? 'rgba(0,200,83,0.08)'
                            : i % 2 === 0
                            ? 'rgba(255,255,255,0.02)'
                            : 'transparent',
                      }}
                    >
                      <td style={{ padding: '7px 5px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', fontFamily: "'DM Sans', sans-serif", fontSize: 10, whiteSpace: 'nowrap' }}>{row.label}</td>
                      <td style={{ ...tdNum, fontWeight: 700 }}>{row.totalClients}</td>
                      <td style={tdNum}>{row.totalSeats}</td>
                      <td style={{ ...tdNum, color: '#00e676' }}>+{row.newClients}</td>
                      <td style={{ ...tdNum, color: row.churnedClients > 0 ? '#ff6e40' : 'rgba(255,255,255,0.15)' }}>-{row.churnedClients}</td>
                      <td style={{ ...tdNum, color: row.newSeats > 0 ? '#60a5fa' : 'rgba(255,255,255,0.15)' }}>+{row.newSeats}</td>
                      <td style={tdNum}>{formatAED(Math.round(row.subscriptionRevenue))}</td>
                      <td style={{ ...tdNum, color: row.oneTimeRevenue > 0 ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)' }}>{formatAED(Math.round(row.oneTimeRevenue))}</td>
                      <td style={{ ...tdNum, fontWeight: 700, color: '#00e676' }}>{formatAED(Math.round(row.totalRevenue))}</td>
                      <td style={{ ...tdNum, color: '#ff6e40' }}>{formatAED(Math.round(row.totalCosts))}</td>
                      <td style={{ ...tdNum, fontWeight: 700, color: row.grossProfit >= 0 ? '#00e676' : '#ff6e40' }}>{formatAED(Math.round(row.grossProfit))}</td>
                      <td style={{ ...tdNum, color: row.grossMarginPercent >= 60 ? '#00e676' : row.grossMarginPercent >= 40 ? '#fbbf24' : '#ff6e40' }}>{formatPercent(row.grossMarginPercent)}</td>
                      <td style={tdNum}>{formatAED(Math.round(row.cumulativeRevenue))}</td>
                      <td style={{ ...tdNum, fontWeight: 700, color: row.cumulativeProfit >= 0 ? '#00e676' : '#ff6e40' }}>{formatAED(Math.round(row.cumulativeProfit))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}

const tdNum: React.CSSProperties = {
  padding: '7px 5px',
  textAlign: 'right',
  fontFamily: "'Space Mono', monospace",
  fontSize: 10,
  color: 'rgba(255,255,255,0.6)',
};
