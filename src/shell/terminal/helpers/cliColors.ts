/**
 * JSAIOS - Single-purpose helper: cliColors
 * Platform-agnostic ANSI terminal color and syntax styling utilities.
 */

export const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[90m',
  red: '\x1b[31m',
  brightRed: '\x1b[31;1m',
  green: '\x1b[32m',
  brightGreen: '\x1b[32;1m',
  yellow: '\x1b[33m',
  brightYellow: '\x1b[33;1m',
  blue: '\x1b[34m',
  brightBlue: '\x1b[34;1m',
  magenta: '\x1b[35m',
  brightMagenta: '\x1b[35;1m',
  cyan: '\x1b[36m',
  brightCyan: '\x1b[36;1m',
  white: '\x1b[37m'
};

/**
 * Format prompt string with colorful hostname and shell syntax
 * e.g. "jsaios@honeykernel:~$"
 */
export function formatPrompt(rawPrompt: string = 'jsaios@honeykernel:~$ '): string {
  if (rawPrompt.includes('\x1b[')) return rawPrompt;

  return rawPrompt.replace(
    /([a-zA-Z0-9_-]+)@([a-zA-Z0-9_-]+):(~|\/[^$]*)(\$|>)/,
    (_, user, host, path, sysChar) =>
      `${ANSI.brightCyan}${user}${ANSI.dim}@${ANSI.brightGreen}${host}${ANSI.dim}:${ANSI.brightYellow}${path}${ANSI.brightCyan}${sysChar}${ANSI.reset} `
  );
}

/**
 * Highlight command line syntax:
 * - Commands / subcommands: Bright Yellow
 * - Options flags (--provider, -p): Bright Magenta
 * - Strings in quotes: Bright Green
 * - Numbers: Bright Cyan
 */
export function highlightCLISyntax(line: string): string {
  if (!line || line.startsWith('===')) return line;

  return line.replace(
    /("[^"]*"|'[^']*'|--[a-zA-Z0-9_-]+|-[a-zA-Z0-9]|^\s*[a-zA-Z0-9_-]+(?:\s+[a-zA-Z0-9_-]+)?|\b\d+(?:\.\d+)?\b)/g,
    (match) => {
      if (match.startsWith('"') || match.startsWith("'")) {
        return `${ANSI.brightGreen}${match}${ANSI.reset}`;
      }
      if (match.startsWith('-')) {
        return `${ANSI.brightMagenta}${match}${ANSI.reset}`;
      }
      if (!isNaN(Number(match))) {
        return `${ANSI.brightCyan}${match}${ANSI.reset}`;
      }
      return `${ANSI.brightYellow}${match}${ANSI.reset}`;
    }
  );
}

/**
 * Highlight status header blocks and key-value metadata cleanly
 */
export function formatStatusOutput(rawText: string): string {
  return rawText
    .split('\n')
    .map((line) => {
      if (line.startsWith('===')) {
        return `${ANSI.brightCyan}${ANSI.bold}${line}${ANSI.reset}`;
      }

      const match = line.match(/^([A-Za-z0-9_ -]+)\s*:\s*(.*)$/);
      if (match) {
        const key = match[1];
        const val = match[2];
        return `${ANSI.brightYellow}${key}${ANSI.reset} : ${ANSI.brightGreen}${val}${ANSI.reset}`;
      }

      return line;
    })
    .join('\n');
}
