/**
 * JSAIOS - Standalone In-Browser Local Kernel Bootloader (Mode B - In-Browser Kernel)
 * Mounts unified BrowserApp with BrowserLocalAdapter.
 * Dynamically loads target UI manifest (jsaios.ui.json vs help.config.json) based on runtime config mode.
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserApp } from '../shell/browser/components/BrowserApp';
import { BrowserLocalAdapter } from '../shell/browser/adapters/BrowserLocalAdapter';
import { loadBrowserUIConfig } from '../shell/browser/helpers/loadUIConfig';

export const LocalBrowserApp: React.FC = () => {
  const [adapter] = useState(() => new BrowserLocalAdapter());
  const uiConfig = loadBrowserUIConfig();

  return (
    <BrowserApp
      adapter={adapter}
      initialBanner="=== JSAIOS Standalone System Terminal Shell [Mode B - In-Browser Kernel] ===\nHoneyKernel & ChatEngine booted directly in browser memory (LocalStorage persistence active).\nCore Commands: 'help' (command reference), 'status' (kernel info), 'services' (drivers), 'clear'.\nType 'help' to view full command reference.\n\n"
      defaultStatusLabel="ONLINE (Browser Memory)"
      hasBundledSecrets={false}
      uiConfig={uiConfig}
    />
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<LocalBrowserApp />);
}
