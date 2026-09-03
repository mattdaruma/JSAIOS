/**
 * JSAIOS - Engine: ChainEngine
 * Core OS domain engine managing multi-step workflow chains, step context configuration,
 * inter-step output propagation, and sequential turn orchestration.
 * 100% platform-agnostic: zero dependencies on fs, DOM, or process stdout.
 */

import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { ChatEngine } from '../chat/ChatEngine';
import type { ContextEngine } from '../context/ContextEngine';
import type {
  ChainDefinition,
  ChainStep,
  ChainExecutionOptions,
  ChainExecutionSummary,
  ChainStepExecutionResult,
  IChainStorage
} from './helpers/types';
import { assembleStepContext } from './helpers/StepContextAssembler';

export class ChainEngine {
  private chains: Map<string, ChainDefinition> = new Map();

  constructor(
    private kernel?: HoneyKernel,
    private chatEngine?: ChatEngine,
    private contextEngine?: ContextEngine,
    private storageAdapter?: IChainStorage
  ) {}

  public registerChain(chain: ChainDefinition): void {
    this.chains.set(chain.id, chain);
    if (this.storageAdapter) {
      this.storageAdapter.saveChain(chain).catch(() => {});
    }
  }

  public getChain(id: string): ChainDefinition | undefined {
    return this.chains.get(id);
  }

  public listChains(): ChainDefinition[] {
    return Array.from(this.chains.values());
  }

  public createChain(id: string, name: string, description?: string): ChainDefinition {
    const chain: ChainDefinition = {
      id,
      name,
      description,
      enabled: true,
      steps: []
    };
    this.registerChain(chain);
    return chain;
  }

  public addStepToChain(chainId: string, step: ChainStep): boolean {
    const chain = this.chains.get(chainId);
    if (!chain) return false;
    chain.steps = chain.steps.filter((s) => s.id !== step.id);
    chain.steps.push(step);
    if (this.storageAdapter) {
      this.storageAdapter.saveChain(chain).catch(() => {});
    }
    return true;
  }

  public async executeChain(
    options: ChainExecutionOptions,
    onStepResult?: (result: ChainStepExecutionResult) => void
  ): Promise<ChainExecutionSummary> {
    const { chainId, sessionId, userPrompt = '', customFields = {} } = options;
    const chain = this.chains.get(chainId);

    if (!chain) {
      throw new Error(`Chain '${chainId}' not found in ChainEngine.`);
    }

    const startTime = Date.now();
    const stepResults: ChainStepExecutionResult[] = [];

    // Retrieve active chat session history if chatEngine and sessionId provided
    let fullHistory: any[] = [];
    if (this.chatEngine && sessionId) {
      fullHistory = this.chatEngine.getSessionHistory(sessionId) || [];
    }

    for (const step of chain.steps) {
      if (step.enabled === false) continue;

      const stepStart = Date.now();
      const assembled = assembleStepContext(step, userPrompt, customFields, stepResults, fullHistory);

      // Assemble system prompt from step's selected packs and templates
      let stepSystemPrompt = '';
      if (this.contextEngine) {
        const packParts: string[] = [];
        if (step.selectedPackIds) {
          for (const packId of step.selectedPackIds) {
            const packCtx = this.contextEngine.assembleContext({ packId, customFields: assembled.stepCustomFields });
            if (packCtx.systemPrompt) packParts.push(packCtx.systemPrompt);
          }
        }
        if (step.selectedPromptIds) {
          for (const promptId of step.selectedPromptIds) {
            const tmplCtx = this.contextEngine.assembleContext({ templateId: promptId, customFields: assembled.stepCustomFields });
            if (tmplCtx.systemPrompt) packParts.push(tmplCtx.systemPrompt);
          }
        }
        stepSystemPrompt = packParts.join('\n\n');
      }

      // Execute step turn via ChatEngine or mock fallback
      let stepOutput = '';
      if (this.chatEngine && sessionId) {
        stepOutput = await this.chatEngine.executeTurn({
          sessionId,
          userPrompt: assembled.computedUserPrompt,
          options: step.temperature !== undefined ? { temperature: step.temperature } : undefined
        });
      } else {
        stepOutput = `[Step '${step.name}' Output for prompt: "${assembled.computedUserPrompt}"]`;
      }

      // Attempt parsing JSON output if responseJsonSchema or structured response enabled
      let parsedJsonObject: Record<string, any> | undefined;
      try {
        const jsonMatch = stepOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsedJsonObject = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback
      }

      const result: ChainStepExecutionResult = {
        stepId: step.id,
        stepName: step.name,
        outputPrompt: assembled.computedUserPrompt,
        responseContent: stepOutput,
        parsedJsonObject,
        durationMs: Date.now() - stepStart
      };

      stepResults.push(result);
      if (onStepResult) onStepResult(result);
    }

    const lastResult = stepResults[stepResults.length - 1];

    return {
      chainId: chain.id,
      chainName: chain.name,
      success: true,
      stepResults,
      finalOutput: lastResult ? lastResult.responseContent : '',
      totalDurationMs: Date.now() - startTime
    };
  }

  public async loadChainsFromStorage(): Promise<void> {
    if (this.storageAdapter) {
      const loaded = await this.storageAdapter.listChains();
      for (const chain of loaded) {
        this.chains.set(chain.id, chain);
      }
    }
  }
}
