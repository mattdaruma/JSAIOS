/**
 * JSAIOS Core Domain Engine - DatabaseEngine
 * Manages active database connections, schema inspection, query execution, and read-only guardrails.
 */

import type { DatabaseConfig, IDatabaseAdapter, QueryResult, TableSchema } from '../../adapters/database/types';
import { SqliteDatabaseAdapter } from '../../adapters/database/SqliteDatabaseAdapter';
import { HttpDatabaseAdapter } from '../../adapters/database/HttpDatabaseAdapter';

export class DatabaseEngine {
  private connections: Map<string, IDatabaseAdapter> = new Map();

  constructor() {
    // Default SQLite in-memory database connection
    const defaultAdapter = new SqliteDatabaseAdapter();
    defaultAdapter.connect({
      id: 'local',
      name: 'Local Database',
      type: 'sqlite',
      connectionString: ':memory:',
      createdAt: Date.now()
    });
    this.connections.set('local', defaultAdapter);
  }

  public async connectDatabase(config: DatabaseConfig): Promise<IDatabaseAdapter> {
    const adapter: IDatabaseAdapter = config.type === 'http' || config.type === 'rest'
      ? new HttpDatabaseAdapter()
      : new SqliteDatabaseAdapter();

    await adapter.connect(config);
    this.connections.set(config.id, adapter);
    return adapter;
  }

  public getAdapter(id: string): IDatabaseAdapter | undefined {
    return this.connections.get(id);
  }

  public listConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  public async getSchema(id: string = 'local', tableName?: string): Promise<TableSchema[]> {
    const adapter = this.connections.get(id);
    if (!adapter) throw new Error(`Database connection '${id}' not found.`);
    return await adapter.getSchema(tableName);
  }

  public async query(id: string, sql: string, readOnly: boolean = true): Promise<QueryResult> {
    const adapter = this.connections.get(id);
    if (!adapter) throw new Error(`Database connection '${id}' not found.`);
    return await adapter.query(sql, readOnly);
  }

  public async disconnect(id: string): Promise<void> {
    const adapter = this.connections.get(id);
    if (adapter) {
      await adapter.disconnect();
      this.connections.delete(id);
    }
  }
}
