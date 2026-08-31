/**
 * JSAIOS - Single-purpose function: tokenizeCommandLine
 * Parses command line strings into argument tokens, respecting double and single quotes.
 */

export function tokenizeCommandLine(commandLine: string): string[] {
  const tokens: string[] = [];
  let currentToken = '';
  let inQuotes: '"' | "'" | null = null;

  for (let i = 0; i < commandLine.length; i++) {
    const char = commandLine[i];

    if (inQuotes) {
      if (char === inQuotes) {
        inQuotes = null;
      } else {
        currentToken += char;
      }
    } else {
      if (char === '"' || char === "'") {
        inQuotes = char;
      } else if (/\s/.test(char)) {
        if (currentToken.length > 0) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
  }

  if (currentToken.length > 0) {
    tokens.push(currentToken);
  }

  return tokens;
}
