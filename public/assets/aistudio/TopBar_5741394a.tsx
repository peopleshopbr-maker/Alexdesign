import { Camera, Sparkles } from 'lucide-react';

interface TopBarProps {
  liveRenderActive: boolean;
  onToggleLiveRender: () => void;
  onOpenDrawer: (tab: 'glsl' | 'wgsl' | 'benchmark' | 'hardware') => void;
  onCaptureFrame: () => void;
}

export function TopBar({
  liveRenderActive,
  onToggleLiveRender,
  onOpenDrawer,
  onCaptureFrame,
}: TopBarProps) {
  return (
    <header className="h-14 w-full shrink-0 bg-[#0b0e14] border-b border-white/10 px-4 sm:px-5 flex items-center justify-between gap-4 z-20">
      {/* Zona 1: Wordmark em linha única */}
      <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
        Vértice Studio
      </span>

      {/* Zona 2: Utilitários claros e visuais */}
      <nav aria-label="Utilitários visuais e hardware" className="hidden md:flex items-center gap-1.5 text-xs font-medium">
        <button
          type="button"
          onClick={() => onOpenDrawer('glsl')}
          className="h-8 px-3 rounded-lg whitespace-nowrap shrink-0 text-slate-300 hover:text-white hover:bg-white/6 cursor-pointer flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Efeitos &amp; Shaders</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenDrawer('benchmark')}
          className="h-8 px-3 rounded-lg whitespace-nowrap shrink-0 text-slate-300 hover:text-white hover:bg-white/6 cursor-pointer flex items-center"
        >
          Desempenho
        </button>
        <button
          type="button"
          onClick={() => onOpenDrawer('hardware')}
          className="h-8 px-3 rounded-lg whitespace-nowrap shrink-0 text-slate-300 hover:text-white hover:bg-white/6 cursor-pointer flex items-center"
        >
          Placa de Vídeo
        </button>
      </nav>

      {/* Zona 3: Render ao Vivo & Captura */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-pressed={liveRenderActive}
          onClick={onToggleLiveRender}
          title="Ativa iluminação final, Bloom e sombras em tempo real sobre o personagem"
          className={`h-9 px-3.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
            liveRenderActive
              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 border-emerald-300 shadow-sm'
              : 'bg-[#141c2c] hover:bg-[#1c263b] text-sky-200 border-sky-400/40'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{liveRenderActive ? 'Render ao Vivo: ON' : 'Render ao Vivo'}</span>
        </button>

        <button
          type="button"
          onClick={onCaptureFrame}
          className="h-9 px-3.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Capturar Quadro</span>
        </button>
      </div>
    </header>
  );
}
