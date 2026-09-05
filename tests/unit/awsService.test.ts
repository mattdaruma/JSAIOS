import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AwsService } from '../../src/services/cloud/aws/AwsService';
import { signAwsRequest } from '../../src/services/cloud/aws/helpers/sigv4Signer';
import { AwsBatchSource } from '../../src/adapters/batch/sources/AwsBatchSource';
import { BatchEngine } from '../../src/engines/batch/BatchEngine';
import { BatchSourceRegistry } from '../../src/adapters/batch/BatchSourceRegistry';
import { handleAwsTerminal } from '../../src/adapters/terminal/services/AwsTerminalAdapter';

describe('AWS Cloud Service Driver & Capability Discovery', () => {
  const testDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-aws');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should generate valid SigV4 authorization headers', () => {
    const headers = signAwsRequest(
      'GET',
      'https://s3.us-east-1.amazonaws.com/',
      's3',
      { accessKeyId: 'AKIAIOSFODNN7EXAMPLE', secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1' }
    );

    expect(headers.Authorization).toContain('AWS4-HMAC-SHA256');
    expect(headers.Authorization).toContain('Credential=AKIAIOSFODNN7EXAMPLE');
    expect(headers['x-amz-content-sha256']).toBeDefined();
  });

  it('should discover AWS capabilities and list stacks, buckets, and functions', async () => {
    const aws = new AwsService({ accessKeyId: 'test', secretAccessKey: 'test', region: 'us-east-1' });
    const caps = await aws.discoverCapabilities();
    expect(caps.length).toBe(4);

    const desc = aws.getDescriptor();
    expect(desc.capabilities).toContain('cloudformation');

    const stacks = await aws.listStacks();
    expect(stacks.length).toBeGreaterThan(0);

    const buckets = await aws.listBuckets();
    expect(buckets.length).toBeGreaterThan(0);

    const funcs = await aws.listFunctions();
    expect(funcs.length).toBeGreaterThan(0);
  });

  it('should stream AWS resources into BatchEngine via AwsBatchSource', async () => {
    const aws = new AwsService({ accessKeyId: 'test', secretAccessKey: 'test', region: 'us-east-1' });
    const registry = new BatchSourceRegistry(undefined, undefined, aws);
    const engine = new BatchEngine(undefined, undefined, registry);

    engine.createJob('aws_job', 'AWS Job', 'aws://s3', undefined, undefined, 'ollama', 'llama3', 'aws');
    const report = await engine.executeBatchJob('aws_job');

    expect(report).toContain('AWS Job');
    expect(report).toContain('Target Files    : 2');
  });

  it('should execute handleAwsTerminal CLI subcommands', async () => {
    const aws = new AwsService({ accessKeyId: 'test', secretAccessKey: 'test', region: 'us-east-1' });
    await aws.discoverCapabilities();

    const statusOut = handleAwsTerminal(aws, ['status']);
    expect(statusOut).toContain('AWS Cloud Driver Status');

    const capsOut = await handleAwsTerminal(aws, ['capabilities']);
    expect(capsOut).toContain('AWS Discovered IAM Capabilities');

    const stacksOut = await handleAwsTerminal(aws, ['stacks']);
    expect(stacksOut).toContain('AWS CloudFormation Stacks');

    const s3Out = await handleAwsTerminal(aws, ['s3']);
    expect(s3Out).toContain('AWS S3 Storage Buckets');

    const funcsOut = await handleAwsTerminal(aws, ['functions']);
    expect(funcsOut).toContain('AWS Lambda Functions');
  });
});
