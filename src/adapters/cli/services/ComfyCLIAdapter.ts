/**
 * JSAIOS - Single-purpose CLI handler: handleComfyCLI
 * Handles subcommands and option flag parsing for ComfyUIService CLI invocations.
 */

import type { ComfyUIService } from '../../../services/ai/comfyui/ComfyUIService';
import { parseComfyOptions } from './parseComfyOptions';

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

  return `Unknown ComfyUI command '${sub}'. Use 'comfy status', 'comfy workflows', 'comfy options <workflow>', or 'comfy prompt [options] <text>'.`;
}
