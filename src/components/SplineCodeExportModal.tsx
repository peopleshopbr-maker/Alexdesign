import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

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
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Exportar Código Web"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl rounded-t-2xl sm:rounded-xl bg-[#141923] border border-slate-700/90 shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[85vh]"
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-700 mx-auto mt-2.5 mb-0.5 shrink-0" />
        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Exportar Código</span>
            </div>
            <div className="flex flex-wrap items-center gap-1 p-0.5 rounded-md bg-[#0D1017] border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTab('react')}
                className={`min-h-[34px] sm:min-h-[28px] px-2.5 py-1 rounded font-medium cursor-pointer whitespace-nowrap ${
                  tab === 'react' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                React Three Fiber
              </button>
              <button
                type="button"
                onClick={() => setTab('three')}
                className={`min-h-[34px] sm:min-h-[28px] px-2.5 py-1 rounded font-medium cursor-pointer whitespace-nowrap ${
                  tab === 'three' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Three.js
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[32px] px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar código"
              className="min-w-[40px] min-h-[40px] sm:min-w-[32px] sm:min-h-[32px] inline-flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="p-4 pb-safe overflow-auto bg-[#0D1017]">
          <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre">
            {activeCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
