import { describe, it, expect } from 'vitest';
import { formatAED, formatNumber, formatPercent, formatDelta, formatDeltaAED } from '@/lib/utils/currency';

describe('Currency utilities', () => {
  // 21
  it('formatAED formats with AED suffix', () => {
    expect(formatAED(1190)).toBe('1,190 AED');
    expect(formatAED(0)).toBe('0 AED');
    expect(formatAED(1000000)).toBe('1,000,000 AED');
  });

  // 22
  it('formatAED supports decimal places', () => {
    expect(formatAED(1190.5, 2)).toBe('1,190.50 AED');
  });

  // 23
  it('formatNumber formats without suffix', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(0)).toBe('0');
  });

  // 24
  it('formatPercent formats with % suffix', () => {
    expect(formatPercent(10)).toBe('10.0%');
    expect(formatPercent(33.333, 2)).toBe('33.33%');
  });

  // 25
  it('formatDelta adds + prefix for positive values', () => {
    expect(formatDelta(100)).toBe('+100');
    expect(formatDelta(-50)).toBe('-50');
    expect(formatDelta(0)).toBe('+0');
  });

  // 26
  it('formatDeltaAED adds + prefix with AED', () => {
    expect(formatDeltaAED(500)).toBe('+500 AED');
    expect(formatDeltaAED(-200)).toBe('-200 AED');
  });
});
