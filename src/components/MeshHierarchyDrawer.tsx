import React from 'react';
import { Crosshair, Eye, EyeOff, Layers, X } from 'lucide-react';

export interface SceneMeshListItem {
  id: string;
  name: string;
  triCount: number;
  visible: boolean;
}

export interface SceneMetricsSummary {
  fileName: string;
  vertices: number;
  triangles: number;
  meshes: number;
  materials: number;
  textures: number;
  dimensions: string;
  animations: number;
}

interface MeshHierarchyDrawerProps {
  open: boolean;
  onClose: () => void;
  meshes: SceneMeshListItem[];
  selectedMeshId: string | null;
  metrics: SceneMetricsSummary;
  onSelectMesh: (id: string | null) => void;
  onFocusMesh: (id: string) => void;
  onToggleMeshVisibility: (id: string) => void;
  onShowAllMeshes: () => void;
}

export const MeshHierarchyDrawer: React.FC<MeshHierarchyDrawerProps> = ({
  open,
  onClose,
  meshes,
  selectedMeshId,
  metrics,
  onSelectMesh,
  onFocusMesh,
  onToggleMeshVisibility,
  onShowAllMeshes,
}) => {
  if (!open) return null;

  const hiddenCount = meshes.filter((m) => !m.visible).length;

  return (
    <aside className="absolute top-20 left-5 z-10 w-72 max-h-[calc(100vh-19rem)] rounded-xl bg-[#141923]/95 border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-xs">
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <Layers className="w-3.5 h-3.5 text-orange-400" />
          <span>Malhas &amp; Cena ({meshes.length})</span>
        </div>
        <div className="flex items-center gap-1.5">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={onShowAllMeshes}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 cursor-pointer"
            >
              Mostrar todas
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar lista de malhas"
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mesh List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onSelectMesh(null)}
          className={`px-2.5 py-1.5 rounded-md text-left font-medium transition-colors cursor-pointer flex items-center justify-between ${
            selectedMeshId === null
              ? 'bg-orange-600/20 text-orange-200 border border-orange-500/40'
              : 'text-slate-300 hover:bg-slate-800/70'
          }`}
        >
          <span>Modelo Completo (Todas)</span>
          <span className="font-mono text-[11px] text-slate-400 tabular-nums">
            {metrics.triangles.toLocaleString('pt-BR')} tris
          </span>
        </button>

        {meshes.map((item) => {
          const isSel = selectedMeshId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectMesh(item.id)}
              className={`group px-2 py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
                isSel
                  ? 'bg-orange-600 text-white'
                  : 'bg-[#0D1017]/60 hover:bg-slate-800/80 text-slate-200'
              }`}
            >
              <span className={`truncate font-mono ${!item.visible ? 'opacity-45 line-through' : ''}`}>
                {item.name}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`text-[10px] font-mono tabular-nums ${
                    isSel ? 'text-orange-100' : 'text-slate-500'
                  }`}
                >
                  {item.triCount}
                </span>
                <button
                  type="button"
                  title="Enquadrar malha"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMesh(item.id);
                    onFocusMesh(item.id);
                  }}
                  className="p-1 rounded hover:bg-black/20 cursor-pointer"
                >
                  <Crosshair className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title={item.visible ? 'Ocultar malha' : 'Mostrar malha'}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMeshVisibility(item.id);
                  }}
                  className="p-1 rounded hover:bg-black/20 cursor-pointer"
                >
                  {item.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 opacity-60" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Technical Metrics Footer */}
      <div className="px-3.5 py-2.5 border-t border-slate-800 bg-[#0D1017]/80 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div className="flex justify-between text-slate-400">
          <span>Vértices</span>
          <span className="font-mono text-slate-200 tabular-nums">
            {metrics.vertices.toLocaleString('pt-BR')}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Materiais</span>
          <span className="font-mono text-slate-200 tabular-nums">{metrics.materials}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Texturas</span>
          <span className="font-mono text-slate-200 tabular-nums">{metrics.textures}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Clipes</span>
          <span className="font-mono text-slate-200 tabular-nums">{metrics.animations}</span>
        </div>
        <div className="col-span-2 flex justify-between text-slate-400 pt-1 border-t border-slate-800/70">
          <span>Dimensões X / Y / Z</span>
          <span className="font-mono text-slate-200 tabular-nums">{metrics.dimensions}</span>
        </div>
      </div>
    </aside>
  );
};
