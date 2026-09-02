/**
 * JSAIOS - Single-purpose helper: DaemonLogger
 * Structured, level-aware logger writing ISO timestamped log entries to console and/or disk log file.
 */

import fs from 'fs';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface DaemonLoggingConfig {
  level?: LogLevel;
  logFile?: string;
  logToConsole?: boolean;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  silent: 5
};

export class DaemonLogger {
  private level: LogLevel;
  private logFilePath: string | null = null;
  private logToConsole: boolean;

  constructor(config: DaemonLoggingConfig = {}) {
    this.level = config.level || 'info';
    this.logToConsole = config.logToConsole !== false;

    if (config.logFile) {
      this.logFilePath = path.isAbsolute(config.logFile)
        ? config.logFile
        : path.resolve(process.cwd(), config.logFile);
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }

  public log(targetLevel: LogLevel, message: string): void {
    if (LEVEL_PRIORITY[targetLevel] < LEVEL_PRIORITY[this.level]) return;

    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${targetLevel.toUpperCase()}] [jsaiosd] ${message}`;

    if (this.logToConsole && this.level !== 'silent') {
      if (targetLevel === 'error') console.error(formatted);
      else if (targetLevel === 'warn') console.warn(formatted);
      else console.log(formatted);
    }

    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, formatted + '\n', 'utf-8');
      } catch {
        // Silently ignore disk write error
      }
    }
  }

  public debug(msg: string): void { this.log('debug', msg); }
  public info(msg: string): void { this.log('info', msg); }
  public warn(msg: string): void { this.log('warn', msg); }
  public error(msg: string): void { this.log('error', msg); }
}
