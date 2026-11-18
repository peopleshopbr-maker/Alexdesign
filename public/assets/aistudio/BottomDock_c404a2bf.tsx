import {
  ArrowDownToLine,
  Camera,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Film,
  Grid3x3,
  Layers,
  Magnet,
  Redo2,
  RotateCw,
  Sparkles,
  Square,
  SunDim,
  Undo2,
  Video,
} from 'lucide-react';
import type { RenderSettings, ViewportShadingMode } from '../types/graphics';

interface BottomDockProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  settings: RenderSettings;
  onUpdateSettings: (patch: Partial<RenderSettings>) => void;
  autoOrbit: boolean;
  onToggleAutoOrbit: () => void;
  hasSelection: boolean;
  isRecording: boolean;
  liveRenderActive: boolean;
  transparentPng: boolean;
  exportingFramesLabel: string | null;
  onToggleLiveRender: () => void;
  onToggleTransparentPng: () => void;
  onExportFramesZip: () => void;
  onToggleRecordWebm: () => void;
  onSnapToGround: () => void;
  onFocusObject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCaptureFrame: () => void;
  undoCount: number;
  redoCount: number;
}

const SHADING_MODES: Array<{ id: ViewportShadingMode; label: string }> = [
  { id: 'pbr', label: 'PBR' },
  { id: 'clay', label: 'Argila' },
  { id: 'redwax', label: 'RedWax' },
  { id: 'chrome', label: 'Cromo' },
  { id: 'normals', label: 'Normais' },
  { id: 'uv', label: 'UV' },
  { id: 'cel', label: 'Cel' },
];

export function BottomDock({
  collapsed,
  onToggleCollapsed,
  settings,
  onUpdateSettings,
  autoOrbit,
  onToggleAutoOrbit,
  hasSelection,
  isRecording,
  liveRenderActive,
  transparentPng,
  exportingFramesLabel,
  onToggleLiveRender,
  onToggleTransparentPng,
  onExportFramesZip,
  onToggleRecordWebm,
  onSnapToGround,
  onFocusObject,
  onUndo,
  onRedo,
  onCaptureFrame,
  undoCount,
  redoCount,
}: BottomDockProps) {
  const updateShading = (patch: Partial<RenderSettings['viewportShading']>) => {
    onUpdateSettings({
      viewportShading: {
        ...settings.viewportShading,
        ...patch,
      },
    });
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-[calc(100vw-5.5rem)] transition-transform duration-300 ease-out ${
        collapsed ? 'translate-y-[calc(100%+16px)]' : 'translate-y-0'
      }`}
    >
      {/* Botão discreto para recolher/expandir barra (atalho H) */}
      {collapsed && (
        <div className="flex justify-center -mt-9 mb-1 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Mostrar barra do viewport (atalho H)"
            className="h-8 px-3.5 rounded-xl bg-[#101521] border border-white/12 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-lg"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Viewport</span>
          </button>
        </div>
      )}

      {/* 3 pílulas separadas: Modos de Render · Auxiliares de Cena · Captura/Exportação */}
      <div className="pointer-events-auto flex items-center justify-center gap-2.5 flex-wrap">
        {/* Pílula 1: Modos de Render */}
        <div
          role="group"
          aria-label="Modos de Render"
          className="bg-[#101521]/95 border border-white/12 rounded-2xl px-2 py-1.5 shadow-2xl flex items-center gap-1"
        >
          {SHADING_MODES.map((m) => {
            const active = settings.viewportShading.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => updateShading({ mode: m.id })}
                className={`h-8 px-2.5 text-xs font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer flex items-center ${
                  active
                    ? 'bg-sky-400 text-slate-950 border-sky-300 font-semibold shadow-sm'
                    : 'bg-transparent text-slate-300 border-transparent hover:bg-white/6 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            );
          })}

          <div className="h-5 w-px bg-white/10 shrink-0 mx-0.5" />

          <button
            type="button"
            aria-pressed={settings.viewportShading.wireframe}
            onClick={() => updateShading({ wireframe: !settings.viewportShading.wireframe })}
            title="Alternar malha aramada (Wireframe)"
            className={`h-8 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              settings.viewportShading.wireframe
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                : 'bg-[#151b29] text-slate-300 border-white/10 hover:text-white'
            }`}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            <span>Wire</span>
          </button>

          <button
            type="button"
            aria-pressed={settings.viewportShading.bakeAo}
            onClick={() => updateShading({ bakeAo: !settings.viewportShading.bakeAo })}
            title="Realçar oclusão ambiental e sombras de contato"
            className={`h-8 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              settings.viewportShading.bakeAo
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                : 'bg-[#151b29] text-slate-300 border-white/10 hover:text-white'
            }`}
          >
            <SunDim className="w-3.5 h-3.5" />
            <span>Bake AO</span>
          </button>
        </div>

        {/* Pílula 2: Auxiliares de Cena */}
        <div
          role="group"
          aria-label="Auxiliares de Cena"
          className="bg-[#101521]/95 border border-white/12 rounded-2xl px-2 py-1.5 shadow-2xl flex items-center gap-1"
        >
          <button
            type="button"
            aria-pressed={autoOrbit}
            onClick={onToggleAutoOrbit}
            title="Rotação automática 360° da câmera"
            className={`h-8 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              autoOrbit
                ? 'bg-sky-500/18 text-sky-200 border-sky-400/45'
                : 'bg-transparent text-slate-300 border-transparent hover:bg-white/6 hover:text-white'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>360°</span>
          </button>

          <button
            type="button"
            aria-pressed={settings.snapEnabled}
            onClick={() => onUpdateSettings({ snapEnabled: !settings.snapEnabled })}
            title="Snap na grade para Gizmo (0.25m / 15°)"
            className={`h-8 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
              settings.snapEnabled
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                : 'bg-transparent text-slate-300 border-transparent hover:bg-white/6 hover:text-white'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Snap</span>
          </button>

          <button
            type="button"
            onClick={onSnapToGround}
            title="Apoiar objeto selecionado no piso (Y = 0)"
            className="h-8 px-2.5 text-xs font-medium rounded-lg text-slate-300 hover:text-white hover:bg-white/6 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            <span>Y=0</span>
          </button>

          <div className="h-5 w-px bg-white/10 shrink-0 mx-0.5" />

          <button
            type="button"
            onClick={onUndo}
            disabled={undoCount === 0}
            title="Desfazer última ação (Ctrl+Z)"
            aria-label="Desfazer"
            className={`h-8 px-2 rounded-lg flex items-center gap-1 shrink-0 ${
              undoCount > 0
                ? 'text-slate-200 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            {undoCount > 0 && (
              <span className="text-[11px] font-mono tabular-nums">{undoCount}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onRedo}
            disabled={redoCount === 0}
            title="Refazer ação (Ctrl+Shift+Z)"
            aria-label="Refazer"
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
              redoCount > 0
                ? 'text-slate-200 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onFocusObject}
            disabled={!hasSelection}
            title="Focar câmera no objeto selecionado (F)"
            aria-label="Focar objeto"
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
              hasSelection
                ? 'text-slate-200 hover:text-white hover:bg-white/10 cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pílula 3: Captura / Exportação */}
        <div
          role="group"
          aria-label="Captura e Exportação"
          className="bg-[#101521]/95 border border-white/12 rounded-2xl px-2 py-1.5 shadow-2xl flex items-center gap-1"
        >
          <button
            type="button"
            aria-pressed={liveRenderActive}
            onClick={onToggleLiveRender}
            title="Alternar Render ao Vivo com Bloom, sombras e iluminação em tempo real"
            className={`h-8 px-2.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              liveRenderActive
                ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                : 'bg-[#151b29] hover:bg-[#1c2436] text-sky-200 border-sky-400/35'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Render</span>
          </button>

          <button
            type="button"
            aria-pressed={isRecording}
            onClick={onToggleRecordWebm}
            title={
              isRecording
                ? 'Parar gravação e baixar vídeo .WebM'
                : 'Gravar giro Turntable 360° (.WebM)'
            }
            className={`h-8 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              isRecording
                ? 'bg-rose-500/25 text-rose-200 border-rose-400/55'
                : 'bg-[#151b29] hover:bg-[#1c2436] text-slate-200 border-white/10'
            }`}
          >
            {isRecording ? (
              <Square className="w-3 h-3 text-rose-400 fill-rose-400" />
            ) : (
              <Video className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>{isRecording ? 'Parar REC' : 'REC'}</span>
          </button>

          <button
            type="button"
            aria-pressed={transparentPng}
            onClick={onToggleTransparentPng}
            title="Exportar PNG e Quadro a Quadro com Fundo Transparente (Alpha)"
            className={`h-8 px-2.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              transparentPng
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                : 'bg-[#151b29] hover:bg-[#1c2436] text-slate-300 border-white/10'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>{transparentPng ? 'Transp.: ON' : 'Transp.'}</span>
          </button>

          <button
            type="button"
            onClick={onCaptureFrame}
            title={
              transparentPng
                ? 'Criar PNG com Fundo Transparente do quadro atual'
                : 'Capturar imagem PNG do viewport'
            }
            className="h-8 px-2.5 text-xs font-medium rounded-lg bg-[#151b29] hover:bg-[#1c2436] text-slate-200 border border-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-sky-400" />
            <span>PNG</span>
          </button>

          <button
            type="button"
            disabled={Boolean(exportingFramesLabel)}
            onClick={onExportFramesZip}
            title="Exportar animação quadro a quadro em sequência PNG (.zip)"
            className="h-8 px-2.5 text-xs font-medium rounded-lg bg-[#151b29] hover:bg-[#1c2436] disabled:opacity-60 text-slate-200 border border-white/10 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Film className="w-3.5 h-3.5 text-emerald-400" />
            <span>{exportingFramesLabel ?? 'Seq. PNG'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Ocultar barra (atalho H)"
            aria-label="Ocultar barra"
            className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
