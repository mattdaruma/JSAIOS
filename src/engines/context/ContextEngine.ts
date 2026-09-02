/**
 * JSAIOS - Engine: ContextEngine
 * Core OS domain engine managing system prompt templates, conditional context rules,
 * multimodal media attachments, and token budget window pruning.
 */

import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type {
  ContextItem,
  SystemDirectiveTemplate,
  MediaContextItem,
  ConditionalRule,
  AssembledContext,
  IContextTemplateStorage
} from './helpers/types';
import { interpolateTemplate } from './helpers/ContextTemplate';
import { evaluateConditionalRules, type EvaluationState } from './helpers/ConditionEvaluator';
import { estimateTokenCount, pruneContextItems } from './helpers/TokenWindowPruner';

export class ContextEngine {
  private templates: Map<string, SystemDirectiveTemplate> = new Map();
  private conditionalRules: ConditionalRule[] = [];
  private activeContextItems: Map<string, ContextItem> = new Map();

  constructor(
    private kernel?: HoneyKernel,
    private storageAdapter?: IContextTemplateStorage
  ) {}

  public registerTemplate(template: SystemDirectiveTemplate): void {
    this.templates.set(template.id, template);
  }

  public getTemplate(id: string): SystemDirectiveTemplate | undefined {
    return this.templates.get(id);
  }

  public registerConditionalRule(rule: ConditionalRule): void {
    this.conditionalRules.push(rule);
  }

  public addContextItem(item: ContextItem): void {
    this.activeContextItems.set(item.id, item);
  }

  public removeContextItem(id: string): boolean {
    return this.activeContextItems.delete(id);
  }

  public clearContextItems(): void {
    this.activeContextItems.clear();
  }

  public assembleContext(options: {
    templateId?: string;
    variables?: Record<string, string>;
    evaluationState?: EvaluationState;
    maxTokenBudget?: number;
  }): AssembledContext {
    const { templateId, variables = {}, evaluationState = {}, maxTokenBudget = 4096 } = options;

    let systemPrompt = '';
    if (templateId) {
      const tmpl = this.templates.get(templateId);
      if (tmpl) {
        systemPrompt = interpolateTemplate(tmpl, variables);
      }
    }

    const items = Array.from(this.activeContextItems.values());

    // Evaluate conditional rules
    const injected = evaluateConditionalRules(this.conditionalRules, evaluationState);
    const combined = [...items, ...injected];

    // Collect media items
    const mediaItems: MediaContextItem[] = combined
      .map((i) => i.media)
      .filter(Boolean) as MediaContextItem[];

    // Estimate & Prune
    const systemTokens = estimateTokenCount(systemPrompt);
    const prunedItems = pruneContextItems(combined, maxTokenBudget, systemTokens);

    const itemsTokens = prunedItems.reduce((sum, item) => sum + estimateTokenCount(item.content), 0);
    const totalTokens = systemTokens + itemsTokens;

    return {
      systemPrompt,
      contextItems: prunedItems,
      mediaItems,
      estimatedTokens: totalTokens
    };
  }

  public async saveTemplateToStorage(template: SystemDirectiveTemplate): Promise<void> {
    this.registerTemplate(template);
    if (this.storageAdapter) {
      await this.storageAdapter.saveTemplate(template);
    }
  }

  public async loadTemplatesFromStorage(): Promise<void> {
    if (this.storageAdapter) {
      const stored = await this.storageAdapter.listTemplates();
      for (const tmpl of stored) {
        this.templates.set(tmpl.id, tmpl);
      }
    }
  }
}
