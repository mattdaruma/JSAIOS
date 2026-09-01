/**
 * JSAIOS - Generic Helper: loadBrowserUIConfig
 * Dynamically resolves declarative UI manifest JSON trees based on Vite mode or VITE_UI_CONFIG env variable.
 * Enables running any target UI manifest (e.g. jsaios.ui.json vs help.config.json) through the exact same bootloader.
 */

import uiManifest from '../../../../config/jsaios.ui.json';
import helpManifest from '../../../../config/help.config.json';

export function loadBrowserUIConfig(configKey?: string): any {
  const targetMode = configKey || import.meta.env.VITE_UI_CONFIG || import.meta.env.MODE;

  if (targetMode === 'help' || targetMode?.includes('help')) {
    return helpManifest.root || helpManifest;
  }

  return uiManifest.root;
}
