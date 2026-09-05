/**
 * JSAIOS Driven Adapter - AwsBatchSource
 * Implements IBatchSourceAdapter for streaming AWS CloudFormation stacks, S3 manifests, or Lambda functions into BatchEngine.
 */

import type { BatchItem, IBatchSourceAdapter } from '../../../engines/batch/helpers/types';
import type { AwsService } from '../../../services/cloud/aws/AwsService';

export class AwsBatchSource implements IBatchSourceAdapter {
  public readonly sourceType = 'aws';

  constructor(private awsService?: AwsService) {}

  public canHandle(target: string): boolean {
    if (!target) return false;
    return target.startsWith('aws://');
  }

  public async fetchItems(
    target: string,
    patternFilter?: string,
    fileExtensions?: string[],
    headers?: Record<string, string>
  ): Promise<BatchItem[]> {
    if (!this.awsService) return [];

    const { resourceType, identifier } = this.parseAwsTarget(target);
    const regex = patternFilter ? new RegExp(patternFilter, 'i') : null;
    const items: BatchItem[] = [];

    try {
      if (resourceType === 's3' || resourceType === 'buckets') {
        const buckets = await this.awsService.listBuckets();
        for (const b of buckets) {
          if (regex && !regex.test(b.name)) continue;
          items.push({
            uri: `aws://s3/${b.name}`,
            displayName: `aws:s3/${b.name}`,
            content: `S3 Bucket: ${b.name}\nCreation Date: ${b.creationDate || 'Unknown'}`
          });
        }
      } else if (resourceType === 'stacks' || resourceType === 'cloudformation') {
        const stacks = await this.awsService.listStacks();
        for (const s of stacks) {
          if (regex && !regex.test(s.stackName)) continue;
          items.push({
            uri: `aws://cloudformation/${s.stackName}`,
            displayName: `aws:cloudformation/${s.stackName}`,
            content: `Stack Name: ${s.stackName}\nStack ID: ${s.stackId}\nStatus: ${s.status}`
          });
        }
      } else if (resourceType === 'lambda' || resourceType === 'functions') {
        const funcs = await this.awsService.listFunctions();
        for (const f of funcs) {
          if (regex && !regex.test(f.functionName)) continue;
          items.push({
            uri: `aws://lambda/${f.functionName}`,
            displayName: `aws:lambda/${f.functionName}`,
            content: `Function Name: ${f.functionName}\nRuntime: ${f.runtime || 'Unknown'}\nHandler: ${f.handler || 'Unknown'}`
          });
        }
      }

      return items;
    } catch {
      return [];
    }
  }

  private parseAwsTarget(target: string): { resourceType: string; identifier: string } {
    const clean = target.replace('aws://', '');
    const parts = clean.split('/').filter(Boolean);
    const resourceType = (parts[0] || 's3').toLowerCase();
    const identifier = parts[1] || '';
    return { resourceType, identifier };
  }
}
