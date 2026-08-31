/**
 * JSAIOS - Single-purpose helper: fetchCopilotSessionToken
 * Exchanges GitHub OAuth/PAT token for temporary Copilot session token and caches in memory.
 */

export interface CopilotSessionToken {
  token: string;
  expiresAt: number;
  apiEndpoint: string;
}

let cachedSessionToken: CopilotSessionToken | null = null;

export async function fetchCopilotSessionToken(forceRefresh: boolean = false): Promise<CopilotSessionToken | null> {
  const now = Math.floor(Date.now() / 1000);

  if (!forceRefresh && cachedSessionToken && cachedSessionToken.expiresAt > now + 60) {
    return cachedSessionToken;
  }

  const githubToken = process.env.GITHUB_TOKEN || process.env.COPILOT_TOKEN || process.env.GH_TOKEN;
  if (!githubToken) {
    return null;
  }

  try {
    const res = await fetch('https://api.github.com/copilot_internal/v2/token', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'GitHubCopilot/1.250.0',
        'Editor-Version': 'vscode/1.95.0',
        'Editor-Plugin-Version': 'copilot/1.250.0',
        'Accept': 'application/json'
      }
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (!data.token) {
      return null;
    }

    const apiEndpoint = (data.endpoints?.api || 'https://api.individual.githubcopilot.com') + '/chat/completions';
    cachedSessionToken = {
      token: data.token,
      expiresAt: data.expires_at || now + 1800,
      apiEndpoint
    };

    return cachedSessionToken;
  } catch {
    return null;
  }
}
