/**
 * JSAIOS Driven Adapter - DatabaseBatchSource
 * Implements IBatchSourceAdapter for streaming database table records into BatchEngine.
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';
import type { DatabaseEngine } from '../../../engines/database/DatabaseEngine';

export class DatabaseBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'db';

  constructor(private dbEngine?: DatabaseEngine) {}

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('db://');
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    if (!this.dbEngine) return [];

    const { dbId, tableName } = this.parseDbTarget(target);
    if (!dbId || !tableName) return [];

    try {
      const queryResult = await this.dbEngine.query(dbId, `SELECT * FROM ${tableName}`, true);
      const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
      const items: BatchItem[] = [];

      for (let i = 0; i < queryResult.rows.length; i++) {
        const row = queryResult.rows[i];
        const rowContent = JSON.stringify(row, null, 2);

        if (regex && !regex.test(rowContent)) continue;

        items.push({
          uri: `${target}#row=${i + 1}`,
          displayName: `db:${dbId}/${tableName}#row_${i + 1}`,
          content: rowContent
        });
      }

      return items;
    } catch {
      return [];
    }
  }

  private parseDbTarget(target: string): { dbId: string; tableName: string } {
    const clean = target.replace('db://', '');
    const parts = clean.split('/').filter(Boolean);
    const dbId = parts[0] || 'local';
    const tableName = parts[1] || parts[0] || '';
    return { dbId, tableName };
  }
}
