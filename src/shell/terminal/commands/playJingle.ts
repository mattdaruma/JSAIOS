/**
 * JSAIOS - Single-purpose helper: playJingle CLI Handler
 * Pure fun/goof CLI command playing the betterthanyou.wav jingle.
 * Uses native winmm.dll PlaySound API on Windows to bypass .NET SoundPlayer latency and initial attack clipping.
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
    const escaped = wavPath.replace(/\\/g, '\\\\').replace(/'/g, "''");
    // Pre-load via .NET SoundPlayer and play to eliminate stream startup delay
    command = `powershell -c "$p = New-Object Media.SoundPlayer '${escaped}'; $p.Load(); $p.PlaySync()"`;
  } else if (platform === 'darwin') {
    command = `afplay "${wavPath}"`;
  } else {
    command = `aplay "${wavPath}" || paplay "${wavPath}"`;
  }

  exec(command);

  return '🎶 Playing JSAIOS Jingle... "Better than you!" 🎶';
}
