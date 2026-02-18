'use client';

import { useState, useEffect } from 'react';
import type { MonthlyCost } from '@/lib/models/platform-types';

export function useMonthlyCosts() {
  const [costs, setCosts] = useState<MonthlyCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/costs')
      .then((r) => r.json())
      .then((data: MonthlyCost[]) => {
        setCosts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { costs, loading };
}
