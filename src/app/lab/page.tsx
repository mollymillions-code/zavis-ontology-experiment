'use client';

import { useState, useMemo, useEffect } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { useClientStore } from '@/lib/store/customer-store';
import { useWhatIfStore } from '@/lib/store/whatif-store';
import { formatAED } from '@/lib/utils/currency';
import { isPerSeatClient, computeMRRAtPrice } from '@/lib/utils/customer-mrr';
import { computeClientUnitRows, type UnitAssumptions } from '@/lib/utils/unit-economics';
import type { PricingWhatIf, WhatIfClientImpact, MonthlyCost, CostCategory } from '@/lib/models/platform-types';
import { Save, Trash2, DollarSign, Layers } from 'lucide-react';

/* ========== Revenue Line Item Types ========== */

interface RevenueLineItem {
  id: string;
  label: string;
  description: string;
  unit: 'per_seat' | 'per_client';
  defaultValue: number;
  max: number;
  step: number;
  color: string;
}

const REVENUE_LINE_ITEMS: RevenueLineItem[] = [
  { id: 'ai_agents', label: 'AI Agents', description: 'AI chatbot & automation per seat', unit: 'per_seat', defaultValue: 0, max: 200, step: 5, color: '#a78bfa' },
  { id: 'integrations', label: 'Integrations', description: 'API / third-party integrations per client', unit: 'per_client', defaultValue: 0, max: 500, step: 25, color: '#60a5fa' },
  { id: 'analytics_addon', label: 'Analytics Add-on', description: 'Advanced analytics per seat', unit: 'per_seat', defaultValue: 0, max: 100, step: 5, color: '#34d399' },
  { id: 'whatsapp_campaigns', label: 'WhatsApp Campaigns', description: 'Campaign messaging per client/mo', unit: 'per_client', defaultValue: 0, max: 300, step: 10, color: '#fbbf24' },
  { id: 'onboarding_fee', label: 'Onboarding Fee', description: 'One-time setup fee per new client', unit: 'per_client', defaultValue: 0, max: 10000, step: 500, color: '#f472b6' },
  { id: 'managed_services', label: 'Managed Services', description: 'Dedicated support per client/mo', unit: 'per_client', defaultValue: 0, max: 1000, step: 50, color: '#fb923c' },
];

export default function LabPage() {
  const clients = useClientStore((s) => s.clients);
  const scenarios = useWhatIfStore((s) => s.scenarios);
  const addScenario = useWhatIfStore((s) => s.addScenario);
  const deleteScenario = useWhatIfStore((s) => s.deleteScenario);

  // Current average per-seat price
  const currentAvgPrice = useMemo(() => {
    const perSeat = clients.filter(isPerSeatClient);
    if (perSeat.length === 0) return 249;
    return Math.round(perSeat.reduce((s, c) => s + (c.perSeatCost || 0), 0) / perSeat.length);
  }, [clients]);

  const [perSeatPrice, setPerSeatPrice] = useState(currentAvgPrice);
  const [scenarioName, setScenarioName] = useState('');

  // Revenue line item state
  const [lineItemValues, setLineItemValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    REVENUE_LINE_ITEMS.forEach((item) => { init[item.id] = item.defaultValue; });
    return init;
  });

  // Cost state
  const [loadingCosts, setLoadingCosts] = useState(true);
  const [editedCosts, setEditedCosts] = useState<Record<CostCategory, number>>({} as Record<CostCategory, number>);

  // Fetch costs from API
  useEffect(() => {
    fetch('/api/costs')
      .then((res) => res.json())
      .then((data: MonthlyCost[]) => {
        const actualCosts = data.filter((c) => c.type === 'actual');
        const costMap: Record<string, number> = {};
        actualCosts.forEach((c) => { costMap[c.category] = c.amount; });
        setEditedCosts(costMap as Record<CostCategory, number>);
        setLoadingCosts(false);
      })
      .catch(() => setLoadingCosts(false));
  }, []);

  const getCostValue = (category: CostCategory): number => editedCosts[category] || 0;

  const activeClients = clients.filter((c) => c.status === 'active');
  const activeClientCount = activeClients.length;
  const totalSeats = activeClients.reduce((s, c) => s + (c.seatCount || 0), 0);
  const totalCostProjected = Object.values(editedCosts).reduce((s, amt) => s + amt, 0);

  const impacts = useMemo<WhatIfClientImpact[]>(() => {
    return activeClients.map((client) => {
      const currentMRR = client.mrr;
      const isPSClient = isPerSeatClient(client);
      const projectedMRR = isPSClient ? computeMRRAtPrice(client, perSeatPrice) : currentMRR;
      return {
        clientId: client.id,
        clientName: client.name,
        pricingModel: client.pricingModel,
        currentMRR,
        projectedMRR,
        delta: projectedMRR - currentMRR,
        isAffected: isPSClient && projectedMRR !== currentMRR,
      };
    });
  }, [activeClients, perSeatPrice]);

  const currentTotal = impacts.reduce((s, i) => s + i.currentMRR, 0);
  const projectedTotal = impacts.reduce((s, i) => s + i.projectedMRR, 0);
  const mrrDelta = projectedTotal - currentTotal;

  /* ========== Line Item Revenue Computation ========== */
  const lineItemRevenue = useMemo(() => {
    let totalMonthly = 0;
    const breakdown: { id: string; label: string; unitPrice: number; quantity: number; monthly: number; color: string }[] = [];

    REVENUE_LINE_ITEMS.forEach((item) => {
      const unitPrice = lineItemValues[item.id] || 0;
      if (unitPrice <= 0) return;
      let quantity = 0;
      if (item.unit === 'per_seat') quantity = totalSeats;
      else if (item.unit === 'per_client') quantity = activeClientCount;
      const monthly = unitPrice * quantity;
      totalMonthly += monthly;
      breakdown.push({ id: item.id, label: item.label, unitPrice, quantity, monthly, color: item.color });
    });

    return { totalMonthly, breakdown };
  }, [lineItemValues, totalSeats, activeClientCount]);

  const totalProjectedMRR = projectedTotal + lineItemRevenue.totalMonthly;
  const projectedNetContribution = totalProjectedMRR - totalCostProjected;
  const projectedRevenuePerSeat = totalSeats > 0 ? totalProjectedMRR / totalSeats : 0;
  const projectedCostPerSeat = totalSeats > 0 ? totalCostProjected / totalSeats : 0;
  const projectedContributionPerSeat = projectedRevenuePerSeat - projectedCostPerSeat;
  const projectedMarginPercent = projectedRevenuePerSeat > 0
    ? (projectedContributionPerSeat / projectedRevenuePerSeat) * 100 : 0;

  // Build unit assumptions from edited costs for per-client breakdown
  const assumptions: UnitAssumptions = {
    platformLicensePerSeat: (getCostValue('chatwoot_seats') + getCostValue('chatwoot_sub')) / Math.max(totalSeats, 1),
    aiApiCostRate: 0.60,
    serverHosting: getCostValue('aws'),
    engineering: getCostValue('payroll'),
    softwareTools: 0,
    accountMgmtPerClient: getCostValue('sales_spend') / Math.max(activeClients.length, 1),
    partnerCommissionRate: currentTotal > 0 ? getCostValue('commissions') / currentTotal : 0.10,
    aiAgentRevPerSeat: (lineItemValues['ai_agents'] || 0) + (lineItemValues['analytics_addon'] || 0),
    addOnRevPerSeat: 0,
  };

  // Compute per-client unit economics using projected pricing
  const clientsWithProjectedMRR = activeClients.map((c) => {
    const isPSClient = isPerSeatClient(c);
    const projectedMRR = isPSClient ? computeMRRAtPrice(c, perSeatPrice) : c.mrr;
    return { ...c, mrr: projectedMRR };
  });

  const unitRows = computeClientUnitRows(clientsWithProjectedMRR, assumptions);

  function handleSave() {
    if (!scenarioName.trim()) return;
    const scenario: PricingWhatIf = {
      id: `whatif-${Date.now()}`,
      name: scenarioName.trim(),
      createdAt: new Date().toISOString(),
      modifiedPerSeatPrice: perSeatPrice,
    };
    addScenario(scenario);
    setScenarioName('');
  }

  const labelStyle = {
    fontSize: 11, fontWeight: 500 as const, color: '#666',
    fontFamily: "'DM Sans', sans-serif", marginBottom: 4, display: 'block' as const,
  };

  const priceDelta = perSeatPrice - currentAvgPrice;

  // Revenue streams for summary table
  const revenueStreams = useMemo(() => {
    const streams: { name: string; monthly: number; annual: number; color: string }[] = [
      { name: 'Subscription MRR', monthly: projectedTotal, annual: projectedTotal * 12, color: '#00c853' },
    ];
    lineItemRevenue.breakdown.forEach((b) => {
      streams.push({ name: b.label, monthly: b.monthly, annual: b.monthly * 12, color: b.color });
    });
    return streams;
  }, [projectedTotal, lineItemRevenue]);

  const totalAnnual = totalProjectedMRR * 12;

  return (
    <PageShell title="Pricing Lab" subtitle="Strategic pricing, revenue streams & profitability simulation">
      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
        {/* ===== SIDEBAR CONTROLS ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Revenue Controls */}
          <div style={{
            background: '#ffffff', borderRadius: 12, padding: 20,
            border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <DollarSign size={16} style={{ color: '#00c853' }} />
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#1a1a1a', margin: 0 }}>
                Subscription Pricing
              </h3>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className="flex justify-between" style={{ marginBottom: 6 }}>
                <label style={labelStyle}>Price per Seat</label>
                <span style={{
                  fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                  color: priceDelta > 0 ? '#00a844' : priceDelta < 0 ? '#ff3d00' : '#999',
                }}>
                  {priceDelta !== 0 ? `${priceDelta > 0 ? '+' : ''}${formatAED(priceDelta)}` : 'No change'}
                </span>
              </div>
              <input
                type="range" min={100} max={500} step={5}
                value={perSeatPrice}
                onChange={(e) => setPerSeatPrice(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#00c853', height: 6 }}
              />
              <div className="flex justify-between" style={{ marginTop: 4 }}>
                <span style={{ fontSize: 10, color: '#999', fontFamily: "'Space Mono', monospace" }}>{formatAED(100)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1a1a1a' }}>{formatAED(perSeatPrice)}</span>
                <span style={{ fontSize: 10, color: '#999', fontFamily: "'Space Mono', monospace" }}>{formatAED(500)}</span>
              </div>
            </div>

            <div style={{ padding: 12, background: '#f5f0e8', borderRadius: 8, marginBottom: 16 }}>
              <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>Current average per-seat price</p>
              <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1a1a1a' }}>
                {formatAED(currentAvgPrice)} /seat
              </p>
            </div>

            <button
              onClick={() => setPerSeatPrice(currentAvgPrice)}
              style={{
                width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #e0dbd2',
                background: '#fff', fontSize: 11, fontWeight: 600, color: '#666',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Reset to Current
            </button>
          </div>

          {/* Revenue Line Items */}
          <div style={{
            background: '#ffffff', borderRadius: 12, padding: 20,
            border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Layers size={16} style={{ color: '#a78bfa' }} />
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#1a1a1a', margin: 0 }}>
                Revenue Line Items
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {REVENUE_LINE_ITEMS.map((item) => {
                const val = lineItemValues[item.id] || 0;
                const quantity = item.unit === 'per_seat' ? totalSeats : activeClientCount;
                const projected = val * quantity;
                return (
                  <div key={item.id}>
                    <div className="flex justify-between" style={{ marginBottom: 2 }}>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{item.label}</span>
                        <span style={{ fontSize: 9, color: '#999', marginLeft: 6, fontFamily: "'DM Sans', sans-serif" }}>
                          {item.unit === 'per_seat' ? `× ${totalSeats} seats` : `× ${activeClientCount} clients`}
                        </span>
                      </div>
                      <span style={{
                        fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700,
                        color: val > 0 ? item.color : '#ccc',
                      }}>
                        {formatAED(val)}
                      </span>
                    </div>
                    <p style={{ fontSize: 9, color: '#999', fontFamily: "'DM Sans', sans-serif", marginBottom: 4 }}>{item.description}</p>
                    <input
                      type="range" min={0} max={item.max} step={item.step}
                      value={val}
                      onChange={(e) => setLineItemValues({ ...lineItemValues, [item.id]: Number(e.target.value) })}
                      style={{ width: '100%', accentColor: item.color, height: 4 }}
                    />
                    {val > 0 && (
                      <p style={{ fontSize: 10, color: '#666', fontFamily: "'Space Mono', monospace", marginTop: 2, textAlign: 'right' }}>
                        = {formatAED(projected)}/mo
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {lineItemRevenue.totalMonthly > 0 && (
              <div style={{
                padding: 10, background: '#f3f0ff', borderRadius: 8, marginTop: 14,
                border: '1px solid #e8e0ff',
              }}>
                <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>Total Line Item Revenue</p>
                <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#7c3aed' }}>
                  {formatAED(lineItemRevenue.totalMonthly)}/mo
                </p>
              </div>
            )}

            <button
              onClick={() => {
                const reset: Record<string, number> = {};
                REVENUE_LINE_ITEMS.forEach((item) => { reset[item.id] = 0; });
                setLineItemValues(reset);
              }}
              style={{
                width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #e0dbd2',
                background: '#fff', fontSize: 11, fontWeight: 600, color: '#666',
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginTop: 12,
              }}
            >
              Reset All
            </button>
          </div>

          {/* Cost Controls */}
          {!loadingCosts && (
            <div style={{
              background: '#ffffff', borderRadius: 12, padding: 20,
              border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <DollarSign size={16} style={{ color: '#ff6e40' }} />
                <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#1a1a1a', margin: 0 }}>Costs</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(['aws', 'payroll', 'chatwoot_seats', 'sales_spend', 'commissions'] as CostCategory[]).map((cat) => {
                  const labels: Record<CostCategory, string> = {
                    aws: 'AWS', chatwoot_seats: 'Chatwoot Seats', payroll: 'Payroll',
                    sales_spend: 'Sales Spend', chatwoot_sub: 'Chatwoot Sub', commissions: 'Commissions',
                  };
                  const maxValues: Record<CostCategory, number> = {
                    aws: 10000, chatwoot_seats: 5000, payroll: 150000,
                    sales_spend: 10000, chatwoot_sub: 1000, commissions: 20000,
                  };
                  return (
                    <div key={cat} style={{ marginBottom: 8 }}>
                      <div className="flex justify-between" style={{ marginBottom: 4 }}>
                        <label style={{ ...labelStyle, marginBottom: 0 }}>{labels[cat]}</label>
                        <span style={{ fontSize: 11, fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#1a1a1a' }}>
                          {formatAED(getCostValue(cat))}
                        </span>
                      </div>
                      <input
                        type="range" min={0} max={maxValues[cat]}
                        step={cat === 'payroll' ? 1000 : cat === 'aws' || cat === 'sales_spend' || cat === 'commissions' ? 100 : 50}
                        value={getCostValue(cat)}
                        onChange={(e) => setEditedCosts({ ...editedCosts, [cat]: Number(e.target.value) })}
                        style={{ width: '100%', accentColor: '#ff6e40', height: 4 }}
                      />
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: 10, background: '#fff5f2', borderRadius: 8, marginTop: 12, border: '1px solid #ffe0d9' }}>
                <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif", marginBottom: 2 }}>Total Monthly Costs</p>
                <p style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#ff6e40' }}>{formatAED(totalCostProjected)}</p>
              </div>
            </div>
          )}

          {/* Save Scenario */}
          <div style={{
            background: '#ffffff', borderRadius: 12, padding: 20,
            border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h4 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, color: '#1a1a1a', marginBottom: 12 }}>Save Scenario</h4>
            <input
              placeholder="Scenario name..."
              value={scenarioName}
              onChange={(e) => setScenarioName(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #e0dbd2',
                fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginBottom: 8, outline: 'none',
              }}
            />
            <button
              onClick={handleSave}
              disabled={!scenarioName.trim()}
              style={{
                width: '100%', padding: '8px', borderRadius: 6, border: 'none',
                background: scenarioName.trim() ? '#00c853' : '#e0dbd2',
                color: scenarioName.trim() ? '#1a1a1a' : '#999',
                fontSize: 12, fontWeight: 700, cursor: scenarioName.trim() ? 'pointer' : 'default',
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          </div>
        </div>

        {/* ===== RESULTS ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* KPI Row 1: Revenue */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPICard title="Subscription MRR" value={formatAED(projectedTotal)} accent={mrrDelta >= 0 ? '#00c853' : '#ff3d00'} subtitle={`${mrrDelta >= 0 ? '+' : ''}${formatAED(mrrDelta)} delta`} />
            <KPICard title="Line Item Revenue" value={formatAED(lineItemRevenue.totalMonthly)} accent="#a78bfa" subtitle={`${lineItemRevenue.breakdown.length} active streams`} />
            <KPICard title="Total Projected MRR" value={formatAED(totalProjectedMRR)} accent="#00c853" subtitle={`ARR ${formatAED(totalAnnual)}`} />
            <KPICard title="Monthly Costs" value={formatAED(totalCostProjected)} accent="#ff6e40" />
          </div>

          {/* KPI Row 2: Profitability */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <KPICard title="Net Contribution" value={formatAED(projectedNetContribution)} accent={projectedNetContribution >= 0 ? '#00c853' : '#ff3d00'} />
            <KPICard title="Margin %" value={`${projectedMarginPercent.toFixed(1)}%`} accent={projectedMarginPercent >= 50 ? '#00c853' : projectedMarginPercent >= 30 ? '#fbbf24' : '#ff6e40'} />
            <KPICard title="Revenue / Seat" value={formatAED(projectedRevenuePerSeat)} accent="#2979ff" />
            <KPICard title="Contribution / Seat" value={formatAED(projectedContributionPerSeat)} accent={projectedContributionPerSeat >= 0 ? '#00c853' : '#ff3d00'} />
          </div>

          {/* Revenue Streams Breakdown */}
          {revenueStreams.length > 0 && (
            <div style={{
              background: '#ffffff', borderRadius: 12, padding: 24,
              border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 16 }}>
                Revenue Streams Breakdown
              </h3>
              <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                    {['Stream', 'Monthly', 'Annual', 'Share'].map((h) => (
                      <th key={h} style={{
                        padding: '10px 8px', textAlign: h === 'Stream' ? 'left' : 'right',
                        fontWeight: 600, color: '#666', textTransform: 'uppercase', fontSize: 10,
                        letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {revenueStreams.map((stream, i) => {
                    const share = totalProjectedMRR > 0 ? (stream.monthly / totalProjectedMRR) * 100 : 0;
                    return (
                      <tr key={stream.name} style={{ borderBottom: '1px solid #e0dbd2', background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding: '10px 8px', fontFamily: "'DM Sans', sans-serif" }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 2, background: stream.color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{stream.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 600, color: '#1a1a1a' }}>
                          {formatAED(stream.monthly)}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#666' }}>
                          {formatAED(stream.annual)}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                            <div style={{ width: 48, height: 6, background: '#f0ebe0', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(share, 100)}%`, height: '100%', background: stream.color, borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 600, color: '#666', minWidth: 32 }}>
                              {share.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>TOTAL</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#00c853' }}>
                      {formatAED(totalProjectedMRR)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#1a1a1a' }}>
                      {formatAED(totalAnnual)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#666' }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Per-Client Unit Economics */}
          <div style={{
            background: '#ffffff', borderRadius: 12, padding: 24,
            border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 16 }}>
              Per-Client Unit Economics
            </h3>
            <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                  {['Client', 'Seats', 'MRR', 'Rev/Seat', 'Cost/Seat', 'Contribution/Seat', 'Margin %', 'Total Contribution'].map((h) => (
                    <th key={h} style={{
                      padding: '10px 8px', textAlign: h === 'Client' ? 'left' : 'right',
                      fontWeight: 600, color: '#666', textTransform: 'uppercase', fontSize: 10,
                      letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {unitRows.map((row, i) => {
                  const impact = impacts.find((imp) => imp.clientId === row.clientId);
                  const isAffected = impact?.isAffected || false;
                  return (
                    <tr key={row.clientId} style={{
                      borderBottom: '1px solid #e0dbd2',
                      background: isAffected ? '#f0faf0' : i % 2 === 0 ? '#fafafa' : '#fff',
                    }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{row.clientName}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#666' }}>{row.seats}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 600, color: '#1a1a1a' }}>{formatAED(row.totalRevenue)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#666' }}>{formatAED(row.revenuePerSeat)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#ff6e40' }}>{formatAED(row.totalCostPerSeat)}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: row.contributionPerSeat >= 0 ? '#00a844' : '#ff3d00' }}>
                        {formatAED(row.contributionPerSeat)}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 600, color: row.marginPercent >= 50 ? '#00a844' : row.marginPercent >= 30 ? '#fbbf24' : '#ff6e40' }}>
                        {row.marginPercent.toFixed(1)}%
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: row.totalContribution >= 0 ? '#00a844' : '#ff3d00' }}>
                        {formatAED(row.totalContribution)}
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '12px 8px', fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>TOTAL</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#00c853' }}>{formatAED(projectedTotal)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#666' }}>{formatAED(projectedRevenuePerSeat)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", color: '#ff6e40' }}>{formatAED(projectedCostPerSeat)}</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: projectedContributionPerSeat >= 0 ? '#00a844' : '#ff3d00' }}>
                    {formatAED(projectedContributionPerSeat)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: projectedMarginPercent >= 50 ? '#00a844' : projectedMarginPercent >= 30 ? '#fbbf24' : '#ff6e40' }}>
                    {projectedMarginPercent.toFixed(1)}%
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: projectedNetContribution >= 0 ? '#00a844' : '#ff3d00' }}>
                    {formatAED(projectedNetContribution)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Saved Scenarios */}
          {scenarios.length > 0 && (
            <div style={{
              background: '#ffffff', borderRadius: 12, padding: 24,
              border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <h3 style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14, color: '#1a1a1a', marginBottom: 16 }}>
                Saved Scenarios
              </h3>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                    {['Name', 'Per-Seat Price', 'Date', ''].map((h) => (
                      <th key={h} style={{
                        padding: '10px 8px', textAlign: h === 'Per-Seat Price' ? 'right' : 'left',
                        fontWeight: 600, color: '#666', textTransform: 'uppercase', fontSize: 10,
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((scenario, i) => (
                    <tr key={scenario.id} style={{ borderBottom: '1px solid #e0dbd2', background: i % 2 === 0 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 8px', fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif" }}>{scenario.name}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace" }}>{formatAED(scenario.modifiedPerSeatPrice)}</td>
                      <td style={{ padding: '10px 8px', fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#999' }}>{scenario.createdAt.slice(0, 10)}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <button onClick={() => deleteScenario(scenario.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ff3d00', padding: 2 }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
