'use client';

import { useMemo } from 'react';
import type { MonthlyCost, CostCategory } from '@/lib/models/platform-types';
import { COST_CATEGORY_LABELS } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTH_SHORT[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
}

// Per-category colors
const CATEGORY_COLORS: Record<string, string> = {
  payroll:        '#6366f1',
  sales_spend:    '#f59e0b',
  commissions:    '#10b981',
  aws:            '#3b82f6',
  chatwoot_seats: '#a855f7',
  chatwoot_sub:   '#ec4899',
};
const FALLBACK_COLORS = ['#ef4444', '#14b8a6', '#f97316', '#84cc16', '#06b6d4', '#d946ef'];

function getCategoryColor(cat: string, idx: number) {
  return CATEGORY_COLORS[cat] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function getCategoryLabel(cat: string) {
  return cat in COST_CATEGORY_LABELS ? COST_CATEGORY_LABELS[cat as CostCategory] : cat;
}

interface CostsFlowTableProps {
  costs: MonthlyCost[];
}

export default function CostsFlowTable({ costs }: CostsFlowTableProps) {
  // Always projected
  const { months, categories, pivot, categoryTotals, monthTotals, grandTotal, chartData } = useMemo(() => {
    const filtered = costs.filter((c) => c.type === 'projected');

    const monthSet = new Set<string>();
    const categorySet = new Set<string>();
    const pivot: Record<string, Record<string, number>> = {};
    const categoryTotals: Record<string, number> = {};
    const monthTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (const c of filtered) {
      // Merge chatwoot_sub into chatwoot_seats — same cost, two DB categories
      const cat = c.category === 'chatwoot_sub' ? 'chatwoot_seats' : c.category;
      monthSet.add(c.month);
      categorySet.add(cat);
      if (!pivot[cat]) pivot[cat] = {};
      pivot[cat][c.month] = (pivot[cat][c.month] || 0) + c.amount;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + c.amount;
      monthTotals[c.month] = (monthTotals[c.month] || 0) + c.amount;
      grandTotal += c.amount;
    }

    const months = Array.from(monthSet).sort();
    // Sort categories by total descending
    const categories = Array.from(categorySet).sort(
      (a, b) => (categoryTotals[b] || 0) - (categoryTotals[a] || 0)
    );

    // Build stacked chart data — one entry per month, one key per category
    const chartData = months.map((m) => {
      const row: Record<string, string | number> = { month: formatMonth(m) };
      for (const cat of categories) {
        row[cat] = pivot[cat]?.[m] || 0;
      }
      return row;
    });

    return { months, categories, pivot, categoryTotals, monthTotals, grandTotal, chartData };
  }, [costs]);

  if (costs.filter((c) => c.type === 'projected').length === 0) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e0dbd2',
        padding: 48,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
          No projected cost data found.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stacked Categorical Bar Chart */}
      <div style={{
        height: 260,
        background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
        borderRadius: 12,
        padding: '16px 12px 8px',
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
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.45)' }}
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
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                return (
                  <div style={{
                    background: 'rgba(20,20,35,0.97)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    color: '#ffffff',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    minWidth: 180,
                  }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
                      {label}
                    </p>
                    {[...payload].reverse().map((p) => (
                      Number(p.value) > 0 && (
                        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color as string, flexShrink: 0 }} />
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>
                              {getCategoryLabel(p.dataKey as string)}
                            </span>
                          </div>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700, color: '#fff' }}>
                            {formatAED(Number(p.value), 0)}
                          </span>
                        </div>
                      )
                    ))}
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Total</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: '#f87171' }}>{formatAED(total, 0)}</span>
                    </div>
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 4 }}
              formatter={(value) => (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                  {getCategoryLabel(value)}
                </span>
              )}
            />
            {categories.map((cat, idx) => (
              <Bar
                key={cat}
                dataKey={cat}
                stackId="costs"
                fill={getCategoryColor(cat, idx)}
                radius={idx === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={40}
              />
            ))}
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
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: months.length * 90 + 200 }}>
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
              const color = getCategoryColor(cat, i);
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                    {getCategoryLabel(cat)}
                  </td>
                  {months.map((m) => {
                    const amount = pivot[cat]?.[m];
                    return (
                      <td key={m} style={{
                        padding: '8px 8px',
                        textAlign: 'right',
                        fontFamily: "'Space Mono', monospace",
                        fontSize: 10,
                        fontWeight: amount ? 600 : 400,
                        color: amount ? color : '#ccc',
                        background: amount ? `${color}0d` : undefined,
                      }}>
                        {amount ? formatAED(amount, 0) : '—'}
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
            <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8' }}>
              <td style={{
                padding: '10px 12px',
                fontWeight: 700,
                color: '#1a1a1a',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 10,
                textTransform: 'uppercase',
                position: 'sticky',
                left: 0,
                background: '#f5f0e8',
                zIndex: 1,
              }}>
                Monthly Total
              </td>
              {months.map((m) => (
                <td key={m} style={{
                  padding: '10px 8px',
                  textAlign: 'right',
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  fontSize: 10,
                  color: '#1a1a1a',
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
