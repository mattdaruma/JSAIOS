/**
 * JSAIOS - AWS Service Types & Interfaces
 * Domain contracts for AWS IAM authentication, capability discovery, CloudFormation, S3, and Lambda.
 */

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  sessionToken?: string;
}

export type AwsCapability = 'sts' | 'cloudformation' | 's3' | 'lambda' | 'bedrock' | 'iam';

export interface AwsCapabilityDescriptor {
  capability: AwsCapability;
  authorized: boolean;
  statusMessage?: string;
}

export interface AwsStackSummary {
  stackName: string;
  stackId: string;
  status: string;
  creationTime?: string;
}

export interface AwsBucketSummary {
  name: string;
  creationDate?: string;
}

export interface AwsFunctionSummary {
  functionName: string;
  runtime?: string;
  handler?: string;
}
