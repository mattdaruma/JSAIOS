/**
 * JSAIOS Service Helper - sigv4Signer
 * Generates AWS Signature Version 4 (SigV4) authorization headers for pure fetch() REST requests.
 */

import crypto from 'crypto';
import type { AwsCredentials } from '../types';

export function signAwsRequest(
  method: string,
  url: string,
  service: string,
  credentials: AwsCredentials,
  body: string = '',
  extraHeaders: Record<string, string> = {}
): Record<string, string> {
  const parsedUrl = new URL(url);
  const host = parsedUrl.host;
  const path = parsedUrl.pathname || '/';
  const query = parsedUrl.search ? parsedUrl.search.substring(1) : '';

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const payloadHash = crypto.createHash('sha256').update(body).digest('hex');

  const headers: Record<string, string> = {
    'host': host,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    ...extraHeaders
  };

  if (credentials.sessionToken) {
    headers['x-amz-security-token'] = credentials.sessionToken;
  }

  const sortedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
  const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${headers[k].trim()}\n`).join('');
  const signedHeaders = sortedHeaderKeys.join(';');

  const canonicalRequest = [
    method.toUpperCase(),
    path,
    query,
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');

  const credentialScope = `${dateStamp}/${credentials.region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  ].join('\n');

  const kDate = hmac('AWS4' + credentials.secretAccessKey, dateStamp);
  const kRegion = hmac(kDate, credentials.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, 'aws4_request');
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    'Authorization': authorization
  };
}

function hmac(key: string | Buffer, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}
