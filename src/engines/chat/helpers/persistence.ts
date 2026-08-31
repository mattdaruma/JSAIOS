/**
 * JSAIOS - Single-purpose helper: persistence
 * Manages loading, saving, and deleting ChatSession JSON files on disk.
 */

import fs from 'fs';
import path from 'path';
import { ChatSession } from './ChatSession';

export function ensureStorageDirectory(storageDir: string): string {
  const fullPath = path.isAbsolute(storageDir)
    ? storageDir
    : path.join(process.cwd(), storageDir);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }

  return fullPath;
}

export function saveSessionToDisk(storageDir: string, session: ChatSession): void {
  try {
    const dir = ensureStorageDirectory(storageDir);
    const filePath = path.join(dir, `${session.id}.json`);
    const data = {
      id: session.id,
      name: session.name,
      providerId: session.providerId,
      model: session.model,
      messages: session.messages,
      options: session.options,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.warn(`[ChatPersistence] Failed to save session '${session.id}': ${err.message || err}`);
  }
}

export function loadSessionsFromDisk(storageDir: string): ChatSession[] {
  const sessions: ChatSession[] = [];
  try {
    const dir = ensureStorageDirectory(storageDir);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && !f.startsWith('_'));

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.id && parsed.name && Array.isArray(parsed.messages)) {
          const session = new ChatSession(
            parsed.id,
            parsed.name,
            parsed.providerId || 'ollama',
            parsed.model || 'llama3'
          );
          session.messages = parsed.messages;
          if (parsed.options) session.options = parsed.options;
          if (parsed.createdAt) session.createdAt = parsed.createdAt;
          if (parsed.updatedAt) session.updatedAt = parsed.updatedAt;
          sessions.push(session);
        }
      } catch {
        // Skip corrupt session files
      }
    }
  } catch {
    // Return empty array if directory unreadable
  }

  return sessions;
}

export function deleteSessionFromDisk(storageDir: string, sessionId: string): void {
  try {
    const dir = ensureStorageDirectory(storageDir);
    const filePath = path.join(dir, `${sessionId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err: any) {
    console.warn(`[ChatPersistence] Failed to delete session file '${sessionId}': ${err.message || err}`);
  }
}
