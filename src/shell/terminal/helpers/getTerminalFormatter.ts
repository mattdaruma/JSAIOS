/**
 * JSAIOS - Single-purpose helper: getTerminalFormatter
 * Factory function that detects process.platform and returns WinCLIFormatter on Windows or PlainTerminalFormatter fallback.
 */

import type { ITerminalFormatter } from '../formatters/ITerminalFormatter';
import { WinCLIFormatter } from '../formatters/WinCLIFormatter';
import { PlainTerminalFormatter } from '../formatters/PlainTerminalFormatter';

export function getTerminalFormatter(): ITerminalFormatter {
  const isWindows = process.platform === 'win32';
  const noColor = Boolean(process.env.NO_COLOR);

  if (isWindows && !noColor) {
    return new WinCLIFormatter();
  }

  return new PlainTerminalFormatter();
}
