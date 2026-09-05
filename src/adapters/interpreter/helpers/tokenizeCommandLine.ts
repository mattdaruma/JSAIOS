/**
 * JSAIOS - Single-purpose helper: tokenizeCommandLine
 * Parses CLI command input strings into clean argument tokens, honoring single/double quotes and escapes.
 */

export function tokenizeCommandLine(commandLine: string): string[] {
  if (!commandLine) return [];

  const tokens: string[] = [];
  let currentToken = '';
  let inQuote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];

    if (escaped) {
      if (char === 'n') currentToken += '\n';
      else if (char === 't') currentToken += '\t';
      else if (char === 'r') currentToken += '\r';
      else currentToken += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && inQuote !== "'") {
      escaped = true;
      continue;
    }

    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        currentToken += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inQuote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (currentToken.length > 0) {
        tokens.push(currentToken);
        currentToken = '';
      }
      continue;
    }

    currentToken += char;
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return tokens;
}
