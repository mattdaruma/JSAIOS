/**
 * JSAIOS - Single-purpose subcommand handler: handleChatStatus
 * Formats status and persistence metadata for active chat session.
 */

import type { ChatEngine } from '../../../../engines/chat/ChatEngine';
import type { FileSessionStorage } from '../../../../engines/chat/adapters/FileSessionStorage';

export async function handleChatStatus(engine: ChatEngine): Promise<string> {
  const active = engine.getActiveSession();
  const storageDriver = engine.getStorage() as FileSessionStorage | undefined;
  const storageDir = (storageDriver as any)?.baseDir || 'chat-sessions';

  if (!active) {
    return [
      '=== JSAIOS Chat Engine Status ===',
      'Active Session : NONE (No active session created)',
      'Total Sessions : 0',
      `Storage Engine : FileSessionStorage (${storageDir}/)`,
      '',
      'Use "chat new <session_name>" to start a new chat session.'
    ].join('\n');
  }

  const turnsCount = active.messages.length;
  const historyTurnCount = active.messages.filter((m) => m.role !== 'system').length;

  return [
    '=== JSAIOS Chat Engine Status ===',
    `Active Session  : ${active.name} (ID: ${active.id})`,
    `AI Provider     : ${active.providerId}`,
    `Active Model    : ${active.model}`,
    `Storage Engine  : FileSessionStorage (${storageDir}/)`,
    `Default Session : ${engine.getDesignatedDefaultSessionId() === active.id ? 'YES (Default Boot Session)' : 'NO'}`,
    `Total Turns     : ${turnsCount} turn(s) (${historyTurnCount} conversation turn(s))`,
    `System Prompt   : ${active.messages.find((m) => m.role === 'system') ? 'CONFIGURED (Sticky Header)' : 'NONE'}`,
    `Created At      : ${new Date(active.createdAt).toLocaleString()}`,
    `Last Updated    : ${new Date(active.updatedAt).toLocaleString()}`,
    '',
    'Session Generation Options:',
    ` • temperature     : ${active.options.temperature !== undefined ? active.options.temperature : 'default'}`,
    ` • top_p           : ${active.options.topP !== undefined ? active.options.topP : 'default'}`,
    ` • maxTokens       : ${active.options.maxTokens !== undefined ? active.options.maxTokens : 'unlimited'}`,
    ` • maxHistory      : ${active.options.maxHistory !== undefined ? active.options.maxHistory : 'unlimited'}`,
    ` • ollamaThink     : ${active.options.ollamaThink !== undefined ? active.options.ollamaThink : 'default'}`,
    ` • ollamaNumCtx    : ${active.options.ollamaNumCtx !== undefined ? active.options.ollamaNumCtx : 'default'}`
  ].join('\n');
}
