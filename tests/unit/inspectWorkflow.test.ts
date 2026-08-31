import { describe, it, expect } from 'vitest';
import { extractWorkflowOptions } from '../../src/services/ai/comfyui/helpers/inspectWorkflow';

describe('ComfyUI Workflow Inspection', () => {
  it('should extract non-linked node input parameters from workflow API JSON', () => {
    const sampleWorkflowJson = {
      '3': {
        class_type: 'KSampler',
        inputs: {
          seed: 42,
          steps: 20,
          cfg: 7.5,
          sampler_name: 'euler',
          model: ['4', 0],
          positive: ['6', 0]
        }
      },
      '6': {
        class_type: 'CLIPTextEncode',
        inputs: {
          text: 'a majestic mountain landscape',
          clip: ['4', 1]
        }
      }
    };

    const options = extractWorkflowOptions(sampleWorkflowJson);

    expect(options).toHaveLength(5);

    const seedOpt = options.find((o) => o.nodeId === '3' && o.inputName === 'seed');
    expect(seedOpt).toBeDefined();
    expect(seedOpt?.currentValue).toBe(42);
    expect(seedOpt?.valueType).toBe('number');

    const promptOpt = options.find((o) => o.nodeId === '6' && o.inputName === 'text');
    expect(promptOpt).toBeDefined();
    expect(promptOpt?.currentValue).toBe('a majestic mountain landscape');
    expect(promptOpt?.valueType).toBe('string');

    // Ensure linked slot ['4', 0] was ignored
    const modelOpt = options.find((o) => o.inputName === 'model');
    expect(modelOpt).toBeUndefined();
  });
});
