/**
 * JSAIOS - Single-purpose helper class: ContextPackManager
 * Manages in-memory ContextPack collections and persistence delegation for ContextEngine.
 */

import type { CustomFields } from '../../../kernel/types';
import type { ContextMergeStrategy, ContextPack, ContextPackItem, IContextTemplateStorage } from './types';

export class ContextPackManager {
  private packs: Map<string, ContextPack> = new Map();

  constructor(private storageAdapter?: IContextTemplateStorage) {}

  public registerPack(pack: ContextPack): void {
    this.packs.set(pack.id, pack);
  }

  public getPack(id: string): ContextPack | undefined {
    return this.packs.get(id);
  }

  public listPacks(): ContextPack[] {
    return Array.from(this.packs.values());
  }

  public createPack(
    id: string,
    name: string,
    mergeStrategy: ContextMergeStrategy = 'single-system-prompt',
    defaultCustomFields: CustomFields = {}
  ): ContextPack {
    const pack: ContextPack = {
      id,
      name,
      mergeStrategy,
      items: [],
      defaultCustomFields
    };
    this.registerPack(pack);
    if (this.storageAdapter?.savePack) {
      this.storageAdapter.savePack(pack).catch(() => {});
    }
    return pack;
  }

  public addPromptToPack(packId: string, item: ContextPackItem): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;
    pack.items = pack.items.filter((i) => i.id !== item.id);
    pack.items.push(item);
    if (this.storageAdapter?.savePack) {
      this.storageAdapter.savePack(pack).catch(() => {});
    }
    return true;
  }

  public async loadFromStorage(): Promise<void> {
    if (this.storageAdapter?.listPacks) {
      const storedPacks = await this.storageAdapter.listPacks();
      for (const pack of storedPacks) {
        this.packs.set(pack.id, pack);
      }
    }
  }
}
