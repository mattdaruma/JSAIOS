/**
 * JSAIOS - Single-purpose helper: getCompletions
 * Computes data-driven tab autocompletions for CLI shell inputs using terminal manifest & active services.
 */

import type { TerminalManifestConfig } from '../CommandInterpreter';
import type { HoneyKernel } from '../../../kernel/HoneyKernel';

export function getCompletions(
  line: string,
  config: TerminalManifestConfig,
  kernel: HoneyKernel
): [string[], string] {
  const safeLine = line || '';
  const trimmed = safeLine.trimStart();
  if (!trimmed) {
    const allTopLevel = [
      ...(config.builtins || []).map(b => b.command.split(' ')[0]),
      ...Object.keys(config.descriptors || {})
    ];
    return [Array.from(new Set(allTopLevel)), safeLine];
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1 && !safeLine.endsWith(' ')) {
    const query = parts[0].toLowerCase();
    const candidates = [
      ...(config.builtins || []).map(b => b.command.split(' ')[0]),
      ...Object.keys(config.descriptors || {})
    ];
    const matches = Array.from(new Set(candidates.filter(c => c.toLowerCase().startsWith(query))));
    return [matches, safeLine];
  }

  const root = parts[0].toLowerCase();

  if (root === 'help') {
    const availableTargets = [
      ...(config.builtins || []).map(b => b.command.split(' ')[0]),
      ...Object.keys(config.descriptors || {})
    ];
    const subQuery = parts.slice(1).join(' ').toLowerCase();
    const matches = Array.from(new Set(availableTargets.filter(t => t.toLowerCase().startsWith(subQuery))));
    return [matches.map(m => `help ${m}`), safeLine];
  }

  const descriptor = config.descriptors?.[root];
  if (descriptor && descriptor.commands) {
    const subQuery = parts.slice(1).join(' ').toLowerCase();
    const subCmds = descriptor.commands.map(c => {
      const tokens = c.command.split(' ');
      return tokens[1] || '';
    }).filter(Boolean);

    const matches = Array.from(new Set(subCmds.filter(sc => sc.toLowerCase().startsWith(subQuery))));
    return [matches.map(m => `${root} ${m}`), safeLine];
  }

  return [[], safeLine];
}
