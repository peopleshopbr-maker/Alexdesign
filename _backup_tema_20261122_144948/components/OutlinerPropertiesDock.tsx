import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bone,
  Box,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Copy,
  Diamond,
  Download,
  Eye,
  EyeOff,
  Flame,
  FlipHorizontal2,
  Focus,
  FolderOpen,
  Image as ImageIcon,
  Layers,
  Lock,
  MousePointer,
  Move,
  Palette,
  Paintbrush,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Scaling,
  Search,
  Shapes,
  Sparkles,
  Square,
  Sun,
  Trash2,
  Unlock,
  Upload,
  VideoOff,
  X,
} from 'lucide-react';
import {
  PRIMITIVE_CATALOG,
  PrimitiveShapeKind,
  SelectedObjectInspector,
  SPLINE_INTERACTION_OPTIONS,
  SPLINE_MATERIAL_STYLES,
  SPLINE_TEMPLATES,
  SplineInteractionType,
  SplineMaterialStyle,
  SplineTemplateId,
  SplineToolMode,
  RigidBodyMode,
} from '../utils/splineSceneObjects';
import { BooleanOpKind } from '../utils/csgBoolean';
import { ParticleEmitterConfig, ParticleSpritePreset } from '../utils/particleSystem';
import { ReactiveShaderEffect } from '../utils/reactiveShaders';
import { SubstanceChannelId } from '../utils/substanceImporter';
import { BoneHierarchyNode } from '../utils/skeletonVisualizer';
import { StudioLightingState } from './LightingStudioPage';
import { NumberScrubber, PbrSlider } from './StudioPrimitives';
import { SceneMeshItem } from './MeshHierarchyDrawer';

export type PropertiesTabId = 'scene' | 'transform' | 'material' | 'rig' | 'lighting' | 'vfx';

export interface ReferencePlaneSummary {
  active: boolean;
  visible: boolean;
  name: string;
  axis: 'front' | 'side' | 'top';
  opacity: number;
  scale: number;
  flipX: boolean;
}

export interface HtmlReferenceSummary {
  id: string;
  name: string;
  visible: boolean;
}

export interface MorphTargetItem {
  key: string;
  meshId: string;
  meshName: string;
  targetName: string;
  index: number;
  value: number;
}

interface OutlinerPropertiesDockProps {
  activePropTab: PropertiesTabId;
  onSelectPropTab: (tab: PropertiesTabId) => void;
  onCollapseDock: () => void;
  meshes: SceneMeshItem[];
  selectedMeshId: string | null;
  riggedBoneNames: string[];
  selectedBoneName: string | null;
  hasSelection: boolean;
  selectedInspector: SelectedObjectInspector | null;
  currentFrameHasKey: boolean;
  trackHasAnyKey: boolean;
  onSelectMesh: (id: string | null) => void;
  onSelectBone: (boneName: string) => void;
  onSetMeshVisible: (id: string, visible: boolean) => void;
  onSetMeshRenderVisible: (id: string, renderVisible: boolean) => void;
  onSetMeshLocked: (id: string, locked: boolean) => void;
  onShowAllMeshes: () => void;
  onUpdateInspector: (patch: Partial<SelectedObjectInspector>) => void;
  onAddKeyframeAtCurrent: () => void;
  onFrameSelected: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  // Rig & Morph quick controls
  ikEnabled: boolean;
  onToggleIk: () => void;
  floorContactEnabled: boolean;
  onToggleFloorContact: () => void;
  weightPaintActive: boolean;
  onToggleWeightPaint: () => void;
  onRunAutoRig: () => void;
  morphTargets: MorphTargetItem[];
  onChangeMorphTarget: (meshId: string, index: number, value: number) => void;
  // Lighting quick controls
  lighting: StudioLightingState;
  onLightingChange: (patch: Partial<StudioLightingState>) => void;
  onRenderPng: () => void;
  // VFX / Particles quick controls
  emitters: ParticleEmitterConfig[];
  selectedEmitterId: string | null;
  onAddEmitter: () => void;
  onSelectEmitter: (id: string) => void;
  onUpdateEmitter: (id: string, patch: Partial<ParticleEmitterConfig>) => void;
  onRemoveEmitter: (id: string) => void;
  // Per-slot PBR Texture Maps
  activeTextureMaps?: Partial<Record<SubstanceChannelId, string>>;
  onUploadTextureChannel?: (channel: SubstanceChannelId, file: File) => void;
  onClearTextureChannel?: (channel: SubstanceChannelId) => void;
  onBatchUploadTextures?: (files: File[]) => void;
  // Armature hierarchy & PoseBone quick actions
  riggedBoneTree?: BoneHierarchyNode[];
  showSkeleton?: boolean;
  onToggleSkeleton?: () => void;
  onResetBone?: () => void;
  onMirrorBonePose?: () => void;
  onExportAnimatedGlb?: () => void;
  // References tab in Outliner
  refPlane?: ReferencePlaneSummary;
  onImportReferenceImage?: () => void;
  onUpdateRefPlane?: (patch: Partial<ReferencePlaneSummary>) => void;
  onClearRefPlane?: () => void;
  htmlReferences?: HtmlReferenceSummary[];
  onOpenHtmlTo3d?: () => void;
  onToggleHtmlReferenceVisible?: (id: string) => void;
  onDeleteHtmlReference?: (id: string) => void;
  // Scene & Modeling 3D tab (Image 1)
  playMode?: boolean;
  onTogglePlayMode?: (play: boolean) => void;
  activeTemplate?: SplineTemplateId;
  onSelectTemplate?: (id: SplineTemplateId) => void;
  onApplyTemplate?: (id: SplineTemplateId) => void;
  hideDefaultBase?: boolean;
  onToggleHideDefaultBase?: () => void;
  toolMode?: SplineToolMode;
  onSelectToolMode?: (mode: SplineToolMode) => void;
  onAddPrimitive?: (kind: PrimitiveShapeKind) => void;
  onRunBoolean?: (op: BooleanOpKind) => void;
  canRunBoolean?: boolean;
  physicsActive?: boolean;
  onTogglePhysicsActive?: () => void;
  bloomEnabled?: boolean;
  onToggleBloom?: () => void;
  hideOutliner?: boolean;
}

export interface ExplorerOutlinerDockProps {
  onCollapse: () => void;
  meshes: SceneMeshItem[];
  selectedMeshId: string | null;
  riggedBoneNames: string[];
  riggedBoneTree?: BoneHierarchyNode[];
  selectedBoneName: string | null;
  onSelectMesh: (id: string | null) => void;
  onSelectBone: (boneName: string) => void;
  onSetMeshVisible: (id: string, visible: boolean) => void;
  onSetMeshRenderVisible: (id: string, renderVisible: boolean) => void;
  onSetMeshLocked: (id: string, locked: boolean) => void;
  onShowAllMeshes: () => void;
  onRunAutoRig: () => void;
  refPlane?: ReferencePlaneSummary;
  onImportReferenceImage?: () => void;
  onUpdateRefPlane?: (patch: Partial<ReferencePlaneSummary>) => void;
  onClearRefPlane?: () => void;
  htmlReferences?: HtmlReferenceSummary[];
  onOpenHtmlTo3d?: () => void;
  onToggleHtmlReferenceVisible?: (id: string) => void;
  onDeleteHtmlReference?: (id: string) => void;
}

export const ExplorerOutlinerDock: React.FC<ExplorerOutlinerDockProps> = ({
  onCollapse,
  meshes,
  selectedMeshId,
  riggedBoneNames,
  riggedBoneTree = [],
  selectedBoneName,
  onSelectMesh,
  onSelectBone,
  onSetMeshVisible,
  onSetMeshRenderVisible,
  onSetMeshLocked,
  onShowAllMeshes,
  onRunAutoRig,
  refPlane,
  onImportReferenceImage,
  onUpdateRefPlane,
  onClearRefPlane,
  htmlReferences = [],
  onOpenHtmlTo3d,
  onToggleHtmlReferenceVisible,
  onDeleteHtmlReference,
}) => {
  const [search, setSearch] = useState('');
  const [outlinerMode, setOutlinerMode] = useState<'meshes' | 'armature' | 'references'>(() =>
    riggedBoneNames.length > 0 ? 'armature' : 'meshes'
  );
  const [collapsedBones, setCollapsedBones] = useState<Record<string, boolean>>({});
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (selectedBoneName) {
      setOutlinerMode('armature');
    }
  }, [selectedBoneName]);

  const dragActionRef = useRef<{
    kind: 'eye' | 'camera' | 'lock';
    targetValue: boolean;
  } | null>(null);

  const stopDrag = () => {
    dragActionRef.current = null;
    window.removeEventListener('pointerup', stopDrag);
  };

  const beginDragToggle = (
    kind: 'eye' | 'camera' | 'lock',
    id: string,
    nextVal: boolean
  ) => {
    dragActionRef.current = { kind, targetValue: nextVal };
    window.addEventListener('pointerup', stopDrag);
    if (kind === 'eye') onSetMeshVisible(id, nextVal);
    else if (kind === 'camera') onSetMeshRenderVisible(id, nextVal);
    else onSetMeshLocked(id, nextVal);
  };

  const applyDragEnter = (id: string) => {
    const d = dragActionRef.current;
    if (!d) return;
    if (d.kind === 'eye') onSetMeshVisible(id, d.targetValue);
    else if (d.kind === 'camera') onSetMeshRenderVisible(id, d.targetValue);
    else onSetMeshLocked(id, d.targetValue);
  };

  const filteredMeshes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meshes;
    return meshes.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.collectionName || '').toLowerCase().includes(q) ||
        m.materialName.toLowerCase().includes(q)
    );
  }, [meshes, search]);

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

  const effectiveBoneNodes = useMemo<BoneHierarchyNode[]>(() => {
    if (riggedBoneTree.length > 0) return riggedBoneTree;
    return riggedBoneNames.map((name, idx) => ({
      name,
      parentName: idx === 0 ? null : riggedBoneNames[0],
    }));
  }, [riggedBoneTree, riggedBoneNames]);

  const boneChildrenMap = useMemo(() => {
    const map = new Map<string, BoneHierarchyNode[]>();
    const knownNames = new Set(effectiveBoneNodes.map((n) => n.name));
    for (const node of effectiveBoneNodes) {
      const key =
        node.parentName && knownNames.has(node.parentName) && node.parentName !== node.name
          ? node.parentName
          : '__ROOT__';
      const arr = map.get(key) || [];
      arr.push(node);
      map.set(key, arr);
    }
    return map;
  }, [effectiveBoneNodes]);

  const filteredBonesFlat = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return effectiveBoneNodes.filter((b) => b.name.toLowerCase().includes(q));
  }, [effectiveBoneNodes, search]);

  const refCount = (refPlane?.active ? 1 : 0) + htmlReferences.length;

  return (
    <aside
      aria-label="Explorer Armature, Malhas e Referências"
      className="w-full lg:w-[270px] xl:w-[290px] max-h-[40vh] lg:max-h-none border-b lg:border-b-0 lg:border-r border-slate-800 bg-[#0F131B] flex flex-col shrink-0 min-h-0"
    >
      <div className="px-2.5 py-1.5 border-b border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-orange-400" />
          <span>EXPLORER</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onShowAllMeshes}
            title="Exibir todas as malhas"
            className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
          >
            Tudo
          </button>
          <button
            type="button"
            onClick={onCollapse}
            title="Recolher Explorer"
            className="w-6 h-6 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="px-2 py-1.5 border-b border-slate-800 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setOutlinerMode('armature')}
          className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
            outlinerMode === 'armature'
              ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/45'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Bone className="w-3 h-3 shrink-0" />
          <span>Armature ({riggedBoneNames.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setOutlinerMode('meshes')}
          className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
            outlinerMode === 'meshes'
              ? 'bg-orange-600/25 text-orange-300 border border-orange-500/40'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <Layers className="w-3 h-3 shrink-0" />
          <span>Malhas ({meshes.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setOutlinerMode('references')}
          className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
            outlinerMode === 'references'
              ? 'bg-sky-600/20 text-sky-300 border border-sky-500/45'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
          }`}
        >
          <ImageIcon className="w-3 h-3 shrink-0" />
          <span>Ref. ({refCount})</span>
        </button>
      </div>

      <div className="px-2 py-1.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#090C12] border border-slate-800 focus-within:border-orange-500">
          <Search className="w-3 h-3 text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              outlinerMode === 'armature'
                ? 'Filtrar osso da Armature...'
                : outlinerMode === 'references'
                ? 'Filtrar referências...'
                : 'Filtrar coleção ou objeto...'
            }
            className="w-full bg-transparent text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 text-[11px]">
        {outlinerMode === 'meshes' &&
          collections.map(([colName, items]) => {
            const isCollapsed = Boolean(collapsedCols[colName]);
            return (
              <div key={colName} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedCols((prev) => ({ ...prev, [colName]: !prev[colName] }))
                  }
                  className="w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-800/60 text-[10px] font-mono uppercase tracking-wider text-slate-400 cursor-pointer"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 shrink-0" />
                  ) : (
                    <ChevronDown className="w-3 h-3 shrink-0" />
                  )}
                  <FolderOpen className="w-3 h-3 text-amber-400/80 shrink-0" />
                  <span className="truncate flex-1 text-left">{colName}</span>
                  <span className="text-slate-500">{items.length}</span>
                </button>

                {!isCollapsed &&
                  items.map((item) => {
                    const isSelected = selectedMeshId === item.id;
                    const renderOn = item.renderVisible !== false;
                    return (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-1 pl-4 pr-1.5 py-1 rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-orange-600/20 border-orange-500/60 text-white'
                            : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => !item.locked && onSelectMesh(item.id)}
                          className={`flex-1 min-w-0 text-left truncate ${
                            item.locked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                          title={`${item.name} · ${item.triCount.toLocaleString()} tris`}
                        >
                          {item.name}
                        </button>
                        <div
                          className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                            !item.visible || !renderOn || item.locked
                              ? 'opacity-100'
                              : 'opacity-25 group-hover:opacity-100'
                          }`}
                        >
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              beginDragToggle('eye', item.id, !item.visible);
                            }}
                            onPointerEnter={() => applyDragEnter(item.id)}
                            title={item.visible ? 'Ocultar na viewport (arraste)' : 'Exibir na viewport'}
                            className="w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                          >
                            {item.visible ? (
                              <Eye className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              beginDragToggle('camera', item.id, !renderOn);
                            }}
                            onPointerEnter={() => applyDragEnter(item.id)}
                            title={renderOn ? 'Desativar no Render PNG' : 'Ativar no Render PNG'}
                            className="w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                          >
                            {renderOn ? (
                              <Camera className="w-3 h-3 text-sky-400" />
                            ) : (
                              <VideoOff className="w-3 h-3 text-slate-500" />
                            )}
                          </button>
                          <button
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              beginDragToggle('lock', item.id, !item.locked);
                            }}
                            onPointerEnter={() => applyDragEnter(item.id)}
                            title={item.locked ? 'Destravar seleção' : 'Travar seleção'}
                            className="w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                          >
                            {item.locked ? (
                              <Lock className="w-3 h-3 text-amber-400" />
                            ) : (
                              <Unlock className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            );
          })}

        {outlinerMode === 'armature' && riggedBoneNames.length > 0 && (
          <div className="space-y-0.5">
            {filteredBonesFlat ? (
              filteredBonesFlat.length === 0 ? (
                <div className="px-2 py-3 text-center text-[10px] text-slate-500">
                  Nenhum osso encontrado para "{search}".
                </div>
              ) : (
                filteredBonesFlat.map((bn) => {
                  const isSelected = selectedBoneName === bn.name;
                  const isIkEnd = /(hand|wrist|foot|ankle)_(l|r)$/i.test(bn.name);
                  return (
                    <button
                      key={bn.name}
                      type="button"
                      onClick={() => onSelectBone(bn.name)}
                      className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[10px] font-mono cursor-pointer ${
                        isSelected
                          ? 'bg-orange-600/25 border border-orange-500/60 text-white'
                          : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                      }`}
                    >
                      <Bone
                        className={`w-3 h-3 shrink-0 ${
                          isSelected ? 'text-orange-400' : isIkEnd ? 'text-yellow-400' : 'text-cyan-400'
                        }`}
                      />
                      <span className="truncate flex-1">{bn.name}</span>
                      {isIkEnd && (
                        <span className="text-[9px] text-yellow-400/90 font-semibold">IK</span>
                      )}
                    </button>
                  );
                })
              )
            ) : (
              (() => {
                const renderBoneBranch = (node: BoneHierarchyNode, depth: number): React.ReactNode => {
                  const children = boneChildrenMap.get(node.name) || [];
                  const hasKids = children.length > 0;
                  const isCollapsed = Boolean(collapsedBones[node.name]);
                  const isSelected = selectedBoneName === node.name;
                  const isIkEnd = /(hand|wrist|foot|ankle)_(l|r)$/i.test(node.name);
                  return (
                    <div key={node.name}>
                      <div
                        style={{ paddingLeft: `${Math.min(depth, 6) * 12 + 4}px` }}
                        className={`flex items-center gap-1 pr-1.5 py-0.5 rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-orange-600/25 border-orange-500/60 text-white'
                            : 'border-transparent hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        {hasKids ? (
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedBones((prev) => ({
                                ...prev,
                                [node.name]: !prev[node.name],
                              }))
                            }
                            className="w-4 h-4 rounded hover:bg-slate-700/70 flex items-center justify-center text-slate-400 shrink-0 cursor-pointer"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        ) : (
                          <span className="w-4 shrink-0" />
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectBone(node.name)}
                          className="flex-1 min-w-0 flex items-center gap-1.5 py-0.5 text-left text-[10px] font-mono truncate cursor-pointer"
                        >
                          <Bone
                            className={`w-3 h-3 shrink-0 ${
                              isSelected
                                ? 'text-orange-400'
                                : isIkEnd
                                ? 'text-yellow-400'
                                : 'text-cyan-400'
                            }`}
                          />
                          <span className="truncate">{node.name}</span>
                        </button>
                        {isIkEnd && (
                          <span className="text-[9px] text-yellow-400 font-semibold shrink-0">
                            IK
                          </span>
                        )}
                      </div>
                      {hasKids &&
                        !isCollapsed &&
                        children.map((ch) => renderBoneBranch(ch, depth + 1))}
                    </div>
                  );
                };
                return (boneChildrenMap.get('__ROOT__') || []).map((rootBone) =>
                  renderBoneBranch(rootBone, 0)
                );
              })()
            )}
          </div>
        )}

        {outlinerMode === 'armature' && riggedBoneNames.length === 0 && (
          <div className="p-3 text-center space-y-2">
            <p className="text-[10px] text-slate-400">
              Nenhum esqueleto ativo na cena. Aplique o Auto-Rig para gerar a Armature.
            </p>
            <button
              type="button"
              onClick={onRunAutoRig}
              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[10px] cursor-pointer"
            >
              Aplicar Auto-Rig
            </button>
          </div>
        )}

        {outlinerMode === 'references' && (
          <div className="space-y-2 p-0.5">
            <div className="grid grid-cols-2 gap-1.5">
              {onImportReferenceImage && (
                <button
                  type="button"
                  onClick={onImportReferenceImage}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#090C12] border border-slate-800 hover:border-sky-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                >
                  <ImageIcon className="w-3 h-3 text-sky-400 shrink-0" />
                  <span className="truncate">Ref. Imagem 3D</span>
                </button>
              )}
              {onOpenHtmlTo3d && (
                <button
                  type="button"
                  onClick={onOpenHtmlTo3d}
                  className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#090C12] border border-slate-800 hover:border-orange-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                >
                  <Code2 className="w-3 h-3 text-orange-400 shrink-0" />
                  <span className="truncate">HTML → 3D</span>
                </button>
              )}
            </div>

            {refPlane?.active && (
              <div className="rounded-lg bg-[#141923] border border-slate-800 p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-semibold text-sky-300 truncate flex-1">
                    Plano: {refPlane.name || 'Imagem de Referência'}
                  </span>
                  {onUpdateRefPlane && (
                    <button
                      type="button"
                      onClick={() => onUpdateRefPlane({ visible: !refPlane.visible })}
                      title={refPlane.visible ? 'Ocultar' : 'Exibir'}
                      className="w-5 h-5 rounded hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                    >
                      {refPlane.visible ? (
                        <Eye className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  )}
                  {onClearRefPlane && (
                    <button
                      type="button"
                      onClick={onClearRefPlane}
                      title="Remover referência"
                      className="w-5 h-5 rounded hover:bg-red-950 text-red-400 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {onUpdateRefPlane && (
                  <>
                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'front', label: 'Frente' },
                          { id: 'side', label: 'Lado' },
                          { id: 'top', label: 'Topo' },
                        ] as const
                      ).map((ax) => (
                        <button
                          key={ax.id}
                          type="button"
                          onClick={() => onUpdateRefPlane({ axis: ax.id })}
                          className={`py-0.5 rounded border text-[9px] font-medium cursor-pointer ${
                            refPlane.axis === ax.id
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[#090C12] border-slate-800 text-slate-300'
                          }`}
                        >
                          {ax.label}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400">
                      <label className="flex flex-col gap-0.5">
                        <span>Opacidade ({Math.round(refPlane.opacity * 100)}%)</span>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={refPlane.opacity}
                          onChange={(e) =>
                            onUpdateRefPlane({ opacity: Number(e.target.value) })
                          }
                          className="accent-sky-400"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5">
                        <span>Escala ({refPlane.scale.toFixed(1)}x)</span>
                        <input
                          type="range"
                          min={0.25}
                          max={3.5}
                          step={0.05}
                          value={refPlane.scale}
                          onChange={(e) =>
                            onUpdateRefPlane({ scale: Number(e.target.value) })
                          }
                          className="accent-sky-400"
                        />
                      </label>
                    </div>
                  </>
                )}
              </div>
            )}

            {htmlReferences
              .filter(
                (hr) =>
                  !search.trim() ||
                  hr.name.toLowerCase().includes(search.trim().toLowerCase())
              )
              .map((hr) => (
                <div
                  key={hr.id}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                    selectedMeshId === hr.id
                      ? 'bg-orange-600/20 border-orange-500/60 text-white'
                      : 'bg-[#141923] border-slate-800 text-slate-300'
                  }`}
                >
                  <Code2 className="w-3 h-3 text-orange-400 shrink-0" />
                  <button
                    type="button"
                    onClick={() => onSelectMesh(hr.id)}
                    className="flex-1 min-w-0 text-left text-[10px] truncate cursor-pointer"
                  >
                    {hr.name}
                  </button>
                  {onToggleHtmlReferenceVisible && (
                    <button
                      type="button"
                      onClick={() => onToggleHtmlReferenceVisible(hr.id)}
                      className="w-5 h-5 rounded hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                    >
                      {hr.visible ? (
                        <Eye className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-slate-500" />
                      )}
                    </button>
                  )}
                  {onDeleteHtmlReference && (
                    <button
                      type="button"
                      onClick={() => onDeleteHtmlReference(hr.id)}
                      className="w-5 h-5 rounded hover:bg-red-950 text-red-400 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}

            {!refPlane?.active && htmlReferences.length === 0 && (
              <p className="px-2 py-3 text-center text-[10px] text-slate-500 leading-relaxed">
                Nenhuma referência ainda. Importe uma imagem 3D ou painel HTML — referências
                ficam apenas na viewport.
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

export const OutlinerPropertiesDock: React.FC<OutlinerPropertiesDockProps> = ({
  activePropTab,
  onSelectPropTab,
  onCollapseDock,
  meshes,
  selectedMeshId,
  riggedBoneNames,
  selectedBoneName,
  selectedInspector,
  currentFrameHasKey,
  trackHasAnyKey,
  onSelectMesh,
  onSelectBone,
  onSetMeshVisible,
  onSetMeshRenderVisible,
  onSetMeshLocked,
  onShowAllMeshes,
  onUpdateInspector,
  onAddKeyframeAtCurrent,
  onFrameSelected,
  onDuplicateSelected,
  onDeleteSelected,
  ikEnabled,
  onToggleIk,
  floorContactEnabled,
  onToggleFloorContact,
  weightPaintActive,
  onToggleWeightPaint,
  onRunAutoRig,
  morphTargets,
  onChangeMorphTarget,
  lighting,
  onLightingChange,
  onRenderPng,
  emitters,
  selectedEmitterId,
  onAddEmitter,
  onSelectEmitter,
  onUpdateEmitter,
  onRemoveEmitter,
  activeTextureMaps = {},
  onUploadTextureChannel,
  onClearTextureChannel,
  onBatchUploadTextures,
  riggedBoneTree = [],
  showSkeleton = true,
  onToggleSkeleton,
  onResetBone,
  onMirrorBonePose,
  onExportAnimatedGlb,
  refPlane,
  onImportReferenceImage,
  onUpdateRefPlane,
  onClearRefPlane,
  htmlReferences = [],
  onOpenHtmlTo3d,
  onToggleHtmlReferenceVisible,
  onDeleteHtmlReference,
  playMode = false,
  onTogglePlayMode,
  activeTemplate = 'glass_neon',
  onSelectTemplate,
  onApplyTemplate,
  hideDefaultBase = false,
  onToggleHideDefaultBase,
  toolMode = 'orbit',
  onSelectToolMode,
  onAddPrimitive,
  onRunBoolean,
  canRunBoolean = false,
  physicsActive = false,
  onTogglePhysicsActive,
  bloomEnabled = false,
  onToggleBloom,
  hideOutliner = false,
}) => {
  const [search, setSearch] = useState('');
  const [batchDropOver, setBatchDropOver] = useState(false);
  const batchFileRef = useRef<HTMLInputElement>(null);
  const slotFileRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<SubstanceChannelId>('baseColor');
  const [outlinerMode, setOutlinerMode] = useState<'meshes' | 'armature' | 'references'>('meshes');
  const [shapeFilter, setShapeFilter] = useState<'primitive' | 'vector'>('primitive');
  const [collapsedBones, setCollapsedBones] = useState<Record<string, boolean>>({});
  const [collapsedCols, setCollapsedCols] = useState<Record<string, boolean>>({});
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    transform: true,
    physics: false,
    interaction: false,
    shader: true,
  });

  useEffect(() => {
    if (selectedBoneName) {
      setOutlinerMode('armature');
    }
  }, [selectedBoneName]);

  // Drag-toggle state for Blender-style eye/camera/lock columns
  const dragActionRef = useRef<{
    kind: 'eye' | 'camera' | 'lock';
    targetValue: boolean;
  } | null>(null);

  const stopDrag = () => {
    dragActionRef.current = null;
    window.removeEventListener('pointerup', stopDrag);
  };

  const beginDragToggle = (
    kind: 'eye' | 'camera' | 'lock',
    id: string,
    nextVal: boolean
  ) => {
    dragActionRef.current = { kind, targetValue: nextVal };
    window.addEventListener('pointerup', stopDrag);
    if (kind === 'eye') onSetMeshVisible(id, nextVal);
    else if (kind === 'camera') onSetMeshRenderVisible(id, nextVal);
    else onSetMeshLocked(id, nextVal);
  };

  const applyDragEnter = (id: string) => {
    const d = dragActionRef.current;
    if (!d) return;
    if (d.kind === 'eye') onSetMeshVisible(id, d.targetValue);
    else if (d.kind === 'camera') onSetMeshRenderVisible(id, d.targetValue);
    else onSetMeshLocked(id, d.targetValue);
  };

  const filteredMeshes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return meshes;
    return meshes.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.collectionName || '').toLowerCase().includes(q) ||
        m.materialName.toLowerCase().includes(q)
    );
  }, [meshes, search]);

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

  const effectiveBoneNodes = useMemo<BoneHierarchyNode[]>(() => {
    if (riggedBoneTree.length > 0) return riggedBoneTree;
    return riggedBoneNames.map((name, idx) => ({
      name,
      parentName: idx === 0 ? null : riggedBoneNames[0],
    }));
  }, [riggedBoneTree, riggedBoneNames]);

  const boneChildrenMap = useMemo(() => {
    const map = new Map<string, BoneHierarchyNode[]>();
    const knownNames = new Set(effectiveBoneNodes.map((n) => n.name));
    for (const node of effectiveBoneNodes) {
      const key =
        node.parentName && knownNames.has(node.parentName) && node.parentName !== node.name
          ? node.parentName
          : '__ROOT__';
      const arr = map.get(key) || [];
      arr.push(node);
      map.set(key, arr);
    }
    return map;
  }, [effectiveBoneNodes]);

  const filteredBonesFlat = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return effectiveBoneNodes.filter((b) => b.name.toLowerCase().includes(q));
  }, [effectiveBoneNodes, search]);

  const toggleAccordion = (key: string) =>
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeEmitter =
    emitters.find((e) => e.id === selectedEmitterId) ?? emitters[0] ?? null;

  const keyDiamondClass = currentFrameHasKey
    ? 'text-amber-400 fill-amber-400'
    : trackHasAnyKey
    ? 'text-emerald-400 fill-emerald-400/40'
    : 'text-slate-600 hover:text-amber-300';

  const RAIL_TABS: { id: PropertiesTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'scene', label: 'Cena & Modelagem 3D', icon: <Shapes className="w-3.5 h-3.5" /> },
    { id: 'transform', label: 'Objeto & Transform', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'material', label: 'PBR & Shader', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'rig', label: 'Rig & Morphs', icon: <Bone className="w-3.5 h-3.5" /> },
    { id: 'lighting', label: 'Luz & Render', icon: <Sun className="w-3.5 h-3.5" /> },
    { id: 'vfx', label: 'VFX & Partículas', icon: <Flame className="w-3.5 h-3.5" /> },
  ];

  const refCount = (refPlane?.active ? 1 : 0) + htmlReferences.length;
  const activeTabTitle = RAIL_TABS.find((t) => t.id === activePropTab)?.label ?? 'Propriedades';

  return (
    <aside
      aria-label="Propriedades Estilo Blender"
      className="w-full lg:w-[350px] xl:w-[375px] max-h-[52vh] lg:max-h-none border-t lg:border-t-0 lg:border-l border-slate-800 bg-[#111622] flex flex-col shrink-0 min-h-0"
    >
      {hideOutliner ? (
        <div className="px-2.5 py-1.5 border-b border-slate-800 bg-[#0F131B] flex items-center justify-between gap-2 shrink-0">
          <span className="text-[11px] font-bold tracking-wider text-slate-200 uppercase truncate">
            {activeTabTitle}
          </span>
          <button
            type="button"
            onClick={onCollapseDock}
            title="Recolher coluna de propriedades"
            className="w-6 h-6 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
      /* TOP HALF — FIXED OUTLINER (Armature / Malhas / Referências) */
      <div className="flex flex-col h-[40%] min-h-[175px] border-b border-slate-800 bg-[#0F131B]">
        <div className="px-2 py-1.5 border-b border-slate-800 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 min-w-0 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setOutlinerMode('armature')}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                outlinerMode === 'armature'
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/45'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <Bone className="w-3 h-3 shrink-0" />
              <span>Armature ({riggedBoneNames.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setOutlinerMode('meshes')}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                outlinerMode === 'meshes'
                  ? 'bg-orange-600/25 text-orange-300 border border-orange-500/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <Layers className="w-3 h-3 shrink-0" />
              <span>Malhas ({meshes.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setOutlinerMode('references')}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                outlinerMode === 'references'
                  ? 'bg-sky-600/20 text-sky-300 border border-sky-500/45'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              <ImageIcon className="w-3 h-3 shrink-0" />
              <span>Ref. ({refCount})</span>
            </button>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onShowAllMeshes}
              title="Exibir todas as malhas"
              className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 cursor-pointer"
            >
              Tudo
            </button>
            <button
              type="button"
              onClick={onCollapseDock}
              title="Recolher coluna direita"
              className="w-6 h-6 rounded hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="px-2 py-1.5 border-b border-slate-800/80">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#090C12] border border-slate-800 focus-within:border-orange-500">
            <Search className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                outlinerMode === 'armature'
                  ? 'Filtrar osso da Armature...'
                  : outlinerMode === 'references'
                  ? 'Filtrar referências...'
                  : 'Filtrar coleção ou objeto...'
              }
              className="w-full bg-transparent text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 text-[11px]">
          {outlinerMode === 'meshes' &&
            collections.map(([colName, items]) => {
              const isCollapsed = Boolean(collapsedCols[colName]);
              return (
                <div key={colName} className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedCols((prev) => ({ ...prev, [colName]: !prev[colName] }))
                    }
                    className="w-full flex items-center gap-1 px-1.5 py-1 rounded hover:bg-slate-800/60 text-[10px] font-mono uppercase tracking-wider text-slate-400 cursor-pointer"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 shrink-0" />
                    )}
                    <FolderOpen className="w-3 h-3 text-amber-400/80 shrink-0" />
                    <span className="truncate flex-1 text-left">{colName}</span>
                    <span className="text-slate-500">{items.length}</span>
                  </button>

                  {!isCollapsed &&
                    items.map((item) => {
                      const isSelected = selectedMeshId === item.id;
                      const renderOn = item.renderVisible !== false;
                      return (
                        <div
                          key={item.id}
                          className={`group flex items-center gap-1 pl-4 pr-1.5 py-1 rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-orange-600/20 border-orange-500/60 text-white'
                              : 'bg-transparent border-transparent hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => !item.locked && onSelectMesh(item.id)}
                            className={`flex-1 min-w-0 text-left truncate ${
                              item.locked ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                            title={`${item.name} · ${item.triCount.toLocaleString()} tris`}
                          >
                            {item.name}
                          </button>

                          {/* Hover / Active Visibility, Render Camera & Selection Lock with vertical drag-toggle */}
                          <div
                            className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
                              !item.visible || !renderOn || item.locked
                                ? 'opacity-100'
                                : 'opacity-25 group-hover:opacity-100'
                            }`}
                          >
                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                beginDragToggle('eye', item.id, !item.visible);
                              }}
                              onPointerEnter={() => applyDragEnter(item.id)}
                              title={item.visible ? 'Ocultar na viewport (arraste)' : 'Exibir na viewport'}
                              className="w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              {item.visible ? (
                                <Eye className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <EyeOff className="w-3 h-3 text-slate-500" />
                              )}
                            </button>

                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                beginDragToggle('camera', item.id, !renderOn);
                              }}
                              onPointerEnter={() => applyDragEnter(item.id)}
                              title={renderOn ? 'Desativar no Render PNG' : 'Ativar no Render PNG'}
                              className="w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              {renderOn ? (
                                <Camera className="w-3 h-3 text-sky-400" />
                              ) : (
                                <VideoOff className="w-3 h-3 text-slate-500" />
                              )}
                            </button>

                            <button
                              type="button"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                beginDragToggle('lock', item.id, !item.locked);
                              }}
                              onPointerEnter={() => applyDragEnter(item.id)}
                              title={item.locked ? 'Destravar seleção' : 'Travar seleção'}
                              className="w-5 h-5 rounded hover:bg-slate-700 flex items-center justify-center cursor-pointer"
                            >
                              {item.locked ? (
                                <Lock className="w-3 h-3 text-amber-400" />
                              ) : (
                                <Unlock className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}

          {outlinerMode === 'armature' && riggedBoneNames.length > 0 && (
            <div className="space-y-0.5">
              {filteredBonesFlat ? (
                filteredBonesFlat.length === 0 ? (
                  <div className="px-2 py-3 text-center text-[10px] text-slate-500">
                    Nenhum osso encontrado para "{search}".
                  </div>
                ) : (
                  filteredBonesFlat.map((bn) => {
                    const isSelected = selectedBoneName === bn.name;
                    const isIkEnd = /(hand|wrist|foot|ankle)_(l|r)$/i.test(bn.name);
                    return (
                      <button
                        key={bn.name}
                        type="button"
                        onClick={() => onSelectBone(bn.name)}
                        className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-[10px] font-mono cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600/25 border border-orange-500/60 text-white'
                            : 'hover:bg-slate-800/60 text-slate-300 border border-transparent'
                        }`}
                      >
                        <Bone
                          className={`w-3 h-3 shrink-0 ${
                            isSelected ? 'text-orange-400' : isIkEnd ? 'text-yellow-400' : 'text-cyan-400'
                          }`}
                        />
                        <span className="truncate flex-1">{bn.name}</span>
                        {isIkEnd && (
                          <span className="text-[9px] text-yellow-400/90 font-semibold">IK</span>
                        )}
                      </button>
                    );
                  })
                )
              ) : (
                (() => {
                  const renderBoneBranch = (node: BoneHierarchyNode, depth: number): React.ReactNode => {
                    const children = boneChildrenMap.get(node.name) || [];
                    const hasKids = children.length > 0;
                    const isCollapsed = Boolean(collapsedBones[node.name]);
                    const isSelected = selectedBoneName === node.name;
                    const isIkEnd = /(hand|wrist|foot|ankle)_(l|r)$/i.test(node.name);
                    return (
                      <div key={node.name}>
                        <div
                          style={{ paddingLeft: `${Math.min(depth, 6) * 12 + 4}px` }}
                          className={`flex items-center gap-1 pr-1.5 py-0.5 rounded-md border transition-colors ${
                            isSelected
                              ? 'bg-orange-600/25 border-orange-500/60 text-white'
                              : 'border-transparent hover:bg-slate-800/50 text-slate-300'
                          }`}
                        >
                          {hasKids ? (
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedBones((prev) => ({
                                  ...prev,
                                  [node.name]: !prev[node.name],
                                }))
                              }
                              className="w-4 h-4 rounded hover:bg-slate-700/70 flex items-center justify-center text-slate-400 shrink-0 cursor-pointer"
                            >
                              {isCollapsed ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="w-4 shrink-0" />
                          )}
                          <button
                            type="button"
                            onClick={() => onSelectBone(node.name)}
                            className="flex-1 min-w-0 flex items-center gap-1.5 py-0.5 text-left text-[10px] font-mono truncate cursor-pointer"
                          >
                            <Bone
                              className={`w-3 h-3 shrink-0 ${
                                isSelected
                                  ? 'text-orange-400'
                                  : isIkEnd
                                  ? 'text-yellow-400'
                                  : 'text-cyan-400'
                              }`}
                            />
                            <span className="truncate">{node.name}</span>
                          </button>
                          {isIkEnd && (
                            <span className="text-[9px] text-yellow-400 font-semibold shrink-0">
                              IK
                            </span>
                          )}
                        </div>
                        {hasKids &&
                          !isCollapsed &&
                          children.map((ch) => renderBoneBranch(ch, depth + 1))}
                      </div>
                    );
                  };
                  return (boneChildrenMap.get('__ROOT__') || []).map((rootBone) =>
                    renderBoneBranch(rootBone, 0)
                  );
                })()
              )}
            </div>
          )}
          {outlinerMode === 'armature' && riggedBoneNames.length === 0 && (
            <div className="p-3 text-center space-y-2">
              <p className="text-[10px] text-slate-400">
                Nenhum esqueleto ativo na cena. Aplique o Auto-Rig para gerar a Armature.
              </p>
              <button
                type="button"
                onClick={onRunAutoRig}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[10px] cursor-pointer"
              >
                Aplicar Auto-Rig
              </button>
            </div>
          )}

          {outlinerMode === 'references' && (
            <div className="space-y-2 p-0.5">
              <div className="grid grid-cols-2 gap-1.5">
                {onImportReferenceImage && (
                  <button
                    type="button"
                    onClick={onImportReferenceImage}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#090C12] border border-slate-800 hover:border-sky-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                  >
                    <ImageIcon className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="truncate">Ref. Imagem 3D</span>
                  </button>
                )}
                {onOpenHtmlTo3d && (
                  <button
                    type="button"
                    onClick={onOpenHtmlTo3d}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#090C12] border border-slate-800 hover:border-orange-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                  >
                    <Code2 className="w-3 h-3 text-orange-400 shrink-0" />
                    <span className="truncate">HTML → 3D</span>
                  </button>
                )}
              </div>

              {refPlane?.active && (
                <div className="rounded-lg bg-[#141923] border border-slate-800 p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-[10px] font-semibold text-sky-300 truncate flex-1">
                      Plano: {refPlane.name || 'Imagem de Referência'}
                    </span>
                    {onUpdateRefPlane && (
                      <button
                        type="button"
                        onClick={() => onUpdateRefPlane({ visible: !refPlane.visible })}
                        title={refPlane.visible ? 'Ocultar' : 'Exibir'}
                        className="w-5 h-5 rounded hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                      >
                        {refPlane.visible ? (
                          <Eye className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    )}
                    {onClearRefPlane && (
                      <button
                        type="button"
                        onClick={onClearRefPlane}
                        title="Remover referência"
                        className="w-5 h-5 rounded hover:bg-red-950 text-red-400 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {onUpdateRefPlane && (
                    <>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            { id: 'front', label: 'Frente' },
                            { id: 'side', label: 'Lado' },
                            { id: 'top', label: 'Topo' },
                          ] as const
                        ).map((ax) => (
                          <button
                            key={ax.id}
                            type="button"
                            onClick={() => onUpdateRefPlane({ axis: ax.id })}
                            className={`py-0.5 rounded border text-[9px] font-medium cursor-pointer ${
                              refPlane.axis === ax.id
                                ? 'bg-sky-600 border-sky-500 text-white'
                                : 'bg-[#090C12] border-slate-800 text-slate-300'
                            }`}
                          >
                            {ax.label}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] text-slate-400">
                        <label className="flex flex-col gap-0.5">
                          <span>Opacidade ({Math.round(refPlane.opacity * 100)}%)</span>
                          <input
                            type="range"
                            min={0.1}
                            max={1}
                            step={0.05}
                            value={refPlane.opacity}
                            onChange={(e) =>
                              onUpdateRefPlane({ opacity: Number(e.target.value) })
                            }
                            className="accent-sky-400"
                          />
                        </label>
                        <label className="flex flex-col gap-0.5">
                          <span>Escala ({refPlane.scale.toFixed(1)}x)</span>
                          <input
                            type="range"
                            min={0.25}
                            max={3.5}
                            step={0.05}
                            value={refPlane.scale}
                            onChange={(e) =>
                              onUpdateRefPlane({ scale: Number(e.target.value) })
                            }
                            className="accent-sky-400"
                          />
                        </label>
                      </div>
                    </>
                  )}
                </div>
              )}

              {htmlReferences
                .filter(
                  (hr) =>
                    !search.trim() ||
                    hr.name.toLowerCase().includes(search.trim().toLowerCase())
                )
                .map((hr) => (
                  <div
                    key={hr.id}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${
                      selectedMeshId === hr.id
                        ? 'bg-orange-600/20 border-orange-500/60 text-white'
                        : 'bg-[#141923] border-slate-800 text-slate-300'
                    }`}
                  >
                    <Code2 className="w-3 h-3 text-orange-400 shrink-0" />
                    <button
                      type="button"
                      onClick={() => onSelectMesh(hr.id)}
                      className="flex-1 min-w-0 text-left text-[10px] truncate cursor-pointer"
                    >
                      {hr.name}
                    </button>
                    {onToggleHtmlReferenceVisible && (
                      <button
                        type="button"
                        onClick={() => onToggleHtmlReferenceVisible(hr.id)}
                        className="w-5 h-5 rounded hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                      >
                        {hr.visible ? (
                          <Eye className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-slate-500" />
                        )}
                      </button>
                    )}
                    {onDeleteHtmlReference && (
                      <button
                        type="button"
                        onClick={() => onDeleteHtmlReference(hr.id)}
                        className="w-5 h-5 rounded hover:bg-red-950 text-red-400 flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

              {!refPlane?.active && htmlReferences.length === 0 && (
                <p className="px-2 py-3 text-center text-[10px] text-slate-500 leading-relaxed">
                  Nenhuma referência ainda. Importe uma imagem 3D ou painel HTML — referências
                  ficam apenas na viewport.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      {/* PROPERTIES WITH VERTICAL ICON RAIL */}
      <div className="flex-1 min-h-0 flex bg-[#111622]">
        {/* Vertical Icon Rail (Blender Properties Style) */}
        <nav
          aria-label="Abas de propriedades"
          className="w-10 border-r border-slate-800 bg-[#0B0E14] py-2 flex flex-col items-center gap-1.5 shrink-0"
        >
          {RAIL_TABS.map((t) => {
            const active = activePropTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectPropTab(t.id)}
                title={t.label}
                aria-label={t.label}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                  active
                    ? 'bg-orange-600 text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {t.icon}
              </button>
            );
          })}
        </nav>

        {/* Properties Body */}
        <div className="flex-1 min-w-0 overflow-y-auto p-2.5 space-y-2.5 text-xs">
          {/* TAB 0: CENA & MODELAGEM 3D (Templates, Gizmo, Primitivas, Vetor 3D, CSG, Física & Bloom) */}
          {activePropTab === 'scene' && (
            <div className="space-y-2.5">
              <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold tracking-wide text-white uppercase flex items-center gap-1.5">
                      <Shapes className="w-3.5 h-3.5 text-sky-400" />
                      <span>CENA &amp; MODELAGEM 3D</span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {playMode ? 'Play Interativo' : 'Editar'} · {meshes.length} objeto(s)
                    </div>
                  </div>
                </div>

                {/* Editar / Play */}
                {onTogglePlayMode && (
                  <div className="grid grid-cols-2 rounded-lg bg-[#090C12] border border-slate-800 p-0.5 gap-0.5">
                    <button
                      type="button"
                      onClick={() => onTogglePlayMode(false)}
                      className={`py-1 rounded-md text-[10px] font-semibold cursor-pointer ${
                        !playMode
                          ? 'bg-sky-600/30 border border-sky-500/50 text-sky-200'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => onTogglePlayMode(true)}
                      className={`inline-flex items-center justify-center gap-1 py-1 rounded-md text-[10px] font-semibold cursor-pointer ${
                        playMode
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {playMode ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span>Play</span>
                    </button>
                  </div>
                )}

                {/* Templates Procedurais 3D */}
                {onSelectTemplate && onApplyTemplate && (
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400">Templates Procedurais 3D</span>
                    <div className="flex items-center gap-1.5">
                      <select
                        value={activeTemplate}
                        onChange={(e) => onSelectTemplate(e.target.value as SplineTemplateId)}
                        className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-[#090C12] border border-slate-800 text-[11px] text-slate-100"
                      >
                        {SPLINE_TEMPLATES.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => onApplyTemplate(activeTemplate)}
                        className="px-3 py-1.5 rounded-lg bg-sky-600/25 border border-sky-500/60 hover:bg-sky-600 text-sky-200 hover:text-white font-semibold text-[11px] cursor-pointer shrink-0"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                )}

                {/* Gizmo 3D (Transformação) */}
                {onSelectToolMode && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Gizmo 3D (Transformação)</span>
                      {onToggleHideDefaultBase && (
                        <button
                          type="button"
                          onClick={onToggleHideDefaultBase}
                          className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
                        >
                          {hideDefaultBase ? (
                            <EyeOff className="w-3 h-3 text-slate-500" />
                          ) : (
                            <Eye className="w-3 h-3 text-emerald-400" />
                          )}
                          <span>{hideDefaultBase ? 'Base oculta' : 'Base visível'}</span>
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'orbit', label: 'Órbita', icon: <MousePointer className="w-3 h-3" /> },
                          { id: 'translate', label: 'Mover', icon: <Move className="w-3 h-3" /> },
                          { id: 'rotate', label: 'Girar', icon: <RotateCw className="w-3 h-3" /> },
                          { id: 'scale', label: 'Escala', icon: <Scaling className="w-3 h-3" /> },
                        ] as { id: SplineToolMode; label: string; icon: React.ReactNode }[]
                      ).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => onSelectToolMode(g.id)}
                          className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg border text-[10px] font-medium cursor-pointer ${
                            toolMode === g.id
                              ? 'bg-orange-600/25 border-orange-500 text-orange-200'
                              : 'bg-[#090C12] border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {g.icon}
                          <span>{g.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adicionar Forma (Primitivas | Vetor 3D) */}
                {onAddPrimitive && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400">Adicionar Forma</span>
                      <div className="inline-flex rounded bg-[#090C12] border border-slate-800 p-0.5">
                        <button
                          type="button"
                          onClick={() => setShapeFilter('primitive')}
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold cursor-pointer ${
                            shapeFilter === 'primitive'
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          Primitivas
                        </button>
                        <button
                          type="button"
                          onClick={() => setShapeFilter('vector')}
                          className={`px-2 py-0.5 rounded text-[9px] font-semibold cursor-pointer ${
                            shapeFilter === 'vector'
                              ? 'bg-slate-700 text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          Vetor 3D
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {PRIMITIVE_CATALOG.filter((item) => item.category === shapeFilter).map(
                        (item) => (
                          <button
                            key={item.kind}
                            type="button"
                            onClick={() => onAddPrimitive(item.kind)}
                            className="inline-flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg bg-[#090C12] border border-slate-800 hover:border-sky-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                          >
                            <Plus className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Booleana CSG */}
                {onRunBoolean && (
                  <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-300 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>Booleana CSG (2 malhas)</span>
                      </span>
                    </div>
                    {canRunBoolean ? (
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => onRunBoolean('union')}
                          className="py-1 rounded-lg bg-[#090C12] border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-200 cursor-pointer"
                        >
                          União
                        </button>
                        <button
                          type="button"
                          onClick={() => onRunBoolean('subtract')}
                          className="py-1 rounded-lg bg-[#090C12] border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-200 cursor-pointer"
                        >
                          Subtrair
                        </button>
                        <button
                          type="button"
                          onClick={() => onRunBoolean('intersect')}
                          className="py-1 rounded-lg bg-[#090C12] border border-slate-800 hover:border-cyan-500 text-[10px] text-slate-200 cursor-pointer"
                        >
                          Interseção
                        </button>
                      </div>
                    ) : (
                      <div className="p-2 rounded-lg bg-[#090C12] border border-slate-800 text-[10px] text-slate-400 leading-relaxed">
                        Adicione 2+ formas acima para combinar via Booleana CSG.
                      </div>
                    )}
                  </div>
                )}

                {/* Física: Gravidade & Bloom: Pós-FX */}
                {(onTogglePhysicsActive || onToggleBloom) && (
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {onTogglePhysicsActive && (
                      <button
                        type="button"
                        onClick={onTogglePhysicsActive}
                        className={`py-1.5 px-2 rounded-lg border text-[10px] font-semibold cursor-pointer ${
                          physicsActive
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                            : 'bg-[#090C12] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        Física: Gravidade
                      </button>
                    )}
                    {onToggleBloom && (
                      <button
                        type="button"
                        onClick={onToggleBloom}
                        className={`py-1.5 px-2 rounded-lg border text-[10px] font-semibold cursor-pointer ${
                          bloomEnabled
                            ? 'bg-pink-600/20 border-pink-500 text-pink-300'
                            : 'bg-[#090C12] border-slate-800 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        Bloom: Pós-FX
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: OBJECT TRANSFORM + RIGID BODY + INTERACTION */}
          {activePropTab === 'transform' && (
            <>
              {selectedInspector ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-1.5">
                    <input
                      type="text"
                      value={selectedInspector.name}
                      onChange={(e) => onUpdateInspector({ name: e.target.value })}
                      aria-label="Nome do objeto"
                      className="flex-1 min-w-0 px-2 py-1 rounded bg-[#090C12] border border-slate-800 focus:border-orange-500 outline-none text-xs font-semibold text-white"
                    />
                    <button
                      type="button"
                      onClick={onFrameSelected}
                      title="Enquadrar (F)"
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 flex items-center justify-center cursor-pointer"
                    >
                      <Focus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onDuplicateSelected}
                      title="Duplicar"
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={onDeleteSelected}
                      title="Remover (Del)"
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-red-950 text-red-400 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {selectedBoneName && (
                    <div className="rounded-lg bg-cyan-950/25 border border-cyan-500/35 p-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono font-semibold text-cyan-300 truncate">
                          PoseBone: {selectedBoneName}
                        </span>
                        <span className="text-slate-400">W/E/R · K</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={onAddKeyframeAtCurrent}
                          className="inline-flex items-center justify-center gap-1 py-1 rounded bg-amber-600 hover:bg-amber-500 text-[10px] font-semibold text-white cursor-pointer"
                        >
                          <Diamond className="w-3 h-3" />
                          <span>Key (K)</span>
                        </button>
                        {onMirrorBonePose && (
                          <button
                            type="button"
                            onClick={onMirrorBonePose}
                            title="Espelhar pose entre L e R"
                            className="inline-flex items-center justify-center gap-1 py-1 rounded bg-[#090C12] border border-slate-700 hover:border-cyan-400 text-[10px] text-slate-200 cursor-pointer"
                          >
                            <FlipHorizontal2 className="w-3 h-3 text-cyan-400" />
                            <span>L↔R</span>
                          </button>
                        )}
                        {onResetBone && (
                          <button
                            type="button"
                            onClick={onResetBone}
                            title="Resetar este osso para Rest Pose"
                            className="inline-flex items-center justify-center gap-1 py-1 rounded bg-[#090C12] border border-slate-700 hover:border-orange-400 text-[10px] text-slate-200 cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3 text-orange-400" />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Accordion: Transform Pills */}
                  <div className="rounded-lg bg-[#141923] border border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAccordion('transform')}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between bg-[#0F131B] text-[11px] font-semibold text-white cursor-pointer"
                    >
                      <span>Transform (Blender Z↔Y Auto)</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          openAccordions.transform ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    {openAccordions.transform && (
                      <div className="p-2.5 space-y-2.5">
                        {(
                          [
                            { key: 'position', label: 'Localização (m)', vals: selectedInspector.position, step: 0.05, def: 0 },
                            { key: 'rotationDeg', label: 'Rotação (°)', vals: selectedInspector.rotationDeg, step: 1.5, def: 0 },
                            { key: 'scale', label: 'Escala', vals: selectedInspector.scale, step: 0.04, def: 1 },
                          ] as const
                        ).map((grp) => (
                          <div key={grp.key} className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>{grp.label}</span>
                              <button
                                type="button"
                                onClick={onAddKeyframeAtCurrent}
                                title="Inserir Keyframe no frame atual (◆)"
                                className="p-0.5 rounded hover:bg-slate-800 cursor-pointer"
                              >
                                <Diamond className={`w-3 h-3 ${keyDiamondClass}`} />
                              </button>
                            </div>
                            <div className="grid grid-cols-3 gap-1">
                              {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                                <NumberScrubber
                                  key={axis}
                                  axis={axis}
                                  value={grp.vals[idx]}
                                  step={grp.step}
                                  defaultValue={grp.def}
                                  onChange={(val) => {
                                    const next: [number, number, number] = [...grp.vals];
                                    next[idx] = val;
                                    onUpdateInspector({ [grp.key]: next });
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Accordion: Rigid Body Physics */}
                  <div className="rounded-lg bg-[#141923] border border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAccordion('physics')}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between bg-[#0F131B] text-[11px] font-semibold text-white cursor-pointer"
                    >
                      <span>Física (RigidBodyObject)</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          openAccordions.physics ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    {openAccordions.physics && (
                      <div className="p-2.5 space-y-2">
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: 'none', label: 'Sem Física' },
                              { id: 'static', label: 'Estático' },
                              { id: 'dynamic', label: 'Dinâmico' },
                            ] as { id: RigidBodyMode; label: string }[]
                          ).map((rb) => (
                            <button
                              key={rb.id}
                              type="button"
                              onClick={() =>
                                onUpdateInspector({
                                  rigidBodyMode: rb.id,
                                  physicsEnabled: rb.id === 'dynamic',
                                })
                              }
                              className={`py-1.5 rounded border text-[10px] font-medium cursor-pointer ${
                                selectedInspector.rigidBodyMode === rb.id
                                  ? 'bg-orange-600 border-orange-500 text-white'
                                  : 'bg-[#090C12] border-slate-800 text-slate-300'
                              }`}
                            >
                              {rb.label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Estático = colisor fixo (chão/parede); Dinâmico = cai com gravidade e colide.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Accordion: Web Interaction */}
                  <div className="rounded-lg bg-[#141923] border border-slate-800 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleAccordion('interaction')}
                      className="w-full px-2.5 py-1.5 flex items-center justify-between bg-[#0F131B] text-[11px] font-semibold text-white cursor-pointer"
                    >
                      <span>Interatividade Web</span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform ${
                          openAccordions.interaction ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </button>
                    {openAccordions.interaction && (
                      <div className="p-2.5 space-y-2">
                        <select
                          value={selectedInspector.interaction}
                          onChange={(e) =>
                            onUpdateInspector({
                              interaction: e.target.value as SplineInteractionType,
                            })
                          }
                          className="w-full px-2 py-1.5 rounded bg-[#090C12] border border-slate-800 text-[11px] text-slate-200"
                        >
                          {SPLINE_INTERACTION_OPTIONS.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[#141923] border border-slate-800 text-[11px] text-slate-400 text-center">
                  Clique em uma malha na cena 3D ou no Outliner acima para editar Transform, Física e Keyframes.
                </div>
              )}
            </>
          )}

          {/* TAB 2: PBR PRINCIPLED BSDF & REACTIVE SHADERS */}
          {activePropTab === 'material' && (
            <>
              {selectedInspector ? (
                <div className="space-y-2.5">
                  <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white">
                        ShaderNodeBsdfPrincipled
                      </span>
                      <input
                        type="color"
                        value={selectedInspector.color}
                        onChange={(e) => onUpdateInspector({ color: e.target.value })}
                        title="Base Color"
                        className="w-7 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                    </div>

                    <select
                      value={selectedInspector.materialStyle}
                      onChange={(e) =>
                        onUpdateInspector({
                          materialStyle: e.target.value as SplineMaterialStyle,
                        })
                      }
                      className="w-full px-2 py-1.5 rounded bg-[#090C12] border border-slate-800 text-[11px] text-slate-200"
                    >
                      {SPLINE_MATERIAL_STYLES.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.label}
                        </option>
                      ))}
                    </select>

                    <PbrSlider
                      label="Metallic"
                      blenderSocket="Metallic"
                      value={selectedInspector.metalness}
                      min={0}
                      max={1}
                      defaultValue={0.2}
                      onChange={(v) => onUpdateInspector({ metalness: v })}
                    />
                    <PbrSlider
                      label="Roughness"
                      blenderSocket="Roughness"
                      value={selectedInspector.roughness}
                      min={0.04}
                      max={1}
                      defaultValue={0.35}
                      onChange={(v) => onUpdateInspector({ roughness: v })}
                    />
                    <PbrSlider
                      label="Transmissão (Vidro)"
                      blenderSocket="Transmission Weight"
                      value={selectedInspector.transmission}
                      min={0}
                      max={1}
                      defaultValue={0}
                      accentHex="#38bdf8"
                      onChange={(v) => onUpdateInspector({ transmission: v })}
                    />
                    <PbrSlider
                      label="Emissão (Emission)"
                      blenderSocket="Emission Strength"
                      value={selectedInspector.emissiveIntensity}
                      min={0}
                      max={3}
                      step={0.05}
                      defaultValue={0}
                      accentHex="#a855f7"
                      onChange={(v) => onUpdateInspector({ emissiveIntensity: v })}
                    />
                  </div>

                  {/* Per-Slot PBR Texture Maps & Batch Auto-Map */}
                  {(onUploadTextureChannel || onBatchUploadTextures) && (
                    <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2">
                      <input
                        ref={batchFileRef}
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length && onBatchUploadTextures) {
                            onBatchUploadTextures(Array.from(e.target.files));
                          }
                          e.target.value = '';
                        }}
                      />
                      <input
                        ref={slotFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f && onUploadTextureChannel) {
                            onUploadTextureChannel(pendingSlotRef.current, f);
                          }
                          e.target.value = '';
                        }}
                      />

                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                          <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                          <span>Mapas PBR (Slots & Lote)</span>
                        </span>
                        {onBatchUploadTextures && (
                          <button
                            type="button"
                            onClick={() => batchFileRef.current?.click()}
                            title="Selecionar múltiplos mapas PBR (_albedo, _normal, _roughness, _metallic, _ao)"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600 text-[10px] font-medium text-orange-200 hover:text-white cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Auto-Map Lote</span>
                          </button>
                        )}
                      </div>

                      {onBatchUploadTextures && (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setBatchDropOver(true);
                          }}
                          onDragLeave={() => setBatchDropOver(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setBatchDropOver(false);
                            if (e.dataTransfer.files.length > 0) {
                              onBatchUploadTextures(Array.from(e.dataTransfer.files));
                            }
                          }}
                          onClick={() => batchFileRef.current?.click()}
                          className={`rounded-md border border-dashed px-2 py-1.5 text-center text-[10px] cursor-pointer transition-colors ${
                            batchDropOver
                              ? 'border-orange-400 bg-orange-500/15 text-orange-200'
                              : 'border-slate-700 bg-[#090C12] text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          Arraste texturas PBR aqui para mapear canais automaticamente
                        </div>
                      )}

                      <div className="space-y-1">
                        {(
                          [
                            { id: 'baseColor', label: 'Albedo (sRGB)' },
                            { id: 'normal', label: 'Normal Map' },
                            { id: 'roughness', label: 'Roughness' },
                            { id: 'metallic', label: 'Metalness' },
                            { id: 'emissive', label: 'Emissive' },
                            { id: 'ao', label: 'Ambient Occ. (AO)' },
                          ] as { id: SubstanceChannelId; label: string }[]
                        ).map((slot) => {
                          const previewUrl = activeTextureMaps[slot.id];
                          return (
                            <div
                              key={slot.id}
                              className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#090C12] border border-slate-800/90"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {previewUrl ? (
                                  <img
                                    src={previewUrl}
                                    alt={slot.label}
                                    className="w-5 h-5 rounded object-cover border border-slate-700 shrink-0"
                                  />
                                ) : (
                                  <span className="w-5 h-5 rounded bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-[9px] font-mono text-slate-500 shrink-0">
                                    --
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-200 truncate">
                                  {slot.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                {onUploadTextureChannel && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      pendingSlotRef.current = slot.id;
                                      slotFileRef.current?.click();
                                    }}
                                    title={`Carregar textura para ${slot.label}`}
                                    className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 cursor-pointer"
                                  >
                                    {previewUrl ? 'Trocar' : 'Enviar'}
                                  </button>
                                )}
                                {previewUrl && onClearTextureChannel && (
                                  <button
                                    type="button"
                                    onClick={() => onClearTextureChannel(slot.id)}
                                    title={`Remover textura de ${slot.label}`}
                                    className="w-5 h-5 rounded hover:bg-red-950 text-slate-400 hover:text-red-300 flex items-center justify-center cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Reactive Shader Effects */}
                  <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Shaders Reativos (GLSL)</span>
                      </span>
                      <input
                        type="color"
                        value={selectedInspector.shaderEffect.color}
                        onChange={(e) =>
                          onUpdateInspector({
                            shaderEffect: {
                              ...selectedInspector.shaderEffect,
                              color: e.target.value,
                            },
                          })
                        }
                        className="w-6 h-5 rounded border border-slate-700 bg-transparent cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      {(
                        [
                          { id: 'none', label: 'Desativado' },
                          { id: 'fresnel', label: 'Fresnel Borda' },
                          { id: 'dissolve', label: 'Dissolve Ruído' },
                          { id: 'hologram', label: 'Holograma' },
                          { id: 'distortion', label: 'Distorção Onda' },
                        ] as { id: ReactiveShaderEffect; label: string }[]
                      ).map((fx) => (
                        <button
                          key={fx.id}
                          type="button"
                          onClick={() =>
                            onUpdateInspector({
                              shaderEffect: {
                                ...selectedInspector.shaderEffect,
                                effect: fx.id,
                              },
                            })
                          }
                          className={`px-2 py-1 rounded text-[10px] font-medium border cursor-pointer ${
                            selectedInspector.shaderEffect.effect === fx.id
                              ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200'
                              : 'bg-[#090C12] border-slate-800 text-slate-400'
                          }`}
                        >
                          {fx.label}
                        </button>
                      ))}
                    </div>

                    {selectedInspector.shaderEffect.effect !== 'none' && (
                      <div className="space-y-1.5 pt-1">
                        <PbrSlider
                          label="Intensidade Efeito"
                          value={selectedInspector.shaderEffect.intensity}
                          min={0.05}
                          max={1}
                          defaultValue={0.55}
                          accentHex="#06b6d4"
                          onChange={(v) =>
                            onUpdateInspector({
                              shaderEffect: {
                                ...selectedInspector.shaderEffect,
                                intensity: v,
                              },
                            })
                          }
                        />
                        <PbrSlider
                          label="Velocidade Shader"
                          value={selectedInspector.shaderEffect.speed}
                          min={0.2}
                          max={3}
                          defaultValue={1.0}
                          accentHex="#06b6d4"
                          onChange={(v) =>
                            onUpdateInspector({
                              shaderEffect: {
                                ...selectedInspector.shaderEffect,
                                speed: v,
                              },
                            })
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-[#141923] border border-slate-800 text-[11px] text-slate-400 text-center">
                  Selecione um objeto na cena para ajustar Base Color, Metallic, Roughness e Shaders Reativos.
                </div>
              )}
            </>
          )}

          {/* TAB 3: RIG, IK & MORPH TARGETS */}
          {activePropTab === 'rig' && (
            <div className="space-y-2.5">
              <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2">
                <div className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                  <Bone className="w-3.5 h-3.5 text-orange-400" />
                  <span>Controles IK / Pesos</span>
                </div>

                {riggedBoneNames.length === 0 ? (
                  <button
                    type="button"
                    onClick={onRunAutoRig}
                    className="w-full py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[11px] cursor-pointer"
                  >
                    Aplicar Auto-Rig Automático
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {onToggleSkeleton && (
                      <button
                        type="button"
                        onClick={onToggleSkeleton}
                        className={`w-full py-1.5 px-2 rounded border text-[11px] font-medium cursor-pointer flex items-center justify-between ${
                          showSkeleton
                            ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                            : 'bg-[#090C12] border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>Ossos X-Ray (Ciano + IK)</span>
                        <span>{showSkeleton ? 'ON' : 'OFF'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onToggleIk}
                      className={`w-full py-1.5 px-2 rounded border text-[11px] font-medium cursor-pointer flex items-center justify-between ${
                        ikEnabled
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                          : 'bg-[#090C12] border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>Alvos IK (Mãos/Pés)</span>
                      <span>{ikEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleFloorContact}
                      className={`w-full py-1.5 px-2 rounded border text-[11px] font-medium cursor-pointer flex items-center justify-between ${
                        floorContactEnabled
                          ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                          : 'bg-[#090C12] border-slate-800 text-slate-300'
                      }`}
                    >
                      <span>Fixar Pés no Chão</span>
                      <span>{floorContactEnabled ? 'ON' : 'OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={onToggleWeightPaint}
                      className={`w-full py-1.5 px-2 rounded border text-[11px] font-medium cursor-pointer flex items-center justify-between ${
                        weightPaintActive
                          ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                          : 'bg-[#090C12] border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Paintbrush className="w-3 h-3" />
                        <span>Pintura de Pesos</span>
                      </span>
                      <span>{weightPaintActive ? 'ON' : 'OFF'}</span>
                    </button>

                    {onExportAnimatedGlb && (
                      <button
                        type="button"
                        onClick={onExportAnimatedGlb}
                        className="w-full py-1.5 px-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold text-[11px] cursor-pointer flex items-center justify-center gap-1.5 mt-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar .GLB Animado</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2">
                <div className="font-semibold text-white text-[11px]">
                  Blendshapes / Shape Keys ({morphTargets.length})
                </div>
                {morphTargets.length === 0 ? (
                  <p className="text-[10px] text-slate-400">
                    Nenhum morph target ativo na malha selecionada.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {morphTargets.map((mt) => (
                      <PbrSlider
                        key={mt.key}
                        label={`${mt.targetName} (${mt.meshName})`}
                        value={mt.value}
                        min={0}
                        max={1}
                        step={0.02}
                        defaultValue={0}
                        accentHex="#f97316"
                        onChange={(v) => onChangeMorphTarget(mt.meshId, mt.index, v)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: RENDER & POST PROCESSING */}
          {activePropTab === 'lighting' && (
            <div className="space-y-2.5">
              <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2.5">
                <div className="font-semibold text-white text-[11px]">
                  Scene EEVEE & Pós-Processamento
                </div>
                <label className="flex flex-col gap-1 text-[10px] text-slate-400">
                  <span>View Transform (Tone Mapping)</span>
                  <select
                    value={lighting.toneMapping}
                    onChange={(e) =>
                      onLightingChange({
                        toneMapping: e.target.value as StudioLightingState['toneMapping'],
                      })
                    }
                    className="px-2 py-1 rounded bg-[#090C12] border border-slate-800 text-[11px] text-slate-200"
                  >
                    <option value="agx">AgX (Blender 5.3)</option>
                    <option value="aces">ACES Filmic</option>
                    <option value="neutral">PBR Neutral</option>
                    <option value="none">Linear</option>
                  </select>
                </label>

                <PbrSlider
                  label="Exposição EV"
                  value={lighting.exposure}
                  min={0.2}
                  max={2.4}
                  defaultValue={1.05}
                  onChange={(v) => onLightingChange({ exposure: v })}
                />

                <label className="flex items-center justify-between text-[11px] text-slate-200 cursor-pointer pt-1 border-t border-slate-800">
                  <span>Bloom (Brilho Neon)</span>
                  <input
                    type="checkbox"
                    checked={lighting.bloomEnabled}
                    onChange={(e) => onLightingChange({ bloomEnabled: e.target.checked })}
                    className="accent-orange-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] text-slate-200 cursor-pointer">
                  <span>Depth of Field (Bokeh)</span>
                  <input
                    type="checkbox"
                    checked={lighting.dofEnabled}
                    onChange={(e) => onLightingChange({ dofEnabled: e.target.checked })}
                    className="accent-orange-500"
                  />
                </label>
                <label className="flex items-center justify-between text-[11px] text-slate-200 cursor-pointer">
                  <span>Motion Blur</span>
                  <input
                    type="checkbox"
                    checked={lighting.motionBlurEnabled}
                    onChange={(e) => onLightingChange({ motionBlurEnabled: e.target.checked })}
                    className="accent-orange-500"
                  />
                </label>

                <button
                  type="button"
                  onClick={onRenderPng}
                  className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] cursor-pointer"
                >
                  Capturar Render PNG
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: VFX PARTICLE EMITTERS */}
          {activePropTab === 'vfx' && (
            <div className="space-y-2.5">
              <div className="rounded-lg bg-[#141923] border border-slate-800 p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-white flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-orange-400" />
                    <span>Partículas ({emitters.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={onAddEmitter}
                    className="px-2 py-0.5 rounded bg-orange-600 hover:bg-orange-500 text-[10px] font-semibold text-white cursor-pointer"
                  >
                    + Emissor
                  </button>
                </div>

                {emitters.length === 0 ? (
                  <p className="text-[10px] text-slate-400">
                    Crie um emissor de partículas para fogo, faíscas, fumaça ou energia mágica.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {emitters.map((em) => (
                      <button
                        key={em.id}
                        type="button"
                        onClick={() => onSelectEmitter(em.id)}
                        className={`px-2 py-1 rounded text-[10px] border cursor-pointer ${
                          activeEmitter?.id === em.id
                            ? 'bg-orange-600/20 border-orange-500 text-orange-200'
                            : 'bg-[#090C12] border-slate-800 text-slate-300'
                        }`}
                      >
                        {em.name}
                      </button>
                    ))}
                  </div>
                )}

                {activeEmitter && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeEmitter.enabled}
                          onChange={(e) =>
                            onUpdateEmitter(activeEmitter.id, { enabled: e.target.checked })
                          }
                          className="accent-orange-500"
                        />
                        <span>Ativo</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onRemoveEmitter(activeEmitter.id)}
                        className="text-[10px] text-red-400 hover:underline cursor-pointer"
                      >
                        Remover
                      </button>
                    </div>

                    <select
                      value={activeEmitter.spritePreset}
                      onChange={(e) =>
                        onUpdateEmitter(activeEmitter.id, {
                          spritePreset: e.target.value as ParticleSpritePreset,
                        })
                      }
                      className="w-full px-2 py-1 rounded bg-[#090C12] border border-slate-800 text-[11px] text-slate-200"
                    >
                      <option value="glow">Brilho Suave (Glow)</option>
                      <option value="spark">Faísca (Spark)</option>
                      <option value="smoke">Fumaça (Smoke)</option>
                      <option value="star">Estrela (Star)</option>
                      <option value="ring">Anel Energia (Ring)</option>
                    </select>

                    <PbrSlider
                      label="Taxa Emissão (/s)"
                      value={activeEmitter.rate}
                      min={5}
                      max={180}
                      step={5}
                      decimals={0}
                      defaultValue={45}
                      onChange={(v) => onUpdateEmitter(activeEmitter.id, { rate: v })}
                    />
                    <PbrSlider
                      label="Velocidade"
                      value={activeEmitter.speed}
                      min={0.1}
                      max={6}
                      defaultValue={1.4}
                      onChange={(v) => onUpdateEmitter(activeEmitter.id, { speed: v })}
                    />
                    <PbrSlider
                      label="Gravidade"
                      value={activeEmitter.gravity}
                      min={-9.8}
                      max={5}
                      defaultValue={-2.2}
                      accentHex="#38bdf8"
                      onChange={(v) => onUpdateEmitter(activeEmitter.id, { gravity: v })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Início</span>
                        <input
                          type="color"
                          value={activeEmitter.startColor}
                          onChange={(e) =>
                            onUpdateEmitter(activeEmitter.id, { startColor: e.target.value })
                          }
                          className="w-6 h-5 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                      </label>
                      <label className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Fim</span>
                        <input
                          type="color"
                          value={activeEmitter.endColor}
                          onChange={(e) =>
                            onUpdateEmitter(activeEmitter.id, { endColor: e.target.value })
                          }
                          className="w-6 h-5 rounded border border-slate-700 bg-transparent cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
