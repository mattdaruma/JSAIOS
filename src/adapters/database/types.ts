/**
 * JSAIOS - Database Types & Interfaces
 * Domain contracts for database connections, schema inspection, and query execution.
 */

export interface DatabaseConfig {
  id: string;
  name: string;
  type: 'sqlite' | 'http' | 'rest';
  connectionString: string;
  readOnly?: boolean;
  createdAt: number;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable?: boolean;
  primaryKey?: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnSchema[];
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface IDatabaseAdapter {
  type: string;
  connect(config: DatabaseConfig): Promise<boolean>;
  listTables(): Promise<string[]>;
  getSchema(tableName?: string): Promise<TableSchema[]>;
  query(sql: string, readOnly?: boolean): Promise<QueryResult>;
  disconnect(): Promise<void>;
}
