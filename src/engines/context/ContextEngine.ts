/**
 * JSAIOS - Engine: ContextEngine
 * Core OS domain engine managing system prompt templates, Context Packs (sets), conditional context rules,
 * multimodal media attachments, custom fields, and token budget window pruning.
 */

import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { CustomFields } from '../../kernel/types';
import type {
  ContextItem,
  SystemDirectiveTemplate,
  MediaContextItem,
  ConditionalRule,
  AssembledContext,
  IContextTemplateStorage,
  ContextPack,
  ContextPackItem,
  ContextMergeStrategy
} from './helpers/types';
import type { ITokenizerService } from '../../services/tokenizer/ITokenizerService';
import { HeuristicTokenizerService } from '../../services/tokenizer/HeuristicTokenizerService';
import { interpolateTemplate } from './helpers/ContextTemplate';
import { evaluateConditionalRules, evaluateCustomFieldCondition, type EvaluationState } from './helpers/ConditionEvaluator';
import { pruneContextItems } from './helpers/TokenWindowPruner';

export class ContextEngine {
  private templates: Map<string, SystemDirectiveTemplate> = new Map();
  private packs: Map<string, ContextPack> = new Map();
  private conditionalRules: ConditionalRule[] = [];
  private activeContextItems: Map<string, ContextItem> = new Map();
  private tokenizer: ITokenizerService;

  constructor(
    private kernel?: HoneyKernel,
    private storageAdapter?: IContextTemplateStorage,
    tokenizerAdapter?: ITokenizerService
  ) {
    this.tokenizer = tokenizerAdapter || new HeuristicTokenizerService();
  }

  public registerTemplate(template: SystemDirectiveTemplate): void {
    this.templates.set(template.id, template);
  }

  public getTemplate(id: string): SystemDirectiveTemplate | undefined {
    return this.templates.get(id);
  }

  public registerPack(pack: ContextPack): void {
    this.packs.set(pack.id, pack);
  }

  public getPack(id: string): ContextPack | undefined {
    return this.packs.get(id);
  }

  public listPacks(): ContextPack[] {
    return Array.from(this.packs.values());
  }

  public createPack(id: string, name: string, mergeStrategy: ContextMergeStrategy = 'single-system-prompt', defaultCustomFields: CustomFields = {}): ContextPack {
    const pack: ContextPack = {
      id,
      name,
      mergeStrategy,
      items: [],
      defaultCustomFields
    };
    this.registerPack(pack);
    if (this.storageAdapter && this.storageAdapter.savePack) {
      this.storageAdapter.savePack(pack).catch(() => {});
    }
    return pack;
  }

  public addPromptToPack(packId: string, item: ContextPackItem): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;
    pack.items = pack.items.filter((i) => i.id !== item.id);
    pack.items.push(item);
    if (this.storageAdapter && this.storageAdapter.savePack) {
      this.storageAdapter.savePack(pack).catch(() => {});
    }
    return true;
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
    packId?: string;
    variables?: CustomFields;
    customFields?: CustomFields;
    evaluationState?: EvaluationState;
    maxTokenBudget?: number;
  }): AssembledContext {
    const {
      templateId,
      packId,
      variables = {},
      customFields = {},
      evaluationState = {},
      maxTokenBudget = 4096
    } = options;

    const mergedCustomFields: CustomFields = { ...variables, ...customFields };
    const contextItemsToAssemble: ContextItem[] = Array.from(this.activeContextItems.values());
    const promptParts: string[] = [];

    // 1. Single Template Processing
    if (templateId) {
      const tmpl = this.templates.get(templateId);
      if (tmpl) {
        promptParts.push(interpolateTemplate(tmpl, mergedCustomFields));
      }
    }

    // 2. Context Pack Set Processing
    if (packId) {
      const pack = this.packs.get(packId);
      if (pack) {
        const packFields = { ...pack.defaultCustomFields, ...mergedCustomFields };

        for (const packItem of pack.items) {
          // Evaluate condition if present
          if (packItem.condition) {
            const isMatch = evaluateCustomFieldCondition(packItem.condition, packFields);
            if (!isMatch) continue;
          }

          // Interpolate template content
          const interpolated = interpolateTemplate(
            { id: packItem.id, name: packItem.id, template: packItem.template },
            packFields
          );

          if (pack.mergeStrategy === 'multi-directives') {
            contextItemsToAssemble.push({
              id: packItem.id,
              type: 'system-directive',
              content: interpolated,
              priority: packItem.priority
            });
          } else {
            promptParts.push(interpolated);
          }
        }
      }
    }

    const systemPrompt = promptParts.join('\n\n');

    // Evaluate conditional rules
    const injected = evaluateConditionalRules(this.conditionalRules, {
      ...evaluationState,
      customFields: mergedCustomFields
    });
    const combined = [...contextItemsToAssemble, ...injected];

    // Collect media items
    const mediaItems: MediaContextItem[] = combined
      .map((i) => i.media)
      .filter(Boolean) as MediaContextItem[];

    // Estimate & Prune using ITokenizerService
    const systemTokens = this.tokenizer.countTokens(systemPrompt);
    const prunedItems = pruneContextItems(combined, maxTokenBudget, this.tokenizer, systemTokens);

    const itemsTokens = prunedItems.reduce((sum, item) => sum + this.tokenizer.countTokens(item.content), 0);
    const totalTokens = systemTokens + itemsTokens;

    return {
      systemPrompt,
      contextItems: prunedItems,
      mediaItems,
      estimatedTokens: totalTokens,
      customFields: mergedCustomFields
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
      if (this.storageAdapter.listPacks) {
        const storedPacks = await this.storageAdapter.listPacks();
        for (const pack of storedPacks) {
          this.packs.set(pack.id, pack);
        }
      }
    }
  }
}
