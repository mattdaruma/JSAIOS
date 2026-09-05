/**
 * JSAIOS Driven Adapter - ConfluenceBatchSource
 * Implements IBatchSourceAdapter for searching and reading Atlassian Confluence space pages
 * via Confluence REST API (pure HTTP fetch()).
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';

export class ConfluenceBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'confluence';

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('confluence://') || target.includes('/wiki/rest/api/content');
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    const { host, spaceKey } = this.parseConfluenceTarget(target);
    if (!spaceKey) return [];

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'JSAIOS-BatchEngine',
      'Accept': 'application/json',
      ...(headers || {})
    };

    const apiUrl = `${host}/wiki/rest/api/content?spaceKey=${spaceKey}&expand=body.storage&limit=50`;

    try {
      const res = await fetch(apiUrl, { headers: requestHeaders });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.results || !Array.isArray(data.results)) return [];

      const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
      const items: BatchItem[] = [];

      for (const page of data.results) {
        const title = page.title || `Page ${page.id}`;
        if (regex && !regex.test(title)) continue;

        const rawBody = page.body?.storage?.value || '';
        // Strip basic HTML tags for clean text chunking
        const textContent = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        items.push({
          uri: `${host}/wiki/spaces/${spaceKey}/pages/${page.id}`,
          displayName: `confluence:${spaceKey}/${title}`,
          content: `Title: ${title}\n\n${textContent}`
        });
      }

      return items;
    } catch {
      return [];
    }
  }

  private parseConfluenceTarget(target: string): { host: string; spaceKey: string } {
    let clean = target;
    let host = 'https://confluence.atlassian.com';

    if (clean.startsWith('confluence://')) {
      clean = clean.replace('confluence://', '');
    } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const url = new URL(clean);
      host = `${url.protocol}//${url.host}`;
      clean = url.searchParams.get('spaceKey') || '';
    }

    const parts = clean.split('/').filter(Boolean);
    const spaceKey = parts[0] || clean;

    return { host, spaceKey };
  }
}
