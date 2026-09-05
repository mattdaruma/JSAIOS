/**
 * JSAIOS Driven Adapter - SqliteDatabaseAdapter
 * Implements IDatabaseAdapter for lightweight structured database storage and query execution.
 */

import type { ColumnSchema, DatabaseConfig, IDatabaseAdapter, QueryResult, TableSchema } from './types';

export class SqliteDatabaseAdapter implements IDatabaseAdapter {
  public readonly type = 'sqlite';
  private config?: DatabaseConfig;
  private inMemoryTables: Map<string, { schema: ColumnSchema[]; rows: Record<string, any>[] }> = new Map();

  public async connect(config: DatabaseConfig): Promise<boolean> {
    this.config = config;
    return true;
  }

  public async listTables(): Promise<string[]> {
    return Array.from(this.inMemoryTables.keys());
  }

  public async getSchema(tableName?: string): Promise<TableSchema[]> {
    const schemas: TableSchema[] = [];
    for (const [name, table] of this.inMemoryTables.entries()) {
      if (!tableName || tableName.toLowerCase() === name.toLowerCase()) {
        schemas.push({ tableName: name, columns: table.schema });
      }
    }
    return schemas;
  }

  public async query(sql: string, readOnly?: boolean): Promise<QueryResult> {
    const startTime = Date.now();
    const cleanSql = sql.trim();

    if ((readOnly || this.config?.readOnly) && !cleanSql.toLowerCase().startsWith('select')) {
      throw new Error('Database is in read-only mode. Mutation queries (INSERT, UPDATE, DELETE, DROP) are restricted.');
    }

    if (cleanSql.toLowerCase().startsWith('create table')) {
      const match = cleanSql.match(/create table\s+(\w+)\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        const colDefs = match[2].split(',').map(c => c.trim().split(/\s+/));
        const schema: ColumnSchema[] = colDefs.map(c => ({ name: c[0], type: c[1] || 'TEXT' }));
        this.inMemoryTables.set(tableName, { schema, rows: [] });
        return { columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - startTime };
      }
    }

    if (cleanSql.toLowerCase().startsWith('insert into')) {
      const match = cleanSql.match(/insert into\s+(\w+)\s+values\s*\(([^)]+)\)/i);
      if (match) {
        const tableName = match[1];
        const table = this.inMemoryTables.get(tableName);
        if (table) {
          const rawValues = match[2].split(',').map(v => v.trim().replace(/^['"]|['"]$/g, ''));
          const row: Record<string, any> = {};
          table.schema.forEach((col, idx) => {
            const val = rawValues[idx];
            row[col.name] = isNaN(Number(val)) ? val : Number(val);
          });
          table.rows.push(row);
          return { columns: [], rows: [], rowCount: 1, executionTimeMs: Date.now() - startTime };
        }
      }
    }

    if (cleanSql.toLowerCase().startsWith('select')) {
      const match = cleanSql.match(/select\s+(.+)\s+from\s+(\w+)/i);
      if (match) {
        const tableName = match[2];
        const table = this.inMemoryTables.get(tableName);
        if (table) {
          const cols = match[1] === '*' ? table.schema.map(s => s.name) : match[1].split(',').map(c => c.trim());
          return {
            columns: cols,
            rows: table.rows,
            rowCount: table.rows.length,
            executionTimeMs: Date.now() - startTime
          };
        }
      }
    }

    return { columns: [], rows: [], rowCount: 0, executionTimeMs: Date.now() - startTime };
  }

  public async disconnect(): Promise<void> {
    this.inMemoryTables.clear();
  }
}
