/**
 * JSAIOS Driven Adapter - BatchSourceRegistry
 * Registry managing IBatchSourceAdapter providers and resolving source targets.
 */

import type { BatchItem, IBatchSourceAdapter } from '../../engines/batch/helpers/types';
import { LocalFileBatchSource } from './sources/LocalFileBatchSource';
import { HttpBatchSource } from './sources/HttpBatchSource';
import { GitHubBatchSource } from './sources/GitHubBatchSource';
import { GitLabBatchSource } from './sources/GitLabBatchSource';
import { ConfluenceBatchSource } from './sources/ConfluenceBatchSource';
import { JiraBatchSource } from './sources/JiraBatchSource';
import { McpBatchSource } from './sources/McpBatchSource';
import type { McpClientAdapter } from '../mcp/McpClientAdapter';

export class BatchSourceRegistry {
  private adapters: Map<string, IBatchSourceAdapter> = new Map();

  constructor(mcpClient?: McpClientAdapter) {
    this.registerAdapter(new LocalFileBatchSource());
    this.registerAdapter(new HttpBatchSource());
    this.registerAdapter(new GitHubBatchSource());
    this.registerAdapter(new GitLabBatchSource());
    this.registerAdapter(new ConfluenceBatchSource());
    this.registerAdapter(new JiraBatchSource());
    this.registerAdapter(new McpBatchSource(mcpClient));
  }

  public registerAdapter(adapter: IBatchSourceAdapter): void {
    this.adapters.set(adapter.sourceType, adapter);
  }

  public getAdapter(sourceType: string): IBatchSourceAdapter | undefined {
    return this.adapters.get(sourceType);
  }

  public resolveAdapter(target: string, preferredType?: string): IBatchSourceAdapter {
    if (preferredType && this.adapters.has(preferredType)) {
      return this.adapters.get(preferredType)!;
    }

    for (const adapter of this.adapters.values()) {
      if (adapter.canHandle(target)) {
        return adapter;
      }
    }

    // Default fallback to local file source
    return this.adapters.get('local') || new LocalFileBatchSource();
  }

  public async fetchBatchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    sourceType?: string,
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    const adapter = this.resolveAdapter(target, sourceType);
    return await adapter.fetchItems(target, patternFilter, fileExtensions, headers);
  }
}
