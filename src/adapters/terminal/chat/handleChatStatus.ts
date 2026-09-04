/**
 * JSAIOS - Single-purpose adapter handler: handleChatStatus
 * Renders active chat session status, generation options, and storage metadata.
 */

import { formatConfigReport } from '../../../engines/chat/helpers/formatConfigReport';
import { getTerminalFormatter } from '../../../shell/terminal/helpers/getTerminalFormatter';
import type { ChatEngine } from '../../../engines/chat/ChatEngine';

export function handleChatStatus(engine: ChatEngine): string {
  const formatter = getTerminalFormatter();
  const active = engine.getActiveSession();
  if (!active) return formatter.formatError('Error: No active chat session found. Create one with "chat new <name>".');

  const defaultId = engine.getDesignatedDefaultSessionId();
  const isDefault = active.id === defaultId;

  const metadataLines = [
    `=== JSAIOS Chat Engine Status ===`,
    `Active Session     : ${active.name} (ID: ${active.id})${isDefault ? ' [DEFAULT BOOT SESSION]' : ''}`,
    `Provider           : ${active.providerId}`,
    `Model              : ${active.model}`,
    `Message Count      : ${active.messages.length} messages`,
    `Created At         : ${new Date(active.createdAt).toISOString()}`,
    `Last Updated       : ${new Date(active.updatedAt).toISOString()}`
  ];

  const sysMsg = active.messages.find((m) => m.role === 'system');
  if (sysMsg?.content) {
    const compactSys = sysMsg.content.length > 80 ? sysMsg.content.substring(0, 77) + '...' : sysMsg.content;
    metadataLines.push(`Sticky System Prompt : ${compactSys} (Use 'chat system' for full prompt)`);
  } else {
    metadataLines.push(`Sticky System Prompt : None (Set with 'chat system "<prompt>"')`);
  }

  const formattedMeta = formatter.formatStatusOutput(metadataLines.join('\n'));
  const configReport = formatConfigReport(active);

  return `${formattedMeta}\n\n${configReport}`;
}
