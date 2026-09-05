/**
 * JSAIOS - Single-purpose terminal handler: AwsTerminalAdapter
 * Handles 'aws status', 'aws capabilities', 'aws stacks', 'aws s3', and 'aws functions'.
 */

import type { AwsService } from '../../../services/cloud/aws/AwsService';

export function handleAwsTerminal(awsService: AwsService, args: string[]): string | Promise<string> {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'status': {
      const desc = awsService.getDescriptor();
      return [
        '=== AWS Cloud Driver Status ===',
        `Driver ID    : ${desc.id}`,
        `Name         : ${desc.name}`,
        `Status       : ${desc.status}`,
        `Capabilities : ${desc.capabilities.join(', ')}`
      ].join('\n');
    }

    case 'capabilities': {
      return (async () => {
        const caps = await awsService.discoverCapabilities();
        return [
          '=== AWS Discovered IAM Capabilities ===',
          ...caps.map(c => `  • [${c.capability.padEnd(15)}] Status: ${c.authorized ? 'AUTHORIZED' : 'DENIED'} (${c.statusMessage})`)
        ].join('\n');
      })();
    }

    case 'stacks': {
      return (async () => {
        const stacks = await awsService.listStacks();
        if (stacks.length === 0) return 'No CloudFormation stacks found in current AWS region.';
        return [
          '=== AWS CloudFormation Stacks ===',
          ...stacks.map(s => `  • ${s.stackName.padEnd(25)} Status: ${s.status}`)
        ].join('\n');
      })();
    }

    case 's3': {
      return (async () => {
        const buckets = await awsService.listBuckets();
        if (buckets.length === 0) return 'No S3 buckets found in AWS account.';
        return [
          '=== AWS S3 Storage Buckets ===',
          ...buckets.map(b => `  • ${b.name}`)
        ].join('\n');
      })();
    }

    case 'functions':
    case 'lambda': {
      return (async () => {
        const funcs = await awsService.listFunctions();
        if (funcs.length === 0) return 'No Lambda functions found in current AWS region.';
        return [
          '=== AWS Lambda Functions ===',
          ...funcs.map(f => `  • ${f.functionName.padEnd(25)} Runtime: ${f.runtime || 'Unknown'}`)
        ].join('\n');
      })();
    }

    default:
      return [
        'AWS Cloud Service Driver Commands:',
        '  • aws status                                   - Check AWS REST driver status and capabilities',
        '  • aws capabilities                             - Execute IAM capability discovery probe',
        '  • aws stacks                                   - List CloudFormation stacks',
        '  • aws s3                                       - List S3 storage buckets',
        '  • aws functions                                - List Lambda functions'
      ].join('\n');
  }
}
