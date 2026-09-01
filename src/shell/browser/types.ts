/**
 * JSAIOS - Browser Client Adapter Interface Contract
 */

export interface IClientAdapter {
  fetchStatus(): Promise<{ booted: boolean; activeSession?: { name: string; providerId: string; model: string } }>;
  executeCommandStream(inputCmd: string, onChunk: (chunkText: string) => void): Promise<string>;
}
