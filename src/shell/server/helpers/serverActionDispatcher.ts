/**
 * JSAIOS - Pure Generic Target Invoker: dispatchServerAction
 * 100% domain-agnostic server action dispatcher. Dynamically invokes target methods declared in JSON route manifests.
 */

import http from 'http';

export interface RouteTargetConfig {
  id: string;
  path: string;
  method: string;
  target: string;
  stream?: boolean;
}

export async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

export async function dispatchServerAction(
  route: RouteTargetConfig,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  urlParts: URL,
  targetMap: Record<string, any>
): Promise<void> {
  const [objName, methodName] = route.target.split('.');
  const targetObj = targetMap[objName];

  if (!targetObj || typeof targetObj[methodName] !== 'function') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Target method '${route.target}' not found on server adapter target map` }));
    return;
  }

  try {
    // Parse Request Parameters (Query params for GET, Body JSON for POST/PUT)
    let params: Record<string, any> = {};
    urlParts.searchParams.forEach((v, k) => { params[k] = v; });

    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const bodyText = await readRequestBody(req);
      if (bodyText) {
        try {
          const bodyJson = JSON.parse(bodyText);
          params = { ...params, ...bodyJson };
        } catch {
          params.rawBody = bodyText;
        }
      }
    }

    // Handle Streaming Method Target
    if (route.stream) {
      res.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked'
      });

      try {
        await targetObj[methodName]({
          ...params,
          onChunk: (chunk: string) => res.write(chunk)
        });
        res.end();
      } catch (err: any) {
        res.write(`\n\nExecution error: ${err.message || err}`);
        res.end();
      }
      return;
    }

    // Pure Generic Dynamic Method Invocation
    const result = await targetObj[methodName](params);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result !== undefined ? result : { success: true }));
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || String(err) }));
  }
}
