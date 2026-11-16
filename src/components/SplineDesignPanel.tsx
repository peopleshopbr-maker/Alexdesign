import React, { useState } from 'react';
import {
  Box,
  ChevronDown,
  Copy,
  Crosshair,
  Eye,
  EyeOff,
  Film,
  Layers,
  MousePointer2,
  Move,
  Play,
  Plus,
  RotateCw,
  Scaling,
  Shapes,
  Sparkles,
  SquarePen,
  Trash2,
} from 'lucide-react';
import { BooleanOperation } from '../utils/csgBoolean';
import {
  PRIMITIVE_CATALOG,
  PrimitiveShapeKind,
  SPLINE_INTERACTION_OPTIONS,
  SPLINE_MATERIAL_STYLES,
  SPLINE_TEMPLATES,
  SelectedObjectInspector,
  SplineInteractionType,
  SplineMaterialStyle,
  SplineTemplateId,
  SplineToolMode,
} from '../utils/splineSceneObjects';

interface SplineDesignPanelProps {
  playMode: boolean;
  onTogglePlayMode: (play: boolean) => void;
  physicsActive: boolean;
  onTogglePhysicsActive: () => void;
  bloomEnabled: boolean;
  onToggleBloom: () => void;
  bloomStrength: number;
  onBloomStrengthChange: (v: number) => void;
  toolMode: SplineToolMode;
  onSelectToolMode: (mode: SplineToolMode) => void;
  onAddPrimitive: (kind: PrimitiveShapeKind) => void;
  onApplyTemplate: (templateId: SplineTemplateId) => void;
  onRunBoolean: (op: BooleanOperation) => void;
  selectedObject: SelectedObjectInspector | null;
  onUpdateTransform: (
    axisGroup: 'position' | 'rotationDeg' | 'scale',
    axisIndex: 0 | 1 | 2,
    value: number
  ) => void;
  onUpdateObjectMaterial: (patch: {
    materialStyle?: SplineMaterialStyle;
    color?: string;
    roughness?: number;
    metalness?: number;
    transmission?: number;
    emissiveIntensity?: number;
  }) => void;
  onUpdateInteraction: (interaction: SplineInteractionType) => void;
  onToggleObjectPhysics: (enabled: boolean) => void;
  onUploadVideoTexture: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onFocusSelected: () => void;
  hideDefaultBase: boolean;
  onToggleHideDefaultBase: () => void;
  primitiveCount: number;
}

export const SplineDesignPanel: React.FC<SplineDesignPanelProps> = ({
  playMode,
  onTogglePlayMode,
  physicsActive,
  onTogglePhysicsActive,
  bloomEnabled,
  onToggleBloom,
  bloomStrength,
  onBloomStrengthChange,
  toolMode,
  onSelectToolMode,
  onAddPrimitive,
  onApplyTemplate,
  onRunBoolean,
  selectedObject,
  onUpdateTransform,
  onUpdateObjectMaterial,
  onUpdateInteraction,
  onToggleObjectPhysics,
  onUploadVideoTexture,
  onDuplicateSelected,
  onDeleteSelected,
  onFocusSelected,
  hideDefaultBase,
  onToggleHideDefaultBase,
  primitiveCount,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [shapeFilter, setShapeFilter] = useState<'primitive' | 'vector'>('primitive');
  const [activeTemplate, setActiveTemplate] = useState<SplineTemplateId>('glass_neon');

  const filteredCatalog = PRIMITIVE_CATALOG.filter((item) => item.category === shapeFilter);

  return (
    <section className="rounded-lg bg-[#141923] border border-slate-800/90 overflow-hidden">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Shapes className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <div className="text-left min-w-0">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
              Cena
            </div>
            <div className="text-[11px] text-slate-400 truncate leading-tight tabular-nums">
              {playMode ? 'Play Ativo' : 'Editar'} · {primitiveCount} objeto(s)
            </div>
          </div>
        </div>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              expanded ? 'rotate-180 text-orange-400' : ''
            }`}
          />
        </span>
      </button>

      {expanded && (
        <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-2.5 text-[11px]">
          {/* Edit vs Play Mode */}
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-[#0D1017] border border-slate-800">
            <button
              type="button"
              onClick={() => onTogglePlayMode(false)}
              className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                !playMode ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <SquarePen className="w-3 h-3 text-sky-400" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={() => onTogglePlayMode(true)}
              className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded font-medium transition-colors cursor-pointer ${
                playMode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3 h-3" />
              <span>Play</span>
            </button>
          </div>

          {/* Starter Scene Templates */}
          <div className="flex flex-col gap-1">
            <span className="text-slate-400">Biblioteca de Templates 3D</span>
            <div className="flex items-center gap-1">
              <div className="relative flex-1 min-w-0">
                <select
                  aria-label="Selecionar template 3D"
                  value={activeTemplate}
                  onChange={(e) => setActiveTemplate(e.target.value as SplineTemplateId)}
                  className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 text-[11px] font-medium text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
                >
                  {SPLINE_TEMPLATES.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
              </div>
              <button
                type="button"
                onClick={() => onApplyTemplate(activeTemplate)}
                className="px-2.5 py-1.5 rounded-md bg-sky-600/20 border border-sky-500/40 hover:bg-sky-600 text-sky-200 hover:text-white font-medium transition-colors cursor-pointer shrink-0"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* Transform Gizmo Tools */}
          {!playMode && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Gizmo Blender / Spline</span>
                <button
                  type="button"
                  onClick={onToggleHideDefaultBase}
                  title={hideDefaultBase ? 'Mostrar modelo base' : 'Ocultar modelo base'}
                  className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {hideDefaultBase ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{hideDefaultBase ? 'Base oculta' : 'Base visível'}</span>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'orbit', label: 'Órbita', keyHint: 'V', Icon: MousePointer2 },
                    { id: 'translate', label: 'Mover', keyHint: 'G / W', Icon: Move },
                    { id: 'rotate', label: 'Girar', keyHint: 'E', Icon: RotateCw },
                    { id: 'scale', label: 'Escala', keyHint: 'S / R', Icon: Scaling },
                  ] as const
                ).map(({ id, label, keyHint, Icon }) => {
                  const active = toolMode === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={`${label} (Tecla ${keyHint})`}
                      onClick={() => onSelectToolMode(id)}
                      className={`inline-flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-md border font-medium cursor-pointer transition-colors ${
                        active
                          ? 'bg-orange-600/20 border-orange-500 text-orange-200'
                          : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="text-[10px] leading-none">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add 3D Primitives & Vector 3D Shapes */}
          {!playMode && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400">Adicionar Forma</span>
                <div className="flex items-center gap-1 p-0.5 rounded bg-[#0D1017] border border-slate-800 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setShapeFilter('primitive')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      shapeFilter === 'primitive' ? 'bg-slate-700 text-white' : 'text-slate-400'
                    }`}
                  >
                    Primitivas
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapeFilter('vector')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      shapeFilter === 'vector' ? 'bg-slate-700 text-white' : 'text-slate-400'
                    }`}
                  >
                    Vetor 3D
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {filteredCatalog.map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => onAddPrimitive(item.kind)}
                    className="inline-flex items-center justify-center gap-0.5 px-1.5 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500/70 text-[10px] font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-sky-400 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CSG Boolean Operations & Physics / Bloom Toggles */}
          {!playMode && primitiveCount >= 2 && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                <Layers className="w-3 h-3 text-violet-400" />
                <span>Booleana CSG (2 últimas formas)</span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => onRunBoolean('union')}
                  className="px-1.5 py-1 rounded bg-[#0D1017] border border-slate-800 hover:border-violet-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                >
                  União
                </button>
                <button
                  type="button"
                  onClick={() => onRunBoolean('subtract')}
                  className="px-1.5 py-1 rounded bg-[#0D1017] border border-slate-800 hover:border-violet-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                >
                  Subtração
                </button>
                <button
                  type="button"
                  onClick={() => onRunBoolean('intersect')}
                  className="px-1.5 py-1 rounded bg-[#0D1017] border border-slate-800 hover:border-violet-500 text-[10px] font-medium text-slate-200 cursor-pointer"
                >
                  Interseção
                </button>
              </div>
            </div>
          )}

          {/* Scene Physics & Post-Processing */}
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={onTogglePhysicsActive}
              className={`px-2 py-1.5 rounded-md border text-[10px] font-medium cursor-pointer transition-colors ${
                physicsActive
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200'
                  : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {physicsActive ? 'Física: Ativa' : 'Física: Gravidade'}
            </button>
            <button
              type="button"
              onClick={onToggleBloom}
              className={`px-2 py-1.5 rounded-md border text-[10px] font-medium cursor-pointer transition-colors ${
                bloomEnabled
                  ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                  : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {bloomEnabled ? 'Bloom: Ativo' : 'Bloom: Pós-FX'}
            </button>
          </div>

          {bloomEnabled && (
            <label className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
              <span>Força Bloom</span>
              <input
                type="range"
                min={0.1}
                max={1.8}
                step={0.05}
                value={bloomStrength}
                onChange={(e) => onBloomStrengthChange(Number(e.target.value))}
                className="flex-1 min-w-0 cursor-pointer"
              />
              <span className="font-mono text-slate-200 tabular-nums w-7 text-right">
                {bloomStrength.toFixed(2)}
              </span>
            </label>
          )}

          {/* Selected Object Inspector */}
          {selectedObject ? (
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 p-2 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Box className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span className="font-semibold text-slate-100 truncate">{selectedObject.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={onFocusSelected}
                    title="Enquadrar selecionado (F)"
                    className="p-1 rounded bg-[#141923] border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <Crosshair className="w-3 h-3" />
                  </button>
                  {selectedObject.isPrimitive && (
                    <>
                      <button
                        type="button"
                        onClick={onDuplicateSelected}
                        title="Duplicar objeto"
                        className="p-1 rounded bg-[#141923] border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={onDeleteSelected}
                        title="Excluir objeto (Del)"
                        className="p-1 rounded bg-[#141923] border border-slate-800 hover:border-rose-500 text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Transform XYZ */}
              {(
                [
                  { key: 'position', label: 'Posição', step: 0.05 },
                  { key: 'rotationDeg', label: 'Rotação (°)', step: 5 },
                  { key: 'scale', label: 'Escala', step: 0.05 },
                ] as const
              ).map(({ key, label, step }) => (
                <div key={key} className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400">{label}</span>
                  <div className="grid grid-cols-3 gap-1">
                    {(['X', 'Y', 'Z'] as const).map((axisLabel, idx) => (
                      <label
                        key={axisLabel}
                        className="flex items-center gap-1 px-1.5 py-1 rounded bg-[#141923] border border-slate-800 focus-within:border-orange-500"
                      >
                        <span
                          className={`text-[10px] font-bold ${
                            idx === 0 ? 'text-rose-400' : idx === 1 ? 'text-emerald-400' : 'text-sky-400'
                          }`}
                        >
                          {axisLabel}
                        </span>
                        <input
                          type="number"
                          step={step}
                          value={Number(selectedObject[key][idx].toFixed(key === 'rotationDeg' ? 0 : 2))}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            if (Number.isFinite(v)) {
                              onUpdateTransform(key, idx as 0 | 1 | 2, v);
                            }
                          }}
                          className="w-full min-w-0 bg-transparent font-mono text-[10px] text-slate-100 tabular-nums focus:outline-none"
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              {/* Spline Physical Material Style */}
              <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">Material Físico</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={onUploadVideoTexture}
                      title="Aplicar textura de vídeo (.mp4 / .webm)"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#141923] border border-slate-700 hover:border-sky-500 text-[10px] text-slate-200 cursor-pointer"
                    >
                      <Film className="w-3 h-3 text-sky-400" />
                      <span>Vídeo</span>
                    </button>
                    <input
                      type="color"
                      aria-label="Cor do objeto selecionado"
                      value={selectedObject.color}
                      onChange={(e) => onUpdateObjectMaterial({ color: e.target.value })}
                      className="w-6 h-5 rounded bg-transparent border border-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="relative">
                  <select
                    aria-label="Estilo do material"
                    value={selectedObject.materialStyle}
                    onChange={(e) =>
                      onUpdateObjectMaterial({ materialStyle: e.target.value as SplineMaterialStyle })
                    }
                    className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded bg-[#141923] border border-slate-700 text-[11px] font-medium text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
                  >
                    {SPLINE_MATERIAL_STYLES.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>

                <label className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span>Vidro / Transm.</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedObject.transmission}
                    onChange={(e) => onUpdateObjectMaterial({ transmission: Number(e.target.value) })}
                    className="flex-1 min-w-0 cursor-pointer"
                  />
                  <span className="font-mono text-slate-200 tabular-nums w-7 text-right">
                    {selectedObject.transmission.toFixed(2)}
                  </span>
                </label>

                <label className="flex items-center justify-between gap-2 text-[10px] text-slate-400">
                  <span>Emissão Glow</span>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={selectedObject.emissiveIntensity}
                    onChange={(e) =>
                      onUpdateObjectMaterial({ emissiveIntensity: Number(e.target.value) })
                    }
                    className="flex-1 min-w-0 cursor-pointer"
                  />
                  <span className="font-mono text-slate-200 tabular-nums w-7 text-right">
                    {selectedObject.emissiveIntensity.toFixed(1)}
                  </span>
                </label>
              </div>

              {/* Interaction & Physics per Object */}
              <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Sparkles className="w-3 h-3 text-emerald-400" />
                    <span>Interação (Play)</span>
                  </div>
                  {selectedObject.isPrimitive && (
                    <label className="inline-flex items-center gap-1 text-[10px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedObject.physicsEnabled}
                        onChange={(e) => onToggleObjectPhysics(e.target.checked)}
                        className="accent-emerald-500 cursor-pointer"
                      />
                      <span>Corpo Rígido</span>
                    </label>
                  )}
                </div>
                <div className="relative">
                  <select
                    aria-label="Comportamento interativo"
                    value={selectedObject.interaction}
                    onChange={(e) => onUpdateInteraction(e.target.value as SplineInteractionType)}
                    className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded bg-[#141923] border border-slate-700 text-[11px] font-medium text-slate-100 cursor-pointer focus:outline-none focus:border-emerald-500"
                  >
                    {SPLINE_INTERACTION_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md bg-[#0D1017]/80 border border-slate-800/80 px-2.5 py-2 text-[11px] text-slate-400 leading-snug">
              Clique em qualquer forma na viewport, aplique um template ou adicione uma primitiva/vetor 3D para modelar, aplicar vidro, física e exportar.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
