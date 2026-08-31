/**
 * JSAIOS - Single-purpose helper: checkCopilotHealth
 * Verifies HTTP REST API token and network connectivity for Copilot endpoint via pure fetch (< 100ms).
 */

import { fetchCopilotSessionToken } from './fetchCopilotToken';

export async function checkCopilotHealth(): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN || process.env.COPILOT_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return false;
  }

  const sessionToken = await fetchCopilotSessionToken();
  return sessionToken !== null;
}
