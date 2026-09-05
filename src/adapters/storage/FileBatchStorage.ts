/**
 * JSAIOS - Storage Adapter: FileBatchStorage
 * Persists BatchEngine job definitions and generated synthesis reports in storage/batch-jobs/ (.gitignore protected).
 */

import fs from 'fs';
import path from 'path';
import type { BatchJobDefinition, IBatchStorage } from '../../engines/batch/helpers/types';

export class FileBatchStorage implements IBatchStorage {
  private baseDir: string;
  private reportsDir: string;

  constructor(customDir?: string) {
    this.baseDir = customDir || path.resolve(process.cwd(), 'storage', 'batch-jobs');
    this.reportsDir = path.join(this.baseDir, 'reports');

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  public async loadJob(id: string): Promise<BatchJobDefinition | null> {
    try {
      const filePath = path.join(this.baseDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as BatchJobDefinition;
      }
    } catch {
      // Fallback null
    }
    return null;
  }

  public async saveJob(job: BatchJobDefinition): Promise<void> {
    const filePath = path.join(this.baseDir, `${job.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(job, null, 2), 'utf-8');
  }

  public async listJobs(): Promise<BatchJobDefinition[]> {
    const jobs: BatchJobDefinition[] = [];
    try {
      if (fs.existsSync(this.baseDir)) {
        const files = fs.readdirSync(this.baseDir);
        for (const file of files) {
          if (file.endsWith('.json') && !fs.statSync(path.join(this.baseDir, file)).isDirectory()) {
            const raw = fs.readFileSync(path.join(this.baseDir, file), 'utf-8');
            jobs.push(JSON.parse(raw));
          }
        }
      }
    } catch {
      // Return empty array on error
    }
    return jobs;
  }

  public async deleteJob(id: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, `${id}.json`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      const reportPath = path.join(this.reportsDir, `${id}.txt`);
      if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
      }
      return true;
    } catch {
      return false;
    }
  }

  public async saveReport(jobId: string, report: string): Promise<void> {
    const filePath = path.join(this.reportsDir, `${jobId}.txt`);
    fs.writeFileSync(filePath, report, 'utf-8');
  }

  public async loadReport(jobId: string): Promise<string | null> {
    try {
      const filePath = path.join(this.reportsDir, `${jobId}.txt`);
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch {
      // Fallback null
    }
    return null;
  }
}
