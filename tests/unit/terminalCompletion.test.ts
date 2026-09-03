import { describe, it, expect, beforeEach } from 'vitest';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { CommandInterpreter } from '../../src/adapters/interpreter/CommandInterpreter';

describe('JSAIOS Terminal Shell Autocompletion & Command History', () => {
  let kernel: HoneyKernel;
  let interpreter: CommandInterpreter;

  beforeEach(() => {
    kernel = new HoneyKernel();
    interpreter = new CommandInterpreter(kernel);
  });

  it('should return top-level command completions when partial string is provided', () => {
    const [hits] = interpreter.getCompletions('he');
    expect(hits).toContain('help');
  });

  it('should return service and engine top-level command completions', () => {
    const [hits] = interpreter.getCompletions('co');
    expect(hits).toContain('context');
    expect(hits).toContain('comfy');
    expect(hits).toContain('comfyui');
  });

  it('should complete help sub-targets when "help " is typed', () => {
    const [hits] = interpreter.getCompletions('help o');
    expect(hits).toContain('help ollama');
  });

  it('should complete engine subcommands when engine command prefix is typed', () => {
    const [hits] = interpreter.getCompletions('chat n');
    expect(hits).toContain('chat new');
  });

  it('should return empty completions for unknown commands', () => {
    const [hits] = interpreter.getCompletions('unknowncmdxyz');
    expect(hits).toEqual([]);
  });
});
