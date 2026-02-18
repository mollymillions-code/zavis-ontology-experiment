'use client';

import { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import CostsFlowTable from '@/components/costs/CostsFlowTable';
import { formatAED } from '@/lib/utils/currency';
import { Save, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { MonthlyCost, CostCategory } from '@/lib/models/platform-types';
import { COST_CATEGORY_LABELS } from '@/lib/models/platform-types';
import { useClientStore } from '@/lib/store/customer-store';

const ALL_CATEGORIES: CostCategory[] = [
  'aws',
  'chatwoot_seats',
  'payroll',
  'sales_spend',
  'chatwoot_sub',
  'commissions',
];

function generateId() {
  return `cost-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthLabel(month: string) {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

interface AddCostForm {
  category: string;
  customCategory: string;
  amount: string;
  notes: string;
}

export default function CostsPage() {
  const clients = useClientStore((s) => s.clients);
  const [costs, setCosts] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, number>>({});
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonth());
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddCostForm>({
    category: 'aws',
    customCategory: '',
    amount: '',
    notes: '',
  });
  const [addingCost, setAddingCost] = useState(false);

  useEffect(() => {
    fetch('/api/costs')
      .then((res) => res.json())
      .then((data: MonthlyCost[]) => {
        setCosts(data);
        // Default to latest month in data, or current month
        if (data.length > 0) {
          const months = Array.from(new Set(data.map((c) => c.month))).sort();
          const latest = months[months.length - 1];
          setSelectedMonth(latest || getCurrentMonth());
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // All unique months from costs + current month
  const allMonths = useMemo(() => {
    const fromData = new Set(costs.map((c) => c.month));
    fromData.add(getCurrentMonth());
    return Array.from(fromData).sort();
  }, [costs]);

  // Costs for the selected month only
  const monthCosts = useMemo(
    () => costs.filter((c) => c.month === selectedMonth),
    [costs, selectedMonth]
  );

  const { totalActual, totalSeats } = useMemo(() => {
    const totActual = monthCosts.reduce((sum, c) => sum + c.amount, 0);
    const activeClients = clients.filter((c) => c.status === 'active');
    const totSeats = activeClients.reduce((sum, c) => sum + (c.seatCount || 0), 0);
    return { totalActual: totActual, totalSeats: totSeats };
  }, [monthCosts, clients]);

  // Map of `category-type` → cost entry for selected month
  const costMap = useMemo(() => {
    const map: Record<string, MonthlyCost> = {};
    for (const cost of monthCosts) {
      map[`${cost.category}-${cost.type}`] = cost;
    }
    return map;
  }, [monthCosts]);

  // All category keys in the selected month (predefined + any custom ones)
  const categories = useMemo(() => {
    const fromMonth = monthCosts.map((c) => c.category);
    const combined = new Set(ALL_CATEGORIES.concat(fromMonth));
    return Array.from(combined);
  }, [monthCosts]);

  function getCostAmount(category: string, type: 'actual'): number {
    const key = `${category}-${type}`;
    if (editedValues[key] !== undefined) return editedValues[key];
    return costMap[key]?.amount || 0;
  }

  function getCostNotes(category: string, type: 'actual'): string {
    const key = `${category}-${type}`;
    if (editedNotes[key] !== undefined) return editedNotes[key];
    return costMap[key]?.notes || '';
  }

  function handleEdit(category: string, type: 'actual', value: string) {
    const key = `${category}-${type}`;
    setEditedValues((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }));
  }

  function handleNotesEdit(category: string, type: 'actual', value: string) {
    const key = `${category}-${type}`;
    setEditedNotes((prev) => ({ ...prev, [key]: value }));
  }

  function handlePerSeatEdit(category: string, value: string) {
    const perSeat = parseFloat(value) || 0;
    const monthly = perSeat * totalSeats;
    const key = `${category}-actual`;
    setEditedValues((prev) => ({ ...prev, [key]: monthly }));
  }

  function handleMonthChange(newMonth: string) {
    setSelectedMonth(newMonth);
    setEditedValues({});
    setEditedNotes({});
    setShowAddForm(false);
  }

  const hasEdits =
    Object.keys(editedValues).length > 0 || Object.keys(editedNotes).length > 0;

  async function handleSave() {
    if (!hasEdits) return;
    setSaving(true);

    try {
      // Merge all changed keys
      const changedKeys = new Set(
        Object.keys(editedValues).concat(Object.keys(editedNotes))
      );

      const updates = Array.from(changedKeys).flatMap((key) => {
        const dashIdx = key.lastIndexOf('-');
        const category = key.slice(0, dashIdx);
        const type = key.slice(dashIdx + 1) as 'actual';
        const existing = costMap[key];
        const amountEdited = editedValues[key] !== undefined;
        const amount = amountEdited ? editedValues[key] : existing?.amount ?? 0;
        const notes =
          editedNotes[key] !== undefined ? editedNotes[key] : existing?.notes ?? '';

        if (existing) {
          // Update existing entry
          return [fetch(`/api/costs/${existing.month}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: existing.id, amount, notes }),
          })];
        } else if (amountEdited && amount > 0) {
          // Only create a new DB entry if the user explicitly set an amount > 0
          return [fetch('/api/costs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: generateId(),
              month: selectedMonth,
              category,
              amount,
              type,
              notes,
              createdAt: new Date().toISOString(),
            }),
          })];
        }
        return [];
      });

      await Promise.all(updates);

      const res = await fetch('/api/costs');
      const data = await res.json();
      setCosts(data);
      setEditedValues({});
      setEditedNotes({});
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCost() {
    const categoryValue =
      addForm.category === '__custom__' ? addForm.customCategory.trim() : addForm.category;
    if (!categoryValue || !addForm.amount) return;

    setAddingCost(true);
    try {
      await fetch('/api/costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generateId(),
          month: selectedMonth,
          category: categoryValue,
          amount: parseFloat(addForm.amount) || 0,
          type: 'actual',
          notes: addForm.notes,
          createdAt: new Date().toISOString(),
        }),
      });

      const res = await fetch('/api/costs');
      const data = await res.json();
      setCosts(data);
      setShowAddForm(false);
      setAddForm({ category: 'aws', customCategory: '', amount: '', notes: '' });
    } finally {
      setAddingCost(false);
    }
  }

  async function handleDeleteCategory(category: string) {
    // Delete all cost entries for this category in the selected month
    const toDelete = monthCosts.filter((c) => c.category === category);
    if (toDelete.length === 0) return;
    await Promise.all(
      toDelete.map((c) =>
        fetch(`/api/costs/${c.month}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: c.id }),
        })
      )
    );
    const res = await fetch('/api/costs');
    const data = await res.json();
    setCosts(data);
  }

  const currentMonthIdx = allMonths.indexOf(selectedMonth);

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
    width: '110px',
    textAlign: 'right' as const,
  };

  const notesInputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: '6px 10px',
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 12,
    width: '100%',
    resize: 'none' as const,
  };

  if (loading) {
    return (
      <PageShell title="Costs" subtitle="Monthly operational expenses">
        <div style={{ color: '#666', padding: 40, textAlign: 'center' }}>Loading...</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Costs" subtitle="Monthly operational expenses">
      {/* Month Selector */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          background: '#f5f0e8',
          borderRadius: 12,
          padding: '10px 16px',
          width: 'fit-content',
        }}
      >
        <button
          onClick={() => currentMonthIdx > 0 && handleMonthChange(allMonths[currentMonthIdx - 1])}
          disabled={currentMonthIdx <= 0}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentMonthIdx > 0 ? 'pointer' : 'default',
            color: currentMonthIdx > 0 ? '#1a1a1a' : '#ccc',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <select
          value={selectedMonth}
          onChange={(e) => handleMonthChange(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            fontFamily: 'DM Sans, sans-serif',
            fontWeight: 700,
            fontSize: 15,
            color: '#1a1a1a',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {allMonths.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>
        <button
          onClick={() =>
            currentMonthIdx < allMonths.length - 1 &&
            handleMonthChange(allMonths[currentMonthIdx + 1])
          }
          disabled={currentMonthIdx >= allMonths.length - 1}
          style={{
            background: 'none',
            border: 'none',
            cursor: currentMonthIdx < allMonths.length - 1 ? 'pointer' : 'default',
            color: currentMonthIdx < allMonths.length - 1 ? '#1a1a1a' : '#ccc',
            display: 'flex',
            alignItems: 'center',
            padding: 4,
          }}
        >
          <ChevronRight size={18} />
        </button>
        {monthCosts.length === 0 && (
          <span
            style={{
              fontSize: 11,
              color: '#999',
              fontFamily: 'DM Sans, sans-serif',
              marginLeft: 8,
            }}
          >
            No data for this month
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}
      >
        <KPICard title="Monthly Burn" value={formatAED(totalActual)} accent="#ff6e40" />
        <KPICard title="Annual Burn" value={formatAED(totalActual * 12)} accent="#60a5fa" />
        <KPICard
          title="Per Seat Cost"
          value={totalSeats > 0 ? formatAED(totalActual / totalSeats) : '—'}
          accent="#fbbf24"
        />
      </div>

      {/* Cost Breakdown Table */}
      <div style={tableStyle}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: '#ffffff',
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Cost Breakdown — {formatMonthLabel(selectedMonth)}
          </h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={!hasEdits || saving}
              style={{
                background: hasEdits ? '#00c853' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                color: '#ffffff',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: 13,
                fontWeight: 600,
                cursor: hasEdits ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Save size={14} />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Category
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '10px 8px',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Particulars
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Per Seat
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  color: 'rgba(0,200,83,0.7)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Current Cost (AED)
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '10px 8px',
                  color: 'rgba(96,165,250,0.7)',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Annual
              </th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => {
              const actual = getCostAmount(cat, 'actual');
              const annual = actual * 12;
              const perSeat = totalSeats > 0 ? actual / totalSeats : 0;
              const label =
                cat in COST_CATEGORY_LABELS
                  ? COST_CATEGORY_LABELS[cat as CostCategory]
                  : cat;
              const actualNotes = getCostNotes(cat, 'actual');

              return (
                <tr
                  key={cat}
                  style={{
                    borderBottom:
                      idx < categories.length - 1
                        ? '1px solid rgba(255,255,255,0.04)'
                        : 'none',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  <td
                    style={{
                      padding: '12px 8px',
                      color: '#ffffff',
                      fontFamily: 'DM Sans, sans-serif',
                      fontSize: 14,
                      fontWeight: 500,
                      verticalAlign: 'top',
                    }}
                  >
                    {label}
                  </td>
                  <td style={{ padding: '12px 8px', verticalAlign: 'top', maxWidth: 220 }}>
                    <textarea
                      value={actualNotes}
                      onChange={(e) => {
                        if (costMap[`${cat}-actual`]) handleNotesEdit(cat, 'actual', e.target.value);
                      }}
                      rows={2}
                      placeholder="Add particulars..."
                      style={notesInputStyle}
                    />
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                    <input
                      type="number"
                      value={parseFloat(perSeat.toFixed(2))}
                      onChange={(e) => handlePerSeatEdit(cat, e.target.value)}
                      style={{ ...inputStyle, width: '90px' }}
                    />
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', verticalAlign: 'top' }}>
                    <input
                      type="number"
                      value={actual}
                      onChange={(e) => handleEdit(cat, 'actual', e.target.value)}
                      style={inputStyle}
                    />
                  </td>
                  <td
                    style={{
                      padding: '12px 8px',
                      textAlign: 'right',
                      color: '#60a5fa',
                      fontFamily: 'Space Mono, monospace',
                      fontSize: 13,
                      fontWeight: 600,
                      verticalAlign: 'top',
                      paddingTop: 16,
                    }}
                  >
                    {formatAED(annual)}
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'center', verticalAlign: 'top', paddingTop: 14 }}>
                    <button
                      onClick={() => handleDeleteCategory(cat)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.15)', padding: 4,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6e40'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.15)'; }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Totals row */}
            <tr
              style={{
                borderTop: '2px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <td
                style={{
                  padding: '14px 8px',
                  color: '#ffffff',
                  fontFamily: 'DM Sans, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                TOTAL
              </td>
              <td />
              <td
                style={{
                  padding: '14px 8px',
                  textAlign: 'right',
                  color: '#fbbf24',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {formatAED(totalSeats > 0 ? totalActual / totalSeats : 0)}
              </td>
              <td
                style={{
                  padding: '14px 8px',
                  textAlign: 'right',
                  color: '#00c853',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {formatAED(totalActual)}
              </td>
              <td
                style={{
                  padding: '14px 8px',
                  textAlign: 'right',
                  color: '#60a5fa',
                  fontFamily: 'Space Mono, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {formatAED(totalActual * 12)}
              </td>
              <td />
            </tr>

            {/* ── Inline Add Row ── */}
            {!showAddForm ? (
              <tr>
                <td colSpan={6} style={{ padding: '12px 8px' }}>
                  <button
                    onClick={() => setShowAddForm(true)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                      padding: '10px 12px', borderRadius: 8,
                      border: '1px dashed rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.04)',
                      color: '#60a5fa', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.1)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.5)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.04)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'; }}
                  >
                    <Plus size={14} />
                    Add Cost Entry
                  </button>
                </td>
              </tr>
            ) : (
              <tr style={{ background: 'rgba(96,165,250,0.06)', borderTop: '1px solid rgba(96,165,250,0.2)' }}>
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  {addForm.category === '__custom__' ? (
                    <input
                      type="text" placeholder="Category name" autoFocus
                      value={addForm.customCategory}
                      onChange={(e) => setAddForm((f) => ({ ...f, customCategory: e.target.value }))}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                        padding: '8px 10px', color: '#ffffff', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                      }}
                    />
                  ) : (
                    <select
                      value={addForm.category}
                      onChange={(e) => setAddForm((f) => ({ ...f, category: e.target.value }))}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                        padding: '8px 10px', color: '#ffffff', fontFamily: 'DM Sans, sans-serif', fontSize: 13,
                      }}
                    >
                      {ALL_CATEGORIES.map((c) => (
                        <option key={c} value={c} style={{ background: '#1a1a2e' }}>{COST_CATEGORY_LABELS[c]}</option>
                      ))}
                      <option value="__custom__" style={{ background: '#1a1a2e' }}>+ Custom</option>
                    </select>
                  )}
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <input
                    type="text" placeholder="Add particulars..."
                    value={addForm.notes}
                    onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6,
                      padding: '8px 10px', color: 'rgba(255,255,255,0.7)',
                      fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                    }}
                  />
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle', color: 'rgba(255,255,255,0.25)', fontFamily: 'Space Mono, monospace', fontSize: 13 }}>
                  —
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <input
                    type="number" placeholder="0.00"
                    value={addForm.amount}
                    onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                      padding: '8px 10px', color: '#ffffff', fontFamily: 'Space Mono, monospace',
                      fontSize: 13, textAlign: 'right', boxSizing: 'border-box' as const,
                    }}
                  />
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setShowAddForm(false); setAddForm({ category: 'aws', customCategory: '', amount: '', notes: '' }); }}
                      style={{
                        padding: '7px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent', color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCost}
                      disabled={addingCost || !addForm.amount}
                      style={{
                        padding: '7px 18px', borderRadius: 6, border: 'none',
                        background: addForm.amount ? '#00c853' : 'rgba(255,255,255,0.1)',
                        color: '#ffffff', fontFamily: 'DM Sans, sans-serif', fontSize: 12,
                        fontWeight: 700, cursor: addForm.amount ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {addingCost ? 'Adding...' : 'Done'}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {hasEdits && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              background: 'rgba(251, 191, 36, 0.1)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              borderRadius: 8,
            }}
          >
            <p
              style={{
                margin: 0,
                color: '#fbbf24',
                fontSize: 12,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              You have unsaved changes. Click &ldquo;Save Changes&rdquo; to persist them to the
              database.
            </p>
          </div>
        )}
      </div>

      {/* ===== MONTHLY COST FLOW SECTION ===== */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontSize: 18,
          fontWeight: 700,
          color: '#1a1a1a',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          Monthly Cost Flow
        </h2>
        <CostsFlowTable
          costs={costs}
          totalSeats={totalSeats}
          onCostsUpdated={async () => {
            const res = await fetch('/api/costs');
            const data = await res.json();
            setCosts(data);
          }}
        />
      </div>
    </PageShell>
  );
}
