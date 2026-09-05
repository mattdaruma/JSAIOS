/**
 * JSAIOS - Model Context Protocol (MCP) Types & Interfaces
 * Standard contracts for JSON-RPC 2.0 requests, responses, tools, and resources.
 */

export interface McpServerConfig {
  id: string;
  name: string;
  endpoint: string; // HTTP/SSE REST endpoint URL
  headers?: Record<string, string>;
  createdAt: number;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceContent {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

export interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: Record<string, any>;
}

export interface JSONRPCResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}
