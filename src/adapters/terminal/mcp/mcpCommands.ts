/**
 * JSAIOS - Single-purpose terminal handler: mcpCommands
 * Handles 'mcp list', 'mcp connect <id> <url>', 'mcp disconnect <id>', 'mcp tools [id]', and 'mcp resources [id]'.
 */

import type { McpClientAdapter } from '../../mcp/McpClientAdapter';

export function handleMcpCommands(args: string[], mcpClient: McpClientAdapter): string | Promise<string> {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'list': {
      const servers = mcpClient.listServers();
      if (servers.length === 0) return 'No MCP servers connected. Connect one using "mcp connect <id> <endpoint_url>".';
      return [
        '=== Connected MCP Servers ===',
        ...servers.map((s) => `  • ${s.id.padEnd(20)} : ${s.endpoint}`)
      ].join('\n');
    }

    case 'connect': {
      const id = args[1];
      const url = args[2];
      if (!id || !url) return 'Usage: mcp connect <id> <endpoint_url>';

      mcpClient.registerServer({
        id,
        name: id,
        endpoint: url,
        createdAt: Date.now()
      });

      return `=== MCP Server Connected ===\nServer ID : ${id}\nEndpoint  : ${url}`;
    }

    case 'disconnect': {
      const id = args[1];
      if (!id) return 'Usage: mcp disconnect <id>';
      const removed = mcpClient.removeServer(id);
      return removed ? `Disconnected MCP server '${id}'.` : `MCP server '${id}' not found.`;
    }

    case 'tools': {
      const serverId = args[1];
      if (!serverId) return 'Usage: mcp tools <server_id>';

      return (async () => {
        const tools = await mcpClient.listTools(serverId);
        if (tools.length === 0) return `No tools published by MCP server '${serverId}'.`;
        return [
          `=== MCP Tools [${serverId}] ===`,
          ...tools.map((t) => `  • ${t.name.padEnd(25)} : ${t.description || 'No description'}`)
        ].join('\n');
      })();
    }

    case 'resources': {
      const serverId = args[1];
      if (!serverId) return 'Usage: mcp resources <server_id>';

      return (async () => {
        const resources = await mcpClient.listResources(serverId);
        if (resources.length === 0) return `No resources published by MCP server '${serverId}'.`;
        return [
          `=== MCP Resources [${serverId}] ===`,
          ...resources.map((r) => `  • ${r.name.padEnd(25)} : ${r.uri}`)
        ].join('\n');
      })();
    }

    default:
      return [
        'Model Context Protocol (MCP) Commands:',
        '  • mcp list                                     - List connected MCP servers',
        '  • mcp connect <id> <url>                       - Connect to a remote HTTP MCP server',
        '  • mcp disconnect <id>                          - Disconnect an MCP server',
        '  • mcp tools <id>                               - List tools offered by MCP server',
        '  • mcp resources <id>                           - List resources offered by MCP server'
      ].join('\n');
  }
}
