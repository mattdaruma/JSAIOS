/**
 * JSAIOS - Dedicated Checkbox & Toggle Switch Primitive
 * Handles boolean checkboxes and toggle switches.
 */

import React, { useState } from 'react';

interface CheckboxProps {
  label?: string;
  checked?: boolean;
  isToggle?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  checked: externalChecked,
  isToggle = false,
  disabled = false,
  onChange,
  className = ''
}) => {
  const [internalChecked, setInternalChecked] = useState(false);
  const checked = externalChecked !== undefined ? externalChecked : internalChecked;

  const handleClick = () => {
    if (disabled) return;
    const next = !checked;
    if (externalChecked === undefined) setInternalChecked(next);
    if (onChange) onChange(next);
  };

  if (isToggle) {
    return (
      <label className={`inline-flex items-center cursor-pointer gap-2 select-none ${className}`}>
        <div
          onClick={handleClick}
          className={`w-9 h-5 rounded-full transition-colors p-0.5 flex items-center ${checked ? 'bg-amber-500 justify-end' : 'bg-zinc-800 justify-start'}`}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-md" />
        </div>
        {label && <span className="text-xs text-zinc-300 font-mono">{label}</span>}
      </label>
    );
  }

  return (
    <label className={`inline-flex items-center cursor-pointer gap-2 select-none ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleClick}
        className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-0"
      />
      {label && <span className="text-xs text-zinc-300 font-mono">{label}</span>}
    </label>
  );
};
