'use client';

import type { DealAnalysisSnapshot } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import { FileText, TrendingUp, X } from 'lucide-react';

interface DealComparisonCardProps {
  dealAnalysis: DealAnalysisSnapshot;
  currentPerSeatPrice: number;
  onDismiss?: () => void;
}

const VERDICT_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  premium: { label: 'Above Standard', color: '#00a844', bg: '#f0faf0' },
  at_standard: { label: 'At Standard', color: '#2979ff', bg: '#e3f2fd' },
  discounted: { label: 'Discounted', color: '#f57f17', bg: '#fff8e1' },
  heavily_discounted: { label: 'Heavily Discounted', color: '#d32f2f', bg: '#ffebee' },
};

export default function DealComparisonCard({ dealAnalysis, currentPerSeatPrice, onDismiss }: DealComparisonCardProps) {
  const verdict = VERDICT_STYLES[dealAnalysis.comparisonVerdict] || VERDICT_STYLES.at_standard;
  const totalRisks = dealAnalysis.riskCount.low + dealAnalysis.riskCount.medium + dealAnalysis.riskCount.high;
  const effectiveRate = dealAnalysis.effectivePerSeatRate || currentPerSeatPrice;
  const deltaPct = currentPerSeatPrice > 0
    ? ((effectiveRate - currentPerSeatPrice) / currentPerSeatPrice * 100)
    : 0;

  return (
    <div style={{
      background: verdict.bg,
      borderRadius: 12,
      padding: 20,
      border: `1px solid ${verdict.color}30`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileText size={18} style={{ color: verdict.color }} />
          <div>
            <h3 style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14,
              color: '#1a1a1a', margin: 0,
            }}>
              Contract Analysis: {dealAnalysis.customerName}
            </h3>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
              background: verdict.color + '20', color: verdict.color,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              {verdict.label}
            </span>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#999', padding: 2 }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Summary */}
      <p style={{ fontSize: 12, color: '#444', fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5, margin: '0 0 14px 0' }}>
        {dealAnalysis.summary}
      </p>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        <div style={{ background: '#ffffff80', padding: 10, borderRadius: 8 }}>
          <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif", margin: '0 0 2px 0' }}>Deal Per-Seat Rate</p>
          <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: verdict.color, margin: 0 }}>
            {formatAED(effectiveRate)}
          </p>
          <p style={{ fontSize: 10, fontFamily: "'Space Mono', monospace", color: '#999', margin: 0 }}>
            {deltaPct >= 0 ? '+' : ''}{deltaPct.toFixed(1)}% vs avg
          </p>
        </div>
        <div style={{ background: '#ffffff80', padding: 10, borderRadius: 8 }}>
          <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif", margin: '0 0 2px 0' }}>Risks Identified</p>
          <p style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: totalRisks > 2 ? '#d32f2f' : '#1a1a1a', margin: 0 }}>
            {totalRisks}
          </p>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {dealAnalysis.riskCount.high > 0 && (
              <span style={{ fontSize: 9, background: '#ffebee', color: '#d32f2f', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>
                {dealAnalysis.riskCount.high} high
              </span>
            )}
            {dealAnalysis.riskCount.medium > 0 && (
              <span style={{ fontSize: 9, background: '#fff8e1', color: '#f57f17', padding: '1px 4px', borderRadius: 3, fontWeight: 600 }}>
                {dealAnalysis.riskCount.medium} med
              </span>
            )}
          </div>
        </div>
        <div style={{ background: '#ffffff80', padding: 10, borderRadius: 8 }}>
          <p style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif", margin: '0 0 2px 0' }}>Revenue Quality</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <TrendingUp size={14} style={{ color: '#00a844' }} />
            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}>
              {dealAnalysis.recommendations.length} suggestions
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {dealAnalysis.recommendations.length > 0 && (
        <div style={{ background: '#ffffff80', padding: 10, borderRadius: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif", margin: '0 0 6px 0' }}>
            Recommendations
          </p>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            {dealAnalysis.recommendations.slice(0, 3).map((rec, i) => (
              <li key={i} style={{ fontSize: 11, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 2, lineHeight: 1.4 }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
