/**
 * JSAIOS - Pure System Terminal CLI Shell
 * Listens to process.stdin and outputs to process.stdout.
 * Gracefully intercepts SIGINT (CTRL+C) and SIGTERM to release service resources before exiting.
 */

import readline from 'readline';
import type { HoneyKernel } from '../../kernel/HoneyKernel';
import { TerminalInterpreter } from './TerminalInterpreter';
import { ANSI, formatPrompt, formatStatusOutput } from './helpers/cliColors';

export function startCLITerminal(kernel: HoneyKernel, customPrompt?: string): void {
  const interpreter = new TerminalInterpreter(kernel);
  const rawPromptStr = customPrompt || 'jsaios@honeykernel:~$ ';
  const coloredPrompt = formatPrompt(rawPromptStr);

  console.log(`\n${ANSI.brightCyan}=======================================================================${ANSI.reset}`);
  console.log(` ${ANSI.brightYellow}${ANSI.bold}JSAIOS${ANSI.reset} - ${ANSI.brightCyan}JavaScript AI Operating System v1.0.0 (HoneyKernel Core)${ANSI.reset}`);
  console.log(` ${ANSI.dim}Pure System Terminal Active. Orchestrated by Declarative JSON Manifest.${ANSI.reset}`);
  console.log(` ${ANSI.dim}Press CTRL+C or type "exit" to gracefully shut down and free resources.${ANSI.reset}`);
  console.log(`${ANSI.brightCyan}=======================================================================${ANSI.reset}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: coloredPrompt
  });

  let isShuttingDown = false;

  const handleGracefulExit = async (signalName: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${ANSI.brightRed}[CLI Shell] Intercepted signal '${signalName}'. Triggering graceful shutdown...${ANSI.reset}`);
    await kernel.shutdown();
    rl.close();
    process.exit(0);
  };

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
        let hasStreamed = false;
        const output = await interpreter.execute(input, (chunk) => {
          hasStreamed = true;
          process.stdout.write(chunk);
        });

        if (output === '__CLEAR__') {
          console.clear();
        } else if (hasStreamed) {
          console.log();
        } else if (output) {
          console.log(formatStatusOutput(output));
        }
      } catch (err: any) {
        console.error(`${ANSI.brightRed}[System Shell Error]: ${err.message || err}${ANSI.reset}`);
      }
    }

    rl.prompt();
  });
}
