'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X } from 'lucide-react';
import type { SalesPartnerInfo } from '@/lib/config/sales-partners';
import PartnerForm from './PartnerForm';
import PartnerContractUploadFlow from './PartnerContractUploadFlow';
import PartnerContractUpdateFlow from './PartnerContractUpdateFlow';
import DocumentsFolder from '@/components/shared/DocumentsFolder';

interface PartnerDetailPanelProps {
  partner?: SalesPartnerInfo;
  open: boolean;
  onClose: () => void;
  onSave: (partner: SalesPartnerInfo) => void;
}

export default function PartnerDetailPanel({ partner, open, onClose, onSave }: PartnerDetailPanelProps) {
  const isEdit = !!partner;
  const [activeTab, setActiveTab] = useState<string>('manual');
  const [prefillData, setPrefillData] = useState<Partial<SalesPartnerInfo> | undefined>(undefined);

  function handleSwitchToManual(prefill: Partial<SalesPartnerInfo>) {
    setPrefillData(prefill);
    setActiveTab('manual');
  }

  function handleClose() {
    setPrefillData(undefined);
    setActiveTab('manual');
    onClose();
  }

  const formPartner = prefillData
    ? {
        id: prefillData.id || prefillData.name?.toLowerCase().replace(/\s+/g, '-') || '',
        name: prefillData.name || '',
        joinedDate: prefillData.joinedDate || new Date().toISOString().split('T')[0],
        commissionPercentage: prefillData.commissionPercentage ?? 10,
        oneTimeCommissionPercentage: prefillData.oneTimeCommissionPercentage ?? 15,
        totalPaid: prefillData.totalPaid || 0,
        isActive: prefillData.isActive ?? true,
      } as SalesPartnerInfo
    : partner;

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
              {isEdit ? `Edit Partner — ${partner.name}` : 'Add Partner'}
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
                  {isEdit ? 'Update Agreement' : 'Upload Agreement'}
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
              </Tabs.List>

              <Tabs.Content value="manual">
                <PartnerForm
                  partner={isEdit ? partner : formPartner}
                  onSave={(p) => {
                    onSave(p);
                    handleClose();
                  }}
                  onCancel={handleClose}
                />
              </Tabs.Content>

              <Tabs.Content value="upload">
                {isEdit && partner ? (
                  <PartnerContractUpdateFlow
                    partner={partner}
                    onUpdatePartner={(p) => {
                      onSave(p);
                      handleClose();
                    }}
                  />
                ) : (
                  <PartnerContractUploadFlow
                    onCreatePartner={(p) => {
                      onSave(p);
                      handleClose();
                    }}
                    onSwitchToManual={handleSwitchToManual}
                  />
                )}
              </Tabs.Content>

              {isEdit && (
                <Tabs.Content value="documents">
                  <DocumentsFolder
                    entityType="partner"
                    entityId={partner.id}
                    entityName={partner.name}
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
