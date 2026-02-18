'use client';

import { useMemo, useState } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { useClientStore } from '@/lib/store/customer-store';
import { usePartnerStore } from '@/lib/store/partner-store';
import type { SalesPartnerInfo } from '@/lib/config/sales-partners';
import { formatAED } from '@/lib/utils/currency';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import type { Client } from '@/lib/models/platform-types';
import PartnerDetailPanel from '@/components/partners/PartnerDetailPanel';

interface ClientCommission {
  client: Client;
  mrrCommission: number;
  oneTimeCommission: number;
  totalCommission: number;
}

interface PartnerMetrics extends SalesPartnerInfo {
  clientCount: number;
  totalMRR: number;
  totalOneTimeRevenue: number;
  monthlyCommission: number;
  oneTimeCommission: number;
  annualCommission: number;
  clientBreakdown: ClientCommission[];
}

export default function SalesPartnersPage() {
  const clients = useClientStore((s) => s.clients);
  const allPartners = usePartnerStore((s) => s.getAllPartners);
  const addPartner = usePartnerStore((s) => s.addPartner);
  const updateCommission = usePartnerStore((s) => s.updateCommission);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<SalesPartnerInfo | undefined>(undefined);

  function handleOpenAdd() {
    setEditingPartner(undefined);
    setPanelOpen(true);
  }

  function handleOpenEdit(partner: SalesPartnerInfo) {
    setEditingPartner(partner);
    setPanelOpen(true);
  }

  function handlePanelSave(partner: SalesPartnerInfo) {
    addPartner(partner);
  }

  const partners = allPartners();

  const { partnerMetrics, totalMetrics } = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === 'active');

    const metrics: PartnerMetrics[] = partners.map((partner) => {
      const partnerClients = activeClients.filter(
        (c) => c.salesPartner === partner.name
      );

      const clientBreakdown: ClientCommission[] = partnerClients.map((c) => {
        const mrrComm = (c.mrr * partner.commissionPercentage) / 100;
        const oneTimeComm = (c.oneTimeRevenue * partner.oneTimeCommissionPercentage) / 100;
        return {
          client: c,
          mrrCommission: mrrComm,
          oneTimeCommission: oneTimeComm,
          totalCommission: mrrComm + oneTimeComm,
        };
      });

      const totalMRR = partnerClients.reduce((sum, c) => sum + c.mrr, 0);
      const totalOneTime = partnerClients.reduce((sum, c) => sum + c.oneTimeRevenue, 0);
      const monthlyComm = (totalMRR * partner.commissionPercentage) / 100;
      const oneTimeComm = (totalOneTime * partner.oneTimeCommissionPercentage) / 100;

      return {
        ...partner,
        clientCount: partnerClients.length,
        totalMRR,
        totalOneTimeRevenue: totalOneTime,
        monthlyCommission: monthlyComm,
        oneTimeCommission: oneTimeComm,
        annualCommission: monthlyComm * 12 + oneTimeComm,
        clientBreakdown,
      };
    });

    metrics.sort((a, b) => b.clientCount - a.clientCount);

    const totals = {
      partners: metrics.filter((m) => m.isActive).length,
      clients: metrics.reduce((sum, m) => sum + m.clientCount, 0),
      monthlyCommissions: metrics.reduce((sum, m) => sum + m.monthlyCommission, 0),
      totalPaid: metrics.reduce((sum, m) => sum + m.totalPaid, 0),
    };

    return { partnerMetrics: metrics, totalMetrics: totals };
  }, [clients, partners]);

  const togglePartner = (id: string) => {
    setExpandedPartner((prev) => (prev === id ? null : id));
  };

  const startEdit = (cellKey: string, currentValue: number) => {
    setEditingCell(cellKey);
    setEditValue(currentValue.toString());
  };

  const commitEdit = (partnerName: string, field: 'commissionPercentage' | 'oneTimeCommissionPercentage') => {
    const num = parseFloat(editValue);
    if (!isNaN(num) && num >= 0 && num <= 100) {
      updateCommission(partnerName, field, num);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const thStyle = {
    padding: '12px 8px',
    color: '#666',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: 11,
    fontWeight: 600 as const,
    textTransform: 'uppercase' as const,
  };

  const editableInputStyle = {
    width: 52,
    padding: '4px 6px',
    borderRadius: 6,
    border: '2px solid #00c853',
    fontSize: 13,
    fontFamily: "'Space Mono', monospace",
    fontWeight: 600 as const,
    textAlign: 'right' as const,
    outline: 'none',
    background: '#fff',
    color: '#1a1a1a',
  };

  const editableCellStyle = (color: string) => ({
    padding: '14px 8px',
    textAlign: 'right' as const,
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    fontWeight: 600 as const,
    color,
    cursor: 'pointer',
    borderRadius: 4,
    transition: 'background 0.15s',
  });

  return (
    <PageShell
      title="Sales Partners"
      subtitle="Commission tracking and partner performance"
      actions={
        <button
          onClick={handleOpenAdd}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: '#00c853',
            color: '#1a1a1a',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} /> Add Partner
        </button>
      }
    >
      {/* Partner Detail Panel (slide-over) */}
      <PartnerDetailPanel
        partner={editingPartner}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        onSave={handlePanelSave}
      />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KPICard
          title="Active Partners"
          value={totalMetrics.partners.toString()}
          accent="#00c853"
        />
        <KPICard
          title="Attributed Clients"
          value={totalMetrics.clients.toString()}
          accent="#60a5fa"
        />
        <KPICard
          title="Monthly Commissions"
          value={formatAED(totalMetrics.monthlyCommissions)}
          accent="#fbbf24"
        />
        <KPICard
          title="Total Paid to Date"
          value={formatAED(totalMetrics.totalPaid)}
          accent="#ff6e40"
        />
      </div>

      {/* Partner Performance Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #e0dbd2',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        }}
      >
        <h3
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: 16,
            color: '#1a1a1a',
            marginBottom: 8,
          }}
        >
          Partner Performance & Commission Structure
        </h3>
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            color: '#666',
            marginBottom: 20,
          }}
        >
          Click a partner row to expand per-client breakdown · Click commission % to edit
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                <th style={{ ...thStyle, textAlign: 'left', width: 30 }}></th>
                <th style={{ ...thStyle, textAlign: 'left' }}>Partner</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Joined</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Clients</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>MRR Comm %</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>One-Time %</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Monthly Earnings</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Annual Projection</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total Paid</th>
              </tr>
            </thead>
            <tbody>
              {partnerMetrics.map((partner, idx) => {
                const hasJoinedDate = !!partner.joinedDate;
                const joinedDate = hasJoinedDate ? new Date(partner.joinedDate) : null;
                const monthsActive = joinedDate
                  ? Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
                  : null;
                const isExpanded = expandedPartner === partner.id;
                const mrrCellKey = `${partner.id}-mrr`;
                const otCellKey = `${partner.id}-ot`;

                return (
                  <>
                    {/* Partner Summary Row */}
                    <tr
                      key={partner.id}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid #e0dbd2',
                        background: isExpanded ? '#f0faf0' : idx % 2 === 0 ? '#fafafa' : '#fff',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                    >
                      <td
                        onClick={() => togglePartner(partner.id)}
                        style={{ padding: '14px 4px 14px 8px', textAlign: 'center' }}
                      >
                        {isExpanded
                          ? <ChevronDown size={14} style={{ color: '#00c853' }} />
                          : <ChevronRight size={14} style={{ color: '#999' }} />}
                      </td>
                      <td
                        style={{
                          padding: '14px 8px',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#1a1a1a',
                        }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(partner); }}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            color: '#1a1a1a',
                            fontFamily: 'DM Sans, sans-serif',
                            fontSize: 14,
                            fontWeight: 600,
                            textDecoration: 'underline',
                            textDecorationColor: '#e0dbd2',
                            textUnderlineOffset: 3,
                          }}
                        >
                          {partner.name}
                        </button>
                        {!partner.isActive && (
                          <span style={{ marginLeft: 8, fontSize: 10, color: '#999', fontWeight: 500 }}>
                            (Inactive)
                          </span>
                        )}
                      </td>
                      <td
                        onClick={() => togglePartner(partner.id)}
                        style={{
                          padding: '14px 8px',
                          textAlign: 'center',
                          fontFamily: 'Space Mono, monospace',
                          fontSize: 12,
                          color: '#666',
                        }}
                      >
                        {joinedDate
                          ? joinedDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                          : 'N/A'}
                        {monthsActive !== null && (
                          <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                            {monthsActive}mo
                          </div>
                        )}
                      </td>
                      <td onClick={() => togglePartner(partner.id)} style={{ padding: '14px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: partner.clientCount > 0 ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                            color: partner.clientCount > 0 ? '#00c853' : '#999',
                            fontFamily: 'Space Mono, monospace',
                            fontSize: 13,
                            fontWeight: 700,
                          }}
                        >
                          {partner.clientCount}
                        </span>
                      </td>

                      {/* Editable MRR Commission % */}
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingCell !== mrrCellKey) startEdit(mrrCellKey, partner.commissionPercentage);
                        }}
                        style={editableCellStyle('#60a5fa')}
                        title="Click to edit"
                      >
                        {editingCell === mrrCellKey ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(partner.name, 'commissionPercentage')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(partner.name, 'commissionPercentage');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            style={editableInputStyle}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span style={{ borderBottom: '1px dashed #60a5fa', paddingBottom: 1 }}>
                            {partner.commissionPercentage}%
                          </span>
                        )}
                      </td>

                      {/* Editable One-Time Commission % */}
                      <td
                        onClick={(e) => {
                          e.stopPropagation();
                          if (editingCell !== otCellKey) startEdit(otCellKey, partner.oneTimeCommissionPercentage);
                        }}
                        style={editableCellStyle('#fbbf24')}
                        title="Click to edit"
                      >
                        {editingCell === otCellKey ? (
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(partner.name, 'oneTimeCommissionPercentage')}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitEdit(partner.name, 'oneTimeCommissionPercentage');
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                            autoFocus
                            style={editableInputStyle}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span style={{ borderBottom: '1px dashed #fbbf24', paddingBottom: 1 }}>
                            {partner.oneTimeCommissionPercentage}%
                          </span>
                        )}
                      </td>

                      <td onClick={() => togglePartner(partner.id)} style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: partner.monthlyCommission > 0 ? '#00c853' : '#ccc' }}>
                        {formatAED(partner.monthlyCommission)}
                      </td>
                      <td onClick={() => togglePartner(partner.id)} style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 600, color: '#666' }}>
                        {formatAED(partner.annualCommission)}
                      </td>
                      <td onClick={() => togglePartner(partner.id)} style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: '#ff6e40' }}>
                        {formatAED(partner.totalPaid)}
                      </td>
                    </tr>

                    {/* Per-Client Commission Breakdown (expandable) */}
                    {isExpanded && (
                      <tr key={`${partner.id}-detail`}>
                        <td colSpan={9} style={{ padding: 0 }}>
                          <div
                            style={{
                              background: '#f9f7f3',
                              borderBottom: '2px solid #e0dbd2',
                              padding: '12px 16px 16px 40px',
                            }}
                          >
                            <h4
                              style={{
                                fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12,
                                fontWeight: 700,
                                color: '#666',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: 10,
                              }}
                            >
                              Per-Client Commission for {partner.name}
                            </h4>
                            {partner.clientBreakdown.length === 0 ? (
                              <p style={{ fontSize: 12, color: '#999', fontFamily: 'DM Sans, sans-serif' }}>
                                No active clients attributed to this partner
                              </p>
                            ) : (
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ borderBottom: '1px solid #e0dbd2' }}>
                                    <th style={{ ...thStyle, textAlign: 'left', fontSize: 10 }}>Client</th>
                                    <th style={{ ...thStyle, textAlign: 'right', fontSize: 10 }}>Seats</th>
                                    <th style={{ ...thStyle, textAlign: 'right', fontSize: 10 }}>Client MRR</th>
                                    <th style={{ ...thStyle, textAlign: 'right', fontSize: 10 }}>MRR Comm ({partner.commissionPercentage}%)</th>
                                    <th style={{ ...thStyle, textAlign: 'right', fontSize: 10 }}>One-Time Rev</th>
                                    <th style={{ ...thStyle, textAlign: 'right', fontSize: 10 }}>One-Time Comm ({partner.oneTimeCommissionPercentage}%)</th>
                                    <th style={{ ...thStyle, textAlign: 'right', fontSize: 10 }}>Total Commission</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {partner.clientBreakdown.map((row) => (
                                    <tr
                                      key={row.client.id}
                                      style={{ borderBottom: '1px solid #eee' }}
                                    >
                                      <td style={{ padding: '10px 8px', fontFamily: 'DM Sans, sans-serif', fontSize: 13, fontWeight: 500, color: '#1a1a1a' }}>
                                        {row.client.name}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#666' }}>
                                        {row.client.seatCount || '—'}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#1a1a1a' }}>
                                        {formatAED(row.client.mrr)}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 600, color: '#60a5fa' }}>
                                        {formatAED(row.mrrCommission)}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#1a1a1a' }}>
                                        {formatAED(row.client.oneTimeRevenue)}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 600, color: '#fbbf24' }}>
                                        {formatAED(row.oneTimeCommission)}
                                      </td>
                                      <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00c853' }}>
                                        {formatAED(row.totalCommission)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr style={{ borderTop: '2px solid #e0dbd2' }}>
                                    <td colSpan={3} style={{ padding: '10px 8px', fontFamily: 'DM Sans, sans-serif', fontSize: 12, fontWeight: 700, color: '#1a1a1a' }}>
                                      SUBTOTAL
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>
                                      {formatAED(partner.monthlyCommission)}
                                    </td>
                                    <td></td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#fbbf24' }}>
                                      {formatAED(partner.oneTimeCommission)}
                                    </td>
                                    <td style={{ padding: '10px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: '#00c853' }}>
                                      {formatAED(partner.monthlyCommission + partner.oneTimeCommission)}
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #e0dbd2', background: '#f5f0e8' }}>
                <td
                  colSpan={6}
                  style={{
                    padding: '14px 8px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1a1a1a',
                  }}
                >
                  TOTAL
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: '#00c853' }}>
                  {formatAED(totalMetrics.monthlyCommissions)}
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: '#666' }}>
                  {formatAED(totalMetrics.monthlyCommissions * 12)}
                </td>
                <td style={{ padding: '14px 8px', textAlign: 'right', fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: '#ff6e40' }}>
                  {formatAED(totalMetrics.totalPaid)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Commission Structure Legend */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            background: '#f5f0e8',
            borderRadius: 8,
            border: '1px solid #e0dbd2',
          }}
        >
          <h4
            style={{
              margin: 0,
              marginBottom: 10,
              fontSize: 12,
              fontWeight: 700,
              color: '#666',
              fontFamily: 'DM Sans, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            How Commissions Work
          </h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
              fontSize: 12,
              fontFamily: 'DM Sans, sans-serif',
              color: '#666',
            }}
          >
            <div>
              <strong style={{ color: '#60a5fa' }}>MRR Commission %:</strong>{' '}
              Percentage of monthly recurring revenue from attributed clients — click to edit
            </div>
            <div>
              <strong style={{ color: '#fbbf24' }}>One-Time %:</strong>{' '}
              Percentage of one-time revenue (setup, onboarding fees) — click to edit
            </div>
            <div>
              <strong style={{ color: '#00c853' }}>Monthly Earnings:</strong>{' '}
              Current monthly commission based on active client MRR
            </div>
            <div>
              <strong style={{ color: '#ff6e40' }}>Total Paid:</strong>{' '}
              Cumulative commissions paid to date
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
