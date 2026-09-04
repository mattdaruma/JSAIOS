/**
 * JSAIOS - Single-purpose helper: promptCommands Terminal Handler
 * Handles 'context prompt list', 'context prompt show <id>', and 'context prompt create <id> --template "..."'.
 * 100% data-driven: contains zero hardcoded prompt strings.
 */

import type { ContextEngine } from '../../../engines/context/ContextEngine';

export function handlePromptCommands(args: string[], contextEngine: ContextEngine): string {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'list': {
      const templates = contextEngine.listTemplates();
      if (templates.length === 0) {
        return 'No standalone prompt templates registered. Create one using "context prompt create <id> --template \"...\"".';
      }
      return [
        '=== Registered System Directive Templates ===',
        ...templates.map((t) => `  • ${t.id.padEnd(20)} : ${t.name} ${t.description ? `(${t.description})` : ''}`),
        '\nUse \'context prompt show <id>\' to inspect template details.'
      ].join('\n');
    }

    case 'show': {
      const id = args[1] || 'code-reviewer';
      const tmpl = contextEngine.getTemplate(id);
      if (!tmpl) return `Prompt template '${id}' not found. Use 'context prompt list' to view available templates.`;

      return [
        `=== System Directive Template Reference '${tmpl.id}' ===`,
        `Template: ${tmpl.id}`,
        `Name: ${tmpl.name}`,
        `Description: ${tmpl.description || 'N/A'}`,
        `Template Content:\n${tmpl.template}`
      ].join('\n');
    }

    case 'create': {
      const id = args[1];
      if (!id) return 'Usage: context prompt create <prompt_id> --template "..." [--name "..."]';

      let template = '';
      const tmplIdx = args.indexOf('--template');
      if (tmplIdx !== -1 && args[tmplIdx + 1]) {
        template = args.slice(tmplIdx + 1).join(' ').replace(/^["']|["']$/g, '');
      }

      let name = id;
      const nameIdx = args.indexOf('--name');
      if (nameIdx !== -1 && args[nameIdx + 1]) {
        name = args[nameIdx + 1];
      }

      const newTmpl = { id, name, template: template || `Default prompt template for ${id}` };
      contextEngine.registerTemplate(newTmpl);
      contextEngine.saveTemplateToStorage(newTmpl).catch(() => {});

      return [
        `=== Prompt Template Created ===`,
        `ID: ${newTmpl.id}`,
        `Name: ${newTmpl.name}`,
        `Template: "${newTmpl.template}"`
      ].join('\n');
    }

    default:
      return [
        'Context Prompt Commands:',
        '  • context prompt list                             - List prompt templates',
        '  • context prompt show <id>                        - View template details & template string',
        '  • context prompt create <id> --template "..."     - Create a reusable prompt template'
      ].join('\n');
  }
}
