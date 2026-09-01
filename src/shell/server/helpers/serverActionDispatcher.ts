/**
 * JSAIOS - Generic Target Invoker: dispatchServerAction
 * Dynamically invokes kernel and engine methods declared in route JSON manifests.
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
  chatEngine: any,
  kernel: any
): Promise<void> {
  const targetMap: Record<string, any> = {
    kernel,
    chatEngine
  };

  const [objName, methodName] = route.target.split('.');
  const targetObj = targetMap[objName];

  if (!targetObj || typeof targetObj[methodName] !== 'function' && typeof targetObj.getStatus !== 'function' && typeof targetObj.Registry !== 'object') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Target method '${route.target}' invalid on server adapter` }));
    return;
  }

  // Handle Chunked Streaming Endpoint
  if (route.stream) {
    const body = await readRequestBody(req);
    const { userPrompt, sessionId, options, images } = JSON.parse(body || '{}');

    const allSessions = chatEngine.listSessions();
    let active = sessionId ? allSessions.find((s: any) => s.id === sessionId) : chatEngine.getActiveSession();
    if (!active) active = chatEngine.createSession('default', 'ollama', 'llama3');

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    });

    try {
      await chatEngine.executeTurn({
        sessionId: active.id,
        userPrompt,
        images,
        turnOptions: options,
        onChunk: (chunk: string) => {
          res.write(chunk);
        }
      });
      res.end();
    } catch (err: any) {
      res.write(`\n\nChat error: ${err.message || err}`);
      res.end();
    }
    return;
  }

  // Generic Method Invocation & JSON Response
  try {
    let result: any = null;

    if (route.target === 'kernel.getStatus') {
      const active = chatEngine.getActiveSession();
      const sessions = chatEngine.listSessions();
      result = {
        status: 'online',
        kernel: kernel.getStatus(),
        activeSession: active ? {
          id: active.id,
          name: active.name,
          providerId: active.providerId,
          model: active.model,
          messagesCount: active.messages.length,
          options: active.options
        } : null,
        totalSessions: sessions.length
      };
    } else if (route.target === 'kernel.listServices') {
      result = { services: kernel.Registry.listDescriptors() };
    } else if (route.target === 'chatEngine.listSessions') {
      const sessions = chatEngine.listSessions();
      const active = chatEngine.getActiveSession();
      result = {
        activeId: active?.id || null,
        sessions: sessions.map((s: any) => ({
          id: s.id,
          name: s.name,
          providerId: s.providerId,
          model: s.model,
          turnsCount: s.messages.length
        }))
      };
    } else if (route.target === 'chatEngine.createSession') {
      const body = await readRequestBody(req);
      const { name, providerId, model, systemDirective, options } = JSON.parse(body || '{}');
      const session = chatEngine.createSession(name || 'default', providerId || 'ollama', model || 'llama3', systemDirective, options);
      result = { session: { id: session.id, name: session.name, providerId: session.providerId, model: session.model } };
    } else if (route.target === 'chatEngine.getHistory') {
      const sessionId = urlParts.searchParams.get('sessionId');
      const allSessions = chatEngine.listSessions();
      const session = sessionId ? allSessions.find((s: any) => s.id === sessionId) : chatEngine.getActiveSession();
      if (!session) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Session not found' }));
        return;
      }
      result = { sessionId: session.id, name: session.name, messages: session.messages };
    } else {
      result = await targetObj[methodName]();
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err: any) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message || String(err) }));
  }
}
