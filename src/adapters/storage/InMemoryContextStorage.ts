/**
 * JSAIOS - Storage Adapter: InMemoryContextStorage
 * In-memory storage driver for ContextEngine (useful for headless testing).
 */

import type { ContextPack, IContextTemplateStorage, SystemDirectiveTemplate } from '../../engines/context/helpers/types';

export class InMemoryContextStorage implements IContextTemplateStorage {
  private templateStore: Map<string, SystemDirectiveTemplate> = new Map();
  private packStore: Map<string, ContextPack> = new Map();

  public async loadTemplate(id: string): Promise<SystemDirectiveTemplate | null> {
    return this.templateStore.get(id) || null;
  }

  public async saveTemplate(template: SystemDirectiveTemplate): Promise<void> {
    this.templateStore.set(template.id, template);
  }

  public async listTemplates(): Promise<SystemDirectiveTemplate[]> {
    return Array.from(this.templateStore.values());
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    return this.templateStore.delete(id);
  }

  public async loadPack(id: string): Promise<ContextPack | null> {
    return this.packStore.get(id) || null;
  }

  public async savePack(pack: ContextPack): Promise<void> {
    this.packStore.set(pack.id, pack);
  }

  public async listPacks(): Promise<ContextPack[]> {
    return Array.from(this.packStore.values());
  }

  public async deletePack(id: string): Promise<boolean> {
    return this.packStore.delete(id);
  }
}
