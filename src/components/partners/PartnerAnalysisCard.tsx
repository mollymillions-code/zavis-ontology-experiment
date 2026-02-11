'use client';

import type { PartnerAgreementAnalysis } from '@/lib/schemas/partner-extraction';
import { AlertTriangle, CheckCircle, Info, TrendingUp } from 'lucide-react';

interface PartnerAnalysisCardProps {
  analysis: PartnerAgreementAnalysis;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: '#f0faf0', text: '#00a844', border: '#c8e6c9' },
  medium: { bg: '#fff8e1', text: '#f57f17', border: '#ffe082' },
  high: { bg: '#ffebee', text: '#d32f2f', border: '#ef9a9a' },
};

const VERDICT_LABELS: Record<string, { label: string; color: string }> = {
  generous: { label: 'Generous Terms', color: '#d32f2f' },
  standard: { label: 'Standard Terms', color: '#2979ff' },
  conservative: { label: 'Conservative', color: '#00a844' },
  aggressive: { label: 'Aggressive', color: '#f57f17' },
};

export default function PartnerAnalysisCard({ analysis }: PartnerAnalysisCardProps) {
  const { commissionAssessment, risks, obligations, recommendations } = analysis;
  const verdict = VERDICT_LABELS[commissionAssessment.verdict] || VERDICT_LABELS.standard;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary */}
      <div style={{
        padding: 16, borderRadius: 10,
        background: 'linear-gradient(135deg, #f5f0e8 0%, #ede7db 100%)',
        border: '1px solid #e0dbd2',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Info size={14} style={{ color: '#666' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
            Agreement Summary
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
          {analysis.summary}
        </p>
      </div>

      {/* Confidence */}
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

      {/* Commission Assessment */}
      <div style={{ padding: 16, borderRadius: 10, background: '#ffffff', border: '1px solid #e0dbd2' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif" }}>
            Commission Assessment
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
            background: verdict.color + '18', color: verdict.color,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {verdict.label}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#1a1a1a', lineHeight: 1.5, fontFamily: "'DM Sans', sans-serif", margin: '0 0 8px 0' }}>
          {commissionAssessment.reasoning}
        </p>
        <p style={{ fontSize: 11, color: '#999', fontFamily: "'Space Mono', monospace", margin: 0 }}>
          Industry benchmark: ~{commissionAssessment.industryBenchmarkPct}%
        </p>
      </div>

      {/* Risks */}
      {risks.length > 0 && (
        <div style={{ padding: 16, borderRadius: 10, background: '#ffffff', border: '1px solid #e0dbd2' }}>
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
                    marginLeft: 'auto', flexShrink: 0, fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {risk.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Obligations */}
      {obligations.length > 0 && (
        <div style={{ padding: 16, borderRadius: 10, background: '#ffffff', border: '1px solid #e0dbd2' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: "'DM Sans', sans-serif", display: 'block', marginBottom: 10 }}>
            Zavis Obligations
          </span>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {obligations.map((o, i) => (
              <li key={i} style={{ fontSize: 12, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 4, lineHeight: 1.4 }}>
                {o}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ padding: 16, borderRadius: 10, background: '#f0faf0', border: '1px solid #c8e6c9' }}>
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

      {/* Ambiguities (high confidence) */}
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
