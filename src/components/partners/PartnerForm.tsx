'use client';

import { useState } from 'react';
import type { SalesPartnerInfo } from '@/lib/config/sales-partners';

interface PartnerFormProps {
  partner?: SalesPartnerInfo;
  onSave: (partner: SalesPartnerInfo) => void;
  onCancel: () => void;
}

const labelStyle = {
  fontSize: 12,
  fontWeight: 500 as const,
  color: '#666666',
  fontFamily: "'DM Sans', sans-serif",
  marginBottom: 4,
  display: 'block' as const,
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #e0dbd2',
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  color: '#1a1a1a',
  background: '#ffffff',
  outline: 'none',
};

const monoInputStyle = {
  ...inputStyle,
  fontFamily: "'Space Mono', monospace",
  fontWeight: 700 as const,
};

export default function PartnerForm({ partner, onSave, onCancel }: PartnerFormProps) {
  const isEdit = !!partner;

  const [name, setName] = useState(partner?.name || '');
  const [commissionPct, setCommissionPct] = useState(partner?.commissionPercentage ?? 10);
  const [oneTimePct, setOneTimePct] = useState(partner?.oneTimeCommissionPercentage ?? 15);
  const [joinedDate, setJoinedDate] = useState(partner?.joinedDate || new Date().toISOString().split('T')[0]);
  const [isActive, setIsActive] = useState(partner?.isActive ?? true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const saved: SalesPartnerInfo = {
      id: partner?.id || name.toLowerCase().replace(/\s+/g, '-'),
      name: name.trim(),
      joinedDate,
      commissionPercentage: commissionPct,
      oneTimeCommissionPercentage: oneTimePct,
      totalPaid: partner?.totalPaid || 0,
      isActive,
    };
    onSave(saved);
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
          Partner Information
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Partner Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Dr. Faisal" />
          </div>
          <div>
            <label style={labelStyle}>Joined Date</label>
            <input style={inputStyle} type="date" value={joinedDate} onChange={(e) => setJoinedDate(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={isActive ? 'active' : 'inactive'} onChange={(e) => setIsActive(e.target.value === 'active')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
          Commission Structure
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>MRR Commission (%)</label>
            <input
              style={monoInputStyle}
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commissionPct}
              onChange={(e) => setCommissionPct(Number(e.target.value) || 0)}
            />
            <p style={{ fontSize: 10, color: '#999', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
              Typical range: 5-12%
            </p>
          </div>
          <div>
            <label style={labelStyle}>One-Time Revenue Commission (%)</label>
            <input
              style={monoInputStyle}
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={oneTimePct}
              onChange={(e) => setOneTimePct(Number(e.target.value) || 0)}
            />
            <p style={{ fontSize: 10, color: '#999', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
              Typical range: 8-20%
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3" style={{ paddingTop: 8, borderTop: '1px solid #e0dbd2' }}>
        <button
          type="submit"
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#00c853',
            color: '#1a1a1a',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
          }}
        >
          {isEdit ? 'Save Changes' : 'Add Partner'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: '1px solid #e0dbd2',
            background: '#ffffff',
            color: '#666',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
