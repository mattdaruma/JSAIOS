/**
 * JSAIOS - Data-Driven Generic Terminal Command Interpreter
 * Parses interactive shell inputs and dispatches commands dynamically via HoneyKernel and declarative JSON manifests.
 * 100% domain-agnostic: contains zero AI or chat domain logic.
 */

import fs from 'fs';
import path from 'path';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { ServiceDescriptor } from '../../kernel/types';
import { CHAT_ENGINE_DESCRIPTOR, handleChatCLI } from '../../adapters/cli/chat/ChatCLIAdapter';
import { handleOllamaCLI } from '../../adapters/cli/services/OllamaCLIAdapter';
import { handleComfyCLI } from '../../adapters/cli/services/ComfyCLIAdapter';
import { handleCopilotCLI } from '../../adapters/cli/services/CopilotCLIAdapter';
import { handleContextCommand } from './commands/context/index';
import { ContextEngine } from '../../engines/context/ContextEngine';
import type { OllamaService } from '../../services/ai/ollama/OllamaService';
import type { ComfyUIService } from '../../services/ai/comfyui/ComfyUIService';
import type { CopilotService } from '../../services/ai/copilot/CopilotService';

export interface TerminalManifestConfig {
  version: string;
  defaultEnvironment: string;
  promptPrefix: string;
  environments: Record<string, string>;
  builtins: Array<{ command: string; description: string }>;
}

export class TerminalInterpreter {
  private contextEngine: ContextEngine = new ContextEngine();
  private config: TerminalManifestConfig = {
    version: '1.0.0',
    defaultEnvironment: 'win-cmd',
    promptPrefix: 'jsaios@honeykernel:~$ ',
    environments: {
      'win-cmd': 'WinCLIFormatter',
      'win-powershell': 'WinPowerShellFormatter',
      'posix-bash': 'POSIXBashFormatter',
      'plain': 'PlainTerminalFormatter'
    },
    builtins: [
      { command: 'help', description: 'Display HoneyKernel terminal reference or target help' },
      { command: 'status', description: 'Display system status and uptime' },
      { command: 'services', description: 'List registered service drivers' },
      { command: 'context', description: 'Inspect & assemble system directive prompt templates (context list|show|assemble)' },
      { command: 'clear', description: 'Clear terminal output screen' },
      { command: 'exit', description: 'Quit terminal shell' }
    ]
  };

  constructor(private kernel: HoneyKernel, manifestPath?: string) {
    this.loadManifest(manifestPath);
  }

  private loadManifest(customManifestPath?: string): void {
    try {
      const targetPath = customManifestPath || path.join(process.cwd(), 'config', 'jsaios.terminal.json');
      if (fs.existsSync(targetPath)) {
        const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        this.config = { ...this.config, ...parsed };
      }
    } catch {
      // Fallback defaults
    }
  }

  public getManifest(): TerminalManifestConfig {
    return this.config;
  }

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

    // 1. Core System Shell Built-in Targets
    switch (mainCommand) {
      case 'help':
        if (args[1]) return this.handleTargetHelp(args[1]);
        return this.handleHelp();

      case 'status':
        return this.handleStatus();

      case 'services':
        return this.handleServices();

      case 'context':
        return handleContextCommand(args.slice(1), this.contextEngine);

      case 'clear':
        return '__CLEAR__';
    }

    // 2. Chat Engine Dynamic Target Dispatcher
    if (mainCommand === 'chat') {
      if (args[1] === 'help') return this.handleTargetHelp('chat');
      return handleChatCLI(this.kernel, args.slice(1), onStreamChunk);
    }

    // 3. Service Drivers CLI Command Dispatcher
    if (mainCommand === 'ollama') {
      const srv = this.kernel.getService<OllamaService>('ollama');
      if (srv) return handleOllamaCLI(srv, args.slice(1), onStreamChunk);
    }

    if (mainCommand === 'comfy' || mainCommand === 'comfyui') {
      const srv = this.kernel.getService<ComfyUIService>('comfyui');
      if (srv) return handleComfyCLI(srv, args.slice(1));
    }

    if (mainCommand === 'copilot') {
      const srv = this.kernel.getService<CopilotService>('copilot');
      if (srv) return handleCopilotCLI(srv, args.slice(1), onStreamChunk);
    }

    return `Command not recognized: '${mainCommand}'. Type 'help' for available CLI commands.`;
  }

  /**
   * Render core kernel reference or delegate to service/engine help
   */
  public handleHelp(): string {
    const activeServices = this.kernel.getStatus().activeServices;

    const lines: string[] = [
      '=======================================================================',
      ' JSAIOS HoneyKernel Core Terminal Reference',
      '=======================================================================',
      ' Core Kernel Commands:'
    ];

    for (const b of this.config.builtins) {
      const padding = ' '.repeat(Math.max(2, 35 - b.command.length));
      lines.push(`  ${b.command}${padding}- ${b.description}`);
    }

    lines.push('');
    lines.push(' Registered Engines & Modules:');
    lines.push('  • chat         - JSAIOS Interactive Chat Engine (Use \'help chat\' or \'chat help\')');
    lines.push('  • context      - Context Management Engine (Use \'context list\', \'context show\', \'context assemble\')');

    if (activeServices.length > 0) {
      lines.push('');
      lines.push(' Registered Service Drivers (Type "help <service_id>" for detailed options):');
      for (const service of activeServices) {
        lines.push(`  • ${service.id.padEnd(12)} - ${service.name} (Use 'help ${service.id}')`);
      }
    }

    lines.push('\n=======================================================================');
    return lines.join('\n');
  }

  /**
   * Render detailed CLI commands and options for a specific engine or micro-service
   */
  private handleTargetHelp(targetId: string): string {
    const query = targetId.toLowerCase().trim();

    if (query === 'chat') {
      return this.renderDescriptorHelp(CHAT_ENGINE_DESCRIPTOR);
    }

    const activeServices = this.kernel.getStatus().activeServices;
    const service = activeServices.find(
      s => s.id.toLowerCase() === query || s.name.toLowerCase().includes(query) || (query === 'comfy' && s.id === 'comfyui')
    );

    if (!service) {
      return `Target '${targetId}' not found. Type 'help' to view active engines and service drivers.`;
    }

    return this.renderDescriptorHelp(service);
  }

  private renderDescriptorHelp(descriptor: ServiceDescriptor): string {
    const lines: string[] = [
      '=======================================================================',
      ` Reference: ${descriptor.name} (${descriptor.id} v${descriptor.version})`,
      '======================================================================='
    ];

    if (descriptor.commands && descriptor.commands.length > 0) {
      for (const cmd of descriptor.commands) {
        lines.push('');
        const cmdPadding = ' '.repeat(Math.max(2, 37 - cmd.command.length));
        lines.push(`  ${cmd.command}${cmdPadding}- ${cmd.description}`);

        if (cmd.options && cmd.options.length > 0) {
          lines.push('                                        Options:');
          for (const opt of cmd.options) {
            const optPadding = ' '.repeat(Math.max(2, 22 - opt.flag.length));
            lines.push(`                                          ${opt.flag}${optPadding}${opt.description}`);
          }
        }
      }
    } else {
      lines.push('  No commands documented.');
    }

    lines.push('\n=======================================================================');
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
