/**
 * JSAIOS - Storage Adapter: FileContextStorage
 * Persists context prompt templates and context packs to Node filesystem (config/templates/).
 */

import fs from 'fs';
import path from 'path';
import type { ContextPack, IContextTemplateStorage, SystemDirectiveTemplate } from '../../engines/context/helpers/types';

export class FileContextStorage implements IContextTemplateStorage {
  private baseDir: string;
  private packsDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.resolve(process.cwd(), 'storage', 'templates');
    this.packsDir = path.join(this.baseDir, 'packs');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.packsDir)) {
      fs.mkdirSync(this.packsDir, { recursive: true });
    }
  }

  public async loadTemplate(id: string): Promise<SystemDirectiveTemplate | null> {
    try {
      const filePath = path.join(this.baseDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as SystemDirectiveTemplate;
      }
    } catch {
      // Fallback null
    }
    return null;
  }

  public async saveTemplate(template: SystemDirectiveTemplate): Promise<void> {
    const filePath = path.join(this.baseDir, `${template.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(template, null, 2), 'utf-8');
  }

  public async listTemplates(): Promise<SystemDirectiveTemplate[]> {
    const templates: SystemDirectiveTemplate[] = [];
    try {
      if (fs.existsSync(this.baseDir)) {
        const files = fs.readdirSync(this.baseDir);
        for (const file of files) {
          if (file.endsWith('.json') && !fs.statSync(path.join(this.baseDir, file)).isDirectory()) {
            const raw = fs.readFileSync(path.join(this.baseDir, file), 'utf-8');
            templates.push(JSON.parse(raw));
          }
        }
      }
    } catch {
      // Return empty array on error
    }
    return templates;
  }

  public async deleteTemplate(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch {
      // Fail false
    }
    return false;
  }

  public async loadPack(id: string): Promise<ContextPack | null> {
    try {
      const filePath = path.join(this.packsDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as ContextPack;
      }
    } catch {
      // Fallback null
    }
    return null;
  }

  public async savePack(pack: ContextPack): Promise<void> {
    const filePath = path.join(this.packsDir, `${pack.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(pack, null, 2), 'utf-8');
  }

  public async listPacks(): Promise<ContextPack[]> {
    const packs: ContextPack[] = [];
    try {
      if (fs.existsSync(this.packsDir)) {
        const files = fs.readdirSync(this.packsDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const raw = fs.readFileSync(path.join(this.packsDir, file), 'utf-8');
            packs.push(JSON.parse(raw));
          }
        }
      }
    } catch {
      // Return empty array on error
    }
    return packs;
  }

  public async deletePack(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.packsDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch {
      // Fail false
    }
    return false;
  }
}
