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
  const rawNodes = graphJson.nodes || graphJson.prompt || graphJson;

  if (Array.isArray(rawNodes)) {
    // Schema 1: ComfyUI Web UI Saved/Exported Format (Array of Nodes)
    for (const node of rawNodes) {
      if (!node || typeof node !== 'object') continue;
      const nodeId = String(node.id ?? node.title ?? 'node');
      const classType = node.type || node.class_type || 'UnknownNode';

      // Parse widget values (text prompts, seed, steps, cfg, sampler, model names)
      if (Array.isArray(node.widgets_values)) {
        node.widgets_values.forEach((val: any, idx: number) => {
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
      } else if (node.widgets_values && typeof node.widgets_values === 'object') {
        for (const [k, v] of Object.entries(node.widgets_values)) {
          if (v !== undefined && typeof v !== 'object') {
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

      // Parse non-link inputs object
      if (node.inputs && !Array.isArray(node.inputs) && typeof node.inputs === 'object') {
        for (const [inputName, val] of Object.entries(node.inputs)) {
          if (!Array.isArray(val) && typeof val !== 'object' && val !== undefined) {
            options.push({
              nodeId,
              classType,
              inputName,
              currentValue: val,
              valueType: typeof val
            });
          }
        }
      }
    }
  } else if (rawNodes && typeof rawNodes === 'object') {
    // Schema 2: ComfyUI API Prompt Graph Format (Object keyed by node ID)
    for (const [nodeId, nodeObj] of Object.entries(rawNodes)) {
      if (!nodeObj || typeof nodeObj !== 'object') continue;
      const classType = (nodeObj as any).class_type || (nodeObj as any).type || 'UnknownNode';
      const inputs = (nodeObj as any).inputs;

      if (inputs && typeof inputs === 'object') {
        for (const [inputName, val] of Object.entries(inputs)) {
          // Linked connections in API prompt graphs are 2-element arrays like ["4", 0].
          // Primitive configurable inputs are strings, numbers, or booleans!
          if (!Array.isArray(val) && typeof val !== 'object' && val !== undefined) {
            options.push({
              nodeId,
              classType,
              inputName,
              currentValue: val,
              valueType: typeof val
            });
          }
        }
      }

      const widgets = (nodeObj as any).widgets_values;
      if (Array.isArray(widgets)) {
        widgets.forEach((val: any, idx: number) => {
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
      }
    }
  }

  return options;
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
