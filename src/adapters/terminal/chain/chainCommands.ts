/**
 * JSAIOS - Single-purpose helper: chainCommands Terminal Handler
 * Handles 'chain list', 'chain show <id>', 'chain create <id>', 'chain add-step <chain_id> <step_id>', and 'chain run <chain_id>'.
 */

import type { ChainEngine } from '../../../engines/chain/ChainEngine';

export async function handleChainCommands(args: string[], chainEngine: ChainEngine): Promise<string> {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'list': {
      const chains = chainEngine.listChains();
      if (chains.length === 0) return 'No workflow chains registered. Create one using "chain create <chain_id> <name>".';
      return [
        '=== Registered Workflow Chains ===',
        ...chains.map((c) => `  • ${c.id.padEnd(20)} : ${c.name} (${c.steps.length} steps) ${c.description ? `- ${c.description}` : ''}`)
      ].join('\n');
    }

    case 'show': {
      const id = args[1];
      if (!id) return 'Usage: chain show <chain_id>';

      const chain = chainEngine.getChain(id);
      if (!chain) return `Workflow chain '${id}' not found. Use 'chain list' to view available chains.`;

      const lines = [
        `=== Workflow Chain Reference '${chain.id}' ===`,
        `Name: ${chain.name}`,
        `Description: ${chain.description || 'N/A'}`,
        `Steps Count: ${chain.steps.length}`
      ];

      for (const step of chain.steps) {
        lines.push(`  • [Step ID: ${step.id}] ${step.name}`);
        if (step.enableMajorityVote) lines.push(`    Majority Voting: ENABLED (Samples: ${step.sampleCount || 3}, Strategy: ${step.voteStrategy || 'consensus-critic'})`);
        if (step.selectedPackIds?.length) lines.push(`    Context Packs: [${step.selectedPackIds.join(', ')}]`);
        if (step.selectedPromptIds?.length) lines.push(`    Prompt Templates: [${step.selectedPromptIds.join(', ')}]`);
        if (step.selectedUserFieldIds?.length) lines.push(`    User Custom Fields: [${step.selectedUserFieldIds.join(', ')}]`);
        if (step.includeMessageLog !== undefined) lines.push(`    Include History: ${step.includeMessageLog} (Limit: ${step.messageLogTurnLimit || 'ALL'} turns)`);
      }

      return lines.join('\n');
    }

    case 'create': {
      const chainId = args[1];
      const name = args[2] || chainId;
      if (!chainId) return 'Usage: chain create <chain_id> <name> [description]';

      const desc = args.slice(3).join(' ');
      const chain = chainEngine.createChain(chainId, name, desc);

      return [
        `=== Workflow Chain Created ===`,
        `Chain ID: ${chain.id}`,
        `Name: ${chain.name}`,
        `Description: ${chain.description || 'N/A'}`
      ].join('\n');
    }

    case 'add-step': {
      const chainId = args[1];
      const stepId = args[2];
      const stepName = args[3] || stepId;

      if (!chainId || !stepId) {
        return 'Usage: chain add-step <chain_id> <step_id> [step_name] [--vote <sample_count>] [--pack <pack_id>] [--prompt <prompt_id>] [--field <key>]';
      }

      let enableMajorityVote: boolean | undefined;
      let sampleCount: number | undefined;
      const voteIdx = args.indexOf('--vote');
      if (voteIdx !== -1) {
        enableMajorityVote = true;
        if (args[voteIdx + 1] && !isNaN(parseInt(args[voteIdx + 1]))) {
          sampleCount = parseInt(args[voteIdx + 1]);
        } else {
          sampleCount = 3;
        }
      }

      let selectedPackIds: string[] | undefined;
      const packIdx = args.indexOf('--pack');
      if (packIdx !== -1 && args[packIdx + 1]) selectedPackIds = [args[packIdx + 1]];

      let selectedPromptIds: string[] | undefined;
      const promptIdx = args.indexOf('--prompt');
      if (promptIdx !== -1 && args[promptIdx + 1]) selectedPromptIds = [args[promptIdx + 1]];

      let selectedUserFieldIds: string[] | undefined;
      const fieldIdx = args.indexOf('--field');
      if (fieldIdx !== -1 && args[fieldIdx + 1]) selectedUserFieldIds = [args[fieldIdx + 1]];

      const success = chainEngine.addStepToChain(chainId, {
        id: stepId,
        name: stepName,
        enabled: true,
        enableMajorityVote,
        sampleCount,
        selectedPackIds,
        selectedPromptIds,
        selectedUserFieldIds
      });

      if (!success) return `Workflow chain '${chainId}' not found. Create it first using 'chain create ${chainId}'.`;

      return [
        `=== Step Added to Workflow Chain ===`,
        `Chain ID: ${chainId}`,
        `Step ID: ${stepId}`,
        `Step Name: ${stepName}`,
        enableMajorityVote ? `Majority Voting: ENABLED (${sampleCount} samples)` : 'Majority Voting: Disabled'
      ].join('\n');
    }

    case 'run': {
      const chainId = args[1];
      if (!chainId) return 'Usage: chain run <chain_id> [user_prompt]';

      const userPrompt = args.slice(2).join(' ');
      const summary = await chainEngine.executeChain({ chainId, userPrompt });

      const lines = [
        `=== Workflow Chain Execution Summary '${summary.chainName}' ===`,
        `Status: ${summary.success ? 'SUCCESS' : 'FAILED'}`,
        `Total Duration: ${summary.totalDurationMs} ms`,
        `Steps Executed: ${summary.stepResults.length}\n`
      ];

      for (const res of summary.stepResults) {
        lines.push(`  • [${res.stepName}] (${res.durationMs} ms)${res.majorityVoteApplied ? ` [Vote: ${res.sampledOutputs?.length} samples]` : ''}:\n    Output: ${res.responseContent}`);
      }

      return lines.join('\n');
    }

    default:
      return [
        'Chain Engine Commands:',
        '  • chain list                                        - List registered workflow chains',
        '  • chain show <id>                                   - View workflow chain details and steps',
        '  • chain create <chain_id> <name> [desc]             - Create a new workflow chain',
        '  • chain add-step <chain_id> <step_id> [name] [--vote N] - Add a step to workflow chain',
        '  • chain run <chain_id> [prompt]                     - Execute multi-step workflow chain'
      ].join('\n');
  }
}
