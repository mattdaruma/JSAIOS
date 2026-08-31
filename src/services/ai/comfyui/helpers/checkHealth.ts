/**
 * JSAIOS - Single-purpose helper: checkComfyUIHealth
 * Verifies HTTP connectivity to ComfyUI backend server API (/system_stats).
 */

export async function checkComfyUIHealth(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(`${endpoint}/system_stats`);
    return res.ok;
  } catch {
    return false;
  }
}
