/**
 * JSAIOS - Single-purpose helper: inspectComfyWorkflow
 * Parses a saved ComfyUI workflow JSON graph (supporting UI exports & API prompt graphs) and extracts configurable options.
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

export function extractWorkflowOptions(graphJson: any): WorkflowInputOption[] {
  const options: WorkflowInputOption[] = [];
  if (!graphJson || typeof graphJson !== 'object') return options;

  const rawNodes = graphJson.nodes || graphJson.prompt || graphJson;

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

    // 2. Inspect 'widgets_values' (Array or Object of primitive values)
    if (Array.isArray(nodeObj.widgets_values)) {
      nodeObj.widgets_values.forEach((val: any, idx: number) => {
        if (val !== undefined && val !== null && typeof val !== 'object') {
          options.push({
            nodeId,
            classType,
            inputName: `widget_${idx + 1}`,
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

  // Deduplicate options for the same nodeId + inputName + currentValue
  const uniqueOptions: WorkflowInputOption[] = [];
  const seenKeys = new Set<string>();

  for (const opt of options) {
    const key = `${opt.nodeId}:${opt.inputName}:${opt.currentValue}`;
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
  const encodedTarget = encodeURIComponent(targetFileName);
  const encodedClean = encodeURIComponent(cleanName);

  const candidateUrls = [
    `${endpoint}/userdata/workflows/${encodedTarget}`,
    `${endpoint}/userdata/workflows/${targetFileName}`,
    `${endpoint}/userdata/workflows/${encodedClean}`,
    `${endpoint}/userdata/workflows/${cleanName}`,
    `${endpoint}/userdata?dir=workflows&filename=${encodedTarget}`,
    `${endpoint}/userdata?dir=workflows&file=${encodedTarget}`,
    `${endpoint}/userdata?filename=workflows/${encodedTarget}`,
    `${endpoint}/userdata?file=workflows/${encodedTarget}`,
    `${endpoint}/userdata/${encodedTarget}`,
    `${endpoint}/userdata/${encodedClean}`
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const graph = await res.json();
        if (graph && typeof graph === 'object') {
          const options = extractWorkflowOptions(graph);
          const rawNodes = graph.nodes || graph.prompt || graph;
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
