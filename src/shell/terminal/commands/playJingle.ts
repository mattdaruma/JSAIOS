/**
 * JSAIOS - Single-purpose helper: playJingle CLI Handler
 * Pure fun/goof CLI command playing the betterthanyou.wav jingle.
 * Plays an in-memory silent PCM WAV pulse beforehand to warm up the sound card DAC driver (D3 -> D0 state transition)
 * before triggering the actual jingle.
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
    // 44-byte silent PCM WAV stream in memory to warm up DAC, followed by jingle playback
    const silentWavBytes = '82,73,70,70,38,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,68,172,0,0,136,88,1,0,2,0,16,0,100,97,116,97,2,0,0,0,0,0';
    command = `powershell -c "$s = [System.IO.MemoryStream]::new([byte[]](${silentWavBytes})); $wp = New-Object Media.SoundPlayer $s; $wp.PlaySync(); $p = New-Object Media.SoundPlayer '${escaped}'; $p.Load(); $p.PlaySync()"`;
  } else if (platform === 'darwin') {
    command = `afplay "${wavPath}"`;
  } else {
    command = `aplay "${wavPath}" || paplay "${wavPath}"`;
  }

  exec(command);

  return '🎶 Playing JSAIOS Jingle... "Better than you!" 🎶';
}
