/**
 * JSAIOS - Headless Controller Hook: useSearchableList
 * Centralizes search, category filtering, sorting, and pagination logic.
 * 100% view-agnostic logic hook.
 */

import { useState, useMemo } from 'react';
import type { CardItem } from '../components/SearchableCardGrid';

export type ViewMode = 'grid' | 'table' | 'list';
export type SortOrder = 'asc' | 'desc';

export interface UseSearchableListOptions {
  pageSize?: number;
  initialViewMode?: ViewMode;
  initialSortField?: string;
  initialSortOrder?: SortOrder;
}

export function useSearchableList(
  items: CardItem[] = [],
  options: UseSearchableListOptions = {}
) {
  const {
    pageSize = 9,
    initialViewMode = 'grid',
    initialSortField = 'title',
    initialSortOrder = 'asc'
  } = options;

  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [sortField, setSortField] = useState<string>(initialSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSortOrder);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Extract unique category pills
  const categories = useMemo(() => {
    return Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[]));
  }, [items]);

  // Filter and Sort Items
  const processedItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
        const q = searchTerm.toLowerCase().trim();
        if (!q) return matchesCategory;

        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesDesc = item.description.toLowerCase().includes(q);
        const matchesCode = item.codeSnippet?.toLowerCase().includes(q);
        const matchesTags = item.tags?.some((t) => t.toLowerCase().includes(q));

        return matchesCategory && (matchesTitle || matchesDesc || matchesCode || matchesTags);
      })
      .sort((a, b) => {
        const valA = String((a as any)[sortField] || '').toLowerCase();
        const valB = String((b as any)[sortField] || '').toLowerCase();
        const comp = valA.localeCompare(valB);
        return sortOrder === 'asc' ? comp : -comp;
      });
  }, [items, activeCategory, searchTerm, sortField, sortOrder]);

  // Calculate Pagination
  const totalPages = Math.max(1, Math.ceil(processedItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return processedItems.slice(start, start + pageSize);
  }, [processedItems, safePage, pageSize]);

  return {
    searchTerm,
    setSearchTerm,
    activeCategory,
    setActiveCategory,
    categories,
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    totalCount: processedItems.length,
    paginatedItems
  };
}
