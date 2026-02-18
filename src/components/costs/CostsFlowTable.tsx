'use client';

import { useMemo } from 'react';
import type { MonthlyCost, CostCategory } from '@/lib/models/platform-types';
import { COST_CATEGORY_LABELS } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTH_SHORT[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
}

interface CostsFlowTableProps {
  costs: MonthlyCost[];
  viewType: 'actual' | 'projected';
}

export default function CostsFlowTable({ costs, viewType }: CostsFlowTableProps) {
  const isActual = viewType === 'actual';
  const cellBg = isActual ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)';
  const cellText = isActual ? '#dc2626' : '#d97706';
  const barGradId = isActual ? 'cost-bar-grad-actual' : 'cost-bar-grad-projected';
  const barTop = isActual ? '#f87171' : '#fbbf24';
  const barBot = isActual ? '#dc2626' : '#d97706';

  const { months, categories, pivot, categoryTotals, monthTotals, grandTotal, chartData } = useMemo(() => {
    const filtered = costs.filter((c) => c.type === viewType);
    const monthSet = new Set<string>();
    const categorySet = new Set<string>();
    const pivot: Record<string, Record<string, number>> = {};
    const categoryTotals: Record<string, number> = {};
    const monthTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const c of filtered) {
      monthSet.add(c.month);
      categorySet.add(c.category);
      if (!pivot[c.category]) pivot[c.category] = {};
      pivot[c.category][c.month] = (pivot[c.category][c.month] || 0) + c.amount;
      categoryTotals[c.category] = (categoryTotals[c.category] || 0) + c.amount;
      monthTotals[c.month] = (monthTotals[c.month] || 0) + c.amount;
      grandTotal += c.amount;
    }

    const months = Array.from(monthSet).sort();
    const categories = Array.from(categorySet).sort(
      (a, b) => (categoryTotals[b] || 0) - (categoryTotals[a] || 0)
    );
    const chartData = months.map((m) => ({
      month: formatMonth(m),
      total: monthTotals[m] || 0,
      count: filtered.filter((c) => c.month === m).length,
    }));

    return { months, categories, pivot, categoryTotals, monthTotals, grandTotal, chartData };
  }, [costs, viewType]);

  if (costs.filter((c) => c.type === viewType).length === 0) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e0dbd2',
        padding: 48,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
          No {viewType} cost data found.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Bar Chart */}
      <div style={{
        height: 200,
        background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
        borderRadius: 12,
        padding: '16px 12px',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 16,
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '20px 20px',
          borderRadius: 12,
          pointerEvents: 'none',
        }} />
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
            <defs>
              <linearGradient id={barGradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={barTop} />
                <stop offset="100%" stopColor={barBot} />
              </linearGradient>
              <filter id="cost-glow">
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
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700, color: barTop }}>
                      {formatAED(d.total)}
                    </p>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      {d.count} {d.count === 1 ? 'entry' : 'entries'}
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="total"
              radius={[4, 4, 0, 0]}
              barSize={24}
              fill={`url(#${barGradId})`}
              style={{ filter: 'url(#cost-glow)' }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pivot Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e0dbd2',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: months.length * 80 + 280 }}>
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
                minWidth: 180,
              }}>
                Category
              </th>
              {months.map((m) => (
                <th key={m} style={{
                  padding: '10px 6px',
                  textAlign: 'right',
                  fontWeight: 600,
                  color: '#666',
                  fontSize: 9,
                  letterSpacing: 0.3,
                  fontFamily: "'Space Mono', monospace",
                  whiteSpace: 'nowrap',
                  minWidth: 80,
                }}>
                  {formatMonth(m)}
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
                minWidth: 90,
              }}>
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => {
              const label =
                cat in COST_CATEGORY_LABELS
                  ? COST_CATEGORY_LABELS[cat as CostCategory]
                  : cat;
              return (
                <tr key={cat} style={{
                  borderBottom: '1px solid #e0dbd2',
                  background: i % 2 === 0 ? '#fafaf8' : '#ffffff',
                }}>
                  <td style={{
                    padding: '8px 12px',
                    fontWeight: 600,
                    color: '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                    position: 'sticky',
                    left: 0,
                    background: i % 2 === 0 ? '#fafaf8' : '#ffffff',
                    zIndex: 1,
                  }}>
                    {label}
                  </td>
                  {months.map((m) => {
                    const amount = pivot[cat]?.[m];
                    if (!amount) {
                      return (
                        <td key={m} style={{
                          padding: '8px 6px',
                          textAlign: 'right',
                          fontFamily: "'Space Mono', monospace",
                          fontSize: 10,
                          color: '#ccc',
                        }}>
                          —
                        </td>
                      );
                    }
                    return (
                      <td key={m} style={{
                        padding: '8px 6px',
                        textAlign: 'right',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        fontWeight: 600,
                        color: cellText,
                        background: cellBg,
                      }}>
                        {formatAED(amount, 0)}
                      </td>
                    );
                  })}
                  <td style={{
                    padding: '8px 12px',
                    textAlign: 'right',
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: 700,
                    fontSize: 11,
                    color: '#1a1a1a',
                    borderLeft: '2px solid #e0dbd2',
                  }}>
                    {formatAED(categoryTotals[cat] || 0, 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #e0dbd2', background: '#fef2f2' }}>
              <td style={{
                padding: '10px 12px',
                fontWeight: 700,
                color: '#1a1a1a',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                textTransform: 'uppercase',
                position: 'sticky',
                left: 0,
                background: '#fef2f2',
                zIndex: 1,
              }}>
                Monthly Total
              </td>
              {months.map((m) => (
                <td key={m} style={{
                  padding: '10px 6px',
                  textAlign: 'right',
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  fontSize: 10,
                  color: cellText,
                }}>
                  {formatAED(monthTotals[m] || 0, 0)}
                </td>
              ))}
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 12,
                color: '#dc2626',
                borderLeft: '2px solid #e0dbd2',
              }}>
                {formatAED(grandTotal, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
