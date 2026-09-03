/**
 * JSAIOS - Single-purpose helper: inspectComfyWorkflow
 * Parses a saved ComfyUI workflow JSON graph and extracts configurable user inputs & options.
 * Fetches file content from ComfyUI REST endpoint using path-encoded userdata URIs.
 */

export interface WorkflowInputOption {
  nodeId: string;
  classType: string;
  inputName: string;
  currentValue: any;
  valueType: string;
}

export interface WorkflowInspectionResult {
  workflowId: string;
  nodeCount: number;
  options: WorkflowInputOption[];
}

export function resolveGraphRoot(rawResponse: any): any {
  if (!rawResponse || typeof rawResponse !== 'object') return rawResponse;

  if (rawResponse.workflow && typeof rawResponse.workflow === 'object') {
    return resolveGraphRoot(rawResponse.workflow);
  }

  if (typeof rawResponse.json === 'string') {
    try {
      return resolveGraphRoot(JSON.parse(rawResponse.json));
    } catch {}
  } else if (rawResponse.json && typeof rawResponse.json === 'object') {
    return resolveGraphRoot(rawResponse.json);
  }

  if (typeof rawResponse.data === 'string') {
    try {
      return resolveGraphRoot(JSON.parse(rawResponse.data));
    } catch {}
  } else if (rawResponse.data && typeof rawResponse.data === 'object') {
    return resolveGraphRoot(rawResponse.data);
  }

  return rawResponse;
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
  const options: WorkflowInputOption[] = [];
  const root = resolveGraphRoot(graphJson);
  if (!root || typeof root !== 'object') return options;

  const rawNodes = root.nodes || root.prompt || root;

  const processNode = (nodeId: string, classType: string, nodeObj: any) => {
    if (!nodeObj || typeof nodeObj !== 'object') return;

    // 1. Inspect 'widgets' array (LiteGraph widget objects)
    if (Array.isArray(nodeObj.widgets)) {
      nodeObj.widgets.forEach((w: any, idx: number) => {
        if (w && typeof w === 'object') {
          const name = w.name || w.label || `widget_${idx + 1}`;
          const val = w.value !== undefined ? w.value : w.val;
          if (val !== undefined && val !== null && typeof val !== 'object') {
            options.push({
              nodeId,
              classType,
              inputName: name,
              currentValue: val,
              valueType: typeof val
            });
          }
        }
      });
    }

    // 2. Inspect 'widgets_values' array or object
    if (Array.isArray(nodeObj.widgets_values)) {
      const widgetSlots = Array.isArray(nodeObj.inputs)
        ? nodeObj.inputs.filter((s: any) => s.widget || (s.type !== 'MODEL' && s.type !== 'CONDITIONING' && s.type !== 'LATENT' && s.type !== 'VAE'))
        : [];
      const knownNames = KNOWN_WIDGET_MAPS[classType] || [];

      nodeObj.widgets_values.forEach((val: any, idx: number) => {
        if (val !== undefined && val !== null && typeof val !== 'object') {
          const slot = widgetSlots[idx];
          const name = slot?.widget?.name || slot?.name || knownNames[idx] || `widget_${idx + 1}`;
          options.push({
            nodeId,
            classType,
            inputName: name,
            currentValue: val,
            valueType: typeof val
          });
        }
      });
    } else if (nodeObj.widgets_values && typeof nodeObj.widgets_values === 'object') {
      for (const [k, v] of Object.entries(nodeObj.widgets_values)) {
        if (v !== undefined && v !== null && typeof v !== 'object') {
          options.push({
            nodeId,
            classType,
            inputName: k,
            currentValue: v,
            valueType: typeof v
          });
        }
      }
    }

    // 3. Inspect 'inputs' (Object or Array)
    if (nodeObj.inputs && !Array.isArray(nodeObj.inputs) && typeof nodeObj.inputs === 'object') {
      for (const [inputName, val] of Object.entries(nodeObj.inputs)) {
        // Ignore linked array connections like ["4", 0]
        if (!Array.isArray(val) && typeof val !== 'object' && val !== undefined && val !== null) {
          options.push({
            nodeId,
            classType,
            inputName,
            currentValue: val,
            valueType: typeof val
          });
        }
      }
    } else if (Array.isArray(nodeObj.inputs)) {
      nodeObj.inputs.forEach((slot: any, idx: number) => {
        if (slot && typeof slot === 'object') {
          const val = slot.value !== undefined ? slot.value : slot.val;
          if (val !== undefined && val !== null && typeof val !== 'object') {
            options.push({
              nodeId,
              classType,
              inputName: slot.name || `slot_${idx + 1}`,
              currentValue: val,
              valueType: typeof val
            });
          }
        }
      });
    }

    // 4. Inspect 'properties' or 'values' object
    const props = nodeObj.properties || nodeObj.values;
    if (props && typeof props === 'object' && !Array.isArray(props)) {
      for (const [propKey, val] of Object.entries(props)) {
        if (val !== undefined && val !== null && typeof val !== 'object' && !propKey.startsWith('Node name')) {
          options.push({
            nodeId,
            classType,
            inputName: propKey,
            currentValue: val,
            valueType: typeof val
          });
        }
      }
    }
  };

  if (Array.isArray(rawNodes)) {
    for (const node of rawNodes) {
      if (node && typeof node === 'object') {
        const nodeId = String(node.id ?? node.title ?? 'node');
        const classType = node.type || node.class_type || 'UnknownNode';
        processNode(nodeId, classType, node);
      }
    }
  } else if (rawNodes && typeof rawNodes === 'object') {
    for (const [nodeId, nodeObj] of Object.entries(rawNodes)) {
      if (nodeObj && typeof nodeObj === 'object') {
        const classType = (nodeObj as any).class_type || (nodeObj as any).type || 'UnknownNode';
        processNode(nodeId, classType, nodeObj);
      }
    }
  }

  // Deduplicate options for the same nodeId + inputName
  const uniqueOptions: WorkflowInputOption[] = [];
  const seenKeys = new Set<string>();

  for (const opt of options) {
    const key = `${opt.nodeId}:${opt.inputName}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueOptions.push(opt);
    }
  }

  return uniqueOptions;
}

export async function inspectComfyWorkflow(
  endpoint: string,
  rawWorkflowId: string
): Promise<WorkflowInspectionResult | null> {
  const cleanName = rawWorkflowId.replace(/^["']|["']$/g, '').replace(/\.json$/i, '').trim();
  if (!cleanName) return null;

  const targetFileName = `${cleanName}.json`;
  
  // Encoded full path relative to /userdata/ (e.g. "workflows%2FText%20to%20Image.json")
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
          const nodeCount = Array.isArray(rawNodes)
            ? rawNodes.length
            : Object.keys(rawNodes).length;

          return {
            workflowId: cleanName,
            nodeCount,
            options
          };
        }
      }
    } catch {
      // Continue to next candidate URL
    }
  }

  return null;
}
