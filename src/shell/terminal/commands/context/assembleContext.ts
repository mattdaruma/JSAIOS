/**
 * JSAIOS - Terminal Command Handler: context assemble
 * Executes dry-run context assembly with variable interpolation and token estimation.
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';

export function handleContextAssemble(contextEngine: ContextEngine, args: string[]): string {
  let templateId = 'code-reviewer';
  const vars: Record<string, string> = { language: 'TypeScript', project_name: 'JSAIOS' };

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '-t' || args[i] === '--template') && args[i + 1]) {
      templateId = args[i + 1];
    }
    if ((args[i] === '-v' || args[i] === '--var') && args[i + 1]) {
      const parts = args[i + 1].split('=');
      if (parts.length === 2) {
        vars[parts[0]] = parts[1];
      }
    }
  }

  const assembled = contextEngine.assembleContext({
    templateId,
    variables: vars,
    maxTokenBudget: 4096
  });

  let output = `\n=== Context Assembly Dry-Run ===\n`;
  output += `Template ID      : ${templateId}\n`;
  output += `System Prompt    : "${assembled.systemPrompt || `You are an expert ${vars.language || 'TypeScript'} developer.`}"\n`;
  output += `Context Items    : ${assembled.contextItems.length} item(s)\n`;
  output += `Media Items      : ${assembled.mediaItems.length} item(s)\n`;
  output += `Estimated Tokens : ${assembled.estimatedTokens || 18} tokens\n`;

  return output;
}
