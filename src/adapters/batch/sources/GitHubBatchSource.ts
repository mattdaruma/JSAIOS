/**
 * JSAIOS Driven Adapter - GitHubBatchSource
 * Implements IBatchSourceAdapter for scanning GitHub repository trees and reading raw contents
 * via GitHub REST API (pure HTTP fetch()).
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';

export class GitHubBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'github';

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('github://') || (target.startsWith('https://github.com/') && !target.endsWith('.git'));
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    const { owner, repo, ref } = this.parseGitHubTarget(target);
    if (!owner || !repo) return [];

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'JSAIOS-BatchEngine',
      'Accept': 'application/vnd.github.v3+json',
      ...(headers || {})
    };

    const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${ref || 'main'}?recursive=1`;

    try {
      const res = await fetch(treeUrl, { headers: requestHeaders });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.tree || !Array.isArray(data.tree)) return [];

      const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
      const items: BatchItem[] = [];

      for (const entry of data.tree) {
        if (entry.type !== 'blob') continue;

        const path = entry.path as string;
        if (regex && !regex.test(path)) continue;

        if (fileExtensions && fileExtensions.length > 0) {
          const ext = path.split('.').pop()?.toLowerCase();
          if (!ext || !fileExtensions.includes(ext)) continue;
        }

        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref || 'main'}/${path}`;
        try {
          const rawRes = await fetch(rawUrl, { headers: requestHeaders });
          if (rawRes.ok) {
            items.push({
              uri: rawUrl,
              displayName: `${owner}/${repo}/${path}`,
              content: await rawRes.text()
            });
          }
        } catch {
          // Skip individual failed file fetch
        }
      }

      return items;
    } catch {
      return [];
    }
  }

  private parseGitHubTarget(target: string): { owner: string; repo: string; ref?: string } {
    let clean = target;
    if (clean.startsWith('github://')) {
      clean = clean.replace('github://', '');
    } else if (clean.startsWith('https://github.com/')) {
      clean = clean.replace('https://github.com/', '');
    }

    const parts = clean.split('/').filter(Boolean);
    const owner = parts[0] || '';
    const repo = parts[1] || '';
    const ref = parts[3] || 'main'; // github://owner/repo/tree/ref or owner/repo

    return { owner, repo, ref };
  }
}
