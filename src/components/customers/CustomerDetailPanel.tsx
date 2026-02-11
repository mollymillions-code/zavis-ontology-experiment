'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Client } from '@/lib/models/platform-types';
import ClientForm from './CustomerForm';

interface ClientDetailPanelProps {
  client?: Client;
  open: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
}

export default function ClientDetailPanel({ client, open, onClose, onSave }: ClientDetailPanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
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
              {client ? 'Edit Client' : 'Add Client'}
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

          <div style={{ padding: 24 }}>
            <ClientForm
              client={client}
              onSave={(c) => {
                onSave(c);
                onClose();
              }}
              onCancel={onClose}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
