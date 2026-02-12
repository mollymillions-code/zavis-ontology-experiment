'use client';

import { Search } from 'lucide-react';
import type { InvoiceStatus } from '@/lib/models/platform-types';

const STATUS_FILTERS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'partially_paid', label: 'Partial' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'void', label: 'Void' },
];

interface InvoiceFilterBarProps {
  activeFilter: InvoiceStatus | 'all';
  onFilterChange: (filter: InvoiceStatus | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function InvoiceFilterBar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: InvoiceFilterBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: activeFilter === f.value ? '#00c853' : '#e0dbd2',
              background: activeFilter === f.value ? '#00c853' : '#ffffff',
              color: activeFilter === f.value ? '#1a1a1a' : '#666',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div
        style={{
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid #e0dbd2',
          background: '#ffffff',
        }}
      >
        <Search size={14} style={{ color: '#999' }} />
        <input
          type="text"
          placeholder="Search invoices..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            fontSize: 12,
            fontFamily: "'DM Sans', sans-serif",
            color: '#1a1a1a',
            background: 'transparent',
            width: 180,
          }}
        />
      </div>
    </div>
  );
}
