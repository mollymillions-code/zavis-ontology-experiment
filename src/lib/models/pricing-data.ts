// ========== PARTNER COLORS (jewel tones for Warm Noir charts) ==========

export const PARTNER_COLORS: Record<string, string> = {
  'Dr. Faisal': '#60a5fa',
  'Thousif':    '#a78bfa',
  'Sagar':     '#34d399',
  'Wasim':     '#fbbf24',
  'Code Latis':'#f472b6',
  'Cloudlink': '#fb923c',
  'Direct':    '#e2e8f0',
};

export const PARTNER_GRADIENTS: Record<string, [string, string]> = {
  'Dr. Faisal': ['#3b82f6', '#1d4ed8'],
  'Thousif':    ['#8b5cf6', '#6d28d9'],
  'Sagar':     ['#10b981', '#047857'],
  'Wasim':     ['#f59e0b', '#d97706'],
  'Code Latis':['#ec4899', '#be185d'],
  'Cloudlink': ['#f97316', '#c2410c'],
  'Direct':    ['#94a3b8', '#64748b'],
};

// ========== CATALOG TIERS (PDF reference — not used for actual pricing) ==========

export const CATALOG_TIERS = [
  { id: 'pro', name: 'Pro', monthlyPrice: 899 },
  { id: 'elite', name: 'Elite', monthlyPrice: 1499 },
  { id: 'ultimate', name: 'Ultimate', monthlyPrice: 2499 },
] as const;

// ========== RECEIVABLE STATUS COLORS ==========

export const RECEIVABLE_STATUS_COLORS: Record<string, string> = {
  paid: '#10b981',
  invoiced: '#3b82f6',
  pending: '#f59e0b',
  overdue: '#ef4444',
};
