export function formatAED(amount: number, decimals = 0): string {
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })} AED`;
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDelta(value: number, decimals = 0): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatNumber(value, decimals)}`;
}

export function formatDeltaAED(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatAED(value)}`;
}

export function formatDeltaPercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}
