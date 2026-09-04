/**
 * JSAIOS - Single-purpose adapter handler: handleChatSend
 * Parses single-turn option overrides and dispatches user prompt execution to ChatEngine.
 */

import { parseChatCLIArgs } from '../../../engines/chat/helpers/chatOptions';
import { getTerminalFormatter } from '../../../shell/terminal/helpers/getTerminalFormatter';
import type { ChatEngine } from '../../../engines/chat/ChatEngine';

export async function handleChatSend(
  engine: ChatEngine,
  args: string[],
  onStreamChunk?: (chunkText: string) => void
): Promise<string> {
  const formatter = getTerminalFormatter();
  const active = engine.getActiveSession();
  if (!active) return formatter.formatError('Error: No active chat session. Create one with "chat new <name>".');

  const parsed = parseChatCLIArgs(args, active.providerId);
  const promptText = parsed.cleanTextParts.join(' ');

  if (!promptText) {
    return formatter.formatError('Error: Prompt text cannot be empty. Usage: chat send [options] <your message...>');
  }

  try {
    let isThinking = false;
    const streamHandler = onStreamChunk
      ? (chunkText: string) => {
          let chunkToPrint = chunkText;
          if (chunkText.includes('<think>')) {
            isThinking = true;
          }
          const formatted = formatter.formatThinkingChunk(chunkToPrint, isThinking);
          onStreamChunk(formatted);
          if (chunkText.includes('</think>')) {
            isThinking = false;
          }
        }
      : undefined;

    return await engine.executeTurn({
      sessionId: active.id,
      userPrompt: promptText,
      turnOptions: parsed.options,
      images: parsed.images.length > 0 ? parsed.images : undefined,
      onChunk: streamHandler
    });
  } catch (err: any) {
    return formatter.formatError(`Error executing chat turn: ${err.message || err}`);
  }
}
