/**
 * JSAIOS - Generic Modal Overlay Primitive
 * Dialog windows and popup overlays.
 */

import React from 'react';

interface ModalProps {
  title?: string;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  title = 'Settings',
  isOpen = false,
  onClose,
  className = '',
  children
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className={`w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-100 font-mono">{title}</h2>
          {onClose && (
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-100 font-mono text-xs">
              ✕
            </button>
          )}
        </div>
        <div className="p-4 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
      </div>
    </div>
  );
};
