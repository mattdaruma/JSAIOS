/**
 * JSAIOS - Single-purpose helper: generateCopilotText
 * Executes text generation exclusively via pure HTTP fetch REST API calls (OpenAI-compatible).
 */

import type { TextGenerationRequest, TextGenerationResponse } from '../../AIService';

export async function generateCopilotText(
  request: TextGenerationRequest,
  onChunk?: (chunkText: string) => void
): Promise<TextGenerationResponse> {
  const token = process.env.GITHUB_TOKEN || process.env.COPILOT_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    throw new Error('Copilot REST API error: GITHUB_TOKEN is not configured in config/secrets.json.');
  }

  const messages: { role: string; content: string }[] = [];
  if (request.systemDirective) {
    messages.push({ role: 'system', content: request.systemDirective });
  }
  messages.push({ role: 'user', content: request.prompt });

  const bodyPayload = {
    model: request.model && request.model !== 'default' && request.model !== 'auto' ? request.model : 'gpt-4o',
    messages,
    temperature: request.temperature ?? 0.7,
    stream: !!onChunk
  };

  const res = await fetch('https://api.githubcopilot.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GitHubCopilot/1.250.0',
      'Editor-Version': 'vscode/1.95.0',
      'Editor-Plugin-Version': 'copilot/1.250.0',
      'Copilot-Integration-Id': 'vscode-chat'
    },
    body: JSON.stringify(bodyPayload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Copilot REST API Error (${res.status} ${res.statusText}): ${errorText || 'HTTP request failed'}`);
  }

  if (onChunk && res.body) {
    let fullText = '';
    const reader = (res.body as any).getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(trimmed.substring(6));
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              onChunk(delta);
            }
          } catch {
            // Ignore incomplete SSE chunks
          }
        }
      }
    }

    return { text: fullText.trim(), finishReason: 'stop', done: true };
  } else {
    const data = await res.json();
    const textOutput = data.choices?.[0]?.message?.content || '';
    if (onChunk && textOutput) onChunk(textOutput);
    return { text: textOutput.trim(), finishReason: 'stop', done: true };
  }
}
