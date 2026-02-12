'use client';

import { Plus } from 'lucide-react';
import type { InvoiceLineItem, CatalogItem } from '@/lib/models/platform-types';
import LineItemRow from './LineItemRow';

interface LineItemsTableProps {
  items: InvoiceLineItem[];
  catalogItems: CatalogItem[];
  onChange: (items: InvoiceLineItem[]) => void;
  readOnly?: boolean;
}

export default function LineItemsTable({
  items,
  catalogItems,
  onChange,
  readOnly = false,
}: LineItemsTableProps) {
  function handleItemChange(index: number, updated: InvoiceLineItem) {
    const next = [...items];
    next[index] = updated;
    onChange(next);
  }

  function handleRemove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function handleAdd() {
    onChange([
      ...items,
      {
        id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        description: '',
        quantity: 1,
        rate: 0,
        discountType: 'flat',
        discountValue: 0,
        amount: 0,
      },
    ]);
  }

  const thStyle: React.CSSProperties = {
    padding: '8px 6px',
    fontSize: 10,
    fontWeight: 600,
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap',
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 10,
      border: '1px solid #e0dbd2',
      overflow: 'hidden',
    }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#1a1a1a' }}>
            <th style={{ ...thStyle, width: 32 }}>#</th>
            <th style={{ ...thStyle, textAlign: 'left' }}>Item & Description</th>
            <th style={{ ...thStyle, textAlign: 'right', width: 80 }}>Qty</th>
            <th style={{ ...thStyle, textAlign: 'right', width: 100 }}>Rate</th>
            <th style={{ ...thStyle, textAlign: 'right', width: 100 }}>Discount</th>
            <th style={{ ...thStyle, textAlign: 'right', width: 120 }}>Amount</th>
            {!readOnly && <th style={{ ...thStyle, width: 40 }} />}
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={readOnly ? 6 : 7} style={{
                padding: 24,
                textAlign: 'center',
                fontSize: 12,
                color: '#999',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                No items added yet
              </td>
            </tr>
          ) : (
            items.map((item, i) => (
              <LineItemRow
                key={item.id}
                item={item}
                index={i}
                catalogItems={catalogItems}
                onChange={(updated) => handleItemChange(i, updated)}
                onRemove={() => handleRemove(i)}
                readOnly={readOnly}
              />
            ))
          )}
        </tbody>
      </table>

      {!readOnly && (
        <div style={{ padding: '8px 12px', borderTop: '1px solid #e0dbd2' }}>
          <button
            onClick={handleAdd}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px dashed #e0dbd2',
              background: 'transparent',
              color: '#00c853',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <Plus size={14} />
            Add New Row
          </button>
        </div>
      )}
    </div>
  );
}
