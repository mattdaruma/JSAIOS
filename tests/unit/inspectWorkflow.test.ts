import { describe, it, expect } from 'vitest';
import { extractWorkflowOptions } from '../../src/services/ai/comfyui/helpers/inspectWorkflow';

describe('ComfyUI Workflow Inspection', () => {
  it('should extract non-linked node input parameters from workflow API JSON (Schema 2)', () => {
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
    expect(seedOpt?.flagName).toBe('--seed');

    const promptOpt = options.find((o) => o.nodeId === '6' && o.inputName === 'text');
    expect(promptOpt).toBeDefined();
    expect(promptOpt?.currentValue).toBe('a majestic mountain landscape');
    expect(promptOpt?.valueType).toBe('string');
    expect(promptOpt?.flagName).toBe('--text');

    // Ensure linked slot ['4', 0] was ignored
    const modelOpt = options.find((o) => o.inputName === 'model');
    expect(modelOpt).toBeUndefined();
  });

  it('should extract widget values from ComfyUI Web UI saved workflow JSON (Schema 1)', () => {
    const sampleUISavedWorkflow = {
      nodes: [
        {
          id: 3,
          type: 'KSampler',
          widgets_values: [123456, 'randomize', 20, 8.0, 'euler', 'normal', 1.0]
        },
        {
          id: 6,
          type: 'CLIPTextEncode',
          widgets_values: ['a hyperrealistic portrait of an astronaut']
        }
      ]
    };

    const options = extractWorkflowOptions(sampleUISavedWorkflow);

    expect(options.length).toBeGreaterThan(0);

    const promptOpt = options.find((o) => o.nodeId === '6');
    expect(promptOpt).toBeDefined();
    expect(promptOpt?.currentValue).toBe('a hyperrealistic portrait of an astronaut');

    const ksamplerOpt = options.find((o) => o.nodeId === '3' && o.currentValue === 123456);
    expect(ksamplerOpt).toBeDefined();
  });

  it('should disambiguate duplicate input names using node-specific flags', () => {
    const duplicateWorkflowJson = {
      '2': {
        class_type: 'CLIPTextEncode',
        title: 'Positive Prompt',
        inputs: { text: 'a cat' }
      },
      '3': {
        class_type: 'CLIPTextEncode',
        title: 'Negative Prompt',
        inputs: { text: 'blurry' }
      }
    };

    const options = extractWorkflowOptions(duplicateWorkflowJson);
    const pos = options.find(o => o.nodeId === '2');
    const neg = options.find(o => o.nodeId === '3');

    expect(pos?.flagName).toBe('--node2.text');
    expect(neg?.flagName).toBe('--node3.text');
    expect(pos?.nodeTitle).toBe('Positive Prompt');
    expect(neg?.nodeTitle).toBe('Negative Prompt');
  });
});
