/**
 * JSAIOS - Single-purpose function: injectWorkflowParameters
 * Dynamically updates node inputs in any arbitrary ComfyUI API graph workflow.
 */

export interface ComfyUIWorkflowParameters {
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  steps?: number;
  cfg?: number;
  samplerName?: string;
  scheduler?: string;
  width?: number;
  height?: number;
  checkpoint?: string;
}

export function injectWorkflowParameters(
  rawWorkflowJson: Record<string, any>,
  params: ComfyUIWorkflowParameters
): Record<string, any> {
  // Deep clone to prevent mutating original template
  const workflow = JSON.parse(JSON.stringify(rawWorkflowJson));

  for (const nodeId of Object.keys(workflow)) {
    const node = workflow[nodeId];
    if (!node || !node.class_type || !node.inputs) continue;

    switch (node.class_type) {
      case 'CLIPTextEncode':
        // Identify positive vs negative prompt nodes
        if (node.inputs.text !== undefined) {
          if (params.negativePrompt && (nodeId === '7' || node.inputs.text.toLowerCase().includes('bad'))) {
            node.inputs.text = params.negativePrompt;
          } else if (params.prompt && (nodeId === '6' || !node.inputs.text.toLowerCase().includes('bad'))) {
            node.inputs.text = params.prompt;
          }
        }
        break;

      case 'KSampler':
      case 'KSamplerAdvanced':
        if (params.seed !== undefined) node.inputs.seed = params.seed;
        if (params.steps !== undefined) node.inputs.steps = params.steps;
        if (params.cfg !== undefined) node.inputs.cfg = params.cfg;
        if (params.samplerName) node.inputs.sampler_name = params.samplerName;
        if (params.scheduler) node.inputs.scheduler = params.scheduler;
        break;

      case 'EmptyLatentImage':
        if (params.width !== undefined) node.inputs.width = params.width;
        if (params.height !== undefined) node.inputs.height = params.height;
        break;

      case 'CheckpointLoaderSimple':
        if (params.checkpoint) node.inputs.ckpt_name = params.checkpoint;
        break;
    }
  }

  return workflow;
}
