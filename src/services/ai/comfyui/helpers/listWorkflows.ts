/**
 * JSAIOS - Single-purpose helper: fetchComfyWorkflows
 * Lists saved workflow files on the ComfyUI server.
 */

export interface WorkflowFileInfo {
  id: string;
  filename: string;
  subfolder?: string;
  type?: string;
}

export async function fetchComfyWorkflows(endpoint: string): Promise<WorkflowFileInfo[]> {
  const candidateEndpoints = [
    `${endpoint}/userdata?dir=workflows`,
    `${endpoint}/userdata/workflows`
  ];

  for (const url of candidateEndpoints) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data.map((item: any) => {
          const rawName = typeof item === 'string' ? item : item.filename || item.name || item.id || '';
          const cleanName = rawName.replace(/\.json$/i, '').trim();
          return {
            id: cleanName,
            filename: cleanName
          };
        });
      }
    } catch {
      // Continue to next candidate URL
    }
  }

  return [];
}
