'use client';

import type { DealAnalysis } from '@/lib/schemas/contract-extraction';
import { formatAED } from '@/lib/utils/currency';
import { AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';

interface DealAnalysisCardProps {
  analysis: DealAnalysis;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: '#f0faf0', text: '#00a844', border: '#c8e6c9' },
  medium: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  high: { bg: '#ffebee', text: '#d32f2f', border: '#ef9a9a' },
};

const VERDICT_LABELS: Record<string, { label: string; color: string }> = {
  premium: { label: 'Above Standard', color: '#00a844' },
  at_standard: { label: 'At Standard', color: '#2979ff' },
  discounted: { label: 'Discounted', color: '#f57f17' },
  heavily_discounted: { label: 'Heavily Discounted', color: '#d32f2f' },
};

const PREDICTABILITY_COLORS: Record<string, string> = {
  high: '#00a844',
  medium: '#f57f17',
  low: '#d32f2f',
};

export default function DealAnalysisCard({ analysis }: DealAnalysisCardProps) {
  const { comparisonToStandard, risks, revenueQuality, recommendations } = analysis;
  const verdict = VERDICT_LABELS[comparisonToStandard.verdict] || VERDICT_LABELS.at_standard;

  const standardBarWidth = 100;
  const actualBarWidth = comparisonToStandard.standardPrice > 0
    ? Math.min((comparisonToStandard.actualPrice / comparisonToStandard.standardPrice) * 100, 150)
    : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Executive Summary */}
      <div style={{
        padding: 16, borderRadius: 10,
        background: 'linear-gradient(135deg, #f5f0e8 0%, #ede7db 100%)',
        border: '1px solid #e0dbd2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Info size={14} style={{ color: '#666' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
            Deal Summary
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          {analysis.summary}
        </p>
      </div>

      {/* Confidence Indicator */}
      {analysis.extractionConfidence < 0.7 && (
        <div style={{
          padding: 12, borderRadius: 8,
          background: '#fff8e1', border: '1px solid #ffe082',
          display: 'flex', alignItems: 'flex-start', gap: 8,
        }}>
          <AlertTriangle size={14} style={{ color: '#f57f17', marginTop: 2, flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f57f17', fontFamily: "'DM Sans', sans-serif" }}>
              Low Confidence ({(analysis.extractionConfidence * 100).toFixed(0)}%)
            </span>
            {analysis.ambiguities.length > 0 && (
              <ul style={{ margin: '4px 0 0 0', paddingLeft: 16 }}>
                {analysis.ambiguities.map((a, i) => (
                  <li key={i} style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>{a}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Pricing Comparison */}
      <div style={{
        padding: 16, borderRadius: 10,
        background: '#ffffff', border: '1px solid #e0dbd2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
            Pricing Comparison
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
            background: verdict.color + '18', color: verdict.color,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {verdict.label}
          </span>
        </div>

        {/* Standard bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif" }}>
              Standard ({comparisonToStandard.closestPlan})
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#666' }}>
              {formatAED(comparisonToStandard.standardPrice)}/seat
            </span>
          </div>
          <div style={{ height: 8, background: '#e0dbd2', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${standardBarWidth}%`, height: '100%', background: '#999', borderRadius: 4 }} />
          </div>
        </div>

        {/* Actual bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: '#1a1a1a', fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
              This Deal
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: verdict.color }}>
              {formatAED(comparisonToStandard.actualPrice)}/seat
              <span style={{ fontSize: 10, color: '#999', marginLeft: 6 }}>
                {comparisonToStandard.deltaPct >= 0 ? '+' : ''}{comparisonToStandard.deltaPct.toFixed(1)}%
              </span>
            </span>
          </div>
          <div style={{ height: 8, background: '#e0dbd2', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(actualBarWidth, 100)}%`, height: '100%', background: verdict.color, borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Risk Flags */}
      {risks.length > 0 && (
        <div style={{
          padding: 16, borderRadius: 10,
          background: '#ffffff', border: '1px solid #e0dbd2',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: 10 }}>
            Risk Flags ({risks.length})
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {risks.map((risk, i) => {
              const sev = SEVERITY_COLORS[risk.severity] || SEVERITY_COLORS.low;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', borderRadius: 6,
                  background: sev.bg, border: `1px solid ${sev.border}`,
                }}>
                  <AlertTriangle size={12} style={{ color: sev.text, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: sev.text, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                    {risk.description}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, color: sev.text, textTransform: 'uppercase',
                    marginLeft: 'auto', flexShrink: 0,
                    fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {risk.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue Quality */}
      <div style={{
        padding: 16, borderRadius: 10,
        background: '#ffffff', border: '1px solid #e0dbd2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
            Revenue Quality
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            color: PREDICTABILITY_COLORS[revenueQuality.predictabilityScore] || '#666',
            fontFamily: "'Space Mono', monospace",
          }}>
            {revenueQuality.predictabilityScore}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ flex: 1, height: 6, background: '#e0dbd2', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: `${revenueQuality.recurringPct}%`, height: '100%',
              background: '#00c853', borderRadius: 3,
            }} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: '#1a1a1a' }}>
            {revenueQuality.recurringPct.toFixed(0)}% recurring
          </span>
        </div>
        <p style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          {revenueQuality.reasoning}
        </p>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{
          padding: 16, borderRadius: 10,
          background: '#f0faf0', border: '1px solid #c8e6c9',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <TrendingUp size={14} style={{ color: '#00a844' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#00a844', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
              Recommendations
            </span>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {recommendations.map((rec, i) => (
              <li key={i} style={{ fontSize: 12, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 4, lineHeight: 1.4 }}>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ambiguities (if confidence is OK but there are still some) */}
      {analysis.extractionConfidence >= 0.7 && analysis.ambiguities.length > 0 && (
        <div style={{ padding: 10, borderRadius: 8, background: '#f5f0e8', border: '1px solid #e0dbd2' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#999', fontFamily: "'DM Sans', sans-serif" }}>
            <CheckCircle size={10} style={{ marginRight: 4, display: 'inline' }} />
            Confidence: {(analysis.extractionConfidence * 100).toFixed(0)}% — Minor ambiguities:
          </span>
          <span style={{ fontSize: 10, color: '#666', fontFamily: "'DM Sans', sans-serif", marginLeft: 4 }}>
            {analysis.ambiguities.join('; ')}
          </span>
        </div>
      )}
    </div>
  );
}
