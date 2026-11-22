import React, { useState } from 'react';
import {
  Flame,
  ImagePlus,
  Layers,
  Play,
  Plus,
  Shapes,
  Sparkles,
  Square,
  Trash2,
  Video,
} from 'lucide-react';
import {
  PRIMITIVE_CATALOG,
  PrimitiveShapeKind,
  RigidBodyMode,
  SPLINE_INTERACTION_OPTIONS,
  SPLINE_TEMPLATES,
  SelectedObjectInspector,
  SplineInteractionType,
  SplineTemplateId,
} from '../utils/splineSceneObjects';
import { BooleanOpKind } from '../utils/csgBoolean';
import { ParticleEmitterConfig, ParticleSpritePreset } from '../utils/particleSystem';
import { ReactiveShaderEffect } from '../utils/reactiveShaders';

interface SplineDesignPanelProps {
  section: 'create' | 'csg_fx';
  playMode: boolean;
  onTogglePlayMode: (play: boolean) => void;
  activeTemplate: SplineTemplateId;
  onSelectTemplate: (id: SplineTemplateId) => void;
  onApplyTemplate: (id: SplineTemplateId) => void;
  hideDefaultBase: boolean;
  onToggleHideDefaultBase: () => void;
  onAddPrimitive: (kind: PrimitiveShapeKind) => void;
  onRunBoolean: (op: BooleanOpKind) => void;
  canRunBoolean: boolean;
  physicsActive: boolean;
  onTogglePhysicsActive: () => void;
  bloomEnabled: boolean;
  onToggleBloom: () => void;
  selectedObject: SelectedObjectInspector | null;
  onUpdateSelectedObject: (patch: Partial<SelectedObjectInspector>) => void;
  onUploadVideoTexture: () => void;
  emitters?: ParticleEmitterConfig[];
  selectedEmitterId?: string | null;
  onAddEmitter?: () => void;
  onSelectEmitter?: (id: string) => void;
  onUpdateEmitter?: (id: string, patch: Partial<ParticleEmitterConfig>) => void;
  onRemoveEmitter?: (id: string) => void;
  onUploadParticleSprite?: (emitterId: string) => void;
}

export const SplineDesignPanel: React.FC<SplineDesignPanelProps> = ({
  section,
  playMode,
  onTogglePlayMode,
  activeTemplate,
  onSelectTemplate,
  onApplyTemplate,
  hideDefaultBase,
  onToggleHideDefaultBase,
  onAddPrimitive,
  onRunBoolean,
  canRunBoolean,
  physicsActive,
  onTogglePhysicsActive,
  bloomEnabled,
  onToggleBloom,
  selectedObject,
  onUpdateSelectedObject,
  onUploadVideoTexture,
  emitters = [],
  selectedEmitterId = null,
  onAddEmitter,
  onSelectEmitter,
  onUpdateEmitter,
  onRemoveEmitter,
  onUploadParticleSprite,
}) => {
  const [shapeFilter, setShapeFilter] = useState<'primitive' | 'vector'>('primitive');
  const visibleShapes = PRIMITIVE_CATALOG.filter((item) => item.category === shapeFilter);
  const activeEmitter =
    emitters.find((e) => e.id === selectedEmitterId) ?? emitters[0] ?? null;

  if (section === 'create') {
    return (
      <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-3 space-y-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shapes className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-[#231F1D]">Primitivas, Vetores & Templates</span>
          </div>
          <button
            type="button"
            onClick={onToggleHideDefaultBase}
            className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer ${
              hideDefaultBase
                ? 'border-orange-500/60 bg-orange-500/15 text-orange-300'
                : 'border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {hideDefaultBase ? 'Mostrar Base' : 'Ocultar Base'}
          </button>
        </div>

        <div className="inline-flex w-full items-center rounded-lg border border-[#231F1D]/15 bg-[#0D1017] p-0.5">
          <button
            type="button"
            onClick={() => onTogglePlayMode(false)}
            className={`flex-1 py-1.5 rounded-md text-[11px] font-medium cursor-pointer ${
              !playMode ? 'bg-slate-700 text-[#231F1D]' : 'text-[#635B54] hover:text-slate-200'
            }`}
          >
            Editar Cena
          </button>
          <button
            type="button"
            onClick={() => onTogglePlayMode(true)}
            className={`flex-1 inline-flex items-center justify-center gap-1 py-1.5 rounded-md text-[11px] font-medium cursor-pointer ${
              playMode ? 'bg-emerald-600 text-[#231F1D]' : 'text-[#635B54] hover:text-slate-200'
            }`}
          >
            {playMode ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>Play Interativo</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
          <select
            value={activeTemplate}
            onChange={(e) => onSelectTemplate(e.target.value as SplineTemplateId)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 text-[#231F1D]"
          >
            {SPLINE_TEMPLATES.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.label} â€” {tpl.subtitle}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onApplyTemplate(activeTemplate)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-[#231F1D] font-semibold cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Aplicar Cena</span>
          </button>
        </div>

        <div className="space-y-2 pt-2 border-t border-[#231F1D]/15">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-slate-300">Adicionar Forma 3D</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShapeFilter('primitive')}
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                  shapeFilter === 'primitive' ? 'bg-slate-700 text-[#231F1D]' : 'text-[#635B54]'
                }`}
              >
                Primitivas
              </button>
              <button
                type="button"
                onClick={() => setShapeFilter('vector')}
                className={`px-2 py-0.5 rounded text-[10px] cursor-pointer ${
                  shapeFilter === 'vector' ? 'bg-slate-700 text-[#231F1D]' : 'text-[#635B54]'
                }`}
              >
                Vetores 3D
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {visibleShapes.map((item) => (
              <button
                key={item.kind}
                type="button"
                onClick={() => onAddPrimitive(item.kind)}
                className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 hover:border-orange-500/70 text-[11px] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-orange-400 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-[#231F1D]">CSG, FÃ­sica Rigid Body & Shaders</span>
        </div>

        <div className="space-y-1.5">
          <div className="text-[11px] text-[#635B54]">
            Combina as 2 Ãºltimas primitivas adicionadas na cena:
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={!canRunBoolean}
              onClick={() => onRunBoolean('union')}
              className="h-8 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 hover:border-cyan-500 disabled:opacity-40 text-[11px] font-medium text-slate-200 cursor-pointer"
            >
              UniÃ£o
            </button>
            <button
              type="button"
              disabled={!canRunBoolean}
              onClick={() => onRunBoolean('subtract')}
              className="h-8 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 hover:border-cyan-500 disabled:opacity-40 text-[11px] font-medium text-slate-200 cursor-pointer"
            >
              Subtrair
            </button>
            <button
              type="button"
              disabled={!canRunBoolean}
              onClick={() => onRunBoolean('intersect')}
              className="h-8 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 hover:border-cyan-500 disabled:opacity-40 text-[11px] font-medium text-slate-200 cursor-pointer"
            >
              InterseÃ§Ã£o
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#231F1D]/15">
          <button
            type="button"
            onClick={onTogglePhysicsActive}
            className={`h-8 rounded-lg border text-[11px] font-medium cursor-pointer ${
              physicsActive
                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                : 'border-slate-700 bg-[#0D1017] text-slate-300'
            }`}
          >
            SimulaÃ§Ã£o FÃ­sica {physicsActive ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={onToggleBloom}
            className={`h-8 rounded-lg border text-[11px] font-medium cursor-pointer ${
              bloomEnabled
                ? 'border-pink-500 bg-pink-500/15 text-pink-300'
                : 'border-slate-700 bg-[#0D1017] text-slate-300'
            }`}
          >
            Glow Bloom {bloomEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {selectedObject ? (
          <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 space-y-2.5">
            <div className="text-[11px] font-semibold text-slate-200 truncate">
              Objeto: {selectedObject.name}
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-[#635B54]">Corpo RÃ­gido (RigidBodyObject)</span>
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { id: 'none', label: 'Sem FÃ­sica' },
                    { id: 'static', label: 'EstÃ¡tico' },
                    { id: 'dynamic', label: 'DinÃ¢mico' },
                  ] as { id: RigidBodyMode; label: string }[]
                ).map((rb) => (
                  <button
                    key={rb.id}
                    type="button"
                    onClick={() =>
                      onUpdateSelectedObject({
                        rigidBodyMode: rb.id,
                        physicsEnabled: rb.id === 'dynamic',
                      })
                    }
                    className={`py-1 rounded border text-[10px] font-medium cursor-pointer ${
                      selectedObject.rigidBodyMode === rb.id
                        ? 'bg-orange-600 border-orange-500 text-[#231F1D]'
                        : 'bg-[#141923] border-[#231F1D]/15 text-slate-300'
                    }`}
                  >
                    {rb.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-[#635B54]">InteraÃ§Ã£o Web</span>
                <select
                  value={selectedObject.interaction}
                  onChange={(e) =>
                    onUpdateSelectedObject({ interaction: e.target.value as SplineInteractionType })
                  }
                  className="px-2 py-1 rounded bg-[#141923] border border-slate-700 text-[11px] text-[#231F1D]"
                >
                  {SPLINE_INTERACTION_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] text-[#635B54]">Shader Reativo</span>
                <select
                  value={selectedObject.shaderEffect.effect}
                  onChange={(e) =>
                    onUpdateSelectedObject({
                      shaderEffect: {
                        ...selectedObject.shaderEffect,
                        effect: e.target.value as ReactiveShaderEffect,
                      },
                    })
                  }
                  className="px-2 py-1 rounded bg-[#141923] border border-slate-700 text-[11px] text-[#231F1D]"
                >
                  <option value="none">PadrÃ£o PBR</option>
                  <option value="fresnel">Fresnel Borda</option>
                  <option value="dissolve">Dissolve RuÃ­do</option>
                  <option value="hologram">Holograma</option>
                  <option value="distortion">DistorÃ§Ã£o Onda</option>
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={onUploadVideoTexture}
              className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-[#FAF8F5] hover:bg-slate-700 text-[11px] text-slate-200 cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Aplicar Textura VÃ­deo (MP4/WebM)</span>
            </button>
          </div>
        ) : (
          <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 text-[11px] text-[#635B54]">
            Clique em qualquer malha no viewport 3D para configurar fÃ­sica Static/Dynamic e shaders.
          </div>
        )}
      </div>

      {/* Real-time VFX Particle Emitters */}
      {onAddEmitter && onUpdateEmitter && onSelectEmitter && onRemoveEmitter && (
        <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="font-semibold text-[#231F1D]">Sistema de PartÃ­culas ({emitters.length})</span>
            </div>
            <button
              type="button"
              onClick={onAddEmitter}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-600 hover:bg-orange-500 text-[11px] font-semibold text-[#231F1D] cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Emissor</span>
            </button>
          </div>

          {emitters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {emitters.map((em) => (
                <button
                  key={em.id}
                  type="button"
                  onClick={() => onSelectEmitter(em.id)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] cursor-pointer ${
                    activeEmitter?.id === em.id
                      ? 'bg-orange-600/20 border-orange-500 text-orange-200 font-semibold'
                      : 'bg-[#0D1017] border-[#231F1D]/15 text-slate-300'
                  }`}
                >
                  {em.name}
                </button>
              ))}
            </div>
          )}

          {activeEmitter && (
            <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeEmitter.enabled}
                    onChange={(e) => onUpdateEmitter(activeEmitter.id, { enabled: e.target.checked })}
                    className="accent-orange-500"
                  />
                  <span>Emitir PartÃ­culas</span>
                </label>
                <div className="flex items-center gap-1.5">
                  {onUploadParticleSprite && (
                    <button
                      type="button"
                      onClick={() => onUploadParticleSprite(activeEmitter.id)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FAF8F5] hover:bg-slate-700 text-[10px] text-sky-300 cursor-pointer"
                    >
                      <ImagePlus className="w-3 h-3" />
                      <span>Sprite PNG</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemoveEmitter(activeEmitter.id)}
                    className="p-1 rounded hover:bg-red-950 text-red-400 cursor-pointer"
                    title="Remover emissor"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-0.5 text-[10px] text-[#635B54]">
                  <span>Sprite</span>
                  <select
                    value={activeEmitter.spritePreset}
                    onChange={(e) =>
                      onUpdateEmitter(activeEmitter.id, {
                        spritePreset: e.target.value as ParticleSpritePreset,
                      })
                    }
                    className="px-2 py-1 rounded bg-[#141923] border border-slate-700 text-[11px] text-[#231F1D]"
                  >
                    <option value="glow">Brilho (Glow)</option>
                    <option value="spark">FaÃ­sca (Spark)</option>
                    <option value="smoke">FumaÃ§a (Smoke)</option>
                    <option value="star">Estrela (Star)</option>
                    <option value="ring">Anel (Ring)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-0.5 text-[10px] text-[#635B54]">
                  <span>Vida ({activeEmitter.lifetime.toFixed(1)}s)</span>
                  <input
                    type="range"
                    min={0.4}
                    max={4.5}
                    step={0.1}
                    value={activeEmitter.lifetime}
                    onChange={(e) =>
                      onUpdateEmitter(activeEmitter.id, { lifetime: Number(e.target.value) })
                    }
                    className="accent-orange-500 mt-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-[#635B54]">
                <label className="flex flex-col gap-0.5">
                  <span>Taxa ({activeEmitter.rate}/s)</span>
                  <input
                    type="range"
                    min={5}
                    max={180}
                    step={5}
                    value={activeEmitter.rate}
                    onChange={(e) => onUpdateEmitter(activeEmitter.id, { rate: Number(e.target.value) })}
                    className="accent-orange-500"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span>Veloc. ({activeEmitter.speed.toFixed(1)})</span>
                  <input
                    type="range"
                    min={0.1}
                    max={6}
                    step={0.1}
                    value={activeEmitter.speed}
                    onChange={(e) => onUpdateEmitter(activeEmitter.id, { speed: Number(e.target.value) })}
                    className="accent-orange-500"
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span>Gravid. ({activeEmitter.gravity.toFixed(1)})</span>
                  <input
                    type="range"
                    min={-9.8}
                    max={5}
                    step={0.2}
                    value={activeEmitter.gravity}
                    onChange={(e) =>
                      onUpdateEmitter(activeEmitter.id, { gravity: Number(e.target.value) })
                    }
                    className="accent-sky-400"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] text-[#635B54] pt-1">
                <label className="flex items-center justify-between">
                  <span>Cor InÃ­cio</span>
                  <input
                    type="color"
                    value={activeEmitter.startColor}
                    onChange={(e) =>
                      onUpdateEmitter(activeEmitter.id, { startColor: e.target.value })
                    }
                    className="w-6 h-5 rounded border border-slate-700 bg-transparent cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Cor Fim</span>
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
      )}
    </div>
  );
};

