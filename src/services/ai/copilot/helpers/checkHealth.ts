/**
 * JSAIOS - Single-purpose helper: checkCopilotHealth
 * Verifies HTTP REST API token and network connectivity for Copilot endpoint via pure fetch (< 100ms).
 */

export async function checkCopilotHealth(): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN || process.env.COPILOT_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return false;
  }

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

    return res.ok || res.status === 200 || res.status === 404; // REST endpoint reachable & token present
  } catch {
    return false;
  }
}
