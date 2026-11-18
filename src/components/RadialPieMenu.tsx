import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Archive,
  Bone,
  Box,
  Palette,
  Play,
  Sparkles,
  Upload,
  Workflow,
  X,
} from 'lucide-react';

export type RadialPieActionId =
  | 'stage1'
  | 'stage2'
  | 'stage5'
  | 'stage7'
  | 'stage8'
  | 'stage9'
  | 'stage12'
  | 'stage14';

interface RadialPieMenuProps {
  open: boolean;
  position: { x: number; y: number };
  activeTab: string;
  onSelect: (action: RadialPieActionId) => void;
  onClose: () => void;
}

const PIE_ITEMS: Array<{
  id: RadialPieActionId;
  label: string;
  angleDeg: number;
  icon: typeof Box;
}> = [
  { id: 'stage1', label: '1. Importar', angleDeg: -90, icon: Upload },
  { id: 'stage2', label: '2. Editar', angleDeg: -45, icon: Box },
  { id: 'stage5', label: '4. PBR & HDRI', angleDeg: 0, icon: Palette },
  { id: 'stage7', label: '5. Rigging', angleDeg: 45, icon: Bone },
  { id: 'stage8', label: '6. Animação', angleDeg: 90, icon: Play },
  { id: 'stage9', label: '7. Simulação', angleDeg: 135, icon: Sparkles },
  { id: 'stage12', label: '8. Nodes', angleDeg: 180, icon: Workflow },
  { id: 'stage14', label: '10. Exportar', angleDeg: -135, icon: Archive },
];

export function RadialPieMenu({
  open,
  position,
  activeTab,
  onSelect,
  onClose,
}: RadialPieMenuProps) {
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !menuContainerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.radial-ring',
        { scale: 0.72, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.28, ease: 'power3.out' }
      );
      gsap.fromTo(
        '.radial-center-btn',
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(1.7)' }
      );
      gsap.fromTo(
        '.radial-item-btn',
        { scale: 0.65, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.3,
          stagger: 0.024,
          ease: 'back.out(1.55)',
        }
      );
    }, menuContainerRef);

    return () => ctx.revert();
  }, [open, position.x, position.y]);

  if (!open) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
  const cx = Math.max(165, Math.min(vw - 165, position.x));
  const cy = Math.max(165, Math.min(vh - 165, position.y));
  const radius = 112;

  return (
    <div
      className="fixed inset-0 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div
        ref={menuContainerRef}
        role="menu"
        aria-label="Menu radial rápido do pipeline (Espaço)"
        style={{ left: cx, top: cy }}
        className="fixed -translate-x-1/2 -translate-y-1/2 w-[310px] h-[310px] pointer-events-none"
      >
        <div className="radial-ring absolute inset-8 rounded-full border border-orange-500/25 bg-[#090c13]/65 backdrop-blur-sm pointer-events-none" />

        <button
          type="button"
          onClick={onClose}
          title="Fechar menu radial (Esc / Espaço)"
          className="radial-center-btn pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#0D1017] hover:bg-slate-800 border border-slate-700 shadow-2xl flex flex-col items-center justify-center gap-0.5 text-slate-200 cursor-pointer"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            Fechar
          </span>
        </button>

        {PIE_ITEMS.map((item) => {
          const Icon = item.icon;
          const rad = (item.angleDeg * Math.PI) / 180;
          const dx = Math.cos(rad) * radius;
          const dy = Math.sin(rad) * radius;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              style={{
                left: `calc(50% + ${dx.toFixed(1)}px)`,
                top: `calc(50% + ${dy.toFixed(1)}px)`,
              }}
              className={`radial-item-btn pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 min-w-[98px] h-10 px-2.5 rounded-xl border shadow-xl flex items-center justify-center gap-1.5 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors hover:border-orange-400 ${
                isActive
                  ? 'bg-orange-500 text-slate-950 border-orange-400 font-semibold'
                  : 'bg-[#0D1017]/95 hover:bg-slate-800 text-slate-100 border-slate-700 hover:border-orange-500/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
