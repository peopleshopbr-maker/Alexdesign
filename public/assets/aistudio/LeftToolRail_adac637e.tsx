import {
  Box,
  Boxes,
  Code2,
  Download,
  FolderOpen,
  Gauge,
  Layers,
  ListTree,
  Save,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Upload,
  Video,
  Wind,
} from 'lucide-react';
import { useRef } from 'react';
import type { SceneMode } from '../types/graphics';

interface LeftToolRailProps {
  sceneMode: SceneMode;
  panelOpen: boolean;
  sideUtilityPanel: 'none' | 'postfx' | 'lighting';
  outlinerOpen: boolean;
  onSelectMode: (mode: SceneMode) => void;
  onToggleSideUtility: (util: 'postfx' | 'lighting') => void;
  onToggleOutliner: () => void;
  onOpenDrawer: (tab: 'glsl' | 'wgsl' | 'benchmark' | 'hardware') => void;
  onSaveProject: () => void;
  onLoadProjectFile: (file: File) => void;
  onExportGlb: () => void;
}

const MODE_TOOLS: Array<{
  id: SceneMode;
  label: string;
  icon: typeof Box;
}> = [
  { id: 'gltf', label: 'Importar GLB / GLTF & LOD', icon: Upload },
  { id: 'pbr', label: 'Motor PBR & Materiais', icon: Box },
  { id: 'nodes', label: 'Geometry Nodes & MoGraph', icon: Boxes },
  { id: 'animation', label: 'Animação 3D & 12 Princípios', icon: Video },
  { id: 'physics', label: 'Física 3D & Partículas', icon: Wind },
  { id: 'instanced', label: 'Campo Instanciado / WebGPU', icon: Layers },
  { id: 'shader', label: 'Efeitos Visuais (Shader)', icon: Code2 },
];

export function LeftToolRail({
  sceneMode,
  panelOpen,
  sideUtilityPanel,
  outlinerOpen,
  onSelectMode,
  onToggleSideUtility,
  onToggleOutliner,
  onOpenDrawer,
  onSaveProject,
  onLoadProjectFile,
  onExportGlb,
}: LeftToolRailProps) {
  const projectInputRef = useRef<HTMLInputElement>(null);

  return (
    <aside
      aria-label="Barra lateral de ferramentas 3D"
      className="fixed top-14 left-0 bottom-0 w-14 z-20 bg-[#0b0e14] border-r border-white/10 py-3 flex flex-col items-center justify-between"
    >
      <div className="flex flex-col items-center gap-1.5 w-full px-2 overflow-y-auto">
        {MODE_TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = sideUtilityPanel === 'none' && sceneMode === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              title={tool.label}
              aria-label={tool.label}
              aria-pressed={active && panelOpen}
              onClick={() => onSelectMode(tool.id)}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
                active
                  ? 'bg-sky-500/18 text-sky-300 border-sky-400/50 shadow-sm'
                  : 'bg-[#111622] text-slate-400 border-white/8 hover:bg-[#171f30] hover:text-slate-100'
              }`}
            >
              <Icon className="w-[18px] h-[18px]" />
            </button>
          );
        })}

        <div className="w-7 h-px bg-white/10 my-1 shrink-0" />

        <button
          type="button"
          title="Iluminação de Estúdio & HDRI"
          aria-label="Iluminação & HDRI"
          aria-pressed={sideUtilityPanel === 'lighting'}
          onClick={() => onToggleSideUtility('lighting')}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
            sideUtilityPanel === 'lighting'
              ? 'bg-sky-500/18 text-sky-300 border-sky-400/50'
              : 'bg-[#111622] text-slate-400 border-white/8 hover:bg-[#171f30] hover:text-slate-100'
          }`}
        >
          <Sun className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          title="Pós-Processamento (Bloom, DOF, Grain)"
          aria-label="Pós-Processamento"
          aria-pressed={sideUtilityPanel === 'postfx'}
          onClick={() => onToggleSideUtility('postfx')}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
            sideUtilityPanel === 'postfx'
              ? 'bg-sky-500/18 text-sky-300 border-sky-400/50'
              : 'bg-[#111622] text-slate-400 border-white/8 hover:bg-[#171f30] hover:text-slate-100'
          }`}
        >
          <Sparkles className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          title="Outliner / Lista de Objetos da Cena"
          aria-label="Outliner da Cena"
          aria-pressed={outlinerOpen}
          onClick={onToggleOutliner}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 cursor-pointer ${
            outlinerOpen
              ? 'bg-sky-500/18 text-sky-300 border-sky-400/50'
              : 'bg-[#111622] text-slate-400 border-white/8 hover:bg-[#171f30] hover:text-slate-100'
          }`}
        >
          <ListTree className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          title="Editor GLSL / WGSL & Hardware GPU"
          aria-label="Editor GLSL / WGSL"
          onClick={() => onOpenDrawer('glsl')}
          className="w-10 h-10 rounded-xl border bg-[#111622] text-slate-400 border-white/8 hover:bg-[#171f30] hover:text-slate-100 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <SlidersHorizontal className="w-[18px] h-[18px]" />
        </button>

        <button
          type="button"
          title="Benchmark de Performance GPU"
          aria-label="Benchmark GPU"
          onClick={() => onOpenDrawer('benchmark')}
          className="w-10 h-10 rounded-xl border bg-[#111622] text-slate-400 border-white/8 hover:bg-[#171f30] hover:text-slate-100 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Gauge className="w-[18px] h-[18px]" />
        </button>
      </div>

      <div className="flex flex-col items-center gap-1.5 pt-2 border-t border-white/10 w-full px-2 shrink-0">
        <input
          ref={projectInputRef}
          type="file"
          accept=".json,.vertice.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLoadProjectFile(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          title="Salvar Projeto (.vertice.json / Ctrl+S)"
          aria-label="Salvar Projeto"
          onClick={onSaveProject}
          className="w-10 h-9 rounded-xl border bg-[#111622] text-slate-300 border-white/10 hover:bg-[#171f30] hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Abrir Projeto (.vertice.json)"
          aria-label="Abrir Projeto"
          onClick={() => projectInputRef.current?.click()}
          className="w-10 h-9 rounded-xl border bg-[#111622] text-slate-300 border-white/10 hover:bg-[#171f30] hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Exportar Cena / Modelo (.GLB)"
          aria-label="Exportar .GLB"
          onClick={onExportGlb}
          className="w-10 h-9 rounded-xl border bg-[#111622] text-slate-300 border-white/10 hover:bg-sky-500/18 hover:text-sky-200 hover:border-sky-400/45 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
