/**
 * JSAIOS - Adapter: CommandInterpreter
 * Data-Driven Generic Terminal & Server Command Interpreter.
 * Parses interactive shell and server REST command inputs and dispatches commands dynamically via HoneyKernel and declarative JSON manifests.
 */

import fs from 'fs';
import path from 'path';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { ServiceDescriptor, CommandDoc } from '../../kernel/types';
import { handleChatCLI } from '../cli/chat/ChatCLIAdapter';
import { handleOllamaCLI } from '../cli/services/OllamaCLIAdapter';
import { handleComfyCLI } from '../cli/services/ComfyCLIAdapter';
import { handleCopilotCLI } from '../cli/services/CopilotCLIAdapter';
import { handleContextCommand } from '../../shell/terminal/commands/context/index';
import { handleChainCommand } from '../../shell/terminal/commands/chain/index';
import { handlePlayJingle } from '../../shell/terminal/commands/playJingle';
import { renderDescriptorHelp, renderCoreCommandHelp, suggestFuzzyTarget } from './helpers/renderHelp';
import { getCompletions as computeCompletions } from './helpers/getCompletions';
import { ContextEngine } from '../../engines/context/ContextEngine';
import { ChainEngine } from '../../engines/chain/ChainEngine';
import type { OllamaService } from '../../services/ai/ollama/OllamaService';
import type { ComfyUIService } from '../../services/ai/comfyui/ComfyUIService';
import type { CopilotService } from '../../services/ai/copilot/CopilotService';

export interface TerminalManifestConfig {
  version: string;
  defaultEnvironment: string;
  promptPrefix: string;
  environments: Record<string, string>;
  builtins: Array<CommandDoc>;
  descriptors?: Record<string, ServiceDescriptor>;
  defaultTemplates?: Array<{ id: string; name: string; template: string; description?: string }>;
}

export class CommandInterpreter {
  private contextEngine: ContextEngine = new ContextEngine();
  private chainEngine: ChainEngine = new ChainEngine(undefined, undefined, this.contextEngine);

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
      { command: 'help [target]', description: "Display terminal reference or target help (e.g. 'help chat', 'help ollama')" },
      { command: 'status', description: 'Display system status and uptime' },
      { command: 'services', description: 'List registered service drivers & driver help instructions' },
      { command: 'chat', description: "JSAIOS Interactive Chat Engine (Use 'chat help' or 'help chat')" },
      { command: 'context', description: "Context Management Engine (Use 'context help' or 'help context')" },
      { command: 'chain', description: "Multi-Step Workflow Chain Engine (Use 'chain help' or 'help chain')" },
      { command: 'clear', description: 'Clear terminal output screen' },
      { command: 'exit', description: 'Quit terminal shell' }
    ]
  };

  constructor(private kernel: HoneyKernel, manifestPath?: string) {
    this.loadManifest(manifestPath);
  }

  private loadManifest(customManifestPath?: string): void {
    try {
      const targetPath = customManifestPath || path.join(process.cwd(), 'config', 'default.terminal.json');
      if (fs.existsSync(targetPath)) {
        const parsed = JSON.parse(fs.readFileSync(targetPath, 'utf-8'));
        this.config = { ...this.config, ...parsed };

        if (Array.isArray(parsed.defaultTemplates)) {
          for (const tmpl of parsed.defaultTemplates) {
            this.contextEngine.registerTemplate(tmpl);
          }
        }
      }
    } catch {
      // Fallback defaults
    }
  }

  public getManifest(): TerminalManifestConfig {
    return this.config;
  }

  public getContextEngine(): ContextEngine {
    return this.contextEngine;
  }

  public getChainEngine(): ChainEngine {
    return this.chainEngine;
  }

  public getCompletions(line: string): [string[], string] {
    return computeCompletions(line, this.config, this.kernel);
  }

  public async execute(
    input: string,
    onStreamChunk?: (chunkText: string) => void
  ): Promise<string> {
    const trimmed = input.trim();
    if (!trimmed) return '';

    const args = trimmed.split(/\s+/);
    const mainCommand = args[0].toLowerCase();

    switch (mainCommand) {
      case 'help':
        if (args[1]) return this.handleTargetHelp(args[1]);
        return this.handleHelp();
      case 'status':
        return this.handleStatus();
      case 'services':
        if (args[1] === 'help') return this.handleTargetHelp('services');
        return this.handleServices();
      case 'context':
        if (args[1] === 'help') return this.handleTargetHelp('context');
        return handleContextCommand(args.slice(1), this.contextEngine);
      case 'chain':
        if (args[1] === 'help') return this.handleTargetHelp('chain');
        return await handleChainCommand(args.slice(1), this.chainEngine);
      case 'jingle':
        return handlePlayJingle();
      case 'clear':
        return '__CLEAR__';
    }

    if (mainCommand === 'chat') {
      if (args[1] === 'help') return this.handleTargetHelp('chat');
      return handleChatCLI(this.kernel, args.slice(1), onStreamChunk);
    }

    if (mainCommand === 'ollama') {
      if (args[1] === 'help') return this.handleTargetHelp('ollama');
      const srv = this.kernel.getService<OllamaService>('ollama');
      if (srv) return handleOllamaCLI(srv, args.slice(1), onStreamChunk);
    }

    if (mainCommand === 'comfy' || mainCommand === 'comfyui') {
      if (args[1] === 'help') return this.handleTargetHelp('comfyui');
      const srv = this.kernel.getService<ComfyUIService>('comfyui');
      if (srv) return handleComfyCLI(srv, args.slice(1));
    }

    if (mainCommand === 'copilot') {
      if (args[1] === 'help') return this.handleTargetHelp('copilot');
      const srv = this.kernel.getService<CopilotService>('copilot');
      if (srv) return handleCopilotCLI(srv, args.slice(1), onStreamChunk);
    }

    return `Command not recognized: '${mainCommand}'. Type 'help' for available CLI commands.`;
  }

  public handleHelp(): string {
    const lines: string[] = [
      '=======================================================================',
      ' JSAIOS HoneyKernel Core Terminal Reference',
      '=======================================================================',
      ' Core System Commands:'
    ];

    for (const b of this.config.builtins) {
      const padding = ' '.repeat(Math.max(2, 35 - b.command.length));
      lines.push(`  ${b.command}${padding}- ${b.description}`);
    }

    lines.push('\n=======================================================================');
    lines.push(' 💡 Tip: Type \'help <target>\' (e.g. \'help chat\', \'help services\', \'help ollama\')');
    lines.push('        for detailed subcommands, arguments, and options.');
    lines.push('=======================================================================');
    return lines.join('\n');
  }

  private handleTargetHelp(targetId: string): string {
    const query = targetId.toLowerCase().trim();

    if (this.config.descriptors?.[query]) {
      return renderDescriptorHelp(this.config.descriptors[query]);
    }

    const builtin = this.config.builtins.find(b => b.command.toLowerCase().split(' ')[0] === query);
    if (builtin) {
      return renderCoreCommandHelp(builtin);
    }

    const activeServices = this.kernel.getStatus().activeServices;
    const service = activeServices.find(
      s => s.id.toLowerCase() === query || s.name.toLowerCase().includes(query) || (query === 'comfy' && s.id === 'comfyui')
    );

    if (service) {
      return renderDescriptorHelp(service.descriptor || service);
    }

    const available = [
      ...this.config.builtins.map(b => b.command.split(' ')[0]),
      ...Object.keys(this.config.descriptors || {}),
      ...activeServices.map(s => s.id)
    ];

    return suggestFuzzyTarget(query, available);
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
    if (status.activeServices.length === 0) return 'No active service drivers registered in HoneyKernel.';

    const lines: string[] = [
      '=== Registered Micro-Service Drivers ==='
    ];

    for (const s of status.activeServices) {
      lines.push(`  • ${s.id.padEnd(12)} : ${s.name} [${s.status.toUpperCase()}]`);
      lines.push(`                  Capabilities: [${s.capabilities.join(', ')}]`);
      lines.push(`                  Type 'help ${s.id}' for available subcommands & parameters.\n`);
    }

    return lines.join('\n');
  }
}

export { CommandInterpreter as TerminalInterpreter };
