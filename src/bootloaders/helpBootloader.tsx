/**
 * JSAIOS - Developer Documentation GUI Bootloader
 * Mounts data-driven searchable system documentation GUI using config/help.config.json.
 */

import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SearchableCardGrid, type CardItem } from '../shell/browser/components/SearchableCardGrid';
import helpManifest from '../../config/help.config.json';
import { BookOpen, Terminal, Cpu, ShieldCheck, Layers } from 'lucide-react';
import '../shell/browser/styles/globals.css';

export const HelpApp: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const docItems: CardItem[] = helpManifest.documentation as CardItem[];

  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30">
      {/* Header Bar */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-zinc-950 font-bold shadow-lg shadow-cyan-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-zinc-100 flex items-center gap-2">
              JSAIOS System Developer Guide
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                v{helpManifest.version}
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Declarative, Data-Driven System Architecture & Component Documentation</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
          <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-cyan-400" /> Hexagonal Isolation</span>
          <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-emerald-400" /> HoneyKernel OS</span>
          <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5 text-amber-400" /> Data-Driven CLI</span>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Banner Summary */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> 100% Modular Health & Hexagonal Isolation Certified
            </h2>
            <p className="text-xs text-zinc-400 max-w-3xl leading-relaxed">
              JSAIOS separates generic kernel engine code from configuration and driving shell layers. Use the real-time search box below to explore system architecture concepts, micro-services, CLI commands, and deployment modes.
            </p>
          </div>
        </div>

        {/* Searchable Card Grid Component */}
        <SearchableCardGrid
          placeholder="Search architecture, services, CLI commands, or npm scripts..."
          items={docItems}
          onSelectCard={(card) => setSelectedCard(card)}
        />
      </main>

      {/* Detail Modal Overlay */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-zinc-800 text-cyan-400 border border-zinc-700">
                  {selectedCard.badge || selectedCard.category}
                </span>
                <h2 className="text-lg font-bold text-zinc-100 mt-2">{selectedCard.title}</h2>
              </div>
              <button
                onClick={() => setSelectedCard(null)}
                className="text-zinc-400 hover:text-zinc-200 font-mono text-sm px-2 py-1 bg-zinc-800 rounded cursor-pointer"
              >
                [✕]
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">{selectedCard.description}</p>

            {selectedCard.codeSnippet && (
              <pre className="bg-zinc-950 p-4 rounded-lg border border-zinc-800 font-mono text-xs text-cyan-300 overflow-x-auto">
                <code>{selectedCard.codeSnippet}</code>
              </pre>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedCard(null)}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close Documentation Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<HelpApp />);
}
