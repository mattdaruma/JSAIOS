/**
 * JSAIOS - Generic Component: SearchableCardGrid
 * Reusable React component that renders a real-time search input with responsive card grid.
 * 100% generic primitive.
 */

import React, { useState } from 'react';
import { Search } from 'lucide-react';

export interface CardItem {
  id: string;
  title: string;
  category?: string;
  badge?: string;
  description: string;
  codeSnippet?: string;
  tags?: string[];
}

export interface SearchableCardGridProps {
  title?: string;
  placeholder?: string;
  items: CardItem[];
  onSelectCard?: (item: CardItem) => void;
}

export const SearchableCardGrid: React.FC<SearchableCardGridProps> = ({
  title,
  placeholder = 'Search cards...',
  items = [],
  onSelectCard
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = Array.from(
    new Set(items.map((i) => i.category).filter(Boolean) as string[])
  );

  const filteredItems = items.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchesCategory;

    const matchesTitle = item.title.toLowerCase().includes(q);
    const matchesDesc = item.description.toLowerCase().includes(q);
    const matchesCode = item.codeSnippet?.toLowerCase().includes(q);
    const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));

    return matchesCategory && (matchesTitle || matchesDesc || matchesCode || matchesTags);
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      {title && <h2 className="text-xl font-bold text-zinc-100">{title}</h2>}

      {/* Search Input and Category Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                activeCategory === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              All ({items.length})
            </button>
            {categories.map((cat) => {
              const count = items.filter((i) => i.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Card Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center bg-zinc-900/50 border border-zinc-800/80 rounded-xl text-zinc-500 text-sm">
          No matching documentation items found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectCard?.(item)}
              className="bg-zinc-900/80 border border-zinc-800/80 hover:border-cyan-500/40 rounded-xl p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:shadow-cyan-500/5 group cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-zinc-100 group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>
                  {item.badge && (
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {item.badge}
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                  {item.description}
                </p>

                {item.codeSnippet && (
                  <pre className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 text-[11px] font-mono text-cyan-300/90 overflow-x-auto mb-3">
                    <code>{item.codeSnippet}</code>
                  </pre>
                )}
              </div>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-zinc-800/50">
                  {item.tags.map((tag) => (
                    <span key={tag} className="text-[10px] font-mono text-zinc-500">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
