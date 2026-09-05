import { describe, it, expect } from 'vitest';
import { tokenizeCommandLine } from '../../src/adapters/interpreter/helpers/tokenizeCommandLine';

describe('tokenizeCommandLine Helper', () => {
  it('should split unquoted whitespace-separated tokens', () => {
    const tokens = tokenizeCommandLine('context pack list');
    expect(tokens).toEqual(['context', 'pack', 'list']);
  });

  it('should preserve double-quoted arguments as single tokens with spaces', () => {
    const tokens = tokenizeCommandLine('context pack create first_pack "First Pack" --merge multi');
    expect(tokens).toEqual([
      'context',
      'pack',
      'create',
      'first_pack',
      'First Pack',
      '--merge',
      'multi'
    ]);
  });

  it('should preserve single-quoted arguments as single tokens with spaces', () => {
    const tokens = tokenizeCommandLine("chat session create 'My Heavy Work Session' --model ollama:llama3");
    expect(tokens).toEqual([
      'chat',
      'session',
      'create',
      'My Heavy Work Session',
      '--model',
      'ollama:llama3'
    ]);
  });

  it('should handle escaped characters within quotes', () => {
    const tokens = tokenizeCommandLine('context prompt create p1 "Line 1\\nLine 2"');
    expect(tokens).toEqual(['context', 'prompt', 'create', 'p1', 'Line 1\nLine 2']);
  });

  it('should gracefully handle empty and unclosed quote strings', () => {
    expect(tokenizeCommandLine('')).toEqual([]);
    expect(tokenizeCommandLine('   ')).toEqual([]);
    expect(tokenizeCommandLine('context pack create first_pack "Unclosed Pack')).toEqual([
      'context',
      'pack',
      'create',
      'first_pack',
      'Unclosed Pack'
    ]);
  });
});
