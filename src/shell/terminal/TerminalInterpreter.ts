/**
 * JSAIOS - TerminalInterpreter
 * Shell command parser and execution dispatcher for HoneyKernel.
 * Dynamically formats CLI help documentation based on loaded micro-services.
 */

import { HoneyKernel } from '../../kernel/HoneyKernel';
import { OllamaService } from '../../services/ai/ollama/OllamaService';
import { ComfyUIService } from '../../services/ai/comfyui/ComfyUIService';
import type { TextGenerationRequest, MediaGenerationRequest } from '../../services/ai/AIService';

export interface TerminalOutputLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: number;
}

export class TerminalInterpreter {
  private kernel: HoneyKernel;

  constructor(kernel: HoneyKernel) {
    this.kernel = kernel;
  }

  /**
   * Execute a raw shell command line string
   */
  public async execute(commandLine: string, onStreamChunk?: (chunk: string) => void): Promise<string> {
    const trimmed = commandLine.trim();
    if (!trimmed) return '';

    const parts = trimmed.split(' ');
    const mainCommand = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (mainCommand) {
      case 'help':
        return this.handleHelp();

      case 'status':
        return this.handleStatus();

      case 'services':
        return this.handleServices();

      case 'ollama':
        return this.handleOllama(args, onStreamChunk);

      case 'comfy':
      case 'comfyui':
        return this.handleComfy(args);

      case 'clear':
        return '__CLEAR__';

      default:
        return `Command not recognized: '${mainCommand}'. Type 'help' for available CLI commands.`;
    }
  }

  /**
   * Dynamically construct help reference based on loaded kernel services
   */
  private handleHelp(): string {
    const lines: string[] = [
      '=======================================================================',
      ' Available JSAIOS Terminal Commands (Dynamically Rendered)',
      '=======================================================================',
      ' Core Kernel Commands:',
      '  help                                - Show this dynamically rendered command reference',
      '  status                              - Display HoneyKernel status and system uptime',
      '  services                            - List registered micro-service drivers and status',
      '  clear                               - Clear terminal output',
      '  exit                                - Quit JSAIOS system CLI'
    ];

    const activeServices = this.kernel.getStatus().activeServices;

    for (const service of activeServices) {
      if (service.cliCommands && service.cliCommands.length > 0) {
        lines.push('');
        lines.push(` Micro-Service: ${service.name} (${service.id} v${service.version}):`);

        for (const cmd of service.cliCommands) {
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
      }
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

  private async handleOllama(args: string[], onStreamChunk?: (chunk: string) => void): Promise<string> {
    const ollama = this.kernel.getService<OllamaService>('ollama');
    if (!ollama) return 'Error: OllamaService is not registered or active in this JSAIOS session.';

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'status' || !sub) {
      const healthy = await ollama.checkHealth();
      return healthy ? 'Ollama Service: ONLINE (Endpoint reachable)' : 'Ollama Service: UNREACHABLE (Is Ollama running on http://localhost:11434?)';
    }

    if (sub === 'models' || sub === 'list') {
      const models = await ollama.getModels();
      if (models.length === 0) return 'No Ollama models found or connection failed.';
      return [
        'Available Ollama Models:',
        ...models.map(m => ` • ${m.name} (Family: ${m.family}, Size: ${m.sizeBytes ? Math.round(m.sizeBytes / 1024 / 1024) + 'MB' : 'unknown'})`)
      ].join('\n');
    }

    if (sub === 'prompt' || sub === 'ask') {
      if (args.length < 3) return 'Usage: ollama prompt <model> [options] <your prompt text...>';
      const model = args[1];
      const rawTokens = args.slice(2);

      let think: boolean | undefined = undefined;
      let temperature: number | undefined = undefined;
      let systemDirective: string | undefined = undefined;
      let maxTokens: number | undefined = undefined;
      const promptParts: string[] = [];

      for (let i = 0; i < rawTokens.length; i++) {
        const token = rawTokens[i];

        if (token === '--no-think' || token === '--think=false') {
          think = false;
        } else if (token === '--think' || token === '--think=true') {
          think = true;
        } else if (token === '--temp' || token === '-t') {
          const val = parseFloat(rawTokens[++i]);
          if (!isNaN(val)) temperature = val;
        } else if (token.startsWith('--temp=')) {
          const val = parseFloat(token.split('=')[1]);
          if (!isNaN(val)) temperature = val;
        } else if (token === '--system' || token === '-s') {
          systemDirective = rawTokens[++i];
        } else if (token.startsWith('--system=')) {
          systemDirective = token.split('=').slice(1).join('=');
        } else if (token === '--max-tokens') {
          const val = parseInt(rawTokens[++i], 10);
          if (!isNaN(val)) maxTokens = val;
        } else {
          promptParts.push(token);
        }
      }

      const promptText = promptParts.join(' ');
      if (!promptText) return 'Error: Prompt text cannot be empty after options flags.';

      const req: TextGenerationRequest = {
        model,
        prompt: promptText,
        think,
        temperature,
        systemDirective,
        maxTokens,
        stream: true
      };

      try {
        const result = await ollama.generateText(req, onStreamChunk);
        return result.text;
      } catch (err: any) {
        return `Ollama prompt error: ${err.message || err}`;
      }
    }

    return `Unknown Ollama command '${sub}'. Use 'ollama status', 'ollama models', or 'ollama prompt <model> [options] <text>'.`;
  }

  private async handleComfy(args: string[]): Promise<string> {
    const comfy = this.kernel.getService<ComfyUIService>('comfyui');
    if (!comfy) return 'Error: ComfyUIService is not registered or active in this JSAIOS session.';

    const sub = (args[0] || '').toLowerCase();

    if (sub === 'status' || !sub) {
      const healthy = await comfy.checkHealth();
      return healthy ? 'ComfyUI Service: ONLINE (Endpoint reachable)' : 'ComfyUI Service: UNREACHABLE (Is ComfyUI running on http://localhost:8188?)';
    }

    if (sub === 'workflows' || sub === 'templates') {
      const workflows = comfy.getWorkflows();
      if (workflows.length === 0) return 'No local workflow JSON templates found in config/workflows/';
      return [
        'Available Local Workflow Templates (config/workflows/):',
        ...workflows.map(w => ` • Workflow ID: '${w.id}' (${w.filename})`)
      ].join('\n');
    }

    if (sub === 'nodes') {
      const filter = (args[1] || '').toLowerCase();
      const nodes = await comfy.getNodeInfo();
      if (nodes.length === 0) return 'Failed to fetch ComfyUI node definitions from /object_info. Is ComfyUI running?';

      const filtered = filter ? nodes.filter(n => n.name.toLowerCase().includes(filter) || n.category.toLowerCase().includes(filter)) : nodes;
      const displayList = filtered.slice(0, 35);

      return [
        `ComfyUI Node Types (${filtered.length} total found${filter ? ` matching '${filter}'` : ''}):`,
        ...displayList.map(n => ` • ${n.name} (Category: ${n.category})`),
        ...(filtered.length > 35 ? [` ...and ${filtered.length - 35} more node types. Use 'comfy nodes <search_term>' to filter.`] : [])
      ].join('\n');
    }

    if (sub === 'node') {
      if (!args[1]) return 'Usage: comfy node <node_name> (e.g. comfy node KSampler)';
      const nodeName = args[1];
      const nodes = await comfy.getNodeInfo(nodeName);
      if (nodes.length === 0) return `Node type '${nodeName}' not found in ComfyUI /object_info catalog.`;

      const node = nodes[0];
      const requiredInputs = Object.keys(node.inputsRequired).map(k => `    - ${k}: ${JSON.stringify(node.inputsRequired[k][0])}`);
      const optionalInputs = Object.keys(node.inputsOptional || {}).map(k => `    - ${k}: ${JSON.stringify(node.inputsOptional![k][0])}`);

      return [
        `=== ComfyUI Node Schema: ${node.name} ===`,
        `Category: ${node.category}`,
        `Description: ${node.description || 'N/A'}`,
        'Required Inputs:',
        ...(requiredInputs.length > 0 ? requiredInputs : ['    (None)']),
        'Optional Inputs:',
        ...(optionalInputs.length > 0 ? optionalInputs : ['    (None)']),
        `Output Types: [${node.outputTypes.join(', ')}]`
      ].join('\n');
    }

    if (sub === 'prompt' || sub === 'generate') {
      if (args.length < 2) return 'Usage: comfy prompt [options] <your prompt text...>';
      const rawTokens = args.slice(1);

      let negativePrompt: string | undefined = undefined;
      let steps: number | undefined = undefined;
      let cfg: number | undefined = undefined;
      let width: number | undefined = undefined;
      let height: number | undefined = undefined;
      let seed: number | undefined = undefined;
      let samplerName: string | undefined = undefined;
      let checkpoint: string | undefined = undefined;
      const promptParts: string[] = [];

      for (let i = 0; i < rawTokens.length; i++) {
        const token = rawTokens[i];

        if (token === '--neg') {
          negativePrompt = rawTokens[++i];
        } else if (token.startsWith('--neg=')) {
          negativePrompt = token.split('=').slice(1).join('=');
        } else if (token === '--steps') {
          const val = parseInt(rawTokens[++i], 10);
          if (!isNaN(val)) steps = val;
        } else if (token === '--cfg') {
          const val = parseFloat(rawTokens[++i]);
          if (!isNaN(val)) cfg = val;
        } else if (token === '--width') {
          const val = parseInt(rawTokens[++i], 10);
          if (!isNaN(val)) width = val;
        } else if (token === '--height') {
          const val = parseInt(rawTokens[++i], 10);
          if (!isNaN(val)) height = val;
        } else if (token === '--seed') {
          const val = parseInt(rawTokens[++i], 10);
          if (!isNaN(val)) seed = val;
        } else if (token === '--sampler') {
          samplerName = rawTokens[++i];
        } else if (token === '--ckpt') {
          checkpoint = rawTokens[++i];
        } else {
          promptParts.push(token);
        }
      }

      const promptText = promptParts.join(' ');
      if (!promptText) return 'Error: Prompt text cannot be empty after options flags.';

      const req: MediaGenerationRequest = {
        prompt: promptText,
        negativePrompt,
        steps,
        cfg,
        width,
        height,
        seed,
        samplerName,
        checkpoint
      };

      try {
        const result = await comfy.generateMedia(req);
        return `ComfyUI workflow graph submitted successfully! Task ID: ${result.taskId}`;
      } catch (err: any) {
        return `ComfyUI error: ${err.message || err}`;
      }
    }

    return `Unknown ComfyUI command '${sub}'. Use 'comfy status', 'comfy workflows', 'comfy nodes', 'comfy node <name>', or 'comfy prompt [options] <text>'.`;
  }
}
