/**
 * JSAIOS - Chain Engine Types & Interfaces
 * Pure domain contracts for multi-step prompt workflow chains, step context control, majority voting, step outputs, and storage ports.
 */

import type { CustomFields } from '../../../kernel/types';
import type { MediaContextItem } from '../../context/helpers/types';
import type { ChatSessionOptions } from '../../chat/helpers/types';

export interface ChainStep {
  id: string;
  name: string;
  description?: string;
  enabled?: boolean;
  providerId?: string; // e.g. 'ollama', 'copilot'
  model?: string;

  // Context Packs & Prompts Selection
  selectedPackIds?: string[];
  selectedPromptIds?: string[];

  // User Prompt & Field Selection
  includeUserPrompt?: boolean;
  selectedUserFieldIds?: string[]; // Specific custom field keys to include
  includeUserMediaItems?: boolean;

  // Message History Control
  includeMessageLog?: boolean;
  messageLogTurnLimit?: number; // Max number of history turns
  messageLogCharLimit?: number; // Max characters per history turn
  includeHistoryMedia?: boolean;
  selectedUserHistoryFieldIds?: string[]; // Custom field keys for user history turns
  selectedAssistantHistoryFieldIds?: string[]; // Custom field keys for assistant history turns

  // Inter-Step Output & State Control
  includePreviousStepOutputs?: boolean;
  selectedStepOutputFieldIds?: string[]; // Specific JSON keys from previous step output

  // Majority Voting & Self-Consistency Consensus
  enableMajorityVote?: boolean;
  sampleCount?: number; // Default: 3
  voteStrategy?: 'consensus-critic' | 'exact-match';

  // Output Schema & Execution Overrides
  responseJsonSchema?: string;
  enableStructuredResponse?: boolean;
  enableThinking?: boolean;
  temperature?: number;
  options?: Partial<ChatSessionOptions>;
}

export interface ChainDefinition {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  defaultProviderId?: string;
  defaultModel?: string;
  steps: ChainStep[];
}

export interface ChainStepExecutionResult {
  stepId: string;
  stepName: string;
  outputPrompt: string;
  responseContent: string;
  parsedJsonObject?: Record<string, any>;
  sampledOutputs?: string[];
  majorityVoteApplied?: boolean;
  durationMs: number;
}

export interface ChainExecutionOptions {
  chainId: string;
  sessionId?: string;
  userPrompt?: string;
  customFields?: CustomFields;
  mediaItems?: MediaContextItem[];
}

export interface ChainExecutionSummary {
  chainId: string;
  chainName: string;
  success: boolean;
  stepResults: ChainStepExecutionResult[];
  finalOutput: string;
  totalDurationMs: number;
}

export interface IChainStorage {
  loadChain(id: string): Promise<ChainDefinition | null>;
  saveChain(chain: ChainDefinition): Promise<void>;
  listChains(): Promise<ChainDefinition[]>;
  deleteChain(id: string): Promise<boolean>;
}
