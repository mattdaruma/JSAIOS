import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { DaemonLogger } from '../../src/kernel/daemon/helpers/DaemonLogger';
import { JSAIOSDaemon } from '../../src/kernel/daemon/JSAIOSDaemon';

describe('JSAIOS Daemon Logging Architecture', () => {
  const testLogFile = path.join(process.cwd(), 'tests', 'tmpdir', 'test-daemon.log');

  beforeEach(() => {
    if (fs.existsSync(testLogFile)) {
      fs.rmSync(testLogFile, { force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testLogFile)) {
      fs.rmSync(testLogFile, { force: true });
    }
  });

  it('should write structured ISO timestamped logs to disk log file', () => {
    const logger = new DaemonLogger({
      level: 'info',
      logFile: testLogFile,
      logToConsole: false
    });

    logger.info('Daemon test log message');
    expect(fs.existsSync(testLogFile)).toBe(true);

    const logContent = fs.readFileSync(testLogFile, 'utf-8');
    expect(logContent).toContain('[INFO] [jsaiosd] Daemon test log message');
  });

  it('should respect log level priorities (skip debug logs when level is info)', () => {
    const logger = new DaemonLogger({
      level: 'info',
      logFile: testLogFile,
      logToConsole: false
    });

    logger.debug('Debug message that should be ignored');
    logger.warn('Warning message that should be logged');

    const logContent = fs.readFileSync(testLogFile, 'utf-8');
    expect(logContent).not.toContain('Debug message that should be ignored');
    expect(logContent).toContain('[WARN] [jsaiosd] Warning message that should be logged');
  });

  it('should initialize DaemonLogger inside JSAIOSDaemon instance', () => {
    const daemon = new JSAIOSDaemon();
    expect(daemon.getLogger()).toBeDefined();
  });
});
