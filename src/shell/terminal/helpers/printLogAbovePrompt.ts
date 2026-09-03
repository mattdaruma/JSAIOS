/**
 * JSAIOS - Single-purpose helper: printLogAbovePrompt
 * Safely renders background logs/WebSocket events ABOVE the active terminal input prompt line,
 * completely preserving the active prompt line and any user-typed draft characters at the bottom.
 */

import type readline from 'readline';

let activeRLRef: readline.Interface | null = null;

export function setActiveReadlineInterface(rl: readline.Interface | null): void {
  activeRLRef = rl;
}

export function printLogAbovePrompt(message: string): void {
  if (activeRLRef) {
    try {
      // 1. Clear active prompt line from screen (erase line & move cursor to column 0)
      (activeRLRef as any).output?.write('\x1b[2K\r');

      // 2. Output background log line
      console.log(message);

      // 3. Redraw prompt line at bottom, preserving any user-typed input text
      activeRLRef.prompt(true);
      return;
    } catch {}
  }

  console.log(message);
}
