'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X } from 'lucide-react';
import type { Client } from '@/lib/models/platform-types';
import type { ContractExtraction } from '@/lib/schemas/contract-extraction';
import ClientForm from './CustomerForm';
import ContractUploadFlow from './ContractUploadFlow';
import ContractUpdateFlow from './ContractUpdateFlow';
import ChatUpdateFlow from './ChatUpdateFlow';
import DocumentsFolder from '@/components/shared/DocumentsFolder';
import { useWhatIfStore } from '@/lib/store/whatif-store';
import { useRouter } from 'next/navigation';

interface ClientDetailPanelProps {
  client?: Client;
  open: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
}

export default function ClientDetailPanel({ client, open, onClose, onSave }: ClientDetailPanelProps) {
  const isEdit = !!client;
  const [activeTab, setActiveTab] = useState<string>('manual');
  const [prefillData, setPrefillData] = useState<Partial<Client> | undefined>(undefined);
  const addScenario = useWhatIfStore((s) => s.addScenario);
  const router = useRouter();

  function handleSwitchToManual(prefill: Partial<Client>) {
    setPrefillData(prefill);
    setActiveTab('manual');
  }

  function handleSendToLab(extraction: ContractExtraction) {
    const scenario = {
      id: `whatif-${Date.now()}`,
      name: `Contract: ${extraction.customer.name}`,
      createdAt: new Date().toISOString(),
      modifiedPerSeatPrice: extraction.analysis.effectivePerSeatRate || extraction.customer.perSeatCost || 249,
      source: 'contract_extraction' as const,
      dealAnalysis: {
        customerName: extraction.customer.name,
        summary: extraction.analysis.summary,
        comparisonVerdict: extraction.analysis.comparisonToStandard.verdict,
        riskCount: {
          low: extraction.analysis.risks.filter((r) => r.severity === 'low').length,
          medium: extraction.analysis.risks.filter((r) => r.severity === 'medium').length,
          high: extraction.analysis.risks.filter((r) => r.severity === 'high').length,
        },
        effectivePerSeatRate: extraction.analysis.effectivePerSeatRate,
        recommendations: extraction.analysis.recommendations,
      },
    };
    addScenario(scenario);
    onClose();
    router.push(`/lab?scenario=${scenario.id}`);
  }

  function handleClose() {
    setPrefillData(undefined);
    setActiveTab('manual');
    onClose();
  }

  // Build a prefilled client object for the form
  const formClient = prefillData
    ? {
        id: `cli-${Date.now()}`,
        name: prefillData.name || '',
        salesPartner: prefillData.salesPartner || null,
        status: prefillData.status || 'active',
        pricingModel: prefillData.pricingModel || 'per_seat',
        perSeatCost: prefillData.perSeatCost ?? null,
        seatCount: prefillData.seatCount ?? null,
        billingCycle: prefillData.billingCycle || 'Monthly',
        plan: prefillData.plan || null,
        discount: prefillData.discount || 0,
        mrr: prefillData.mrr || 0,
        oneTimeRevenue: prefillData.oneTimeRevenue || 0,
        annualRunRate: (prefillData.mrr || 0) * 12,
        onboardingDate: prefillData.onboardingDate || null,
        notes: prefillData.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Client
    : client;

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 50,
          }}
        />
        <Dialog.Content
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: 640,
            maxWidth: '90vw',
            background: '#f5f0e8',
            zIndex: 51,
            overflowY: 'auto',
            boxShadow: '-8px 0 24px rgba(0,0,0,0.12)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#1a1a1a',
              padding: '16px 24px',
            }}
          >
            <Dialog.Title
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: "'DM Sans', sans-serif",
                margin: 0,
              }}
            >
              {isEdit ? 'Edit Client' : 'Add Client'}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#999',
                  padding: 4,
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Content */}
          <div style={{ padding: 24 }}>
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List
                style={{
                  display: 'flex',
                  gap: 0,
                  marginBottom: 20,
                  borderRadius: 8,
                  overflow: 'hidden',
                  border: '1px solid #e0dbd2',
                }}
              >
                <Tabs.Trigger
                  value="manual"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    background: activeTab === 'manual' ? '#1a1a1a' : '#ffffff',
                    color: activeTab === 'manual' ? '#ffffff' : '#666',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.15s',
                  }}
                >
                  {isEdit ? 'Edit Details' : 'Manual Entry'}
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="upload"
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    border: 'none',
                    borderLeft: '1px solid #e0dbd2',
                    background: activeTab === 'upload' ? '#1a1a1a' : '#ffffff',
                    color: activeTab === 'upload' ? '#ffffff' : '#666',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    transition: 'all 0.15s',
                  }}
                >
                  {isEdit ? 'Update Contract' : 'Upload Contract'}
                </Tabs.Trigger>
                {isEdit && (
                  <Tabs.Trigger
                    value="documents"
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: 'none',
                      borderLeft: '1px solid #e0dbd2',
                      background: activeTab === 'documents' ? '#1a1a1a' : '#ffffff',
                      color: activeTab === 'documents' ? '#ffffff' : '#666',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'all 0.15s',
                    }}
                  >
                    Documents
                  </Tabs.Trigger>
                )}
                {isEdit && (
                  <Tabs.Trigger
                    value="chat"
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      border: 'none',
                      borderLeft: '1px solid #e0dbd2',
                      background: activeTab === 'chat' ? '#1a1a1a' : '#ffffff',
                      color: activeTab === 'chat' ? '#ffffff' : '#666',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'all 0.15s',
                    }}
                  >
                    AI Update
                  </Tabs.Trigger>
                )}
              </Tabs.List>

              <Tabs.Content value="manual">
                <ClientForm
                  client={isEdit ? client : formClient}
                  onSave={(c) => {
                    onSave(c);
                    handleClose();
                  }}
                  onCancel={handleClose}
                />
              </Tabs.Content>

              <Tabs.Content value="upload">
                {isEdit && client ? (
                  <ContractUpdateFlow
                    client={client}
                    onUpdateClient={(c) => {
                      onSave(c);
                      handleClose();
                    }}
                    onSendToLab={handleSendToLab}
                  />
                ) : (
                  <ContractUploadFlow
                    onCreateClient={(c) => {
                      onSave(c);
                      handleClose();
                    }}
                    onSwitchToManual={handleSwitchToManual}
                    onSendToLab={handleSendToLab}
                  />
                )}
              </Tabs.Content>

              {isEdit && (
                <Tabs.Content value="documents">
                  <DocumentsFolder
                    entityType="client"
                    entityId={client.id}
                    entityName={client.name}
                  />
                </Tabs.Content>
              )}

              {isEdit && client && (
                <Tabs.Content value="chat">
                  <ChatUpdateFlow
                    client={client}
                    onApplyUpdates={(updates) => {
                      const updated = { ...client, ...updates, updatedAt: new Date().toISOString() };
                      onSave(updated);
                    }}
                  />
                </Tabs.Content>
              )}
            </Tabs.Root>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
