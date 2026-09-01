/**
 * JSAIOS - Terminal Formatter Interface
 * Platform-agnostic contract for CLI shell formatting, prompts, status blocks, and chat message styling.
 */

export interface ITerminalFormatter {
  formatPrompt(rawPrompt?: string): string;
  formatHeader(headerText: string): string;
  formatStatusOutput(rawText: string): string;
  formatChatMessage(role: string, content: string, sticky?: boolean, imageCount?: number): string;
  formatThinkingChunk(chunk: string, isThinking: boolean): string;
  formatCLICommand(command: string): string;
  formatOptionFlag(flag: string): string;
  formatError(errorText: string): string;
}
