/**
 * JSAIOS - Single-purpose function: listLocalWorkflows
 * Scans config/workflows/ and returns available JSON workflow template names.
 */

import fs from 'fs';
import path from 'path';

export interface WorkflowFileInfo {
  id: string;
  filename: string;
  filePath: string;
}

export function listLocalWorkflows(): WorkflowFileInfo[] {
  const workflowsDir = path.resolve(process.cwd(), 'config', 'workflows');

  if (!fs.existsSync(workflowsDir)) {
    return [];
  }

  const files = fs.readdirSync(workflowsDir);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => ({
      id: path.basename(f, '.json'),
      filename: f,
      filePath: path.join(workflowsDir, f)
    }));
}
