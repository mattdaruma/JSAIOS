/**
 * JSAIOS - Single-purpose helper: fetchComfyNodeInfo
 * Queries ComfyUI /object_info catalog to fetch definitions of node classes.
 */

export interface ComfyNodeSchema {
  name: string;
  category: string;
  description?: string;
  inputsRequired: Record<string, any>;
  inputsOptional?: Record<string, any>;
  outputTypes: string[];
}

export async function fetchComfyNodeInfo(endpoint: string, targetNodeName?: string): Promise<ComfyNodeSchema[]> {
  try {
    const url = targetNodeName ? `${endpoint}/object_info/${targetNodeName}` : `${endpoint}/object_info`;
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    const result: ComfyNodeSchema[] = [];

    const keys = targetNodeName ? [targetNodeName] : Object.keys(data);
    for (const key of keys) {
      const node = data[key];
      if (node) {
        result.push({
          name: key,
          category: node.category || 'uncategorized',
          description: node.description || '',
          inputsRequired: node.input?.required || {},
          inputsOptional: node.input?.optional,
          outputTypes: node.output || []
        });
      }
    }

    return result;
  } catch {
    return [];
  }
}

export const getComfyUINodeInfo = fetchComfyNodeInfo;
