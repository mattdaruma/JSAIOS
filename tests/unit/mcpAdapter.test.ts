import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { McpClientAdapter } from '../../src/adapters/mcp/McpClientAdapter';
import { McpServerAdapter } from '../../src/adapters/mcp/McpServerAdapter';
import { McpBatchSource } from '../../src/adapters/batch/sources/McpBatchSource';
import { BatchEngine } from '../../src/engines/batch/BatchEngine';
import { BatchSourceRegistry } from '../../src/adapters/batch/BatchSourceRegistry';
import { handleMcpCommands } from '../../src/adapters/terminal/mcp/mcpCommands';

describe('Model Context Protocol (MCP) Integration', () => {
  const testDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-mcp');

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

  it('should register and execute JSON-RPC requests via McpClientAdapter', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (url: string, options: any) => {
      const req = JSON.parse(options.body);
      if (req.method === 'tools/list') {
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: req.id,
            result: { tools: [{ name: 'query_db', description: 'Query SQL DB' }] }
          })
        } as any;
      }
      if (req.method === 'resources/list') {
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: req.id,
            result: { resources: [{ uri: 'resource://db/schema', name: 'Database Schema' }] }
          })
        } as any;
      }
      return {
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: req.id,
          result: { contents: [{ uri: 'resource://db/schema', text: 'CREATE TABLE users (id INT);' }] }
        })
      } as any;
    }) as any;

    try {
      const client = new McpClientAdapter();
      client.registerServer({ id: 'srv1', name: 'Server 1', endpoint: 'http://localhost:9000/mcp', createdAt: Date.now() });

      const tools = await client.listTools('srv1');
      expect(tools.length).toBe(1);
      expect(tools[0].name).toBe('query_db');

      const resources = await client.listResources('srv1');
      expect(resources.length).toBe(1);
      expect(resources[0].uri).toBe('resource://db/schema');

      const content = await client.readResource('srv1', 'resource://db/schema');
      expect(content.length).toBe(1);
      expect(content[0].text).toContain('CREATE TABLE');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should serve BatchEngine reports as MCP resources via McpServerAdapter', async () => {
    const engine = new BatchEngine();
    engine.createJob('job_test', 'Test Job', './src');

    const serverAdapter = new McpServerAdapter(engine);
    const listRes = await serverAdapter.handleRpcRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'resources/list'
    });

    expect(listRes.result.resources.length).toBe(1);
    expect(listRes.result.resources[0].uri).toBe('resource://jsaios/batch/reports/job_test');
  });

  it('should ingest MCP resources into BatchEngine via McpBatchSource', async () => {
    const client = new McpClientAdapter();
    client.registerServer({ id: 'mcp_server', name: 'MCP Server', endpoint: 'http://localhost:9000/mcp', createdAt: Date.now() });

    const originalFetch = global.fetch;
    global.fetch = (async (url: string, options: any) => {
      const req = JSON.parse(options.body);
      if (req.method === 'resources/list') {
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: req.id,
            result: { resources: [{ uri: 'resource://mcp/doc1', name: 'Doc 1' }] }
          })
        } as any;
      }
      return {
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: req.id,
          result: { contents: [{ uri: 'resource://mcp/doc1', text: 'Important architecture notes' }] }
        })
      } as any;
    }) as any;

    try {
      const registry = new BatchSourceRegistry(client);
      const engine = new BatchEngine(undefined, undefined, registry);

      engine.createJob('mcp_batch', 'MCP Batch Job', 'mcp://mcp_server/resources', undefined, undefined, 'ollama', 'llama3', 'mcp');
      const report = await engine.executeBatchJob('mcp_batch');

      expect(report).toContain('MCP Batch Job');
      expect(report).toContain('Target Files    : 1');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should execute handleMcpCommands CLI subcommands', async () => {
    const client = new McpClientAdapter();
    const connectOut = handleMcpCommands(['connect', 'test_srv', 'http://localhost:8080/mcp'], client);
    expect(connectOut).toContain('Server ID : test_srv');

    const listOut = handleMcpCommands(['list'], client);
    expect(listOut).toContain('test_srv');

    const discOut = handleMcpCommands(['disconnect', 'test_srv'], client);
    expect(discOut).toContain("Disconnected MCP server 'test_srv'");
  });
});
