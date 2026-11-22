import React, { useEffect, useState } from 'react';
import { Check, Code2, Copy, Download, Link2, X } from 'lucide-react';
import {
  CodeExportObjectSpec,
  generateHtmlEmbedCode,
  generateNextJsSceneCode,
  generateReactThreeFiberCode,
  generateThreeJsSceneCode,
  generateVanillaJsEmbedCode,
} from '../utils/splineSceneObjects';

type ExportTargetTab = 'iframe' | 'html' | 'vanilla' | 'react' | 'nextjs' | 'three';

interface SplineCodeExportModalProps {
  open: boolean;
  onClose: () => void;
  objects: CodeExportObjectSpec[];
  assetName: string | null;
  bgHex: string;
  onCopyPublicLink?: () => void;
}

const EXPORT_TABS: { id: ExportTargetTab; label: string; filename: string }[] = [
  { id: 'iframe', label: 'Iframe / Link', filename: 'iframe-embed.html' },
  { id: 'html', label: 'Tag HTML', filename: 'embed.html' },
  { id: 'vanilla', label: 'Vanilla JS', filename: 'cena-vanilla.html' },
  { id: 'react', label: 'React', filename: 'CenaAlexDesign.tsx' },
  { id: 'nextjs', label: 'Next.js', filename: 'page.tsx' },
  { id: 'three', label: 'Three.js', filename: 'cena-three.js' },
];

export const SplineCodeExportModal: React.FC<SplineCodeExportModalProps> = ({
  open,
  onClose,
  objects,
  assetName,
  bgHex,
  onCopyPublicLink,
}) => {
  const [tab, setTab] = useState<ExportTargetTab>('iframe');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://alexdesign.app/';
  const iframeCode = `<!-- Incorpore a cena interativa em Webflow, Framer, WordPress ou React -->\n<iframe\n  src="${shareUrl}"\n  title="AlexDesign 3D Interativo (${assetName || 'cena.glb'})"\n  width="100%"\n  height="540"\n  style="border: 0; border-radius: 16px; background: ${bgHex};"\n  allow="fullscreen; accelerometer; gyroscope"\n></iframe>`;

  const code =
    tab === 'iframe'
      ? iframeCode
      : tab === 'html'
      ? generateHtmlEmbedCode(assetName, bgHex)
      : tab === 'vanilla'
      ? generateVanillaJsEmbedCode(objects, assetName, bgHex)
      : tab === 'react'
      ? generateReactThreeFiberCode(objects, bgHex)
      : tab === 'nextjs'
      ? generateNextJsSceneCode(objects, assetName, bgHex)
      : generateThreeJsSceneCode(objects, assetName, bgHex);

  const activeMeta = EXPORT_TABS.find((t) => t.id === tab) ?? EXPORT_TABS[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard fallback
    }
  };

  const handleDownloadSnippet = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeMeta.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F5F1EA]/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label="3D interativo feito para a web â€” exportar código"
    >
      <div
        className="w-full max-w-4xl rounded-xl bg-[#141923] border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#231F1D]/15 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-[#231F1D]">3D interativo, feito para a web</span>
            </div>
            <p className="text-[11px] text-[#635B54] mt-0.5">
              Incorpore via iframe/link público ou exporte código Vanilla JS, React, Next.js e Three.js.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {onCopyPublicLink && (
              <button
                type="button"
                onClick={onCopyPublicLink}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-sky-600/20 border border-sky-500/50 hover:bg-sky-600/30 text-xs font-medium text-sky-200 cursor-pointer whitespace-nowrap"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Gerar Link Público</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#FAF8F5] hover:bg-slate-700 text-xs font-medium text-[#231F1D] cursor-pointer whitespace-nowrap"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadSnippet}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar {activeMeta.filename}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              className="w-7 h-7 rounded-md hover:bg-[#FAF8F5] text-[#635B54] hover:text-[#231F1D] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 py-2 bg-[#0F131B] border-b border-[#231F1D]/15 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {EXPORT_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === t.id
                  ? 'bg-orange-600 text-[#231F1D]'
                  : 'bg-[#FAF8F5]/80 text-slate-300 hover:text-[#231F1D] hover:bg-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-auto bg-[#0B0E14] flex-1">
          <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};

