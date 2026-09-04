/**
 * JSAIOS - Context Management Engine Terminal Adapter & Service Descriptor
 */

import type { ContextEngine } from '../../../engines/context/ContextEngine';
import type { ServiceDescriptor } from '../../../kernel/types';
import { handlePromptCommands } from './promptCommands';
import { handlePackCommands } from './packCommands';
import { handleContextAssemble } from './assembleContext';

export const CONTEXT_ENGINE_DESCRIPTOR: ServiceDescriptor = {
  id: 'context',
  name: 'Context Management Engine',
  version: '1.0.0',
  status: 'running',
  capabilities: ['templates', 'context-packs', 'conditional-rules', 'custom-fields', 'token-pruning'],
  commands: [
    {
      command: 'context prompt list',
      description: 'List registered standalone prompt directive templates'
    },
    {
      command: 'context prompt show <prompt_id>',
      description: 'Display prompt template details and template content'
    },
    {
      command: 'context prompt create <prompt_id>',
      description: 'Create a new standalone prompt template',
      options: [
        { flag: '--template "<str>"', description: 'Template content string with {{variable}} tags' },
        { flag: '--name "<str>"', description: 'Human-readable template name' }
      ]
    },
    {
      command: 'context pack list',
      description: 'List registered context packs'
    },
    {
      command: 'context pack show <pack_id>',
      description: 'Display context pack details, prompt references, and conditions'
    },
    {
      command: 'context pack create <pack_id> <name>',
      description: 'Create a new context pack set',
      options: [
        { flag: '--merge single|multi', description: 'Merge strategy: single-system-prompt or multi-directives' }
      ]
    },
    {
      command: 'context pack add-prompt <pack_id> <prompt_id>',
      description: 'Add a prompt directive reference with optional custom field conditions to a pack',
      options: [
        { flag: '--field <key>', description: 'Custom field name for condition' },
        { flag: '--op equals|contains|exists', description: 'Condition operator' },
        { flag: '--value <val>', description: 'Condition target value' }
      ]
    },
    {
      command: 'context assemble [pack_id|template_id]',
      description: 'Dry-run report: Evaluate conditions, interpolate custom fields, and assemble system prompt',
      options: [
        { flag: '--field key=val', description: 'Pass custom field variable' }
      ]
    }
  ]
};

export function handleContextTerminal(args: string[], contextEngine: ContextEngine): string {
  const subCommand = args[0]?.toLowerCase();

  switch (subCommand) {
    case 'prompt':
      return handlePromptCommands(args.slice(1), contextEngine);

    case 'pack':
      return handlePackCommands(args.slice(1), contextEngine);

    case 'list':
      return handlePromptCommands(['list'], contextEngine);

    case 'show':
      return handlePromptCommands(args, contextEngine);

    case 'assemble':
      return handleContextAssemble(contextEngine, args.slice(1));

    default:
      return [
        'Context Management Commands:',
        '  • context prompt list                             - List standalone prompt templates',
        '  • context prompt show <id>                        - View prompt template content',
        '  • context prompt create <id>                      - Create reusable prompt template',
        '  • context pack list                               - List context packs',
        '  • context pack show <id>                          - View context pack details & conditions',
        '  • context pack create <pack_id> <name>            - Create a new context pack set',
        '  • context pack add-prompt <pack_id> <prompt_id>   - Add prompt reference to pack',
        '  • context assemble [pack_id]                      - Dry-run context assembly report'
      ].join('\n');
  }
}

export const handleContextCommand = handleContextTerminal;
