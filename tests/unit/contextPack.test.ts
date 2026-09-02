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

  it('should create standalone prompt templates and reference them in a ContextPack', () => {
    // 1. Register standalone prompt template
    engine.registerTemplate({
      id: 'base-sys',
      name: 'Base System Directive',
      template: 'You are a {{role}} developer working in {{language}}.'
    });

    // 2. Create Context Pack referencing promptId
    const pack = engine.createPack('dev-pack', 'Developer Pack', 'single-system-prompt');
    expect(pack.id).toBe('dev-pack');

    const added = engine.addPromptToPack('dev-pack', {
      id: 'dev-pack-item-1',
      promptId: 'base-sys',
      priority: 10
    });
    expect(added).toBe(true);

    const assembly = engine.assembleContext({
      packId: 'dev-pack',
      customFields: { role: 'senior', language: 'TypeScript' }
    });

    expect(assembly.systemPrompt).toContain('You are a senior developer working in TypeScript.');
  });

  it('should evaluate custom field conditions when assembling context packs', () => {
    // Register templates
    engine.registerTemplate({ id: 'base-prompt', name: 'Base', template: 'Base System Directive.' });
    engine.registerTemplate({ id: 'ts-prompt', name: 'TS Guide', template: 'Enforce strict TypeScript types.' });
    engine.registerTemplate({ id: 'py-prompt', name: 'Py Guide', template: 'Follow PEP8 Python conventions.' });

    engine.createPack('conditional-pack', 'Conditional Pack', 'single-system-prompt');

    // Always active
    engine.addPromptToPack('conditional-pack', {
      id: 'item-1',
      promptId: 'base-prompt',
      priority: 10
    });

    // Active only when language == typescript
    engine.addPromptToPack('conditional-pack', {
      id: 'item-2',
      promptId: 'ts-prompt',
      priority: 5,
      condition: {
        field: 'language',
        operator: 'equals',
        value: 'typescript'
      }
    });

    // Active only when language == python
    engine.addPromptToPack('conditional-pack', {
      id: 'item-3',
      promptId: 'py-prompt',
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
    engine.registerTemplate({ id: 'dir-1-tmpl', name: 'Directive 1', template: 'Directive Item 1' });
    engine.createPack('multi-pack', 'Multi Directives Pack', 'multi-directives');
    engine.addPromptToPack('multi-pack', {
      id: 'item-multi-1',
      promptId: 'dir-1-tmpl',
      priority: 10
    });

    const assembly = engine.assembleContext({ packId: 'multi-pack' });
    expect(assembly.contextItems.length).toBe(1);
    expect(assembly.contextItems[0].content).toBe('Directive Item 1');
  });
});
