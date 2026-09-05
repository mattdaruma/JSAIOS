/**
 * JSAIOS Driven Adapter - HttpBatchSource
 * Implements IBatchSourceAdapter for remote HTTP/HTTPS endpoints, URL lists, and JSON/CSV manifests.
 * Operates strictly via pure HTTP REST fetch().
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';

export class HttpBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'http';

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('http://') || target.startsWith('https://');
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    const requestHeaders = headers || {};

    try {
      const res = await fetch(target, { headers: requestHeaders });
      if (!res.ok) return [];

      const rawText = await res.text();

      // Check if response is a JSON manifest array of URLs or items
      if (target.endsWith('.json') || rawText.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(rawText);
          if (Array.isArray(parsed)) {
            return this.parseManifestItems(parsed, requestHeaders);
          }
        } catch {
          // Fallback to single text item
        }
      }

      // Check if response is a line-separated URL list
      if (target.endsWith('.txt') || rawText.includes('\n')) {
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.startsWith('http://') || l.startsWith('https://'));
        if (lines.length > 0) {
          return this.fetchUrlList(lines, requestHeaders);
        }
      }

      // Single HTTP document
      return [{
        uri: target,
        displayName: target,
        content: rawText
      }];
    } catch {
      return [];
    }
  }

  private async parseManifestItems(items: any[], headers: Record<string, string>): Promise<BatchItem[]> {
    const result: BatchItem[] = [];
    for (const item of items) {
      if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
        try {
          const r = await fetch(item, { headers });
          if (r.ok) {
            result.push({ uri: item, displayName: item, content: await r.text() });
          }
        } catch {}
      } else if (typeof item === 'object' && item !== null && item.url) {
        try {
          const r = await fetch(item.url, { headers });
          if (r.ok) {
            result.push({ uri: item.url, displayName: item.name || item.url, content: await r.text() });
          }
        } catch {}
      }
    }
    return result;
  }

  private async fetchUrlList(urls: string[], headers: Record<string, string>): Promise<BatchItem[]> {
    const result: BatchItem[] = [];
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers });
        if (r.ok) {
          result.push({ uri: u, displayName: u, content: await r.text() });
        }
      } catch {}
    }
    return result;
  }
}
