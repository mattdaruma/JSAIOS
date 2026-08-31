/**
 * JSAIOS - Single-purpose helper: sanitizeSessionId
 * Converts user-provided session names into clean, filename-safe, CLI-friendly session IDs.
 */

export function sanitizeSessionId(rawName: string): string {
  const clean = rawName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return clean || 'default';
}
