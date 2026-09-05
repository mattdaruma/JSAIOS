/**
 * JSAIOS - Batch Engine Types & Interfaces
 * Domain contracts for Map-Reduce file scanning, sliding window chunking, and rolling accumulation.
 */

export interface BatchItem {
  uri: string;
  displayName: string;
  content: string;
}

export interface IBatchSourceAdapter {
  sourceType: string;
  canHandle(target: string): boolean;
  fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]>;
}

export interface BatchJobDefinition {
  id: string;
  name: string;
  targetDirectory: string;
  sourceType?: string; // e.g. 'local', 'http', 'github', 'manifest'
  headers?: Record<string, string>; // Optional HTTP auth headers
  patternFilter?: string; // Optional regex pattern for candidate file filtering
  fileExtensions?: string[]; // e.g. ['ts', 'js', 'json']
  maxChunkChars?: number; // Max characters per chunk (default: 4000)
  overlapPercent?: number; // Sliding window overlap percentage (default: 15)
  providerId?: string;
  model?: string;
  promptTemplate?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BatchChunk {
  filePath: string;
  chunkIndex: number;
  totalChunks: number;
  content: string;
  startLine: number;
  endLine: number;
}

export interface BatchFinding {
  filePath: string;
  startLine: number;
  endLine: number;
  summary: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface BatchJobStatus {
  jobId: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  totalFilesFound: number;
  filesProcessed: number;
  chunksProcessed: number;
  totalFindings: number;
  summaryReport?: string;
  error?: string;
}

export interface IBatchStorage {
  loadJob(id: string): Promise<BatchJobDefinition | null>;
  saveJob(job: BatchJobDefinition): Promise<void>;
  listJobs(): Promise<BatchJobDefinition[]>;
  deleteJob(id: string): Promise<boolean>;
  saveReport?(jobId: string, report: string): Promise<void>;
  loadReport?(jobId: string): Promise<string | null>;
}
