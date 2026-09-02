/**
 * JSAIOS - Storage Adapter: FileContextStorage
 * Persists context prompt templates to Node filesystem (config/templates/ or context-templates/).
 */

import fs from 'fs';
import path from 'path';
import type { IContextTemplateStorage, SystemDirectiveTemplate } from '../../engines/context/helpers/types';

export class FileContextStorage implements IContextTemplateStorage {
  private baseDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.resolve(process.cwd(), 'config', 'templates');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
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
          if (file.endsWith('.json')) {
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
}
