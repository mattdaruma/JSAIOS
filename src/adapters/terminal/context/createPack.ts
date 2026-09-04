/**
 * JSAIOS - Single-purpose helper: createPack Terminal Handler
 * Handles 'context create <pack_id> <name> [--merge single|multi]' command.
 */

import type { ContextEngine } from '../../../engines/context/ContextEngine';
import type { ContextMergeStrategy } from '../../../engines/context/helpers/types';

export function handleCreatePack(args: string[], contextEngine: ContextEngine): string {
  const packId = args[0];
  const name = args[1] || packId;

  if (!packId) {
    return 'Usage: context create <pack_id> <name> [--merge single|multi]';
  }

  let mergeStrategy: ContextMergeStrategy = 'single-system-prompt';
  const mergeIdx = args.indexOf('--merge');
  if (mergeIdx !== -1 && args[mergeIdx + 1]) {
    const val = args[mergeIdx + 1].toLowerCase();
    if (val === 'multi' || val === 'multi-directives') {
      mergeStrategy = 'multi-directives';
    }
  }

  const pack = contextEngine.createPack(packId, name, mergeStrategy);

  return [
    `=== Context Pack Created ===`,
    `Pack ID: ${pack.id}`,
    `Name: ${pack.name}`,
    `Merge Strategy: ${pack.mergeStrategy}`,
    `Status: Registered in ContextEngine`
  ].join('\n');
}
