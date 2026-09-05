/**
 * JSAIOS Driven Adapter - GitLabBatchSource
 * Implements IBatchSourceAdapter for scanning GitLab repository trees and reading raw file contents
 * via GitLab v4 REST API (pure HTTP fetch()).
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';

export class GitLabBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'gitlab';

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('gitlab://') || target.includes('/api/v4/projects/');
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    const { host, projectId, ref } = this.parseGitLabTarget(target);
    if (!projectId) return [];

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'JSAIOS-BatchEngine',
      'Accept': 'application/json',
      ...(headers || {})
    };

    const encodedProject = encodeURIComponent(projectId);
    const treeUrl = `${host}/api/v4/projects/${encodedProject}/repository/tree?recursive=true&ref=${ref || 'main'}`;

    try {
      const res = await fetch(treeUrl, { headers: requestHeaders });
      if (!res.ok) return [];

      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
      const items: BatchItem[] = [];

      for (const entry of data) {
        if (entry.type !== 'blob') continue;

        const path = entry.path as string;
        if (regex && !regex.test(path)) continue;

        if (fileExtensions && fileExtensions.length > 0) {
          const ext = path.split('.').pop()?.toLowerCase();
          if (!ext || !fileExtensions.includes(ext)) continue;
        }

        const encodedFilePath = encodeURIComponent(path);
        const rawUrl = `${host}/api/v4/projects/${encodedProject}/repository/files/${encodedFilePath}/raw?ref=${ref || 'main'}`;
        try {
          const rawRes = await fetch(rawUrl, { headers: requestHeaders });
          if (rawRes.ok) {
            items.push({
              uri: rawUrl,
              displayName: `gitlab:${projectId}/${path}`,
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

  private parseGitLabTarget(target: string): { host: string; projectId: string; ref?: string } {
    let clean = target;
    let host = 'https://gitlab.com';

    if (clean.startsWith('gitlab://')) {
      clean = clean.replace('gitlab://', '');
    } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const url = new URL(clean);
      host = `${url.protocol}//${url.host}`;
      clean = url.pathname.replace('/api/v4/projects/', '');
    }

    const parts = clean.split('/').filter(Boolean);
    const projectId = parts[0] || '';
    const ref = parts[1] || 'main';

    return { host, projectId, ref };
  }
}
