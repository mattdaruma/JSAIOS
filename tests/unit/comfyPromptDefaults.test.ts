import { describe, it, expect } from 'vitest';
import { applyWorkflowOverrides } from '../../src/services/ai/comfyui/helpers/applyWorkflowOverrides';

describe('ComfyUI Prompt Default Workflow Values & CLI Overrides', () => {
  const sampleWorkflow = {
    nodes: [
      {
        id: 1,
        type: 'CheckpointLoaderSimple',
        widgets_values: ['dreamshaper_8.safetensors']
      },
      {
        id: 2,
        type: 'CLIPTextEncode',
        title: 'Positive Prompt',
        widgets_values: ['Oren and Raddi smiling and playing']
      },
      {
        id: 3,
        type: 'CLIPTextEncode',
        title: 'Negative Prompt',
        widgets_values: ['blur, low quality']
      },
      {
        id: 4,
        type: 'EmptyLatentImage',
        widgets_values: [720, 720, 1]
      },
      {
        id: 5,
        type: 'KSampler',
        widgets_values: [751479583177487, 'randomize', 20, 8.0, 'euler', 'simple', 1.0]
      }
    ]
  };

  it('should preserve 100% of default server workflow values when zero CLI overrides are provided', () => {
    const result = applyWorkflowOverrides(sampleWorkflow, { prompt: 'Generation Task' });

    expect(result['1'].inputs.ckpt_name).toBe('dreamshaper_8.safetensors');
    expect(result['2'].inputs.text).toBe('Oren and Raddi smiling and playing');
    expect(result['3'].inputs.text).toBe('blur, low quality');
    expect(result['4'].inputs.width).toBe(720);
    expect(result['4'].inputs.height).toBe(720);
    expect(result['5'].inputs.seed).toBe(751479583177487);
    expect(result['5'].inputs.steps).toBe(20);
    expect(result['5'].inputs.cfg).toBe(8.0);
    expect(result['5'].inputs.sampler_name).toBe('euler');
  });

  it('should apply ONLY user-specified CLI overrides while retaining all other defaults', () => {
    const result = applyWorkflowOverrides(sampleWorkflow, {
      prompt: 'Generation Task',
      width: 1024,
      options: {
        'node2.text': 'A futuristic cybernetic city'
      }
    });

    // Overridden width
    expect(result['4'].inputs.width).toBe(1024);
    // Overridden positive text
    expect(result['2'].inputs.text).toBe('A futuristic cybernetic city');

    // Retained default checkpoint, height, seed, steps, and negative prompt
    expect(result['1'].inputs.ckpt_name).toBe('dreamshaper_8.safetensors');
    expect(result['4'].inputs.height).toBe(720);
    expect(result['3'].inputs.text).toBe('blur, low quality');
    expect(result['5'].inputs.seed).toBe(751479583177487);
  });
});
