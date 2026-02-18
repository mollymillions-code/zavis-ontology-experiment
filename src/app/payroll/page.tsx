'use client';

import PageShell from '@/components/layout/PageShell';

export default function PayrollPage() {
  return (
    <PageShell title="Payroll" subtitle="Employee compensation management">
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #131320 50%, #0d0d18 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        <h2
          style={{
            margin: '0 0 12px 0',
            fontSize: 20,
            fontWeight: 700,
            color: '#ffffff',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Payroll Management
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 14,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Employee list and salary data will be uploaded here.
        </p>
      </div>
    </PageShell>
  );
}
