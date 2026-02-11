'use client';

import { useDbHydration } from '@/hooks/useDbHydration';

export default function DbHydrator() {
  useDbHydration();
  return null;
}
