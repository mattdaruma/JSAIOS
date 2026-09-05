import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ContextEngine } from '../../src/engines/context/ContextEngine';
import { FileContextStorage } from '../../src/adapters/storage/FileContextStorage';
import { handleStructureCommands } from '../../src/adapters/terminal/structure/structureCommands';
import { ChatSession } from '../../src/engines/chat/helpers/ChatSession';
import { parseChatCLIArgs } from '../../src/engines/chat/helpers/chatOptions';

describe('Prompt & Response Structure Infrastructure', () => {
  const testDir = path.join(process.cwd(), 'tests', 'tmpdir', 'test-structures');
  let storage: FileContextStorage;
  let engine: ContextEngine;

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    storage = new FileContextStorage(testDir);
    engine = new ContextEngine(undefined, storage);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should create and list structures via terminal adapter', () => {
    const createOut = handleStructureCommands(
      ['create', 'json_eval', 'JSON Evaluator', '--schema', '{"type":"object"}'],
      engine
    );
    expect(createOut).toContain('json_eval');
    expect(createOut).toContain('Schema Configured: true');

    const listOut = handleStructureCommands(['list'], engine);
    expect(listOut).toContain('json_eval');
    expect(listOut).toContain('JSON Evaluator');
  });

  it('should show structure details correctly', () => {
    handleStructureCommands(
      ['create', 'code_schema', 'Code Schema', '--schema', '{"properties":{"code":{"type":"string"}}}'],
      engine
    );

    const showOut = handleStructureCommands(['show', 'code_schema'], engine);
    expect(showOut).toContain("Structure Reference 'code_schema'");
    expect(showOut).toContain('Code Schema');
    expect(showOut).toContain('properties');
  });

  it('should delete a structure asset', () => {
    engine.createStructure('temp_struct', 'Temp Structure');
    expect(engine.getStructure('temp_struct')).toBeDefined();

    const delOut = handleStructureCommands(['delete', 'temp_struct'], engine);
    expect(delOut).toContain("Structure 'temp_struct' deleted successfully.");
    expect(engine.getStructure('temp_struct')).toBeUndefined();
  });

  it('should support structure binding in ChatSession and CLI args', () => {
    const session = new ChatSession('s1', 'Session 1', 'ollama', 'llama3', undefined, {
      structureId: 'json_eval'
    });
    expect(session.structureId).toBe('json_eval');

    const parsed = parseChatCLIArgs(['--structure', 'code_schema']);
    expect(parsed.options.structureId).toBe('code_schema');

    session.updateOptions(parsed.options);
    expect(session.structureId).toBe('code_schema');
  });

  it('should assemble context with structure default variables and output schema', () => {
    engine.createStructure('api_struct', 'API Structure', { type: 'object' }, { lang: 'TypeScript' });
    const assembled = engine.assembleContext({
      structureId: 'api_struct'
    });

    expect(assembled.customFields?.lang).toBe('TypeScript');
    expect(assembled.outputSchema).toEqual({ type: 'object' });
  });
});
