/**
 * JSAIOS - Single-purpose helper: handleDraftClearOnDown
 * Stores in-progress uncommitted draft input lines into transient Readline history
 * when the user presses Down arrow, providing instant line clear + draft recovery via Up arrow.
 */

import type readline from 'readline';

export function handleDraftClearOnDown(rl: readline.Interface, keyName: string): boolean {
  if (keyName !== 'down') return false;

  const currentLine = (rl as any).line || '';
  const historyIndex = (rl as any).historyIndex;

  // Check if user is on draft line (historyIndex === -1) and has typed non-empty text
  if (historyIndex === -1 && currentLine.trim()) {
    const draftText = currentLine;

    // Push draft line to top of history if it's not already identical to the top entry
    if (!Array.isArray((rl as any).history)) {
      (rl as any).history = [];
    }

    if ((rl as any).history[0] !== draftText) {
      (rl as any).history.unshift(draftText);
    }

    (rl as any).historyIndex = -1;
    (rl as any).line = '';
    (rl as any).cursor = 0;

    if (typeof (rl as any)._refreshLine === 'function') {
      (rl as any)._refreshLine();
    }

    return true;
  }

  return false;
}
