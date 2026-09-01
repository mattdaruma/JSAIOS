/**
 * JSAIOS - Generic TextBlock Primitive
 * Scrollable text container for formatted logs, ANSI output, prompt history, and thinking blocks.
 */

import React, { useEffect, useRef } from 'react';

interface TextBlockProps {
  content?: string;
  monospace?: boolean;
  autoScroll?: boolean;
  maxHeight?: string;
  className?: string;
  children?: React.ReactNode;
}

export const TextBlock: React.FC<TextBlockProps> = ({
  content,
  monospace = true,
  autoScroll = true,
  maxHeight,
  className = '',
  children
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, children, autoScroll]);

  const parseFormattedText = (text: string) => {
    // Process <think>...</think> tags and role badges formatted cleanly
    const lines = text.split('\n');
    let isThinking = false;

    return lines.map((line, idx) => {
      if (line.includes('<think>')) {
        isThinking = true;
        return <div key={idx} className="text-zinc-500 italic text-xs py-0.5">💭 Thinking process started...</div>;
      }
      if (line.includes('</think>')) {
        isThinking = false;
        return <div key={idx} className="text-zinc-500 italic text-xs py-0.5">💭 Thinking completed.</div>;
      }

      if (isThinking) {
        return <div key={idx} className="text-zinc-500 italic font-mono text-xs pl-4 py-0.5 border-l border-zinc-800">{line}</div>;
      }

      if (line.startsWith('[USER]')) {
        return <div key={idx} className="text-yellow-400 font-bold mt-2">{line}</div>;
      }
      if (line.startsWith('[ASSISTANT]')) {
        return <div key={idx} className="text-cyan-400 font-bold mt-2">{line}</div>;
      }
      if (line.startsWith('[SYSTEM]')) {
        return <div key={idx} className="text-magenta-400 font-bold mt-2">{line}</div>;
      }

      return <div key={idx} className="py-0.5 leading-relaxed">{line || '\u00A0'}</div>;
    });
  };

  return (
    <div
      ref={containerRef}
      className={`p-4 bg-zinc-950 text-zinc-200 overflow-y-auto custom-scrollbar whitespace-pre-wrap ${monospace ? 'font-mono text-xs' : 'text-sm'} ${className}`}
      style={{ maxHeight: maxHeight || '100%' }}
    >
      {content !== undefined ? parseFormattedText(content) : children}
    </div>
  );
};
