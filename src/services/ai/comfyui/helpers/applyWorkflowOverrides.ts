/**
 * JSAIOS - Single-purpose helper: applyWorkflowOverrides
 * Takes a saved ComfyUI workflow graph, preserves 100% of its default node values,
 * and applies user-specified CLI option overrides (--width, --node2.text, --ckpt_name).
 */

import type { MediaGenerationRequest } from '../../AIService';
import { resolveGraphRoot } from './resolveGraphRoot';

const KNOWN_WIDGET_MAPS: Record<string, string[]> = {
  'KSampler': ['seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'denoise'],
  'KSamplerAdvanced': ['add_noise', 'seed', 'control_after_generate', 'steps', 'cfg', 'sampler_name', 'scheduler', 'start_at_step', 'end_at_step', 'return_with_leftover_noise'],
  'CLIPTextEncode': ['text'],
  'CheckpointLoaderSimple': ['ckpt_name'],
  'EmptyLatentImage': ['width', 'height', 'batch_size'],
  'VAELoader': ['vae_name'],
  'LoraLoader': ['lora_name', 'strength_model', 'strength_clip'],
  'SaveImage': ['filename_prefix']
};

export function applyWorkflowOverrides(rawGraph: any, request: MediaGenerationRequest): Record<string, any> {
  const root = resolveGraphRoot(rawGraph);
  const promptApiGraph: Record<string, any> = {};

  const rawNodes = root.nodes || root.prompt || root;

  // Helper to extract default inputs for a node
  const buildNodeInputs = (node: any) => {
    const inputs: Record<string, any> = {};
    if (node.inputs && !Array.isArray(node.inputs) && typeof node.inputs === 'object') {
      for (const [k, v] of Object.entries(node.inputs)) {
        inputs[k] = v;
      }
    }

    if (Array.isArray(node.widgets_values)) {
      const classType = node.type || node.class_type || '';
      const knownNames = KNOWN_WIDGET_MAPS[classType] || [];
      const widgetSlots = Array.isArray(node.inputs)
        ? node.inputs.filter((s: any) => s.widget || (s.type !== 'MODEL' && s.type !== 'CONDITIONING' && s.type !== 'LATENT' && s.type !== 'VAE'))
        : [];

      node.widgets_values.forEach((val: any, idx: number) => {
        const slot = widgetSlots[idx];
        const name = slot?.widget?.name || slot?.name || knownNames[idx] || `widget_${idx + 1}`;
        inputs[name] = val;
      });
    }

    return inputs;
  };

  // 1. Convert to API Prompt object format keyed by nodeId string
  if (Array.isArray(rawNodes)) {
    for (const node of rawNodes) {
      if (node && typeof node === 'object') {
        const nodeId = String(node.id ?? node.title ?? '1');
        const classType = node.type || node.class_type || 'UnknownNode';
        promptApiGraph[nodeId] = {
          class_type: classType,
          inputs: buildNodeInputs(node)
        };
      }
    }
  } else if (rawNodes && typeof rawNodes === 'object') {
    for (const [nodeId, nodeObj] of Object.entries(rawNodes)) {
      if (nodeObj && typeof nodeObj === 'object') {
        const classType = (nodeObj as any).class_type || (nodeObj as any).type || 'UnknownNode';
        promptApiGraph[nodeId] = {
          class_type: classType,
          inputs: { ...(nodeObj as any).inputs }
        };
      }
    }
  }

  // 2. Apply user-specified overrides onto default inputs
  const customOpts = request.options || {};

  for (const [nodeId, nodeObj] of Object.entries(promptApiGraph)) {
    const classType = nodeObj.class_type || '';
    const inputs = nodeObj.inputs || {};

    // Standard CLI flags overrides
    if (classType === 'EmptyLatentImage') {
      if (request.width !== undefined) inputs.width = request.width;
      if (request.height !== undefined) inputs.height = request.height;
    }

    if (classType === 'KSampler' || classType === 'KSamplerAdvanced') {
      if (request.seed !== undefined) inputs.seed = request.seed;
      if (request.steps !== undefined) inputs.steps = request.steps;
      if (request.cfg !== undefined) inputs.cfg = request.cfg;
      if (request.samplerName !== undefined) inputs.sampler_name = request.samplerName;
    }

    if (classType === 'CheckpointLoaderSimple') {
      if (request.checkpoint !== undefined) inputs.ckpt_name = request.checkpoint;
    }

    if (classType === 'CLIPTextEncode') {
      if (request.negativePrompt !== undefined && (nodeId === '3' || String(inputs.text || '').toLowerCase().includes('blur'))) {
        inputs.text = request.negativePrompt;
      } else if (request.prompt && request.prompt !== 'Generation Task' && nodeId !== '3') {
        inputs.text = request.prompt;
      }
    }

    // Node-qualified overrides e.g. --node2.text, --node3.clip, --ckpt_name
    for (const [optKey, optVal] of Object.entries(customOpts)) {
      if (optKey.startsWith(`node${nodeId}.`)) {
        const paramName = optKey.slice(`node${nodeId}.`.length);
        inputs[paramName] = optVal;
      } else if (optKey in inputs) {
        inputs[optKey] = optVal;
      }
    }
  }

  return promptApiGraph;
}
