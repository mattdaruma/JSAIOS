import { describe, it, expect, beforeEach } from 'vitest';
import { ContextEngine } from '../../src/engines/context/ContextEngine';
import { InMemoryContextStorage } from '../../src/adapters/storage/InMemoryContextStorage';

describe('JSAIOS Context Pack & Universal Custom Fields Architecture', () => {
  let storage: InMemoryContextStorage;
  let engine: ContextEngine;

  beforeEach(() => {
    storage = new InMemoryContextStorage();
    engine = new ContextEngine(undefined, storage);
  });

  it('should create a ContextPack and register prompt directives', () => {
    const pack = engine.createPack('dev-pack', 'Developer Pack', 'single-system-prompt');
    expect(pack.id).toBe('dev-pack');
    expect(pack.mergeStrategy).toBe('single-system-prompt');

    const added = engine.addPromptToPack('dev-pack', {
      id: 'base-sys',
      template: 'You are a {{role}} developer working in {{language}}.',
      priority: 10
    });
    expect(added).toBe(true);

    const packRef = engine.getPack('dev-pack');
    expect(packRef?.items.length).toBe(1);
  });

  it('should evaluate custom field conditions when assembling context', () => {
    engine.createPack('conditional-pack', 'Conditional Pack', 'single-system-prompt');

    // Always active
    engine.addPromptToPack('conditional-pack', {
      id: 'base-prompt',
      template: 'Base System Directive.',
      priority: 10
    });

    // Active only when language == typescript
    engine.addPromptToPack('conditional-pack', {
      id: 'ts-prompt',
      template: 'Enforce strict TypeScript types.',
      priority: 5,
      condition: {
        field: 'language',
        operator: 'equals',
        value: 'typescript'
      }
    });

    // Active only when language == python
    engine.addPromptToPack('conditional-pack', {
      id: 'py-prompt',
      template: 'Follow PEP8 Python conventions.',
      priority: 5,
      condition: {
        field: 'language',
        operator: 'equals',
        value: 'python'
      }
    });

    // 1. Assemble with language = typescript
    const tsAssembly = engine.assembleContext({
      packId: 'conditional-pack',
      customFields: { language: 'typescript' }
    });
    expect(tsAssembly.systemPrompt).toContain('Base System Directive.');
    expect(tsAssembly.systemPrompt).toContain('Enforce strict TypeScript types.');
    expect(tsAssembly.systemPrompt).not.toContain('Follow PEP8 Python conventions.');

    // 2. Assemble with language = python
    const pyAssembly = engine.assembleContext({
      packId: 'conditional-pack',
      customFields: { language: 'python' }
    });
    expect(pyAssembly.systemPrompt).toContain('Base System Directive.');
    expect(pyAssembly.systemPrompt).toContain('Follow PEP8 Python conventions.');
    expect(pyAssembly.systemPrompt).not.toContain('Enforce strict TypeScript types.');
  });

  it('should support multi-directives merge strategy', () => {
    engine.createPack('multi-pack', 'Multi Directives Pack', 'multi-directives');
    engine.addPromptToPack('multi-pack', {
      id: 'dir-1',
      template: 'Directive Item 1',
      priority: 10
    });

    const assembly = engine.assembleContext({ packId: 'multi-pack' });
    expect(assembly.contextItems.length).toBe(1);
    expect(assembly.contextItems[0].content).toBe('Directive Item 1');
  });
});
