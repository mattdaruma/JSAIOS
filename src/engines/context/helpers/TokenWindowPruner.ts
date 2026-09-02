/**
 * JSAIOS - Single-purpose helper: TokenWindowPruner
 * Uses ITokenizerService to prune lower-priority context items to fit token budget limits.
 */

import type { ContextItem } from './types';
import type { ITokenizerService } from '../../../services/tokenizer/ITokenizerService';

export function pruneContextItems(
  items: ContextItem[],
  maxTokenBudget: number,
  tokenizer: ITokenizerService,
  reservedTokens: number = 0
): ContextItem[] {
  const availableBudget = Math.max(0, maxTokenBudget - reservedTokens);
  let currentUsage = 0;

  // Sticky items first, then sort by priority descending
  const sorted = [...items].sort((a, b) => {
    if (a.sticky && !b.sticky) return -1;
    if (!a.sticky && b.sticky) return 1;
    return b.priority - a.priority;
  });

  const retained: ContextItem[] = [];

  for (const item of sorted) {
    const itemTokens = tokenizer.countTokens(item.content);
    if (currentUsage + itemTokens <= availableBudget || item.sticky) {
      retained.push(item);
      currentUsage += itemTokens;
    }
  }

  // Restore original ordering
  return items.filter((item) => retained.includes(item));
}
