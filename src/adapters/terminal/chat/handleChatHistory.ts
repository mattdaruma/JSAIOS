/**
 * JSAIOS - Single-purpose adapter handler: handleChatHistory
 * Renders full unpaginated turn history or paginated turn history log for active session.
 */

import { getTerminalFormatter } from '../../../shell/terminal/helpers/getTerminalFormatter';
import type { ChatEngine } from '../../../engines/chat/ChatEngine';

export function handleChatHistory(engine: ChatEngine, args: string[]): string {
  const formatter = getTerminalFormatter();
  const active = engine.getActiveSession();
  if (!active) return formatter.formatError('Error: No active chat session found.');

  const pageArg = args.find((a) => !a.startsWith('--') && !isNaN(parseInt(a, 10)));
  const limitArg = args.filter((a) => !a.startsWith('--') && !isNaN(parseInt(a, 10)))[1];

  const page = pageArg ? Math.max(1, parseInt(pageArg, 10)) : 1;
  const limit = limitArg ? Math.max(1, parseInt(limitArg, 10)) : 10;
  const showAll = args.includes('--all') || (!pageArg && !limitArg);

  const total = active.messages.length;
  if (total === 0) return `No messages in session '${active.name}'.`;

  let displayMessages = active.messages;
  let headerText = '';

  if (showAll) {
    headerText = `=== Full Message History: '${active.name}' (${total} total message turns) ===`;
  } else {
    const totalPages = Math.ceil(total / limit);
    const start = Math.max(0, total - page * limit);
    const end = Math.min(total, total - (page - 1) * limit);
    displayMessages = active.messages.slice(start, end);
    headerText = `=== Message History Log: '${active.name}' (Page ${page}/${totalPages}, Messages ${start + 1}-${end} of ${total}) ===`;
  }

  const formattedLines = displayMessages.map((m) =>
    formatter.formatChatMessage(m.role, m.content, m.sticky, m.images?.length)
  );

  return [headerText, '', ...formattedLines].join('\n\n');
}
