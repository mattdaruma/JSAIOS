import { describe, it, expect, beforeEach } from 'vitest';
import { HoneyKernel } from '../../src/kernel/HoneyKernel';
import { TerminalInterpreter } from '../../src/shell/terminal/TerminalInterpreter';

describe('JSAIOS Context Engine CLI Commands', () => {
  let kernel: HoneyKernel;
  let interpreter: TerminalInterpreter;

  beforeEach(() => {
    kernel = new HoneyKernel();
    interpreter = new TerminalInterpreter(kernel);
  });

  it('should list registered system directive templates via context list', async () => {
    const output = await interpreter.execute('context list');
    expect(output).toContain('Registered System Directive Templates');
    expect(output).toContain('code-reviewer');
  });

  it('should show template details via context show <id>', async () => {
    const output = await interpreter.execute('context show code-reviewer');
    expect(output).toContain('Template: code-reviewer');
    expect(output).toContain('You are an expert');
  });

  it('should perform dry-run context assembly via context assemble', async () => {
    const output = await interpreter.execute('context assemble --template code-reviewer --var language=Rust');
    expect(output).toContain('Context Assembly Dry-Run');
    expect(output).toContain('Rust');
  });
});
