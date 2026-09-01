/**
 * JSAIOS - Generic Composite Component: SearchableDataContainer
 * Unites headless useSearchableList controller hook with SearchControlBar, CardGridView/TableView, and PaginationFooter.
 */

import React from 'react';
import { useSearchableList } from '../hooks/useSearchableList';
import { SearchControlBar } from './SearchControlBar';
import { CardGridView } from './CardGridView';
import { TableView } from './TableView';
import { PaginationFooter } from './PaginationFooter';
import type { CardItem } from './SearchableCardGrid';

export interface SearchableDataContainerProps {
  title?: string;
  placeholder?: string;
  items: CardItem[];
  pageSize?: number;
  onSelectItem?: (item: CardItem) => void;
}

export const SearchableDataContainer: React.FC<SearchableDataContainerProps> = ({
  title,
  placeholder,
  items = [],
  pageSize = 9,
  onSelectItem
}) => {
  const {
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
    currentPage,
    setCurrentPage,
    totalPages,
    totalCount,
    paginatedItems
  } = useSearchableList(items, { pageSize });

  return (
    <div className="flex flex-col gap-4 w-full">
      {title && <h2 className="text-xl font-bold text-zinc-100">{title}</h2>}

      <SearchControlBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortOrder={sortOrder}
        onSortOrderToggle={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
        placeholder={placeholder}
      />

      {viewMode === 'table' ? (
        <TableView items={paginatedItems} onSelectItem={onSelectItem} />
      ) : (
        <CardGridView items={paginatedItems} onSelectCard={onSelectItem} />
      )}

      <PaginationFooter
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
