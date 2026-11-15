import React, { useState } from 'react';
import { Check, Code2, Copy, X } from 'lucide-react';

interface SplineCodeExportModalProps {
  open: boolean;
  threeCode: string;
  reactCode: string;
  onClose: () => void;
}

export const SplineCodeExportModal: React.FC<SplineCodeExportModalProps> = ({
  open,
  threeCode,
  reactCode,
  onClose,
}) => {
  const [tab, setTab] = useState<'three' | 'react'>('react');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const activeCode = tab === 'react' ? reactCode : threeCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback ignored
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl bg-[#141923] border border-slate-700/90 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span>Exportar Código Web</span>
            </div>
            <div className="flex items-center gap-1 p-0.5 rounded-md bg-[#0D1017] border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTab('react')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                  tab === 'react' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                React Three Fiber
              </button>
              <button
                type="button"
                onClick={() => setTab('three')}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer ${
                  tab === 'three' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Three.js
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar código"
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto bg-[#0D1017]">
          <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre">
            {activeCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
