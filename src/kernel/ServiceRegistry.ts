/**
 * JSAIOS - HoneyKernel ServiceRegistry
 * Central service lookup table & driver registration manager.
 */

import type { IKernelService, ServiceDescriptor } from './types';

export class ServiceRegistry {
  private services: Map<string, IKernelService> = new Map();

  /**
   * Register a micro-service driver
   */
  public register(service: IKernelService): void {
    if (this.services.has(service.id)) {
      console.warn(`[ServiceRegistry] Overwriting existing service registration for '${service.id}'`);
    }
    this.services.set(service.id, service);
  }

  /**
   * Unregister a service by ID
   */
  public unregister(serviceId: string): boolean {
    return this.services.delete(serviceId);
  }

  /**
   * Retrieve a registered service instance by ID
   */
  public get<T extends IKernelService>(serviceId: string): T | undefined {
    return this.services.get(serviceId) as T | undefined;
  }

  /**
   * Check if a service is registered
   */
  public has(serviceId: string): boolean {
    return this.services.has(serviceId);
  }

  /**
   * Get all registered service descriptors
   */
  public listDescriptors(): ServiceDescriptor[] {
    return Array.from(this.services.values()).map(s => s.descriptor);
  }

  /**
   * Get all registered service instances
   */
  public listServices(): IKernelService[] {
    return Array.from(this.services.values());
  }
}
