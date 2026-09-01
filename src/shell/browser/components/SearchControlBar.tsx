/**
 * JSAIOS - Generic Component: SearchControlBar
 * Modular search toolbar with input, category pills, sort selector, and view mode toggle buttons.
 * Bite-sized presentation primitive.
 */

import React from 'react';
import { Search, LayoutGrid, Table } from 'lucide-react';
import type { ViewMode, SortOrder } from '../hooks/useSearchableList';

export interface SearchControlBarProps {
  searchTerm: string;
  onSearchChange: (q: string) => void;
  categories: string[];
  activeCategory: string;
  onCategoryChange: (cat: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortField: string;
  onSortFieldChange: (field: string) => void;
  sortOrder: SortOrder;
  onSortOrderToggle: () => void;
  placeholder?: string;
}

export const SearchControlBar: React.FC<SearchControlBarProps> = ({
  searchTerm,
  onSearchChange,
  categories,
  activeCategory,
  onCategoryChange,
  viewMode,
  onViewModeChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderToggle,
  placeholder = 'Search items...'
}) => {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Sort & View Mode Toggles */}
        <div className="flex items-center gap-2">
          {/* Sort Selector */}
          <select
            value={sortField}
            onChange={(e) => onSortFieldChange(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-2.5 py-2 focus:outline-none focus:border-cyan-500"
          >
            <option value="title">Sort by Title</option>
            <option value="category">Sort by Category</option>
          </select>

          <button
            onClick={onSortOrderToggle}
            className="px-2.5 py-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono rounded-lg hover:text-zinc-100 transition-colors cursor-pointer"
            title="Toggle sort direction"
          >
            {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
          </button>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
            <button
              onClick={() => onViewModeChange('grid')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'grid' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-400' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Table View"
            >
              <Table className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => onCategoryChange('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
