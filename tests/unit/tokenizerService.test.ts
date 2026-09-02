import { describe, it, expect } from 'vitest';
import { HeuristicTokenizerService } from '../../src/services/tokenizer/HeuristicTokenizerService';
import { ContextEngine } from '../../src/engines/context/ContextEngine';

describe('JSAIOS Tokenizer Service Driver Architecture', () => {
  it('should calculate estimated tokens correctly in HeuristicTokenizerService', () => {
    const tokenizer = new HeuristicTokenizerService();
    expect(tokenizer.countTokens('')).toBe(0);
    expect(tokenizer.countTokens('hello world')).toBe(3); // 11 chars / 4 = 2.75 -> 3 tokens
    expect(tokenizer.countTokens('a'.repeat(400))).toBe(100);
  });

  it('should accept custom ITokenizerService in ContextEngine constructor', () => {
    const customTokenizer: HeuristicTokenizerService = new HeuristicTokenizerService();
    const engine = new ContextEngine(undefined, undefined, customTokenizer);

    engine.addContextItem({
      id: 'test-1',
      type: 'text-block',
      content: 'Sample text prompt for token estimation testing.',
      priority: 10
    });

    const assembled = engine.assembleContext({ maxTokenBudget: 1000 });
    expect(assembled.estimatedTokens).toBeGreaterThan(0);
  });
});
