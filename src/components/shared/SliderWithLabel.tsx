'use client';

import * as Slider from '@radix-ui/react-slider';

interface SliderWithLabelProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  tooltip?: string;
}

export default function SliderWithLabel({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  tooltip,
}: SliderWithLabelProps) {
  const displayValue = formatValue ? formatValue(value) : String(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-600" title={tooltip}>
          {label}
        </label>
        <span className="text-xs font-semibold text-slate-900 tabular-nums">{displayValue}</span>
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-5"
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      >
        <Slider.Track className="bg-slate-200 relative grow rounded-full h-1.5">
          <Slider.Range className="absolute bg-indigo-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-sm hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-colors" />
      </Slider.Root>
      <div className="flex justify-between">
        <span className="text-[10px] text-slate-400">{formatValue ? formatValue(min) : min}</span>
        <span className="text-[10px] text-slate-400">{formatValue ? formatValue(max) : max}</span>
      </div>
    </div>
  );
}
