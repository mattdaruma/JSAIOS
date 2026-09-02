/**
 * JSAIOS - Single-purpose helper: packCommands CLI Handler
 * Handles 'context pack list', 'context pack show <id>', 'context pack create <id>', and 'context pack add-prompt <pack_id> <prompt_id>'.
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';
import type { ContextMergeStrategy, CustomFieldCondition } from '../../../../engines/context/helpers/types';

export function handlePackCommands(args: string[], contextEngine: ContextEngine): string {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'list': {
      const packs = contextEngine.listPacks();
      if (packs.length === 0) return 'No context packs registered. Create one using "context pack create <pack_id> <name>".';
      return [
        '=== Registered Context Packs ===',
        ...packs.map((p) => `  • ${p.id.padEnd(20)} : ${p.name} [Strategy: ${p.mergeStrategy}] (${p.items.length} items)`)
      ].join('\n');
    }

    case 'show': {
      const id = args[1];
      if (!id) return 'Usage: context pack show <pack_id>';

      const pack = contextEngine.getPack(id);
      if (!pack) return `Context Pack '${id}' not found. Use 'context pack list' to view available packs.`;

      const lines = [
        `=== Context Pack Reference '${pack.id}' ===`,
        `Name: ${pack.name}`,
        `Merge Strategy: ${pack.mergeStrategy}`,
        `Directives Count: ${pack.items.length}`
      ];

      for (const item of pack.items) {
        lines.push(`  • [Prompt ID: ${item.promptId}] (Priority: ${item.priority})`);
        if (item.condition) {
          lines.push(`    Condition: field '${item.condition.field}' ${item.condition.operator} '${item.condition.value || ''}'`);
        }
      }

      return lines.join('\n');
    }

    case 'create': {
      const packId = args[1];
      const name = args[2] || packId;

      if (!packId) return 'Usage: context pack create <pack_id> <name> [--merge single|multi]';

      let mergeStrategy: ContextMergeStrategy = 'single-system-prompt';
      const mergeIdx = args.indexOf('--merge');
      if (mergeIdx !== -1 && args[mergeIdx + 1]) {
        const val = args[mergeIdx + 1].toLowerCase();
        if (val === 'multi' || val === 'multi-directives') {
          mergeStrategy = 'multi-directives';
        }
      }

      const pack = contextEngine.createPack(packId, name, mergeStrategy);

      return [
        `=== Context Pack Created ===`,
        `Pack ID: ${pack.id}`,
        `Name: ${pack.name}`,
        `Merge Strategy: ${pack.mergeStrategy}`
      ].join('\n');
    }

    case 'add-prompt': {
      const packId = args[1];
      const promptId = args[2];

      if (!packId || !promptId) {
        return 'Usage: context pack add-prompt <pack_id> <prompt_id> [--field key --value val --op equals|contains|exists]';
      }

      let condition: CustomFieldCondition | undefined;
      const fieldIdx = args.indexOf('--field');
      if (fieldIdx !== -1 && args[fieldIdx + 1]) {
        const field = args[fieldIdx + 1];
        let operator: any = 'equals';
        let value: string | undefined;

        const opIdx = args.indexOf('--op');
        if (opIdx !== -1 && args[opIdx + 1]) operator = args[opIdx + 1];

        const valIdx = args.indexOf('--value');
        if (valIdx !== -1 && args[valIdx + 1]) value = args[valIdx + 1];

        condition = { field, operator, value };
      }

      const success = contextEngine.addPromptToPack(packId, {
        id: `${packId}-${promptId}`,
        promptId,
        priority: 10,
        condition
      });

      if (!success) {
        return `Context Pack '${packId}' not found. Create it first using 'context pack create ${packId}'.`;
      }

      return [
        `=== Prompt Referenced in Context Pack ===`,
        `Pack ID: ${packId}`,
        `Referenced Prompt ID: ${promptId}`,
        condition ? `Condition: field '${condition.field}' ${condition.operator} '${condition.value || ''}'` : 'Condition: None (Always active)'
      ].join('\n');
    }

    default:
      return [
        'Context Pack Commands:',
        '  • context pack list                                - List context packs',
        '  • context pack show <id>                           - View pack details and item conditions',
        '  • context pack create <pack_id> <name>             - Create a new context pack set',
        '  • context pack add-prompt <pack_id> <prompt_id>    - Add prompt directive to pack'
      ].join('\n');
  }
}
