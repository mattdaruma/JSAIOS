/**
 * JSAIOS - Generic Helper: loadBrowserUIConfig
 * Dynamically resolves declarative UI manifest JSON trees based on Vite mode or VITE_UI_CONFIG env variable.
 * Enables running any target UI manifest (e.g. terminal.browser.json vs help.browser.json) through the exact same bootloader.
 */

import terminalBrowserManifest from '../../../../config/terminal.browser.json';
import helpBrowserManifest from '../../../../config/help.browser.json';

export function loadBrowserUIConfig(configKey?: string): any {
  const targetMode = configKey || import.meta.env.VITE_UI_CONFIG || import.meta.env.MODE;

  if (targetMode === 'help' || targetMode?.includes('help')) {
    return helpBrowserManifest.root || helpBrowserManifest;
  }

  return terminalBrowserManifest.root;
}
