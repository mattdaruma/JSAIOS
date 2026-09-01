/**
 * JSAIOS - Single-purpose adapter handler: handleChatSend
 * Handles prompt sending and real-time streaming output formatting.
 */

import { parseChatCLIArgs } from '../../../../engines/chat/helpers/chatOptions';
import { loadLocalImageBase64 } from '../../../../services/ai/ollama/helpers/loadImage';
import { getTerminalFormatter } from '../../helpers/getTerminalFormatter';
import type { ChatEngine } from '../../../../engines/chat/ChatEngine';

export async function handleChatSend(
  engine: ChatEngine,
  args: string[],
  onStreamChunk?: (chunk: string) => void
): Promise<string> {
  const formatter = getTerminalFormatter();
  let active = engine.getActiveSession();
  if (!active) active = engine.createSession('default', 'ollama', 'llama3');

  const parsed = parseChatCLIArgs(args.slice(1), active.providerId);
  const images: string[] = [], promptParts: string[] = [];

  for (let i = 0; i < parsed.cleanTextParts.length; i++) {
    const token = parsed.cleanTextParts[i];
    if (token === '--image' || token === '-i') {
      const imgPath = parsed.cleanTextParts[++i];
      if (imgPath) {
        try { images.push(loadLocalImageBase64(imgPath)); }
        catch (err: any) { return `Error loading image: ${err.message || err}`; }
      }
    } else promptParts.push(token);
  }

  const userPrompt = promptParts.join(' ').trim();
  if (!userPrompt) return 'Error: Chat prompt text cannot be empty.';

  let isThinking = false;
  const wrappedChunkHandler = onStreamChunk
    ? (chunk: string) => {
        if (chunk.includes('<think>')) isThinking = true;
        const formattedChunk = formatter.formatThinkingChunk(chunk, isThinking);
        if (chunk.includes('</think>')) isThinking = false;
        onStreamChunk(formattedChunk);
      }
    : undefined;

  try {
    return await engine.executeTurn({
      sessionId: active.id,
      userPrompt,
      images: images.length > 0 ? images : undefined,
      turnOptions: parsed.options,
      onChunk: wrappedChunkHandler
    });
  } catch (err: any) {
    return `Chat engine error: ${err.message || err}`;
  }
}
