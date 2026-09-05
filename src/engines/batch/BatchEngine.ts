/**
 * JSAIOS - Core Domain Engine: BatchEngine
 * Map-Reduce file processing engine: Scans directories, executes sliding-window chunking,
 * and accumulates findings into token-aware rolling summary reports.
 */

import fs from 'fs';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import type { AIService } from '../../services/ai/AIService';
import type { BatchJobDefinition, BatchJobStatus, IBatchStorage } from './helpers/types';
import { scanCandidateFiles } from './helpers/FileScanner';
import { chunkFileContent } from './helpers/SemanticChunker';
import { RollingAccumulator } from './helpers/RollingAccumulator';

export class BatchEngine {
  private jobs: Map<string, BatchJobDefinition> = new Map();
  private statuses: Map<string, BatchJobStatus> = new Map();

  constructor(
    private kernel?: HoneyKernel,
    private storageAdapter?: IBatchStorage
  ) {}

  public registerJob(job: BatchJobDefinition): void {
    this.jobs.set(job.id, job);
    if (this.storageAdapter) {
      this.storageAdapter.saveJob(job).catch(() => {});
    }
  }

  public getJob(id: string): BatchJobDefinition | undefined {
    return this.jobs.get(id);
  }

  public listJobs(): BatchJobDefinition[] {
    return Array.from(this.jobs.values());
  }

  public createJob(
    id: string,
    name: string,
    targetDirectory: string,
    patternFilter?: string,
    fileExtensions?: string[],
    providerId: string = 'ollama',
    model: string = 'llama3'
  ): BatchJobDefinition {
    const job: BatchJobDefinition = {
      id,
      name,
      targetDirectory,
      patternFilter,
      fileExtensions,
      providerId,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.registerJob(job);
    return job;
  }

  public deleteJob(id: string): boolean {
    const deleted = this.jobs.delete(id);
    this.statuses.delete(id);
    if (deleted && this.storageAdapter) {
      this.storageAdapter.deleteJob(id).catch(() => {});
    }
    return deleted;
  }

  public getJobStatus(id: string): BatchJobStatus | undefined {
    return this.statuses.get(id);
  }

  public async getJobReport(id: string): Promise<string | null> {
    const status = this.statuses.get(id);
    if (status?.summaryReport) return status.summaryReport;
    if (this.storageAdapter?.loadReport) {
      return await this.storageAdapter.loadReport(id);
    }
    return null;
  }

  public async executeBatchJob(
    jobId: string,
    onProgress?: (processedFiles: number, totalFiles: number) => void
  ): Promise<string> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Batch job '${jobId}' not found.`);

    const files = scanCandidateFiles(job.targetDirectory, job.patternFilter, job.fileExtensions);
    const accumulator = new RollingAccumulator();

    const status: BatchJobStatus = {
      jobId: job.id,
      status: 'running',
      totalFilesFound: files.length,
      filesProcessed: 0,
      chunksProcessed: 0,
      totalFindings: 0
    };
    this.statuses.set(job.id, status);

    if (files.length === 0) {
      status.status = 'completed';
      const emptyReport = accumulator.generateReport(job.name, 0, 0);
      status.summaryReport = emptyReport;
      if (this.storageAdapter?.saveReport) {
        await this.storageAdapter.saveReport(job.id, emptyReport);
      }
      return emptyReport;
    }

    const providerId = job.providerId || 'ollama';
    const aiService = this.kernel ? this.kernel.getService<AIService>(providerId) : undefined;

    let totalChunksCount = 0;

    for (const filePath of files) {
      let content = '';
      try {
        content = fs.readFileSync(filePath, 'utf-8');
      } catch {
        continue;
      }

      const chunks = chunkFileContent(filePath, content, job.maxChunkChars || 4000, job.overlapPercent || 15);
      totalChunksCount += chunks.length;

      for (const chunk of chunks) {
        status.chunksProcessed++;

        if (aiService) {
          try {
            const prompt = `Analyze this code/file chunk for key insights:\n\n${chunk.content}`;
            const res = await aiService.generateText({
              model: job.model || 'llama3',
              prompt,
              systemDirective: 'Analyze file chunk and extract key code logic or findings concisely.'
            });
            if (res.text && res.text.trim()) {
              accumulator.addFinding({
                filePath: chunk.filePath,
                startLine: chunk.startLine,
                endLine: chunk.endLine,
                summary: res.text.trim().substring(0, 300)
              });
            }
          } catch {
            // Suppress individual chunk AI error
          }
        } else {
          // Offline fallback finding accumulator
          accumulator.addFinding({
            filePath: chunk.filePath,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            summary: `Scanned chunk (${chunk.content.length} chars, lines ${chunk.startLine}-${chunk.endLine})`
          });
        }
      }

      status.filesProcessed++;
      if (onProgress) onProgress(status.filesProcessed, files.length);
    }

    const report = accumulator.generateReport(job.name, files.length, totalChunksCount);
    status.status = 'completed';
    status.totalFindings = accumulator.getFindings().length;
    status.summaryReport = report;

    if (this.storageAdapter?.saveReport) {
      await this.storageAdapter.saveReport(job.id, report);
    }

    return report;
  }

  public async loadJobsFromStorage(): Promise<void> {
    if (this.storageAdapter) {
      const stored = await this.storageAdapter.listJobs();
      for (const j of stored) {
        this.jobs.set(j.id, j);
      }
    }
  }
}
