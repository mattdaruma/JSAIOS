/**
 * JSAIOS - Service Interface: ITokenizerService
 * Pure interface contract for tokenizer service drivers.
 */

import type { IKernelService, ServiceDescriptor } from '../../kernel/types';

export interface ITokenizerService extends IKernelService {
  countTokens(text: string, modelId?: string): number;
}
