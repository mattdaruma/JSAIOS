/**
 * JSAIOS - Single-purpose helper: fetchCopilotModels
 * Dynamically queries the live GitHub Copilot REST API /models endpoint to return exact supported models.
 */

import type { ModelInfo } from '../../AIService';

export async function fetchCopilotModels(): Promise<ModelInfo[]> {
  const token = process.env.GITHUB_TOKEN || process.env.COPILOT_TOKEN || process.env.GH_TOKEN;

  if (token) {
    try {
      const res = await fetch('https://api.githubcopilot.com/models', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'GitHubCopilot/1.250.0',
          'Editor-Version': 'vscode/1.95.0',
          'Editor-Plugin-Version': 'copilot/1.250.0',
          'Copilot-Integration-Id': 'vscode-chat'
        }
      });

      if (res.ok) {
        const body = await res.json();
        if (Array.isArray(body.data)) {
          const chatModels = body.data.filter((m: any) => !m.id.includes('embedding'));
          const modelInfos: ModelInfo[] = chatModels.map((m: any) => ({
            id: m.id,
            name: m.id,
            family: m.capabilities?.family || 'copilot'
          }));

          if (!modelInfos.some((m) => m.id === 'default')) {
            modelInfos.unshift({ id: 'default', name: 'default', family: 'copilot' });
          }

          return modelInfos;
        }
      }
    } catch {
      // Fallback to core standard model list on network issues
    }
  }

  return [
    { id: 'default', name: 'default', family: 'copilot' },
    { id: 'gpt-4o', name: 'gpt-4o', family: 'copilot' },
    { id: 'gpt-4o-mini', name: 'gpt-4o-mini', family: 'copilot' },
    { id: 'gpt-4.1', name: 'gpt-4.1', family: 'copilot' }
  ];
}
