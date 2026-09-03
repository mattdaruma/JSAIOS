/**
 * JSAIOS - Single-purpose helper: inspectComfyWorkflow
 * Parses a saved ComfyUI workflow JSON graph and extracts configurable user inputs & options.
 * Disambiguates duplicate input names across nodes and generates ready-to-run CLI flags.
 */

import { resolveGraphRoot } from './resolveGraphRoot';

export interface WorkflowInputOption {
  nodeId: string;
  classType: string;
  nodeTitle?: string;
  inputName: string;
  currentValue: any;
  valueType: string;
  flagName: string;
  nodeFlagName: string;
}

export interface WorkflowInspectionResult {
  workflowId: string;
  nodeCount: number;
  options: WorkflowInputOption[];
}

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

export function extractWorkflowOptions(graphJson: any): WorkflowInputOption[] {
  const rawOptions: Array<Omit<WorkflowInputOption, 'flagName' | 'nodeFlagName'>> = [];
  const root = resolveGraphRoot(graphJson);
  if (!root || typeof root !== 'object') return [];

  const rawNodes = root.nodes || root.prompt || root;

  const processNode = (nodeId: string, classType: string, nodeObj: any) => {
    if (!nodeObj || typeof nodeObj !== 'object') return;
    const nodeTitle = nodeObj.title || nodeObj.properties?.['Node name for S&R'] || undefined;

    if (Array.isArray(nodeObj.widgets)) {
      nodeObj.widgets.forEach((w: any, idx: number) => {
        if (w && typeof w === 'object') {
          const name = w.name || w.label || `widget_${idx + 1}`;
          const val = w.value !== undefined ? w.value : w.val;
          if (val !== undefined && val !== null && typeof val !== 'object') {
            rawOptions.push({ nodeId, classType, nodeTitle, inputName: name, currentValue: val, valueType: typeof val });
          }
        }
      });
    }

    if (Array.isArray(nodeObj.widgets_values)) {
      const widgetSlots = Array.isArray(nodeObj.inputs)
        ? nodeObj.inputs.filter((s: any) => s.widget || (s.type !== 'MODEL' && s.type !== 'CONDITIONING' && s.type !== 'LATENT' && s.type !== 'VAE'))
        : [];
      const knownNames = KNOWN_WIDGET_MAPS[classType] || [];

      nodeObj.widgets_values.forEach((val: any, idx: number) => {
        if (val !== undefined && val !== null && typeof val !== 'object') {
          const slot = widgetSlots[idx];
          const name = slot?.widget?.name || slot?.name || knownNames[idx] || `widget_${idx + 1}`;
          rawOptions.push({ nodeId, classType, nodeTitle, inputName: name, currentValue: val, valueType: typeof val });
        }
      });
    } else if (nodeObj.widgets_values && typeof nodeObj.widgets_values === 'object') {
      for (const [k, v] of Object.entries(nodeObj.widgets_values)) {
        if (v !== undefined && v !== null && typeof v !== 'object') {
          rawOptions.push({ nodeId, classType, nodeTitle, inputName: k, currentValue: v, valueType: typeof val });
        }
      }
    }

    if (nodeObj.inputs && !Array.isArray(nodeObj.inputs) && typeof nodeObj.inputs === 'object') {
      for (const [inputName, val] of Object.entries(nodeObj.inputs)) {
        if (!Array.isArray(val) && typeof val !== 'object' && val !== undefined && val !== null) {
          rawOptions.push({ nodeId, classType, nodeTitle, inputName, currentValue: val, valueType: typeof val });
        }
      }
    } else if (Array.isArray(nodeObj.inputs)) {
      nodeObj.inputs.forEach((slot: any, idx: number) => {
        if (slot && typeof slot === 'object') {
          const val = slot.value !== undefined ? slot.value : slot.val;
          if (val !== undefined && val !== null && typeof val !== 'object') {
            rawOptions.push({ nodeId, classType, nodeTitle, inputName: slot.name || `slot_${idx + 1}`, currentValue: val, valueType: typeof val });
          }
        }
      });
    }

    const props = nodeObj.properties || nodeObj.values;
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      for (const [propKey, val] of Object.entries(props)) {
        if (val !== undefined && val !== null && typeof val !== 'object' && !propKey.startsWith('Node name')) {
          rawOptions.push({ nodeId, classType, nodeTitle, inputName: propKey, currentValue: val, valueType: typeof val });
        }
      }
    }
  };

  if (Array.isArray(rawNodes)) {
    for (const node of rawNodes) {
      if (node && typeof node === 'object') {
        processNode(String(node.id ?? node.title ?? 'node'), node.type || node.class_type || 'UnknownNode', node);
      }
    }
  } else if (rawNodes && typeof rawNodes === 'object') {
    for (const [nodeId, nodeObj] of Object.entries(rawNodes)) {
      if (nodeObj && typeof nodeObj === 'object') {
        processNode(nodeId, (nodeObj as any).class_type || (nodeObj as any).type || 'UnknownNode', nodeObj);
      }
    }
  }

  const uniqueRaw: Array<Omit<WorkflowInputOption, 'flagName' | 'nodeFlagName'>> = [];
  const seenKeys = new Set<string>();

  for (const opt of rawOptions) {
    const key = `${opt.nodeId}:${opt.inputName}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueRaw.push(opt);
    }
  }

  const nameCounts: Record<string, number> = {};
  for (const opt of uniqueRaw) {
    nameCounts[opt.inputName] = (nameCounts[opt.inputName] || 0) + 1;
  }

  return uniqueRaw.map(opt => {
    const isShared = (nameCounts[opt.inputName] || 0) > 1;
    const nodeFlagName = `--node${opt.nodeId}.${opt.inputName}`;
    const flagName = isShared ? nodeFlagName : `--${opt.inputName}`;
    return { ...opt, flagName, nodeFlagName };
  });
}

export async function inspectComfyWorkflow(
  endpoint: string,
  rawWorkflowId: string
): Promise<WorkflowInspectionResult | null> {
  const cleanName = rawWorkflowId.replace(/^["']|["']$/g, '').replace(/\.json$/i, '').trim();
  if (!cleanName) return null;

  const targetFileName = `${cleanName}.json`;
  const encodedSubdirPath = encodeURIComponent(`workflows/${targetFileName}`);
  const encodedSubdirClean = encodeURIComponent(`workflows/${cleanName}`);
  const encodedFileName = encodeURIComponent(targetFileName);

  const candidateUrls = [
    `${endpoint}/userdata/${encodedSubdirPath}`,
    `${endpoint}/userdata/${encodedSubdirClean}`,
    `${endpoint}/userdata/workflows/${encodedFileName}`,
    `${endpoint}/userdata/workflows/${targetFileName}`,
    `${endpoint}/userdata?dir=workflows&filename=${encodedFileName}`
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const rawJson = await res.json();
        if (rawJson && typeof rawJson === 'object') {
          const root = resolveGraphRoot(rawJson);
          const options = extractWorkflowOptions(root);
          const rawNodes = root.nodes || root.prompt || root;
          const nodeCount = Array.isArray(rawNodes) ? rawNodes.length : Object.keys(rawNodes).length;
          return { workflowId: cleanName, nodeCount, options };
        }
      }
    } catch {}
  }
  return null;
}
