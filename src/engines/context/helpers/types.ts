/**
 * JSAIOS - Context Management Engine Types & Interfaces
 * Pure domain contracts for templates, conditional context rules, media items, and storage ports.
 */

import type { CustomFields } from '../../../kernel/types';

export type ContextItemType = 'system-directive' | 'text-block' | 'media-item' | 'code-ast' | 'tool-definition';

export type ContextMergeStrategy = 'single-system-prompt' | 'multi-directives';

export interface MediaContextItem {
  id: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' | 'audio/wav' | 'video/mp4';
  dataBase64?: string;
  uri?: string;
  width?: number;
  height?: number;
  altText?: string;
  sourceService?: string; // e.g. 'comfyui', 'local-file'
}

export interface ContextItem {
  id: string;
  type: ContextItemType;
  content: string;
  priority: number; // Higher integer = higher retention priority during token pruning
  sticky?: boolean;
  metadata?: Record<string, any>;
  media?: MediaContextItem;
}

export interface SystemDirectiveTemplate {
  id: string;
  name: string;
  template: string; // e.g. "You are an expert {{language}} developer working in {{project_name}}."
  defaultVariables?: CustomFields;
  description?: string;
  tags?: string[];
}

export interface CustomFieldCondition {
  field: string;
  operator: 'equals' | 'contains' | 'exists' | 'not-equals';
  value?: string;
}

export interface ContextPackItem {
  id: string;
  template: string;
  priority: number;
  condition?: CustomFieldCondition;
}

export interface ContextPack {
  id: string;
  name: string;
  description?: string;
  mergeStrategy: ContextMergeStrategy;
  items: ContextPackItem[];
  defaultCustomFields?: CustomFields;
}

export interface ConditionalRule {
  id: string;
  description?: string;
  condition: {
    providerId?: string;
    modelFamily?: string;
    hasMedia?: boolean;
    customKey?: string;
    customValue?: string;
  };
  injectedItems: ContextItem[];
}

export interface AssembledContext {
  systemPrompt: string;
  contextItems: ContextItem[];
  mediaItems: MediaContextItem[];
  estimatedTokens: number;
  customFields?: CustomFields;
}

export interface IContextTemplateStorage {
  loadTemplate(id: string): Promise<SystemDirectiveTemplate | null>;
  saveTemplate(template: SystemDirectiveTemplate): Promise<void>;
  listTemplates(): Promise<SystemDirectiveTemplate[]>;
  deleteTemplate(id: string): Promise<boolean>;

  loadPack?(id: string): Promise<ContextPack | null>;
  savePack?(pack: ContextPack): Promise<void>;
  listPacks?(): Promise<ContextPack[]>;
  deletePack?(id: string): Promise<boolean>;
}
