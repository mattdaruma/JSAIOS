/**
 * JSAIOS - Generic Component: CardGridView
 * Bite-sized (<50 lines) presentation view renderer for responsive card grid.
 */

import React from 'react';
import type { CardItem } from './SearchableCardGrid';

export interface CardGridViewProps {
  items: CardItem[];
  onSelectCard?: (item: CardItem) => void;
}

export const CardGridView: React.FC<CardGridViewProps> = ({ items = [], onSelectCard }) => {
  if (items.length === 0) {
    return <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 text-sm">No items found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelectCard?.(item)}
          className="bg-zinc-900/80 border border-zinc-800/80 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-cyan-500/5 group cursor-pointer"
        >
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">{item.title}</h3>
              {item.badge && (
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed mb-3">{item.description}</p>
            {item.codeSnippet && (
              <pre className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 text-[11px] font-mono text-cyan-300/90 overflow-x-auto mb-3">
                <code>{item.codeSnippet}</code>
              </pre>
            )}
          </div>
          {item.tags && item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-zinc-800/50">
              {item.tags.map((t) => (
                <span key={t} className="text-[10px] font-mono text-zinc-500">#{t}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
