/**
 * JSAIOS - Unified React UI Shell Component
 * Connects declarative UI manifest layout to any driving client adapter (REST or In-Browser Kernel).
 * Includes security alert banner for client-side API token exposure.
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
  hasBundledSecrets?: boolean;
}

export const BrowserApp: React.FC<BrowserAppProps> = ({
  adapter,
  initialBanner = "=== JSAIOS Interactive System Terminal Shell ===\nCore Commands: 'help' (command reference), 'status' (kernel info), 'services' (drivers), 'clear'.\nType 'help' to view full command reference.\n\n",
  defaultStatusLabel = "ONLINE (Connected)",
  hasBundledSecrets = true
}) => {
  const [bufferContent, setBufferContent] = useState<string>(initialBanner);
  const [activeSessionInfo, setActiveSessionInfo] = useState<string>('Session: default (ollama/llama3)');
  const [connectionStatus, setConnectionStatus] = useState<string>(defaultStatusLabel);
  const [showAlert, setShowAlert] = useState<boolean>(() => Boolean(hasBundledSecrets));

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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-950">
      {showAlert && (
        <div className="bg-amber-950/90 border-b border-amber-500/50 text-amber-200 px-4 py-2 text-xs flex items-center justify-between z-50 shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-400 text-sm">⚠️ SECURITY WARNING:</span>
            <span>Client-side browser bundle contains loaded API credentials/tokens. Keys in browser memory can be inspected by browser extensions. For production, deploy via server REST mode.</span>
          </div>
          <button
            onClick={() => setShowAlert(false)}
            className="ml-4 px-2 py-0.5 bg-amber-800/60 hover:bg-amber-700/80 text-amber-100 rounded border border-amber-500/30 transition-colors font-mono cursor-pointer"
          >
            Dismiss [✕]
          </button>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <UIRenderer
          config={uiManifest.root as any}
          state={{
            bufferContent,
            activeSessionInfo,
            connectionStatus
          }}
          onEvent={handleUIEvent}
        />
      </div>
    </div>
  );
};
