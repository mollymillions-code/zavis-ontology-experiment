'use client';

import { useState, useRef, useCallback } from 'react';
import type { ContractExtraction } from '@/lib/schemas/contract-extraction';
import type { Client, Contract } from '@/lib/models/platform-types';
import { generateContractSummary } from '@/lib/utils/contract-summary';
import { ZAVIS_PLANS } from '@/lib/models/platform-types';
import { formatAED } from '@/lib/utils/currency';
import DealAnalysisCard from './DealAnalysisCard';
import { Upload, FileText, Loader2, ArrowRight, RefreshCw, FolderOpen } from 'lucide-react';

type Step = 'upload' | 'review';

interface ContractUpdateFlowProps {
  client: Client;
  onUpdateClient: (client: Client) => void;
  onSendToLab?: (extraction: ContractExtraction) => void;
}

interface ComparisonField {
  label: string;
  current: string | number | null;
  extracted: string | number | null;
  changed: boolean;
}

export default function ContractUpdateFlow({
  client,
  onUpdateClient,
  onSendToLab,
}: ContractUpdateFlowProps) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extraction, setExtraction] = useState<ContractExtraction | null>(null);
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

      // Fetch existing contract summary to enable smart (delta) extraction
      try {
        const contractsRes = await fetch('/api/contracts');
        if (contractsRes.ok) {
          const allContracts: Contract[] = await contractsRes.json();
          const existing = allContracts.find((c) => c.customerId === client.id && c.status === 'active');
          if (existing?.terms && typeof existing.terms === 'object' && 'summary' in existing.terms) {
            formData.append('existingSummary', (existing.terms as { summary: string }).summary);
          }
        }
      } catch {
        // Proceed without existing summary — falls back to full extraction
      }

      const res = await fetch('/api/extract-contract', {
        method: 'POST',
        body: formData,
      });

      // Guard against non-JSON responses (e.g. Vercel timeout HTML pages, auth redirects)
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        if (res.status === 504 || res.status === 408) {
          throw new Error('Extraction timed out — the PDF may be too large. Please try again.');
        }
        throw new Error(`Server returned an unexpected response (${res.status}). Please try again.`);
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');

      setExtraction(data.extraction as ContractExtraction);
      setUsage(data.usage);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract contract');
    } finally {
      setLoading(false);
    }
  }

  function buildUpdatedClient(): Client {
    if (!extraction?.customer) return client;
    const ext = extraction.customer;
    const pm = ext.pricingModel;
    const plan = pm === 'per_seat'
      ? ZAVIS_PLANS.find((p) => p.pricingModel === 'per_seat' && p.suggestedPerSeat && Math.abs(p.suggestedPerSeat - (ext.perSeatCost || 0)) < 30)?.name || 'Custom'
      : pm === 'one_time_only' ? 'One-Time Only' : 'Custom';

    return {
      ...client,
      name: ext.name || client.name,
      pricingModel: pm,
      perSeatCost: ext.perSeatCost ?? client.perSeatCost,
      seatCount: ext.seatCount ?? client.seatCount,
      billingCycle: ext.billingCycle || client.billingCycle,
      plan,
      discount: ext.discount ?? client.discount,
      mrr: ext.mrr,
      oneTimeRevenue: ext.oneTimeRevenue,
      annualRunRate: ext.mrr * 12 + ext.oneTimeRevenue,
      notes: `Updated from contract PDF on ${new Date().toLocaleDateString()}. ${extraction.analysis?.summary || ''}`,
      email: ext.email || client.email,
      phone: ext.phone || client.phone,
      companyLegalName: ext.companyLegalName || client.companyLegalName,
      trn: ext.trn || client.trn,
      billingAddress: ext.billingAddress || client.billingAddress,
      updatedAt: new Date().toISOString(),
    };
  }

  async function uploadToS3() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', 'client');
    formData.append('entityId', client.id);
    formData.append('documentType', 'contract');
    if (extraction) {
      formData.append('extractionData', JSON.stringify(extraction));
    }
    await fetch('/api/documents', { method: 'POST', body: formData });
  }

  async function handleUpdateAndUpload() {
    setSaving(true);
    try {
      await uploadToS3();

      // Regenerate MD summary and update/create contract record
      if (extraction) {
        try {
          const summary = generateContractSummary(extraction);
          // Fetch existing contracts for this customer
          const contractsRes = await fetch('/api/contracts');
          const allContracts: Contract[] = contractsRes.ok ? await contractsRes.json() : [];
          const existing = allContracts.find((c) => c.customerId === client.id && c.status === 'active');

          if (existing) {
            // Update existing contract's terms with new summary
            await fetch(`/api/contracts/${existing.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                terms: { summary },
                billingCycle: extraction.customer.billingCycle,
                plan: extraction.customer.plan || null,
                startDate: extraction.contract.startDate,
                endDate: extraction.contract.endDate || null,
              }),
            });
          } else {
            // Create new contract record
            await fetch('/api/contracts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: `con-${Date.now()}`,
                customerId: client.id,
                startDate: extraction.contract.startDate,
                endDate: extraction.contract.endDate || null,
                billingCycle: extraction.customer.billingCycle,
                plan: extraction.customer.plan || null,
                terms: { summary },
                status: 'active',
                createdAt: new Date().toISOString(),
              }),
            });
          }
        } catch (err) {
          console.error('Failed to update contract record:', err);
        }
      }

      const updated = buildUpdatedClient();
      // Include billing phases from extraction
      if (extraction?.customer?.billingPhases) {
        updated.billingPhases = extraction.customer.billingPhases.map((p) => ({
          cycle: p.cycle,
          durationMonths: p.durationMonths,
          amount: p.amount,
          note: p.note ?? null,
        }));
      }
      onUpdateClient(updated);
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
      // Show success inline
      setStep('upload');
      setFile(null);
      setExtraction(null);
      alert('Document uploaded successfully. No client details were changed.');
    } catch (err) {
      console.error('Failed to upload:', err);
    } finally {
      setSaving(false);
    }
  }

  function formatPhases(phases: { cycle: string; durationMonths: number; amount: number; note?: string | null }[] | null | undefined): string {
    if (!phases || phases.length === 0) return '—';
    return phases.map((p) => {
      const dur = p.durationMonths > 0 ? `${p.durationMonths}mo` : 'then';
      return `${p.cycle} ${dur} @ ${formatAED(p.amount)}`;
    }).join(' → ');
  }

  function phasesChanged(): boolean {
    const currentPhases = client.billingPhases;
    const extPhases = extraction?.customer?.billingPhases;
    // No phases on either side → no change
    if (!currentPhases?.length && !extPhases?.length) return false;
    // One side has phases, other doesn't → changed
    if (!currentPhases?.length || !extPhases?.length) return true;
    // Both have phases — compare
    if (currentPhases.length !== extPhases.length) return true;
    return currentPhases.some((p, i) => {
      const e = extPhases[i];
      return p.cycle !== e.cycle || p.durationMonths !== e.durationMonths || p.amount !== e.amount;
    });
  }

  function getComparison(): ComparisonField[] {
    if (!extraction?.customer) return [];
    const ext = extraction.customer;
    const fmt = (v: string | number | null | undefined) => v == null ? '—' : String(v);
    const fmtAED = (v: number | null | undefined) => v == null ? '—' : formatAED(v);

    // Determine effective billing display: if phases exist, show the phase summary instead of the flat cycle
    const hasExtPhases = ext.billingPhases && ext.billingPhases.length > 0;
    const hasCurrentPhases = client.billingPhases && client.billingPhases.length > 0;
    const billingChanged = hasExtPhases || hasCurrentPhases
      ? phasesChanged()
      : client.billingCycle !== ext.billingCycle;

    const currentBillingDisplay = hasCurrentPhases
      ? formatPhases(client.billingPhases)
      : fmt(client.billingCycle);
    const extractedBillingDisplay = hasExtPhases
      ? formatPhases(ext.billingPhases)
      : fmt(ext.billingCycle);

    const fields: ComparisonField[] = [
      { label: 'Client Name', current: client.name, extracted: ext.name, changed: client.name !== ext.name },
      { label: 'Per Seat Cost', current: fmtAED(client.perSeatCost), extracted: fmtAED(ext.perSeatCost), changed: client.perSeatCost !== ext.perSeatCost },
      { label: 'Seat Count', current: fmt(client.seatCount), extracted: fmt(ext.seatCount), changed: client.seatCount !== ext.seatCount },
      { label: 'MRR (AED)', current: fmtAED(client.mrr), extracted: fmtAED(ext.mrr), changed: client.mrr !== ext.mrr },
      { label: 'One-Time Revenue', current: fmtAED(client.oneTimeRevenue), extracted: fmtAED(ext.oneTimeRevenue), changed: client.oneTimeRevenue !== ext.oneTimeRevenue },
      { label: 'Billing Schedule', current: currentBillingDisplay, extracted: extractedBillingDisplay, changed: billingChanged },
      { label: 'Discount', current: `${client.discount || 0}%`, extracted: `${ext.discount || 0}%`, changed: (client.discount || 0) !== (ext.discount || 0) },
      { label: 'Pricing Model', current: fmt(client.pricingModel), extracted: fmt(ext.pricingModel), changed: client.pricingModel !== ext.pricingModel },
      { label: 'Email', current: fmt(client.email), extracted: fmt(ext.email), changed: (client.email || '') !== (ext.email || '') },
      { label: 'Phone', current: fmt(client.phone), extracted: fmt(ext.phone), changed: (client.phone || '') !== (ext.phone || '') },
      { label: 'Legal Name', current: fmt(client.companyLegalName), extracted: fmt(ext.companyLegalName), changed: (client.companyLegalName || '') !== (ext.companyLegalName || '') },
      { label: 'TRN', current: fmt(client.trn), extracted: fmt(ext.trn), changed: (client.trn || '') !== (ext.trn || '') },
    ];
    return fields;
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
          Upload a new contract for <strong style={{ color: '#1a1a1a' }}>{client.name}</strong>.
          The AI will extract the details and you can choose to update the client record or just store the document.
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
              <p style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", margin: '0 0 4px 0' }}>Drop updated contract PDF here</p>
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
            <><Loader2 size={16} className="animate-spin" /> Analyzing contract...</>
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
        {/* Changes Summary */}
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
            : 'No differences found — contract matches current data'}
        </div>

        {/* Side-by-side Comparison */}
        <div style={{
          background: '#ffffff', borderRadius: 10, padding: 16,
          border: '1px solid #e0dbd2', overflow: 'hidden',
        }}>
          <h4 style={{ fontSize: 12, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
            Current vs New Contract
          </h4>
          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Field</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Current</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>New Contract</th>
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

        {/* Deal Analysis */}
        {extraction.analysis && <DealAnalysisCard analysis={extraction.analysis} />}

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
                Update Client Details & Store Document
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

            {onSendToLab && (
              <button
                onClick={() => onSendToLab(extraction)}
                disabled={saving}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8,
                  border: '1px solid #a78bfa',
                  background: '#f3f0ff', color: '#7c3aed', fontSize: 12, fontWeight: 600,
                  cursor: saving ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                Send to Pricing Lab for What-If Analysis
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
