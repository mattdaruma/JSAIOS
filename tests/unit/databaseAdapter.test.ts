import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DatabaseEngine } from '../../src/engines/database/DatabaseEngine';
import { SqliteDatabaseAdapter } from '../../src/adapters/database/SqliteDatabaseAdapter';
import { HttpDatabaseAdapter } from '../../src/adapters/database/HttpDatabaseAdapter';
import { DatabaseBatchSource } from '../../src/adapters/batch/sources/DatabaseBatchSource';
import { BatchEngine } from '../../src/engines/batch/BatchEngine';
import { BatchSourceRegistry } from '../../src/adapters/batch/BatchSourceRegistry';
import { handleDatabaseCommands } from '../../src/adapters/terminal/database/databaseCommands';

describe('Database Engine & State Management Integration', () => {
  const testDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-db');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create tables, insert rows, and execute SELECT queries via SqliteDatabaseAdapter', async () => {
    const adapter = new SqliteDatabaseAdapter();
    await adapter.connect({ id: 'game', name: 'Game State', type: 'sqlite', connectionString: ':memory:', createdAt: Date.now() });

    await adapter.query('CREATE TABLE players (id INT, hp INT, name TEXT)', false);
    await adapter.query("INSERT INTO players VALUES (1, 100, 'Hero')", false);

    const tables = await adapter.listTables();
    expect(tables).toContain('players');

    const schema = await adapter.getSchema('players');
    expect(schema.length).toBe(1);
    expect(schema[0].columns.length).toBe(3);

    const res = await adapter.query('SELECT * FROM players', true);
    expect(res.rowCount).toBe(1);
    expect(res.rows[0].name).toBe('Hero');
    expect(res.rows[0].hp).toBe(100);
  });

  it('should enforce read-only query guardrails on mutations', async () => {
    const adapter = new SqliteDatabaseAdapter();
    await adapter.connect({ id: 'prod', name: 'Prod DB', type: 'sqlite', connectionString: ':memory:', readOnly: true, createdAt: Date.now() });

    await expect(adapter.query('DROP TABLE users', true)).rejects.toThrow('read-only mode');
  });

  it('should query remote PostgREST database via HttpDatabaseAdapter', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => {
      return {
        ok: true,
        json: async () => ([
          { id: 101, title: 'Item 1' }
        ])
      } as any;
    }) as any;

    try {
      const adapter = new HttpDatabaseAdapter();
      await adapter.connect({ id: 'remote_db', name: 'Remote DB', type: 'http', connectionString: 'http://api.db.com', createdAt: Date.now() });

      const res = await adapter.query('SELECT * FROM items', true);
      expect(res.rowCount).toBe(1);
      expect(res.rows[0].title).toBe('Item 1');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should stream database query records into BatchEngine via DatabaseBatchSource', async () => {
    const dbEngine = new DatabaseEngine();
    await dbEngine.query('local', 'CREATE TABLE metrics (id INT, val TEXT)', false);
    await dbEngine.query("local", "INSERT INTO metrics VALUES (1, 'metric_data')", false);

    const registry = new BatchSourceRegistry(undefined, dbEngine);
    const batchEngine = new BatchEngine(undefined, undefined, registry);

    batchEngine.createJob('db_job', 'DB Job', 'db://local/metrics', undefined, undefined, 'ollama', 'llama3', 'db');
    const report = await batchEngine.executeBatchJob('db_job');

    expect(report).toContain('DB Job');
    expect(report).toContain('Target Files    : 1');
  });

  it('should execute handleDatabaseCommands CLI subcommands', async () => {
    const dbEngine = new DatabaseEngine();

    const connectOut = await handleDatabaseCommands(['connect', 'game_db', ':memory:'], dbEngine);
    expect(connectOut).toContain('Connection ID : game_db');

    const listOut = await handleDatabaseCommands(['list'], dbEngine);
    expect(listOut).toContain('game_db');

    await handleDatabaseCommands(['query', 'game_db', 'CREATE TABLE items (id INT)'], dbEngine);
    await handleDatabaseCommands(['query', 'game_db', 'INSERT INTO items VALUES (1)'], dbEngine);
    const queryOut = await handleDatabaseCommands(['query', 'game_db', 'SELECT * FROM items'], dbEngine);
    expect(queryOut).toContain('Query Result [game_db]');
  });
});
