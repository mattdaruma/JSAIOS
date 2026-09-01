/**
 * JSAIOS - Browser Web Bootloader
 * Mounts Data-Driven UI Framework with declarative config/jsaios.ui.json.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UIRenderer } from '../shell/browser/renderer/UIRenderer';
import { BrowserClientAdapter } from '../shell/browser/BrowserClientAdapter';
import uiManifest from '../../config/jsaios.ui.json';
import '../shell/browser/styles/globals.css';

export const BrowserApp: React.FC = () => {
  const [adapter] = useState(() => new BrowserClientAdapter());
  const [bufferContent, setBufferContent] = useState<string>(
    "=== JSAIOS Interactive Terminal Shell [Browser Edition] ===\nConnected to JSAIOS HoneyKernel REST Engine.\nType a message turn or command below.\n\n"
  );
  const [activeSessionInfo, setActiveSessionInfo] = useState<string>('Session: ollachat (ollama)');
  const [connectionStatus, setConnectionStatus] = useState<string>('ONLINE (Connected)');

  useEffect(() => {
    // Fetch initial status and history on boot
    adapter.fetchStatus()
      .then((status) => {
        if (status.activeSession) {
          setActiveSessionInfo(`Session: ${status.activeSession.name} (${status.activeSession.providerId}/${status.activeSession.model})`);
        }
      })
      .catch(() => {
        setConnectionStatus('OFFLINE (Server Error)');
      });

    adapter.fetchHistory()
      .then((history) => {
        if (history.messages && history.messages.length > 0) {
          const formatted = history.messages.map((m: any) => {
            const badge = m.role === 'user' ? '[USER]' : m.role === 'assistant' ? '[ASSISTANT]' : '[SYSTEM]';
            return `${badge}: ${m.content}`;
          }).join('\n\n');
          setBufferContent((prev) => prev + formatted + '\n\n');
        }
      })
      .catch(() => {});
  }, [adapter]);

  const handleUIEvent = async (eventName: string, payload?: any) => {
    if (eventName.endsWith(':submit') && payload) {
      const userPrompt = String(payload).trim();
      if (!userPrompt) return;

      // Append user prompt turn immediately to buffer
      setBufferContent((prev) => prev + `[USER]: ${userPrompt}\n\n[ASSISTANT]: `);

      try {
        await adapter.sendPromptStream(
          userPrompt,
          (chunk: string) => {
            setBufferContent((prev) => prev + chunk);
          }
        );
        setBufferContent((prev) => prev + '\n\n');
      } catch (err: any) {
        setBufferContent((prev) => prev + `\nError: ${err.message || err}\n\n`);
      }
    }
  };

  return (
    <UIRenderer
      config={uiManifest.root as any}
      state={{
        bufferContent,
        activeSessionInfo,
        connectionStatus
      }}
      onEvent={handleUIEvent}
    />
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<BrowserApp />);
}
