/**
 * JSAIOS - Single-purpose helper: createServiceFromConfig
 * Instantiates concrete micro-service drivers based on JSON configuration entries.
 */

import type { ServiceConfig, IKernelService } from '../../kernel/types';
import { OllamaService } from './ollama/OllamaService';
import { ComfyUIService } from './comfyui/ComfyUIService';
import { CopilotService } from './copilot/CopilotService';

export function createServiceFromConfig(config: ServiceConfig): IKernelService | null {
  if (!config.enabled) return null;

  switch (config.driver) {
    case 'OllamaService':
      return new OllamaService(config.endpoint);

    case 'ComfyUIService':
      return new ComfyUIService(config.endpoint);

    case 'CopilotService':
      return new CopilotService(config.endpoint);

    default:
      console.warn(`[ServiceFactory] Unknown service driver: '${config.driver}'`);
      return null;
  }
}
