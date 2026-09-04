/**
 * JSAIOS - Single-purpose class: WinPowerShellFormatter
 * Windows PowerShell / Windows Terminal ANSI color and syntax formatting driver.
 */

import type { ITerminalFormatter } from './ITerminalFormatter';
import { ANSI } from '../helpers/terminalColors';

export class WinPowerShellFormatter implements ITerminalFormatter {
  public formatPrompt(rawPrompt: string = 'jsaios@honeykernel:~$ '): string {
    if (rawPrompt.includes('\x1b[')) return rawPrompt;

    return rawPrompt.replace(
      /([a-zA-Z0-9_-]+)@([a-zA-Z0-9_-]+):(~|\/[^$]*)(\$|>)/,
      (_, user, host, path, sysChar) =>
        `${ANSI.brightBlue}${user}${ANSI.dim}@${ANSI.brightCyan}${host}${ANSI.dim}:${ANSI.brightYellow}${path}${ANSI.brightBlue}${sysChar}${ANSI.reset} `
    );
  }

  public formatHeader(headerText: string): string {
    return `${ANSI.brightBlue}${ANSI.bold}${headerText}${ANSI.reset}`;
  }

  public formatStatusOutput(rawText: string): string {
    return rawText
      .split('\n')
      .map((line) => {
        if (line.startsWith('===')) {
          return `${ANSI.brightBlue}${ANSI.bold}${line}${ANSI.reset}`;
        }
        const match = line.match(/^([A-Za-z0-9_ -]+)\s*:\s*(.*)$/);
        if (match) {
          const key = match[1];
          const val = match[2];
          return `${ANSI.brightCyan}${key}${ANSI.reset} : ${ANSI.brightYellow}${val}${ANSI.reset}`;
        }
        return line;
      })
      .join('\n');
  }

  public formatChatMessage(role: string, content: string, sticky?: boolean, imageCount?: number): string {
    const roleUpper = role.toUpperCase();
    let roleBadge = '';

    if (roleUpper === 'USER') {
      roleBadge = `${ANSI.brightYellow}${ANSI.bold}[USER]${ANSI.reset}`;
    } else if (roleUpper === 'ASSISTANT') {
      roleBadge = `${ANSI.brightCyan}${ANSI.bold}[ASSISTANT]${ANSI.reset}`;
    } else if (roleUpper === 'SYSTEM') {
      roleBadge = `${ANSI.brightMagenta}${ANSI.bold}[SYSTEM${sticky ? ' (STICKY)' : ''}]${ANSI.reset}`;
    } else {
      roleBadge = `${ANSI.brightBlue}[${roleUpper}]${ANSI.reset}`;
    }

    const imgTag = imageCount && imageCount > 0 ? ` ${ANSI.dim}[${imageCount} image(s)]${ANSI.reset}` : '';

    const formattedContent = content.replace(
      /<think>([\s\S]*?)<\/think>/g,
      (_, thinkBody) => `${ANSI.dim}<think>${thinkBody}</think>${ANSI.reset}`
    );

    return `${roleBadge} ${formattedContent}${imgTag}`;
  }

  public formatThinkingChunk(chunk: string, isThinking: boolean): string {
    if (isThinking) {
      return `${ANSI.dim}${chunk}${ANSI.reset}`;
    }
    return chunk;
  }

  public formatCLICommand(command: string): string {
    return `${ANSI.brightCyan}${command}${ANSI.reset}`;
  }

  public formatOptionFlag(flag: string): string {
    return `${ANSI.brightMagenta}${flag}${ANSI.reset}`;
  }

  public formatError(errorText: string): string {
    return `${ANSI.brightRed}${errorText}${ANSI.reset}`;
  }
}
