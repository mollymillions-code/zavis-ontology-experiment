'use client';

import { useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import type { MonthlyCost, CostCategory } from '@/lib/models/platform-types';
import { COST_CATEGORY_LABELS } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTH_SHORT[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
}

function generateId() {
  return `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  payroll:        '#6366f1',
  sales_spend:    '#f59e0b',
  commissions:    '#10b981',
  aws:            '#3b82f6',
  chatwoot_seats: '#a855f7',
  chatwoot_sub:   '#a855f7',
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
  totalSeats: number;
  onCostsUpdated: () => void;
}

export default function CostsFlowTable({ costs, totalSeats, onCostsUpdated }: CostsFlowTableProps) {
  const [editedActuals, setEditedActuals] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  function normCat(cat: string) { return cat === 'chatwoot_sub' ? 'chatwoot_seats' : cat; }

  // Fixed months: Feb 2026 → Dec 2026
  const months = useMemo(() => {
    const result: string[] = [];
    for (let m = 2; m <= 12; m++) {
      result.push(`2026-${String(m).padStart(2, '0')}`);
    }
    return result;
  }, []);

  const { categories, projFlat, actPivot, projCatTotals, actCatTotals, projMonthTotals, actMonthTotals, projGrand, actGrand, chartData } = useMemo(() => {
    const categorySet = new Set<string>();
    // Collect projected values from data (only first occurrence per category — flat rate)
    const projFlat: Record<string, number> = {};
    const actPivot: Record<string, Record<string, number>> = {};
    const actCatTotals: Record<string, number> = {};
    const actMonthTotals: Record<string, number> = {};
    let actGrand = 0;

    for (const c of costs) {
      const cat = normCat(c.category);
      categorySet.add(cat);

      if (c.type === 'projected') {
        // Take the projected value (first/only month) as flat rate
        projFlat[cat] = (projFlat[cat] || 0) + c.amount;
      } else {
        if (!actPivot[cat]) actPivot[cat] = {};
        actPivot[cat][c.month] = (actPivot[cat][c.month] || 0) + c.amount;
        actCatTotals[cat] = (actCatTotals[cat] || 0) + c.amount;
        actMonthTotals[c.month] = (actMonthTotals[c.month] || 0) + c.amount;
        actGrand += c.amount;
      }
    }

    // Sort categories by projected amount (descending)
    const categories = Array.from(categorySet).sort(
      (a, b) => (projFlat[b] || 0) - (projFlat[a] || 0)
    );

    // Projected totals: flat per month × 11 months
    const projCatTotals: Record<string, number> = {};
    const projMonthTotals: Record<string, number> = {};
    let projGrand = 0;
    for (const cat of categories) {
      const flat = projFlat[cat] || 0;
      projCatTotals[cat] = flat * months.length;
      projGrand += flat * months.length;
      for (const m of months) {
        projMonthTotals[m] = (projMonthTotals[m] || 0) + flat;
      }
    }

    // Chart data — stacked by category, using projected flat values for all months
    const chartData = months.map((m) => {
      const row: Record<string, string | number> = { month: formatMonth(m) };
      for (const cat of categories) {
        row[cat] = projFlat[cat] || 0;
      }
      return row;
    });

    return { categories, projFlat, actPivot, projCatTotals, actCatTotals, projMonthTotals, actMonthTotals, projGrand, actGrand, chartData };
  }, [costs, months]);

  // Editing helpers
  function getActualValue(cat: string, month: string): number {
    const key = `${cat}-${month}`;
    if (editedActuals[key] !== undefined) return editedActuals[key];
    return actPivot[cat]?.[month] || 0;
  }

  function handleActualEdit(cat: string, month: string, value: string) {
    const key = `${cat}-${month}`;
    setEditedActuals((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  }

  const hasEdits = Object.keys(editedActuals).length > 0;

  async function handleSave() {
    if (!hasEdits) return;
    setSaving(true);
    try {
      const promises = Object.entries(editedActuals).map(async ([key, amount]) => {
        const parts = key.match(/^(.+?)-(\d{4}-\d{2})$/);
        if (!parts) return;
        const cat = parts[1];
        const month = parts[2];

        const existing = costs.find((c) =>
          normCat(c.category) === cat && c.month === month && c.type === 'actual'
        );

        if (existing) {
          await fetch(`/api/costs/${existing.month}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: existing.id, amount, notes: existing.notes || '' }),
          });
        } else if (amount > 0) {
          await fetch('/api/costs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: generateId(),
              month,
              category: cat,
              amount,
              type: 'actual' as const,
              notes: '',
              createdAt: new Date().toISOString(),
            }),
          });
        }
      });

      await Promise.all(promises);
      setEditedActuals({});
      onCostsUpdated();
    } finally {
      setSaving(false);
    }
  }

  if (costs.length === 0) {
    return (
      <div style={{
        background: '#ffffff', borderRadius: 12, border: '1px solid #e0dbd2',
        padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>No cost data found.</p>
      </div>
    );
  }

  return (
    <div>
      {/* ── Stacked Categorical Bar Chart ── */}
      <div style={{
        height: 260,
        background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
        borderRadius: 12, padding: '16px 12px 8px',
        position: 'relative', overflow: 'hidden', marginBottom: 16,
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '20px 20px', borderRadius: 12, pointerEvents: 'none',
        }} />
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
            <XAxis
              dataKey="month"
              tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.45)' }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.3)' }}
              axisLine={false} tickLine={false}
              tickFormatter={(v) => `${Math.round(v / 1000)}K`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
                return (
                  <div style={{
                    background: 'rgba(20,20,35,0.97)', backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                    padding: '10px 14px', color: '#ffffff', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    minWidth: 180,
                  }}>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>{label}</p>
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
            {categories.map((cat, idx) => (
              <Bar
                key={cat} dataKey={cat} stackId="costs"
                fill={getCategoryColor(cat, idx)}
                radius={idx === categories.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]}
                maxBarSize={40} name={getCategoryLabel(cat)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          {categories.map((cat, idx) => (
            <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: getCategoryColor(cat, idx), flexShrink: 0 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
                {getCategoryLabel(cat)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Save Bar ── */}
      {hasEdits && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', marginBottom: 12, borderRadius: 10,
          background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
        }}>
          <p style={{ margin: 0, fontSize: 12, color: '#d97706', fontFamily: "'DM Sans', sans-serif" }}>
            You have unsaved changes to actual costs.
          </p>
          <button onClick={handleSave} disabled={saving} style={{
            background: '#00c853', border: 'none', borderRadius: 8, padding: '8px 16px',
            color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* ── Multi-Month Table: Feb–Dec 2026, Proj (flat) + Actual (editable) ── */}
      <div style={{
        background: '#ffffff', borderRadius: 12, border: '1px solid #e0dbd2',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflowX: 'auto',
      }}>
        <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: months.length * 150 + 260 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e0dbd2' }}>
              <th rowSpan={2} style={{
                padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#666',
                textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5,
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                position: 'sticky', left: 0, background: '#fff', zIndex: 3, minWidth: 160,
                borderBottom: '2px solid #e0dbd2',
              }}>Category</th>
              <th rowSpan={2} style={{
                padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: '#666',
                textTransform: 'uppercase', fontSize: 9, letterSpacing: 0.3,
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', minWidth: 70,
                borderBottom: '2px solid #e0dbd2',
              }}>Per Seat</th>
              {months.map((m) => (
                <th key={m} colSpan={2} style={{
                  padding: '8px 4px 4px', textAlign: 'center', fontWeight: 600, color: '#666',
                  fontSize: 9, letterSpacing: 0.3, fontFamily: "'Space Mono', monospace",
                  whiteSpace: 'nowrap', borderLeft: '1px solid #e0dbd2',
                }}>{formatMonth(m)}</th>
              ))}
              <th colSpan={2} style={{
                padding: '8px 4px 4px', textAlign: 'center', fontWeight: 700, color: '#1a1a1a',
                fontSize: 10, letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif",
                textTransform: 'uppercase', whiteSpace: 'nowrap', borderLeft: '2px solid #e0dbd2',
              }}>Total</th>
            </tr>
            <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
              {months.flatMap((m) => [
                <th key={`${m}-p`} style={{
                  padding: '2px 4px 6px', textAlign: 'right', fontSize: 8, fontWeight: 600,
                  color: '#d97706', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3,
                  borderLeft: '1px solid #e0dbd2',
                }}>Proj</th>,
                <th key={`${m}-a`} style={{
                  padding: '2px 4px 6px', textAlign: 'right', fontSize: 8, fontWeight: 600,
                  color: '#dc2626', fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3,
                }}>Actual</th>,
              ])}
              <th style={{
                padding: '2px 4px 6px', textAlign: 'right', fontSize: 8, fontWeight: 600,
                color: '#d97706', fontFamily: "'DM Sans', sans-serif", borderLeft: '2px solid #e0dbd2',
              }}>Proj</th>
              <th style={{
                padding: '2px 4px 6px', textAlign: 'right', fontSize: 8, fontWeight: 600,
                color: '#dc2626', fontFamily: "'DM Sans', sans-serif",
              }}>Actual</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, i) => {
              const rowBg = i % 2 === 0 ? '#fafaf8' : '#ffffff';
              const flatProj = projFlat[cat] || 0;
              const actTotal = actCatTotals[cat] || 0;
              const perSeat = totalSeats > 0 && actTotal > 0 ? actTotal / totalSeats : 0;

              return (
                <tr key={cat} style={{ borderBottom: '1px solid #e0dbd2', background: rowBg }}>
                  <td style={{
                    padding: '8px 12px', fontWeight: 600, color: '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif", fontSize: 11, whiteSpace: 'nowrap',
                    position: 'sticky', left: 0, background: rowBg, zIndex: 1,
                  }}>{getCategoryLabel(cat)}</td>
                  <td style={{
                    padding: '8px 6px', textAlign: 'right',
                    fontFamily: "'Space Mono', monospace", fontSize: 9, color: '#999',
                  }}>{perSeat > 0 ? formatAED(perSeat, 0) : '—'}</td>
                  {months.flatMap((m) => {
                    const act = getActualValue(cat, m);
                    const editKey = `${cat}-${m}`;
                    const isEdited = editedActuals[editKey] !== undefined;
                    return [
                      <td key={`${m}-p`} style={{
                        padding: '4px 6px', textAlign: 'right',
                        fontFamily: "'Space Mono', monospace", fontSize: 10,
                        fontWeight: flatProj > 0 ? 600 : 400,
                        color: flatProj > 0 ? '#d97706' : '#ccc',
                        background: flatProj > 0 ? 'rgba(245,158,11,0.06)' : undefined,
                        borderLeft: '1px solid #e0dbd2',
                      }}>{flatProj > 0 ? formatAED(flatProj, 0) : ''}</td>,
                      <td key={`${m}-a`} style={{
                        padding: '2px 2px', textAlign: 'right',
                        background: isEdited ? 'rgba(239,68,68,0.08)' : (act > 0 ? 'rgba(239,68,68,0.04)' : undefined),
                      }}>
                        <input
                          type="number" value={act || ''} placeholder="—"
                          onChange={(e) => handleActualEdit(cat, m, e.target.value)}
                          style={{
                            width: '100%', maxWidth: 72, padding: '4px 4px',
                            textAlign: 'right', border: 'none', background: 'transparent',
                            fontFamily: "'Space Mono', monospace", fontSize: 10,
                            fontWeight: 600, color: act > 0 ? '#dc2626' : '#ccc', outline: 'none',
                          }}
                        />
                      </td>,
                    ];
                  })}
                  <td style={{
                    padding: '8px 6px', textAlign: 'right',
                    fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 10,
                    color: '#d97706', borderLeft: '2px solid #e0dbd2',
                  }}>{formatAED(projCatTotals[cat] || 0, 0)}</td>
                  <td style={{
                    padding: '8px 6px', textAlign: 'right',
                    fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 10, color: '#dc2626',
                  }}>{formatAED(actTotal, 0)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8' }}>
              <td style={{
                padding: '10px 12px', fontWeight: 700, color: '#1a1a1a',
                fontFamily: "'DM Sans', sans-serif", fontSize: 10, textTransform: 'uppercase',
                position: 'sticky', left: 0, background: '#f5f0e8', zIndex: 1,
              }}>Monthly Total</td>
              <td />
              {months.flatMap((m) => [
                <td key={`${m}-tp`} style={{
                  padding: '10px 6px', textAlign: 'right',
                  fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 10,
                  color: '#d97706', borderLeft: '1px solid #e0dbd2',
                }}>{(projMonthTotals[m] || 0) > 0 ? formatAED(projMonthTotals[m], 0) : ''}</td>,
                <td key={`${m}-ta`} style={{
                  padding: '10px 6px', textAlign: 'right',
                  fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 10, color: '#dc2626',
                }}>{(actMonthTotals[m] || 0) > 0 ? formatAED(actMonthTotals[m], 0) : ''}</td>,
              ])}
              <td style={{
                padding: '10px 6px', textAlign: 'right',
                fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11,
                color: '#d97706', borderLeft: '2px solid #e0dbd2',
              }}>{formatAED(projGrand, 0)}</td>
              <td style={{
                padding: '10px 6px', textAlign: 'right',
                fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 11, color: '#dc2626',
              }}>{formatAED(actGrand, 0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
