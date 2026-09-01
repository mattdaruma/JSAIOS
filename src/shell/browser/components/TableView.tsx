/**
 * JSAIOS - Generic Component: TableView
 * Bite-sized (<50 lines) presentation view renderer for responsive data table.
 */

import React from 'react';
import type { CardItem } from './SearchableCardGrid';

export interface TableViewProps {
  items: CardItem[];
  onSelectItem?: (item: CardItem) => void;
}

export const TableView: React.FC<TableViewProps> = ({ items = [], onSelectItem }) => {
  if (items.length === 0) {
    return <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 text-sm">No items found.</div>;
  }

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-x-auto">
      <table className="w-full text-left text-xs text-zinc-300 border-collapse">
        <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-mono">
          <tr>
            <th className="py-3 px-4">Title</th>
            <th className="py-3 px-4">Category</th>
            <th className="py-3 px-4">Badge</th>
            <th className="py-3 px-4">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {items.map((item) => (
            <tr
              key={item.id}
              onClick={() => onSelectItem?.(item)}
              className="hover:bg-zinc-800/40 transition-colors cursor-pointer"
            >
              <td className="py-3 px-4 font-semibold text-zinc-100">{item.title}</td>
              <td className="py-3 px-4 font-mono text-zinc-400 capitalize">{item.category || 'general'}</td>
              <td className="py-3 px-4">
                {item.badge ? (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                    {item.badge}
                  </span>
                ) : (
                  '-'
                )}
              </td>
              <td className="py-3 px-4 text-zinc-400 max-w-md truncate">{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
