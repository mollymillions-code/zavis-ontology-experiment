'use client';

import type { PricingReport } from '@/lib/schemas/pricing-report';
import { formatAED } from '@/lib/utils/currency';

const VERDICT_COLORS: Record<string, { bg: string; text: string }> = {
  highly_profitable: { bg: '#d1fae5', text: '#065f46' },
  profitable: { bg: '#dbeafe', text: '#1e40af' },
  marginal: { bg: '#fef3c7', text: '#92400e' },
  loss_making: { bg: '#fed7d7', text: '#991b1b' },
};

const SEVERITY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  low: { bg: '#f0faf0', border: '#00c853', text: '#065f46' },
  medium: { bg: '#fffde7', border: '#fbbf24', text: '#92400e' },
  high: { bg: '#fff5f5', border: '#ff6e40', text: '#991b1b' },
};

const BUDGET_LABELS: Record<string, { label: string; color: string }> = {
  price_sensitive: { label: 'Price Sensitive', color: '#ff6e40' },
  mid_market: { label: 'Mid Market', color: '#fbbf24' },
  enterprise: { label: 'Enterprise', color: '#00c853' },
};

const MATURITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: '#ff6e40' },
  medium: { label: 'Medium', color: '#fbbf24' },
  high: { label: 'High', color: '#00c853' },
};

const card: React.CSSProperties = {
  background: '#ffffff', borderRadius: 12, padding: 20,
  border: '1px solid #e0dbd2', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
};
const heading: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 14,
  color: '#1a1a1a', marginBottom: 12, marginTop: 0,
};
const label: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600,
  color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em',
};
const mono: React.CSSProperties = {
  fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#1a1a1a',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', GBP: '£', EUR: '€', SAR: 'SAR ', BHD: 'BHD ', QAR: 'QAR ', OMR: 'OMR ',
};

type CurrencyCtx = { currency: string; conversionRate: number | null } | null;

/** Format local currency amount */
function fmtLocal(aed: number, ctx: CurrencyCtx): string | null {
  if (!ctx?.conversionRate || ctx.currency === 'AED') return null;
  const local = Math.round(aed * ctx.conversionRate);
  const sym = CURRENCY_SYMBOLS[ctx.currency] || ctx.currency + ' ';
  return `${sym}${local.toLocaleString()}`;
}

/** Dual price as inline element — AED primary, local currency dimmed */
function DualPrice({ aed, ctx, decimals = 0 }: { aed: number; ctx: CurrencyCtx; decimals?: number }) {
  const localStr = fmtLocal(aed, ctx);
  return (
    <span>
      {formatAED(aed, decimals)}
      {localStr && <span style={{ color: '#999', fontWeight: 500, fontSize: '0.85em', marginLeft: 4 }}>{localStr}</span>}
    </span>
  );
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700,
      fontFamily: "'DM Sans', sans-serif", background: bg, color,
      textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {text}
    </span>
  );
}

export default function PricingReportCards({ report }: { report: PricingReport }) {
  const { prospect, options, recommendation, profitability, portfolioComparison, risks, marketContext } = report;
  const cx = marketContext.conversionRate ? marketContext : null; // dual-price context (null = UAE, AED only)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ===== PROSPECT PROFILE ===== */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ ...heading, marginBottom: 0 }}>{prospect.name}</h3>
          <Badge
            text={BUDGET_LABELS[prospect.estimatedBudgetTier]?.label || prospect.estimatedBudgetTier}
            bg={BUDGET_LABELS[prospect.estimatedBudgetTier]?.color + '20' || '#eee'}
            color={BUDGET_LABELS[prospect.estimatedBudgetTier]?.color || '#666'}
          />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
          <div><span style={label}>Industry</span><p style={{ ...mono, fontSize: 13, margin: '4px 0 0' }}>{prospect.industry}</p></div>
          <div><span style={label}>Location</span><p style={{ ...mono, fontSize: 13, margin: '4px 0 0' }}>{prospect.location}</p></div>
          <div><span style={label}>Size</span><p style={{ ...mono, fontSize: 13, margin: '4px 0 0' }}>{prospect.businessSize}</p></div>
          <div>
            <span style={label}>Digital Maturity</span>
            <p style={{ margin: '4px 0 0' }}>
              <Badge
                text={MATURITY_LABELS[prospect.digitalMaturity]?.label || prospect.digitalMaturity}
                bg={MATURITY_LABELS[prospect.digitalMaturity]?.color + '20' || '#eee'}
                color={MATURITY_LABELS[prospect.digitalMaturity]?.color || '#666'}
              />
            </p>
          </div>
        </div>
        {prospect.painPoints.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {prospect.painPoints.map((p, i) => (
              <span key={i} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500,
                fontFamily: "'DM Sans', sans-serif", background: '#f5f0e8', color: '#666',
                border: '1px solid #e0dbd2',
              }}>
                {p}
              </span>
            ))}
          </div>
        )}
        {prospect.websiteInsights && (
          <p style={{ fontSize: 12, color: '#666', fontFamily: "'DM Sans', sans-serif", marginTop: 10, lineHeight: 1.5, marginBottom: 0 }}>
            {prospect.websiteInsights}
          </p>
        )}
      </div>

      {/* ===== PRICING OPTIONS (3 cards) ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {options.map((opt, i) => (
          <div key={i} style={{
            ...card,
            border: opt.recommended ? '2px solid #00c853' : '1px solid #e0dbd2',
            position: 'relative',
          }}>
            {opt.recommended && (
              <div style={{
                position: 'absolute', top: -1, left: 20, right: 20,
                background: '#00c853', color: '#1a1a1a', textAlign: 'center',
                fontSize: 9, fontWeight: 800, padding: '3px 0',
                fontFamily: "'DM Sans', sans-serif", letterSpacing: 1,
                borderRadius: '0 0 6px 6px',
              }}>
                RECOMMENDED
              </div>
            )}
            <div style={{ marginTop: opt.recommended ? 12 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Badge text={opt.tier} bg="#1a1a1a" color="#ffffff" />
                <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a' }}>
                  {opt.label}
                </span>
              </div>

              <div style={{ fontSize: 28, ...mono, color: '#00c853', marginBottom: 0 }}>
                {formatAED(opt.perSeatPrice)}
              </div>
              {fmtLocal(opt.perSeatPrice, cx) && (
                <div style={{ fontSize: 14, ...mono, color: '#999', fontWeight: 500, marginBottom: 0 }}>
                  {fmtLocal(opt.perSeatPrice, cx)}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#999', fontFamily: "'DM Sans', sans-serif", marginTop: 2, marginBottom: 12 }}>
                per seat/month
                {opt.discount > 0 && <span style={{ color: '#ff6e40', fontWeight: 600, marginLeft: 6 }}>-{opt.discount}%</span>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { l: 'Seats', aed: null, raw: String(opt.seatCount) },
                  { l: 'Billing', aed: null, raw: opt.billingCycle },
                  { l: 'MRR', aed: opt.mrr, raw: null },
                  { l: 'ARR', aed: opt.arr, raw: null },
                  { l: 'One-Time', aed: opt.oneTimeFees, raw: null },
                  { l: '12mo Value', aed: opt.totalContractValue, raw: null },
                ] as { l: string; aed: number | null; raw: string | null }[]).map((row) => (
                  <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ ...label, textTransform: 'none', fontSize: 11 }}>{row.l}</span>
                    <span style={{ ...mono, fontSize: 12 }}>
                      {row.aed != null ? <DualPrice aed={row.aed} ctx={cx} /> : row.raw}
                    </span>
                  </div>
                ))}
              </div>

              {opt.addOns.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e0dbd2' }}>
                  <span style={{ ...label, fontSize: 10 }}>Add-ons</span>
                  {opt.addOns.map((a, j) => (
                    <div key={j} style={{ fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
                      {a.name} — <DualPrice aed={a.amount} ctx={cx} /> {a.frequency}
                    </div>
                  ))}
                </div>
              )}

              <p style={{ fontSize: 11, color: '#999', fontFamily: "'DM Sans', sans-serif", marginTop: 10, lineHeight: 1.4, marginBottom: 0 }}>
                {opt.rationale}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* ===== RECOMMENDATION ===== */}
      <div style={{ ...card, background: '#f0faf0', border: '1px solid #c8e6c9' }}>
        <h3 style={{ ...heading, color: '#065f46' }}>Recommendation</h3>
        <p style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', lineHeight: 1.6, marginTop: 0 }}>
          {recommendation.reasoning}
        </p>
        <div style={{ marginTop: 8, padding: 12, background: '#ffffff', borderRadius: 8, border: '1px solid #e0dbd2' }}>
          <span style={{ ...label, fontSize: 10 }}>Closing Strategy</span>
          <p style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#666', lineHeight: 1.5, margin: '4px 0 0' }}>
            {recommendation.closingStrategy}
          </p>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
          <div>
            <span style={{ ...label, fontSize: 10 }}>Floor Price</span>
            <p style={{ ...mono, fontSize: 13, margin: '2px 0 0', color: '#ff6e40' }}><DualPrice aed={recommendation.negotiationFloor.perSeatPrice} ctx={cx} />/seat</p>
          </div>
          <div>
            <span style={{ ...label, fontSize: 10 }}>Max Discount</span>
            <p style={{ ...mono, fontSize: 13, margin: '2px 0 0', color: '#ff6e40' }}>{recommendation.negotiationFloor.discount}%</p>
          </div>
          <div>
            <span style={{ ...label, fontSize: 10 }}>Floor MRR</span>
            <p style={{ ...mono, fontSize: 13, margin: '2px 0 0', color: '#ff6e40' }}><DualPrice aed={recommendation.negotiationFloor.mrr} ctx={cx} /></p>
          </div>
        </div>
      </div>

      {/* ===== PROFITABILITY TABLE ===== */}
      <div style={card}>
        <h3 style={heading}>Profitability Analysis</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
              {['Option', 'Revenue', 'Direct Costs', 'Shared Costs', 'Gross Profit', 'Margin', 'Verdict'].map((h) => (
                <th key={h} style={{ ...label, padding: '8px 6px', textAlign: h === 'Option' ? 'left' : 'right' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profitability.map((p) => {
              const vc = VERDICT_COLORS[p.verdict] || VERDICT_COLORS.profitable;
              const opt = options[p.optionIndex];
              return (
                <tr key={p.optionIndex} style={{ borderBottom: '1px solid #e0dbd2' }}>
                  <td style={{ padding: '10px 6px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#1a1a1a' }}>
                    {opt?.label || `Option ${p.optionIndex + 1}`}
                  </td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', ...mono, fontSize: 12, color: '#00c853' }}><DualPrice aed={p.revenue} ctx={cx} /></td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', ...mono, fontSize: 12, color: '#ff6e40' }}><DualPrice aed={p.directCosts} ctx={cx} /></td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', ...mono, fontSize: 12, color: '#ff6e40' }}><DualPrice aed={p.sharedCosts} ctx={cx} /></td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', ...mono, fontSize: 12, color: p.grossProfit >= 0 ? '#00c853' : '#ff3d00' }}><DualPrice aed={p.grossProfit} ctx={cx} /></td>
                  <td style={{ padding: '10px 6px', textAlign: 'right', ...mono, fontSize: 12 }}>{p.grossMargin}%</td>
                  <td style={{ padding: '10px 6px', textAlign: 'right' }}>
                    <Badge text={p.verdict.replace('_', ' ')} bg={vc.bg} color={vc.text} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== PORTFOLIO COMPARISON ===== */}
      <div style={card}>
        <h3 style={heading}>Portfolio Comparison</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
          <div style={{ textAlign: 'center', padding: 12, background: '#f5f0e8', borderRadius: 8 }}>
            <span style={label}>Avg MRR/Client</span>
            <p style={{ ...mono, fontSize: 16, margin: '4px 0 0' }}><DualPrice aed={portfolioComparison.avgMRRPerClient} ctx={cx} /></p>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: '#f5f0e8', borderRadius: 8 }}>
            <span style={label}>Avg Seats/Client</span>
            <p style={{ ...mono, fontSize: 16, margin: '4px 0 0' }}>{portfolioComparison.avgSeatsPerClient}</p>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: '#f5f0e8', borderRadius: 8 }}>
            <span style={label}>Prospect vs Avg</span>
            <p style={{ ...mono, fontSize: 16, margin: '4px 0 0', color: portfolioComparison.prospectVsAvg === 'above' ? '#00c853' : portfolioComparison.prospectVsAvg === 'below' ? '#ff6e40' : '#1a1a1a' }}>
              {portfolioComparison.prospectVsAvg.toUpperCase()}
            </p>
          </div>
        </div>
        {portfolioComparison.similarClients.length > 0 && (
          <>
            <span style={{ ...label, display: 'block', marginBottom: 6 }}>Similar Clients</span>
            {portfolioComparison.similarClients.map((c, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 0', borderBottom: i < portfolioComparison.similarClients.length - 1 ? '1px solid #e0dbd2' : 'none',
              }}>
                <div>
                  <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#1a1a1a' }}>{c.name}</span>
                  <Badge text={c.plan} bg="#f5f0e8" color="#666" />
                </div>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ ...mono, fontSize: 12 }}>{c.seats} seats</span>
                  <span style={{ ...mono, fontSize: 12, color: '#00c853' }}><DualPrice aed={c.mrr} ctx={cx} /> MRR</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ===== RISKS ===== */}
      {risks.length > 0 && (
        <div style={card}>
          <h3 style={heading}>Risk Assessment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {risks.map((r, i) => {
              const sc = SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.medium;
              return (
                <div key={i} style={{ padding: 12, borderRadius: 8, background: sc.bg, borderLeft: `4px solid ${sc.border}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Badge text={r.severity} bg={sc.border + '20'} color={sc.text} />
                    <span style={{ fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: '#666', textTransform: 'uppercase' }}>{r.category}</span>
                  </div>
                  <p style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#1a1a1a', margin: '0 0 4px', lineHeight: 1.4 }}>{r.description}</p>
                  <p style={{ fontSize: 11, fontFamily: "'DM Sans', sans-serif", color: '#666', margin: 0, lineHeight: 1.4 }}>
                    <strong>Mitigation:</strong> {r.mitigation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== MARKET CONTEXT ===== */}
      {marketContext.conversionRate && (
        <div style={{ ...card, background: '#f5f0e8' }}>
          <h3 style={{ ...heading, fontSize: 12 }}>Market Context</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div>
              <span style={label}>Currency</span>
              <p style={{ ...mono, fontSize: 14, margin: '2px 0 0' }}>{marketContext.currency}</p>
            </div>
            <div>
              <span style={label}>Rate</span>
              <p style={{ ...mono, fontSize: 14, margin: '2px 0 0' }}>1 AED = {marketContext.conversionRate} {marketContext.currency}</p>
            </div>
          </div>
          <p style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: '#666', marginTop: 8, marginBottom: 0, lineHeight: 1.5 }}>
            {marketContext.marketNotes}
          </p>
        </div>
      )}
    </div>
  );
}
