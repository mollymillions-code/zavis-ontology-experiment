'use client';

import { useEffect, useRef } from 'react';
import { useClientStore } from '@/lib/store/customer-store';
import { useSnapshotStore } from '@/lib/store/snapshot-store';
import { useWhatIfStore } from '@/lib/store/whatif-store';

const V3_MIGRATION_KEY = 'zavis-v3-migrated';
const STALE_KEYS = [
  'zavis-customers',
  'zavis-customer-usage',
  'zavis-cost-rates',
  'zavis-customers-v2',
];

function migrateLocalStorageV3() {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(V3_MIGRATION_KEY)) return;
  for (const key of STALE_KEYS) {
    localStorage.removeItem(key);
  }
  localStorage.setItem(V3_MIGRATION_KEY, Date.now().toString());
}

export function useDbHydration() {
  const hydrated = useRef(false);
  const hydrateClients = useClientStore((s) => s.hydrateFromDb);
  const hydrateSnapshots = useSnapshotStore((s) => s.hydrateFromDb);
  const hydrateWhatIf = useWhatIfStore((s) => s.hydrateFromDb);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    migrateLocalStorageV3();
    hydrateClients();
    hydrateSnapshots();
    hydrateWhatIf();
  }, [hydrateClients, hydrateSnapshots, hydrateWhatIf]);
}
