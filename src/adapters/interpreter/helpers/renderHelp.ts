/**
 * JSAIOS - Single-purpose helper: renderHelp
 * Formats data-driven help documentation, root index, service descriptors, and fuzzy target suggestions for CLI output.
 */

import type { ServiceDescriptor, CommandDoc } from '../../../kernel/types';

export function renderDescriptorHelp(descriptor: ServiceDescriptor): string {
  const lines: string[] = [
    '=======================================================================',
    ` Reference: ${descriptor.name} (${descriptor.id} v${descriptor.version})`,
    '======================================================================='
  ];

  if (descriptor.commands && descriptor.commands.length > 0) {
    for (const cmd of descriptor.commands) {
      lines.push('');
      const cmdPadding = ' '.repeat(Math.max(2, 37 - cmd.command.length));
      lines.push(`  ${cmd.command}${cmdPadding}- ${cmd.description}`);

      if (cmd.options && cmd.options.length > 0) {
        lines.push('                                        Options:');
        for (const opt of cmd.options) {
          const optPadding = ' '.repeat(Math.max(2, 22 - opt.flag.length));
          lines.push(`                                          ${opt.flag}${optPadding}${opt.description}`);
        }
      }
    }
  } else {
    lines.push('  No commands documented.');
  }

  lines.push('\n=======================================================================');
  lines.push(` 💡 Tip: Type 'help' to return to top-level system command reference.`);
  lines.push('=======================================================================');
  return lines.join('\n');
}

export function renderCoreCommandHelp(commandDoc: CommandDoc): string {
  const lines: string[] = [
    '=======================================================================',
    ` Reference: Core Shell Command '${commandDoc.command}'`,
    '=======================================================================',
    `  ${commandDoc.command.padEnd(20)} - ${commandDoc.description}`
  ];

  if (commandDoc.options && commandDoc.options.length > 0) {
    lines.push('\n  Options / Suggestions:');
    for (const opt of commandDoc.options) {
      const optPadding = ' '.repeat(Math.max(2, 25 - opt.flag.length));
      lines.push(`    ${opt.flag}${optPadding}- ${opt.description}`);
    }
  }

  lines.push('\n=======================================================================');
  lines.push(` 💡 Tip: Type 'help' to return to top-level system command reference.`);
  lines.push('=======================================================================');
  return lines.join('\n');
}

export function suggestFuzzyTarget(query: string, availableTargets: string[]): string {
  const lowerQuery = query.toLowerCase();
  const match = availableTargets.find((t) => t.toLowerCase().includes(lowerQuery) || lowerQuery.includes(t.toLowerCase()));

  const lines = [
    `Target '${query}' not found in CLI help index.`
  ];

  if (match) {
    lines.push(`Did you mean 'help ${match}'?`);
  }

  lines.push("Type 'help' to view all top-level commands, engines, and active service drivers.");
  return lines.join('\n');
}
