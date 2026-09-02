/**
 * JSAIOS - Single-purpose helper: playJingle CLI Handler
 * Pure fun/goof CLI command playing the betterthanyou.wav jingle.
 * Easily toggled or commented out.
 */

import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export function handlePlayJingle(): string {
  const wavPath = path.resolve(process.cwd(), 'src', 'betterthanyou.wav');

  if (!fs.existsSync(wavPath)) {
    return `Jingle file not found at '${wavPath}'.`;
  }

  const platform = process.platform;
  let command = '';

  if (platform === 'win32') {
    command = `powershell -c "(New-Object Media.SoundPlayer '${wavPath.replace(/'/g, "''")}').PlaySync()"`;
  } else if (platform === 'darwin') {
    command = `afplay "${wavPath}"`;
  } else {
    command = `aplay "${wavPath}" || paplay "${wavPath}"`;
  }

  exec(command);

  return '🎶 Playing JSAIOS Jingle... "Better than you!" 🎶';
}
