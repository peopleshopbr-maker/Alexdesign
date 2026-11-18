import React from 'react';
import { Crosshair, Eye, EyeOff, Layers, Trash2, X } from 'lucide-react';

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
  onDeleteMesh?: (id: string | null) => void;
  /** Painel fixo (coluna esquerda no desktop) em vez de gaveta flutuante. */
  docked?: boolean;
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
  onDeleteMesh,
  docked = false,
}) => {
  if (!open) return null;

  const hiddenCount = meshes.filter((m) => !m.visible).length;

  return (
    <aside
      aria-label="Hierarquia de malhas da cena"
      className={
        docked
          ? 'order-1 hidden md:flex w-[240px] lg:w-[260px] xl:w-[280px] shrink-0 h-full border-r border-slate-800/90 bg-[#10141D] flex-col overflow-hidden text-xs'
          : 'md:hidden max-sm:fixed max-sm:inset-x-2 max-sm:bottom-16 max-sm:z-30 max-sm:max-h-[56dvh] sm:absolute sm:top-4 sm:right-4 sm:z-10 sm:w-72 sm:max-h-[calc(100dvh-7rem)] rounded-t-2xl sm:rounded-xl bg-[#141923]/96 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col overflow-hidden text-xs'
      }
    >
      {!docked && <div className="sm:hidden w-10 h-1 bg-slate-600 rounded-full mx-auto mt-2 shrink-0" />}
      <div className="px-3.5 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold text-slate-100 min-w-0">
          <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="truncate">Malhas &amp; Cena ({meshes.length})</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={onShowAllMeshes}
              className="min-h-[34px] sm:min-h-0 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer"
            >
              Mostrar todas
            </button>
          )}
          {!docked && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar lista de malhas"
            className="min-w-[36px] min-h-[36px] sm:min-w-0 sm:min-h-0 inline-flex items-center justify-center p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
          </button>
          )}
        </div>
      </div>

      {/* Mesh List */}
      <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        <div
          onClick={() => onSelectMesh(null)}
          className={`min-h-[40px] sm:min-h-0 px-2.5 py-2 sm:py-1.5 rounded-md text-left font-medium transition-colors cursor-pointer flex items-center justify-between gap-2 ${
            selectedMeshId === null
              ? 'bg-orange-600/20 text-orange-200 border border-orange-500/40'
              : 'text-slate-300 hover:bg-slate-800/70'
          }`}
        >
          <span className="truncate">Modelo Completo (Todas)</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {metrics.triangles.toLocaleString('pt-BR')} tris
            </span>
            {onDeleteMesh && meshes.length > 0 && (
              <button
                type="button"
                title="Excluir tudo da cena (Del)"
                aria-label="Excluir tudo da cena"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteMesh(null);
                }}
                className="min-w-[30px] min-h-[30px] sm:min-w-0 sm:min-h-0 inline-flex items-center justify-center p-1 rounded text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
              </button>
            )}
          </div>
        </div>

        {meshes.map((item) => {
          const isSel = selectedMeshId === item.id;
          return (
            <div
              key={item.id}
              onClick={() => onSelectMesh(item.id)}
              className={`group min-h-[40px] sm:min-h-0 px-2 py-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-between gap-1.5 ${
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
                    isSel ? 'text-orange-100' : 'text-slate-400'
                  }`}
                >
                  {item.triCount}
                </span>
                <button
                  type="button"
                  title="Enquadrar malha"
                  aria-label={`Enquadrar ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMesh(item.id);
                    onFocusMesh(item.id);
                  }}
                  className="min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 inline-flex items-center justify-center p-1.5 sm:p-1 rounded hover:bg-black/20 cursor-pointer"
                >
                  <Crosshair className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
                <button
                  type="button"
                  title={item.visible ? 'Ocultar malha' : 'Mostrar malha'}
                  aria-label={`${item.visible ? 'Ocultar' : 'Mostrar'} ${item.name}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMeshVisibility(item.id);
                  }}
                  className="min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 inline-flex items-center justify-center p-1.5 sm:p-1 rounded hover:bg-black/20 cursor-pointer"
                >
                  {item.visible ? (
                    <Eye className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  ) : (
                    <EyeOff className="w-3.5 h-3.5 sm:w-3 sm:h-3 opacity-60" />
                  )}
                </button>
                {onDeleteMesh && (
                  <button
                    type="button"
                    title="Excluir malha (Del)"
                    aria-label={`Excluir ${item.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteMesh(item.id);
                    }}
                    className={`min-w-[32px] min-h-[32px] sm:min-w-0 sm:min-h-0 inline-flex items-center justify-center p-1.5 sm:p-1 rounded cursor-pointer ${
                      isSel
                        ? 'text-white hover:bg-black/25'
                        : 'text-rose-400 hover:text-rose-200 hover:bg-rose-500/20'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  </button>
                )}
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
