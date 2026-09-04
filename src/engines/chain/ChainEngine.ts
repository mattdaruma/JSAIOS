/**
 * JSAIOS - Engine: ChainEngine
 * Core OS domain engine managing multi-step workflow chains, step context configuration,
 * majority voting self-consistency sampling, inter-step output propagation, and sequential turn orchestration.
 * 100% platform-agnostic: zero dependencies on fs, DOM, or process stdout.
 */

import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { ChatEngine } from '../chat/ChatEngine';
import type { ContextEngine } from '../context/ContextEngine';
import type { AIService } from '../../services/ai/AIService';
import type { ChatSessionOptions } from '../chat/helpers/types';
import { buildTextGenRequest } from '../chat/helpers/chatOptions';
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

  public getChain(id: string): ChainDefinition | undefined { return this.chains.get(id); }
  public listChains(): ChainDefinition[] { return Array.from(this.chains.values()); }

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

  private async executeStepTurn(
    sessionId: string | undefined,
    userPrompt: string,
    stepProviderId?: string,
    stepModel?: string,
    systemPrompt?: string,
    turnOptions?: Partial<ChatSessionOptions>
  ): Promise<string> {
    if (this.chatEngine && sessionId) {
      return await this.chatEngine.executeTurn({
        sessionId,
        userPrompt,
        providerId: stepProviderId,
        model: stepModel,
        turnOptions
      });
    }

    const providerId = stepProviderId || 'ollama';
    const model = stepModel || 'llama3';
    const aiService = this.kernel ? this.kernel.getService<AIService>(providerId) : undefined;

    if (aiService) {
      const req = buildTextGenRequest(model, userPrompt, systemPrompt, turnOptions || {});
      const res = await aiService.generateText(req);
      return res.text;
    }

    return `[Step Output for prompt: "${userPrompt}"]`;
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

      // Execute Majority Voting Sequential Sampling or Standard Turn
      let finalStepOutput = '';
      let sampledOutputs: string[] | undefined;
      const majorityVoteApplied = !!step.enableMajorityVote;

      const stepProviderId = step.providerId || chain.defaultProviderId;
      const stepModel = step.model || chain.defaultModel;
      const stepTurnOptions: Partial<ChatSessionOptions> = {
        ...step.options,
        ...(step.temperature !== undefined ? { temperature: step.temperature } : {}),
        ...(step.enableThinking !== undefined ? { ollamaThink: step.enableThinking } : {})
      };

      if (step.enableMajorityVote) {
        const sampleCount = step.sampleCount || 3;
        sampledOutputs = [];

        // Sequential sampling to keep VRAM usage flat
        for (let i = 0; i < sampleCount; i++) {
          const candidate = await this.executeStepTurn(
            sessionId,
            assembled.computedUserPrompt,
            stepProviderId,
            stepModel,
            stepSystemPrompt,
            stepTurnOptions
          );
          sampledOutputs.push(candidate);
        }

        // Consensus Strategy Resolution
        if (step.voteStrategy === 'exact-match') {
          // Check for exact string match consensus
          const counts: Record<string, number> = {};
          for (const s of sampledOutputs) counts[s] = (counts[s] || 0) + 1;
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
          finalStepOutput = sorted[0] ? sorted[0][0] : sampledOutputs[0];
        } else {
          // Default: consensus-critic evaluation pass
          const candidateList = sampledOutputs.map((s, idx) => `[Candidate ${idx + 1}]:\n${s}`).join('\n\n');
          const criticPrompt = `Compare these ${sampleCount} candidate responses to the prompt and synthesize/select the single consensus answer:\n\n${candidateList}`;

          finalStepOutput = await this.executeStepTurn(
            sessionId,
            criticPrompt,
            stepProviderId,
            stepModel,
            stepSystemPrompt,
            stepTurnOptions
          );
        }
      } else {
        // Standard single execution pass
        finalStepOutput = await this.executeStepTurn(
          sessionId,
          assembled.computedUserPrompt,
          stepProviderId,
          stepModel,
          stepSystemPrompt,
          stepTurnOptions
        );
      }

      // Attempt parsing JSON output if responseJsonSchema or structured response enabled
      let parsedJsonObject: Record<string, any> | undefined;
      try {
        const jsonMatch = finalStepOutput.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsedJsonObject = JSON.parse(jsonMatch[0]);
      } catch {
        // Fallback
      }

      const result: ChainStepExecutionResult = {
        stepId: step.id,
        stepName: step.name,
        outputPrompt: assembled.computedUserPrompt,
        responseContent: finalStepOutput,
        parsedJsonObject,
        sampledOutputs,
        majorityVoteApplied,
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
      for (const chain of await this.storageAdapter.listChains()) this.chains.set(chain.id, chain);
    }
  }
}
