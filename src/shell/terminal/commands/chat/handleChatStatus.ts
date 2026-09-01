/**
 * JSAIOS - Single-purpose adapter handler: handleChatStatus
 * Formats and returns chat engine status metadata.
 */

import type { ChatEngine } from '../../../../engines/chat/ChatEngine';
import type { FileSessionStorage } from '../../storage/FileSessionStorage';

export function handleChatStatus(engine: ChatEngine): string {
  const active = engine.getActiveSession();
  const sessions = engine.listSessions();
  const storageDriver = engine.getStorage() as FileSessionStorage | undefined;
  const storageDir = storageDriver?.getStorageDir() || 'In-Memory';
  const defaultId = engine.getDesignatedDefaultSessionId();

  if (!active) {
    return [
      '=== JSAIOS ChatEngine Status ===',
      'Active Session  : NONE (No active session created)',
      `Default Session : ${defaultId || 'None'}`,
      `Total Sessions  : ${sessions.length} session(s)`,
      `Storage Engine  : FileSessionStorage (${storageDir}/)`
    ].join('\n');
  }

  const sys = active.messages.find((m) => m.role === 'system');
  const optsStr = Object.entries(active.options).map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`).join(', ');

  return [
    '=== JSAIOS ChatEngine Status ===',
    `Active Session  : ${active.name} (ID: ${active.id})`,
    `Default Session : ${defaultId ? `${defaultId}${defaultId === active.id ? ' (Active)' : ''}` : 'None'}`,
    `Provider        : ${active.providerId}`,
    `Model           : ${active.model}`,
    `Messages Count  : ${active.messages.length} message(s) (${active.messages.filter((m) => m.role === 'user').length} user, ${active.messages.filter((m) => m.role === 'assistant').length} assistant)`,
    `System Context  : ${sys ? `Present (${sys.content.length} chars) | View with "chat system"` : 'None'}`,
    `Session Options : ${optsStr || 'Default Engine Defaults'}`,
    `Total Sessions  : ${sessions.length} active session(s)`,
    `Storage Engine  : FileSessionStorage (${storageDir}/)`
  ].join('\n');
}
