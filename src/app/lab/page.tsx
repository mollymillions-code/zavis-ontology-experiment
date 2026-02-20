'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PageShell from '@/components/layout/PageShell';
import PricingReportCards from '@/components/lab/PricingReportCards';
import type { PricingReport } from '@/lib/schemas/pricing-report';
import { Loader2, Send, Save, Clock, ChevronDown, ChevronRight } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const LOCATION_CURRENCY: [RegExp, string, number][] = [
  [/india|mumbai|delhi|bangalore|chennai|hyderabad|kolkata|pune|jaipur|lucknow|ahmedabad|indian/i, 'INR', 22.7],
  [/usa|united states|america|new york|california|texas|florida/i, 'USD', 0.27],
  [/uk|united kingdom|london|british|england/i, 'GBP', 0.22],
  [/europe|germany|france|spain|italy|netherlands/i, 'EUR', 0.25],
  [/saudi|riyadh|jeddah|ksa/i, 'SAR', 1.02],
  [/pakistan|karachi|lahore|islamabad/i, 'PKR', 75.6],
  [/bangladesh|dhaka/i, 'BDT', 29.9],
  [/egypt|cairo/i, 'EGP', 13.4],
  [/qatar|doha/i, 'QAR', 0.99],
  [/bahrain|manama/i, 'BHD', 0.10],
  [/oman|muscat/i, 'OMR', 0.10],
  [/kuwait/i, 'KWD', 0.08],
  [/sri lanka|colombo/i, 'LKR', 81.5],
];

/** Ensure report has currency set based on prospect location */
function ensureCurrency(report: PricingReport): PricingReport {
  if (report.marketContext.conversionRate && report.marketContext.currency !== 'AED') return report;
  const loc = `${report.prospect.location} ${report.prospect.name}`;
  for (const [pattern, currency, rate] of LOCATION_CURRENCY) {
    if (pattern.test(loc)) {
      return {
        ...report,
        marketContext: { ...report.marketContext, currency, conversionRate: rate },
        options: report.options.map((o) => ({
          ...o,
          perSeatPriceLocal: o.perSeatPriceLocal || Math.round(o.perSeatPrice * rate),
        })),
      };
    }
  }
  return report;
}

interface SavedReport {
  id: string;
  prospectName: string;
  createdAt: string;
  report: PricingReport;
  conversation: ChatMessage[];
}

export default function PricingLabPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [prospectUrl, setProspectUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PricingReport | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch saved reports
  useEffect(() => {
    fetch('/api/pricing-reports')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSavedReports(data); })
      .catch(() => {});
  }, []);

  // Auto-scroll chat
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setReport(null);

    try {
      const res = await fetch('/api/pricing-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          prospectUrl: prospectUrl.trim() || undefined,
          history: messages,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Server returned unexpected response (${res.status}). Please try again.`);
      }

      const data = await res.json();

      if (!res.ok) {
        const errMsg: ChatMessage = { role: 'model', text: data.error || 'Analysis failed. Please try again.' };
        setMessages([...updated, errMsg]);
        return;
      }

      const result: PricingReport = data.result;

      if (result.clarificationNeeded && result.clarificationQuestion) {
        const clarMsg: ChatMessage = { role: 'model', text: result.clarificationQuestion };
        setMessages([...updated, clarMsg]);
      } else {
        const aiMsg: ChatMessage = { role: 'model', text: `Analysis complete for ${result.prospect.name}. See the report on the right.` };
        setMessages([...updated, aiMsg]);
        setReport(ensureCurrency(result));
      }
    } catch (err) {
      const errMsg: ChatMessage = { role: 'model', text: err instanceof Error ? err.message : 'Failed to connect. Please try again.' };
      setMessages([...updated, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, prospectUrl]);

  const handleSave = useCallback(async () => {
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch('/api/pricing-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectName: report.prospect.name,
          report,
          conversation: messages,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedReports((prev) => [{
          id: data.id,
          prospectName: report.prospect.name,
          createdAt: new Date().toISOString(),
          report,
          conversation: messages,
        }, ...prev]);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }, [report, messages]);

  function loadReport(saved: SavedReport) {
    setReport(ensureCurrency(saved.report));
    setMessages(saved.conversation || []);
  }

  function startNew() {
    setReport(null);
    setMessages([]);
    setInput('');
    setProspectUrl('');
    inputRef.current?.focus();
  }

  return (
    <PageShell
      title="Pricing Lab"
      subtitle="AI-powered pricing analyst — describe a prospect, get a full pricing recommendation"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          {report && (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: 'none',
                background: '#00c853', color: '#1a1a1a',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Report
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={startNew}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'transparent', color: '#ffffff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              New Analysis
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, minHeight: 'calc(100vh - 140px)' }}>
        {/* ===== LEFT PANEL: CHAT ===== */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* URL input */}
          <input
            type="url"
            value={prospectUrl}
            onChange={(e) => setProspectUrl(e.target.value)}
            placeholder="Prospect website URL (optional)"
            style={{
              padding: '8px 12px', borderRadius: 8,
              border: '1px solid #e0dbd2', background: '#ffffff',
              fontSize: 11, fontFamily: "'DM Sans', sans-serif",
              color: '#1a1a1a', outline: 'none',
            }}
          />

          {/* Chat messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
              gap: 8, maxHeight: 'calc(100vh - 360px)', minHeight: 200,
              padding: 4,
            }}
          >
            {messages.length === 0 && (
              <div style={{
                textAlign: 'center', padding: '32px 16px', color: '#999',
                fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.8,
              }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>
                  Describe a prospect to get started
                </p>
                <p style={{ color: '#999', margin: '4px 0', cursor: 'pointer' }} onClick={() => setInput('Dental clinic chain in Mumbai with 8 branches, about 40 staff, currently using paper records')}>
                  &quot;Dental clinic chain in Mumbai, 8 branches&quot;
                </p>
                <p style={{ color: '#999', margin: '4px 0', cursor: 'pointer' }} onClick={() => setInput('Hospital group in Dubai with 200 beds, looking for EMR + AI automation')}>
                  &quot;Hospital group in Dubai, 200 beds&quot;
                </p>
                <p style={{ color: '#999', margin: '4px 0', cursor: 'pointer' }} onClick={() => setInput('Solo dermatology practice in Abu Dhabi, 2 doctors, wants online booking and WhatsApp integration')}>
                  &quot;Solo dermatology practice, 2 doctors&quot;
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '90%', padding: '8px 12px', borderRadius: 10,
                  background: msg.role === 'user' ? '#1a1a1a' : '#ffffff',
                  color: msg.role === 'user' ? '#ffffff' : '#1a1a1a',
                  border: msg.role === 'model' ? '1px solid #e0dbd2' : 'none',
                  fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.5, whiteSpace: 'pre-wrap',
                }}
              >
                {msg.text}
              </div>
            ))}

            {loading && (
              <div style={{
                alignSelf: 'flex-start', padding: '8px 12px', borderRadius: 10,
                background: '#ffffff', border: '1px solid #e0dbd2',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif",
              }}>
                <Loader2 size={14} className="animate-spin" /> Analyzing prospect...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Describe the prospect..."
              disabled={loading}
              style={{
                flex: 1, padding: '10px 12px', borderRadius: 8,
                border: '1px solid #e0dbd2', background: '#ffffff',
                fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                color: '#1a1a1a', outline: 'none',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              style={{
                padding: '10px 14px', borderRadius: 8, border: 'none',
                background: input.trim() && !loading ? '#1a1a1a' : '#e0dbd2',
                color: input.trim() && !loading ? '#ffffff' : '#999',
                cursor: input.trim() && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Send size={14} />
            </button>
          </div>

          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <div style={{
              background: '#ffffff', borderRadius: 10, border: '1px solid #e0dbd2',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setShowSaved(!showSaved)}
                style={{
                  width: '100%', padding: '10px 12px', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                  color: '#666',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={12} /> Saved Reports ({savedReports.length})
                </span>
                {showSaved ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {showSaved && (
                <div style={{ borderTop: '1px solid #e0dbd2', maxHeight: 200, overflowY: 'auto' }}>
                  {savedReports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => loadReport(r)}
                      style={{
                        width: '100%', padding: '8px 12px', border: 'none',
                        borderBottom: '1px solid #e0dbd2', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{r.prospectName}</div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 2 }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ===== RIGHT PANEL: REPORT ===== */}
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 140px)' }}>
          {report ? (
            <PricingReportCards report={report} />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', minHeight: 400,
            }}>
              <div style={{
                textAlign: 'center', padding: 40,
                background: '#ffffff', borderRadius: 16,
                border: '1px solid #e0dbd2', maxWidth: 400,
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16, background: '#00c853',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', fontSize: 28, fontWeight: 900,
                  fontFamily: 'monospace', color: '#1a1a1a',
                }}>
                  Z
                </div>
                <h3 style={{
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                  fontSize: 18, color: '#1a1a1a', marginBottom: 8,
                }}>
                  Pricing Analyst
                </h3>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  color: '#666', lineHeight: 1.6, marginBottom: 0,
                }}>
                  Describe a prospect in the chat panel and get a full pricing recommendation with 3 options, profitability analysis, and portfolio comparison.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
