/**
 * JSAIOS - Single-purpose helper: TokenWindowPruner
 * Estimates token counts and prunes lower-priority context items to fit token budget limits.
 */

import type { ContextItem } from './types';

export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Standard heuristic: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export function pruneContextItems(
  items: ContextItem[],
  maxTokenBudget: number,
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
    const itemTokens = estimateTokenCount(item.content);
    if (currentUsage + itemTokens <= availableBudget || item.sticky) {
      retained.push(item);
      currentUsage += itemTokens;
    }
  }

  // Restore original ordering
  return items.filter((item) => retained.includes(item));
}
