/**
 * JSAIOS - Generic SidePanel Container
 * Collapsible drawer / sidebar container for navigation, settings, or secondary panes.
 */

import React from 'react';

interface SidePanelProps {
  position?: 'left' | 'right';
  width?: string;
  isOpen?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  position = 'left',
  width = '320px',
  isOpen = true,
  children
}) => {
  if (!isOpen) return null;
  const borderSide = position === 'left' ? 'border-r' : 'border-l';

  return (
    <aside
      className={`h-full bg-zinc-950 border-zinc-800 ${borderSide} flex flex-col overflow-y-auto custom-scrollbar`}
      style={{ width }}
    >
      {children}
    </aside>
  );
};
