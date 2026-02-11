'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatAED } from '@/lib/utils/currency';
import { PARTNER_GRADIENTS } from '@/lib/models/pricing-data';

interface RevenueDonutProps {
  data: { name: string; value: number; partner: string }[];
  total: string;
}

export default function RevenueDonut({ data, total }: RevenueDonutProps) {
  return (
    <div
      className="relative"
      style={{
        height: 240,
        background: 'radial-gradient(ellipse at center, #1e1e2e 0%, #131320 60%, #0d0d18 100%)',
        borderRadius: 12,
        padding: 8,
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
        backgroundSize: '24px 24px',
        borderRadius: 12,
        pointerEvents: 'none',
      }} />

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {data.map((entry) => {
              const grad = PARTNER_GRADIENTS[entry.partner] || ['#666', '#444'];
              return (
                <linearGradient key={`grad-${entry.partner}`} id={`donut-${entry.partner.replace(/[^a-zA-Z]/g, '')}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={grad[0]} />
                  <stop offset="100%" stopColor={grad[1]} />
                </linearGradient>
              );
            })}
            <filter id="donut-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
            strokeWidth={0}
            style={{ filter: 'url(#donut-glow)' }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.partner}
                fill={`url(#donut-${entry.partner.replace(/[^a-zA-Z]/g, '')})`}
              />
            ))}
          </Pie>
          <Pie
            data={[{ value: 1 }]}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={57}
            dataKey="value"
            strokeWidth={0}
            fill="rgba(255,255,255,0.06)"
            isAnimationActive={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              const grad = PARTNER_GRADIENTS[d.partner] || ['#666', '#444'];
              const glow = `${grad[0]}80`;
              return (
                <div style={{
                  background: 'rgba(20,20,35,0.95)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '10px 14px',
                  color: '#ffffff',
                  boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${glow}`,
                }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>
                    {d.name}
                  </p>
                  <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700 }}>
                    {formatAED(d.value)}
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginLeft: 4 }}>/mo</span>
                  </p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p style={{
          fontSize: 20,
          fontWeight: 700,
          color: '#ffffff',
          fontFamily: "'Space Mono', monospace",
          textShadow: '0 0 20px rgba(0,200,83,0.3)',
        }}>
          {total}
        </p>
        <p style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.4)',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 500,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 2,
        }}>
          Total MRR
        </p>
      </div>
    </div>
  );
}
