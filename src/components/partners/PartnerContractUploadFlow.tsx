'use client';

import { useState, useRef, useCallback } from 'react';
import type { PartnerExtraction } from '@/lib/schemas/partner-extraction';
import type { SalesPartnerInfo } from '@/lib/config/sales-partners';
import { Upload, FileText, Loader2, ArrowRight, Pencil } from 'lucide-react';
import PartnerAnalysisCard from './PartnerAnalysisCard';

type Step = 'upload' | 'review';

interface PartnerContractUploadFlowProps {
  onCreatePartner: (partner: SalesPartnerInfo) => void;
  onSwitchToManual: (prefill: Partial<SalesPartnerInfo>) => void;
}

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

export default function PartnerContractUploadFlow({
  onCreatePartner,
  onSwitchToManual,
}: PartnerContractUploadFlowProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<PartnerExtraction | null>(null);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number; estimatedCostUSD: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editMrrPct, setEditMrrPct] = useState(10);
  const [editOneTimePct, setEditOneTimePct] = useState(15);
  const [editJoinedDate, setEditJoinedDate] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

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

      const res = await fetch('/api/extract-partner-contract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Extraction failed');
      }

      const ext = data.extraction as PartnerExtraction;
      setExtraction(ext);
      setUsage(data.usage);

      // Populate editable fields
      setEditName(ext.partner.name);
      setEditMrrPct(ext.partner.commissionPercentage);
      setEditOneTimePct(ext.partner.oneTimeCommissionPercentage);
      setEditJoinedDate(ext.partner.effectiveDate);
      setEditIsActive(true);

      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract partner agreement');
    } finally {
      setLoading(false);
    }
  }

  function buildPartnerFromExtraction(): SalesPartnerInfo {
    return {
      id: editName.toLowerCase().replace(/\s+/g, '-'),
      name: editName,
      joinedDate: editJoinedDate,
      commissionPercentage: editMrrPct,
      oneTimeCommissionPercentage: editOneTimePct,
      totalPaid: 0,
      isActive: editIsActive,
    };
  }

  async function handleCreate() {
    const partner = buildPartnerFromExtraction();

    // Upload PDF to S3
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('entityType', 'partner');
        formData.append('entityId', partner.id);
        formData.append('documentType', 'partnership_agreement');
        if (extraction) {
          formData.append('extractionData', JSON.stringify(extraction));
        }
        await fetch('/api/documents', { method: 'POST', body: formData });
      } catch (err) {
        console.error('Failed to upload document to S3:', err);
      }
    }

    onCreatePartner(partner);
  }

  function handleEditManually() {
    const partner = buildPartnerFromExtraction();
    onSwitchToManual(partner);
  }

  // ===== UPLOAD STEP =====
  if (step === 'upload') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                Drop partner agreement PDF here
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
              Analyzing agreement...
            </>
          ) : (
            <>
              <ArrowRight size={16} />
              Extract & Analyze
            </>
          )}
        </button>

        <p style={{ fontSize: 10, color: '#999', fontFamily: "'DM Sans', sans-serif", textAlign: 'center', margin: 0 }}>
          Uses Gemini AI to extract partner details. Estimated cost: ~$0.001 per document.
        </p>
      </div>
    );
  }

  // ===== REVIEW STEP =====
  if (step === 'review' && extraction) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Extracted Fields */}
        <div style={{ background: '#ffffff', borderRadius: 10, padding: 16, border: '1px solid #e0dbd2' }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
            Extracted Partner Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Partner Name</label>
              <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>MRR Commission (%)</label>
              <input style={monoStyle} type="number" min={0} max={100} step={0.5} value={editMrrPct} onChange={(e) => setEditMrrPct(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>One-Time Commission (%)</label>
              <input style={monoStyle} type="number" min={0} max={100} step={0.5} value={editOneTimePct} onChange={(e) => setEditOneTimePct(Number(e.target.value))} />
            </div>
            <div>
              <label style={labelStyle}>Effective Date</label>
              <input style={inputStyle} type="date" value={editJoinedDate} onChange={(e) => setEditJoinedDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={editIsActive ? 'active' : 'inactive'} onChange={(e) => setEditIsActive(e.target.value === 'active')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Agreement details */}
          {(extraction.partner.territory || extraction.partner.paymentTerms) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              {extraction.partner.territory && (
                <div>
                  <label style={labelStyle}>Territory</label>
                  <input style={inputStyle} value={extraction.partner.territory} disabled />
                </div>
              )}
              {extraction.partner.paymentTerms && (
                <div>
                  <label style={labelStyle}>Payment Terms</label>
                  <input style={inputStyle} value={extraction.partner.paymentTerms} disabled />
                </div>
              )}
            </div>
          )}

          {extraction.partner.exclusivity && (
            <div style={{
              marginTop: 10, padding: '6px 10px', borderRadius: 6,
              background: '#fff8e1', border: '1px solid #ffe082',
              fontSize: 11, color: '#f57f17', fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Exclusive Partnership
            </div>
          )}
        </div>

        {/* Analysis */}
        <PartnerAnalysisCard analysis={extraction.analysis} />

        {/* Usage */}
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
            Create Partner from Agreement
          </button>

          <button
            onClick={handleEditManually}
            style={{
              width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #e0dbd2',
              background: '#ffffff', color: '#666', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Pencil size={14} />
            Edit Manually
          </button>
        </div>
      </div>
    );
  }

  return null;
}
