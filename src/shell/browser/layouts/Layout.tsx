/**
 * JSAIOS - Generic Layout Container Primitive
 * Flexible layout pane supporting flex directions, grid templates, padding, gaps, scrollability, and Tailwind styling.
 */

import React from 'react';
import type { UILayoutProps } from '../types';

interface LayoutProps extends UILayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  direction = 'column',
  wrap = false,
  align = 'stretch',
  justify = 'start',
  gap,
  padding,
  flex,
  width,
  height,
  fullHeight,
  fullWidth,
  scrollable = false,
  card = false,
  border = false,
  className = '',
  children
}) => {
  const dirClass = direction === 'row' ? 'flex-row' : 'flex-col';
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';
  const alignClass = align === 'center' ? 'items-center' : align === 'start' ? 'items-start' : align === 'end' ? 'items-end' : 'items-stretch';
  const justifyClass = justify === 'center' ? 'justify-center' : justify === 'between' ? 'justify-between' : justify === 'around' ? 'justify-around' : justify === 'end' ? 'justify-end' : 'justify-start';

  const cardStyle = card ? 'bg-zinc-900 border border-zinc-800 rounded-lg shadow-md' : '';
  const borderStyle = border ? 'border border-zinc-800' : '';
  const overflowStyle = scrollable ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden';
  const hStyle = fullHeight ? 'h-full min-h-screen' : height ? `h-[${height}]` : '';
  const wStyle = fullWidth ? 'w-full' : width ? `w-[${width}]` : '';

  return (
    <div
      className={`flex ${dirClass} ${wrapClass} ${alignClass} ${justifyClass} ${cardStyle} ${borderStyle} ${overflowStyle} ${hStyle} ${wStyle} ${className}`}
      style={{
        gap: gap !== undefined ? (typeof gap === 'number' ? `${gap}px` : gap) : undefined,
        padding: padding !== undefined ? (typeof padding === 'number' ? `${padding}px` : padding) : undefined,
        flex: flex !== undefined ? flex : undefined
      }}
    >
      {children}
    </div>
  );
};
