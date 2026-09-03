/**
 * JSAIOS - Single-purpose helper: renderHelp
 * Formats data-driven help documentation and service descriptors for CLI output.
 */

import type { ServiceDescriptor } from '../../../kernel/types';

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
  return lines.join('\n');
}
