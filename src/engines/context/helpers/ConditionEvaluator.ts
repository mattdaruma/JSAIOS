/**
 * JSAIOS - Single-purpose helper: ConditionEvaluator
 * Evaluates conditional context rules and custom field conditions against session metadata and prompt conditions.
 */

import type { ConditionalRule, ContextItem, CustomFieldCondition } from './types';
import type { CustomFields } from '../../../kernel/types';

export interface EvaluationState {
  providerId?: string;
  modelFamily?: string;
  hasMedia?: boolean;
  metadata?: Record<string, any>;
  customFields?: CustomFields;
}

export function evaluateCustomFieldCondition(
  condition: CustomFieldCondition,
  customFields: CustomFields = {}
): boolean {
  const fieldValue = customFields[condition.field];

  switch (condition.operator) {
    case 'exists':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
    case 'equals':
      return String(fieldValue || '').toLowerCase() === String(condition.value || '').toLowerCase();
    case 'not-equals':
      return String(fieldValue || '').toLowerCase() !== String(condition.value || '').toLowerCase();
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(condition.value || '').toLowerCase());
    default:
      return false;
  }
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
      const stateVal = state.metadata?.[customKey] || state.customFields?.[customKey];
      if (customValue !== undefined && String(stateVal) !== String(customValue)) {
        continue;
      }
    }

    resultItems.push(...rule.injectedItems);
  }

  return resultItems;
}
