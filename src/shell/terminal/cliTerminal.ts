/**
 * JSAIOS - Pure System Terminal CLI Shell
 * Listens to process.stdin and outputs to process.stdout.
 * Gracefully intercepts SIGINT (CTRL+C) and SIGTERM to release service resources before exiting.
 */

import readline from 'readline';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import { CommandInterpreter } from '../../adapters/interpreter/CommandInterpreter';
import { getTerminalFormatter } from './helpers/getTerminalFormatter';

export function startCLITerminal(kernel: HoneyKernel, customPrompt?: string, manifestPath?: string): void {
  const interpreter = new CommandInterpreter(kernel, manifestPath);
  const manifest = interpreter.getManifest();
  const formatter = getTerminalFormatter(manifest.defaultEnvironment);
  const rawPromptStr = customPrompt || manifest.promptPrefix || 'jsaios@honeykernel:~$ ';
  const formattedPrompt = formatter.formatPrompt(rawPromptStr);

  console.log(`\n${formatter.formatHeader('=======================================================================')}`);
  console.log(` ${formatter.formatCLICommand('JSAIOS')} - JavaScript AI Operating System v1.0.0 (HoneyKernel Core)`);
  console.log(` Pure System Terminal Active. Orchestrated by Declarative JSON Manifest.`);
  console.log(` Core Commands: 'help' (command reference), 'status' (kernel info), 'services' (drivers), 'clear', 'exit'.`);
  console.log(` Type "help" to view full command reference or "exit" to shut down.`);
  console.log(`${formatter.formatHeader('=======================================================================\n')}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: formattedPrompt
  });

  let isShuttingDown = false;

  const handleGracefulExit = async (signalName: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${formatter.formatError(`[CLI Shell] Intercepted signal '${signalName}'. Triggering graceful shutdown...`)}`);
    await kernel.shutdown();
    rl.close();
    process.exit(0);
  };

  process.on('SIGINT', () => handleGracefulExit('SIGINT (CTRL+C)'));
  process.on('SIGTERM', () => handleHandleExit ? handleGracefulExit('SIGTERM') : handleGracefulExit('SIGTERM'));

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      await handleGracefulExit('exit command');
      return;
    }

    if (input) {
      try {
        let hasStreamed = false;
        const output = await interpreter.execute(input, (chunk) => {
          if (!hasStreamed) {
            hasStreamed = true;
            process.stdout.write('\n');
          }
          process.stdout.write(chunk);
        });

        if (output === '__CLEAR__') {
          console.clear();
        } else if (hasStreamed) {
          console.log();
        } else if (output) {
          console.log(formatter.formatStatusOutput(output));
        }
      } catch (err: any) {
        console.error(formatter.formatError(`[System Shell Error]: ${err.message || err}`));
      }
    }

    rl.prompt();
  });
}
