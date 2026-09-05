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

  if (descriptor.examples && descriptor.examples.length > 0) {
    lines.push('');
    lines.push(' Examples:');
    for (const ex of descriptor.examples) {
      lines.push(`   ${ex}`);
    }
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

export function handleHelpCommand(args: string[], config: any, formatter: any): string {
  const target = args[0]?.toLowerCase()?.trim();

  if (!target) {
    const lines: string[] = [
      formatter.formatHeader('======================================================================='),
      ` JSAIOS HoneyKernel Core Terminal Reference`,
      formatter.formatHeader('======================================================================='),
      ' Core System Commands:'
    ];

    for (const b of config.builtins || []) {
      const padding = ' '.repeat(Math.max(2, 30 - b.command.length));
      lines.push(`  ${formatter.formatCLICommand(b.command)}${padding}- ${b.description}`);
    }

    lines.push(formatter.formatHeader('\n======================================================================='));
    lines.push(` 💡 Tip: Type 'help <target>' (e.g. 'help chat', 'help services', 'help ollama')`);
    lines.push('        for detailed subcommands, arguments, and options.');
    lines.push(formatter.formatHeader('======================================================================='));
    return lines.join('\n');
  }

  if (config.descriptors?.[target]) {
    return renderDescriptorHelp(config.descriptors[target]);
  }

  const builtin = (config.builtins || []).find((b: any) => b.command.toLowerCase().split(' ')[0] === target);
  if (builtin) {
    return renderCoreCommandHelp(builtin);
  }

  const available = [
    ...(config.builtins || []).map((b: any) => b.command.split(' ')[0]),
    ...Object.keys(config.descriptors || {})
  ];

  return suggestFuzzyTarget(target, available);
}
