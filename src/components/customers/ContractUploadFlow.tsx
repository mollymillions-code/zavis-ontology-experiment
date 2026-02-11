'use client';

import { useState, useRef, useCallback } from 'react';
import type { ContractExtraction, ExtractedRevenueStream } from '@/lib/schemas/contract-extraction';
import type { Client } from '@/lib/models/platform-types';
import { ZAVIS_PLANS } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import DealAnalysisCard from './DealAnalysisCard';
import { Upload, FileText, Loader2, ArrowRight, Pencil, FlaskConical } from 'lucide-react';

type Step = 'upload' | 'review' | 'confirm';

interface ContractUploadFlowProps {
  onCreateClient: (client: Client) => void;
  onSwitchToManual: (prefill: Partial<Client>) => void;
  onSendToLab?: (extraction: ContractExtraction) => void;
}

const STREAM_TYPE_LABELS: Record<string, string> = {
  subscription: 'Subscription',
  one_time: 'One-Time',
  add_on: 'Add-On',
  managed_service: 'Managed Service',
};

const FREQ_LABELS: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
  one_time: 'One-Time',
};

const labelStyle = {
  fontSize: 11,
  fontWeight: 500 as const,
  color: '#666',
  fontFamily: "'DM Sans', sans-serif",
  marginBottom: 4,
  display: 'block' as const,
};

const inputStyle = {
  width: '100%',
  padding: '7px 10px',
  borderRadius: 6,
  border: '1px solid #e0dbd2',
  fontSize: 12,
  fontFamily: "'DM Sans', sans-serif",
  color: '#1a1a1a',
  background: '#ffffff',
  outline: 'none',
};

const monoStyle = {
  ...inputStyle,
  fontFamily: "'Space Mono', monospace",
  fontWeight: 700 as const,
};

export default function ContractUploadFlow({
  onCreateClient,
  onSwitchToManual,
  onSendToLab,
}: ContractUploadFlowProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ContractExtraction | null>(null);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number; estimatedCostUSD: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable fields from extraction
  const [editName, setEditName] = useState('');
  const [editMrr, setEditMrr] = useState(0);
  const [editOneTime, setEditOneTime] = useState(0);
  const [editSeats, setEditSeats] = useState<number | null>(null);
  const [editPerSeat, setEditPerSeat] = useState<number | null>(null);
  const [editPartner, setEditPartner] = useState('');
  const [editBilling, setEditBilling] = useState('Monthly');

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      setError(null);
    } else {
      setError('Only PDF files are accepted');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError(null);
    }
  }, []);

  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('contract', file);

      const res = await fetch('/api/extract-contract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      const ext = data.extraction as ContractExtraction;
      setExtraction(ext);
      setUsage(data.usage);

      // Populate editable fields
      setEditName(ext.customer.name);
      setEditMrr(ext.customer.mrr);
      setEditOneTime(ext.customer.oneTimeRevenue);
      setEditSeats(ext.customer.seatCount);
      setEditPerSeat(ext.customer.perSeatCost);
      setEditPartner(ext.partner.partnerName || '');
      setEditBilling(ext.customer.billingCycle);

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract contract');
    } finally {
      setLoading(false);
    }
  }

  function buildClientFromExtraction(): Client {
    const now = new Date().toISOString();
    const pm = extraction!.customer.pricingModel;
    const plan = pm === 'per_seat'
      ? ZAVIS_PLANS.find((p) => p.pricingModel === 'per_seat' && p.suggestedPerSeat && Math.abs(p.suggestedPerSeat - (editPerSeat || 0)) < 30)?.name || 'Custom'
      : pm === 'one_time_only' ? 'One-Time Only' : 'Custom';

    return {
      id: `cli-${Date.now()}`,
      name: editName,
      salesPartner: editPartner || null,
      status: 'active',
      pricingModel: pm,
      perSeatCost: editPerSeat,
      seatCount: editSeats,
      billingCycle: editBilling,
      plan,
      discount: extraction!.customer.discount || 0,
      mrr: editMrr,
      oneTimeRevenue: editOneTime,
      annualRunRate: editMrr * 12 + editOneTime,
      onboardingDate: extraction!.contract.startDate || null,
      notes: `Extracted from contract PDF. ${extraction!.analysis.summary}`,
      createdAt: now,
      updatedAt: now,
    };
  }

  async function handleCreate() {
    const client = buildClientFromExtraction();

    // Upload PDF to S3 and record in documents table
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', 'client');
        formData.append('entityId', client.id);
        formData.append('documentType', 'contract');
        if (extraction) {
          formData.append('extractionData', JSON.stringify(extraction));
        }
        await fetch('/api/documents', { method: 'POST', body: formData });
      } catch (err) {
        console.error('Failed to upload document to S3:', err);
      }
    }

    onCreateClient(client);
  }

  function handleEditManually() {
    const client = buildClientFromExtraction();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, annualRunRate, ...prefill } = client;
    onSwitchToManual(prefill as Partial<Client>);
  }

  function handleSendToLab() {
    if (extraction && onSendToLab) {
      onSendToLab(extraction);
    }
  }

  // ===== UPLOAD STEP =====
  if (step === 'upload') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${file ? '#00c853' : '#e0dbd2'}`,
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: file ? '#f0faf0' : '#faf8f4',
            transition: 'all 0.2s',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          {file ? (
            <>
              <FileText size={32} style={{ color: '#00c853', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", margin: '0 0 4px 0' }}>
                {file.name}
              </p>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'Space Mono', monospace", margin: 0 }}>
                {(file.size / 1024).toFixed(0)} KB
              </p>
            </>
          ) : (
            <>
              <Upload size={32} style={{ color: '#999', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", margin: '0 0 4px 0' }}>
                Drop contract PDF here
              </p>
              <p style={{ fontSize: 11, color: '#999', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>
                or click to browse (max 10MB)
              </p>
            </>
          )}
        </div>

        {error && (
          <div style={{ padding: 10, borderRadius: 6, background: '#ffebee', border: '1px solid #ef9a9a' }}>
            <p style={{ fontSize: 12, color: '#d32f2f', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Extract Button */}
        <button
          onClick={handleExtract}
          disabled={!file || loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            background: file && !loading ? '#00c853' : '#e0dbd2',
            color: file && !loading ? '#1a1a1a' : '#999',
            fontSize: 13,
            fontWeight: 700,
            cursor: file && !loading ? 'pointer' : 'default',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Analyzing contract...
            </>
          ) : (
            <>
              <ArrowRight size={16} />
              Extract & Analyze
            </>
          )}
        </button>

        <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', margin: 0 }}>
          Uses Gemini AI to extract structured data. Estimated cost: ~$0.001 per document.
        </p>
      </div>
    );
  }

  // ===== REVIEW STEP =====
  if (step === 'review' && extraction) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Extracted Fields (editable) */}
        <div style={{
          background: '#ffffff', borderRadius: 10, padding: 16,
          border: '1px solid #e0dbd2',
        }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
            Extracted Client Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Client Name</label>
              <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Sales Partner</label>
              <input style={inputStyle} value={editPartner} onChange={(e) => setEditPartner(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Pricing Model</label>
              <input style={inputStyle} value={extraction.customer.pricingModel.replace('_', ' ')} disabled />
            </div>
            <div>
              <label style={labelStyle}>Billing Cycle</label>
              <select style={inputStyle} value={editBilling} onChange={(e) => setEditBilling(e.target.value)}>
                {['Monthly', 'Quarterly', 'Half Yearly', 'Annual', 'One Time'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {editPerSeat !== null && (
              <div>
                <label style={labelStyle}>Per Seat Cost (AED)</label>
                <input style={monoStyle} type="number" value={editPerSeat} onChange={(e) => setEditPerSeat(Number(e.target.value))} />
              </div>
            )}
            {editSeats !== null && (
              <div>
                <label style={labelStyle}>Seat Count</label>
                <input style={monoStyle} type="number" value={editSeats} onChange={(e) => setEditSeats(Number(e.target.value))} />
              </div>
            )}
            <div>
              <label style={labelStyle}>MRR (AED)</label>
              <input style={{ ...monoStyle, background: '#f0faf0', color: '#00a844' }} type="number" value={editMrr} onChange={(e) => setEditMrr(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>One-Time Revenue (AED)</label>
              <input style={monoStyle} type="number" value={editOneTime} onChange={(e) => setEditOneTime(Number(e.target.value))} />
            </div>
          </div>

          {/* Contract Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
            <div>
              <label style={labelStyle}>Start Date</label>
              <input style={inputStyle} value={extraction.contract.startDate} disabled />
            </div>
            <div>
              <label style={labelStyle}>End Date</label>
              <input style={inputStyle} value={extraction.contract.endDate || 'Open-ended'} disabled />
            </div>
          </div>
        </div>

        {/* Revenue Streams Table */}
        <div style={{
          background: '#ffffff', borderRadius: 10, padding: 16,
          border: '1px solid #e0dbd2',
        }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 10 }}>
            Revenue Streams ({extraction.revenueStreams.length})
          </h4>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                {['Type', 'Description', 'Amount', 'Frequency'].map((h) => (
                  <th key={h} style={{
                    padding: '6px 8px', textAlign: h === 'Amount' ? 'right' : 'left',
                    fontWeight: 600, color: '#666', fontSize: 10,
                    textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {extraction.revenueStreams.map((stream: ExtractedRevenueStream, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #e0dbd2' }}>
                  <td style={{ padding: '6px 8px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, color: '#1a1a1a' }}>
                    {STREAM_TYPE_LABELS[stream.type] || stream.type}
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: "'DM Sans', sans-serif", color: '#666', fontSize: 10 }}>
                    {stream.description}
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: "'Space Mono', monospace", fontWeight: 700, color: '#1a1a1a' }}>
                    {formatAED(stream.amount)}
                  </td>
                  <td style={{ padding: '6px 8px', fontFamily: "'DM Sans', sans-serif", color: '#666' }}>
                    {FREQ_LABELS[stream.frequency] || stream.frequency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Deal Analysis */}
        <DealAnalysisCard analysis={extraction.analysis} />

        {/* Usage info */}
        {usage && (
          <p style={{ fontSize: 10, color: '#999', fontFamily: "'Space Mono', monospace", textAlign: 'center', margin: 0 }}>
            Tokens: {usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()} out | Cost: ${usage.estimatedCostUSD}
          </p>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 8, borderTop: '1px solid #e0dbd2' }}>
          <button
            onClick={handleCreate}
            style={{
              width: '100%', padding: '12px', borderRadius: 8, border: 'none',
              background: '#00c853', color: '#1a1a1a', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <ArrowRight size={16} />
            Create Client from Contract
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={handleEditManually}
              style={{
                padding: '10px', borderRadius: 8, border: '1px solid #e0dbd2',
                background: '#ffffff', color: '#666', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Pencil size={14} />
              Edit Manually
            </button>

            {onSendToLab && (
              <button
                onClick={handleSendToLab}
                style={{
                  padding: '10px', borderRadius: 8, border: '1px solid #a78bfa',
                  background: '#f3f0ff', color: '#7c3aed', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <FlaskConical size={14} />
                Send to Lab
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
