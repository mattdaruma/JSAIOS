/**
 * JSAIOS - Terminal Command Interpreter
 * Parses interactive shell inputs and dispatches commands to HoneyKernel or sub-engines.
 */

import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { ServiceDescriptor } from '../../kernel/types';
import { handleChatCLI, CHAT_ENGINE_DESCRIPTOR } from './commands/chatCLI';
import { ANSI } from './helpers/cliColors';

export class TerminalInterpreter {
  constructor(private kernel: HoneyKernel) {}

  /**
   * Interpret and execute an input command line string
   */
  public async execute(
    input: string,
    onStreamChunk?: (chunkText: string) => void
  ): Promise<string> {
    const trimmed = input.trim();
    if (!trimmed) return '';

    const args = trimmed.split(/\s+/);
    const mainCommand = args[0].toLowerCase();

    // 1. Built-in Core Kernel Shell Commands
    switch (mainCommand) {
      case 'help':
        if (args[1]) return this.handleServiceHelp(args[1]);
        return this.handleHelp();

      case 'status':
        return this.handleStatus();

      case 'services':
        return this.handleServices();

      case 'chat':
        if (args[1] === 'help') return this.handleServiceHelp('chat');
        return handleChatCLI(this.kernel, args.slice(1), onStreamChunk);

      case 'clear':
        return '__CLEAR__';
    }

    // 2. Dynamic Service Driver Command Dispatcher
    const activeServices = this.kernel.getStatus().activeServices;
    const matchedDescriptor = activeServices.find(
      s => s.id.toLowerCase() === mainCommand || (mainCommand === 'comfy' && s.id === 'comfyui')
    );

    if (matchedDescriptor) {
      if (args[1] === 'help') {
        return this.handleServiceHelp(matchedDescriptor.id);
      }

      const activeService = this.kernel.getService(matchedDescriptor.id);
      if (activeService && activeService.executeCommand) {
        return activeService.executeCommand(args.slice(1), onStreamChunk);
      }
    }

    return `${ANSI.brightRed}Command not recognized: '${mainCommand}'. Type 'help' for available CLI commands.${ANSI.reset}`;
  }

  /**
   * Render core kernel reference or delegate to service/engine help
   */
  public handleHelp(targetId?: string): string {
    if (targetId) {
      return this.handleServiceHelp(targetId);
    }

    const activeServices = this.kernel.getStatus().activeServices;

    const lines: string[] = [
      `${ANSI.brightCyan}=======================================================================${ANSI.reset}`,
      ` ${ANSI.brightYellow}${ANSI.bold}JSAIOS HoneyKernel Core Terminal Reference${ANSI.reset}`,
      `${ANSI.brightCyan}=======================================================================${ANSI.reset}`,
      ` ${ANSI.bold}Core Kernel Commands:${ANSI.reset}`,
      `  ${ANSI.brightYellow}help [target]${ANSI.reset}                       - Show core reference or help for a specific engine/service`,
      `  ${ANSI.brightYellow}status${ANSI.reset}                              - Display HoneyKernel status and system uptime`,
      `  ${ANSI.brightYellow}services${ANSI.reset}                            - List registered micro-service drivers and status`,
      `  ${ANSI.brightYellow}clear${ANSI.reset}                               - Clear terminal output`,
      `  ${ANSI.brightYellow}exit${ANSI.reset}                                - Quit JSAIOS system CLI`,
      '',
      ` ${ANSI.bold}Registered Engines & Modules:${ANSI.reset}`,
      `  • ${ANSI.brightYellow}chat${ANSI.reset}         - JSAIOS Interactive Chat Engine (Use 'help chat' or 'chat help')`
    ];

    if (activeServices.length > 0) {
      lines.push('');
      lines.push(` ${ANSI.bold}Registered Service Drivers (Type "help <service_id>" for detailed options):${ANSI.reset}`);
      for (const service of activeServices) {
        lines.push(`  • ${ANSI.brightYellow}${service.id.padEnd(12)}${ANSI.reset} - ${service.name} (Use 'help ${service.id}')`);
      }
    }

    lines.push(`\n${ANSI.brightCyan}=======================================================================${ANSI.reset}`);
    return lines.join('\n');
  }

  /**
   * Render detailed CLI commands and options for a specific engine or micro-service
   */
  private handleServiceHelp(targetId: string): string {
    const query = targetId.toLowerCase().trim();

    if (query === 'chat') {
      return this.renderDescriptorHelp(CHAT_ENGINE_DESCRIPTOR);
    }

    const activeServices = this.kernel.getStatus().activeServices;
    const service = activeServices.find(
      s => s.id.toLowerCase() === query || s.name.toLowerCase().includes(query) || (query === 'comfy' && s.id === 'comfyui')
    );

    if (!service) {
      return `${ANSI.brightRed}Target '${targetId}' not found. Type 'help' to view active engines and service drivers.${ANSI.reset}`;
    }

    return this.renderDescriptorHelp(service);
  }

  /**
   * Universal descriptor help renderer
   */
  private renderDescriptorHelp(descriptor: ServiceDescriptor): string {
    const lines: string[] = [
      `${ANSI.brightCyan}=======================================================================${ANSI.reset}`,
      ` ${ANSI.bold}Reference:${ANSI.reset} ${descriptor.name} (${descriptor.id} v${descriptor.version})`,
      `${ANSI.brightCyan}=======================================================================${ANSI.reset}`
    ];

    if (descriptor.commands && descriptor.commands.length > 0) {
      for (const cmd of descriptor.commands) {
        lines.push('');
        const cmdPadding = ' '.repeat(Math.max(2, 37 - cmd.command.length));
        lines.push(`  ${ANSI.brightYellow}${cmd.command}${ANSI.reset}${cmdPadding}- ${cmd.description}`);

        if (cmd.options && cmd.options.length > 0) {
          lines.push(`                                        ${ANSI.dim}Options:${ANSI.reset}`);
          for (const opt of cmd.options) {
            const optPadding = ' '.repeat(Math.max(2, 22 - opt.flag.length));
            lines.push(`                                          ${ANSI.brightMagenta}${opt.flag}${ANSI.reset}${optPadding}${opt.description}`);
          }
        }
      }
    } else {
      lines.push('  No commands documented.');
    }

    lines.push(`\n${ANSI.brightCyan}=======================================================================${ANSI.reset}`);
    return lines.join('\n');
  }

  private handleStatus(): string {
    const status = this.kernel.getStatus();
    return [
      '=== JSAIOS HoneyKernel Status ===',
      `Booted State: ${status.booted ? 'ACTIVE' : 'OFFLINE'}`,
      `Uptime: ${status.uptimeSeconds} seconds`,
      `Active Services Count: ${status.activeServices.length}`,
      ...status.activeServices.map(s => ` - [${s.status.toUpperCase()}] ${s.name} (${s.id} v${s.version})`)
    ].join('\n');
  }

  private handleServices(): string {
    const status = this.kernel.getStatus();
    if (status.activeServices.length === 0) return 'No active services registered in HoneyKernel.';

    return [
      'Registered Micro-Services:',
      ...status.activeServices.map(s =>
        `• Service ID: '${s.id}' | Name: ${s.name} | Capabilities: [${s.capabilities.join(', ')}]`
      )
    ].join('\n');
  }
}
