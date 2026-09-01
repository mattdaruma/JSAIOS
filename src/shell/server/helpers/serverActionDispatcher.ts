/**
 * JSAIOS - Single-purpose helper: dispatchServerAction
 * Handles action execution for data-driven HTTP REST server adapter.
 */

import http from 'http';

export async function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', (err) => reject(err));
  });
}

export async function dispatchServerAction(
  action: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  urlParts: URL,
  engine: any,
  kernel: any
): Promise<void> {
  if (action === 'systemStatus') {
    const active = engine.getActiveSession();
    const sessions = engine.listSessions();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
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
    }));
    return;
  }

  if (action === 'listServices') {
    const services = kernel.Registry.listDescriptors();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ services }));
    return;
  }

  if (action === 'listChatSessions') {
    const sessions = engine.listSessions();
    const active = engine.getActiveSession();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      activeId: active?.id || null,
      sessions: sessions.map((s: any) => ({
        id: s.id,
        name: s.name,
        providerId: s.providerId,
        model: s.model,
        turnsCount: s.messages.length
      }))
    }));
    return;
  }

  if (action === 'createChatSession') {
    const body = await readRequestBody(req);
    const { name, providerId, model, systemDirective, options } = JSON.parse(body || '{}');
    const session = engine.createSession(
      name || 'default',
      providerId || 'ollama',
      model || 'llama3',
      systemDirective,
      options
    );
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ session: { id: session.id, name: session.name, providerId: session.providerId, model: session.model } }));
    return;
  }

  if (action === 'getChatHistory') {
    const sessionId = urlParts.searchParams.get('sessionId');
    const allSessions = engine.listSessions();
    const session = sessionId ? allSessions.find((s: any) => s.id === sessionId) : engine.getActiveSession();
    if (!session) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Session not found' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      sessionId: session.id,
      name: session.name,
      messages: session.messages
    }));
    return;
  }

  if (action === 'executeChatTurnStream') {
    const body = await readRequestBody(req);
    const { userPrompt, sessionId, options, images } = JSON.parse(body || '{}');

    const allSessions = engine.listSessions();
    let active = sessionId ? allSessions.find((s: any) => s.id === sessionId) : engine.getActiveSession();
    if (!active) active = engine.createSession('default', 'ollama', 'llama3');

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked'
    });

    try {
      await engine.executeTurn({
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

  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: `Action '${action}' not implemented in server adapter` }));
}
