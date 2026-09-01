/**
 * JSAIOS - Generic CodeEditor Primitive
 * CodeMirror 6 text/code editor supporting JSON, Markdown, and TypeScript editing.
 */

import React from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';

interface CodeEditorProps {
  value?: string;
  language?: 'json' | 'markdown' | 'plaintext';
  height?: string;
  readOnly?: boolean;
  onChange?: (val: string) => void;
  className?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value = '',
  language = 'plaintext',
  height = '300px',
  readOnly = false,
  onChange,
  className = ''
}) => {
  const extensions = [];
  if (language === 'json') extensions.push(json());
  if (language === 'markdown') extensions.push(markdown());

  return (
    <div className={`border border-zinc-800 rounded-md overflow-hidden bg-zinc-950 ${className}`}>
      <CodeMirror
        value={value}
        height={height}
        theme="dark"
        extensions={extensions}
        readOnly={readOnly}
        onChange={(val) => onChange && onChange(val)}
      />
    </div>
  );
};
