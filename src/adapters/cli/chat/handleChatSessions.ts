/**
 * JSAIOS - Single-purpose adapter handler: handleChatSessions
 * Handles session lifecycle management subcommands (new, list, switch, delete, system).
 */

import { parseChatCLIArgs } from '../../../engines/chat/helpers/chatOptions';
import { getTerminalFormatter } from '../../../shell/terminal/helpers/getTerminalFormatter';
import type { ChatEngine } from '../../../engines/chat/ChatEngine';

export function handleChatNewSession(engine: ChatEngine, args: string[]): string {
  const parsed = parseChatCLIArgs(args);
  const name = parsed.cleanTextParts.join(' ').trim() || 'default';
  const session = engine.createSession(name, parsed.providerId || 'ollama', parsed.model || 'llama3', parsed.systemDirective, parsed.options);
  return `Created new chat session '${session.name}' (ID: ${session.id}) using provider '${session.providerId}' (Model: ${session.model}).`;
}

export function handleChatListSessions(engine: ChatEngine): string {
  const sessions = engine.listSessions();
  if (!sessions || sessions.length === 0) return 'No active chat sessions found. Type "chat new <name>" to create one.';
  const active = engine.getActiveSession();
  const defaultId = engine.getDesignatedDefaultSessionId();
  return [
    'Active JSAIOS Chat Sessions:',
    ...sessions.map((s) => {
      const turnCount = (s.messages || []).length;
      return ` ${s.id === active?.id ? '*' : ' '} [${s.id}] '${s.name}' (Provider: ${s.providerId}, Model: ${s.model}, Turns: ${turnCount})${s.id === defaultId ? ' [DEFAULT]' : ''}`;
    })
  ].join('\n');
}

export function handleChatSwitchSession(engine: ChatEngine, args: string[]): string {
  if (!args[0]) return 'Usage: chat switch <session_id>';
  const success = engine.setActiveSession(args[0]);
  if (!success) return `Session '${args[0]}' not found. Type "chat list" to view sessions.`;
  return `Switched active chat session to '${engine.getActiveSession()?.name}' (ID: ${engine.getActiveSession()?.id}).`;
}

export function handleChatDeleteSession(engine: ChatEngine, args: string[]): string {
  if (!args[0]) return 'Usage: chat delete <session_id>';
  const success = engine.deleteSession(args[0]);
  if (!success) return `Session '${args[0]}' not found. Type "chat list" to view sessions.`;
  return `Deleted chat session '${args[0]}' from memory and disk.`;
}

export function handleChatSystemPrompt(engine: ChatEngine, args: string[]): string {
  const formatter = getTerminalFormatter();
  const active = engine.getActiveSession();
  if (!active) return 'No active chat session. Create one with "chat new <name>".';
  const systemText = args.join(' ').trim();
  if (!systemText) {
    const sys = (active.messages || []).find((m) => m.role === 'system');
    if (!sys || !sys.content) {
      return `No sticky system prompt set for session '${active.name}'. Set one with: chat system "<prompt>"`;
    }
    return `=== Sticky System Prompt: '${active.name}' ===\n\n${formatter.formatChatMessage('system', sys.content, true)}`;
  }
  active.setSystemDirective(systemText);
  return `Updated sticky system context for session '${active.name}'.`;
}

export function handleChatSessions(engine: ChatEngine, sub: string, args: string[]): string {
  switch (sub) {
    case 'new':
      return handleChatNewSession(engine, args);
    case 'list':
      return handleChatListSessions(engine);
    case 'switch':
      return handleChatSwitchSession(engine, args);
    case 'delete':
      return handleChatDeleteSession(engine, args);
    case 'system':
      return handleChatSystemPrompt(engine, args);
    default:
      return 'Unknown session command.';
  }
}
