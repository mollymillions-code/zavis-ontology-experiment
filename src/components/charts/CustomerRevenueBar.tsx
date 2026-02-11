'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { formatAED } from '@/lib/utils/currency';
import { PARTNER_GRADIENTS, PARTNER_COLORS } from '@/lib/models/pricing-data';

interface CustomerRevenueBarProps {
  data: { name: string; mrr: number; partner: string }[];
}

export default function CustomerRevenueBar({ data }: CustomerRevenueBarProps) {
  const sorted = [...data].sort((a, b) => b.mrr - a.mrr);
  const uniquePartners = Array.from(new Set(sorted.map((d) => d.partner)));

  return (
    <div
      style={{
        height: Math.max(220, sorted.length * 38 + 32),
        background: 'linear-gradient(160deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
        borderRadius: 12,
        padding: '16px 12px 12px 12px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
        backgroundSize: '20px 20px',
        borderRadius: 12,
        pointerEvents: 'none',
      }} />

      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={sorted}
          layout="vertical"
          margin={{ top: 0, right: 12, bottom: 0, left: 4 }}
        >
          <defs>
            {uniquePartners.map((partner) => {
              const grad = PARTNER_GRADIENTS[partner] || ['#666', '#444'];
              const id = partner.replace(/[^a-zA-Z]/g, '');
              return (
                <linearGradient key={id} id={`bar-${id}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={grad[1]} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={grad[0]} stopOpacity={1} />
                </linearGradient>
              );
            })}
            <filter id="bar-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <XAxis
            type="number"
            tick={{ fontSize: 9, fontFamily: "'Space Mono', monospace", fill: 'rgba(255,255,255,0.3)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${Math.round(v / 1000)}K`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", fill: 'rgba(255,255,255,0.6)', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const color = PARTNER_COLORS[d.partner] || '#666';
              return (
                <div style={{
                  background: 'rgba(20,20,35,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#ffffff',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${color}60`,
                }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                    {d.name}
                  </p>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700 }}>
                    {formatAED(d.mrr)}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>/mo</span>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="mrr" radius={[0, 6, 6, 0]} barSize={22} style={{ filter: 'url(#bar-glow)' }}>
            {sorted.map((entry) => (
              <Cell
                key={entry.name}
                fill={`url(#bar-${entry.partner.replace(/[^a-zA-Z]/g, '')})`}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
