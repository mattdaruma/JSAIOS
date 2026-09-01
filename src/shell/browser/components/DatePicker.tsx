/**
 * JSAIOS - Dedicated DatePicker Primitive
 * Date and time calendar picker component.
 */

import React from 'react';

interface DatePickerProps {
  label?: string;
  value?: string;
  includeTime?: boolean;
  onChange?: (dateStr: string) => void;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  includeTime = false,
  onChange,
  className = ''
}) => {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-zinc-400 font-mono">{label}</label>}
      <input
        type={includeTime ? 'datetime-local' : 'date'}
        value={value || ''}
        onChange={(e) => onChange && onChange(e.target.value)}
        className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded text-xs text-zinc-100 font-mono outline-none focus:border-amber-500"
      />
    </div>
  );
};
