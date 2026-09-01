/**
 * JSAIOS - Browser Web Bootloader (Mode A - REST Server Mode)
 * Mounts unified BrowserApp with BrowserClientAdapter.
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserApp } from '../shell/browser/components/BrowserApp';
import { BrowserClientAdapter } from '../shell/browser/BrowserClientAdapter';

export const MainBrowserApp: React.FC = () => {
  const [adapter] = useState(() => new BrowserClientAdapter());
  return <BrowserApp adapter={adapter} />;
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<MainBrowserApp />);
}
