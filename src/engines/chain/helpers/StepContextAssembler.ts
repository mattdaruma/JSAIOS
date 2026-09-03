/**
 * JSAIOS - Single-purpose helper: StepContextAssembler
 * Assembles the exact prompt, custom fields, history turns, and media attachments for an individual chain step turn.
 */

import type { CustomFields } from '../../../kernel/types';
import type { ChainStep, ChainStepExecutionResult } from './types';
import type { ChatTurn } from '../../chat/helpers/ChatSession';

export interface StepAssembledInput {
  computedUserPrompt: string;
  stepCustomFields: CustomFields;
  historyTurnsToInclude: ChatTurn[];
}

export function assembleStepContext(
  step: ChainStep,
  userPrompt: string = '',
  customFields: CustomFields = {},
  previousResults: ChainStepExecutionResult[] = [],
  fullHistory: ChatTurn[] = []
): StepAssembledInput {
  const stepCustomFields: CustomFields = {};
  const promptParts: string[] = [];

  // 1. User Prompt Handling
  if (step.includeUserPrompt !== false && userPrompt.trim()) {
    promptParts.push(userPrompt.trim());
  }

  // 2. Custom Field Selection
  if (step.selectedUserFieldIds && step.selectedUserFieldIds.length > 0) {
    for (const fieldKey of step.selectedUserFieldIds) {
      if (customFields[fieldKey] !== undefined) {
        stepCustomFields[fieldKey] = customFields[fieldKey];
      }
    }
  } else {
    Object.assign(stepCustomFields, customFields);
  }

  // 3. Inter-Step Outputs Inclusion
  if (step.includePreviousStepOutputs !== false && previousResults.length > 0) {
    for (const prev of previousResults) {
      promptParts.push(`\n--- [Output from Step '${prev.stepName}'] ---\n${prev.responseContent}`);

      if (step.selectedStepOutputFieldIds && prev.parsedJsonObject) {
        for (const fieldKey of step.selectedStepOutputFieldIds) {
          if (prev.parsedJsonObject[fieldKey] !== undefined) {
            stepCustomFields[`step_${prev.stepId}_${fieldKey}`] = String(prev.parsedJsonObject[fieldKey]);
          }
        }
      }
    }
  }

  // 4. Message History Filtering & Character Limits
  let historyTurnsToInclude: ChatTurn[] = [];

  if (step.includeMessageLog !== false && fullHistory.length > 0) {
    let sliced = fullHistory;
    if (step.messageLogTurnLimit && step.messageLogTurnLimit > 0) {
      sliced = fullHistory.slice(-step.messageLogTurnLimit);
    }

    historyTurnsToInclude = sliced.map((turn) => {
      let content = turn.content;
      if (step.messageLogCharLimit && content.length > step.messageLogCharLimit) {
        content = content.substring(0, step.messageLogCharLimit) + '... [truncated]';
      }

      // Filter custom fields per role
      let filteredTurnFields: CustomFields | undefined;
      if (turn.customFields) {
        filteredTurnFields = {};
        const allowedKeys = turn.role === 'user' ? step.selectedUserHistoryFieldIds : step.selectedAssistantHistoryFieldIds;

        if (allowedKeys && allowedKeys.length > 0) {
          for (const k of allowedKeys) {
            if (turn.customFields[k] !== undefined) {
              filteredTurnFields[k] = turn.customFields[k];
            }
          }
        } else {
          filteredTurnFields = { ...turn.customFields };
        }
      }

      return {
        ...turn,
        content,
        customFields: filteredTurnFields,
        imagePath: step.includeHistoryMedia !== false ? turn.imagePath : undefined
      };
    });
  }

  return {
    computedUserPrompt: promptParts.join('\n\n'),
    stepCustomFields,
    historyTurnsToInclude
  };
}
