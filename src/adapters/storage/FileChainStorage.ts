/**
 * JSAIOS - Adapter: FileChainStorage
 * Disk file storage driver for ChainEngine definitions stored under config/chains/*.json.
 */

import fs from 'fs';
import path from 'path';
import type { ChainDefinition, IChainStorage } from '../../engines/chain/helpers/types';

export class FileChainStorage implements IChainStorage {
  private targetDir: string;

  constructor(customDir?: string) {
    this.targetDir = customDir || path.join(process.cwd(), 'config', 'chains');
    this.ensureDirectory();
  }

  private ensureDirectory(): void {
    if (!fs.existsSync(this.targetDir)) {
      fs.mkdirSync(this.targetDir, { recursive: true });
    }
  }

  public async loadChain(id: string): Promise<ChainDefinition | null> {
    const filePath = path.join(this.targetDir, `${id}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ChainDefinition;
    } catch {
      return null;
    }
  }

  public async saveChain(chain: ChainDefinition): Promise<void> {
    this.ensureDirectory();
    const filePath = path.join(this.targetDir, `${chain.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(chain, null, 2), 'utf-8');
  }

  public async listChains(): Promise<ChainDefinition[]> {
    this.ensureDirectory();
    const files = fs.readdirSync(this.targetDir);
    const results: ChainDefinition[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(this.targetDir, file);
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          results.push(JSON.parse(content) as ChainDefinition);
        } catch {
          // Ignore unparseable
        }
      }
    }

    return results;
  }

  public async deleteChain(id: string): Promise<boolean> {
    const filePath = path.join(this.targetDir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }
}
