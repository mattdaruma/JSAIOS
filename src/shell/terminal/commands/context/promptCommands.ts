/**
 * JSAIOS - Single-purpose helper: promptCommands CLI Handler
 * Handles 'context prompt list', 'context prompt show <id>', and 'context prompt create <id> --template "..."'.
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';

const DEFAULT_TEMPLATES = [
  {
    id: 'code-reviewer',
    name: 'Code Reviewer',
    description: 'Expert code review system prompt',
    template: 'You are an expert {{language}} code reviewer.'
  },
  {
    id: 'concise-assistant',
    name: 'Concise Assistant',
    description: 'Direct concise response prompt',
    template: 'You are a concise, direct AI assistant.'
  }
];

export function handlePromptCommands(args: string[], contextEngine: ContextEngine): string {
  const action = args[0]?.toLowerCase();

  // Ensure default templates are registered in engine if empty
  if (contextEngine.listTemplates().length === 0) {
    for (const t of DEFAULT_TEMPLATES) {
      contextEngine.registerTemplate(t);
    }
  }

  switch (action) {
    case 'list': {
      const templates = contextEngine.listTemplates();
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
