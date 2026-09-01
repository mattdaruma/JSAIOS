/**
 * JSAIOS - Generic Header Bar Layout
 * Bar container for headers, navigation, status indicators, and toolbars.
 */

import React from 'react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  borderBottom?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  borderBottom = true,
  className = '',
  children
}) => {
  return (
    <header className={`flex items-center justify-between px-4 py-3 bg-zinc-950 text-zinc-100 ${borderBottom ? 'border-b border-zinc-800' : ''} ${className}`}>
      <div className="flex items-center gap-3">
        {title && <h1 className="text-sm font-semibold tracking-wide text-zinc-100">{title}</h1>}
        {subtitle && <span className="text-xs text-zinc-400 font-mono">{subtitle}</span>}
      </div>
      <div className="flex items-center gap-2">
        {children}
      </div>
    </header>
  );
};
