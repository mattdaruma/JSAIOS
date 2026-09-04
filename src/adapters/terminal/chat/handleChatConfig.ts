/**
 * JSAIOS - Single-purpose adapter handler: handleChatConfig
 * Alters active session settings mid-session or prints exhaustive configuration report.
 */

import { parseChatCLIArgs } from '../../../engines/chat/helpers/chatOptions';
import { formatConfigReport } from '../../../engines/chat/helpers/formatConfigReport';
import { getTerminalFormatter } from '../../../shell/terminal/helpers/getTerminalFormatter';
import type { ChatEngine } from '../../../engines/chat/ChatEngine';

export function handleChatConfig(engine: ChatEngine, args: string[]): string {
  const formatter = getTerminalFormatter();
  const active = engine.getActiveSession();
  if (!active) return formatter.formatError('Error: No active chat session found. Create one with "chat new <name>".');

  const parsed = parseChatCLIArgs(args.slice(1), active.providerId);

  if (parsed.cleanTextParts.length > 0) {
    const unrecognized = parsed.cleanTextParts.map((t) => `'${t}'`).join(', ');
    return formatter.formatError(`Error: Unrecognized parameter(s) for chat config: ${unrecognized}`);
  }

  const hasUpdates = Boolean(
    parsed.providerId ||
    parsed.model ||
    parsed.systemDirective ||
    Object.keys(parsed.options).length > 0
  );

  if (!hasUpdates) {
    return formatConfigReport(active);
  }

  const hasProviderOrModel = Boolean(parsed.providerId || parsed.model);
  const hasChain = Boolean(parsed.options.chainId && parsed.options.chainId !== (null as any));

  if (hasProviderOrModel && hasChain) {
    return formatter.formatError('Error: A chat session must either target a direct AI provider/model OR be associated with a workflow chain, not both.');
  }

  const updated = engine.updateSessionConfig(active.id, {
    providerId: parsed.providerId,
    model: parsed.model,
    systemDirective: parsed.systemDirective,
    options: parsed.options
  });

  if (updated.mode === 'chain') {
    return `Updated settings for active chat session '${updated.name}' (Chain: ${updated.chainId}).`;
  }
  if (updated.mode === 'provider') {
    return `Updated settings for active chat session '${updated.name}' (Provider: ${updated.providerId}, Model: ${updated.model}).`;
  }
  return `Updated settings for active chat session '${updated.name}' (Unconfigured).`;
}
