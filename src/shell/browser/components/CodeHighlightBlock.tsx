/**
 * JSAIOS - Generic Component: CodeHighlightBlock
 * Reusable React component for syntax-style code snippet rendering with copy button.
 * 100% generic primitive.
 */

import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export interface CodeHighlightBlockProps {
  code: string;
  language?: string;
  filename?: string;
}

export const CodeHighlightBlock: React.FC<CodeHighlightBlockProps> = ({
  code,
  language = 'bash',
  filename
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden font-mono text-xs my-2">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/60 border-b border-zinc-800 text-zinc-400">
        <span className="text-[11px] font-semibold text-zinc-300">
          {filename || language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-zinc-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      <pre className="p-4 overflow-x-auto text-zinc-200 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};
