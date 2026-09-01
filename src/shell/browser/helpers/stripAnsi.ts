/**
 * JSAIOS - Single-purpose helper: stripAnsi
 * Strips ANSI terminal escape sequences from text for clean browser UI rendering.
 */

export function stripAnsi(text: string): string {
  if (!text) return '';
  return text
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\[[0-9]+;[0-9]+m/g, '');
}
