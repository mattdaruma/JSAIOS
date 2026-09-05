/**
 * JSAIOS Driven Adapter - McpBatchSource
 * Implements IBatchSourceAdapter for pulling MCP server resources into BatchEngine.
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';
import type { McpClientAdapter } from '../../mcp/McpClientAdapter';

export class McpBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'mcp';

  constructor(private mcpClient?: McpClientAdapter) {}

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('mcp://');
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    if (!this.mcpClient) return [];

    const serverId = this.parseServerId(target);
    if (!serverId) return [];

    try {
      const resources = await this.mcpClient.listResources(serverId);
      const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
      const items: BatchItem[] = [];

      for (const res of resources) {
        if (regex && !regex.test(`${res.uri} ${res.name}`)) continue;

        const contents = await this.mcpClient.readResource(serverId, res.uri);
        for (const c of contents) {
          if (c.text) {
            items.push({
              uri: res.uri,
              displayName: res.name || res.uri,
              content: c.text
            });
          }
        }
      }

      return items;
    } catch {
      return [];
    }
  }

  private parseServerId(target: string): string {
    let clean = target.replace('mcp://', '');
    const parts = clean.split('/').filter(Boolean);
    return parts[0] || '';
  }
}
