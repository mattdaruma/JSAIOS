/**
 * JSAIOS - Single-purpose helper: ConditionEvaluator
 * Evaluates conditional context rules against session metadata and prompt conditions.
 */

import type { ConditionalRule, ContextItem } from './types';

export interface EvaluationState {
  providerId?: string;
  modelFamily?: string;
  hasMedia?: boolean;
  metadata?: Record<string, any>;
}

export function evaluateConditionalRules(
  rules: ConditionalRule[],
  state: EvaluationState
): ContextItem[] {
  const resultItems: ContextItem[] = [];

  for (const rule of rules) {
    const { providerId, modelFamily, hasMedia, customKey, customValue } = rule.condition;

    if (providerId && state.providerId && state.providerId.toLowerCase() !== providerId.toLowerCase()) {
      continue;
    }

    if (modelFamily && state.modelFamily && !state.modelFamily.toLowerCase().includes(modelFamily.toLowerCase())) {
      continue;
    }

    if (hasMedia !== undefined && Boolean(state.hasMedia) !== hasMedia) {
      continue;
    }

    if (customKey) {
      const stateVal = state.metadata?.[customKey];
      if (customValue !== undefined && String(stateVal) !== String(customValue)) {
        continue;
      }
    }

    resultItems.push(...rule.injectedItems);
  }

  return resultItems;
}
