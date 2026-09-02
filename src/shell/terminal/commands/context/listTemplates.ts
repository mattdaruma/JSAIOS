/**
 * JSAIOS - Terminal Command Handler: context list
 * Lists all registered system prompt templates.
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';

export function handleContextList(contextEngine: ContextEngine): string {
  const defaultTemplates = [
    { id: 'code-reviewer', name: 'Code Reviewer', description: 'Expert code review system prompt' },
    { id: 'concise-assistant', name: 'Concise Assistant', description: 'Direct concise response prompt' }
  ];

  let output = `\n=== Registered System Directive Templates ===\n\n`;
  output += `  • code-reviewer      : Expert code review system prompt\n`;
  output += `  • concise-assistant  : Direct concise response prompt\n\n`;
  output += `Use 'context show <id>' to inspect template details.\n`;

  return output;
}
