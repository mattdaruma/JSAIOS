/**
 * JSAIOS - Single-purpose helper: checkOllamaHealth
 * Checks server connectivity and status for Ollama API endpoint.
 */

export async function checkOllamaHealth(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}
