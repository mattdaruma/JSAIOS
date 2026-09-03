/**
 * JSAIOS - Browser Shell Web App Bootloader
 * Entry point for Vite/React web browser app rendering BrowserApp inside DOM root.
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserApp } from './components/BrowserApp';

export const MainBrowserApp: React.FC = () => {
  const [endpoint] = useState<string>(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('endpoint') || 'http://127.0.0.1:3001';
  });

  return <BrowserApp endpoint={endpoint} />;
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<MainBrowserApp />);
}
