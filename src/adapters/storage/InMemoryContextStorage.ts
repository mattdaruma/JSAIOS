/**
 * JSAIOS - Storage Adapter: InMemoryContextStorage
 * In-memory storage driver for ContextEngine (useful for headless testing).
 */

import type { IContextTemplateStorage, SystemDirectiveTemplate } from '../../engines/context/helpers/types';

export class InMemoryContextStorage implements IContextTemplateStorage {
  private store: Map<string, SystemDirectiveTemplate> = new Map();

  public async loadTemplate(id: string): Promise<SystemDirectiveTemplate | null> {
    return this.store.get(id) || null;
  }

  public async saveTemplate(template: SystemDirectiveTemplate): Promise<void> {
    this.store.set(template.id, template);
  }

  public async listTemplates(): Promise<SystemDirectiveTemplate[]> {
    return Array.from(this.store.values());
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
