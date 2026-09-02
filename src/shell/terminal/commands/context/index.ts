/**
 * JSAIOS - Terminal Subcommand Router: context
 * Dispatches context subcommands ('list', 'show', 'assemble') to single-purpose handlers.
 */

import type { ContextEngine } from '../../../../engines/context/ContextEngine';
import { handleContextList } from './listTemplates';
import { handleContextShow } from './showTemplate';
import { handleContextAssemble } from './assembleContext';

export function handleContextCommand(args: string[], contextEngine: ContextEngine): string {
  const subcommand = args[0]?.toLowerCase();

  if (!subcommand || subcommand === 'list') {
    return handleContextList(contextEngine);
  }

  if (subcommand === 'show') {
    return handleContextShow(contextEngine, args[1]);
  }

  if (subcommand === 'assemble' || subcommand === 'dry-run') {
    return handleContextAssemble(contextEngine, args.slice(1));
  }

  return `Unknown context subcommand '${subcommand}'. Usage: context [list | show <id> | assemble]\n`;
}
