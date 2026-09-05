/**
 * JSAIOS Driven Adapter - McpServerAdapter
 * Serves JSAIOS engine state and BatchEngine reports as MCP JSON-RPC resources and tools.
 */

import type { BatchEngine } from '../../engines/batch/BatchEngine';
import type { JSONRPCRequest, JSONRPCResponse, McpResource, McpResourceContent } from './types';

export class McpServerAdapter {
  constructor(private batchEngine?: BatchEngine) {}

  public async handleRpcRequest(request: JSONRPCRequest): Promise<JSONRPCResponse> {
    const { id, method, params } = request;

    switch (method) {
      case 'resources/list': {
        const resources: McpResource[] = [];
        if (this.batchEngine) {
          const jobs = this.batchEngine.listJobs();
          for (const job of jobs) {
            resources.push({
              uri: `resource://jsaios/batch/reports/${job.id}`,
              name: `Batch Report: ${job.name}`,
              description: `Synthesis Map-Reduce report for job ${job.id}`,
              mimeType: 'text/markdown'
            });
          }
        }
        return { jsonrpc: '2.0', id, result: { resources } };
      }

      case 'resources/read': {
        const uri = params?.uri as string;
        if (uri && uri.startsWith('resource://jsaios/batch/reports/') && this.batchEngine) {
          const jobId = uri.replace('resource://jsaios/batch/reports/', '');
          const report = await this.batchEngine.getJobReport(jobId);
          if (report) {
            const contents: McpResourceContent[] = [{
              uri,
              mimeType: 'text/markdown',
              text: report
            }];
            return { jsonrpc: '2.0', id, result: { contents } };
          }
        }
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32602, message: `Resource '${uri}' not found or unavailable.` }
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: { code: -32601, message: `Method '${method}' not supported.` }
        };
    }
  }
}
