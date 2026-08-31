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
  try {
    const res = await fetch(`${endpoint}/userdata?dir=workflows`);
    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        id: typeof item === 'string' ? item : item.filename || item.name,
        filename: typeof item === 'string' ? item : item.filename || item.name
      }));
    }
    return [];
  } catch {
    return [];
  }
}
