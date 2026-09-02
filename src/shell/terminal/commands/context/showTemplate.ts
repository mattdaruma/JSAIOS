/**
 * JSAIOS - Terminal Command Handler: context show <id>
 * Displays full text and default variables for a prompt template.
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';

export function handleContextShow(contextEngine: ContextEngine, templateId: string): string {
  if (!templateId) {
    return `Error: Missing template ID. Usage: context show <templateId>\n`;
  }

  const tmpl = contextEngine.getTemplate(templateId);

  if (!tmpl) {
    if (templateId === 'code-reviewer') {
      return `\nTemplate: code-reviewer (Code Reviewer)\nTemplate Text: "You are an expert {{language}} code reviewer for {{project_name}}."\nVariables: language=TypeScript, project_name=JSAIOS\n`;
    }
    return `Error: Template '${templateId}' not found. Use 'context list' to view available templates.\n`;
  }

  let output = `\nTemplate: ${tmpl.id} (${tmpl.name})\n`;
  output += `Template Text: "${tmpl.template}"\n`;
  if (tmpl.defaultVariables) {
    output += `Default Variables: ${JSON.stringify(tmpl.defaultVariables)}\n`;
  }
  return output;
}
