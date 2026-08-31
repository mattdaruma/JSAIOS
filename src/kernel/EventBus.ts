/**
 * JSAIOS - HoneyKernel System IPC EventBus
 * Platform-agnostic pub/sub event bus for asynchronous service & engine communication.
 */

import type { SystemIPCEvent, EventListenerCallback } from './types';

export class EventBus {
  private listeners: Map<string, Set<EventListenerCallback>> = new Map();

  /**
   * Subscribe to a system IPC channel
   */
  public subscribe<T = any>(channel: string, callback: EventListenerCallback<T>): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const channelListeners = this.listeners.get(channel);
      if (channelListeners) {
        channelListeners.delete(callback);
        if (channelListeners.size === 0) {
          this.listeners.delete(channel);
        }
      }
    };
  }

  /**
   * Publish an IPC event to a channel
   */
  public publish<T = any>(channel: string, sender: string, payload: T): SystemIPCEvent<T> {
    const event: SystemIPCEvent<T> = {
      id: `ipc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      channel,
      timestamp: Date.now(),
      sender,
      payload
    };

    const channelListeners = this.listeners.get(channel);
    if (channelListeners) {
      channelListeners.forEach(callback => {
        try {
          callback(event);
        } catch (err) {
          console.error(`[EventBus] Error in listener on channel '${channel}':`, err);
        }
      });
    }

    return event;
  }

  /**
   * Clear all subscribers
   */
  public clear(): void {
    this.listeners.clear();
  }
}

export const globalEventBus = new EventBus();
