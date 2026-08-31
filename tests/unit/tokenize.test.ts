import { describe, it, expect } from 'vitest';
import { tokenizeCommandLine } from '../../src/shell/terminal/tokenize';

describe('CLI Command Line Tokenizer', () => {
  it('should split simple space-separated arguments', () => {
    const tokens = tokenizeCommandLine('comfy options my_workflow');
    expect(tokens).toEqual(['comfy', 'options', 'my_workflow']);
  });

  it('should parse quoted arguments containing spaces as single tokens', () => {
    const tokens = tokenizeCommandLine('comfy options "Text to Image"');
    expect(tokens).toEqual(['comfy', 'options', 'Text to Image']);
  });

  it('should handle single quotes', () => {
    const tokens = tokenizeCommandLine("comfy options 'Text to Video WAN'");
    expect(tokens).toEqual(['comfy', 'options', 'Text to Video WAN']);
  });
});
