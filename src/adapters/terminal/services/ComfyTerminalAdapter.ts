/**
 * JSAIOS - Single-purpose Terminal handler: handleComfyTerminal
 * Handles subcommands and option flag parsing for ComfyUIService Terminal invocations.
 */

import type { ComfyUIService } from '../../../services/ai/comfyui/ComfyUIService';
import { parseComfyOptions } from './parseComfyOptions';

export async function handleComfyTerminal(service: ComfyUIService, args: string[]): Promise<string> {
  const sub = (args[0] || '').toLowerCase();

  if (sub === 'status' || !sub) {
    const healthy = await service.checkHealth();
    return healthy
      ? 'ComfyUI Service: ONLINE (Endpoint reachable)'
      : 'ComfyUI Service: UNREACHABLE (Is ComfyUI running on http://localhost:8188?)';
  }

  if (sub === 'models' || sub === 'checkpoints' || sub === 'ckpts') {
    const models = await service.getModels();
    if (models.length === 0) return 'No installed model checkpoints reported by ComfyUI server (/object_info/CheckpointLoaderSimple).';
    return [
      `Available ComfyUI Checkpoints (${models.length}):`,
      ...models.map(m => ` • ${m.name}`)
    ].join('\n');
  }

  if (sub === 'workflows' || sub === 'templates') {
    const workflows = await service.getWorkflows();
    if (workflows.length === 0) return 'No saved workflows reported by ComfyUI server (/userdata?dir=workflows/).';
    return [
      'ComfyUI Server Saved Workflows:',
      ...workflows.map(w => {
        const name = typeof w === 'string' ? w : (w.filename || w.id || JSON.stringify(w));
        const cleanName = name.replace(/\.json$/i, '').trim();
        return ` • ${cleanName}`;
      })
    ].join('\n');
  }

  if (sub === 'options' || sub === 'inspect') {
    const rawInput = args.slice(1).join(' ').trim();
    const cleanWorkflowId = rawInput.replace(/^["']|["']$/g, '').replace(/\.json$/i, '').trim();

    if (!cleanWorkflowId) return 'Usage: comfy options <workflow_name> (e.g. comfy options "Text to Image")';
    const result = await service.inspectWorkflow(cleanWorkflowId);

    if (!result) return `Workflow '${cleanWorkflowId}' not found on ComfyUI server. Use 'comfy workflows' to list available workflows.`;

    const lines = [
      `=== Configurable Input Options for Workflow '${result.workflowId}' (${result.options.length} parameter(s) across ${result.nodeCount} node(s)) ===`
    ];

    const grouped: Record<string, typeof result.options> = {};
    for (const opt of result.options) {
      const titleSuffix = opt.nodeTitle ? ` "${opt.nodeTitle}"` : '';
      const key = `Node ${opt.nodeId} [${opt.classType}]${titleSuffix}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(opt);
    }

    const exampleFlags: string[] = [];

    for (const groupKey of Object.keys(grouped)) {
      lines.push(`\n ${groupKey}:`);
      for (const opt of grouped[groupKey]) {
        lines.push(`    - ${opt.inputName} (${opt.valueType}): ${JSON.stringify(opt.currentValue)}  [Flag: ${opt.flagName}]`);
        if (exampleFlags.length < 3) {
          exampleFlags.push(`${opt.flagName} ${JSON.stringify(opt.currentValue)}`);
        }
      }
    }

    lines.push('\n=======================================================================');
    lines.push(` 💡 How to Pass Options via Terminal:`);
    lines.push(`    Use '--<option_name> <value>' for unique parameters, or '--node<id>.<option_name> <value>' for specific nodes.`);
    lines.push(`\n 🚀 Example Command:`);
    lines.push(`    comfy prompt "${result.workflowId}" ${exampleFlags.join(' ')}`);
    lines.push('=======================================================================');

    return lines.join('\n');
  }

  if (sub === 'prompt' || sub === 'generate' || sub === 'run') {
    if (args.length < 2) return 'Usage: comfy prompt [options] <your prompt text...>';
    const { request, error } = parseComfyOptions(args.slice(1));

    if (error) return error;

    try {
      const result = await service.generateMedia(request);
      return `ComfyUI workflow graph submitted successfully! Task ID: ${result.taskId || 'queued'}`;
    } catch (err: any) {
      return `ComfyUI error: ${err.message || err}`;
    }
  }

  return `Unknown ComfyUI command '${sub}'. Use 'comfy status', 'comfy models', 'comfy workflows', 'comfy options <workflow>', or 'comfy prompt [options] <text>'.`;
}

export const handleComfyCLI = handleComfyTerminal;
