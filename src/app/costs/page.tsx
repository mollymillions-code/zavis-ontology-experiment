'use client';

import { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { formatAED } from '@/lib/utils/currency';
import { Save } from 'lucide-react';
import type { MonthlyCost, CostCategory } from '@/lib/models/platform-types';
import { COST_CATEGORY_LABELS } from '@/lib/models/platform-types';
import { useClientStore } from '@/lib/store/customer-store';

export default function CostsPage() {
  const clients = useClientStore((s) => s.clients);
  const [costs, setCosts] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/costs')
      .then((res) => res.json())
      .then((data) => {
        setCosts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const { totalActual, totalProjected, totalSeats } = useMemo(() => {
    const actual = costs.filter((c) => c.type === 'actual');
    const projected = costs.filter((c) => c.type === 'projected');
    const totActual = actual.reduce((sum, c) => sum + c.amount, 0);
    const totProjected = projected.reduce((sum, c) => sum + c.amount, 0);
    const activeClients = clients.filter((c) => c.status === 'active');
    const totSeats = activeClients.reduce((sum, c) => sum + (c.seatCount || 0), 0);
    return {
      totalActual: totActual,
      totalProjected: totProjected,
      totalSeats: totSeats,
    };
  }, [costs, clients]);

  const categories: CostCategory[] = ['aws', 'chatwoot_seats', 'payroll', 'sales_spend', 'chatwoot_sub', 'commissions'];

  function getCostAmount(category: CostCategory, type: 'actual' | 'projected'): number {
    const key = `${category}-${type}`;
    if (editedValues[key] !== undefined) return editedValues[key];

    const cost = costs.find((c) => c.category === category && c.type === type);
    return cost ? cost.amount : 0;
  }

  function handleEdit(category: CostCategory, type: 'actual' | 'projected', value: string) {
    const key = `${category}-${type}`;
    const numValue = parseFloat(value) || 0;
    setEditedValues({ ...editedValues, [key]: numValue });
  }

  function handlePerSeatEdit(category: CostCategory, value: string) {
    const perSeat = parseFloat(value) || 0;
    const monthly = perSeat * totalSeats;
    const key = `${category}-actual`;
    setEditedValues({ ...editedValues, [key]: monthly });
  }

  async function handleSave() {
    setSaving(true);

    for (const [key, value] of Object.entries(editedValues)) {
      const [category, type] = key.split('-');
      const cost = costs.find((c) => c.category === category && c.type === type);

      if (cost) {
        await fetch(`/api/costs/${cost.month}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cost.id, amount: value }),
        });
      }
    }

    // Refresh data
    const res = await fetch('/api/costs');
    const data = await res.json();
    setCosts(data);
    setEditedValues({});
    setSaving(false);
  }

  const tableStyle = {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)',
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '6px 10px',
    color: '#ffffff',
    fontFamily: 'Space Mono, monospace',
    fontSize: 13,
    width: '120px',
    textAlign: 'right' as const,
  };

  if (loading) {
    return (
      <PageShell title="Costs" subtitle="Monthly operational expenses">
        <div style={{ color: '#666', padding: 40, textAlign: 'center' }}>Loading...</div>
      </PageShell>
    );
  }

  const growthRate = totalActual > 0 ? ((totalProjected - totalActual) / totalActual) * 100 : 0;

  return (
    <PageShell title="Costs" subtitle="Monthly operational expenses">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          title="Current Monthly Burn"
          value={formatAED(totalActual)}
          accent="#ff6e40"
        />
        <KPICard
          title="Projected Monthly Burn"
          value={formatAED(totalProjected)}
          accent="#fbbf24"
        />
        <KPICard
          title="Growth Rate"
          value={`${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`}
          accent={growthRate > 50 ? "#ff6e40" : "#00c853"}
        />
      </div>

      {/* Cost Breakdown Table */}
      <div style={tableStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#ffffff', fontFamily: 'DM Sans, sans-serif' }}>
            Cost Breakdown
          </h2>
          <button
            onClick={handleSave}
            disabled={Object.keys(editedValues).length === 0 || saving}
            style={{
              background: Object.keys(editedValues).length > 0 ? '#00c853' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#ffffff',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: 13,
              fontWeight: 600,
              cursor: Object.keys(editedValues).length > 0 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Category
              </th>
              <th style={{ textAlign: 'right', padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Per Seat Cost
              </th>
              <th style={{ textAlign: 'right', padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Monthly Cost
              </th>
              <th style={{ textAlign: 'right', padding: '12px 8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans, sans-serif', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Annual Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => {
              const monthly = getCostAmount(cat, 'actual');
              const annual = monthly * 12;
              const perSeat = totalSeats > 0 ? monthly / totalSeats : 0;

              return (
                <tr
                  key={cat}
                  style={{
                    borderBottom: idx < categories.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '14px 8px', color: '#ffffff', fontFamily: 'DM Sans, sans-serif', fontSize: 14 }}>
                    {COST_CATEGORY_LABELS[cat]}
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      value={parseFloat(perSeat.toFixed(2))}
                      onChange={(e) => handlePerSeatEdit(cat, e.target.value)}
                      style={{ ...inputStyle, width: '100px' }}
                    />
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      value={monthly}
                      onChange={(e) => handleEdit(cat, 'actual', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: '14px 8px', textAlign: 'right', color: '#60a5fa', fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 600 }}>
                    {formatAED(annual)}
                  </td>
                </tr>
              );
            })}
            <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '14px 8px', color: '#ffffff', fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600 }}>
                TOTAL
              </td>
              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#fbbf24', fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700 }}>
                {formatAED(totalSeats > 0 ? totalActual / totalSeats : 0)}
              </td>
              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#00c853', fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700 }}>
                {formatAED(totalActual)}
              </td>
              <td style={{ padding: '14px 8px', textAlign: 'right', color: '#60a5fa', fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700 }}>
                {formatAED(totalActual * 12)}
              </td>
            </tr>
          </tbody>
        </table>

        {Object.keys(editedValues).length > 0 && (
          <div style={{ marginTop: 16, padding: 12, background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: 8 }}>
            <p style={{ margin: 0, color: '#fbbf24', fontSize: 12, fontFamily: 'DM Sans, sans-serif' }}>
              You have unsaved changes. Click &ldquo;Save Changes&rdquo; to persist them to the database.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
