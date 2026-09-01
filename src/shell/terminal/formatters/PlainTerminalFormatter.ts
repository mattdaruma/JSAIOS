/**
 * JSAIOS - Single-purpose class: PlainTerminalFormatter
 * Unstyled plain text terminal formatter fallback for environments without ANSI color support.
 */

import type { ITerminalFormatter } from './ITerminalFormatter';

export class PlainTerminalFormatter implements ITerminalFormatter {
  public formatPrompt(rawPrompt: string = 'jsaios@honeykernel:~$ '): string {
    return rawPrompt;
  }

  public formatHeader(headerText: string): string {
    return headerText;
  }

  public formatStatusOutput(rawText: string): string {
    return rawText;
  }

  public formatChatMessage(role: string, content: string, sticky?: boolean, imageCount?: number): string {
    const roleUpper = role.toUpperCase();
    const stickyTag = sticky ? ' (STICKY)' : '';
    const imgTag = imageCount && imageCount > 0 ? ` [${imageCount} image(s)]` : '';
    return `[${roleUpper}${stickyTag}] ${content}${imgTag}`;
  }

  public formatThinkingChunk(chunk: string, _isThinking: boolean): string {
    return chunk;
  }

  public formatCLICommand(command: string): string {
    return command;
  }

  public formatOptionFlag(flag: string): string {
    return flag;
  }

  public formatError(errorText: string): string {
    return errorText;
  }
}
