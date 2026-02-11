import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  delta?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
    isGood: boolean;
  };
  subtitle?: string;
  className?: string;
  accent?: string;
}

export default function KPICard({ title, value, delta, subtitle, className, accent }: KPICardProps) {
  const DeltaIcon = delta?.direction === 'up' ? TrendingUp : delta?.direction === 'down' ? TrendingDown : Minus;

  return (
    <div
      className={className}
      style={{
        background: '#ffffff',
        borderRadius: 12,
        padding: 24,
        border: '1px solid #e0dbd2',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        ...(accent ? { borderLeft: `4px solid ${accent}` } : {}),
      }}
    >
      <p style={{
        fontSize: 12,
        fontWeight: 500,
        color: '#666666',
        fontFamily: "'DM Sans', sans-serif",
        marginBottom: 4,
      }}>
        {title}
      </p>
      <p style={{
        fontSize: 22,
        fontWeight: 700,
        color: '#1a1a1a',
        fontFamily: "'Space Mono', monospace",
        marginTop: 2,
      }}>
        {value}
      </p>
      {delta && (
        <div className="flex items-center gap-1.5" style={{ marginTop: 8 }}>
          <DeltaIcon
            className="w-3.5 h-3.5"
            style={{ color: delta.isGood ? '#00c853' : '#ff3d00' }}
          />
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            fontFamily: "'Space Mono', monospace",
            color: delta.isGood ? '#00a844' : '#ff3d00',
          }}>
            {delta.value}
          </span>
          {subtitle && (
            <span style={{ fontSize: 11, color: '#999999', fontFamily: "'DM Sans', sans-serif" }}>
              {subtitle}
            </span>
          )}
        </div>
      )}
      {!delta && subtitle && (
        <p style={{ fontSize: 11, color: '#999999', marginTop: 6, fontFamily: "'DM Sans', sans-serif" }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
