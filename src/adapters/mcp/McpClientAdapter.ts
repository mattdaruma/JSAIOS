/**
 * JSAIOS Driven Adapter - McpClientAdapter
 * Manages connections to remote MCP HTTP/SSE servers and issues JSON-RPC 2.0 requests via pure fetch().
 */

import type { JSONRPCRequest, JSONRPCResponse, McpResource, McpResourceContent, McpServerConfig, McpTool } from './types';

export class McpClientAdapter {
  private servers: Map<string, McpServerConfig> = new Map();

  public registerServer(config: McpServerConfig): void {
    this.servers.set(config.id, config);
  }

  public getServer(id: string): McpServerConfig | undefined {
    return this.servers.get(id);
  }

  public listServers(): McpServerConfig[] {
    return Array.from(this.servers.values());
  }

  public removeServer(id: string): boolean {
    return this.servers.delete(id);
  }

  public async listTools(serverId: string): Promise<McpTool[]> {
    const res = await this.sendJsonRpcRequest<{ tools: McpTool[] }>(serverId, 'tools/list');
    return res?.tools || [];
  }

  public async callTool(serverId: string, name: string, args?: Record<string, any>): Promise<any> {
    const res = await this.sendJsonRpcRequest<any>(serverId, 'tools/call', { name, arguments: args || {} });
    return res;
  }

  public async listResources(serverId: string): Promise<McpResource[]> {
    const res = await this.sendJsonRpcRequest<{ resources: McpResource[] }>(serverId, 'resources/list');
    return res?.resources || [];
  }

  public async readResource(serverId: string, uri: string): Promise<McpResourceContent[]> {
    const res = await this.sendJsonRpcRequest<{ contents: McpResourceContent[] }>(serverId, 'resources/read', { uri });
    return res?.contents || [];
  }

  private async sendJsonRpcRequest<T>(serverId: string, method: string, params?: Record<string, any>): Promise<T | null> {
    const config = this.servers.get(serverId);
    if (!config) throw new Error(`MCP server '${serverId}' not registered.`);

    const body: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params
    };

    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(config.headers || {})
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) return null;

      const data: JSONRPCResponse<T> = await response.json();
      if (data.error) throw new Error(`MCP Error [${data.error.code}]: ${data.error.message}`);
      return data.result || null;
    } catch {
      return null;
    }
  }
}
