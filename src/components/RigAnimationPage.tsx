import React from 'react';
import {
  Anchor,
  Bone,
  Box,
  Crosshair,
  Download,
  Eye,
  FlipHorizontal2,
  Paintbrush,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { RIG_PRESET_DEFINITIONS, RigPreset, StudioConfig, TargetEngine } from '../types/studioConfig';
import {
  BoneMaskRegion,
  RigPostureOffsets,
  TimelineStripItem,
} from '../utils/autoRigger';
import { KeyframeInterpolationMode, WeightBrushMode } from '../utils/ikSolver';
import { ActionForgeTimeline, ActiveClipTrackSample } from './ActionForgeTimeline';
import { MorphTargetItem } from './OutlinerPropertiesDock';

interface RigAnimationPageProps {
  config: StudioConfig;
  onConfigChange: (patch: Partial<StudioConfig>) => void;
  assetName: string;
  meshCount: number;
  boneCount: number;
  riggedBoneNames: string[];
  selectedBoneName: string | null;
  showSkeleton: boolean;
  onToggleSkeleton: () => void;
  showRigMarkers: boolean;
  onToggleRigMarkers: () => void;
  markerSymmetry: boolean;
  onToggleMarkerSymmetry: () => void;
  ikEnabled: boolean;
  onToggleIk: () => void;
  floorContactEnabled: boolean;
  onToggleFloorContact: () => void;
  weightPaintActive: boolean;
  onToggleWeightPaint: () => void;
  weightBrushMode: WeightBrushMode;
  onChangeWeightBrushMode: (m: WeightBrushMode) => void;
  weightBrushRadius: number;
  onChangeWeightBrushRadius: (r: number) => void;
  weightBrushStrength: number;
  onChangeWeightBrushStrength: (s: number) => void;
  morphTargets: MorphTargetItem[];
  onChangeMorphTarget: (meshId: string, index: number, value: number) => void;
  clipNames: string[];
  activeClipIdx: number;
  activeClipId: string;
  isPlaying: boolean;
  animLoop: boolean;
  animSpeed: number;
  animProgress: number;
  animDuration: number;
  mirrorClip: boolean;
  reverseClip: boolean;
  inPlaceClip: boolean;
  clayShading: boolean;
  autoKey: boolean;
  interpolationMode: KeyframeInterpolationMode;
  hasCopiedKeyframe: boolean;
  strips: TimelineStripItem[];
  overlayClipId: string;
  overlayMask: BoneMaskRegion;
  overlayWeight: number;
  postureOffsets: RigPostureOffsets;
  activeClipTracks: ActiveClipTrackSample[];
  onRunAutoRig: (preset?: RigPreset) => void;
  onResetPose: () => void;
  onRemoveRig: () => void;
  onSelectBone: (boneName: string) => void;
  onSelectClipById: (clipId: string) => void;
  onTogglePlay: () => void;
  onStopAnimation: () => void;
  onStepFrame: (deltaFrames: number) => void;
  onSeekNormalized: (pct: number) => void;
  onToggleLoop: () => void;
  onChangeSpeed: (speed: number) => void;
  onToggleMirror: () => void;
  onToggleReverse: () => void;
  onToggleInPlace: () => void;
  onToggleClayShading: () => void;
  onToggleAutoKey: () => void;
  onChangeInterpolationMode: (mode: KeyframeInterpolationMode) => void;
  onUpdateStrips: (next: TimelineStripItem[]) => void;
  onSetOverlayLayer: (clipId: string, mask: BoneMaskRegion, weight: number) => void;
  onUpdatePostureOffsets: (patch: Partial<RigPostureOffsets>) => void;
  onAddBoneKeyframe: () => void;
  onCopyKeyframe: () => void;
  onPasteKeyframe: () => void;
  onDeleteKeyframe: () => void;
  onMoveKeyframe: (trackName: string, oldTime: number, newTime: number) => void;
  onCopyClipLink: (clipId: string) => void;
  onImportAnimationFile: () => void;
  onBakeIkPhysics: () => void;
  onExportGlb: () => void;
  onExportRestPoseGlb: () => void;
  onOpenViewport: () => void;
  animInPoint?: number;
  animOutPoint?: number;
  onSetPlayRange?: (inPct: number, outPct: number) => void;
  onResetPlayRange?: () => void;
}

const ENGINE_OPTIONS: { id: TargetEngine; label: string; subtitle: string }[] = [
  { id: 'UNITY', label: 'Unity Humanoid', subtitle: 'Avatar PBR & AnimationClip glTF' },
  { id: 'UNREAL', label: 'Unreal Engine 5', subtitle: 'IK Rig & Control Rig glTF' },
  { id: 'GODOT', label: 'Godot 4', subtitle: 'Skeleton3D & AnimationPlayer' },
  { id: 'BLENDER', label: 'Blender / WebGL', subtitle: 'PoseBone KinematicConstraint & NLA' },
];

export const RigAnimationPage: React.FC<RigAnimationPageProps> = ({
  config,
  onConfigChange,
  assetName,
  meshCount,
  boneCount,
  riggedBoneNames,
  selectedBoneName,
  showSkeleton,
  onToggleSkeleton,
  showRigMarkers,
  onToggleRigMarkers,
  markerSymmetry,
  onToggleMarkerSymmetry,
  ikEnabled,
  onToggleIk,
  floorContactEnabled,
  onToggleFloorContact,
  weightPaintActive,
  onToggleWeightPaint,
  weightBrushMode,
  onChangeWeightBrushMode,
  weightBrushRadius,
  onChangeWeightBrushRadius,
  weightBrushStrength,
  onChangeWeightBrushStrength,
  morphTargets,
  onChangeMorphTarget,
  clipNames,
  activeClipIdx,
  activeClipId,
  isPlaying,
  animLoop,
  animSpeed,
  animProgress,
  animDuration,
  mirrorClip,
  reverseClip,
  inPlaceClip,
  clayShading,
  autoKey,
  interpolationMode,
  hasCopiedKeyframe,
  strips,
  overlayClipId,
  overlayMask,
  overlayWeight,
  postureOffsets,
  activeClipTracks,
  onRunAutoRig,
  onResetPose,
  onRemoveRig,
  onSelectBone,
  onSelectClipById,
  onTogglePlay,
  onStopAnimation,
  onStepFrame,
  onSeekNormalized,
  onToggleLoop,
  onChangeSpeed,
  onToggleMirror,
  onToggleReverse,
  onToggleInPlace,
  onToggleClayShading,
  onToggleAutoKey,
  onChangeInterpolationMode,
  onUpdateStrips,
  onSetOverlayLayer,
  onUpdatePostureOffsets,
  onAddBoneKeyframe,
  onCopyKeyframe,
  onPasteKeyframe,
  onDeleteKeyframe,
  onMoveKeyframe,
  onCopyClipLink,
  onImportAnimationFile,
  onBakeIkPhysics,
  onExportGlb,
  onExportRestPoseGlb,
  onOpenViewport,
  animInPoint = 0,
  animOutPoint = 1,
  onSetPlayRange,
  onResetPlayRange,
}) => {
  const activeDef = RIG_PRESET_DEFINITIONS[config.rigPreset];
  const isRigged = riggedBoneNames.length > 0;

  return (
    <div className="max-w-[1440px] mx-auto p-3.5 sm:p-4 space-y-4">
      {/* Header Bar */}
      <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-base font-bold text-[#231F1D]">ActionForge — Auto-Rigging, IK, Pesos & Dope Sheet</h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#635B54]">
            <span>
              Ativo: <strong className="font-mono text-slate-200 font-medium">{assetName}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{meshCount} malha(s)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">{boneCount} osso(s)</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-orange-400">#clip={activeClipId}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onImportAnimationFile}
            title="Importar clipe de animação .FBX ou .GLB com Retargeting automático"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-sky-500 text-xs font-medium text-sky-300 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar .FBX/.GLB (Retarget)</span>
          </button>
          <button
            type="button"
            onClick={onBakeIkPhysics}
            disabled={!isRigged}
            title="Assar poses IK e física em keyframes puros para exportação"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-amber-500 disabled:opacity-40 text-xs font-medium text-amber-300 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bake IK</span>
          </button>
          <button
            type="button"
            onClick={onToggleClayShading}
            title="Alternar visualização PBR colorida / Clay cinza neutro"
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium cursor-pointer whitespace-nowrap ${
              clayShading
                ? 'bg-slate-200 border-slate-100 text-slate-900'
                : 'bg-[#0D1017] border-slate-700 hover:border-slate-500 text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{clayShading ? 'Cinza (Clay)' : 'Cor PBR'}</span>
          </button>
          <button
            type="button"
            onClick={onExportRestPoseGlb}
            title="Exportar personagem e armadura sem animações em Rest Pose (.GLB)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-sky-500 text-xs font-medium text-sky-300 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Rest Pose .GLB</span>
          </button>
          <button
            type="button"
            onClick={onExportGlb}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-emerald-500 text-xs font-medium text-emerald-300 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.GLB Animado</span>
          </button>
          <button
            type="button"
            onClick={onOpenViewport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Estúdio 3D</span>
          </button>
        </div>
      </div>

      {/* Top Row: Rig Setup + Weight Paint + IK + Blendshapes + Posture */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <section className="lg:col-span-7 rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#231F1D]">Auto-Rig (Estilo Mixamo), IK & Pintura de Pesos</h2>
              <p className="text-xs text-[#635B54] mt-0.5">
                Clique na malha para posicionar marcadores, ative alvos IK para mãos/pés ou ajuste pesos com mapa de calor.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showSkeleton}
                onChange={onToggleSkeleton}
                className="accent-orange-500"
              />
              <span>Ossos X-Ray</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(Object.keys(RIG_PRESET_DEFINITIONS) as RigPreset[]).map((key) => {
              const def = RIG_PRESET_DEFINITIONS[key];
              const active = config.rigPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onConfigChange({ rigPreset: key })}
                  className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-orange-500/10 border-orange-500 text-[#231F1D]'
                      : 'bg-[#0D1017] border-[#231F1D]/15 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{def.shortLabel}</span>
                    <span className="text-[11px] font-mono tabular-nums text-orange-400">
                      {def.boneCount} ossos
                    </span>
                  </div>
                  <p className="text-[11px] text-[#635B54] mt-1 leading-relaxed">{def.description}</p>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => onRunAutoRig(config.rigPreset)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
            >
              <Bone className="w-3.5 h-3.5" />
              <span>Vincular Esqueleto ({activeDef.shortLabel})</span>
            </button>

            <button
              type="button"
              onClick={onToggleRigMarkers}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                showRigMarkers
                  ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                  : 'bg-[#0D1017] border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>{showRigMarkers ? 'Ocultar Marcadores' : 'Marcadores (Clique na Malha)'}</span>
            </button>

            <button
              type="button"
              onClick={onToggleMarkerSymmetry}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                markerSymmetry
                  ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                  : 'bg-[#0D1017] border-slate-700 text-[#635B54]'
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" />
              <span>Simetria L↔R</span>
            </button>

            {isRigged && (
              <>
                <button
                  type="button"
                  onClick={onToggleIk}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                    ikEnabled
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                      : 'bg-[#0D1017] border-slate-700 text-slate-300'
                  }`}
                >
                  <span>Alvos IK (Mãos/Pés)</span>
                </button>
                <button
                  type="button"
                  onClick={onToggleFloorContact}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                    floorContactEnabled
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                      : 'bg-[#0D1017] border-slate-700 text-slate-300'
                  }`}
                >
                  <Anchor className="w-3.5 h-3.5" />
                  <span>Fixar Pés no Chão</span>
                </button>
                <button
                  type="button"
                  onClick={onResetPose}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F5] hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Reset Pose</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveRig}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FAF8F5] hover:bg-red-950 text-xs font-medium text-red-300 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remover Rig</span>
                </button>
              </>
            )}
          </div>

          {/* Visual Weight Painting Panel */}
          <div className="p-3 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 space-y-2.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Paintbrush className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-semibold text-[#231F1D]">Weight Painting Visual (Mapa de Calor)</span>
                {selectedBoneName && (
                  <span className="px-1.5 py-0.5 rounded bg-[#FAF8F5] font-mono text-[10px] text-amber-300">
                    {selectedBoneName}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onToggleWeightPaint}
                disabled={!isRigged}
                className={`px-3 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer disabled:opacity-40 ${
                  weightPaintActive
                    ? 'bg-amber-600 border-amber-500 text-[#231F1D]'
                    : 'bg-[#FAF8F5] border-slate-700 text-slate-200 hover:border-amber-500'
                }`}
              >
                {weightPaintActive ? 'Pintura de Pesos ATIVA' : 'Ativar Pintura de Pesos'}
              </button>
            </div>

            {weightPaintActive && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex rounded-lg bg-[#141923] border border-[#231F1D]/15 p-0.5">
                    {(
                      [
                        { id: 'add', label: 'Add (+)' },
                        { id: 'smooth', label: 'Smooth (~)' },
                        { id: 'subtract', label: 'Subtract (-)' },
                      ] as { id: WeightBrushMode; label: string }[]
                    ).map((bm) => (
                      <button
                        key={bm.id}
                        type="button"
                        onClick={() => onChangeWeightBrushMode(bm.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                          weightBrushMode === bm.id
                            ? 'bg-orange-600 text-[#231F1D]'
                            : 'text-[#635B54] hover:text-[#231F1D]'
                        }`}
                      >
                        {bm.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#635B54]">
                    <span>0.0</span>
                    <div className="w-24 h-2 rounded-full bg-gradient-to-r from-blue-600 via-emerald-400 to-red-500" />
                    <span>1.0</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-0.5 text-[11px] text-slate-300">
                    <span className="flex justify-between">
                      <span>Raio do Pincel</span>
                      <span className="font-mono text-amber-300">{weightBrushRadius.toFixed(2)}m</span>
                    </span>
                    <input
                      type="range"
                      min={0.05}
                      max={0.6}
                      step={0.02}
                      value={weightBrushRadius}
                      onChange={(e) => onChangeWeightBrushRadius(Number(e.target.value))}
                      className="accent-amber-500"
                    />
                  </label>
                  <label className="flex flex-col gap-0.5 text-[11px] text-slate-300">
                    <span className="flex justify-between">
                      <span>Força</span>
                      <span className="font-mono text-amber-300">{Math.round(weightBrushStrength * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.05}
                      value={weightBrushStrength}
                      onChange={(e) => onChangeWeightBrushStrength(Number(e.target.value))}
                      className="accent-amber-500"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right: Posture Shaping, Morph Targets & Target Engine */}
        <section className="lg:col-span-5 rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-[#231F1D]">Postura, Blendshapes (Morphs) & Engine</h2>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 space-y-3 text-xs">
            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Inclinação da Coluna (Spine Bend)</span>
                <span className="font-mono text-orange-400 tabular-nums">
                  {postureOffsets.spineBendDeg.toFixed(0)}°
                </span>
              </div>
              <input
                type="range"
                min={-30}
                max={35}
                step={1}
                value={postureOffsets.spineBendDeg}
                onChange={(e) => onUpdatePostureOffsets({ spineBendDeg: Number(e.target.value) })}
                className="accent-orange-500"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Altura Pélvica (Pelvis Offset)</span>
                <span className="font-mono text-orange-400 tabular-nums">
                  {postureOffsets.pelvisHeight.toFixed(2)}m
                </span>
              </div>
              <input
                type="range"
                min={-0.35}
                max={0.35}
                step={0.01}
                value={postureOffsets.pelvisHeight}
                onChange={(e) => onUpdatePostureOffsets({ pelvisHeight: Number(e.target.value) })}
                className="accent-orange-500"
              />
            </label>

            <label className="flex flex-col gap-1">
              <div className="flex justify-between text-slate-300">
                <span>Abertura dos Braços (Arm Spread)</span>
                <span className="font-mono text-orange-400 tabular-nums">
                  {postureOffsets.armSpreadDeg.toFixed(0)}°
                </span>
              </div>
              <input
                type="range"
                min={-35}
                max={45}
                step={1}
                value={postureOffsets.armSpreadDeg}
                onChange={(e) => onUpdatePostureOffsets({ armSpreadDeg: Number(e.target.value) })}
                className="accent-orange-500"
              />
            </label>
          </div>

          {/* Blendshapes / Morph Targets */}
          <div className="p-3 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 space-y-2 text-xs">
            <div className="font-semibold text-slate-200">
              Blendshapes / Expressões ({morphTargets.length})
            </div>
            {morphTargets.length === 0 ? (
              <p className="text-[11px] text-slate-500">
                Importe um GLB com Shape Keys ou selecione a cabeça padrão para ajustar expressões.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto pr-1">
                {morphTargets.map((mt) => (
                  <label key={mt.key} className="flex flex-col gap-0.5 text-[11px] text-slate-300">
                    <span className="flex justify-between truncate">
                      <span className="truncate">{mt.targetName}</span>
                      <span className="font-mono text-orange-400 tabular-nums">
                        {Math.round(mt.value * 100)}%
                      </span>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      value={mt.value}
                      onChange={(e) => onChangeMorphTarget(mt.meshId, mt.index, Number(e.target.value))}
                      className="accent-orange-500"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Motor de Destino (glTF 2.0 / Blender 5.3)</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ENGINE_OPTIONS.map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => onConfigChange({ targetEngine: eng.id })}
                  className={`p-2.5 rounded-lg border text-left cursor-pointer transition-colors ${
                    config.targetEngine === eng.id
                      ? 'bg-emerald-500/10 border-emerald-500 text-[#231F1D]'
                      : 'bg-[#0D1017] border-[#231F1D]/15 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <div className="text-[11px] font-semibold">{eng.label}</div>
                  <div className="text-[10px] text-[#635B54] truncate">{eng.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Full ActionForge Sequencer & 84 Clip Library */}
      <ActionForgeTimeline
        isRigged={isRigged}
        clipNames={clipNames}
        activeClipIdx={activeClipIdx}
        activeClipId={activeClipId}
        isPlaying={isPlaying}
        animLoop={animLoop}
        animSpeed={animSpeed}
        animProgress={animProgress}
        animDuration={animDuration}
        mirrorClip={mirrorClip}
        reverseClip={reverseClip}
        inPlaceClip={inPlaceClip}
        autoKey={autoKey}
        interpolationMode={interpolationMode}
        hasCopiedKeyframe={hasCopiedKeyframe}
        strips={strips}
        overlayClipId={overlayClipId}
        overlayMask={overlayMask}
        overlayWeight={overlayWeight}
        selectedBoneName={selectedBoneName}
        riggedBoneNames={riggedBoneNames}
        activeClipTracks={activeClipTracks}
        onRunAutoRig={() => onRunAutoRig(config.rigPreset)}
        onSelectClipById={onSelectClipById}
        onTogglePlay={onTogglePlay}
        onStopAnimation={onStopAnimation}
        onStepFrame={onStepFrame}
        onSeekNormalized={onSeekNormalized}
        onToggleLoop={onToggleLoop}
        onChangeSpeed={onChangeSpeed}
        onToggleMirror={onToggleMirror}
        onToggleReverse={onToggleReverse}
        onToggleInPlace={onToggleInPlace}
        onToggleAutoKey={onToggleAutoKey}
        onChangeInterpolationMode={onChangeInterpolationMode}
        onUpdateStrips={onUpdateStrips}
        onSetOverlayLayer={onSetOverlayLayer}
        onSelectBone={onSelectBone}
        onAddBoneKeyframe={onAddBoneKeyframe}
        onCopyKeyframe={onCopyKeyframe}
        onPasteKeyframe={onPasteKeyframe}
        onDeleteKeyframe={onDeleteKeyframe}
        onMoveKeyframe={onMoveKeyframe}
        onCopyClipLink={onCopyClipLink}
        animInPoint={animInPoint}
        animOutPoint={animOutPoint}
        onSetPlayRange={onSetPlayRange}
        onResetPlayRange={onResetPlayRange}
      />
    </div>
  );
};

