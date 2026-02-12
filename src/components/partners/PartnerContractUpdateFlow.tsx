'use client';

import { useState, useRef, useCallback } from 'react';
import type { PartnerExtraction } from '@/lib/schemas/partner-extraction';
import type { SalesPartnerInfo } from '@/lib/config/sales-partners';
import { Upload, FileText, Loader2, ArrowRight, RefreshCw, FolderOpen } from 'lucide-react';
import PartnerAnalysisCard from './PartnerAnalysisCard';

type Step = 'upload' | 'review';

interface PartnerContractUpdateFlowProps {
  partner: SalesPartnerInfo;
  onUpdatePartner: (partner: SalesPartnerInfo) => void;
}

interface ComparisonField {
  label: string;
  current: string | number | null;
  extracted: string | number | null;
  changed: boolean;
}

export default function PartnerContractUpdateFlow({
  partner,
  onUpdatePartner,
}: PartnerContractUpdateFlowProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<PartnerExtraction | null>(null);
  const [usage, setUsage] = useState<{ inputTokens: number; outputTokens: number; estimatedCostUSD: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setExtraction(data.extraction as PartnerExtraction);
      setUsage(data.usage);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract agreement');
    } finally {
      setLoading(false);
    }
  }

  function buildUpdatedPartner(): SalesPartnerInfo {
    if (!extraction) return partner;
    const ext = extraction.partner;
    return {
      ...partner,
      commissionPercentage: ext.commissionPercentage,
      oneTimeCommissionPercentage: ext.oneTimeCommissionPercentage,
    };
  }

  async function uploadToS3() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'partner');
    formData.append('entityId', partner.id);
    formData.append('documentType', 'partnership_agreement');
    if (extraction) {
      formData.append('extractionData', JSON.stringify(extraction));
    }
    await fetch('/api/documents', { method: 'POST', body: formData });
  }

  async function handleUpdateAndUpload() {
    setSaving(true);
    try {
      await uploadToS3();
      const updated = buildUpdatedPartner();
      onUpdatePartner(updated);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleJustUpload() {
    setSaving(true);
    try {
      await uploadToS3();
      setStep('upload');
      setFile(null);
      setExtraction(null);
      alert('Document uploaded successfully. No partner details were changed.');
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setSaving(false);
    }
  }

  function getComparison(): ComparisonField[] {
    if (!extraction) return [];
    const ext = extraction.partner;
    return [
      { label: 'Partner Name', current: partner.name, extracted: ext.name, changed: partner.name !== ext.name },
      { label: 'MRR Commission %', current: `${partner.commissionPercentage}%`, extracted: `${ext.commissionPercentage}%`, changed: partner.commissionPercentage !== ext.commissionPercentage },
      { label: 'One-Time Commission %', current: `${partner.oneTimeCommissionPercentage}%`, extracted: `${ext.oneTimeCommissionPercentage}%`, changed: partner.oneTimeCommissionPercentage !== ext.oneTimeCommissionPercentage },
      { label: 'Effective Date', current: partner.joinedDate, extracted: ext.effectiveDate, changed: partner.joinedDate !== ext.effectiveDate },
      { label: 'Territory', current: '—', extracted: ext.territory || '—', changed: !!ext.territory },
      { label: 'Exclusivity', current: 'No', extracted: ext.exclusivity ? 'Yes' : 'No', changed: ext.exclusivity },
    ];
  }

  // ===== UPLOAD STEP =====
  if (step === 'upload') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          padding: 12, borderRadius: 8,
          background: '#f5f0e8', border: '1px solid #e0dbd2',
          fontSize: 12, color: '#666', fontFamily: "'DM Sans', sans-serif",
          lineHeight: 1.5,
        }}>
          Upload a new agreement for <strong style={{ color: '#1a1a1a' }}>{partner.name}</strong>.
          The AI will extract the details and you can choose to update the partner record or just store the document.
        </div>

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
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileSelect} style={{ display: 'none' }} />
          {file ? (
            <>
              <FileText size={32} style={{ color: '#00c853', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", margin: '0 0 4px 0' }}>{file.name}</p>
              <p style={{ fontSize: 11, color: '#666', fontFamily: "'Space Mono', monospace", margin: 0 }}>{(file.size / 1024).toFixed(0)} KB</p>
            </>
          ) : (
            <>
              <Upload size={32} style={{ color: '#999', marginBottom: 8 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", margin: '0 0 4px 0' }}>Drop updated agreement PDF here</p>
              <p style={{ fontSize: 11, color: '#999', fontFamily: "'DM Sans', sans-serif", margin: 0 }}>or click to browse (max 10MB)</p>
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
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: file && !loading ? '#00c853' : '#e0dbd2',
            color: file && !loading ? '#1a1a1a' : '#999',
            fontSize: 13, fontWeight: 700,
            cursor: file && !loading ? 'pointer' : 'default',
            fontFamily: "'DM Sans', sans-serif",
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading ? (
            <><Loader2 size={16} className="animate-spin" /> Analyzing agreement...</>
          ) : (
            <><ArrowRight size={16} /> Extract & Compare</>
          )}
        </button>
      </div>
    );
  }

  // ===== REVIEW STEP =====
  if (step === 'review' && extraction) {
    const comparison = getComparison();
    const changedCount = comparison.filter((f) => f.changed).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          padding: 12, borderRadius: 8,
          background: changedCount > 0 ? '#fff8e1' : '#f0faf0',
          border: `1px solid ${changedCount > 0 ? '#ffe082' : '#c8e6c9'}`,
          fontSize: 12, fontFamily: "'DM Sans', sans-serif",
          color: changedCount > 0 ? '#f57f17' : '#00a844',
          fontWeight: 600,
        }}>
          {changedCount > 0
            ? `${changedCount} field${changedCount > 1 ? 's' : ''} differ from current record`
            : 'No differences found — agreement matches current data'}
        </div>

        {/* Comparison Table */}
        <div style={{ background: '#ffffff', borderRadius: 10, padding: 16, border: '1px solid #e0dbd2' }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
            Current vs New Agreement
          </h4>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Field</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Current</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>New Agreement</th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((field) => (
                <tr key={field.label} style={{
                  borderBottom: '1px solid #e0dbd2',
                  background: field.changed ? '#fffde7' : 'transparent',
                }}>
                  <td style={{ padding: '8px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: '#666' }}>
                    {field.label}
                    {field.changed && <span style={{ marginLeft: 6, fontSize: 9, color: '#f57f17', fontWeight: 700 }}>CHANGED</span>}
                  </td>
                  <td style={{
                    padding: '8px', textAlign: 'right',
                    fontFamily: "'Space Mono', monospace", fontWeight: 600,
                    color: field.changed ? '#999' : '#1a1a1a',
                    textDecoration: field.changed ? 'line-through' : 'none',
                  }}>
                    {String(field.current)}
                  </td>
                  <td style={{
                    padding: '8px', textAlign: 'right',
                    fontFamily: "'Space Mono', monospace", fontWeight: 700,
                    color: field.changed ? '#00a844' : '#1a1a1a',
                  }}>
                    {String(field.extracted)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Analysis */}
        <PartnerAnalysisCard analysis={extraction.analysis} />

        {/* Usage */}
        {usage && (
          <p style={{ fontSize: 10, color: '#999', fontFamily: "'Space Mono', monospace", textAlign: 'center', margin: 0 }}>
            Tokens: {usage.inputTokens.toLocaleString()} in / {usage.outputTokens.toLocaleString()} out | Cost: ${usage.estimatedCostUSD}
          </p>
        )}

        {/* Action Choice */}
        <div style={{
          padding: 16, borderRadius: 10,
          background: '#f5f0e8', border: '1px solid #e0dbd2',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", margin: '0 0 12px 0' }}>
            What would you like to do?
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {changedCount > 0 && (
              <button
                onClick={handleUpdateAndUpload}
                disabled={saving}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                  background: '#00c853', color: '#1a1a1a', fontSize: 13, fontWeight: 700,
                  cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Update Partner Details & Store Document
              </button>
            )}

            <button
              onClick={handleJustUpload}
              disabled={saving}
              style={{
                width: '100%', padding: '12px', borderRadius: 8,
                border: '1px solid #e0dbd2',
                background: '#ffffff', color: '#666', fontSize: 13, fontWeight: 600,
                cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <FolderOpen size={16} />}
              Just Upload Document (No Changes)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
