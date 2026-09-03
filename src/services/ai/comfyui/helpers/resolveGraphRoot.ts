/**
 * JSAIOS - Single-purpose helper: resolveGraphRoot
 * Recursively unwraps ComfyUI saved workflow envelopes (UI exports, API JSON, wrapper objects).
 */

export function resolveGraphRoot(rawResponse: any): any {
  if (!rawResponse || typeof rawResponse !== 'object') return rawResponse;

  if (rawResponse.workflow && typeof rawResponse.workflow === 'object') {
    return resolveGraphRoot(rawResponse.workflow);
  }

  if (typeof rawResponse.json === 'string') {
    try {
      return resolveGraphRoot(JSON.parse(rawResponse.json));
    } catch {}
  } else if (rawResponse.json && typeof rawResponse.json === 'object') {
    return resolveGraphRoot(rawResponse.json);
  }

  if (typeof rawResponse.data === 'string') {
    try {
      return resolveGraphRoot(JSON.parse(rawResponse.data));
    } catch {}
  } else if (rawResponse.data && typeof rawResponse.data === 'object') {
    return resolveGraphRoot(rawResponse.data);
  }

  return rawResponse;
}
