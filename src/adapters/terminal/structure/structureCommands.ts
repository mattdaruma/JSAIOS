/**
 * JSAIOS - Single-purpose terminal handler: structureCommands
 * Handles 'structure list', 'structure show <id>', 'structure create <id> <name> [--schema <json_str>]', and 'structure delete <id>'.
 */

import type { ContextEngine } from '../../../engines/context/ContextEngine';

export function handleStructureCommands(args: string[], contextEngine: ContextEngine): string {
  const action = args[0]?.toLowerCase();

  switch (action) {
    case 'list': {
      const structures = contextEngine.listStructures();
      if (structures.length === 0) {
        return 'No structures registered. Create one using "structure create <id> <name> [--schema <json_str>]".';
      }
      return [
        '=== Registered Prompt & Response Structures ===',
        ...structures.map((s) => `  • ${s.id.padEnd(20)} : ${s.name} ${s.outputSchema ? '[JSON Schema Active]' : '[Vars Only]'}`)
      ].join('\n');
    }

    case 'show': {
      const id = args[1];
      if (!id) return 'Usage: structure show <structure_id>';

      const struct = contextEngine.getStructure(id);
      if (!struct) return `Structure '${id}' not found. Use 'structure list' to view registered structures.`;

      return [
        `=== Structure Reference '${struct.id}' ===`,
        `Name: ${struct.name}`,
        `Description: ${struct.description || 'None'}`,
        `Default Variables: ${JSON.stringify(struct.defaultVariables || {})}`,
        `Output Schema: ${struct.outputSchema ? JSON.stringify(struct.outputSchema, null, 2) : 'None'}`
      ].join('\n');
    }

    case 'create': {
      const id = args[1];
      const name = args[2] || id;

      if (!id) return 'Usage: structure create <id> <name> [--schema <json_str>]';

      let outputSchema: Record<string, any> | undefined;
      const schemaIdx = args.indexOf('--schema');
      if (schemaIdx !== -1 && args[schemaIdx + 1]) {
        try {
          outputSchema = JSON.parse(args[schemaIdx + 1]);
        } catch {
          return 'Error: Invalid JSON string provided for --schema.';
        }
      }

      const struct = contextEngine.createStructure(id, name, outputSchema);

      return [
        `=== Structure Created ===`,
        `Structure ID: ${struct.id}`,
        `Name: ${struct.name}`,
        `Schema Configured: ${Boolean(struct.outputSchema)}`
      ].join('\n');
    }

    case 'delete': {
      const id = args[1];
      if (!id) return 'Usage: structure delete <structure_id>';

      const deleted = contextEngine.deleteStructure(id);
      if (!deleted) return `Structure '${id}' not found or could not be deleted.`;
      return `Structure '${id}' deleted successfully.`;
    }

    case 'help':
    default:
      return [
        '=== Structure Engine Reference & Formatting Guide ===',
        'Commands:',
        '  • structure list                               - List registered prompt/response structures',
        '  • structure show <id>                          - Inspect structure schema and variables',
        '  • structure create <id> <name> [--schema <json>]- Create a new structure asset',
        '  • structure delete <id>                        - Delete a structure asset',
        '',
        'JSON Schema Formatting (--schema):',
        '  Pass valid JSON strings wrapped in quotes. Enclose property names in escaped or double quotes.',
        '  Example 1 (Single quote wrapper):',
        '    structure create code_eval "Code Evaluator" --schema \'{"type":"object","properties":{"summary":{"type":"string"}},"required":["summary"]}\'',
        '  Example 2 (Escaped quote wrapper):',
        '    structure create score_out "Score Output" --schema "{\\"type\\":\\"object\\",\\"properties\\":{\\"score\\":{\\"type\\":\\"number\\"}}}"',
        '',
        'Session Binding:',
        '  chat edit <session_id> --structure <structure_id>'
      ].join('\n');
  }
}
