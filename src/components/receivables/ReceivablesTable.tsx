'use client';

import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ExternalLink, Plus } from 'lucide-react';
import type { ReceivableEntry, Invoice, InvoiceStatus } from '@/lib/models/platform-types';
import { INVOICE_STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import { RECEIVABLE_STATUS_COLORS } from '@/lib/models/pricing-data';
import { classifyRevenue, REVENUE_TYPE_LABELS, REVENUE_TYPE_COLORS } from '@/lib/utils/receivables';

interface ReceivablesTableProps {
  receivables: ReceivableEntry[];
  clientNames: Record<string, string>;
  invoices?: Invoice[];
}

const STATUS_BG: Record<string, string> = {
  paid: 'rgba(16,185,129,0.12)',
  invoiced: 'rgba(59,130,246,0.12)',
  pending: 'rgba(245,158,11,0.10)',
  overdue: 'rgba(239,68,68,0.12)',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTH_SHORT[parseInt(mo, 10) - 1]} '${y.slice(2)}`;
}

function formatFullMonth(m: string) {
  const [y, mo] = m.split('-');
  return `${MONTH_NAMES[parseInt(mo, 10) - 1]} ${y}`;
}

// ─── Hover Tooltip ───
interface TooltipData {
  entries: ReceivableEntry[];
  month: string;
  x: number;
  y: number;
}

function CellTooltip({ data, clientName }: { data: TooltipData; clientName: string }) {
  return (
    <div style={{
      position: 'fixed',
      left: data.x,
      top: data.y - 8,
      transform: 'translate(-50%, -100%)',
      background: 'rgba(20,20,35,0.96)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 10,
      padding: '10px 14px',
      color: '#fff',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      zIndex: 100,
      pointerEvents: 'none',
      maxWidth: 320,
      minWidth: 200,
    }}>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
        {clientName}
      </p>
      <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
        {formatFullMonth(data.month)}
      </p>
      {data.entries.map((e, i) => {
        const color = RECEIVABLE_STATUS_COLORS[e.status] || '#999';
        const revType = classifyRevenue(e.description);
        const revColor = REVENUE_TYPE_COLORS[revType];
        return (
          <div key={e.id} style={{ marginBottom: i < data.entries.length - 1 ? 6 : 0 }}>
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {formatAED(e.amount, 0)}
              </span>
              <div style={{ display: 'flex', gap: 4 }}>
                <span style={{
                  padding: '2px 6px', borderRadius: 6, fontSize: 7, fontWeight: 700,
                  textTransform: 'uppercase', background: `${revColor}25`, color: revColor, letterSpacing: 0.5,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {REVENUE_TYPE_LABELS[revType]}
                </span>
                <span style={{
                  padding: '2px 6px', borderRadius: 6, fontSize: 7, fontWeight: 700,
                  textTransform: 'uppercase', background: `${color}25`, color, letterSpacing: 0.5,
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {e.status}
                </span>
              </div>
            </div>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 2, lineHeight: 1.3 }}>
              {e.description}
            </p>
            {e.dueDate && (
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                Due: {e.dueDate}
              </p>
            )}
            {e.paidDate && (
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, color: 'rgba(16,185,129,0.7)', marginTop: 1 }}>
                Paid: {e.paidDate}
              </p>
            )}
          </div>
        );
      })}
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontStyle: 'italic' }}>
        Click for invoice options
      </p>
    </div>
  );
}

// ─── Click Popover ───
interface PopoverData {
  entries: ReceivableEntry[];
  month: string;
  clientId: string;
  x: number;
  y: number;
}

function InvoiceStatusBadgeInline({ status }: { status: InvoiceStatus }) {
  const color = INVOICE_STATUS_COLORS[status];
  const label = INVOICE_STATUS_LABELS[status];
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 5, fontSize: 8, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: 0.4,
      background: `${color}20`, color,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      {label}
    </span>
  );
}

function CellPopover({
  data,
  clientName,
  invoiceMap,
  onClose,
}: {
  data: PopoverData;
  clientName: string;
  invoiceMap: Map<string, Invoice>;
  onClose: () => void;
}) {
  const router = useRouter();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const entriesWithStatus = data.entries.map((entry) => ({
    entry,
    invoice: invoiceMap.get(entry.id) || null,
  }));

  const allHaveInvoices = entriesWithStatus.every((e) => e.invoice);

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left: data.x,
        top: data.y + 4,
        transform: 'translateX(-50%)',
        background: '#ffffff',
        border: '1px solid #e0dbd2',
        borderRadius: 12,
        padding: 0,
        color: '#1a1a1a',
        boxShadow: '0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
        zIndex: 200,
        maxWidth: 360,
        minWidth: 280,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '12px 16px 10px',
        borderBottom: '1px solid #f0ebe0',
        background: '#faf8f4',
      }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 700, color: '#1a1a1a', marginBottom: 1 }}>
          {clientName}
        </p>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: '#999' }}>
          {formatFullMonth(data.month)}
        </p>
      </div>

      {/* Entries */}
      <div style={{ padding: '8px 0', maxHeight: 320, overflowY: 'auto' }}>
        {entriesWithStatus.map(({ entry, invoice }, i) => {
          const revType = classifyRevenue(entry.description);
          const revColor = REVENUE_TYPE_COLORS[revType];

          return (
            <div
              key={entry.id}
              style={{
                padding: '10px 16px',
                borderBottom: i < entriesWithStatus.length - 1 ? '1px solid #f5f0e8' : 'none',
              }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
                  {formatAED(entry.amount, 0)}
                </span>
                <span style={{
                  padding: '2px 6px', borderRadius: 5, fontSize: 7, fontWeight: 700,
                  textTransform: 'uppercase', background: `${revColor}15`, color: revColor,
                  letterSpacing: 0.4, fontFamily: "'DM Sans', sans-serif",
                }}>
                  {REVENUE_TYPE_LABELS[revType]}
                </span>
              </div>

              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: '#666', lineHeight: 1.3, marginBottom: 8 }}>
                {entry.description}
              </p>

              {invoice ? (
                <div
                  onClick={() => router.push(`/invoices/${invoice.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 8,
                    background: '#f5f0e8', cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ede8dc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#f5f0e8'; }}
                >
                  <FileText size={13} style={{ color: '#888', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, color: '#1a1a1a' }}>
                        {invoice.invoiceNumber}
                      </span>
                      <InvoiceStatusBadgeInline status={invoice.status} />
                    </div>
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: '#999', marginTop: 1 }}>
                      {formatAED(invoice.total)} · Due {invoice.dueDate}
                    </p>
                  </div>
                  <ExternalLink size={12} style={{ color: '#bbb', flexShrink: 0 }} />
                </div>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/invoices/new?receivableId=${entry.id}&clientId=${entry.clientId}`);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px dashed #d0cbc2', background: 'transparent',
                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11, fontWeight: 600, color: '#00a844',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f0fdf4';
                    e.currentTarget.style.borderColor = '#00c853';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#d0cbc2';
                  }}
                >
                  <Plus size={13} />
                  Generate Invoice
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer — bulk action if multiple entries without invoices */}
      {!allHaveInvoices && data.entries.length > 1 && (
        <div style={{
          padding: '10px 16px',
          borderTop: '1px solid #f0ebe0',
          background: '#faf8f4',
        }}>
          <button
            onClick={() => {
              const first = entriesWithStatus.find((e) => !e.invoice);
              if (first) {
                onClose();
                router.push(`/invoices/new?receivableId=${first.entry.id}&clientId=${data.clientId}`);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              width: '100%', padding: '8px 12px', borderRadius: 8,
              border: 'none', background: '#00c853', color: '#1a1a1a',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              fontSize: 11, fontWeight: 700,
            }}
          >
            <Plus size={13} />
            Generate Invoice for This Month
          </button>
        </div>
      )}
    </div>
  );
}

export default function ReceivablesTable({ receivables, clientNames, invoices = [] }: ReceivablesTableProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [popover, setPopover] = useState<PopoverData | null>(null);
  const tooltipClientRef = useRef<string>('');

  // Build receivableId → Invoice lookup
  const invoiceMap = useMemo(() => {
    const map = new Map<string, Invoice>();
    for (const inv of invoices) {
      if (inv.receivableId) {
        map.set(inv.receivableId, inv);
      }
    }
    return map;
  }, [invoices]);

  // Set of receivable IDs with invoices for visual indicators
  const invoicedReceivableIds = useMemo(() => {
    const set = new Set<string>();
    for (const inv of invoices) {
      if (inv.receivableId) set.add(inv.receivableId);
    }
    return set;
  }, [invoices]);

  function showTooltip(entries: ReceivableEntry[], month: string, clientId: string, e: React.MouseEvent) {
    if (popover) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    tooltipClientRef.current = clientId;
    setTooltip({
      entries,
      month,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }

  function hideTooltip() {
    if (popover) return;
    setTooltip(null);
    tooltipClientRef.current = '';
  }

  function handleCellClick(entries: ReceivableEntry[], month: string, clientId: string, e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip(null);
    setPopover({
      entries,
      month,
      clientId,
      x: rect.left + rect.width / 2,
      y: rect.bottom,
    });
  }

  const closePopover = useCallback(() => setPopover(null), []);

  // Build pivot: clientId → month → entries[]
  const { months, clientIds, pivot, clientTotals, monthTotals, grandTotal } = useMemo(() => {
    const monthSet = new Set<string>();
    const clientSet = new Set<string>();
    const map: Record<string, Record<string, ReceivableEntry[]>> = {};

    for (const r of receivables) {
      monthSet.add(r.month);
      clientSet.add(r.clientId);
      if (!map[r.clientId]) map[r.clientId] = {};
      if (!map[r.clientId][r.month]) map[r.clientId][r.month] = [];
      map[r.clientId][r.month].push(r);
    }

    const months = Array.from(monthSet).sort();
    const clientIds = Array.from(clientSet).sort((a, b) => {
      const totalA = receivables.filter((r) => r.clientId === a).reduce((s, r) => s + r.amount, 0);
      const totalB = receivables.filter((r) => r.clientId === b).reduce((s, r) => s + r.amount, 0);
      return totalB - totalA;
    });

    const clientTotals: Record<string, number> = {};
    for (const cid of clientIds) {
      clientTotals[cid] = receivables
        .filter((r) => r.clientId === cid)
        .reduce((s, r) => s + r.amount, 0);
    }

    const monthTotals: Record<string, number> = {};
    for (const m of months) {
      monthTotals[m] = receivables
        .filter((r) => r.month === m)
        .reduce((s, r) => s + r.amount, 0);
    }

    const grandTotal = receivables.reduce((s, r) => s + r.amount, 0);

    return { months, clientIds, pivot: map, clientTotals, monthTotals, grandTotal };
  }, [receivables]);

  if (receivables.length === 0) {
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
          No receivables found for this filter.
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
      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse', minWidth: months.length * 80 + 280 }}>
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
              Client
            </th>
            {months.map((m) => (
              <th key={m} style={{
                padding: '10px 6px',
                textAlign: 'right',
                fontWeight: 600,
                color: '#666',
                fontSize: 9,
                letterSpacing: 0.3,
                fontFamily: "'Space Mono', monospace",
                whiteSpace: 'nowrap',
                minWidth: 72,
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
          {clientIds.map((cid, i) => (
            <tr key={cid} style={{
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
              }}>
                {clientNames[cid] || cid}
              </td>
              {months.map((m) => {
                const entries = pivot[cid]?.[m];
                if (!entries || entries.length === 0) {
                  return <td key={m} style={{ padding: '8px 6px' }} />;
                }
                const total = entries.reduce((s, e) => s + e.amount, 0);
                const primaryStatus = entries[0].status;
                const statusColor = RECEIVABLE_STATUS_COLORS[primaryStatus] || '#999';
                const bg = STATUS_BG[primaryStatus] || 'transparent';

                const types = new Set(entries.map((e) => classifyRevenue(e.description)));
                const cellRevType = types.size > 1 ? 'mixed' : (types.values().next().value || 'mrr');
                const revColor = REVENUE_TYPE_COLORS[cellRevType as keyof typeof REVENUE_TYPE_COLORS];
                const revLabel = cellRevType === 'mrr' ? 'REC' : cellRevType === 'one_time' ? 'OT' : 'MIX';

                // Visual indicator: does this cell have linked invoices?
                const cellHasInvoice = entries.some((e) => invoicedReceivableIds.has(e.id));
                const allInvoiced = entries.every((e) => invoicedReceivableIds.has(e.id));

                return (
                  <td
                    key={m}
                    onMouseEnter={(e) => showTooltip(entries, m, cid, e)}
                    onMouseLeave={hideTooltip}
                    onClick={(e) => handleCellClick(entries, m, cid, e)}
                    style={{
                      padding: '4px 6px',
                      textAlign: 'right',
                      fontFamily: "'Space Mono', monospace",
                      fontSize: 10,
                      fontWeight: 600,
                      color: statusColor,
                      background: bg,
                      cursor: 'pointer',
                      borderRadius: 0,
                      borderLeft: `2px solid ${revColor}40`,
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                      {cellHasInvoice && (
                        <FileText
                          size={9}
                          style={{
                            color: allInvoiced ? '#00c853' : '#60a5fa',
                            flexShrink: 0,
                            opacity: 0.8,
                          }}
                        />
                      )}
                      <span>{formatAED(total, 0)}</span>
                    </div>
                    <div style={{
                      fontSize: 7,
                      fontWeight: 700,
                      color: revColor,
                      opacity: 0.7,
                      letterSpacing: 0.5,
                      fontFamily: "'DM Sans', sans-serif",
                      marginTop: 1,
                    }}>
                      {revLabel}
                    </div>
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
                {formatAED(clientTotals[cid], 0)}
              </td>
            </tr>
          ))}
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
                padding: '10px 6px',
                textAlign: 'right',
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700,
                fontSize: 10,
                color: '#1a1a1a',
              }}>
                {formatAED(monthTotals[m], 0)}
              </td>
            ))}
            <td style={{
              padding: '10px 12px',
              textAlign: 'right',
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: 12,
              color: '#00a844',
              borderLeft: '2px solid #e0dbd2',
            }}>
              {formatAED(grandTotal, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
      {tooltip && !popover && (
        <CellTooltip data={tooltip} clientName={clientNames[tooltipClientRef.current] || tooltipClientRef.current} />
      )}
      {popover && (
        <CellPopover
          data={popover}
          clientName={clientNames[popover.clientId] || popover.clientId}
          invoiceMap={invoiceMap}
          onClose={closePopover}
        />
      )}
    </div>
  );
}
