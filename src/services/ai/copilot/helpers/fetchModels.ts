/**
 * JSAIOS - Single-purpose helper: fetchCopilotModels
 * Returns supported model catalog for GitHub Copilot AI Service driver.
 */

import type { ModelInfo } from '../../AIService';

export async function fetchCopilotModels(): Promise<ModelInfo[]> {
  return [
    { name: 'default', family: 'copilot', format: 'api' },
    { name: 'gpt-4o', family: 'copilot', format: 'api' },
    { name: 'claude-3.5-sonnet', family: 'copilot', format: 'api' },
    { name: 'o3-mini', family: 'copilot', format: 'api' },
    { name: 'gpt-4o-mini', family: 'copilot', format: 'api' }
  ];
}
