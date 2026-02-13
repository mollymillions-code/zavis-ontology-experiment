'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { InvoiceLineItem, CatalogItem } from '@/lib/models/platform-types';

interface LineItemRowProps {
  item: InvoiceLineItem;
  index: number;
  catalogItems: CatalogItem[];
  onChange: (updated: InvoiceLineItem) => void;
  onRemove: () => void;
  readOnly?: boolean;
}

export default function LineItemRow({
  item,
  index,
  catalogItems,
  onChange,
  onRemove,
  readOnly = false,
}: LineItemRowProps) {
  function recalcAmount(updates: Partial<InvoiceLineItem>) {
    const qty = updates.quantity ?? item.quantity;
    const rate = updates.rate ?? item.rate;
    const discType = updates.discountType ?? item.discountType;
    const discVal = updates.discountValue ?? item.discountValue;
    const gross = qty * rate;
    const amount = discType === 'percent' ? gross * (1 - discVal / 100) : Math.max(0, gross - discVal);
    onChange({ ...item, ...updates, amount });
  }

  // Track whether user is in "custom item" text-input mode
  const [customMode, setCustomMode] = useState(!item.itemId && !!item.description);

  function handleCatalogSelect(itemId: string) {
    if (!itemId) {
      // User selected "Custom item..." — switch to text input mode
      setCustomMode(true);
      recalcAmount({ itemId: undefined, description: '', rate: 0 });
      return;
    }
    setCustomMode(false);
    const cat = catalogItems.find((c) => c.id === itemId);
    if (cat) {
      recalcAmount({ itemId: cat.id, description: cat.name, rate: cat.rate });
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    border: '1px solid #e0dbd2',
    borderRadius: 6,
    fontSize: 12,
    fontFamily: "'DM Sans', sans-serif",
    color: '#1a1a1a',
    background: readOnly ? '#faf8f4' : '#ffffff',
    outline: 'none',
  };

  const numInputStyle: React.CSSProperties = {
    ...inputStyle,
    textAlign: 'right',
    fontFamily: "'Space Mono', monospace",
    width: 80,
  };

  return (
    <tr style={{ borderBottom: '1px solid #e0dbd2' }}>
      <td style={{ padding: '8px 6px', color: '#999', fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
        {index + 1}
      </td>
      <td style={{ padding: '8px 6px' }}>
        {readOnly ? (
          <span style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}>
            {item.description}
          </span>
        ) : customMode ? (
          /* Custom item mode — editable text input */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input
              type="text"
              value={item.description}
              onChange={(e) => onChange({ ...item, description: e.target.value })}
              placeholder="Type item name..."
              autoFocus
              style={{ ...inputStyle, borderColor: '#60a5fa' }}
            />
            <button
              type="button"
              onClick={() => setCustomMode(false)}
              style={{
                border: 'none',
                background: 'none',
                padding: 0,
                fontSize: 10,
                color: '#2979ff',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                textAlign: 'left',
              }}
            >
              Choose from catalog
            </button>
          </div>
        ) : (
          /* Catalog selection dropdown */
          <select
            value={item.itemId || ''}
            onChange={(e) => handleCatalogSelect(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Custom item...</option>
            {catalogItems.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.rate} {c.unit})</option>
            ))}
          </select>
        )}
      </td>
      <td style={{ padding: '8px 6px' }}>
        <input
          type="number"
          min={0}
          value={item.quantity}
          onChange={(e) => recalcAmount({ quantity: Number(e.target.value) || 0 })}
          disabled={readOnly}
          style={numInputStyle}
        />
      </td>
      <td style={{ padding: '8px 6px' }}>
        <input
          type="number"
          min={0}
          step={0.01}
          value={item.rate}
          onChange={(e) => recalcAmount({ rate: Number(e.target.value) || 0 })}
          disabled={readOnly}
          style={numInputStyle}
        />
      </td>
      <td style={{ padding: '8px 6px' }}>
        {readOnly ? (
          <span style={{ fontSize: 12, fontFamily: "'Space Mono', monospace", color: '#666' }}>
            {item.discountValue > 0
              ? `${item.discountValue}${item.discountType === 'percent' ? '%' : ''}`
              : '—'}
          </span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input
              type="number"
              min={0}
              step={0.01}
              value={item.discountValue}
              onChange={(e) => recalcAmount({ discountValue: Number(e.target.value) || 0 })}
              style={{ ...numInputStyle, width: 60 }}
            />
            <button
              onClick={() => recalcAmount({
                discountType: item.discountType === 'percent' ? 'flat' : 'percent',
              })}
              style={{
                padding: '4px 6px',
                borderRadius: 4,
                border: '1px solid #e0dbd2',
                background: '#faf8f4',
                color: '#666',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'Space Mono', monospace",
                minWidth: 24,
              }}
            >
              {item.discountType === 'percent' ? '%' : '—'}
            </button>
          </div>
        )}
      </td>
      <td style={{
        padding: '8px 6px',
        textAlign: 'right',
        fontFamily: "'Space Mono', monospace",
        fontWeight: 700,
        fontSize: 12,
        color: '#1a1a1a',
      }}>
        {item.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </td>
      {!readOnly && (
        <td style={{ padding: '8px 6px' }}>
          <button
            onClick={onRemove}
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#d32f2f',
              padding: 4,
            }}
          >
            <Trash2 size={14} />
          </button>
        </td>
      )}
    </tr>
  );
}
