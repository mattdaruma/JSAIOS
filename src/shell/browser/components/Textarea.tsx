/**
 * JSAIOS - Dedicated Textarea Primitive
 * Multi-line text area input with custom scrollbars, rows, and resize controls.
 */

import React, { useState } from 'react';

interface TextareaProps {
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  onChange?: (val: string) => void;
  onSubmit?: (val: string) => void;
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  value: externalValue,
  placeholder = 'Type multi-line text...',
  rows = 4,
  disabled = false,
  onChange,
  onSubmit,
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState('');
  const value = externalValue !== undefined ? externalValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (externalValue === undefined) setInternalValue(val);
    if (onChange) onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      if (onSubmit && value.trim()) {
        onSubmit(value.trim());
      }
    }
  };

  return (
    <textarea
      value={value}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={`w-full p-3 bg-zinc-950 border border-zinc-800 rounded-md font-mono text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-amber-500 custom-scrollbar resize-y ${className}`}
    />
  );
};
