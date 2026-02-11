'use client';

import { cn } from '@/lib/utils/cn';

interface CurrencyInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
}

export default function CurrencyInput({
  label,
  value,
  onChange,
  suffix = 'AED',
  className,
  min = 0,
  max,
  step = 1,
}: CurrencyInputProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-xs font-medium text-slate-600">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full px-3 py-2 pr-14 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
          {suffix}
        </span>
      </div>
    </div>
  );
}
