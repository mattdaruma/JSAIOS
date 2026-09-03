/**
 * JSAIOS - Single-purpose helper: inspectComfyWorkflow
 * Parses a saved ComfyUI workflow JSON graph and extracts configurable user inputs/options.
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
  const nodes = graphJson.nodes || graphJson;
  const nodeKeys = Object.keys(nodes);

  for (const key of nodeKeys) {
    const node = nodes[key];
    const classType = node.class_type || node.type || 'UnknownNode';
    const inputs = node.inputs || node.widgets_values;

    if (inputs && typeof inputs === 'object') {
      for (const inputName of Object.keys(inputs)) {
        const val = inputs[inputName];
        if (!Array.isArray(val)) {
          options.push({
            nodeId: String(key),
            classType,
            inputName,
            currentValue: val,
            valueType: typeof val
          });
        }
      }
    }
  }

  return options;
}

export async function inspectComfyWorkflow(
  endpoint: string,
  rawWorkflowId: string
): Promise<WorkflowInspectionResult | null> {
  try {
    const cleanName = rawWorkflowId.replace(/^["']|["']$/g, '').trim();
    if (!cleanName) return null;

    const targetFileName = cleanName.endsWith('.json') ? cleanName : `${cleanName}.json`;

    // URI encode filename for spaces and special characters
    const encodedTarget = encodeURIComponent(targetFileName);
    let res = await fetch(`${endpoint}/userdata/workflows/${encodedTarget}`);

    // Fallback: try raw cleanName if extension check differed
    if (!res.ok && cleanName !== targetFileName) {
      const encodedRaw = encodeURIComponent(cleanName);
      res = await fetch(`${endpoint}/userdata/workflows/${encodedRaw}`);
    }

    if (!res.ok) return null;

    const graph = await res.json();
    const options = extractWorkflowOptions(graph);

    return {
      workflowId: targetFileName,
      nodeCount: Object.keys(graph.nodes || graph).length,
      options
    };
  } catch {
    return null;
  }
}
