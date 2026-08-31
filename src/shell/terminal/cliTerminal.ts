/**
 * JSAIOS - Pure System Terminal CLI Shell
 * Listens to process.stdin and outputs to process.stdout.
 * Gracefully intercepts SIGINT (CTRL+C) and SIGTERM to release service resources before exiting.
 */

import readline from 'readline';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import { TerminalInterpreter } from './TerminalInterpreter';

export function startCLITerminal(kernel: HoneyKernel, customPrompt?: string): void {
  const interpreter = new TerminalInterpreter(kernel);
  const promptStr = customPrompt || 'jsaios@honeykernel:~$ ';

  console.log('\n=======================================================================');
  console.log(' JSAIOS - JavaScript AI Operating System v1.0.0 (HoneyKernel Core)');
  console.log(' Pure System Terminal Active. Orchestrated by Declarative JSON Manifest.');
  console.log(' Press CTRL+C or type "exit" to gracefully shut down and free resources.');
  console.log('=======================================================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: promptStr
  });

  let isShuttingDown = false;

  const handleGracefulExit = async (signalName: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[CLI Shell] Intercepted signal '${signalName}'. Triggering graceful shutdown...`);
    await kernel.shutdown();
    rl.close();
    process.exit(0);
  };

  // Intercept CTRL+C (SIGINT) and termination signals (SIGTERM)
  process.on('SIGINT', () => handleGracefulExit('SIGINT (CTRL+C)'));
  process.on('SIGTERM', () => handleGracefulExit('SIGTERM'));

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      await handleGracefulExit('exit command');
      return;
    }

    if (input) {
      try {
        const output = await interpreter.execute(input, (chunk) => {
          process.stdout.write(chunk);
        });

        if (output === '__CLEAR__') {
          console.clear();
        } else if (output) {
          console.log(output);
        }
      } catch (err: any) {
        console.error(`[System Shell Error]: ${err.message || err}`);
      }
    }

    rl.prompt();
  });
}
