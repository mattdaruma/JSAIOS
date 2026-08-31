/**
 * JSAIOS - Single-purpose CLI handler: handleOllamaCLI
 * Handles subcommands and option flag parsing for OllamaService CLI invocations.
 */

import type { OllamaService } from '../../../services/ai/ollama/OllamaService';
import type { TextGenerationRequest } from '../../../services/ai/AIService';
import { loadLocalImageBase64 } from '../../../services/ai/ollama/helpers/loadImage';

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

  if (sub === 'prompt' || sub === 'ask') {
    if (args.length < 2) return 'Usage: ollama prompt <model> [options] <your prompt text...>';
    const model = args[1];
    const rawTokens = args.slice(2);

    let think: boolean | undefined = undefined;
    let temperature: number | undefined = undefined;
    let topP: number | undefined = undefined;
    let topK: number | undefined = undefined;
    let minP: number | undefined = undefined;
    let seed: number | undefined = undefined;
    let numCtx: number | undefined = undefined;
    let repeatPenalty: number | undefined = undefined;
    let systemDirective: string | undefined = undefined;
    let maxTokens: number | undefined = undefined;
    let format: string | undefined = undefined;
    let raw: boolean | undefined = undefined;
    let keepAlive: string | undefined = undefined;
    const stop: string[] = [];
    const images: string[] = [];
    const promptParts: string[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];

      if (token === '--think') {
        const next = (rawTokens[i + 1] || '').toLowerCase();
        if (next === 'true' || next === '1') {
          think = true;
          i++;
        } else if (next === 'false' || next === '0') {
          think = false;
          i++;
        } else {
          think = true;
        }
      } else if (token.startsWith('--think=')) {
        const val = token.split('=')[1].toLowerCase();
        think = val === 'true' || val === '1';
      } else if (token === '--no-think') {
        think = false;
      } else if (token === '--image' || token === '-i') {
        const imgPath = rawTokens[++i];
        if (imgPath) {
          try {
            images.push(loadLocalImageBase64(imgPath));
          } catch (err: any) {
            return `Error loading image: ${err.message || err}`;
          }
        }
      } else if (token === '--temp' || token === '-t' || token === '--temperature') {
        const val = parseFloat(rawTokens[++i]);
        if (!isNaN(val)) temperature = val;
      } else if (token.startsWith('--temp=') || token.startsWith('--temperature=')) {
        const val = parseFloat(token.split('=')[1]);
        if (!isNaN(val)) temperature = val;
      } else if (token === '--system' || token === '-s') {
        systemDirective = rawTokens[++i];
      } else if (token.startsWith('--system=')) {
        systemDirective = token.split('=').slice(1).join('=');
      } else if (token === '--max-tokens' || token === '--num-predict') {
        const val = parseInt(rawTokens[++i], 10);
        if (!isNaN(val)) maxTokens = val;
      } else if (token === '--top-p') {
        const val = parseFloat(rawTokens[++i]);
        if (!isNaN(val)) topP = val;
      } else if (token === '--top-k') {
        const val = parseInt(rawTokens[++i], 10);
        if (!isNaN(val)) topK = val;
      } else if (token === '--min-p') {
        const val = parseFloat(rawTokens[++i]);
        if (!isNaN(val)) minP = val;
      } else if (token === '--seed') {
        const val = parseInt(rawTokens[++i], 10);
        if (!isNaN(val)) seed = val;
      } else if (token === '--ctx' || token === '--num-ctx') {
        const val = parseInt(rawTokens[++i], 10);
        if (!isNaN(val)) numCtx = val;
      } else if (token === '--repeat-penalty') {
        const val = parseFloat(rawTokens[++i]);
        if (!isNaN(val)) repeatPenalty = val;
      } else if (token === '--stop') {
        const val = rawTokens[++i];
        if (val) stop.push(val);
      } else if (token === '--format') {
        format = rawTokens[++i];
      } else if (token === '--raw') {
        raw = true;
      } else if (token === '--keep-alive') {
        keepAlive = rawTokens[++i];
      } else {
        promptParts.push(token);
      }
    }

    const promptText = promptParts.join(' ');
    if (!promptText) return 'Error: Prompt text cannot be empty after options flags.';

    const req: TextGenerationRequest = {
      model,
      prompt: promptText,
      think,
      temperature,
      topP,
      topK,
      minP,
      seed,
      numCtx,
      repeatPenalty,
      systemDirective,
      maxTokens,
      stop: stop.length > 0 ? stop : undefined,
      format,
      raw,
      keepAlive,
      images: images.length > 0 ? images : undefined,
      stream: true
    };

    try {
      const result = await service.generateText(req, onStreamChunk);
      return result.text;
    } catch (err: any) {
      return `Ollama prompt error: ${err.message || err}`;
    }
  }

  return `Unknown Ollama command '${sub}'. Use 'ollama status', 'ollama models', or 'ollama prompt <model> [options] <text>'.`;
}
