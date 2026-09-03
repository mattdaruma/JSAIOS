/**
 * JSAIOS - Adapter: InMemoryChainStorage
 * Pure in-memory storage driver for ChainEngine definitions.
 */

import type { ChainDefinition, IChainStorage } from '../../engines/chain/helpers/types';

export class InMemoryChainStorage implements IChainStorage {
  private chains: Map<string, ChainDefinition> = new Map();

  public async loadChain(id: string): Promise<ChainDefinition | null> {
    return this.chains.get(id) || null;
  }

  public async saveChain(chain: ChainDefinition): Promise<void> {
    this.chains.set(chain.id, chain);
  }

  public async listChains(): Promise<ChainDefinition[]> {
    return Array.from(this.chains.values());
  }

  public async deleteChain(id: string): Promise<boolean> {
    return this.chains.delete(id);
  }
}
