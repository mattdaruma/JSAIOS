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
  const trimmed = line.trimStart();
  if (!trimmed) {
    const allTopLevel = [
      ...config.builtins.map(b => b.command.split(' ')[0]),
      ...Object.keys(config.descriptors || {})
    ];
    return [Array.from(new Set(allTopLevel)), line];
  }

  const parts = trimmed.split(/\s+/);

  if (parts.length === 1 && !line.endsWith(' ')) {
    const query = parts[0].toLowerCase();
    const candidates = new Set<string>();

    for (const b of config.builtins) {
      const cmdName = b.command.split(' ')[0];
      if (cmdName.toLowerCase().startsWith(query)) candidates.add(cmdName);
    }

    for (const dKey of Object.keys(config.descriptors || {})) {
      if (dKey.toLowerCase().startsWith(query)) candidates.add(dKey);
    }

    const activeServices = kernel.getStatus().activeServices;
    for (const s of activeServices) {
      if (s.id.toLowerCase().startsWith(query)) candidates.add(s.id);
    }

    return [Array.from(candidates), line];
  }

  const mainCmd = parts[0].toLowerCase();
  const subQuery = parts.slice(1).join(' ').toLowerCase();

  if (mainCmd === 'help') {
    const targets = new Set<string>();
    for (const b of config.builtins) {
      const name = b.command.split(' ')[0];
      if (name !== 'help' && name.toLowerCase().startsWith(subQuery)) targets.add(`help ${name}`);
    }
    for (const dKey of Object.keys(config.descriptors || {})) {
      if (dKey.toLowerCase().startsWith(subQuery)) targets.add(`help ${dKey}`);
    }
    const activeServices = kernel.getStatus().activeServices;
    for (const s of activeServices) {
      if (s.id.toLowerCase().startsWith(subQuery)) targets.add(`help ${s.id}`);
    }
    return [Array.from(targets), line];
  }

  const descriptor = config.descriptors?.[mainCmd];
  if (descriptor && descriptor.commands) {
    const subCandidates = new Set<string>();
    for (const c of descriptor.commands) {
      const subFull = c.command;
      if (subFull.toLowerCase().startsWith(trimmed.toLowerCase())) {
        const subTokens = subFull.split(/\s+/);
        if (subTokens.length >= 2) {
          subCandidates.add(`${subTokens[0]} ${subTokens[1]}`);
        }
      }
    }
    if (subCandidates.size > 0) {
      return [Array.from(subCandidates), line];
    }
  }

  return [[], line];
}
