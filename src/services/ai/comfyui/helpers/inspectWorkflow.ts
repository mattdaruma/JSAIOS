/**
 * JSAIOS - Single-purpose helper: inspectComfyWorkflow
 * Parses a saved ComfyUI workflow JSON graph and extracts configurable user inputs/options.
 * Retries multiple ComfyUI REST server endpoint formats for maximum API version compatibility.
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
  const cleanName = rawWorkflowId.replace(/^["']|["']$/g, '').trim();
  if (!cleanName) return null;

  const targetFileName = cleanName.endsWith('.json') ? cleanName : `${cleanName}.json`;
  const encodedTarget = encodeURIComponent(targetFileName);
  const encodedName = encodeURIComponent(cleanName);

  // Robust multi-endpoint fallback list matching all ComfyUI server variants
  const candidateUrls = [
    `${endpoint}/userdata/workflows/${encodedTarget}`,
    `${endpoint}/userdata/workflows/${targetFileName}`,
    `${endpoint}/userdata/workflows/${encodedName}`,
    `${endpoint}/userdata?dir=workflows&filename=${encodedTarget}`,
    `${endpoint}/userdata?dir=workflows&file=${encodedTarget}`,
    `${endpoint}/userdata?filename=workflows/${encodedTarget}`,
    `${endpoint}/userdata?file=workflows/${encodedTarget}`,
    `${endpoint}/userdata/${encodedTarget}`,
    `${endpoint}/userdata/${encodedName}`
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const graph = await res.json();
        if (graph && typeof graph === 'object') {
          const options = extractWorkflowOptions(graph);
          return {
            workflowId: targetFileName,
            nodeCount: Object.keys(graph.nodes || graph).length,
            options
          };
        }
      }
    } catch {
      // Continue trying next candidate endpoint format
    }
  }

  return null;
}
