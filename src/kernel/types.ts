/**
 * JSAIOS - HoneyKernel Core Interfaces & Types
 */

export type ServiceStatus = 'uninitialized' | 'initializing' | 'running' | 'degraded' | 'failed' | 'stopped';

export interface CLICommandOption {
  flag: string;
  description: string;
}

export interface CLICommandDoc {
  command: string;
  description: string;
  options?: CLICommandOption[];
}

export interface ServiceDescriptor {
  id: string;
  name: string;
  version: string;
  status: ServiceStatus;
  capabilities: string[];
  cliCommands?: CLICommandDoc[];
}

export interface IKernelService {
  readonly id: string;
  readonly descriptor: ServiceDescriptor;
  initialize(): Promise<void>;
  checkHealth(): Promise<boolean>;
  shutdown(): Promise<void>;
  executeCLICommand?(args: string[], onChunk?: (chunkText: string) => void): Promise<string>;
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

export interface ShellConfig {
  type: 'cli' | 'web' | 'headless';
  prompt?: string;
}

export interface JSAIOSManifest {
  system: {
    name: string;
    version: string;
    environment: string;
  };
  services: ServiceConfig[];
  shell: ShellConfig;
}
