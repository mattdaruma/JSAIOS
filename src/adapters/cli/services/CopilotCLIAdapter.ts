/**
 * JSAIOS - Single-purpose CLI handler: handleCopilotCLI
 * Handles subcommands and option flag parsing for CopilotService CLI invocations.
 */

import type { CopilotService } from '../../../services/ai/copilot/CopilotService';
import type { TextGenerationRequest } from '../../../services/ai/AIService';

export async function handleCopilotCLI(
  service: CopilotService,
  args: string[],
  onStreamChunk?: (chunk: string) => void
): Promise<string> {
  const sub = (args[0] || '').toLowerCase();

  if (sub === 'status' || !sub) {
    const healthy = await service.checkHealth();
    return healthy
      ? 'GitHub Copilot Service: ONLINE (REST API endpoint reachable and authenticated)'
      : 'GitHub Copilot Service: UNREACHABLE or UNAUTHENTICATED (Run "gh auth login" or verify config/secrets.json)';
  }

  if (sub === 'models' || sub === 'list') {
    const models = await service.getModels();
    return [
      'Available GitHub Copilot Models:',
      ...models.map((m) => ` • ${m.name} (Family: ${m.family})`)
    ].join('\n');
  }

  if (sub === 'prompt' || sub === 'ask') {
    if (args.length < 2) return 'Usage: copilot prompt <model> [options] <your prompt text...>';
    const model = args[1];
    const rawTokens = args.slice(2);

    let systemDirective: string | undefined = undefined;
    const promptParts: string[] = [];

    for (let i = 0; i < rawTokens.length; i++) {
      const token = rawTokens[i];

      if (token === '--system' || token === '-s') {
        systemDirective = rawTokens[++i];
      } else {
        promptParts.push(token);
      }
    }

    const promptText = promptParts.join(' ');
    if (!promptText) return 'Error: Prompt text cannot be empty after options flags.';

    const req: TextGenerationRequest = {
      model,
      prompt: promptText,
      systemDirective,
      stream: true
    };

    try {
      const result = await service.generateText(req, onStreamChunk);
      return result.text;
    } catch (err: any) {
      return `Copilot prompt error: ${err.message || err}`;
    }
  }

  return `Unknown Copilot command '${sub}'. Use 'copilot status', 'copilot models', or 'copilot prompt <model> <text>'.`;
}
