/**
 * JSAIOS - Standalone In-Browser Local Kernel Bootloader (Mode B)
 * Boots HoneyKernel directly in browser memory without requiring backend HTTP REST server.
 */

import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { UIRenderer } from '../shell/browser/renderer/UIRenderer';
import { BrowserLocalAdapter } from '../shell/browser/adapters/BrowserLocalAdapter';
import { stripAnsi } from '../shell/browser/helpers/stripAnsi';
import uiManifest from '../../config/jsaios.ui.json';
import '../shell/browser/styles/globals.css';

export const BrowserLocalApp: React.FC = () => {
  const [adapter] = useState(() => new BrowserLocalAdapter());
  const [bufferContent, setBufferContent] = useState<string>(
    "=== JSAIOS Standalone System Terminal Shell [Mode B - In-Browser Kernel] ===\nHoneyKernel & ChatEngine booted directly in browser memory (LocalStorage persistence active).\nCore Commands: 'help' (command reference), 'status' (kernel info), 'services' (drivers), 'clear'.\nType 'help' to view full command reference.\n\n"
  );
  const [activeSessionInfo, setActiveSessionInfo] = useState<string>('Session: default (ollama/llama3)');
  const [connectionStatus, setConnectionStatus] = useState<string>('ONLINE (Browser Memory)');

  useEffect(() => {
    adapter.fetchStatus()
      .then((status) => {
        if (status.activeSession) {
          setActiveSessionInfo(`Session: ${status.activeSession.name} (${status.activeSession.providerId}/${status.activeSession.model})`);
        }
      })
      .catch((err) => {
        setConnectionStatus(`OFFLINE (${err.message || err})`);
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

      setBufferContent((prev) => prev + `jsaios@honeykernel:~$ ${inputCmd}\n`);

      try {
        const result = await adapter.executeCommandStream(
          inputCmd,
          (chunk: string) => {
            const cleanChunk = stripAnsi(chunk);
            setBufferContent((prev) => prev + cleanChunk);
          }
        );

        if (result === '__CLEAR__') {
          setBufferContent('');
        } else if (result) {
          const cleanResult = stripAnsi(result);
          setBufferContent((prev) => prev + cleanResult + '\n\n');
        }
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
  createRoot(rootElement).render(<BrowserLocalApp />);
}
