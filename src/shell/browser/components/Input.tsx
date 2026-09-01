/**
 * JSAIOS - Generic Input Primitive
 * Single-line text input & multi-line textarea with prompt line indicators and submission handling.
 */

import React, { useState } from 'react';

interface InputProps {
  value?: string;
  placeholder?: string;
  promptPrefix?: string;
  multiline?: boolean;
  type?: 'text' | 'password' | 'number' | 'search';
  disabled?: boolean;
  onChange?: (val: string) => void;
  onSubmit?: (val: string) => void;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  value: externalValue,
  placeholder = 'Type a command or message...',
  promptPrefix,
  multiline = false,
  type = 'text',
  disabled = false,
  onChange,
  onSubmit,
  className = ''
}) => {
  const [internalValue, setInternalValue] = useState('');
  const value = externalValue !== undefined ? externalValue : internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (externalValue === undefined) setInternalValue(val);
    if (onChange) onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (!multiline) e.preventDefault();
      if (onSubmit && value.trim()) {
        onSubmit(value.trim());
        if (externalValue === undefined) setInternalValue('');
      }
    }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 bg-zinc-950 border-t border-zinc-800 font-mono text-xs text-zinc-100 ${className}`}>
      {promptPrefix && <span className="text-emerald-400 font-bold select-none">{promptPrefix}</span>}
      {multiline ? (
        <textarea
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none resize-none text-zinc-100 placeholder-zinc-600 custom-scrollbar"
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-zinc-100 placeholder-zinc-600"
        />
      )}
    </div>
  );
};
