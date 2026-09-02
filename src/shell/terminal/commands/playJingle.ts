/**
 * JSAIOS - Single-purpose helper: playJingle CLI Handler
 * Pure fun/goof CLI command playing the betterthanyou.wav jingle.
 * Plays a silent PCM WAV stream and sleeps for 500ms to allow sound card DAC hardware amplifier to fully warm up.
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
    // Silent PCM header, start background silent playback, sleep 500ms to warm hardware DAC, then play jingle
    const silentWavBytes = '82,73,70,70,38,0,0,0,87,65,86,69,102,109,116,32,16,0,0,0,1,0,1,0,68,172,0,0,136,88,1,0,2,0,16,0,100,97,116,97,2,0,0,0,0,0';
    command = `powershell -c "$s = [System.IO.MemoryStream]::new([byte[]](${silentWavBytes})); $wp = New-Object Media.SoundPlayer $s; $wp.Play(); [System.Threading.Thread]::Sleep(500); $p = New-Object Media.SoundPlayer '${escaped}'; $p.Load(); $p.PlaySync()"`;
  } else if (platform === 'darwin') {
    command = `afplay "${wavPath}"`;
  } else {
    command = `aplay "${wavPath}" || paplay "${wavPath}"`;
  }

  exec(command);

  return '🎶 Playing JSAIOS Jingle... "Better than you!" 🎶';
}
