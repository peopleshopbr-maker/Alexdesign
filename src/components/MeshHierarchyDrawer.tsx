import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Focus, Layers, Lock, Plus, Search, Sparkles, Unlock, X } from 'lucide-react';
import {
  PRIMITIVE_CATALOG,
  PrimitiveShapeKind,
  SPLINE_MATERIAL_STYLES,
  SplineMaterialStyle,
} from '../utils/splineSceneObjects';

export interface SceneMeshItem {
  id: string;
  name: string;
  triCount: number;
  visible: boolean;
  renderVisible?: boolean;
  locked?: boolean;
  collectionName?: string;
  materialName: string;
}

const COLOR_SWATCHES = [
  '#F97316',
  '#38BDF8',
  '#A855F7',
  '#10B981',
  '#F43F5E',
  '#FACC15',
  '#E2E8F0',
  '#334155',
];

interface MeshHierarchyDrawerProps {
  open: boolean;
  meshes: SceneMeshItem[];
  selectedMeshId: string | null;
  onSelectMesh: (id: string | null) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock?: (id: string) => void;
  onIsolateMesh: (id: string) => void;
  onShowAllMeshes: () => void;
  onApplyMaterialStyle?: (style: SplineMaterialStyle) => void;
  onApplyColorSwatch?: (hex: string) => void;
  onQuickAddPrimitive?: (kind: PrimitiveShapeKind) => void;
  onClose: () => void;
}

export const MeshHierarchyDrawer: React.FC<MeshHierarchyDrawerProps> = ({
  open,
  meshes,
  selectedMeshId,
  onSelectMesh,
  onToggleVisibility,
  onToggleLock,
  onIsolateMesh,
  onShowAllMeshes,
  onApplyMaterialStyle,
  onApplyColorSwatch,
  onQuickAddPrimitive,
  onClose,
}) => {
  const [panelTab, setPanelTab] = useState<'objects' | 'assets'>('objects');
  const [query, setQuery] = useState('');

  const filteredMeshes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meshes;
    return meshes.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.materialName.toLowerCase().includes(q) ||
        (m.collectionName || '').toLowerCase().includes(q)
    );
  }, [meshes, query]);

  const collections = useMemo(() => {
    const map = new Map<string, SceneMeshItem[]>();
    for (const m of filteredMeshes) {
      const col = m.collectionName || 'AlexDesign_Malhas';
      const arr = map.get(col) || [];
      arr.push(m);
      map.set(col, arr);
    }
    return Array.from(map.entries());
  }, [filteredMeshes]);

  if (!open) return null;

  return (
    <aside
      aria-label="Hierarquia Flutuante de Coleções e Assets"
      className="absolute top-13 left-3 bottom-12 w-68 rounded-xl bg-[#0D1017]/85 backdrop-blur-md border border-slate-700/80 shadow-2xl flex flex-col z-20 overflow-hidden"
    >
      <div className="px-2.5 py-2 border-b border-[#231F1D]/15 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 rounded-lg bg-[#090C12] p-0.5 border border-[#231F1D]/15">
          <button
            type="button"
            onClick={() => setPanelTab('objects')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
              panelTab === 'objects'
                ? 'bg-slate-700 text-[#231F1D]'
                : 'text-[#635B54] hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3 text-orange-400" />
            <span>Coleções ({meshes.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setPanelTab('assets')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
              panelTab === 'assets'
                ? 'bg-slate-700 text-[#231F1D]'
                : 'text-[#635B54] hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span>Assets</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Recolher painel esquerdo"
          title="Recolher hierarquia"
          className="w-7 h-7 rounded-md hover:bg-[#FAF8F5] text-[#635B54] hover:text-[#231F1D] flex items-center justify-center cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {panelTab === 'objects' ? (
        <>
          <div className="p-2 border-b border-[#231F1D]/15 space-y-1.5">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#090C12]/90 border border-[#231F1D]/15">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar bpy.types.Object..."
                className="w-full bg-transparent text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => onSelectMesh(null)}
                className={`flex-1 px-2 py-1 rounded text-left text-[10px] font-medium cursor-pointer truncate ${
                  selectedMeshId === null
                    ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                    : 'text-[#635B54] hover:bg-[#FAF8F5]/60 hover:text-slate-200'
                }`}
              >
                Scene Collection
              </button>
              <button
                type="button"
                onClick={onShowAllMeshes}
                title="Exibir todas as malhas"
                className="px-2 py-1 rounded text-[10px] font-medium bg-[#FAF8F5] hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0"
              >
                Exibir Tudo
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2.5">
            {collections.map(([colName, items]) => (
              <div key={colName} className="space-y-1">
                <div className="px-1.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#635B54]">
                  <span className="truncate">{colName}</span>
                  <span>{items.length}</span>
                </div>
                {items.map((item) => {
                  const isSelected = selectedMeshId === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-orange-600/20 border-orange-500/60 text-[#231F1D]'
                          : 'bg-[#090C12]/70 border-[#231F1D]/15 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => !item.locked && onSelectMesh(item.id)}
                        className={`flex-1 min-w-0 text-left ${
                          item.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <div className="text-[11px] font-medium truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate tabular-nums">
                          {item.triCount.toLocaleString()} tris · {item.materialName}
                        </div>
                      </button>

                      <div
                        className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                          !item.visible || item.locked
                            ? 'opacity-100'
                            : 'opacity-20 group-hover:opacity-100'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onIsolateMesh(item.id);
                          }}
                          title="Isolar malha"
                          className="w-6 h-6 rounded hover:bg-[#FAF8F5] text-[#635B54] hover:text-sky-400 flex items-center justify-center cursor-pointer"
                        >
                          <Focus className="w-3 h-3" />
                        </button>

                        {onToggleLock && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleLock(item.id);
                            }}
                            title={item.locked ? 'Destravar seleção' : 'Travar seleção'}
                            className="w-6 h-6 rounded hover:bg-[#FAF8F5] text-[#635B54] hover:text-amber-300 flex items-center justify-center cursor-pointer"
                          >
                            {item.locked ? (
                              <Lock className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Unlock className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(item.id);
                          }}
                          title={item.visible ? 'Ocultar malha' : 'Exibir malha'}
                          className="w-6 h-6 rounded hover:bg-[#FAF8F5] text-[#635B54] hover:text-[#231F1D] flex items-center justify-center cursor-pointer"
                        >
                          {item.visible ? (
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {onQuickAddPrimitive && (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-slate-300">Adicionar Forma</div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRIMITIVE_CATALOG.slice(0, 8).map((p) => (
                  <button
                    key={p.kind}
                    type="button"
                    onClick={() => onQuickAddPrimitive(p.kind)}
                    className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 hover:border-orange-500/70 text-[11px] text-slate-200 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-orange-400 shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {onApplyMaterialStyle && (
            <div className="space-y-2 pt-3 border-t border-[#231F1D]/15">
              <div className="text-[11px] font-semibold text-slate-300">Material Assets</div>
              <div className="grid grid-cols-2 gap-1.5">
                {SPLINE_MATERIAL_STYLES.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onApplyMaterialStyle(st.id)}
                    className="px-2 py-1.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 hover:border-sky-500 text-[11px] text-slate-200 text-left truncate cursor-pointer"
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {onApplyColorSwatch && (
            <div className="space-y-2 pt-3 border-t border-[#231F1D]/15">
              <div className="text-[11px] font-semibold text-slate-300">Color Assets</div>
              <div className="grid grid-cols-4 gap-2">
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => onApplyColorSwatch(hex)}
                    title={`Aplicar ${hex}`}
                    className="h-7 rounded-md border border-slate-700 hover:scale-105 transition-transform cursor-pointer"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

