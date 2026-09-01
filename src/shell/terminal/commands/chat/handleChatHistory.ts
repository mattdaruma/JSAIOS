/**
 * JSAIOS - Single-purpose adapter handler: handleChatHistory
 * Handles turn history log formatting and pagination output for interactive terminal.
 */

import { getTerminalFormatter } from '../../helpers/getTerminalFormatter';
import type { ChatEngine } from '../../../../engines/chat/ChatEngine';

export function handleChatHistory(engine: ChatEngine, args: string[]): string {
  const formatter = getTerminalFormatter();
  const active = engine.getActiveSession();
  if (!active) return 'No active chat session. Create one with "chat new <name>".';
  const messages = active.messages;
  if (messages.length === 0) return `Chat session '${active.name}' has no messages log yet.`;

  const formatMsg = (m: any) => formatter.formatChatMessage(m.role, m.content, m.sticky, m.images?.length);

  const nums = args.slice(1).filter((a) => !a.startsWith('-')).map(Number).filter((n) => !isNaN(n) && n >= 0);
  const isUnlimited = active.options.maxHistory === undefined || active.options.maxHistory === null;

  if (args.includes('--all') || args.includes('-a') || (nums.length === 0 && isUnlimited)) {
    const formattedMsgs = messages.map(formatMsg).join('\n\n');
    return `=== Full Chat History Log: '${active.name}' (${messages.length} messages) ===\n\n${formattedMsgs}`;
  }

  let page = 1;
  let limit = active.options.maxHistory && active.options.maxHistory > 0 ? active.options.maxHistory : 10;
  if (nums.length >= 1) page = Math.floor(nums[0]);
  if (nums.length >= 2) limit = Math.floor(nums[1]);

  const total = messages.length, totalPages = Math.max(1, Math.ceil(total / limit)), effPage = Math.min(page, totalPages);
  const paged = messages.slice(Math.max(0, total - effPage * limit), total - (effPage - 1) * limit);
  const formattedMsgs = paged.map(formatMsg).join('\n\n');
  const footer = totalPages > 1 ? `\n\n[Page ${effPage} of ${totalPages} | Use "chat history ${effPage + 1 <= totalPages ? effPage + 1 : totalPages}" for previous page | "chat history --all" for full log]` : '';

  return `=== Chat History Log: '${active.name}' (Page ${effPage} of ${totalPages}, ${total} messages total) ===\n\n${formattedMsgs}${footer}`;
}
