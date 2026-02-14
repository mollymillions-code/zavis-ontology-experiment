'use client';

import { useMemo, useState, useEffect } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { useClientStore } from '@/lib/store/customer-store';
import { formatAED } from '@/lib/utils/currency';
import type { MonthlyCost, CostCategory } from '@/lib/models/platform-types';
import { COST_CATEGORY_LABELS } from '@/lib/models/platform-types';
import {
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Line, ComposedChart, PieChart, Pie, Cell,
} from 'recharts';

const COST_COLORS: Record<CostCategory, string> = {
  aws: '#ff6e40',
  chatwoot_seats: '#60a5fa',
  payroll: '#a78bfa',
  sales_spend: '#fbbf24',
  chatwoot_sub: '#34d399',
  commissions: '#f472b6',
};

export default function SalesGoalsPage() {
  const clients = useClientStore((s) => s.clients);
  const [costs, setCosts] = useState<MonthlyCost[]>([]);

  useEffect(() => {
    fetch('/api/costs')
      .then((res) => res.json())
      .then((data) => setCosts(data))
      .catch(() => {});
  }, []);

  const {
    currentClients, targetClients, monthlyTargets,
    progressData, monthlyAcquisitionTarget, clientsNeeded,
    currentMRR, avgMRRPerClient, avgOneTimePerClient,
    projectedMRR50, projectedARR50,
    currentSubscribers, currentOneTimeClients,
    totalOneTimeRevenue,
  } = useMemo(() => {
    let currentCount = 0;
    let totalMRR = 0;
    let totalOneTime = 0;
    let activeSubs = 0;
    let subscriberMRRTotal = 0;
    let totalOneTimeClients = 0;
    let totalOneTimeClientRevenue = 0;

    for (const client of clients) {
      const isActive = client.status === 'active';
      const isSubscriber = client.pricingModel === 'per_seat' || client.pricingModel === 'flat_mrr';
      const isOneTimeClient = client.pricingModel === 'one_time_only';

      totalOneTime += client.oneTimeRevenue;

      if (isActive) {
        currentCount += 1;
        totalMRR += client.mrr;
      }
      if (isSubscriber) {
        if (isActive) {
          activeSubs += 1;
          subscriberMRRTotal += client.mrr;
        }
      }
      if (isOneTimeClient) {
        totalOneTimeClients += 1;
        totalOneTimeClientRevenue += client.oneTimeRevenue;
      }
    }

    const target = 50;

    const avgMRR = activeSubs > 0 ? subscriberMRRTotal / activeSubs : 0;
    const avgOT = totalOneTimeClients > 0 ? totalOneTimeClientRevenue / totalOneTimeClients : 0;

    const monthsRemaining = 11;
    const gap = target - currentCount;
    const monthlyAcquisition = Math.round(gap / monthsRemaining);

    const months = Array.from({ length: 11 }, (_, i) => {
      const monthNames = ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const cumulativeTarget = i < 10
        ? currentCount + monthlyAcquisition * (i + 1)
        : target;
      const monthlyNew = i < 10
        ? monthlyAcquisition
        : target - (currentCount + monthlyAcquisition * 10);

      const projMRR = cumulativeTarget * avgMRR;
      const projTotalRev = projMRR + (cumulativeTarget * avgOT);

      return {
        month: monthNames[i],
        shortMonth: monthNames[i],
        cumulativeTarget,
        actual: i === 0 ? currentCount : 0,
        monthlyNew,
        projectedMRR: Math.round(projMRR),
        projectedTotalRev: Math.round(projTotalRev),
        actualMRR: i === 0 ? totalMRR : 0,
      };
    });

    return {
      currentClients: currentCount,
      targetClients: target,
      clientsNeeded: gap,
      monthlyAcquisitionTarget: monthlyAcquisition,
      monthlyTargets: months,
      progressData: months,
      currentMRR: totalMRR,
      avgMRRPerClient: avgMRR,
      avgOneTimePerClient: avgOT,
      projectedMRR50: target * avgMRR,
      projectedARR50: target * avgMRR * 12,
      currentSubscribers: activeSubs,
      currentOneTimeClients: totalOneTimeClients,
      totalOneTimeRevenue: totalOneTime,
    };
  }, [clients]);

  const { totalMonthlyCost, costBreakdown } = useMemo(() => {
    let total = 0;
    const byCategoryTotals: Partial<Record<CostCategory, number>> = {};

    for (const cost of costs) {
      if (cost.type !== 'actual') continue;
      total += cost.amount;
      byCategoryTotals[cost.category] = (byCategoryTotals[cost.category] || 0) + cost.amount;
    }

    const byCategory: { category: CostCategory; label: string; amount: number; color: string }[] = [];
    const categories: CostCategory[] = ['aws', 'chatwoot_seats', 'payroll', 'sales_spend', 'chatwoot_sub', 'commissions'];

    for (const cat of categories) {
      const amount = byCategoryTotals[cat] || 0;
      if (amount > 0) {
        byCategory.push({
          category: cat,
          label: COST_CATEGORY_LABELS[cat],
          amount,
          color: COST_COLORS[cat],
        });
      }
    }

    return { totalMonthlyCost: total, costBreakdown: byCategory };
  }, [costs]);

  const progressPercent = (currentClients / targetClients) * 100;
  const netMargin = currentMRR - totalMonthlyCost;

  const thStyle = {
    textAlign: 'left' as const,
    padding: '12px 8px',
    color: '#666',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
  };

  return (
    <PageShell
      title="Sales Goals"
      subtitle={`Target: 50 clients by Dec 2026 | Monthly Target: +${monthlyAcquisitionTarget} new clients/month`}
    >
      {/* KPI Cards — Row 1: Client Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPICard title="Subscribers" value={currentSubscribers.toString()} subtitle="recurring clients" accent="#00c853" />
        <KPICard title="One-Time Clients" value={currentOneTimeClients.toString()} subtitle="project-based" accent="#fbbf24" />
        <KPICard title="Total Active" value={currentClients.toString()} accent="#2979ff" />
        <KPICard title="Year-End Target" value={targetClients.toString()} accent="#60a5fa" />
        <KPICard title="Clients Needed" value={`+${clientsNeeded}`} accent="#ff6e40" />
        <KPICard
          title="Progress"
          value={`${progressPercent.toFixed(1)}%`}
          accent={progressPercent >= 80 ? '#00c853' : progressPercent >= 50 ? '#fbbf24' : '#ff6e40'}
        />
      </div>

      {/* KPI Cards — Row 2: Revenue Breakdown & Costs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
        <KPICard title="Subscription MRR" value={formatAED(currentMRR)} accent="#00c853" />
        <KPICard title="One-Time Revenue" value={formatAED(totalOneTimeRevenue)} accent="#fbbf24" />
        <KPICard title="Projected MRR @50" value={formatAED(projectedMRR50)} accent="#60a5fa" />
        <KPICard title="Projected ARR @50" value={formatAED(projectedARR50)} accent="#a78bfa" />
        <KPICard title="Monthly Costs" value={formatAED(totalMonthlyCost)} accent="#ff6e40" />
        <KPICard
          title="Net Margin"
          value={formatAED(netMargin)}
          accent={netMargin >= 0 ? '#00c853' : '#ff3d00'}
          subtitle="MRR − Costs"
        />
      </div>

      {/* Two-column: Revenue Projection Chart + Cost Breakdown Pie */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Revenue Projection Chart */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #e0dbd2',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <h3 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: '#1a1a1a',
            marginBottom: 8,
          }}>
            Revenue Growth Projection
          </h3>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: '#666',
            marginBottom: 20,
          }}>
            Projected MRR as client base grows to 50 (avg {formatAED(avgMRRPerClient)}/client)
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={progressData} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0dbd2" />
              <XAxis
                dataKey="shortMonth"
                tick={{ fill: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}
              />
              <YAxis
                tick={{ fill: '#666', fontFamily: 'Space Mono, monospace', fontSize: 11 }}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`}
                label={{ value: 'AED', angle: -90, position: 'insideLeft', style: { fontFamily: 'DM Sans, sans-serif', fontSize: 12, fill: '#666' } }}
              />
              <Tooltip
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid #e0dbd2',
                  borderRadius: 8,
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 12,
                }}
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (value === undefined || name === undefined) return ['—', ''];
                  return [formatAED(value), name];
                }}
              />
              <Legend wrapperStyle={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12 }} />
              <Bar dataKey="projectedMRR" fill="#60a5fa" name="Projected MRR" radius={[6, 6, 0, 0]} opacity={0.7} />
              <Line type="monotone" dataKey="projectedMRR" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3 }} name="MRR Trajectory" />
              {currentMRR > 0 && (
                <Bar dataKey="actualMRR" fill="#00c853" name="Actual MRR" radius={[6, 6, 0, 0]} />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Breakdown Pie */}
        <div style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #e0dbd2',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}>
          <h3 style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: '#1a1a1a',
            marginBottom: 8,
          }}>
            Cost Breakdown
          </h3>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: '#666',
            marginBottom: 16,
          }}>
            Total: {formatAED(totalMonthlyCost)}/mo
          </p>

          {costBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={costBreakdown}
                    dataKey="amount"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {costBreakdown.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e0dbd2',
                      borderRadius: 8,
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 12,
                    }}
                    formatter={(value: number | undefined) => {
                      if (value === undefined) return ['—', ''];
                      return [formatAED(value), 'Amount'];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                {costBreakdown.map((entry) => (
                  <div key={entry.category} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 3, background: entry.color }} />
                      <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#666' }}>
                        {entry.label}
                      </span>
                    </div>
                    <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", fontWeight: 600, color: '#1a1a1a' }}>
                      {formatAED(entry.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', paddingTop: 40 }}>
              No cost data available
            </p>
          )}
        </div>
      </div>

      {/* Client Growth Chart */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #e0dbd2',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        marginBottom: 24,
      }}>
        <h3 style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color: '#1a1a1a',
          marginBottom: 8,
        }}>
          Cumulative Client Growth Trajectory
        </h3>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: '#666',
          marginBottom: 20,
        }}>
          Blue bars: Target total clients by month-end | Green bars: Actual total clients | Line: Target trajectory to 50
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0dbd2" />
            <XAxis
              dataKey="shortMonth"
              tick={{ fill: '#666', fontFamily: 'DM Sans, sans-serif', fontSize: 12 }}
            />
            <YAxis
              domain={[0, 55]}
              tick={{ fill: '#666', fontFamily: 'Space Mono, monospace', fontSize: 11 }}
              label={{ value: 'Total Clients (Cumulative)', angle: -90, position: 'insideLeft', style: { fontFamily: 'DM Sans, sans-serif', fontSize: 12, fill: '#666' } }}
            />
            <Tooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #e0dbd2',
                borderRadius: 8,
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 12,
              }}
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined || name === undefined) return ['—', ''];
                if (name === 'Cumulative Target') return [`${value} total`, name];
                if (name === 'Actual Total') return value > 0 ? [`${value} total`, name] : ['No data', name];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontFamily: 'DM Sans, sans-serif', fontSize: 12 }} />
            <Bar dataKey="cumulativeTarget" fill="#60a5fa" name="Cumulative Target" radius={[8, 8, 0, 0]} />
            <Bar dataKey="actual" fill="#00c853" name="Actual Total" radius={[8, 8, 0, 0]} />
            <Line type="monotone" dataKey="cumulativeTarget" stroke="#1a1a1a" strokeWidth={3} dot={{ r: 4 }} name="Target Line" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Breakdown Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: 24,
        border: '1px solid #e0dbd2',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}>
        <h3 style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          fontSize: 16,
          color: '#1a1a1a',
          marginBottom: 8,
        }}>
          Monthly Acquisition & Revenue Plan
        </h3>
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 13,
          color: '#666',
          marginBottom: 20,
        }}>
          Add {monthlyAcquisitionTarget} new clients every month to reach 50 total by December 2026
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                <th style={{ ...thStyle }}>Month 2026</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Target Total</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actual Total</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Add This Month</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Projected MRR</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Projected Total Rev</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {monthlyTargets.map((m, idx) => {
                const isCurrent = idx === 0;
                const isOnTrack = m.actual >= m.cumulativeTarget;
                const hasPastData = m.actual > 0;

                return (
                  <tr
                    key={m.month}
                    style={{
                      borderBottom: '1px solid #e0dbd2',
                      background: isCurrent ? '#f0faf0' : idx % 2 === 0 ? '#fafafa' : '#fff',
                    }}
                  >
                    <td style={{ padding: '12px 8px', color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: isCurrent ? 700 : 400 }}>
                      {m.month} {isCurrent && <span style={{ color: '#00c853', fontSize: 10, fontWeight: 600 }}>(NOW)</span>}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: '#60a5fa', fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                      {m.cumulativeTarget}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', color: hasPastData ? '#00c853' : '#ccc', fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                      {hasPastData ? m.actual : '—'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 600 }}>
                      <span style={{ color: '#1a1a1a', background: '#fef3c7', padding: '4px 8px', borderRadius: 4 }}>
                        +{m.monthlyNew}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 600, color: '#00c853' }}>
                      {formatAED(m.projectedMRR)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>
                      {formatAED(m.projectedTotalRev)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      {hasPastData ? (
                        <span style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 700,
                          background: isOnTrack ? '#d1fae5' : '#fed7d7',
                          color: isOnTrack ? '#065f46' : '#991b1b',
                        }}>
                          {isOnTrack ? 'On Track' : 'Behind'}
                        </span>
                      ) : (
                        <span style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: 600,
                          background: '#f3f4f6',
                          color: '#6b7280',
                        }}>
                          Future
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8' }}>
                <td style={{ padding: '12px 8px', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
                  DEC TARGET
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: '#60a5fa' }}>
                  {targetClients}
                </td>
                <td></td>
                <td></td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: '#00c853' }}>
                  {formatAED(projectedMRR50)}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>
                  {formatAED(projectedMRR50 + targetClients * avgOneTimePerClient)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
