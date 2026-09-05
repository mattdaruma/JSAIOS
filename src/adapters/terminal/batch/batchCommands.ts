/**
 * JSAIOS - Single-purpose terminal handler: batchCommands
 * Handles 'batch list', 'batch show <id>', 'batch create <id> <name> <dir> [--pattern <regex> --ext <ts,js>]', 'batch run <id>', and 'batch report <id>'.
 */

import type { BatchEngine } from '../../../engines/batch/BatchEngine';

export function handleBatchCommands(args: string[], batchEngine: BatchEngine): string | Promise<string> {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'list': {
      const jobs = batchEngine.listJobs();
      if (jobs.length === 0) return 'No batch jobs registered. Create one using "batch create <id> <name> <dir>".';
      return [
        '=== Registered Batch Jobs ===',
        ...jobs.map((j) => `  • ${j.id.padEnd(20)} : ${j.name} [Target: ${j.targetDirectory}]`)
      ].join('\n');
    }

    case 'create': {
      const id = args[1];
      const name = args[2] || id;
      const dir = args[3] || './src';

      if (!id) return 'Usage: batch create <id> <name> <target> [--source <type>] [--pattern <regex>] [--ext <ts,js>]';

      let patternFilter: string | undefined;
      const patternIdx = args.indexOf('--pattern');
      if (patternIdx !== -1 && args[patternIdx + 1]) patternFilter = args[patternIdx + 1];

      let fileExtensions: string[] | undefined;
      const extIdx = args.indexOf('--ext');
      if (extIdx !== -1 && args[extIdx + 1]) fileExtensions = args[extIdx + 1].split(',').map(e => e.trim());

      let sourceType: string | undefined;
      const sourceIdx = args.indexOf('--source');
      if (sourceIdx !== -1 && args[sourceIdx + 1]) sourceType = args[sourceIdx + 1].trim();

      const job = batchEngine.createJob(
        id,
        name,
        dir,
        patternFilter,
        fileExtensions,
        'ollama',
        'llama3',
        sourceType
      );
      return [
        `=== Batch Job Created ===`,
        `Job ID     : ${job.id}`,
        `Name       : ${job.name}`,
        `Target     : ${job.targetDirectory}`,
        sourceType ? `Source Type: ${sourceType}` : 'Source Type: Auto-Detect',
        patternFilter ? `Pattern    : ${patternFilter}` : 'Pattern    : None (All files)'
      ].join('\n');
    }

    case 'run': {
      const id = args[1];
      if (!id) return 'Usage: batch run <job_id>';

      const job = batchEngine.getJob(id);
      if (!job) return `Batch job '${id}' not found. Use 'batch list' to view registered jobs.`;

      return (async () => {
        return await batchEngine.executeBatchJob(id);
      })();
    }

    case 'report': {
      const id = args[1];
      if (!id) return 'Usage: batch report <job_id>';

      return (async () => {
        const report = await batchEngine.getJobReport(id);
        if (!report) return `No synthesis report found for batch job '${id}'. Run it first using 'batch run ${id}'.`;
        return report;
      })();
    }

    default:
      return [
        'Batch File Processing Commands:',
        '  • batch list                                   - List registered batch jobs',
        '  • batch create <id> <name> <dir>               - Create a new batch job definition',
        '  • batch run <id>                               - Execute Map-Reduce batch scan pipeline',
        '  • batch report <id>                            - View generated synthesis report'
      ].join('\n');
  }
}
