/**
 * JSAIOS - Single-purpose helper: printLogAbovePrompt
 * Safely renders background logs and real-time progress updates ABOVE the active terminal input prompt line.
 * In-place progress updates replace the previous progress line without appending new lines.
 * Completely preserves the active prompt line and any user-typed draft characters at the bottom.
 */

import type readline from 'readline';

let activeRLRef: readline.Interface | null = null;
let lastWasProgressLine = false;

export function setActiveReadlineInterface(rl: readline.Interface | null): void {
  activeRLRef = rl;
  lastWasProgressLine = false;
}

export function printLogAbovePrompt(message: string, isProgressUpdate = false): void {
  if (activeRLRef) {
    try {
      const output = (activeRLRef as any).output;
      if (output && typeof output.write === 'function') {
        // 1. Clear active prompt line at the bottom
        output.write('\x1b[2K\r');

        // 2. If replacing previous progress line, move cursor UP 1 line and erase it
        if (isProgressUpdate && lastWasProgressLine) {
          output.write('\x1b[1A\x1b[2K\r');
        }

        // 3. Write background message line
        output.write(`${message}\n`);

        // 4. Update tracking state
        lastWasProgressLine = isProgressUpdate;

        // 5. Redraw prompt line at bottom, preserving any user-typed input text
        activeRLRef.prompt(true);
        return;
      }
    } catch {}
  }

  console.log(message);
  lastWasProgressLine = isProgressUpdate;
}
