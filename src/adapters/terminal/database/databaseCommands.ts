/**
 * JSAIOS - Single-purpose terminal handler: databaseCommands
 * Handles 'db list', 'db connect <id> <url_or_path>', 'db disconnect <id>', 'db schema [table]', and 'db query "<sql>"'.
 */

import type { DatabaseEngine } from '../../../engines/database/DatabaseEngine';

export function handleDatabaseCommands(args: string[], dbEngine: DatabaseEngine): string | Promise<string> {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'list': {
      const connections = dbEngine.listConnections();
      return [
        '=== Active Database Connections ===',
        ...connections.map((c) => `  • ${c.padEnd(20)} : Registered`)
      ].join('\n');
    }

    case 'connect': {
      const id = args[1];
      const target = args[2] || ':memory:';
      if (!id) return 'Usage: db connect <id> [target_path_or_url] [--type sqlite|http]';

      const type = args.includes('--type') ? (args[args.indexOf('--type') + 1] as any) : (target.startsWith('http') ? 'http' : 'sqlite');

      return (async () => {
        await dbEngine.connectDatabase({
          id,
          name: id,
          type,
          connectionString: target,
          createdAt: Date.now()
        });
        return `=== Database Connected ===\nConnection ID : ${id}\nType          : ${type}\nTarget        : ${target}`;
      })();
    }

    case 'disconnect': {
      const id = args[1];
      if (!id) return 'Usage: db disconnect <id>';
      return (async () => {
        await dbEngine.disconnect(id);
        return `Disconnected database connection '${id}'.`;
      })();
    }

    case 'schema': {
      const dbId = args[1] || 'local';
      const tableName = args[2];
      return (async () => {
        const schemas = await dbEngine.getSchema(dbId, tableName);
        if (schemas.length === 0) return `No tables found in database '${dbId}'.`;
        return [
          `=== Database Schema [${dbId}] ===`,
          ...schemas.map((s) => `Table '${s.tableName}':\n` + s.columns.map((c) => `  - ${c.name.padEnd(15)} : ${c.type}`).join('\n'))
        ].join('\n');
      })();
    }

    case 'query': {
      const dbId = args[1];
      const sql = args.slice(2).join(' ').replace(/^['"]|['"]$/g, '');
      if (!dbId || !sql) return 'Usage: db query <connection_id> "<sql_statement>"';

      return (async () => {
        try {
          const res = await dbEngine.query(dbId, sql, false);
          if (!sql.trim().toLowerCase().startsWith('select')) {
            return `Query executed successfully (${res.rowCount} rows affected, ${res.executionTimeMs}ms).`;
          }
          return [
            `=== Query Result [${dbId}] (${res.rowCount} rows, ${res.executionTimeMs}ms) ===`,
            `Columns: ${res.columns.join(', ')}`,
            ...res.rows.map((r, i) => `Row ${i + 1}: ${JSON.stringify(r)}`)
          ].join('\n');
        } catch (err: any) {
          return `Query Error: ${err.message}`;
        }
      })();
    }

    default:
      return [
        'Database Engine & State Commands:',
        '  • db list                                      - List active database connections',
        '  • db connect <id> <target>                     - Connect SQLite or HTTP REST database',
        '  • db disconnect <id>                           - Disconnect database connection',
        '  • db schema [connection_id] [table]            - Inspect database tables & column schemas',
        '  • db query <connection_id> "<sql>"             - Execute read-only SQL query against database'
      ].join('\n');
  }
}
