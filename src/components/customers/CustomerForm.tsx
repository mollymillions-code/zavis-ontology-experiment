'use client';

import { useState } from 'react';
import type { Client, ClientStatus, BillingAddress } from '@/lib/models/platform-types';
import { ZAVIS_PLANS } from '@/lib/models/platform-types';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePartnerStore } from '@/lib/store/partner-store';

interface ClientFormProps {
  client?: Client;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

const STATUS_OPTIONS: { id: ClientStatus; label: string }[] = [
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

const labelStyle = {
  fontSize: 12,
  fontWeight: 500 as const,
  color: '#666666',
  fontFamily: "'DM Sans', sans-serif",
  marginBottom: 4,
  display: 'block' as const,
};

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #e0dbd2',
  fontSize: 13,
  fontFamily: "'DM Sans', sans-serif",
  color: '#1a1a1a',
  background: '#ffffff',
  outline: 'none',
};

const monoInputStyle = {
  ...inputStyle,
  fontFamily: "'Space Mono', monospace",
  fontWeight: 700 as const,
};

export default function ClientForm({ client, onSave, onCancel }: ClientFormProps) {
  const isEdit = !!client;
  const partnerNames = usePartnerStore((s) => s.getPartnerNames);

  // Derive initial plan from client data
  const getInitialPlan = () => {
    if (client?.plan) {
      const match = ZAVIS_PLANS.find((p) => p.name === client.plan || p.id === client.plan?.toLowerCase().replace(' plan', ''));
      if (match) return match.id;
    }
    if (client?.pricingModel === 'one_time_only') return 'one_time';
    if (client?.pricingModel === 'flat_mrr') return 'custom';
    return 'pro';
  };

  const [name, setName] = useState(client?.name || '');
  const [salesPartner, setSalesPartner] = useState<string>(client?.salesPartner || '');
  const [status, setStatus] = useState<ClientStatus>(client?.status || 'active');
  const [selectedPlan, setSelectedPlan] = useState(getInitialPlan());
  const [perSeatCost, setPerSeatCost] = useState<number | ''>(client?.perSeatCost ?? '');
  const [seatCount, setSeatCount] = useState<number | ''>(client?.seatCount ?? '');
  const [discount, setDiscount] = useState<number>(client?.discount ?? 0);
  const [mrr, setMrr] = useState(client?.mrr || 0);
  const [oneTimeRevenue, setOneTimeRevenue] = useState(client?.oneTimeRevenue || 0);
  const [onboardingDate, setOnboardingDate] = useState(client?.onboardingDate || '');
  const [notes, setNotes] = useState(client?.notes || '');
  const [billingCycle, setBillingCycle] = useState(client?.billingCycle || 'Monthly');

  // Billing / invoice fields
  const [email, setEmail] = useState(client?.email || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [companyLegalName, setCompanyLegalName] = useState(client?.companyLegalName || '');
  const [trn, setTrn] = useState(client?.trn || '');
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(client?.billingAddress || {});
  const [showBilling, setShowBilling] = useState(
    !!(client?.email || client?.phone || client?.companyLegalName || client?.trn || client?.billingAddress?.street1)
  );

  const plan = ZAVIS_PLANS.find((p) => p.id === selectedPlan)!;
  const isPerSeat = plan.pricingModel === 'per_seat';
  const isOneTime = plan.pricingModel === 'one_time_only';

  // Handle plan change — auto-fill suggested per-seat price
  function handlePlanChange(planId: string) {
    setSelectedPlan(planId);
    const newPlan = ZAVIS_PLANS.find((p) => p.id === planId);
    if (newPlan?.suggestedPerSeat) {
      setPerSeatCost(newPlan.suggestedPerSeat);
    }
  }

  // Auto-compute MRR for per_seat plans
  const computedMRR = isPerSeat && perSeatCost && seatCount
    ? Math.round(Number(perSeatCost) * Number(seatCount) * (1 - discount / 100))
    : mrr;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const finalMRR = isPerSeat && perSeatCost && seatCount
      ? Math.round(Number(perSeatCost) * Number(seatCount) * (1 - discount / 100))
      : isOneTime ? 0 : mrr;

    const saved: Client = {
      id: client?.id || `cli-${Date.now()}`,
      name,
      salesPartner: salesPartner || null,
      status,
      pricingModel: plan.pricingModel,
      perSeatCost: perSeatCost !== '' ? Number(perSeatCost) : null,
      seatCount: seatCount !== '' ? Number(seatCount) : null,
      billingCycle: billingCycle || null,
      plan: plan.name,
      discount: discount || 0,
      mrr: finalMRR,
      oneTimeRevenue,
      annualRunRate: finalMRR * 12 + oneTimeRevenue,
      onboardingDate: onboardingDate || null,
      notes: notes || undefined,
      email: email || null,
      phone: phone || null,
      companyLegalName: companyLegalName || null,
      trn: trn || null,
      billingAddress: Object.values(billingAddress).some((v) => v) ? billingAddress : null,
      createdAt: client?.createdAt || now,
      updatedAt: now,
    };
    onSave(saved);
  }

  const allPartners = partnerNames();

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Basic Info */}
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
          Basic Information
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Client Name *</label>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label style={labelStyle}>Sales Partner</label>
            <select style={inputStyle} value={salesPartner} onChange={(e) => setSalesPartner(e.target.value)}>
              <option value="">None (Direct)</option>
              {allPartners.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Onboarding Date</label>
            <input style={inputStyle} type="date" value={onboardingDate} onChange={(e) => setOnboardingDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', fontFamily: "'DM Sans', sans-serif", marginBottom: 12 }}>
          Plan & Pricing
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>Plan</label>
            <select style={inputStyle} value={selectedPlan} onChange={(e) => handlePlanChange(e.target.value)}>
              {ZAVIS_PLANS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.suggestedPerSeat ? ` (${p.suggestedPerSeat} AED/seat)` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Billing Cycle</label>
            <select style={inputStyle} value={billingCycle} onChange={(e) => setBillingCycle(e.target.value)}>
              {['Monthly', 'Quarterly', 'Half Yearly', 'Annual', 'One Time'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {isPerSeat && (
            <>
              <div>
                <label style={labelStyle}>Per Seat Cost (AED)</label>
                <input
                  style={monoInputStyle}
                  type="number"
                  min={0}
                  value={perSeatCost}
                  onChange={(e) => setPerSeatCost(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
              <div>
                <label style={labelStyle}>Seat Count</label>
                <input
                  style={monoInputStyle}
                  type="number"
                  min={0}
                  value={seatCount}
                  onChange={(e) => setSeatCount(e.target.value ? Number(e.target.value) : '')}
                />
              </div>
            </>
          )}

          <div>
            <label style={labelStyle}>Discount (%)</label>
            <input
              style={monoInputStyle}
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value) || 0)}
            />
          </div>

          {!isOneTime && (
            <div>
              <label style={labelStyle}>
                MRR (AED) {isPerSeat && perSeatCost && seatCount ? '(auto-computed)' : ''}
              </label>
              <input
                style={{
                  ...monoInputStyle,
                  ...(isPerSeat && perSeatCost && seatCount
                    ? { background: '#f0faf0', color: '#00a844' }
                    : {}),
                }}
                type="number"
                min={0}
                value={isPerSeat && perSeatCost && seatCount ? computedMRR : mrr}
                onChange={(e) => setMrr(Number(e.target.value))}
                disabled={isPerSeat && !!perSeatCost && !!seatCount}
              />
              {isPerSeat && perSeatCost && seatCount && discount > 0 && (
                <p style={{ fontSize: 10, color: '#666', marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>
                  {Number(perSeatCost)} × {Number(seatCount)} seats − {discount}% discount
                </p>
              )}
            </div>
          )}

          <div>
            <label style={labelStyle}>One-Time Revenue (AED)</label>
            <input
              style={monoInputStyle}
              type="number"
              min={0}
              value={oneTimeRevenue}
              onChange={(e) => setOneTimeRevenue(Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Billing & Contact */}
      <div>
        <button
          type="button"
          onClick={() => setShowBilling(!showBilling)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            color: '#1a1a1a',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: showBilling ? 12 : 0,
          }}
        >
          Billing & Contact
          {showBilling ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {!showBilling && (email || phone || companyLegalName) && (
            <span style={{ fontSize: 10, color: '#00a844', fontWeight: 500, marginLeft: 4 }}>
              (has data)
            </span>
          )}
        </button>
        {showBilling && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="accounts@client.com" />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input style={inputStyle} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+971 5x xxx xxxx" />
              </div>
              <div>
                <label style={labelStyle}>Company Legal Name</label>
                <input style={inputStyle} value={companyLegalName} onChange={(e) => setCompanyLegalName(e.target.value)} placeholder="Full legal entity name" />
              </div>
              <div>
                <label style={labelStyle}>TRN (Tax Registration No.)</label>
                <input style={inputStyle} value={trn} onChange={(e) => setTrn(e.target.value)} placeholder="Optional — UAE TRN" />
              </div>
            </div>

            {/* Billing Address */}
            <div style={{ padding: 12, borderRadius: 8, background: '#faf8f4', border: '1px solid #e0dbd2' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#666', fontFamily: "'DM Sans', sans-serif", margin: '0 0 8px 0' }}>
                Billing Address
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <input
                    style={inputStyle}
                    value={billingAddress.attention || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, attention: e.target.value })}
                    placeholder="Attention (e.g. Accounts Dept)"
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <input
                    style={inputStyle}
                    value={billingAddress.street1 || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, street1: e.target.value })}
                    placeholder="Street address line 1"
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <input
                    style={inputStyle}
                    value={billingAddress.street2 || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, street2: e.target.value })}
                    placeholder="Street address line 2"
                  />
                </div>
                <div>
                  <input
                    style={inputStyle}
                    value={billingAddress.city || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <input
                    style={inputStyle}
                    value={billingAddress.state || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, state: e.target.value })}
                    placeholder="State / Emirate"
                  />
                </div>
                <div>
                  <input
                    style={inputStyle}
                    value={billingAddress.country || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
                <div>
                  <input
                    style={inputStyle}
                    value={billingAddress.zip || ''}
                    onChange={(e) => setBillingAddress({ ...billingAddress, zip: e.target.value })}
                    placeholder="ZIP / Postal code"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any additional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3" style={{ paddingTop: 8, borderTop: '1px solid #e0dbd2' }}>
        <button
          type="submit"
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#00c853',
            color: '#1a1a1a',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
          }}
        >
          {isEdit ? 'Save Changes' : 'Add Client'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 24px',
            borderRadius: 8,
            border: '1px solid #e0dbd2',
            background: '#ffffff',
            color: '#666',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
