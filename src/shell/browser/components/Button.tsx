/**
 * JSAIOS - Generic Button Primitive
 * Clickable action buttons, icon triggers, and variant styling.
 */

import React from 'react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  children
}) => {
  const sizeClass = size === 'sm' ? 'px-2.5 py-1 text-xs' : size === 'lg' ? 'px-5 py-2.5 text-base' : 'px-3.5 py-1.5 text-sm';

  let variantClass = 'bg-amber-500 hover:bg-amber-600 text-zinc-950 font-medium shadow';
  if (variant === 'secondary') variantClass = 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700';
  if (variant === 'danger') variantClass = 'bg-red-600 hover:bg-red-700 text-white';
  if (variant === 'ghost') variantClass = 'bg-transparent hover:bg-zinc-800 text-zinc-300';
  if (variant === 'icon') variantClass = 'bg-transparent hover:bg-zinc-800 text-zinc-300 p-1.5 rounded-full';

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-mono transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
};
