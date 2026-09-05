/**
 * JSAIOS - Engine: ContextEngine
 * Core OS domain engine managing system prompt templates, Context Packs (sets), conditional context rules,
 * multimodal media attachments, custom fields, and token budget window pruning.
 */

import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { CustomFields } from '../../kernel/types';
import type {
  ContextItem, SystemDirectiveTemplate, MediaContextItem, ConditionalRule,
  AssembledContext, IContextTemplateStorage, ContextPack, ContextPackItem,
  ContextMergeStrategy, PromptResponseStructure
} from './helpers/types';
import type { ITokenizerService } from '../../services/tokenizer/ITokenizerService';
import { HeuristicTokenizerService } from '../../services/tokenizer/HeuristicTokenizerService';
import { interpolateTemplate } from './helpers/ContextTemplate';
import { evaluateConditionalRules, evaluateCustomFieldCondition, type EvaluationState } from './helpers/ConditionEvaluator';
import { pruneContextItems } from './helpers/TokenWindowPruner';
import { StructureManager } from './helpers/StructureManager';
import { ContextPackManager } from './helpers/ContextPackManager';

export class ContextEngine {
  private templates: Map<string, SystemDirectiveTemplate> = new Map();
  private packManager: ContextPackManager;
  private structureManager: StructureManager;
  private conditionalRules: ConditionalRule[] = [];
  private activeContextItems: Map<string, ContextItem> = new Map();
  private tokenizer: ITokenizerService;

  constructor(
    private kernel?: HoneyKernel,
    private storageAdapter?: IContextTemplateStorage,
    tokenizerAdapter?: ITokenizerService
  ) {
    this.tokenizer = tokenizerAdapter || new HeuristicTokenizerService();
    this.packManager = new ContextPackManager(storageAdapter);
    this.structureManager = new StructureManager(storageAdapter);
  }

  public registerTemplate(template: SystemDirectiveTemplate): void {
    this.templates.set(template.id, template);
  }

  public getTemplate(id: string): SystemDirectiveTemplate | undefined {
    return this.templates.get(id);
  }

  public listTemplates(): SystemDirectiveTemplate[] {
    return Array.from(this.templates.values());
  }

  public registerPack(pack: ContextPack): void {
    this.packManager.registerPack(pack);
  }

  public getPack(id: string): ContextPack | undefined {
    return this.packManager.getPack(id);
  }

  public listPacks(): ContextPack[] {
    return this.packManager.listPacks();
  }

  public createPack(id: string, name: string, mergeStrategy: ContextMergeStrategy = 'single-system-prompt', defaultCustomFields: CustomFields = {}): ContextPack {
    return this.packManager.createPack(id, name, mergeStrategy, defaultCustomFields);
  }

  public addPromptToPack(packId: string, item: ContextPackItem): boolean {
    return this.packManager.addPromptToPack(packId, item);
  }

  public registerStructure(structure: PromptResponseStructure): void {
    this.structureManager.registerStructure(structure);
  }

  public getStructure(id: string): PromptResponseStructure | undefined {
    return this.structureManager.getStructure(id);
  }

  public listStructures(): PromptResponseStructure[] {
    return this.structureManager.listStructures();
  }

  public createStructure(
    id: string,
    name: string,
    outputSchema?: Record<string, any>,
    defaultVariables: CustomFields = {},
    description?: string
  ): PromptResponseStructure {
    return this.structureManager.createStructure(id, name, outputSchema, defaultVariables, description);
  }

  public deleteStructure(id: string): boolean {
    return this.structureManager.deleteStructure(id);
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
    structureId?: string;
    variables?: CustomFields;
    customFields?: CustomFields;
    evaluationState?: EvaluationState;
    maxTokenBudget?: number;
  }): AssembledContext {
    const {
      templateId,
      packId,
      structureId,
      variables = {},
      customFields = {},
      evaluationState = {},
      maxTokenBudget = 4096
    } = options;

    let mergedCustomFields: CustomFields = { ...variables, ...customFields };
    let outputSchema: Record<string, any> | undefined;

    // Process Structure Defaults & Output Schema
    if (structureId) {
      const struct = this.structureManager.getStructure(structureId);
      if (struct) {
        mergedCustomFields = { ...struct.defaultVariables, ...mergedCustomFields };
        outputSchema = struct.outputSchema;
      }
    }

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
      const pack = this.packManager.getPack(packId);
      if (pack) {
        const packFields = { ...pack.defaultCustomFields, ...mergedCustomFields };

        for (const packItem of pack.items) {
          // Evaluate condition if present
          if (packItem.condition) {
            const isMatch = evaluateCustomFieldCondition(packItem.condition, packFields);
            if (!isMatch) continue;
          }

          // Resolve template content from standalone template or inline fallback
          let templateStr = packItem.inlineTemplate || '';
          if (packItem.promptId && this.templates.has(packItem.promptId)) {
            templateStr = this.templates.get(packItem.promptId)!.template;
          }

          const interpolated = interpolateTemplate(
            { id: packItem.id, name: packItem.id, template: templateStr },
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
      customFields: mergedCustomFields,
      outputSchema
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
      await this.packManager.loadFromStorage();
      await this.structureManager.loadFromStorage();
    }
  }
}
