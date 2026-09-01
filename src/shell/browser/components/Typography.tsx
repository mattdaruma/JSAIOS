/**
 * JSAIOS - Generic Typography Primitive
 * Headings, paragraphs, labels, and text styling.
 */

import React from 'react';

interface TypographyProps {
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'label' | 'caption' | 'code';
  color?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Typography: React.FC<TypographyProps> = ({
  variant = 'body',
  color = 'text-zinc-200',
  className = '',
  children
}) => {
  if (variant === 'h1') return <h1 className={`text-2xl font-bold tracking-tight ${color} ${className}`}>{children}</h1>;
  if (variant === 'h2') return <h2 className={`text-xl font-semibold tracking-tight ${color} ${className}`}>{children}</h2>;
  if (variant === 'h3') return <h3 className={`text-lg font-medium ${color} ${className}`}>{children}</h3>;
  if (variant === 'label') return <label className={`text-xs font-semibold uppercase tracking-wider text-zinc-400 ${className}`}>{children}</label>;
  if (variant === 'caption') return <span className={`text-xs text-zinc-500 ${className}`}>{children}</span>;
  if (variant === 'code') return <code className={`font-mono text-xs bg-zinc-900 px-1.5 py-0.5 rounded text-amber-400 border border-zinc-800 ${className}`}>{children}</code>;
  return <p className={`text-sm text-zinc-300 leading-relaxed ${className}`}>{children}</p>;
};
