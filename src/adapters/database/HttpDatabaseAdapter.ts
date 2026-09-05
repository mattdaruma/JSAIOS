/**
 * JSAIOS Driven Adapter - HttpDatabaseAdapter
 * Implements IDatabaseAdapter for querying remote PostgREST / Supabase HTTP REST databases
 * via pure fetch().
 */

import type { DatabaseConfig, IDatabaseAdapter, QueryResult, TableSchema } from './types';

export class HttpDatabaseAdapter implements IDatabaseAdapter {
  public readonly type = 'http';
  private config?: DatabaseConfig;

  public async connect(config: DatabaseConfig): Promise<boolean> {
    this.config = config;
    return true;
  }

  public async listTables(): Promise<string[]> {
    if (!this.config?.connectionString) return [];
    try {
      const res = await fetch(`${this.config.connectionString}/`, {
        headers: { 'Accept': 'application/openapi+json, application/json' }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.definitions ? Object.keys(data.definitions) : [];
    } catch {
      return [];
    }
  }

  public async getSchema(tableName?: string): Promise<TableSchema[]> {
    const tables = await this.listTables();
    return tables
      .filter(t => !tableName || t.toLowerCase() === tableName.toLowerCase())
      .map(t => ({ tableName: t, columns: [{ name: 'id', type: 'text' }, { name: 'data', type: 'json' }] }));
  }

  public async query(sql: string, readOnly?: boolean): Promise<QueryResult> {
    const startTime = Date.now();
    if (!this.config?.connectionString) return { columns: [], rows: [], rowCount: 0, executionTimeMs: 0 };

    const targetTable = sql.match(/from\s+(\w+)/i)?.[1] || 'data';
    const endpoint = `${this.config.connectionString}/${targetTable}`;

    try {
      const res = await fetch(endpoint, {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) return { columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - startTime };

      const rows: Record<string, any>[] = await res.json();
      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTimeMs: Date.now() - startTime
      };
    } catch {
      return { columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - startTime };
    }
  }

  public async disconnect(): Promise<void> {}
}
