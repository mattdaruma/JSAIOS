/**
 * JSAIOS - Single-purpose helper: SemanticChunker
 * Slices file content into line-aware chunks with sliding window overlap percentage to preserve split logic.
 */

import type { BatchChunk } from './types';

export function chunkFileContent(
  filePath: string,
  content: string,
  maxChunkChars: number = 4000,
  overlapPercent: number = 15
): BatchChunk[] {
  if (!content || content.length === 0) return [];

  const lines = content.split('\n');
  if (content.length <= maxChunkChars) {
    return [{
      filePath,
      chunkIndex: 0,
      totalChunks: 1,
      content,
      startLine: 1,
      endLine: lines.length
    }];
  }

  const chunks: BatchChunk[] = [];
  const overlapChars = Math.floor(maxChunkChars * (Math.min(50, Math.max(0, overlapPercent)) / 100));
  const stepChars = Math.max(500, maxChunkChars - overlapChars);

  let currentLineIndex = 0;

  while (currentLineIndex < lines.length) {
    const chunkLines: string[] = [];
    let currentChars = 0;
    const startLine = currentLineIndex + 1;

    let lineIdx = currentLineIndex;
    while (lineIdx < lines.length && currentChars < maxChunkChars) {
      const line = lines[lineIdx];
      chunkLines.push(line);
      currentChars += line.length + 1;
      lineIdx++;
    }

    const endLine = lineIdx;
    chunks.push({
      filePath,
      chunkIndex: chunks.length,
      totalChunks: 0, // Will be backfilled
      content: chunkLines.join('\n'),
      startLine,
      endLine
    });

    if (lineIdx >= lines.length) break;

    // Calculate line index step based on stepChars
    let stepCount = 0;
    let charAcc = 0;
    for (let i = currentLineIndex; i < lineIdx; i++) {
      charAcc += lines[i].length + 1;
      stepCount++;
      if (charAcc >= stepChars) break;
    }

    currentLineIndex += Math.max(1, stepCount);
  }

  return chunks.map(c => ({ ...c, totalChunks: chunks.length }));
}
