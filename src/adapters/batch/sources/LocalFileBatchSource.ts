/**
 * JSAIOS Driven Adapter - LocalFileBatchSource
 * Implements IBatchSourceAdapter for scanning local directories and reading files.
 */

import fs from 'fs';
import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';
import { scanCandidateFiles } from '../../../engines/batch/helpers/FileScanner';

export class LocalFileBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'local';

  public canHandle(target: string): boolean {
    if (!target) return false;
    if (target.startsWith('http://') || target.startsWith('https://') || target.startsWith('github://')) {
      return false;
    }
    return true;
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[]
  ): Promise<BatchItem[]> {
    const filePaths = scanCandidateFiles(target, patternFilter, fileExtensions);
    const items: BatchItem[] = [];

    for (const filePath of filePaths) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        items.push({
          uri: filePath,
          displayName: filePath,
          content
        });
      } catch {
        // Skip unreadable files cleanly
      }
    }

    return items;
  }
}
