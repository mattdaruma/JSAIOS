/**
 * JSAIOS - Unified React UI Shell Component
 * Connects declarative UI manifest layout to any driving client adapter (REST or In-Browser Kernel).
 */

import React, { useEffect, useState } from 'react';
import { UIRenderer } from '../renderer/UIRenderer';
import { stripAnsi } from '../helpers/stripAnsi';
import type { IClientAdapter } from '../types';
import uiManifest from '../../../../config/jsaios.ui.json';
import '../styles/globals.css';

export interface BrowserAppProps {
  adapter: IClientAdapter;
  initialBanner?: string;
  defaultStatusLabel?: string;
}

export const BrowserApp: React.FC<BrowserAppProps> = ({
  adapter,
  initialBanner = "=== JSAIOS Interactive System Terminal Shell ===\nCore Commands: 'help' (command reference), 'status' (kernel info), 'services' (drivers), 'clear'.\nType 'help' to view full command reference.\n\n",
  defaultStatusLabel = "ONLINE (Connected)"
}) => {
  const [bufferContent, setBufferContent] = useState<string>(initialBanner);
  const [activeSessionInfo, setActiveSessionInfo] = useState<string>('Session: default (ollama/llama3)');
  const [connectionStatus, setConnectionStatus] = useState<string>(defaultStatusLabel);

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
        } else {
          setBufferContent((prev) => prev + '\n\n');
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
