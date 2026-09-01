/**
 * JSAIOS - Universal Browser Web Bootloader
 * Dynamically mounts BrowserApp with either BrowserClientAdapter (Mode A REST) or BrowserLocalAdapter (Mode B Local Kernel)
 * based on runtime Vite mode ('development' | 'standalone' | 'help').
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserApp } from '../shell/browser/components/BrowserApp';
import { BrowserClientAdapter } from '../shell/browser/BrowserClientAdapter';
import { BrowserLocalAdapter } from '../shell/browser/adapters/BrowserLocalAdapter';
import { loadBrowserUIConfig } from '../shell/browser/helpers/loadUIConfig';

export const MainBrowserApp: React.FC = () => {
  const mode = import.meta.env.MODE;
  const isStandaloneOrHelp = mode === 'standalone' || mode === 'help';

  const [adapter] = useState(() => (isStandaloneOrHelp ? new BrowserLocalAdapter() : new BrowserClientAdapter()));
  const uiConfig = loadBrowserUIConfig();

  return (
    <BrowserApp
      adapter={adapter}
      initialBanner={
        isStandaloneOrHelp
          ? "=== JSAIOS System Terminal Shell [Mode B - Standalone In-Browser Kernel] ===\nHoneyKernel & ChatEngine booted directly in browser memory (LocalStorage persistence active).\nCore Commands: 'help' (command reference), 'status' (kernel info), 'services' (drivers), 'clear'.\nType 'help' to view full command reference.\n\n"
          : undefined
      }
      defaultStatusLabel={isStandaloneOrHelp ? 'ONLINE (Browser Memory)' : 'ONLINE (Connected)'}
      hasBundledSecrets={!isStandaloneOrHelp}
      uiConfig={uiConfig}
    />
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<MainBrowserApp />);
}
