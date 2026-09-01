/**
 * JSAIOS - HoneyKernel Core Interfaces & Types
 */

export type ServiceStatus = 'uninitialized' | 'initializing' | 'running' | 'degraded' | 'failed' | 'stopped';

export interface CommandOption {
  flag: string;
  description: string;
}

export interface CommandDoc {
  command: string;
  description: string;
  options?: CommandOption[];
}

export interface ServiceDescriptor {
  id: string;
  name: string;
  version: string;
  status: ServiceStatus;
  capabilities: string[];
  commands?: CommandDoc[];
}

export interface IKernelService {
  readonly id: string;
  readonly descriptor: ServiceDescriptor;
  initialize(): Promise<void>;
  checkHealth(): Promise<boolean>;
  shutdown(): Promise<void>;
  executeCommand?(args: string[], onChunk?: (chunkText: string) => void): Promise<string>;
}

export interface KernelStatus {
  booted: boolean;
  bootTime?: number;
  uptimeSeconds: number;
  activeServices: ServiceDescriptor[];
}

export interface SystemIPCEvent<T = any> {
  id: string;
  channel: string;
  timestamp: number;
  sender: string;
  payload: T;
}

export type EventListenerCallback<T = any> = (event: SystemIPCEvent<T>) => void;

// === Declarative JSON Manifest Contracts ===

export interface ServiceConfig {
  id: string;
  type: string;
  driver: string;
  endpoint: string;
  enabled: boolean;
}

export interface EngineConfig {
  id: string;
  type: string;
  storageDir?: string;
  enabled: boolean;
  [key: string]: any;
}

export interface ServerConfig {
  id: string;
  port: number;
  host: string;
  routesFile?: string;
  enabled: boolean;
  cors?: {
    enabled: boolean;
    allowOrigin: string;
    allowMethods: string;
    allowHeaders: string;
  };
}

export interface ShellConfig {
  id: string;
  type: 'cli' | 'web' | 'browser' | 'server' | 'headless';
  prompt?: string;
  enabled: boolean;
}

export interface DaemonConfig {
  enabled: boolean;
  port: number;
  host: string;
  ipcGateway: boolean;
}

export interface JSAIOSManifest {
  system: {
    name: string;
    version: string;
    environment: string;
  };
  daemon?: DaemonConfig;
  servers?: ServerConfig[];
  engines?: EngineConfig[];
  services: ServiceConfig[];
  shells?: ShellConfig[];
}
