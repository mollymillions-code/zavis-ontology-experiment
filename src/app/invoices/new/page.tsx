'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { useClientStore } from '@/lib/store/customer-store';
import { useInvoiceStore } from '@/lib/store/invoice-store';
import { parseReceivableToLineItems } from '@/lib/utils/invoice-utils';

function NewInvoiceContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId');
  const receivableId = searchParams.get('receivableId');

  const receivables = useClientStore((s) => s.receivables);
  const catalogItems = useInvoiceStore((s) => s.catalogItems);

  const { prefillClientId, prefillReceivableId, prefillLineItems } = useMemo(() => {
    if (receivableId) {
      const receivable = receivables.find((r) => r.id === receivableId);
      if (receivable) {
        return {
          prefillClientId: receivable.clientId,
          prefillReceivableId: receivableId,
          prefillLineItems: parseReceivableToLineItems(
            receivable.description,
            receivable.amount,
            catalogItems
          ),
        };
      }
    }

    return {
      prefillClientId: clientId || undefined,
      prefillReceivableId: undefined,
      prefillLineItems: undefined,
    };
  }, [receivableId, clientId, receivables, catalogItems]);

  return (
    <InvoiceForm
      prefillClientId={prefillClientId}
      prefillReceivableId={prefillReceivableId}
      prefillLineItems={prefillLineItems}
    />
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceContent />
    </Suspense>
  );
}
