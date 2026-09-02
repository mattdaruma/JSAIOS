/**
 * JSAIOS - Single-purpose helper: addPrompt CLI Handler
 * Handles 'context add-prompt <pack_id> <prompt_id> --template "..." [--field key --value val]' command.
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';
import type { CustomFieldCondition } from '../../../../engines/context/helpers/types';

export function handleAddPrompt(args: string[], contextEngine: ContextEngine): string {
  const packId = args[0];
  const promptId = args[1];

  if (!packId || !promptId) {
    return 'Usage: context add-prompt <pack_id> <prompt_id> --template "..." [--field key --value val --op equals|contains|exists]';
  }

  let templateStr = '';
  const tmplIdx = args.indexOf('--template');
  if (tmplIdx !== -1 && args[tmplIdx + 1]) {
    templateStr = args.slice(tmplIdx + 1).join(' ').replace(/^["']|["']$/g, '');
  }

  let condition: CustomFieldCondition | undefined;
  const fieldIdx = args.indexOf('--field');
  if (fieldIdx !== -1 && args[fieldIdx + 1]) {
    const field = args[fieldIdx + 1];
    let operator: any = 'equals';
    let value: string | undefined;

    const opIdx = args.indexOf('--op');
    if (opIdx !== -1 && args[opIdx + 1]) {
      operator = args[opIdx + 1];
    }

    const valIdx = args.indexOf('--value');
    if (valIdx !== -1 && args[valIdx + 1]) {
      value = args[valIdx + 1];
    }

    condition = { field, operator, value };
  }

  const success = contextEngine.addPromptToPack(packId, {
    id: promptId,
    template: templateStr || `Default system prompt for ${promptId}`,
    priority: 10,
    condition
  });

  if (!success) {
    return `Context Pack '${packId}' not found. Create it first using 'context create ${packId}'.`;
  }

  return [
    `=== Prompt Directive Added ===`,
    `Pack ID: ${packId}`,
    `Prompt ID: ${promptId}`,
    `Template: "${templateStr}"`,
    condition ? `Condition: field '${condition.field}' ${condition.operator} '${condition.value || ''}'` : 'Condition: None (Always active)'
  ].join('\n');
}
