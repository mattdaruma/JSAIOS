/**
 * JSAIOS - Chain Engine CLI Router & Service Descriptor
 */

import type { ChainEngine } from '../../../../engines/chain/ChainEngine';
import type { ServiceDescriptor } from '../../../../kernel/types';
import { handleChainCommands } from './chainCommands';

export const CHAIN_ENGINE_DESCRIPTOR: ServiceDescriptor = {
  id: 'chain',
  name: 'Multi-Step Workflow Chain Engine',
  version: '1.0.0',
  status: 'running',
  capabilities: ['multi-step-chains', 'majority-voting-consensus', 'per-step-context-control', 'custom-field-filtering', 'history-turn-capping', 'inter-step-output-pipe'],
  commands: [
    {
      command: 'chain list',
      description: 'List registered multi-step workflow chains'
    },
    {
      command: 'chain show <id>',
      description: 'Display workflow chain details, step sequence, and context rules'
    },
    {
      command: 'chain create <chain_id> <name>',
      description: 'Create a new multi-step workflow chain definition'
    },
    {
      command: 'chain add-step <chain_id> <step_id> [step_name]',
      description: 'Add a step to a workflow chain with context rules and majority voting',
      options: [
        { flag: '--vote <sample_count>', description: 'Enable Majority Voting self-consistency (e.g. --vote 3)' },
        { flag: '--pack <pack_id>', description: 'Attach Context Pack to step' },
        { flag: '--prompt <prompt_id>', description: 'Attach Prompt Template to step' },
        { flag: '--field <key>', description: 'Select specific user custom field' }
      ]
    },
    {
      command: 'chain run <chain_id> [user_prompt]',
      description: 'Execute all steps in a multi-step workflow chain sequentially'
    }
  ]
};

export async function handleChainCommand(args: string[], chainEngine: ChainEngine): Promise<string> {
  return await handleChainCommands(args, chainEngine);
}
