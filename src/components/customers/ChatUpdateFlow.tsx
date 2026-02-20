'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Client, Contract } from '@/lib/models/platform-types';
import type { ChatUpdateResponse } from '@/lib/schemas/chat-update';
import { formatAED } from '@/lib/utils/currency';
import { Loader2, Send, Check, X } from 'lucide-react';

interface ChatUpdateFlowProps {
  client: Client;
  onApplyUpdates: (updates: Partial<Client>) => void;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface PendingUpdate {
  updates: Partial<Client>;
  reasoning: string;
}

interface ComparisonField {
  label: string;
  current: string;
  proposed: string;
  changed: boolean;
}

/**
 * Deterministic MRR recalculation — always overrides LLM values.
 * Formula: perSeatCost * seatCount * (1 - discount/100)
 */
function verifyAndMergeUpdates(client: Client, updates: Partial<Client>): Partial<Client> {
  const merged = { ...updates };

  const perSeatCost = merged.perSeatCost !== undefined ? merged.perSeatCost : client.perSeatCost;
  const seatCount = merged.seatCount !== undefined ? merged.seatCount : client.seatCount;
  const discount = merged.discount !== undefined ? (merged.discount ?? 0) : (client.discount || 0);
  const pricingModel = merged.pricingModel || client.pricingModel;

  // Recalculate MRR for per-seat pricing
  if (pricingModel === 'per_seat' && perSeatCost != null && seatCount != null) {
    const calculatedMrr = Math.round(perSeatCost * seatCount * (1 - discount / 100) * 100) / 100;
    // Only override if seat/price/discount changed
    if (
      merged.perSeatCost !== undefined ||
      merged.seatCount !== undefined ||
      merged.discount !== undefined
    ) {
      merged.mrr = calculatedMrr;
    }
  }

  // Recalculate ARR
  const mrr = merged.mrr !== undefined ? merged.mrr : client.mrr;
  const oneTime = merged.oneTimeRevenue !== undefined ? merged.oneTimeRevenue : client.oneTimeRevenue;
  if (merged.mrr !== undefined || merged.oneTimeRevenue !== undefined) {
    merged.annualRunRate = mrr * 12 + oneTime;
  }

  return merged;
}

export default function ChatUpdateFlow({ client, onApplyUpdates }: ChatUpdateFlowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contractSummary, setContractSummary] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<PendingUpdate | null>(null);
  const [applying, setApplying] = useState(false);
  const [contractId, setContractId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch contract summary on mount
  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch('/api/contracts');
        if (!res.ok) return;
        const allContracts: Contract[] = await res.json();
        const existing = allContracts.find((c) => c.customerId === client.id && c.status === 'active');
        if (existing?.terms && typeof existing.terms === 'object' && 'summary' in existing.terms) {
          setContractSummary((existing.terms as { summary: string }).summary);
          setContractId(existing.id);
        }
      } catch {
        // Proceed without contract summary
      }
    }
    fetchSummary();
  }, [client.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingUpdate]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: 'user', text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);
    setPendingUpdate(null);

    try {
      const res = await fetch('/api/chat-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          client,
          contractSummary,
          history: messages, // previous turns for multi-turn context
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMsg: ChatMessage = { role: 'model', text: data.error || 'Something went wrong. Please try again.' };
        setMessages([...updatedMessages, errorMsg]);
        return;
      }

      const result: ChatUpdateResponse = data.result;

      if (result.clarificationNeeded && result.clarificationQuestion) {
        const clarMsg: ChatMessage = { role: 'model', text: result.clarificationQuestion };
        setMessages([...updatedMessages, clarMsg]);
      } else {
        const aiMsg: ChatMessage = { role: 'model', text: result.reasoning };
        setMessages([...updatedMessages, aiMsg]);

        // Apply deterministic MRR override and show diff
        const hasUpdates = Object.keys(result.updates).length > 0;
        if (hasUpdates) {
          const verified = verifyAndMergeUpdates(client, result.updates as Partial<Client>);
          setPendingUpdate({ updates: verified, reasoning: result.reasoning });
        }
      }
    } catch {
      const errorMsg: ChatMessage = { role: 'model', text: 'Failed to connect to AI. Please check your connection and try again.' };
      setMessages([...updatedMessages, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, client, contractSummary]);

  async function handleApply() {
    if (!pendingUpdate) return;
    setApplying(true);

    try {
      // Apply updates to client
      onApplyUpdates(pendingUpdate.updates);

      // Append change log to contract summary
      if (contractId) {
        const changeLog = `\n## Chat Update (${new Date().toISOString().split('T')[0]})\n${pendingUpdate.reasoning}\n`;
        const updatedSummary = (contractSummary || '') + changeLog;
        await fetch(`/api/contracts/${contractId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ terms: { summary: updatedSummary } }),
        });
        setContractSummary(updatedSummary);
      }

      const confirmMsg: ChatMessage = { role: 'model', text: 'Changes applied successfully.' };
      setMessages((prev) => [...prev, confirmMsg]);
      setPendingUpdate(null);
    } catch {
      const errorMsg: ChatMessage = { role: 'model', text: 'Failed to apply changes. Please try again.' };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setApplying(false);
    }
  }

  function handleDismiss() {
    setPendingUpdate(null);
    const dismissMsg: ChatMessage = { role: 'model', text: 'Changes dismissed. You can try a different instruction.' };
    setMessages((prev) => [...prev, dismissMsg]);
  }

  function buildComparison(): ComparisonField[] {
    if (!pendingUpdate) return [];
    const u = pendingUpdate.updates;
    const fmt = (v: unknown) => v == null ? '—' : String(v);
    const fmtAED_ = (v: number | null | undefined) => v == null ? '—' : formatAED(v);

    const fields: ComparisonField[] = [];
    if (u.name !== undefined) fields.push({ label: 'Name', current: client.name, proposed: u.name!, changed: true });
    if (u.seatCount !== undefined) fields.push({ label: 'Seat Count', current: fmt(client.seatCount), proposed: fmt(u.seatCount), changed: true });
    if (u.perSeatCost !== undefined) fields.push({ label: 'Per Seat Cost', current: fmtAED_(client.perSeatCost), proposed: fmtAED_(u.perSeatCost), changed: true });
    if (u.mrr !== undefined) fields.push({ label: 'MRR', current: fmtAED_(client.mrr), proposed: fmtAED_(u.mrr), changed: true });
    if (u.annualRunRate !== undefined) fields.push({ label: 'Annual Run Rate', current: fmtAED_(client.annualRunRate), proposed: fmtAED_(u.annualRunRate), changed: true });
    if (u.oneTimeRevenue !== undefined) fields.push({ label: 'One-Time Revenue', current: fmtAED_(client.oneTimeRevenue), proposed: fmtAED_(u.oneTimeRevenue), changed: true });
    if (u.billingCycle !== undefined) fields.push({ label: 'Billing Cycle', current: fmt(client.billingCycle), proposed: fmt(u.billingCycle), changed: true });
    if (u.discount !== undefined) fields.push({ label: 'Discount', current: `${client.discount || 0}%`, proposed: `${u.discount}%`, changed: true });
    if (u.plan !== undefined) fields.push({ label: 'Plan', current: fmt(client.plan), proposed: fmt(u.plan), changed: true });
    if (u.pricingModel !== undefined) fields.push({ label: 'Pricing Model', current: fmt(client.pricingModel), proposed: fmt(u.pricingModel), changed: true });
    if (u.status !== undefined) fields.push({ label: 'Status', current: client.status, proposed: u.status!, changed: true });
    if (u.email !== undefined) fields.push({ label: 'Email', current: fmt(client.email), proposed: fmt(u.email), changed: true });
    if (u.phone !== undefined) fields.push({ label: 'Phone', current: fmt(client.phone), proposed: fmt(u.phone), changed: true });
    if (u.notes !== undefined) fields.push({ label: 'Notes', current: client.notes || '—', proposed: u.notes!, changed: true });
    return fields;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400 }}>
      {/* Description */}
      <div style={{
        padding: 12, borderRadius: 8, marginBottom: 12,
        background: '#f5f0e8', border: '1px solid #e0dbd2',
        fontSize: 12, color: '#666', fontFamily: "'DM Sans', sans-serif",
        lineHeight: 1.5,
      }}>
        Describe changes for <strong style={{ color: '#1a1a1a' }}>{client.name}</strong> in natural language.
        {contractSummary && <span style={{ color: '#00a844' }}> Contract summary loaded.</span>}
      </div>

      {/* Message History */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 12,
          maxHeight: 300,
          minHeight: 120,
        }}
      >
        {messages.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '24px 16px',
            color: '#999', fontSize: 12, fontFamily: "'DM Sans', sans-serif",
          }}>
            Try: &quot;They renewed for 2 years with 25 seats&quot; or &quot;Add 10 more seats&quot;
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '8px 12px',
              borderRadius: 10,
              background: msg.role === 'user' ? '#1a1a1a' : '#ffffff',
              color: msg.role === 'user' ? '#ffffff' : '#1a1a1a',
              border: msg.role === 'model' ? '1px solid #e0dbd2' : 'none',
              fontSize: 12,
              fontFamily: "'DM Sans', sans-serif",
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div style={{
            alignSelf: 'flex-start', padding: '8px 12px',
            borderRadius: 10, background: '#ffffff', border: '1px solid #e0dbd2',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: '#999', fontFamily: "'DM Sans', sans-serif",
          }}>
            <Loader2 size={14} className="animate-spin" /> Thinking...
          </div>
        )}
      </div>

      {/* Diff Preview */}
      {pendingUpdate && (
        <div style={{
          background: '#ffffff', borderRadius: 10, padding: 12,
          border: '1px solid #e0dbd2', marginBottom: 12,
        }}>
          <h4 style={{
            fontSize: 11, fontWeight: 700, color: '#1a1a1a',
            fontFamily: "'DM Sans', sans-serif", marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Proposed Changes
          </h4>

          <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0dbd2' }}>
                <th style={{ padding: '4px 6px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Field</th>
                <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Current</th>
                <th style={{ padding: '4px 6px', textAlign: 'right', fontSize: 10, fontWeight: 600, color: '#666', textTransform: 'uppercase', fontFamily: "'DM Sans', sans-serif" }}>Proposed</th>
              </tr>
            </thead>
            <tbody>
              {buildComparison().map((field) => (
                <tr key={field.label} style={{
                  borderBottom: '1px solid #e0dbd2',
                  background: '#fffde7',
                }}>
                  <td style={{ padding: '6px', fontFamily: "'DM Sans', sans-serif", fontWeight: 500, color: '#666' }}>
                    {field.label}
                    <span style={{ marginLeft: 6, fontSize: 9, color: '#f57f17', fontWeight: 700 }}>CHANGED</span>
                  </td>
                  <td style={{
                    padding: '6px', textAlign: 'right',
                    fontFamily: "'Space Mono', monospace", fontWeight: 600,
                    color: '#999', textDecoration: 'line-through',
                  }}>
                    {field.current}
                  </td>
                  <td style={{
                    padding: '6px', textAlign: 'right',
                    fontFamily: "'Space Mono', monospace", fontWeight: 700,
                    color: '#00a844',
                  }}>
                    {field.proposed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Apply / Dismiss */}
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                background: '#00c853', color: '#1a1a1a', fontSize: 12, fontWeight: 700,
                cursor: applying ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                opacity: applying ? 0.7 : 1,
              }}
            >
              {applying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Apply Changes
            </button>
            <button
              onClick={handleDismiss}
              disabled={applying}
              style={{
                padding: '10px 16px', borderRadius: 8,
                border: '1px solid #e0dbd2', background: '#ffffff',
                color: '#666', fontSize: 12, fontWeight: 600,
                cursor: applying ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              }}
            >
              <X size={14} /> Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div style={{
        display: 'flex', gap: 8,
        borderTop: '1px solid #e0dbd2',
        paddingTop: 12,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder="e.g. &quot;They added 10 seats and switched to quarterly&quot;"
          disabled={loading || applying}
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            border: '1px solid #e0dbd2', background: '#ffffff',
            fontSize: 12, fontFamily: "'DM Sans', sans-serif",
            color: '#1a1a1a', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading || applying}
          style={{
            padding: '10px 14px', borderRadius: 8, border: 'none',
            background: input.trim() && !loading && !applying ? '#1a1a1a' : '#e0dbd2',
            color: input.trim() && !loading && !applying ? '#ffffff' : '#999',
            cursor: input.trim() && !loading && !applying ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
