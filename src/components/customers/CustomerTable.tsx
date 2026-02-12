'use client';

import type { Client } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import { PRICING_MODEL_LABELS } from '@/lib/models/platform-types';
import { usePartnerStore } from '@/lib/store/partner-store';
import StatusBadge from './StatusBadge';
import { PartnerBadge } from './PartnerBadge';
import { Pencil, Trash2 } from 'lucide-react';

interface ClientTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (id: string) => void;
}

export default function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
  const partners = usePartnerStore((s) => s.partners);

  const getCommission = (client: Client) => {
    if (!client.salesPartner) return 0;
    const partner = partners[client.salesPartner];
    if (!partner) return 0;
    return (client.mrr * partner.commissionPercentage) / 100;
  };

  if (clients.length === 0) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: 12,
        border: '1px solid #e0dbd2',
        padding: 48,
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <p style={{ fontSize: 14, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
          No clients yet. Add your first client to get started.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 12,
      border: '1px solid #e0dbd2',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      overflowX: 'auto',
    }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
            {['Name', 'Partner', 'Plan', 'Seats', 'Per Seat', 'Discount', 'Recurring', 'One-Time', 'Commission', 'Rev Type', 'Status', ''].map((h) => (
              <th
                key={h}
                style={{
                  padding: '10px 12px',
                  textAlign: ['Recurring', 'One-Time', 'Per Seat', 'Seats', 'Commission', 'Discount'].includes(h) ? 'right' : 'left',
                  fontWeight: 600,
                  color: '#666666',
                  textTransform: 'uppercase',
                  fontSize: 11,
                  letterSpacing: 0.5,
                  fontFamily: "'DM Sans', sans-serif",
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map((client, i) => (
            <tr
              key={client.id}
              style={{
                borderBottom: '1px solid #e0dbd2',
                background: i % 2 === 0 ? '#fafafa' : '#ffffff',
                transition: 'background 0.1s',
              }}
            >
              <td style={{
                padding: '10px 12px',
                fontWeight: 600,
                color: '#1a1a1a',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                <button
                  onClick={() => onEdit(client)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#1a1a1a',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'underline',
                    textDecorationColor: '#e0dbd2',
                    textUnderlineOffset: 3,
                  }}
                >
                  {client.name}
                </button>
              </td>
              <td style={{ padding: '10px 12px' }}>
                <PartnerBadge partner={client.salesPartner} />
              </td>
              <td style={{
                padding: '10px 12px',
                color: '#666',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
              }}>
                {client.plan || PRICING_MODEL_LABELS[client.pricingModel]}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                color: '#666',
              }}>
                {client.seatCount ?? '—'}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                color: '#666',
              }}>
                {client.perSeatCost != null ? formatAED(client.perSeatCost) : '—'}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                color: client.discount ? '#ff6e40' : '#ccc',
              }}>
                {client.discount ? `${client.discount}%` : '—'}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                color: '#1a1a1a',
              }}>
                {formatAED(client.mrr)}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                color: '#666',
              }}>
                {formatAED(client.oneTimeRevenue)}
              </td>
              <td style={{
                padding: '10px 12px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: getCommission(client) > 0 ? '#60a5fa' : '#ccc',
              }}>
                {getCommission(client) > 0 ? formatAED(getCommission(client)) : '—'}
              </td>
              <td style={{ padding: '10px 12px' }}>
                {(() => {
                  const hasRecurring = client.mrr > 0;
                  const hasOneTime = client.oneTimeRevenue > 0;
                  const type = hasRecurring && hasOneTime ? 'mixed' : hasRecurring ? 'recurring' : 'one-time';
                  const color = type === 'recurring' ? '#10b981' : type === 'one-time' ? '#f59e0b' : '#a78bfa';
                  const label = type === 'recurring' ? 'Recurring' : type === 'one-time' ? 'One-Time' : 'Mixed';
                  return (
                    <span style={{
                      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: `${color}18`, color, fontFamily: "'DM Sans', sans-serif",
                    }}>
                      {label}
                    </span>
                  );
                })()}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <StatusBadge status={client.status} />
              </td>
              <td style={{ padding: '10px 12px' }}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(client)}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#999',
                      padding: 4,
                    }}
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete ${client.name}?`)) {
                        onDelete(client.id);
                      }
                    }}
                    style={{
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: '#ff3d00',
                      padding: 4,
                    }}
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
