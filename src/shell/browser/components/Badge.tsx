/**
 * JSAIOS - Generic Badge & Pill Primitive
 * Status badges, tags, and role pills.
 */

import React from 'react';

interface BadgeProps {
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  label,
  className = '',
  children
}) => {
  let colorClass = 'bg-zinc-800 text-zinc-300 border-zinc-700';
  if (variant === 'info') colorClass = 'bg-cyan-950 text-cyan-400 border-cyan-800';
  if (variant === 'success') colorClass = 'bg-emerald-950 text-emerald-400 border-emerald-800';
  if (variant === 'warning') colorClass = 'bg-amber-950 text-amber-400 border-amber-800';
  if (variant === 'danger') colorClass = 'bg-red-950 text-red-400 border-red-800';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono border ${colorClass} ${className}`}>
      {label || children}
    </span>
  );
};
