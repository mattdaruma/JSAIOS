/**
 * JSAIOS Driven Adapter - JiraBatchSource
 * Implements IBatchSourceAdapter for searching Jira issues via JQL and extracting summaries & descriptions
 * via Jira REST API (pure HTTP fetch()).
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';

export class JiraBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'jira';

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('jira://') || target.includes('/rest/api/2/search') || target.includes('/rest/api/3/search');
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    const { host, jql } = this.parseJiraTarget(target);
    if (!jql) return [];

    const requestHeaders: Record<string, string> = {
      'User-Agent': 'JSAIOS-BatchEngine',
      'Accept': 'application/json',
      ...(headers || {})
    };

    const apiUrl = `${host}/rest/api/2/search?jql=${encodeURIComponent(jql)}&maxResults=50`;

    try {
      const res = await fetch(apiUrl, { headers: requestHeaders });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.issues || !Array.isArray(data.issues)) return [];

      const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
      const items: BatchItem[] = [];

      for (const issue of data.issues) {
        const key = issue.key || `Issue-${issue.id}`;
        const summary = issue.fields?.summary || '';
        const description = issue.fields?.description || '';

        if (regex && !regex.test(`${key} ${summary}`)) continue;

        items.push({
          uri: `${host}/browse/${key}`,
          displayName: `jira:${key}`,
          content: `Key: ${key}\nSummary: ${summary}\n\nDescription:\n${description}`
        });
      }

      return items;
    } catch {
      return [];
    }
  }

  private parseJiraTarget(target: string): { host: string; jql: string } {
    let clean = target;
    let host = 'https://jira.atlassian.com';

    if (clean.startsWith('jira://')) {
      clean = clean.replace('jira://', '');
    } else if (clean.startsWith('http://') || clean.startsWith('https://')) {
      const url = new URL(clean);
      host = `${url.protocol}//${url.host}`;
      clean = url.searchParams.get('jql') || 'project IS NOT NULL';
    }

    return { host, jql: clean || 'project IS NOT NULL' };
  }
}
