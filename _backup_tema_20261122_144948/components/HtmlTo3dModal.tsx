import React, { useEffect, useRef, useState } from 'react';
import { Code2, Plus, Sparkles, X } from 'lucide-react';
import {
  HTML_TO_3D_PRESETS,
  HtmlTo3dSpec,
  renderHtmlSpecToCanvas,
} from '../utils/htmlTo3d';

interface HtmlTo3dModalProps {
  open: boolean;
  initialSpec?: HtmlTo3dSpec | null;
  isEditingExisting?: boolean;
  onClose: () => void;
  onApply: (spec: HtmlTo3dSpec) => void;
}

export const HtmlTo3dModal: React.FC<HtmlTo3dModalProps> = ({
  open,
  initialSpec,
  isEditingExisting = false,
  onClose,
  onApply,
}) => {
  const [spec, setSpec] = useState<HtmlTo3dSpec>(
    () => initialSpec ?? HTML_TO_3D_PRESETS[0].spec
  );
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open) {
      setSpec(initialSpec ?? HTML_TO_3D_PRESETS[0].spec);
    }
  }, [open, initialSpec]);

  useEffect(() => {
    if (!open) return;
    const target = previewCanvasRef.current;
    if (!target) return;
    const rendered = renderHtmlSpecToCanvas(spec, 640);
    target.width = rendered.width;
    target.height = rendered.height;
    const ctx = target.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(rendered, 0, 0);
    }
  }, [open, spec]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Conversor HTML para 3D"
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-[#111622] border border-slate-700 shadow-2xl flex flex-col overflow-hidden text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-800 bg-[#0F131B] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-600/20 border border-orange-500/40 flex items-center justify-center">
              <Code2 className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">HTML → 3D (Painel Interativo Web)</h2>
              <p className="text-[11px] text-slate-400">
                Converta markup HTML em painéis 3D PBR exportáveis no .GLB e Blender 5.3.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Presets */}
        <div className="px-4 py-2 border-b border-slate-800 bg-[#141923] flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400 mr-1">Modelos prontos:</span>
          {HTML_TO_3D_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSpec({ ...preset.spec })}
              className="px-2.5 py-1 rounded-md bg-[#0D1017] border border-slate-700 hover:border-orange-500 text-[11px] text-slate-200 cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Editor */}
          <div className="lg:col-span-6 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-300">Nome do Objeto 3D</span>
              <input
                type="text"
                value={spec.name}
                onChange={(e) => setSpec((prev) => ({ ...prev, name: e.target.value }))}
                className="px-2.5 py-1.5 rounded-lg bg-[#090C12] border border-slate-800 focus:border-orange-500 outline-none text-slate-100"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-slate-300">
                Código HTML (h1, h2, p, li, code, span.badge, button)
              </span>
              <textarea
                rows={7}
                value={spec.html}
                onChange={(e) => setSpec((prev) => ({ ...prev, html: e.target.value }))}
                className="w-full p-2.5 rounded-lg bg-[#090C12] border border-slate-800 focus:border-orange-500 outline-none font-mono text-[11px] text-sky-200 leading-relaxed resize-y"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">Largura ({spec.widthM.toFixed(2)}m)</span>
                <input
                  type="range"
                  min={0.4}
                  max={2.4}
                  step={0.05}
                  value={spec.widthM}
                  onChange={(e) => setSpec((p) => ({ ...p, widthM: Number(e.target.value) }))}
                  className="accent-orange-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">Altura ({spec.heightM.toFixed(2)}m)</span>
                <input
                  type="range"
                  min={0.35}
                  max={1.8}
                  step={0.05}
                  value={spec.heightM}
                  onChange={(e) => setSpec((p) => ({ ...p, heightM: Number(e.target.value) }))}
                  className="accent-orange-500"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-400">Emissão ({spec.emissiveGlow.toFixed(2)})</span>
                <input
                  type="range"
                  min={0}
                  max={1.6}
                  step={0.05}
                  value={spec.emissiveGlow}
                  onChange={(e) => setSpec((p) => ({ ...p, emissiveGlow: Number(e.target.value) }))}
                  className="accent-purple-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#090C12] border border-slate-800 text-[11px] text-slate-300">
                <span>Fundo</span>
                <input
                  type="color"
                  value={spec.bgHex}
                  onChange={(e) => setSpec((p) => ({ ...p, bgHex: e.target.value }))}
                  className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#090C12] border border-slate-800 text-[11px] text-slate-300">
                <span>Destaque</span>
                <input
                  type="color"
                  value={spec.accentHex}
                  onChange={(e) => setSpec((p) => ({ ...p, accentHex: e.target.value }))}
                  className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#090C12] border border-slate-800 text-[11px] text-slate-300">
                <span>Texto</span>
                <input
                  type="color"
                  value={spec.textHex}
                  onChange={(e) => setSpec((p) => ({ ...p, textHex: e.target.value }))}
                  className="w-6 h-5 bg-transparent border-0 cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Right Live Preview */}
          <div className="lg:col-span-6 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span className="font-semibold">Pré-visualização da Textura 3D</span>
              <span className="font-mono text-[10px] text-slate-400">sRGB · CanvasTexture</span>
            </div>
            <div className="flex-1 min-h-[240px] rounded-xl bg-[#090C12] border border-slate-800 p-3 flex items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full max-h-[300px] rounded-lg shadow-lg border border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-[#0F131B] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onApply(spec);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold cursor-pointer"
          >
            {isEditingExisting ? <Sparkles className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{isEditingExisting ? 'Atualizar Painel 3D' : 'Inserir HTML na Cena 3D'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
