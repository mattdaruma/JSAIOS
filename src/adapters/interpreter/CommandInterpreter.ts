/**
 * JSAIOS - Single-purpose adapter: CommandInterpreter (TerminalInterpreter)
 * Parses Terminal inputs into single-purpose command handlers and manages command routing.
 */

import fs from 'fs';
import path from 'path';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { ServiceDescriptor, CommandDoc } from '../../kernel/types';
import { getTerminalFormatter } from '../../shell/terminal/helpers/getTerminalFormatter';
import { handleChatTerminal } from '../terminal/chat/ChatTerminalAdapter';
import { handleOllamaTerminal } from '../terminal/services/OllamaTerminalAdapter';
import { handleComfyTerminal } from '../terminal/services/ComfyTerminalAdapter';
import { handleCopilotTerminal } from '../terminal/services/CopilotTerminalAdapter';
import { handleContextTerminal } from '../terminal/context/ContextTerminalAdapter';
import { handleStructureCommands } from '../terminal/structure/structureCommands';
import { handleBatchCommands } from '../terminal/batch/batchCommands';
import { handleChainTerminal } from '../terminal/chain/ChainTerminalAdapter';
import { handleMcpCommands } from '../terminal/mcp/mcpCommands';
import { handleDatabaseCommands } from '../terminal/database/databaseCommands';
import { handleAwsTerminal } from '../terminal/services/AwsTerminalAdapter';
import { handlePlayJingle } from '../terminal/audio/AudioPlayerAdapter';
import { handleHelpCommand } from './helpers/renderHelp';
import { getCompletions } from './helpers/getCompletions';
import { tokenizeCommandLine } from './helpers/tokenizeCommandLine';
import { ContextEngine } from '../../engines/context/ContextEngine';
import { ChainEngine } from '../../engines/chain/ChainEngine';
import { BatchEngine } from '../../engines/batch/BatchEngine';
import { DatabaseEngine } from '../../engines/database/DatabaseEngine';
import { McpClientAdapter } from '../mcp/McpClientAdapter';
import { AwsService } from '../../services/cloud/aws/AwsService';
import { BatchSourceRegistry } from '../batch/BatchSourceRegistry';
import { FileBatchStorage } from '../storage/FileBatchStorage';
import { getOrCreateChatEngine } from '../factories/createChatEngine';
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
  private mcpClient: McpClientAdapter = new McpClientAdapter();
  private dbEngine: DatabaseEngine = new DatabaseEngine();
  private awsService: AwsService = new AwsService();
  private batchEngine: BatchEngine = new BatchEngine(undefined, new FileBatchStorage(), new BatchSourceRegistry(this.mcpClient, this.dbEngine, this.awsService));

  private config: TerminalManifestConfig = {
    version: '1.0.0',
    defaultEnvironment: 'win-cmd',
    promptPrefix: 'jsaios@honeykernel:~$ ',
    environments: {
      'win-cmd': 'WinTerminalFormatter',
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
      { command: 'structure', description: "Prompt & Response Structure Engine (Use 'structure help' or 'help structure')" },
      { command: 'batch', description: "Map-Reduce Batch File Processing Engine (Use 'batch help' or 'help batch')" },
      { command: 'chain', description: "Multi-Step Workflow Chain Engine (Use 'chain help' or 'help chain')" },
      { command: 'db', description: "Database Engine & State Management (Use 'db help' or 'help db')" },
      { command: 'jingle', description: 'Play system startup audio sample jingle' },
      { command: 'clear', description: 'Clear terminal output screen' },
      { command: 'exit', description: 'Quit terminal shell' }
    ]
  };

  constructor(private kernel: HoneyKernel, manifestPath?: string) {
    this.loadManifest(manifestPath);
    const chatEngine = getOrCreateChatEngine(kernel, this.contextEngine, this.chainEngine);
    this.chainEngine = new ChainEngine(kernel, chatEngine, this.contextEngine);
    this.batchEngine = new BatchEngine(kernel, new FileBatchStorage(), new BatchSourceRegistry(this.mcpClient, this.dbEngine, this.awsService));
    this.batchEngine.loadJobsFromStorage().catch(() => {});
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
    return getCompletions(line, this.config, this.kernel);
  }

  public async execute(
    commandLine: string,
    onChunk?: (chunkText: string) => void
  ): Promise<string> {
    const rawTokens = tokenizeCommandLine(commandLine);
    if (rawTokens.length === 0) return '';

    const rootCommand = rawTokens[0].toLowerCase();
    const args = rawTokens.slice(1);
    const formatter = getTerminalFormatter(this.config.defaultEnvironment);

    switch (rootCommand) {
      case 'help':
        return handleHelpCommand(args, this.config, formatter);

      case 'clear':
        return '__CLEAR__';

      case 'status': {
        const status = this.kernel.getStatus();
        const activeServices = status.activeServices || [];
        return [
          formatter.formatHeader(`=== JSAIOS HoneyKernel Status ===`),
          `State              : ${status.booted ? 'ACTIVE' : 'STOPPED'}`,
          `Uptime             : ${status.uptimeSeconds} seconds`,
          `Registered Services: ${activeServices.length}`,
          ...activeServices.map((s) => `  • ${s.id} (${s.name}): ${s.status}`)
        ].join('\n');
      }

      case 'services': {
        const services = this.kernel.listServices();
        if (services.length === 0) return 'No micro-services currently registered.';

        const lines = [formatter.formatHeader('=== Registered Micro-Service Drivers ===')];
        for (const s of services) {
          const desc = s.descriptor;
          lines.push(` • [${s.id}] ${desc.name} (v${desc.version}) - Status: ${desc.status}`);
          lines.push(`   Capabilities: ${desc.capabilities.join(', ')}`);
        }
        lines.push('');
        lines.push("Type 'help services' or 'help <service_id>' (e.g. 'help ollama') for subcommands.");
        return lines.join('\n');
      }

      case 'chat':
        return await handleChatTerminal(this.kernel, args, onChunk);

      case 'context':
        return handleContextTerminal(args, this.contextEngine);

      case 'structure':
        return handleStructureCommands(args, this.contextEngine);

      case 'batch':
        return await handleBatchCommands(args, this.batchEngine);

      case 'chain':
        return handleChainTerminal(args, this.chainEngine);

      case 'mcp':
        return await handleMcpCommands(args, this.mcpClient);

      case 'db':
      case 'database':
        return await handleDatabaseCommands(args, this.dbEngine);

      case 'aws':
        return await handleAwsTerminal(this.awsService, args);

      case 'ollama': {
        const service = this.kernel.getService<OllamaService>('ollama');
        if (!service) return formatter.formatError("Error: Service driver 'ollama' is not registered.");
        return handleOllamaTerminal(service, args, onChunk);
      }

      case 'comfy':
      case 'comfyui': {
        const service = this.kernel.getService<ComfyUIService>('comfyui');
        if (!service) return formatter.formatError("Error: Service driver 'comfyui' is not registered.");
        return handleComfyTerminal(service, args);
      }

      case 'copilot': {
        const service = this.kernel.getService<CopilotService>('copilot');
        if (!service) return formatter.formatError("Error: Service driver 'copilot' is not registered.");
        return handleCopilotTerminal(service, args, onChunk);
      }

      case 'jingle':
      case 'audio':
        return handlePlayJingle();

      default:
        return formatter.formatError(`Unknown command: '${rootCommand}'. Type "help" to view full command reference.`);
    }
  }
}

export const TerminalInterpreter = CommandInterpreter;
