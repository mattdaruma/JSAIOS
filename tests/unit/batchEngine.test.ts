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
});
