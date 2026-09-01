/**
 * JSAIOS - Generic Component Adapter: SearchableCardGrid
 * Delegates directly to SearchableDataContainer composite UI.
 */

import React from 'react';
import { SearchableDataContainer, type SearchableDataContainerProps } from './SearchableDataContainer';
export type { CardItem } from './SearchableDataContainer';

export interface SearchableCardGridProps extends SearchableDataContainerProps {
  onSelectCard?: SearchableDataContainerProps['onSelectItem'];
}

export const SearchableCardGrid: React.FC<SearchableCardGridProps> = ({ onSelectCard, ...props }) => {
  return <SearchableDataContainer {...props} onSelectItem={onSelectCard || props.onSelectItem} />;
};
