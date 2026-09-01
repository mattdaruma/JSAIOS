/**
 * JSAIOS - Browser Local Command Dispatcher
 * Dispatches terminal input commands directly to HoneyKernel & ChatEngine in Mode B (in-browser client mode).
 * Zero imports from terminal shell files.
 */

import type { HoneyKernel } from '../../../kernel/HoneyKernel';
import type { ChatEngine } from '../../../engines/chat/ChatEngine';

export class BrowserLocalCommandDispatcher {
  constructor(private kernel: HoneyKernel, private chatEngine: ChatEngine) {}

  public async execute(
    input: string,
    onChunk?: (chunkText: string) => void
  ): Promise<string> {
    const trimmed = input.trim();
    if (!trimmed) return '';

    const args = trimmed.split(/\s+/);
    const mainCommand = args[0].toLowerCase();

    // 1. Built-in Core System Commands
    if (mainCommand === 'help') {
      return this.renderHelp();
    }

    if (mainCommand === 'status') {
      const status = this.kernel.getStatus();
      const activeSession = this.chatEngine.getActiveSession();
      return [
        '=== JSAIOS HoneyKernel Browser Client Status (Mode B) ===',
        `Booted State           : ${status.booted ? 'ACTIVE (In-Browser)' : 'OFFLINE'}`,
        `Uptime                 : ${status.uptimeSeconds} seconds`,
        `Active Session         : ${activeSession ? activeSession.name + ' (' + activeSession.providerId + '/' + activeSession.model + ')' : 'None'}`,
        `Active Services Count  : ${status.activeServices.length}`,
        ...status.activeServices.map((s) => ` - [${s.status.toUpperCase()}] ${s.name} (${s.id} v${s.version})`)
      ].join('\n');
    }

    if (mainCommand === 'services') {
      const status = this.kernel.getStatus();
      return [
        'Registered Micro-Services (Browser Direct Transport):',
        ...status.activeServices.map((s) =>
          `• Service ID: '${s.id}' | Name: ${s.name} | Capabilities: [${s.capabilities.join(', ')}]`
        )
      ].join('\n');
    }

    if (mainCommand === 'clear') {
      return '__CLEAR__';
    }

    // 2. Chat Engine Command Routing
    if (mainCommand === 'chat') {
      const sub = (args[1] || '').toLowerCase();

      if (sub === 'status' || !sub) {
        const active = this.chatEngine.getActiveSession();
        if (!active) return 'Error: No active chat session. Create one with "chat new <name>".';
        return [
          `=== JSAIOS Chat Engine Status ===`,
          `Active Session : ${active.name} (ID: ${active.id})`,
          `Provider       : ${active.providerId}`,
          `Model          : ${active.model}`,
          `Message Count  : ${active.messages.length}`
        ].join('\n');
      }

      if (sub === 'new') {
        const name = args[2] || 'browser-session';
        const provider = args[3] || 'ollama';
        const model = args[4] || 'llama3';
        const sess = this.chatEngine.createSession(name, provider, model);
        return `Created new in-browser chat session '${sess.name}' (Provider: ${sess.providerId}, Model: ${sess.model}).`;
      }

      if (sub === 'list') {
        const sessions = this.chatEngine.listSessions();
        const active = this.chatEngine.getActiveSession();
        return [
          'In-Browser Chat Sessions (LocalStorage):',
          ...sessions.map((s) => ` ${s.id === active?.id ? '*' : ' '} [${s.id}] '${s.name}' (${s.providerId}/${s.model})`)
        ].join('\n');
      }

      if (sub === 'switch') {
        if (!args[2]) return 'Usage: chat switch <session_id>';
        const ok = this.chatEngine.setActiveSession(args[2]);
        return ok ? `Switched to chat session '${args[2]}'.` : `Session '${args[2]}' not found.`;
      }

      if (sub === 'delete') {
        if (!args[2]) return 'Usage: chat delete <session_id>';
        const ok = this.chatEngine.deleteSession(args[2]);
        return ok ? `Deleted session '${args[2]}'.` : `Session '${args[2]}' not found.`;
      }

      if (sub === 'send') {
        const promptText = args.slice(2).join(' ');
        if (!promptText) return 'Usage: chat send <your message...>';
        const active = this.chatEngine.getActiveSession();
        if (!active) return 'Error: No active session. Create one with "chat new <name>".';
        return this.chatEngine.executeTurn({
          sessionId: active.id,
          userPrompt: promptText,
          onChunk
        });
      }
    }

    // 3. Registered AI Service Drivers Command Routing
    const activeServices = this.kernel.getStatus().activeServices;
    const matched = activeServices.find((s) => s.id.toLowerCase() === mainCommand || (mainCommand === 'comfy' && s.id === 'comfyui'));

    if (matched) {
      const service = this.kernel.getService(matched.id);
      if (service && service.executeCommand) {
        return service.executeCommand(args.slice(1), onChunk);
      }
    }

    // Default chat turn fallback
    const active = this.chatEngine.getActiveSession();
    if (active) {
      return this.chatEngine.executeTurn({
        sessionId: active.id,
        userPrompt: trimmed,
        onChunk
      });
    }

    return `Command not recognized: '${mainCommand}'. Type 'help' for available commands.`;
  }

  private renderHelp(): string {
    return [
      '=======================================================================',
      ' JSAIOS In-Browser Client Terminal Reference (Mode B)',
      '=======================================================================',
      ' Core System Commands:',
      '  help                               - Display command reference',
      '  status                             - Display in-browser kernel status',
      '  services                           - List registered AI service drivers',
      '  clear                              - Clear terminal screen output',
      '',
      ' Interactive Chat Engine Commands:',
      '  chat status                        - View active chat session status',
      '  chat new <name> [provider] [model] - Create a new chat session',
      '  chat list                          - List all in-browser chat sessions',
      '  chat switch <session_id>           - Switch active chat session',
      '  chat delete <session_id>           - Delete chat session from LocalStorage',
      '  chat send <message>                - Send message turn to active session',
      '',
      ' Registered AI Service Drivers:',
      '  ollama status | models | run       - Ollama REST API transport driver',
      '  comfy status | workflows | prompt  - ComfyUI REST API transport driver',
      '  copilot status | models | prompt   - GitHub Copilot REST API transport driver',
      '======================================================================='
    ].join('\n');
  }
}
