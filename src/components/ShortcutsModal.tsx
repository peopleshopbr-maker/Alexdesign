import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUT_GROUPS = [
  {
    title: 'Timeline & Animação',
    items: [
      { keys: 'Espaço / Backspace', desc: 'Pausar / Retomar animação' },
      { keys: 'Ctrl + Z', desc: 'Desfazer (Undo global)' },
      { keys: 'Ctrl + Y', desc: 'Refazer (Redo global)' },
    ],
  },
  {
    title: 'Transformação & Cena',
    items: [
      { keys: 'Q / V', desc: 'Modo Órbita (Câmera livre)' },
      { keys: 'W / G', desc: 'Mover (Translate Gizmo)' },
      { keys: 'E / R', desc: 'Girar (Rotate Gizmo)' },
      { keys: 'S', desc: 'Escala (Scale Gizmo)' },
      { keys: 'Ctrl + D', desc: 'Duplicar objeto selecionado' },
      { keys: 'Delete / X', desc: 'Excluir objeto selecionado' },
    ],
  },
  {
    title: 'Câmera & Projeto',
    items: [
      { keys: 'F', desc: 'Focar / Enquadrar cena' },
      { keys: '1 / 3 / 7', desc: 'Vistas Frente / Lateral / Topo' },
      { keys: 'Ctrl + S', desc: 'Salvar projeto local' },
      { keys: '?', desc: 'Abrir / Fechar este guia' },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-[#111622] border border-slate-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-[#0D1017]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Guia Rápido de Atalhos & Pipeline Blender 3.5+
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            aria-label="Fechar guia"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                {group.title}
              </h3>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.keys}
                    className="flex flex-col gap-0.5 p-2 rounded-lg bg-[#0D1017] border border-slate-800/80"
                  >
                    <kbd className="text-[10px] font-mono font-semibold text-amber-300">
                      {item.keys}
                    </kbd>
                    <span className="text-[11px] text-slate-300 leading-tight">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-slate-800 bg-[#0D1017]/80 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
          <span>
            <strong className="text-orange-400">Fluxo Blender 3.5+:</strong> Importar (.glb/.gltf) → Rigging → Animação → VFX &amp; MoGraph → Exportar (.GLB/.glTF + script bpy compatível com Blender 3.5+).
          </span>
        </div>
      </div>
    </div>
  );
};
