/**
 * JSAIOS - Context Management Engine CLI Command Router & Service Descriptor
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';
import type { ServiceDescriptor } from '../../../../kernel/types';
import { handleContextList } from './listTemplates';
import { handleContextShow } from './showTemplate';
import { handleContextAssemble } from './assembleContext';
import { handleCreatePack } from './createPack';
import { handleAddPrompt } from './addPrompt';

export const CONTEXT_ENGINE_DESCRIPTOR: ServiceDescriptor = {
  id: 'context',
  name: 'Context Management Engine',
  version: '1.0.0',
  status: 'running',
  capabilities: ['templates', 'context-packs', 'conditional-rules', 'custom-fields', 'token-pruning'],
  commands: [
    {
      command: 'context list',
      description: 'List registered prompt directive templates and context packs'
    },
    {
      command: 'context show <id>',
      description: 'Display template or context pack details, system prompt, and rules'
    },
    {
      command: 'context create <pack_id> <name>',
      description: 'Create a new context pack set',
      options: [
        { flag: '--merge single|multi', description: 'Merge items into 1 prompt or keep as separate directives' }
      ]
    },
    {
      command: 'context add-prompt <pack_id> <prompt_id>',
      description: 'Add a system prompt directive with optional custom field conditions to a pack',
      options: [
        { flag: '--template "<str>"', description: 'Template content with {{variable}} tags' },
        { flag: '--field <key>', description: 'Custom field name for condition' },
        { flag: '--op equals|contains|exists', description: 'Condition operator' },
        { flag: '--value <val>', description: 'Condition target value' }
      ]
    },
    {
      command: 'context assemble [pack_id|template_id]',
      description: 'Evaluate conditions, interpolate custom fields, and assemble unified system prompt',
      options: [
        { flag: '--field key=val', description: 'Pass custom field variable' }
      ]
    }
  ]
};

export function handleContextCommand(args: string[], contextEngine: ContextEngine): string {
  const subCommand = args[0]?.toLowerCase();

  switch (subCommand) {
    case 'list':
      return handleContextList(contextEngine);

    case 'show':
      return handleContextShow(contextEngine, args[1] || 'code-reviewer');

    case 'create':
      return handleCreatePack(args.slice(1), contextEngine);

    case 'add-prompt':
      return handleAddPrompt(args.slice(1), contextEngine);

    case 'assemble':
      return handleContextAssemble(contextEngine, args.slice(1));

    default:
      return [
        'Context Management Commands:',
        '  • context list                             - List templates and context packs',
        '  • context show <id>                        - View template or context pack details',
        '  • context create <pack_id> <name>          - Create a new context pack set',
        '  • context add-prompt <pack_id> <prompt_id> - Add conditional prompt directive to a pack',
        '  • context assemble [pack_id]               - Assemble context with custom fields'
      ].join('\n');
  }
}
