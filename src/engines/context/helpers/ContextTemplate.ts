/**
 * JSAIOS - Single-purpose helper: ContextTemplate
 * Interpolates dynamic variables in system prompt templates (e.g. {{language}}, {{system_rules}}).
 */

import type { SystemDirectiveTemplate } from './types';

export function interpolateTemplate(
  templateObj: SystemDirectiveTemplate,
  variables: Record<string, string> = {}
): string {
  const merged = { ...(templateObj.defaultVariables || {}), ...variables };
  let result = templateObj.template;

  for (const key of Object.keys(merged)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, merged[key]);
  }

  return result;
}
