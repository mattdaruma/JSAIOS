/**
 * JSAIOS - Single-purpose function: checkComfyUIHealth
 */

export async function checkComfyUIHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/system_stats`);
    return res.ok;
  } catch {
    return false;
  }
}
