import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanCandidateFiles } from '../../src/engines/batch/helpers/FileScanner';
import { chunkFileContent } from '../../src/engines/batch/helpers/SemanticChunker';
import { RollingAccumulator } from '../../src/engines/batch/helpers/RollingAccumulator';
import { BatchEngine } from '../../src/engines/batch/BatchEngine';
import { FileBatchStorage } from '../../src/adapters/storage/FileBatchStorage';
import { handleBatchCommands } from '../../src/adapters/terminal/batch/batchCommands';

describe('BatchEngine Map-Reduce Infrastructure', () => {
  const testDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-batch');
  const sampleSubdir = path.join(testDir, 'samples');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(sampleSubdir, { recursive: true });

    fs.writeFileSync(path.join(sampleSubdir, 'file1.ts'), 'export const a = 1;\nexport const b = 2;\n', 'utf-8');
    fs.writeFileSync(path.join(sampleSubdir, 'file2.js'), 'console.log("ibm data system connection");\n', 'utf-8');
    fs.writeFileSync(path.join(sampleSubdir, 'ignore.txt'), 'random text\n', 'utf-8');
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should scan candidate files using extension and pattern filters', () => {
    const scannedExt = scanCandidateFiles(sampleSubdir, undefined, ['ts', 'js']);
    expect(scannedExt.length).toBe(2);

    const scannedPattern = scanCandidateFiles(sampleSubdir, 'ibm');
    expect(scannedPattern.length).toBe(1);
    expect(scannedPattern[0]).toContain('file2.js');
  });

  it('should slice file content into sliding window chunks', () => {
    const content = Array.from({ length: 100 }, (_, i) => `Line ${i + 1}: export function func${i}() {}`).join('\n');
    const chunks = chunkFileContent('sample.ts', content, 500, 15);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].startLine).toBe(1);
  });

  it('should accumulate findings into a structured report', () => {
    const accumulator = new RollingAccumulator();
    accumulator.addFinding({
      filePath: 'src/ibmService.ts',
      startLine: 10,
      endLine: 25,
      summary: 'Direct IBM DB connection established',
      confidence: 'high'
    });

    const report = accumulator.generateReport('IBM Audit', 1, 1);
    expect(report).toContain('IBM Audit');
    expect(report).toContain('Direct IBM DB connection established');
    expect(report).toContain('Confidence: high');
  });

  it('should execute batch jobs and generate synthesis reports', async () => {
    const storage = new FileBatchStorage(path.join(testDir, 'jobs'));
    const engine = new BatchEngine(undefined, storage);

    const job = engine.createJob('job1', 'Job 1', sampleSubdir, 'ibm', ['js']);
    expect(engine.getJob('job1')).toBeDefined();

    const report = await engine.executeBatchJob('job1');
    expect(report).toContain('Job 1');
    expect(report).toContain('Target Files    : 1');

    const loadedReport = await engine.getJobReport('job1');
    expect(loadedReport).toBe(report);
  });

  it('should execute batch CLI terminal commands', async () => {
    const storage = new FileBatchStorage(path.join(testDir, 'jobs'));
    const engine = new BatchEngine(undefined, storage);

    const createOut = handleBatchCommands(['create', 'job2', 'Job 2', sampleSubdir], engine);
    expect(createOut).toContain('Job ID     : job2');

    const runOut = await handleBatchCommands(['run', 'job2'], engine);
    expect(runOut).toContain('Job 2');

    const reportOut = await handleBatchCommands(['report', 'job2'], engine);
    expect(reportOut).toContain('Job 2');
  });

  it('should fetch items via HttpBatchSource using HTTP REST', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (url: string) => {
      if (url.endsWith('.json')) {
        return {
          ok: true,
          text: async () => JSON.stringify(['https://api.example.com/file1.ts'])
        } as any;
      }
      return {
        ok: true,
        text: async () => 'console.log("remote http content");'
      } as any;
    }) as any;

    try {
      const storage = new FileBatchStorage(path.join(testDir, 'jobs'));
      const engine = new BatchEngine(undefined, storage);
      engine.createJob('remote_job', 'Remote Job', 'https://api.example.com/manifest.json', undefined, undefined, 'ollama', 'llama3', 'http');

      const report = await engine.executeBatchJob('remote_job');
      expect(report).toContain('Remote Job');
      expect(report).toContain('Target Files    : 1');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should fetch GitHub repository items via GitHubBatchSource', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (url: string) => {
      if (url.includes('/git/trees/')) {
        return {
          ok: true,
          json: async () => ({
            tree: [
              { type: 'blob', path: 'src/main.ts' },
              { type: 'blob', path: 'README.md' }
            ]
          })
        } as any;
      }
      return {
        ok: true,
        text: async () => 'export function main() { return 42; }'
      } as any;
    }) as any;

    try {
      const storage = new FileBatchStorage(path.join(testDir, 'jobs'));
      const engine = new BatchEngine(undefined, storage);
      engine.createJob('gh_job', 'GitHub Job', 'github://octocat/Hello-World', undefined, ['ts']);

      const report = await engine.executeBatchJob('gh_job');
      expect(report).toContain('GitHub Job');
      expect(report).toContain('Target Files    : 1');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should fetch GitLab repository items via GitLabBatchSource', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (url: string) => {
      if (url.includes('/repository/tree')) {
        return {
          ok: true,
          json: async () => ([
            { type: 'blob', path: 'src/app.ts' }
          ])
        } as any;
      }
      return {
        ok: true,
        text: async () => 'console.log("gitlab code");'
      } as any;
    }) as any;

    try {
      const storage = new FileBatchStorage(path.join(testDir, 'jobs'));
      const engine = new BatchEngine(undefined, storage);
      engine.createJob('gitlab_job', 'GitLab Job', 'gitlab://12345/main', undefined, ['ts']);

      const report = await engine.executeBatchJob('gitlab_job');
      expect(report).toContain('GitLab Job');
      expect(report).toContain('Target Files    : 1');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should fetch Confluence space pages via ConfluenceBatchSource', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          results: [
            { id: '101', title: 'Architecture Specs', body: { storage: { value: '<p>Hexagonal design rules</p>' } } }
          ]
        })
      } as any;
    }) as any;

    try {
      const storage = new FileBatchStorage(path.join(testDir, 'jobs'));
      const engine = new BatchEngine(undefined, storage);
      engine.createJob('conf_job', 'Confluence Job', 'confluence://DEV', undefined, undefined, 'ollama', 'llama3', 'confluence');

      const report = await engine.executeBatchJob('conf_job');
      expect(report).toContain('Confluence Job');
      expect(report).toContain('Target Files    : 1');
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('should fetch Jira issue descriptions via JiraBatchSource', async () => {
    const originalFetch = global.fetch;
    global.fetch = (async () => {
      return {
        ok: true,
        json: async () => ({
          issues: [
            { id: '201', key: 'PROJ-42', fields: { summary: 'Fix database connection pool leak', description: 'Connection pool runs out under high load' } }
          ]
        })
      } as any;
    }) as any;

    try {
      const storage = new FileBatchStorage(path.join(testDir, 'jobs'));
      const engine = new BatchEngine(undefined, storage);
      engine.createJob('jira_job', 'Jira Job', 'jira://project=PROJ', undefined, undefined, 'ollama', 'llama3', 'jira');

      const report = await engine.executeBatchJob('jira_job');
      expect(report).toContain('Jira Job');
      expect(report).toContain('Target Files    : 1');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
