/**
 * JSAIOS - Single-purpose CLI handler: handleComfyCLI
 * Handles subcommands and option flag parsing for ComfyUIService CLI invocations.
 */

import type { ComfyUIService } from '../../../services/ai/comfyui/ComfyUIService';
import type { MediaGenerationRequest } from '../../../services/ai/AIService';

export async function handleComfyCLI(service: ComfyUIService, args: string[]): Promise<string> {
  const sub = (args[0] || '').toLowerCase();

  if (sub === 'status' || !sub) {
    const healthy = await service.checkHealth();
    return healthy
      ? 'ComfyUI Service: ONLINE (Endpoint reachable)'
      : 'ComfyUI Service: UNREACHABLE (Is ComfyUI running on http://localhost:8188?)';
  }

  if (sub === 'workflows' || sub === 'templates') {
    const workflows = await service.getWorkflows();
    if (workflows.length === 0) return 'No saved workflows reported by ComfyUI server (/userdata?dir=workflows/).';
    return [
      'ComfyUI Server Saved Workflows:',
      ...workflows.map(w => ` • ${w.id}`)
    ].join('\n');
  }

  if (sub === 'options' || sub === 'inspect') {
    const workflowId = args.slice(1).join(' ').trim();
    if (!workflowId) return 'Usage: comfy options <workflow_name> (e.g. comfy options "Text to Image")';
    const result = await service.inspectWorkflow(workflowId);

    if (!result) return `Workflow '${workflowId}' not found on ComfyUI server. Use 'comfy workflows' to list available workflows.`;

    const lines = [
      `=== Configurable Input Options for Workflow '${result.workflowId}' (${result.options.length} parameter(s) across ${result.nodeCount} node(s)) ===`
    ];

    const grouped: Record<string, typeof result.options> = {};
    for (const opt of result.options) {
      const key = `Node ${opt.nodeId} [${opt.classType}]`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(opt);
    }

    for (const groupKey of Object.keys(grouped)) {
      lines.push(`\n ${groupKey}:`);
      for (const opt of grouped[groupKey]) {
        lines.push(`    - ${opt.inputName} (${opt.valueType}): ${JSON.stringify(opt.currentValue)}`);
      }
    }

    return lines.join('\n');
  }

  if (sub === 'nodes') {
    const filter = (args[1] || '').toLowerCase();
    const nodes = await service.getNodeInfo();
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
    const nodes = await service.getNodeInfo(nodeName);
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
      const result = await service.generateMedia(req);
      return `ComfyUI workflow graph submitted successfully! Task ID: ${result.taskId}`;
    } catch (err: any) {
      return `ComfyUI error: ${err.message || err}`;
    }
  }

  return `Unknown ComfyUI command '${sub}'. Use 'comfy status', 'comfy workflows', 'comfy options <workflow>', 'comfy nodes', 'comfy node <name>', or 'comfy prompt [options] <text>'.`;
}
