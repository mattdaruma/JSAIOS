/**
 * JSAIOS - Single-purpose CLI handler: handleOllamaCLI
 * Handles subcommands and option flag parsing for OllamaService CLI invocations.
 */

import type { OllamaService } from '../../../services/ai/ollama/OllamaService';
import { parseOllamaOptions } from './parseOllamaOptions';

export async function handleOllamaCLI(
  service: OllamaService,
  args: string[],
  onStreamChunk?: (chunk: string) => void
): Promise<string> {
  const sub = (args[0] || '').toLowerCase();

  if (sub === 'status' || !sub) {
    const healthy = await service.checkHealth();
    return healthy
      ? 'Ollama Service: ONLINE (Endpoint reachable)'
      : 'Ollama Service: UNREACHABLE (Is Ollama running on http://localhost:11434?)';
  }

  if (sub === 'models' || sub === 'list') {
    const models = await service.getModels();
    if (models.length === 0) return 'No Ollama models found or connection failed.';
    return [
      'Available Ollama Models:',
      ...models.map(m => ` • ${m.name} (Family: ${m.family}, Size: ${m.sizeBytes ? Math.round(m.sizeBytes / 1024 / 1024) + 'MB' : 'unknown'})`)
    ].join('\n');
  }

  if (sub === 'prompt' || sub === 'ask' || sub === 'run') {
    if (args.length < 2) return 'Usage: ollama prompt <model> [options] <your prompt text...>';
    const model = args[1];
    const { request, error } = parseOllamaOptions(model, args.slice(2));

    if (error) return error;

    try {
      const result = await service.generateText(request, onStreamChunk);
      return result.text;
    } catch (err: any) {
      return `Ollama prompt error: ${err.message || err}`;
    }
  }

  return `Unknown Ollama command '${sub}'. Use 'ollama status', 'ollama models', or 'ollama prompt <model> [options] <text>'.`;
}
