'use client';

import { useEffect, useMemo } from 'react';
import PageShell from '@/components/layout/PageShell';
import KPICard from '@/components/cards/KPICard';
import { useClientStore } from '@/lib/store/customer-store';
import { useOntologyStore } from '@/lib/store/ontology-store';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import { OBJECT_TYPES } from '@/lib/ontology/object-types';
import { LINK_TYPES } from '@/lib/ontology/link-types';
import { ACTION_TYPES } from '@/lib/ontology/action-types';
import { formatNumber } from '@/lib/utils/currency';
import {
  Network,
  ArrowRight,
  Activity,
  Clock,
  Box,
  Link2,
  Zap,
} from 'lucide-react';

const dm = "'DM Sans', sans-serif";
const mono = "'Space Mono', monospace";

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  borderRadius: 12,
  border: '1px solid #e0dbd2',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  padding: 20,
};

const badgeColor: Record<string, string> = {
  create: '#00c853',
  update: '#2979ff',
  delete: '#ff3d00',
};

export default function OntologyPage() {
  const clients = useClientStore((s) => s.clients);
  const {
    partners,
    contracts,
    revenueStreams,
    customerPartnerLinks,
    actionLog,
  } = useOntologyStore();
  const { invoices, catalogItems, payments, hydrateFromDb } = useInvoiceStore();

  useEffect(() => {
    hydrateFromDb();
  }, [hydrateFromDb]);

  const objectTypes = Object.values(OBJECT_TYPES);
  const linkTypes = Object.values(LINK_TYPES);
  const actionTypes = Object.values(ACTION_TYPES);

  // Counts per object type
  const entityCounts = useMemo(() => ({
    Customer: clients.length,
    SalesPartner: partners.length,
    Contract: contracts.length,
    RevenueStream: revenueStreams.length,
    Invoice: invoices.length,
    CatalogItem: catalogItems.length,
    PaymentReceived: payments.length,
    CostEntry: 0,
    Snapshot: 0,
    PricingScenario: 0,
  }), [clients, partners, contracts, revenueStreams, invoices, catalogItems, payments]);

  const totalEntities = Object.values(entityCounts).reduce((a, b) => a + b, 0);
  const totalLinks = customerPartnerLinks.length + contracts.length + revenueStreams.length + payments.length;

  return (
    <PageShell
      title="Ontology Explorer"
      subtitle={`${objectTypes.length} object types · ${linkTypes.length} link types · ${actionTypes.length} actions`}
    >
      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KPICard title="Object Types" value={formatNumber(objectTypes.length)} subtitle="Defined" accent="#a78bfa" />
        <KPICard title="Link Types" value={formatNumber(linkTypes.length)} subtitle="Relationships" accent="#60a5fa" />
        <KPICard title="Action Types" value={formatNumber(actionTypes.length)} subtitle="Auditable mutations" accent="#00c853" />
        <KPICard title="Total Entities" value={formatNumber(totalEntities)} subtitle="In database" accent="#fbbf24" />
        <KPICard title="Total Links" value={formatNumber(totalLinks)} subtitle="Active relationships" accent="#f472b6" />
      </div>

      {/* Object Types + Link Types */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Object Types */}
        <div style={cardStyle}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Box className="w-4 h-4" style={{ color: '#a78bfa' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: dm, color: '#1a1a1a' }}>Object Types</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {objectTypes.map((ot) => {
              const count = entityCounts[ot.typeName as keyof typeof entityCounts] ?? 0;
              return (
                <div
                  key={ot.typeName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: '#faf8f4',
                    border: '1px solid #f0ebe0',
                  }}
                >
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: '#1a1a1a' }}>
                      {ot.typeName}
                    </p>
                    <p style={{ fontSize: 11, fontFamily: dm, color: '#888', marginTop: 2 }}>
                      {ot.backedByTable} · {ot.properties.length} props{ot.derivedProperties.length > 0 ? ` · ${ot.derivedProperties.length} derived` : ''}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: mono,
                    color: count > 0 ? '#00c853' : '#ccc',
                  }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Link Types */}
        <div style={cardStyle}>
          <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
            <Link2 className="w-4 h-4" style={{ color: '#60a5fa' }} />
            <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: dm, color: '#1a1a1a' }}>Link Types</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {linkTypes.map((lt) => (
              <div
                key={lt.linkName}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#faf8f4',
                  border: '1px solid #f0ebe0',
                }}
              >
                <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: '#1a1a1a' }}>
                    {lt.linkName}
                  </span>
                  <span style={{
                    fontSize: 10,
                    fontFamily: dm,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: '#e8e3d9',
                    color: '#666',
                    fontWeight: 600,
                  }}>
                    {lt.cardinality}
                  </span>
                </div>
                <div className="flex items-center gap-1.5" style={{ fontSize: 11, fontFamily: dm, color: '#888' }}>
                  <span style={{ color: '#a78bfa', fontWeight: 600 }}>{lt.sourceObjectType}</span>
                  <ArrowRight className="w-3 h-3" style={{ color: '#ccc' }} />
                  <span style={{ color: '#60a5fa', fontWeight: 600 }}>{lt.targetObjectType}</span>
                </div>
                {lt.replaces && (
                  <p style={{ fontSize: 10, color: '#aaa', fontFamily: dm, marginTop: 4, fontStyle: 'italic' }}>
                    Replaces: {lt.replaces}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Types */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
          <Zap className="w-4 h-4" style={{ color: '#00c853' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: dm, color: '#1a1a1a' }}>Action Types</h3>
          <span style={{ fontSize: 11, fontFamily: dm, color: '#999', marginLeft: 'auto' }}>
            All mutations are auditable
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          {actionTypes.map((at) => (
            <div
              key={at.actionName}
              style={{
                padding: '12px 14px',
                borderRadius: 8,
                background: '#faf8f4',
                border: '1px solid #f0ebe0',
              }}
            >
              <p style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: '#1a1a1a', marginBottom: 4 }}>
                {at.actionName}
              </p>
              <p style={{ fontSize: 11, fontFamily: dm, color: '#888', marginBottom: 8, lineHeight: 1.4 }}>
                {at.description}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {at.mutations.map((m, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: 10,
                      fontFamily: mono,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: `${badgeColor[m.operation]}20`,
                      color: badgeColor[m.operation],
                      fontWeight: 700,
                    }}
                  >
                    {m.operation} {m.objectType}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Audit Trail */}
      <div style={cardStyle}>
        <div className="flex items-center gap-2" style={{ marginBottom: 16 }}>
          <Activity className="w-4 h-4" style={{ color: '#fbbf24' }} />
          <h3 style={{ fontSize: 14, fontWeight: 700, fontFamily: dm, color: '#1a1a1a' }}>Audit Trail</h3>
          <span style={{ fontSize: 11, fontFamily: dm, color: '#999', marginLeft: 'auto' }}>
            {actionLog.length} logged actions
          </span>
        </div>

        {actionLog.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Network className="w-8 h-8 mx-auto" style={{ color: '#ddd', marginBottom: 8 }} />
            <p style={{ fontSize: 13, fontFamily: dm, color: '#999' }}>
              No actions logged yet
            </p>
            <p style={{ fontSize: 11, fontFamily: dm, color: '#ccc', marginTop: 4 }}>
              Actions will appear here as you create customers, update pricing, and manage contracts through the ontology service.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 400, overflowY: 'auto' }}>
            {actionLog.slice(0, 50).map((entry) => (
              <div
                key={entry.id}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#faf8f4',
                  border: '1px solid #f0ebe0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: '#ccc', marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: mono, color: '#1a1a1a' }}>
                      {entry.actionType}
                    </span>
                    <span style={{ fontSize: 10, fontFamily: dm, color: '#999' }}>
                      by {entry.actor}
                    </span>
                  </div>
                  <p style={{ fontSize: 10, fontFamily: mono, color: '#aaa' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  {Array.isArray(entry.mutations) && entry.mutations.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {entry.mutations.map((m, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 10,
                            fontFamily: mono,
                            padding: '2px 6px',
                            borderRadius: 4,
                            background: `${badgeColor[m.operation] || '#999'}20`,
                            color: badgeColor[m.operation] || '#999',
                            fontWeight: 700,
                          }}
                        >
                          {m.operation} {m.objectType}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
