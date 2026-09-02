import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ContextEngine } from '../../src/engines/context/ContextEngine';
import { FileContextStorage } from '../../src/adapters/storage/FileContextStorage';
import { InMemoryContextStorage } from '../../src/adapters/storage/InMemoryContextStorage';
import type { SystemDirectiveTemplate, ContextItem, ConditionalRule } from '../../src/engines/context/helpers/types';

describe('JSAIOS Context Management Engine Architecture', () => {
  const testDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-context-templates');
  let engine: ContextEngine;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    const storage = new InMemoryContextStorage();
    engine = new ContextEngine(undefined, storage);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should register and interpolate system prompt templates with dynamic variables', () => {
    const tmpl: SystemDirectiveTemplate = {
      id: 'code-reviewer',
      name: 'Code Reviewer',
      template: 'You are an expert {{language}} code reviewer for project {{project_name}}.',
      defaultVariables: { language: 'TypeScript', project_name: 'JSAIOS' }
    };

    engine.registerTemplate(tmpl);

    const assembled = engine.assembleContext({
      templateId: 'code-reviewer',
      variables: { language: 'Rust' }
    });

    expect(assembled.systemPrompt).toBe('You are an expert Rust code reviewer for project JSAIOS.');
  });

  it('should evaluate conditional rules and inject matching context items', () => {
    const rule: ConditionalRule = {
      id: 'copilot-formatting-rule',
      condition: { providerId: 'copilot' },
      injectedItems: [
        {
          id: 'copilot-rule-1',
          type: 'system-directive',
          content: 'Output concise code blocks without preamble.',
          priority: 10
        }
      ]
    };

    engine.registerConditionalRule(rule);

    const matchCopilot = engine.assembleContext({
      evaluationState: { providerId: 'copilot' }
    });
    expect(matchCopilot.contextItems.map((i) => i.id)).toContain('copilot-rule-1');

    const matchOllama = engine.assembleContext({
      evaluationState: { providerId: 'ollama' }
    });
    expect(matchOllama.contextItems.map((i) => i.id)).not.toContain('copilot-rule-1');
  });

  it('should manage multimodal media items as first-class context objects', () => {
    const item: ContextItem = {
      id: 'media-item-1',
      type: 'media-item',
      content: 'Attached screenshot for visual inspection',
      priority: 5,
      media: {
        id: 'img-1',
        mimeType: 'image/png',
        dataBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        sourceService: 'comfyui'
      }
    };

    engine.addContextItem(item);
    const assembled = engine.assembleContext({});

    expect(assembled.mediaItems.length).toBe(1);
    expect(assembled.mediaItems[0].mimeType).toBe('image/png');
    expect(assembled.mediaItems[0].sourceService).toBe('comfyui');
  });

  it('should prune context items based on token budget limits', () => {
    engine.addContextItem({
      id: 'high-priority',
      type: 'text-block',
      content: 'Important security instruction text block.',
      priority: 100
    });

    engine.addContextItem({
      id: 'low-priority',
      type: 'text-block',
      content: 'Extra background context that can be pruned when tokens are tight.'.repeat(20),
      priority: 1
    });

    const assembledTight = engine.assembleContext({ maxTokenBudget: 25 });
    expect(assembledTight.contextItems.map((i) => i.id)).toContain('high-priority');
    expect(assembledTight.contextItems.map((i) => i.id)).not.toContain('low-priority');
  });

  it('should save and load templates using FileContextStorage', async () => {
    const fileStorage = new FileContextStorage(testDir);
    const fsEngine = new ContextEngine(undefined, fileStorage);

    const tmpl: SystemDirectiveTemplate = {
      id: 'stored-tmpl',
      name: 'Stored Template',
      template: 'Sticky system directive for {{target_role}}.'
    };

    await fsEngine.saveTemplateToStorage(tmpl);
    expect(fs.existsSync(path.join(testDir, 'stored-tmpl.json'))).toBe(true);

    const newEngine = new ContextEngine(undefined, fileStorage);
    await newEngine.loadTemplatesFromStorage();
    expect(newEngine.getTemplate('stored-tmpl')).toBeDefined();
  });
});
