/**
 * JSAIOS - Single-purpose helper class: StructureManager
 * Manages in-memory structure collection and storage persistence delegation for ContextEngine.
 */

import type { CustomFields } from '../../../kernel/types';
import type { IContextTemplateStorage, PromptResponseStructure } from './types';

export class StructureManager {
  private structures: Map<string, PromptResponseStructure> = new Map();

  constructor(private storageAdapter?: IContextTemplateStorage) {}

  public registerStructure(structure: PromptResponseStructure): void {
    this.structures.set(structure.id, structure);
    if (this.storageAdapter?.saveStructure) {
      this.storageAdapter.saveStructure(structure).catch(() => {});
    }
  }

  public getStructure(id: string): PromptResponseStructure | undefined {
    return this.structures.get(id);
  }

  public listStructures(): PromptResponseStructure[] {
    return Array.from(this.structures.values());
  }

  public createStructure(
    id: string,
    name: string,
    outputSchema?: Record<string, any>,
    defaultVariables: CustomFields = {},
    description?: string
  ): PromptResponseStructure {
    const structure: PromptResponseStructure = {
      id,
      name,
      description,
      defaultVariables,
      outputSchema
    };
    this.registerStructure(structure);
    return structure;
  }

  public deleteStructure(id: string): boolean {
    const deleted = this.structures.delete(id);
    if (deleted && this.storageAdapter?.deleteStructure) {
      this.storageAdapter.deleteStructure(id).catch(() => {});
    }
    return deleted;
  }

  public async loadFromStorage(): Promise<void> {
    if (this.storageAdapter?.listStructures) {
      const storedStructs = await this.storageAdapter.listStructures();
      for (const struct of storedStructs) {
        this.structures.set(struct.id, struct);
      }
    }
  }
}
