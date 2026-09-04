import { describe, it, expect, beforeEach } from 'vitest';
import { ChainEngine } from '../../src/engines/chain/ChainEngine';
import { ContextEngine } from '../../src/engines/context/ContextEngine';
import { InMemoryChainStorage } from '../../src/adapters/storage/InMemoryChainStorage';
import { assembleStepContext } from '../../src/engines/chain/helpers/StepContextAssembler';

describe('JSAIOS ChainEngine Multi-Step Workflow Architecture', () => {
  let chainStorage: InMemoryChainStorage;
  let contextEngine: ContextEngine;
  let chainEngine: ChainEngine;

  beforeEach(() => {
    chainStorage = new InMemoryChainStorage();
    contextEngine = new ContextEngine();
    chainEngine = new ChainEngine(undefined, undefined, contextEngine, chainStorage);
  });

  it('should register and retrieve multi-step workflow chains', () => {
    const chain = chainEngine.createChain('code-audit', 'Code Audit Workflow', 'Automated multi-step audit');
    expect(chain.id).toBe('code-audit');
    expect(chain.steps.length).toBe(0);

    const added = chainEngine.addStepToChain('code-audit', {
      id: 'step-1',
      name: 'Syntax Check',
      includeUserPrompt: true,
      selectedUserFieldIds: ['language']
    });
    expect(added).toBe(true);

    const ref = chainEngine.getChain('code-audit');
    expect(ref?.steps.length).toBe(1);
    expect(ref?.steps[0].id).toBe('step-1');
  });

  it('should assemble fine-grained step context filtering custom fields and message history', () => {
    const step = {
      id: 'step-eval',
      name: 'Evaluation Step',
      includeUserPrompt: true,
      selectedUserFieldIds: ['target_role'],
      includeMessageLog: true,
      messageLogTurnLimit: 1,
      messageLogCharLimit: 20
    };

    const fullHistory: any[] = [
      { id: 't1', role: 'user', content: 'Turn 1 user text long message', timestamp: 100 },
      { id: 't2', role: 'assistant', content: 'Turn 2 assistant text long message', timestamp: 200 }
    ];

    const assembled = assembleStepContext(
      step,
      'Main User Prompt',
      { target_role: 'Senior Dev', secret_key: '12345' },
      [],
      fullHistory
    );

    expect(assembled.computedUserPrompt).toBe('Main User Prompt');
    expect(assembled.stepCustomFields.target_role).toBe('Senior Dev');
    expect(assembled.stepCustomFields.secret_key).toBeUndefined(); // Filtered out!

    expect(assembled.historyTurnsToInclude.length).toBe(1); // Capped to 1 turn
    expect(assembled.historyTurnsToInclude[0].content).toContain('... [truncated]'); // Character capped
  });

  it('should execute multi-step chain sequentially and pipe step outputs', async () => {
    chainEngine.createChain('multi-step-chain', 'Multi Step Pipeline');
    chainEngine.addStepToChain('multi-step-chain', { id: 'step-1', name: 'First Pass' });
    chainEngine.addStepToChain('multi-step-chain', { id: 'step-2', name: 'Second Pass', includePreviousStepOutputs: true });

    const summary = await chainEngine.executeChain({
      chainId: 'multi-step-chain',
      userPrompt: 'Process input'
    });

    expect(summary.success).toBe(true);
    expect(summary.stepResults.length).toBe(2);
    expect(summary.stepResults[0].stepName).toBe('First Pass');
    expect(summary.stepResults[1].stepName).toBe('Second Pass');
    expect(summary.stepResults[1].outputPrompt).toContain('Output from Step \'First Pass\'');
  });

  it('should support Majority Voting sampling on steps', async () => {
    chainEngine.createChain('voting-chain', 'Majority Vote Chain');
    chainEngine.addStepToChain('voting-chain', {
      id: 'step-vote',
      name: 'Voted Step',
      enableMajorityVote: true,
      sampleCount: 3,
      voteStrategy: 'exact-match'
    });

    const summary = await chainEngine.executeChain({
      chainId: 'voting-chain',
      userPrompt: 'Sample turn'
    });

    expect(summary.success).toBe(true);
    expect(summary.stepResults[0].majorityVoteApplied).toBe(true);
    expect(summary.stepResults[0].sampledOutputs?.length).toBe(3);
  });

  it('should pass step-specific providerId and model overrides to chatEngine.executeTurn', async () => {
    const turnCalls: any[] = [];
    const mockChatEngine: any = {
      getSessionHistory: () => [],
      executeTurn: async (params: any) => {
        turnCalls.push(params);
        return `Response from ${params.providerId || 'default'}`;
      }
    };

    const engineWithMock = new ChainEngine(undefined, mockChatEngine, contextEngine, chainStorage);
    engineWithMock.createChain('provider-chain', 'Provider Override Chain');
    engineWithMock.addStepToChain('provider-chain', {
      id: 'step-copilot',
      name: 'Copilot Step',
      providerId: 'copilot',
      model: 'gpt-4o'
    });
    engineWithMock.addStepToChain('provider-chain', {
      id: 'step-ollama',
      name: 'Ollama Step',
      providerId: 'ollama',
      model: 'llama3'
    });

    const summary = await engineWithMock.executeChain({
      chainId: 'provider-chain',
      sessionId: 'test-session',
      userPrompt: 'Run multi-provider'
    });

    expect(summary.success).toBe(true);
    expect(turnCalls.length).toBe(2);
    expect(turnCalls[0].providerId).toBe('copilot');
    expect(turnCalls[0].model).toBe('gpt-4o');
    expect(turnCalls[1].providerId).toBe('ollama');
    expect(turnCalls[1].model).toBe('llama3');
  });
});
