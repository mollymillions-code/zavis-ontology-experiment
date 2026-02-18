'use client';

import { useState, useEffect, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { formatAED } from '@/lib/utils/currency';
import { Save, Plus, Trash2 } from 'lucide-react';
import type { PayrollEntry } from '@/lib/models/platform-types';

function generateId() {
  return `pay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface AddForm {
  name: string;
  role: string;
  salary: string;
  notes: string;
}

const emptyAddForm: AddForm = { name: '', role: '', salary: '', notes: '' };

export default function PayrollPage() {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedFields, setEditedFields] = useState<Record<string, Partial<PayrollEntry>>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>(emptyAddForm);
  const [addingEntry, setAddingEntry] = useState(false);

  useEffect(() => {
    fetch('/api/payroll')
      .then((res) => res.json())
      .then((data: PayrollEntry[]) => { setEntries(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // ── KPI calculations ──
  const { totalMonthly, headcount, avgSalary } = useMemo(() => {
    const active = entries.filter((e) => {
      const edited = editedFields[e.id];
      return edited?.isActive !== undefined ? edited.isActive : e.isActive;
    });
    const total = active.reduce((sum, e) => {
      const edited = editedFields[e.id];
      const salary = edited?.monthlySalary !== undefined ? edited.monthlySalary : e.monthlySalary;
      return sum + salary;
    }, 0);
    return {
      totalMonthly: total,
      headcount: active.length,
      avgSalary: active.length > 0 ? total / active.length : 0,
    };
  }, [entries, editedFields]);

  // ── Inline editing ──
  function handleFieldEdit(id: string, field: keyof PayrollEntry, value: unknown) {
    setEditedFields((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function getFieldValue<K extends keyof PayrollEntry>(entry: PayrollEntry, field: K): PayrollEntry[K] {
    const edited = editedFields[entry.id];
    if (edited && edited[field] !== undefined) return edited[field] as PayrollEntry[K];
    return entry[field];
  }

  const hasEdits = Object.keys(editedFields).length > 0;

  async function handleSave() {
    if (!hasEdits) return;
    setSaving(true);
    try {
      const updates = Object.entries(editedFields).map(([id, fields]) =>
        fetch(`/api/payroll/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
      );
      await Promise.all(updates);
      const res = await fetch('/api/payroll');
      const data = await res.json();
      setEntries(data);
      setEditedFields({});
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd() {
    if (!addForm.name.trim() || !addForm.salary) return;
    setAddingEntry(true);
    try {
      const newEntry: PayrollEntry = {
        id: generateId(),
        name: addForm.name.trim(),
        role: addForm.role.trim(),
        monthlySalary: parseFloat(addForm.salary) || 0,
        isActive: true,
        notes: addForm.notes || undefined,
        createdAt: new Date().toISOString(),
      };
      await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEntry),
      });
      const res = await fetch('/api/payroll');
      const data = await res.json();
      setEntries(data);
      setShowAddForm(false);
      setAddForm(emptyAddForm);
    } finally {
      setAddingEntry(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/payroll/${id}`, { method: 'DELETE' });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setEditedFields((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  // ── Styles ──
  const tableStyle = {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)',
    overflowX: 'auto' as const,
  };

  const inputStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 6,
    padding: '6px 10px',
    color: '#ffffff',
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    width: '110px',
    textAlign: 'right' as const,
  };

  const thStyle = {
    textAlign: 'left' as const,
    padding: '10px 8px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  };

  if (loading) {
    return (
      <PageShell title="Payroll" subtitle="Employee compensation management">
        <div style={{ color: '#666', padding: 40, textAlign: 'center' }}>Loading...</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Payroll" subtitle="Employee compensation management">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPICard title="Total Monthly Payroll" value={formatAED(totalMonthly)} accent="#ff6e40" />
        <KPICard title="Headcount (Active)" value={String(headcount)} accent="#60a5fa" />
        <KPICard title="Avg Salary" value={formatAED(avgSalary)} accent="#fbbf24" />
      </div>

      {/* Payroll Table */}
      <div style={tableStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
            Employee Payroll
          </h2>
          <button
            onClick={handleSave}
            disabled={!hasEdits || saving}
            style={{
              background: hasEdits ? '#00c853' : 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              color: '#ffffff',
              fontFamily: "'DM Sans', sans-serif",
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

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <th style={thStyle}>Employee Name</th>
              <th style={thStyle}>Role</th>
              <th style={{ ...thStyle, textAlign: 'right', color: 'rgba(0,200,83,0.7)' }}>Monthly Salary (AED)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={{ ...thStyle, textAlign: 'right', color: 'rgba(96,165,250,0.7)' }}>Annual</th>
              <th style={{ ...thStyle, textAlign: 'center', width: 50 }}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => {
              const isActive = getFieldValue(entry, 'isActive');
              const salary = getFieldValue(entry, 'monthlySalary');
              const rowOpacity = isActive ? 1 : 0.45;

              return (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: idx < entries.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                    opacity: rowOpacity,
                    transition: 'opacity 0.2s ease',
                  }}
                >
                  <td style={{ padding: '12px 8px', color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500 }}>
                    {entry.name}
                  </td>
                  <td style={{ padding: '12px 8px', color: 'rgba(255,255,255,0.7)', fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}>
                    {entry.role}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => handleFieldEdit(entry.id, 'monthlySalary', parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleFieldEdit(entry.id, 'isActive', !isActive)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 12,
                        border: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: 'pointer',
                        background: isActive ? 'rgba(0,200,83,0.15)' : 'rgba(255,255,255,0.08)',
                        color: isActive ? '#00c853' : 'rgba(255,255,255,0.4)',
                      }}
                    >
                      {isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td style={{
                    padding: '12px 8px',
                    textAlign: 'right',
                    color: '#60a5fa',
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    fontWeight: 600,
                  }}>
                    {formatAED(salary * 12)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'rgba(255,255,255,0.2)',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ff6e40'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}

            {/* Totals Row */}
            {entries.length > 0 && (
              <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '14px 8px', color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700 }}>
                  TOTAL
                </td>
                <td />
                <td style={{ padding: '14px 8px', textAlign: 'right', color: '#00c853', fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                  {formatAED(totalMonthly)}
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Sans', sans-serif", fontSize: 12 }}>
                  {headcount} active
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'right', color: '#60a5fa', fontFamily: "'Space Mono', monospace", fontSize: 14, fontWeight: 700 }}>
                  {formatAED(totalMonthly * 12)}
                </td>
                <td />
              </tr>
            )}

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
                      color: '#60a5fa', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                      fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.1)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.5)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(96,165,250,0.04)'; e.currentTarget.style.borderColor = 'rgba(96,165,250,0.3)'; }}
                  >
                    <Plus size={14} />
                    Add Employee
                  </button>
                </td>
              </tr>
            ) : (
              <tr style={{ background: 'rgba(96,165,250,0.06)', borderTop: '1px solid rgba(96,165,250,0.2)' }}>
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <input
                    type="text" placeholder="Employee name" autoFocus
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                      padding: '8px 10px', color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    }}
                  />
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <input
                    type="text" placeholder="Role"
                    value={addForm.role}
                    onChange={(e) => setAddForm((f) => ({ ...f, role: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                      padding: '8px 10px', color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                    }}
                  />
                </td>
                <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <input
                    type="number" placeholder="0.00"
                    value={addForm.salary}
                    onChange={(e) => setAddForm((f) => ({ ...f, salary: e.target.value }))}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6,
                      padding: '8px 10px', color: '#ffffff', fontFamily: "'Space Mono', monospace",
                      fontSize: 13, textAlign: 'right',
                    }}
                  />
                </td>
                <td colSpan={3} style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setShowAddForm(false); setAddForm(emptyAddForm); }}
                      style={{
                        padding: '7px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent', color: 'rgba(255,255,255,0.5)',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAdd}
                      disabled={addingEntry || !addForm.name.trim() || !addForm.salary}
                      style={{
                        padding: '7px 18px', borderRadius: 6, border: 'none',
                        background: addForm.name.trim() && addForm.salary ? '#00c853' : 'rgba(255,255,255,0.1)',
                        color: '#ffffff', fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                        fontWeight: 700, cursor: addForm.name.trim() && addForm.salary ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {addingEntry ? 'Adding...' : 'Done'}
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {hasEdits && (
          <div style={{
            marginTop: 16, padding: 12,
            background: 'rgba(251, 191, 36, 0.1)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: 8,
          }}>
            <p style={{ margin: 0, color: '#fbbf24', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
              You have unsaved changes. Click &ldquo;Save Changes&rdquo; to persist them to the database.
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
