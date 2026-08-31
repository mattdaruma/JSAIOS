/**
 * JSAIOS - HoneyKernel Manager
 * Ring 0 Headless Microkernel Core.
 * Manages system boot lifecycle, service registration, graceful shutdown, and IPC routing.
 * Zero UI code, zero DOM dependencies.
 */

import { EventBus, globalEventBus } from './EventBus';
import { ServiceRegistry } from './ServiceRegistry';
import type { IKernelService, KernelStatus } from './types';

export class HoneyKernel {
  private booted: boolean = false;
  private bootTime?: number;
  private registry: ServiceRegistry;
  private eventBus: EventBus;

  constructor(registry?: ServiceRegistry, eventBus?: EventBus) {
    this.registry = registry || new ServiceRegistry();
    this.eventBus = eventBus || globalEventBus;
  }

  /**
   * Boot the HoneyKernel core
   */
  public async boot(): Promise<void> {
    if (this.booted) {
      console.warn('[HoneyKernel] System is already booted');
      return;
    }

    console.log('[HoneyKernel] Booting JSAIOS HoneyKernel Core...');
    this.bootTime = Date.now();
    this.booted = true;

    // Initialize all registered services
    const services = this.registry.listServices();
    for (const service of services) {
      try {
        console.log(`[HoneyKernel] Initializing service '${service.id}'...`);
        await service.initialize();
      } catch (err) {
        console.error(`[HoneyKernel] Failed to initialize service '${service.id}':`, err);
      }
    }

    this.eventBus.publish('system:boot', 'HoneyKernel', {
      timestamp: this.bootTime,
      servicesCount: services.length
    });

    console.log(`[HoneyKernel] JSAIOS HoneyKernel booted successfully with ${services.length} active service(s)`);
  }

  /**
   * Gracefully shut down HoneyKernel and all registered micro-services
   */
  public async shutdown(): Promise<void> {
    if (!this.booted) return;

    console.log('\n[HoneyKernel] Initiating graceful system shutdown...');
    const services = this.registry.listServices();

    for (const service of services) {
      try {
        console.log(`[HoneyKernel] Shutting down service '${service.id}'...`);
        if (typeof service.shutdown === 'function') {
          await service.shutdown();
        }
      } catch (err) {
        console.error(`[HoneyKernel] Error during shutdown of service '${service.id}':`, err);
      }
    }

    this.eventBus.publish('system:shutdown', 'HoneyKernel', {
      timestamp: Date.now()
    });

    this.booted = false;
    console.log('[HoneyKernel] All services shut down gracefully. Resources released.');
  }

  /**
   * Register a micro-service driver with HoneyKernel
   */
  public registerService(service: IKernelService): void {
    this.registry.register(service);
    if (this.booted) {
      service.initialize().catch(err => {
        console.error(`[HoneyKernel] Error initializing dynamically registered service '${service.id}':`, err);
      });
    }
  }

  /**
   * Get a registered micro-service by ID
   */
  public getService<T extends IKernelService>(serviceId: string): T | undefined {
    return this.registry.get<T>(serviceId);
  }

  /**
   * Get overall kernel status and metrics
   */
  public getStatus(): KernelStatus {
    const uptimeSeconds = this.bootTime ? Math.floor((Date.now() - this.bootTime) / 1000) : 0;
    return {
      booted: this.booted,
      bootTime: this.bootTime,
      uptimeSeconds,
      activeServices: this.registry.listDescriptors()
    };
  }

  /**
   * Access kernel IPC EventBus
   */
  public get EventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Access kernel ServiceRegistry
   */
  public get Registry(): ServiceRegistry {
    return this.registry;
  }
}

export const kernel = new HoneyKernel();
