/**
 * JSAIOS - Single-purpose helper: getTerminalFormatter
 * Factory function that detects process.platform/env or explicit key to return the appropriate ITerminalFormatter implementation.
 */

import type { ITerminalFormatter } from '../formatters/ITerminalFormatter';
import { WinCLIFormatter } from '../formatters/WinCLIFormatter';
import { WinPowerShellFormatter } from '../formatters/WinPowerShellFormatter';
import { POSIXBashFormatter } from '../formatters/POSIXBashFormatter';
import { PlainTerminalFormatter } from '../formatters/PlainTerminalFormatter';

export function getTerminalFormatter(environmentKey?: string): ITerminalFormatter {
  const env = (environmentKey || process.env.JSAIOS_TERM_ENV || '').toLowerCase();
  const noColor = Boolean(process.env.NO_COLOR);

  if (noColor || env === 'plain') {
    return new PlainTerminalFormatter();
  }

  if (env === 'win-powershell' || env === 'powershell') {
    return new WinPowerShellFormatter();
  }

  if (env === 'posix-bash' || env === 'bash' || env === 'zsh') {
    return new POSIXBashFormatter();
  }

  if (env === 'win-cmd' || env === 'cmd') {
    return new WinCLIFormatter();
  }

  // Auto-detection fallback based on OS platform and shell environment variables
  if (process.platform === 'win32') {
    if (process.env.PSModulePath || process.env.POWERSHELL_DISTRIBUTION_CHANNEL) {
      return new WinPowerShellFormatter();
    }
    return new WinCLIFormatter();
  } else if (process.platform === 'linux' || process.platform === 'darwin') {
    return new POSIXBashFormatter();
  }

  return new PlainTerminalFormatter();
}
