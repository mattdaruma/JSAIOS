/**
 * JSAIOS - Single-purpose helper: RollingAccumulator
 * Accumulates micro-findings from batch chunk processing into a structured rolling summary report.
 */

import type { BatchFinding } from './types';

export class RollingAccumulator {
  private findings: BatchFinding[] = [];

  public addFinding(finding: BatchFinding): void {
    this.findings.push(finding);
  }

  public getFindings(): BatchFinding[] {
    return [...this.findings];
  }

  public generateReport(jobName: string, totalFiles: number, totalChunks: number): string {
    const lines = [
      `=== JSAIOS Batch Processing Synthesis Report ===`,
      `Job Name        : ${jobName}`,
      `Target Files    : ${totalFiles}`,
      `Chunks Processed: ${totalChunks}`,
      `Findings Total  : ${this.findings.length}`,
      '-----------------------------------------------------------------------'
    ];

    if (this.findings.length === 0) {
      lines.push('No findings or matches identified across scanned target files.');
    } else {
      lines.push('Key Evidence & Micro-Summaries Identified:');
      this.findings.forEach((f, idx) => {
        lines.push(`  ${idx + 1}. [${f.filePath} : L${f.startLine}-L${f.endLine}] ${f.confidence ? `(Confidence: ${f.confidence})` : ''}`);
        lines.push(`     • ${f.summary}`);
      });
    }

    lines.push('=======================================================================');
    return lines.join('\n');
  }
}
