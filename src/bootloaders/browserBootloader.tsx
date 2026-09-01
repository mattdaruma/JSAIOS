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
    "=== JSAIOS Interactive System Terminal Shell [Browser Edition] ===\nConnected to JSAIOS HoneyKernel REST Engine.\nType a terminal command below (e.g. 'help', 'status', 'services', 'chat status', 'ollama models').\n\n"
  );
  const [activeSessionInfo, setActiveSessionInfo] = useState<string>('Session: default (ollama)');
  const [connectionStatus, setConnectionStatus] = useState<string>('ONLINE (Connected)');

  useEffect(() => {
    // Fetch initial status on boot
    adapter.fetchStatus()
      .then((status) => {
        if (status.activeSession) {
          setActiveSessionInfo(`Session: ${status.activeSession.name} (${status.activeSession.providerId}/${status.activeSession.model})`);
        }
      })
      .catch(() => {
        setConnectionStatus('OFFLINE (Server Error)');
      });
  }, [adapter]);

  const handleUIEvent = async (eventName: string, payload?: any) => {
    if (eventName.endsWith(':submit') && payload) {
      const inputCmd = String(payload).trim();
      if (!inputCmd) return;

      if (inputCmd.toLowerCase() === 'clear') {
        setBufferContent('');
        return;
      }

      // Append user command input line to terminal buffer
      setBufferContent((prev) => prev + `jsaios@honeykernel:~$ ${inputCmd}\n`);

      try {
        await adapter.executeCommandStream(
          inputCmd,
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
