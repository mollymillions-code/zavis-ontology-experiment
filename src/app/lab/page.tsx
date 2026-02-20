'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PageShell from '@/components/layout/PageShell';
import PricingReportCards from '@/components/lab/PricingReportCards';
import type { PricingReport } from '@/lib/schemas/pricing-report';
import { Loader2, Send, Save, Clock, ChevronDown, ChevronRight, Paperclip, FileText, X } from 'lucide-react';

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

const ACCEPTED_TYPES = '.pdf,.csv,.xlsx,.xls,.txt,.doc,.docx';

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
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PricingReport | null>(null);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/pricing-reports')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSavedReports(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function addFiles(newFiles: FileList | File[]) {
    const arr = Array.from(newFiles).filter((f) => f.size <= 10 * 1024 * 1024);
    setFiles((prev) => [...prev, ...arr]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && files.length === 0) || loading) return;

    const fileNames = files.map((f) => f.name).join(', ');
    const displayText = fileNames ? `${text || 'Analyze attached files'}\n📎 ${fileNames}` : text;
    const userMsg: ChatMessage = { role: 'user', text: displayText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);
    setReport(null);

    try {
      let res: Response;

      if (files.length > 0) {
        // Send as FormData with files
        const formData = new FormData();
        formData.append('message', text || 'Analyze the attached documents and recommend pricing.');
        if (prospectUrl.trim()) formData.append('prospectUrl', prospectUrl.trim());
        formData.append('history', JSON.stringify(messages));
        for (const f of files) {
          formData.append('file', f);
        }
        res = await fetch('/api/pricing-lab', { method: 'POST', body: formData });
      } else {
        res = await fetch('/api/pricing-lab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            prospectUrl: prospectUrl.trim() || undefined,
            history: messages,
          }),
        });
      }

      setFiles([]);

      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
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
        setMessages([...updated, { role: 'model', text: result.clarificationQuestion }]);
      } else {
        setMessages([...updated, { role: 'model', text: `Analysis complete for ${result.prospect.name}.` }]);
        setReport(ensureCurrency(result));
      }
    } catch (err) {
      setMessages([...updated, { role: 'model', text: err instanceof Error ? err.message : 'Failed to connect.' }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, prospectUrl, files]);

  const handleSave = useCallback(async () => {
    if (!report) return;
    setSaving(true);
    try {
      const res = await fetch('/api/pricing-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectName: report.prospect.name, report, conversation: messages }),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedReports((prev) => [{ id: data.id, prospectName: report.prospect.name, createdAt: new Date().toISOString(), report, conversation: messages }, ...prev]);
      }
    } catch { /* silent */ } finally { setSaving(false); }
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
    setFiles([]);
    inputRef.current?.focus();
  }

  const hasInput = input.trim() || files.length > 0;

  return (
    <PageShell
      title="Pricing Lab"
      subtitle="AI-powered pricing analyst"
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          {report && (
            <button onClick={handleSave} disabled={saving} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              borderRadius: 8, border: 'none', background: '#00c853', color: '#1a1a1a',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Report
            </button>
          )}
          {messages.length > 0 && (
            <button onClick={startNew} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#ffffff', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}>
              New Analysis
            </button>
          )}
        </div>
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 20, minHeight: 'calc(100vh - 140px)' }}>
        {/* ===== LEFT PANEL ===== */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          background: '#ffffff', borderRadius: 12, border: '1px solid #e0dbd2',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px', borderBottom: '1px solid #e0dbd2',
            background: '#1a1a1a',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', fontFamily: "'DM Sans', sans-serif" }}>
              Prospect Analysis
            </div>
            <div style={{ fontSize: 11, color: '#999', fontFamily: "'DM Sans', sans-serif", marginTop: 2 }}>
              Describe the prospect, attach files, or paste a URL
            </div>
          </div>

          {/* URL field */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0ebe0' }}>
            <input
              type="url"
              value={prospectUrl}
              onChange={(e) => setProspectUrl(e.target.value)}
              placeholder="Website URL (optional)"
              style={{
                width: '100%', padding: '7px 10px', borderRadius: 6,
                border: '1px solid #e0dbd2', background: '#faf8f4',
                fontSize: 11, fontFamily: "'DM Sans', sans-serif",
                color: '#1a1a1a', outline: 'none',
              }}
            />
          </div>

          {/* Chat messages */}
          <div
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '12px 16px',
              display: 'flex', flexDirection: 'column', gap: 8,
              minHeight: 180,
            }}
          >
            {messages.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
                  Try one of these
                </p>
                {[
                  'Dental clinic chain in Mumbai, 8 branches',
                  'Hospital group in Dubai, 200 beds',
                  'Solo dermatology practice, 2 doctors',
                ].map((s) => (
                  <p
                    key={s}
                    onClick={() => setInput(s)}
                    style={{
                      margin: '6px 0', padding: '8px 12px', borderRadius: 8,
                      background: '#faf8f4', border: '1px solid #e0dbd2',
                      fontSize: 11, color: '#666', fontFamily: "'DM Sans', sans-serif",
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    {s}
                  </p>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%', padding: '8px 12px', borderRadius: 10,
                  background: msg.role === 'user' ? '#1a1a1a' : '#faf8f4',
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
                background: '#faf8f4', border: '1px solid #e0dbd2',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif",
              }}>
                <Loader2 size={14} className="animate-spin" /> Analyzing...
              </div>
            )}
          </div>

          {/* File chips */}
          {files.length > 0 && (
            <div style={{ padding: '6px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid #f0ebe0' }}>
              {files.map((f, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 6, fontSize: 10, fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif", background: '#f0faf0',
                  border: '1px solid #c8e6c9', color: '#1a1a1a',
                }}>
                  <FileText size={10} /> {f.name} ({(f.size / 1024).toFixed(0)}KB)
                  <button onClick={() => removeFile(i)} style={{
                    border: 'none', background: 'none', cursor: 'pointer', padding: 0,
                    color: '#999', display: 'flex',
                  }}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: '10px 16px', borderTop: '1px solid #e0dbd2',
            display: 'flex', gap: 6, alignItems: 'flex-end',
          }}>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
              style={{ display: 'none' }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              title="Attach PDF, Excel, or CSV"
              style={{
                padding: '8px', borderRadius: 6, border: '1px solid #e0dbd2',
                background: '#faf8f4', cursor: 'pointer', display: 'flex',
                color: '#666',
              }}
            >
              <Paperclip size={14} />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Describe the prospect..."
              disabled={loading}
              rows={1}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 6, resize: 'none',
                border: '1px solid #e0dbd2', background: '#faf8f4',
                fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                color: '#1a1a1a', outline: 'none', minHeight: 36, maxHeight: 80,
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 80) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!hasInput || loading}
              style={{
                padding: '8px 12px', borderRadius: 6, border: 'none',
                background: hasInput && !loading ? '#1a1a1a' : '#e0dbd2',
                color: hasInput && !loading ? '#ffffff' : '#999',
                cursor: hasInput && !loading ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Send size={14} />
            </button>
          </div>

          {/* Saved Reports */}
          {savedReports.length > 0 && (
            <div style={{ borderTop: '1px solid #e0dbd2' }}>
              <button
                onClick={() => setShowSaved(!showSaved)}
                style={{
                  width: '100%', padding: '10px 16px', border: 'none',
                  background: '#faf8f4', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#666',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={11} /> Saved Reports ({savedReports.length})
                </span>
                {showSaved ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {showSaved && (
                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                  {savedReports.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => loadReport(r)}
                      style={{
                        width: '100%', padding: '8px 16px', border: 'none',
                        borderTop: '1px solid #f0ebe0', background: 'transparent',
                        cursor: 'pointer', textAlign: 'left',
                        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{r.prospectName}</div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 1 }}>
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
                  Describe a prospect, attach documents, or paste a website URL to get a full pricing recommendation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}
