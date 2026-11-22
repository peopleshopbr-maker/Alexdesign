import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  Activity,
  Anchor,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardPaste,
  Copy,
  Diamond,
  Eraser,
  FlipHorizontal2,
  Layers,
  Link2,
  Minus,
  Pause,
  Play,
  Plus,
  Redo2,
  Repeat,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  ACTIONFORGE_CATEGORY_TABS,
  ACTIONFORGE_CLIPS,
  ActionForgeCategory,
  BONE_MASK_OPTIONS,
  BoneMaskRegion,
  TimelineStripItem,
} from '../utils/autoRigger';

import { KeyframeInterpolationMode } from '../utils/ikSolver';

export type SequencerViewMode = 'strips' | 'graph' | 'keys';

export interface ActiveClipTrackSample {
  name: string;
  times: number[];
  values: number[];
  type: 'quaternion' | 'vector';
}

interface ActionForgeTimelineProps {
  compact?: boolean;
  docked?: boolean;
  isRigged: boolean;
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
  autoKey: boolean;
  interpolationMode?: KeyframeInterpolationMode;
  hasCopiedKeyframe?: boolean;
  strips: TimelineStripItem[];
  overlayClipId: string;
  overlayMask: BoneMaskRegion;
  overlayWeight: number;
  selectedBoneName: string | null;
  riggedBoneNames: string[];
  activeClipTracks: ActiveClipTrackSample[];
  onRunAutoRig: () => void;
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
  onToggleAutoKey: () => void;
  onChangeInterpolationMode?: (mode: KeyframeInterpolationMode) => void;
  onUpdateStrips: (next: TimelineStripItem[]) => void;
  onSetOverlayLayer: (clipId: string, mask: BoneMaskRegion, weight: number) => void;
  onSelectBone: (boneName: string) => void;
  onAddBoneKeyframe: () => void;
  onCopyKeyframe?: () => void;
  onPasteKeyframe?: () => void;
  onDeleteKeyframe?: () => void;
  onMoveKeyframe?: (trackName: string, oldTime: number, newTime: number) => void;
  onCopyClipLink: (clipId: string) => void;
  animInPoint?: number;
  animOutPoint?: number;
  onSetPlayRange?: (inPct: number, outPct: number) => void;
  onResetPlayRange?: () => void;
}

const FPS = 30;

export const ActionForgeTimeline: React.FC<ActionForgeTimelineProps> = ({
  compact = false,
  docked = false,
  isRigged,
  activeClipId,
  isPlaying,
  animLoop,
  animSpeed,
  animProgress,
  animDuration,
  mirrorClip,
  reverseClip,
  inPlaceClip,
  autoKey,
  interpolationMode = 'ease',
  hasCopiedKeyframe = false,
  strips,
  overlayClipId,
  overlayMask,
  overlayWeight,
  selectedBoneName,
  riggedBoneNames,
  activeClipTracks,
  onRunAutoRig,
  onSelectClipById,
  onTogglePlay,
  onStepFrame,
  onSeekNormalized,
  onToggleLoop,
  onChangeSpeed,
  onToggleMirror,
  onToggleReverse,
  onToggleInPlace,
  onToggleAutoKey,
  onChangeInterpolationMode,
  onUpdateStrips,
  onSetOverlayLayer,
  onSelectBone,
  onAddBoneKeyframe,
  onCopyKeyframe,
  onPasteKeyframe,
  onDeleteKeyframe,
  onMoveKeyframe,
  onCopyClipLink,
  animInPoint = 0,
  animOutPoint = 1,
  onSetPlayRange,
  onResetPlayRange,
}) => {
  const [category, setCategory] = useState<ActionForgeCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<SequencerViewMode>('strips');
  const [timeUnit, setTimeUnit] = useState<'sec' | 'frm'>('frm');
  const [zoomScale, setZoomScale] = useState(1);
  const [stripUndo, setStripUndo] = useState<TimelineStripItem[][]>([]);
  const [stripRedo, setStripRedo] = useState<TimelineStripItem[][]>([]);
  const [dragOverBase, setDragOverBase] = useState(false);

  const totalFrames = Math.max(1, Math.round(animDuration * FPS));
  const currentFrame = Math.min(totalFrames, Math.max(1, Math.round(animProgress * totalFrames) || 1));
  const clampedIn = THREE.MathUtils.clamp(animInPoint, 0, 0.98);
  const clampedOut = THREE.MathUtils.clamp(animOutPoint, clampedIn + 0.02, 1);
  const hasCustomRange = clampedIn > 0.005 || clampedOut < 0.995;
  const inFrame = Math.max(1, Math.round(clampedIn * totalFrames));
  const outFrame = Math.max(inFrame, Math.round(clampedOut * totalFrames));

  const filteredClips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return ACTIONFORGE_CLIPS.filter((c) => {
      if (category !== 'all' && c.category !== category) return false;
      if (!q) return true;
      return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
    });
  }, [category, searchQuery]);

  const commitStrips = (next: TimelineStripItem[]) => {
    setStripUndo((prev) => [...prev.slice(-19), strips]);
    setStripRedo([]);
    onUpdateStrips(next);
  };

  const handleStripUndo = () => {
    if (stripUndo.length === 0) return;
    const prev = stripUndo[stripUndo.length - 1];
    setStripUndo((u) => u.slice(0, -1));
    setStripRedo((r) => [...r, strips]);
    onUpdateStrips(prev);
  };

  const handleStripRedo = () => {
    if (stripRedo.length === 0) return;
    const next = stripRedo[stripRedo.length - 1];
    setStripRedo((r) => r.slice(0, -1));
    setStripUndo((u) => [...u, strips]);
    onUpdateStrips(next);
  };

  const appendStripById = (clipId: string) => {
    const def = ACTIONFORGE_CLIPS.find((c) => c.id === clipId);
    if (!def) return;
    const prevEnd = strips.reduce((acc, s) => acc + s.duration / Math.max(0.2, s.speed), 0);
    const item: TimelineStripItem = {
      uid: `strip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      clipId: def.id,
      label: def.label,
      startTime: prevEnd,
      duration: def.duration,
      speed: 1,
      mirror: false,
    };
    commitStrips([...strips, item]);
  };

  const jumpKeyframe = (dir: -1 | 1) => {
    if (animDuration <= 0) return;
    const allTimes = new Set<number>([0, animDuration]);
    activeClipTracks.forEach((tr) => {
      tr.times.forEach((t) => allTimes.add(Number(t.toFixed(4))));
    });
    const sorted = Array.from(allTimes).sort((a, b) => a - b);
    const curTime = animProgress * animDuration;
    if (dir < 0) {
      const prev = [...sorted].reverse().find((t) => t < curTime - 0.02);
      onSeekNormalized((prev ?? 0) / animDuration);
    } else {
      const next = sorted.find((t) => t > curTime + 0.02);
      onSeekNormalized((next ?? animDuration) / animDuration);
    }
  };

  // Pick quaternion track for Graph editor
  const graphBoneTrack = useMemo(() => {
    const quatTracks = activeClipTracks.filter((t) => t.type === 'quaternion');
    if (quatTracks.length === 0) return null;
    if (selectedBoneName) {
      const matched = quatTracks.find((t) => t.name.startsWith(`${selectedBoneName}.`));
      if (matched) return matched;
    }
    return (
      quatTracks.find((t) => t.name.startsWith('upper_arm_R.')) ??
      quatTracks.find((t) => t.name.startsWith('spine')) ??
      quatTracks[0]
    );
  }, [activeClipTracks, selectedBoneName]);

  const graphPoints = useMemo(() => {
    if (!graphBoneTrack || graphBoneTrack.times.length === 0) return null;
    const dur = Math.max(animDuration, graphBoneTrack.times[graphBoneTrack.times.length - 1], 0.1);
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const ptsX: string[] = [];
    const ptsY: string[] = [];
    const ptsZ: string[] = [];

    for (let i = 0; i < graphBoneTrack.times.length; i++) {
      const xCoord = (graphBoneTrack.times[i] / dur) * 600;
      const o = i * 4;
      q.set(
        graphBoneTrack.values[o],
        graphBoneTrack.values[o + 1],
        graphBoneTrack.values[o + 2],
        graphBoneTrack.values[o + 3]
      );
      e.setFromQuaternion(q, 'XYZ');
      const mapY = (rad: number) => 50 - THREE.MathUtils.clamp(rad / Math.PI, -1, 1) * 42;
      ptsX.push(`${xCoord.toFixed(1)},${mapY(e.x).toFixed(1)}`);
      ptsY.push(`${xCoord.toFixed(1)},${mapY(e.y).toFixed(1)}`);
      ptsZ.push(`${xCoord.toFixed(1)},${mapY(e.z).toFixed(1)}`);
    }
    return { ptsX: ptsX.join(' '), ptsY: ptsY.join(' '), ptsZ: ptsZ.join(' ') };
  }, [graphBoneTrack, animDuration]);

  return (
    <div className="rounded-xl bg-[#0F131B] border border-[#231F1D]/15 flex flex-col overflow-hidden text-xs">
      {/* Top Clip Browser Bar */}
      <div className="p-2.5 border-b border-[#231F1D]/15 space-y-2 bg-[#141923]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <span className="font-semibold text-[#231F1D]">ActionForge â€” Biblioteca (84 Clipes)</span>
            <button
              type="button"
              onClick={() => onCopyClipLink(activeClipId)}
              title={`Copiar link direto #clip=${activeClipId}`}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0D1017] border border-slate-700 hover:border-orange-500 text-[10px] font-mono text-sky-300 cursor-pointer"
            >
              <Link2 className="w-3 h-3" />
              <span>#clip={activeClipId}</span>
              <Copy className="w-2.5 h-2.5 text-[#635B54]" />
            </button>
          </div>

          <div className={`flex items-center gap-1.5 ${docked ? 'w-full' : ''}`}>
            <div className={`relative ${docked ? 'flex-1 min-w-0' : ''}`}>
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar clipe (ex: chest_open, sword)..."
                className={`pl-7 pr-2.5 py-1 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 focus:border-orange-500 outline-none text-[11px] text-[#231F1D] ${
                  docked ? 'w-full' : 'w-52 sm:w-64'
                }`}
              />
            </div>
            {!isRigged && (
              <button
                type="button"
                onClick={onRunAutoRig}
                className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-500 text-[11px] font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
              >
                Aplicar Auto-Rig
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {ACTIONFORGE_CATEGORY_TABS.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                category === cat.id
                  ? 'bg-orange-600 text-[#231F1D]'
                  : 'bg-[#0D1017] text-[#635B54] hover:text-[#231F1D] border border-[#231F1D]/15'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Clip Grid */}
        <div
          className={`grid gap-1.5 overflow-y-auto pr-1 ${
            docked
              ? 'grid-cols-2 max-h-56'
              : `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 ${compact ? 'max-h-28' : 'max-h-60'}`
          }`}
        >
          {filteredClips.map((clip) => {
            const isSelected = activeClipId === clip.id;
            return (
              <div
                key={clip.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', clip.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => onSelectClipById(clip.id)}
                title={`${clip.label} (#clip=${clip.id}) Â· Arraste para Base ou clique para reproduzir`}
                className={`group flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg border text-[11px] cursor-pointer select-none transition-colors ${
                  isSelected
                    ? 'bg-orange-600/20 border-orange-500 text-[#231F1D] font-semibold'
                    : 'bg-[#0D1017] border-[#231F1D]/15 hover:border-slate-600 text-slate-300'
                }`}
              >
                <span className="truncate">{clip.label}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  {clip.hasTransitionArrow && (
                    <ArrowRight className="w-3 h-3 text-amber-400/80" aria-label="TransiÃ§Ã£o encadeada" />
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      appendStripById(clip.id);
                    }}
                    title="Adicionar na trilha Base"
                    className="opacity-70 group-hover:opacity-100 px-1 rounded hover:bg-orange-600 hover:text-[#231F1D] text-[#635B54]"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ActionForge Transport & Mode Toolbar */}
      <div className="px-2.5 py-2 border-b border-[#231F1D]/15 bg-[#111622] flex flex-wrap items-center justify-between gap-2">
        {/* Left: Undo / Redo + Transport */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={handleStripUndo}
            disabled={stripUndo.length === 0}
            title="Desfazer trilha (â†¶)"
            className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 disabled:opacity-35 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleStripRedo}
            disabled={stripRedo.length === 0}
            title="Refazer trilha (â†·)"
            className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 disabled:opacity-35 text-slate-300 flex items-center justify-center cursor-pointer mr-1"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onSeekNormalized(0)}
            title="InÃ­cio (|â—€)"
            className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => jumpKeyframe(-1)}
            title="Keyframe anterior (â—‚â—†)"
            className="px-1.5 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 text-[10px] font-mono text-slate-300 flex items-center gap-0.5 cursor-pointer"
          >
            <ChevronLeft className="w-3 h-3" />
            <Diamond className="w-2.5 h-2.5 text-amber-400" />
          </button>
          <button
            type="button"
            onClick={() => onStepFrame(-1)}
            title="Recuar 1 frame (â—€)"
            className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pausar' : 'Reproduzir (â–¶)'}
            className={`w-8 h-7 rounded flex items-center justify-center cursor-pointer text-[#231F1D] font-semibold ${
              isPlaying ? 'bg-amber-600 hover:bg-amber-500' : 'bg-emerald-600 hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onStepFrame(1)}
            title="AvanÃ§ar 1 frame"
            className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => jumpKeyframe(1)}
            title="PrÃ³ximo keyframe (â—†â–¸)"
            className="px-1.5 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 text-[10px] font-mono text-slate-300 flex items-center gap-0.5 cursor-pointer"
          >
            <Diamond className="w-2.5 h-2.5 text-amber-400" />
            <ChevronRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onSeekNormalized(1)}
            title="Fim (â–¶|)"
            className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onAddBoneKeyframe}
            disabled={!isRigged}
            title="Inserir Keyframe (â—†) na pose atual do osso selecionado"
            className="inline-flex items-center gap-1 h-7 px-2 rounded bg-[#0D1017] border border-amber-500/50 hover:bg-amber-500/15 disabled:opacity-40 text-[11px] text-amber-300 cursor-pointer ml-1"
          >
            <Diamond className="w-3 h-3 fill-amber-400" />
            <span className="hidden sm:inline">Key â—†</span>
          </button>

          {onCopyKeyframe && (
            <button
              type="button"
              onClick={onCopyKeyframe}
              disabled={!isRigged}
              title="Copiar Keyframe atual"
              className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-slate-600 disabled:opacity-40 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          {onPasteKeyframe && (
            <button
              type="button"
              onClick={onPasteKeyframe}
              disabled={!isRigged || !hasCopiedKeyframe}
              title="Colar Keyframe no frame atual"
              className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-sky-500 disabled:opacity-40 text-sky-300 flex items-center justify-center cursor-pointer"
            >
              <ClipboardPaste className="w-3 h-3" />
            </button>
          )}
          {onDeleteKeyframe && (
            <button
              type="button"
              onClick={onDeleteKeyframe}
              disabled={!isRigged}
              title="Apagar Keyframe prÃ³ximo ao frame atual"
              className="w-7 h-7 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-red-500/70 disabled:opacity-40 text-red-300 flex items-center justify-center cursor-pointer"
            >
              <Eraser className="w-3 h-3" />
            </button>
          )}

          {onChangeInterpolationMode && (
            <select
              value={interpolationMode}
              onChange={(e) => onChangeInterpolationMode(e.target.value as KeyframeInterpolationMode)}
              title="Curva de InterpolaÃ§Ã£o (FCurve Blender: BÃ©zier / Linear / Constant)"
              aria-label="Curva de interpolaÃ§Ã£o"
              className="h-7 px-1.5 rounded bg-[#0D1017] border border-[#231F1D]/15 text-[10px] text-slate-200 cursor-pointer"
            >
              <option value="ease">Ease In/Out</option>
              <option value="linear">Linear</option>
              <option value="step">Step</option>
            </select>
          )}

          <button
            type="button"
            onClick={onToggleAutoKey}
            disabled={!isRigged}
            title="Auto-Key: grava keyframe automaticamente ao girar um osso no Pose Mode"
            className={`inline-flex items-center gap-1 h-7 px-2 rounded border text-[11px] cursor-pointer disabled:opacity-40 ${
              autoKey
                ? 'bg-red-600/25 border-red-500 text-red-300'
                : 'bg-[#0D1017] border-[#231F1D]/15 text-[#635B54] hover:text-slate-200'
            }`}
          >
            <CircleDot className="w-3 h-3" />
            <span className="hidden xl:inline">Auto-Key</span>
          </button>

          {strips.length > 0 && (
            <button
              type="button"
              onClick={() => commitStrips([])}
              title="Limpar faixas NLA da trilha Base"
              className="inline-flex items-center gap-1 h-7 px-2 rounded bg-[#0D1017] border border-[#231F1D]/15 hover:border-red-500/60 text-[11px] text-slate-300 hover:text-red-300 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden xl:inline">Limpar</span>
            </button>
          )}
        </div>

        {/* Center: View Tabs (Strips | Graph | Keys) */}
        <div className="flex items-center gap-1 bg-[#0D1017] p-0.5 rounded-lg border border-[#231F1D]/15">
          {(['strips', 'graph', 'keys'] as SequencerViewMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium capitalize cursor-pointer ${
                viewMode === mode ? 'bg-orange-600 text-[#231F1D]' : 'text-[#635B54] hover:text-slate-200'
              }`}
            >
              {mode === 'strips' ? 'Strips' : mode === 'graph' ? 'Graph' : 'Keys'}
            </button>
          ))}
        </div>

        {/* Right: Zoom, FPS, Range, Loop, Mirror, Speed */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <div className="flex items-center rounded bg-[#0D1017] border border-[#231F1D]/15">
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              title="Zoom -"
              className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-[#231F1D] cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoomScale(1)}
              title="Fit"
              className="px-1.5 h-6 text-[10px] font-medium text-slate-300 hover:text-[#231F1D] border-x border-[#231F1D]/15 cursor-pointer"
            >
              Fit
            </button>
            <button
              type="button"
              onClick={() => setZoomScale((z) => Math.min(2.5, Number((z + 0.25).toFixed(2))))}
              title="Zoom +"
              className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-[#231F1D] cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          <span className="px-2 py-1 rounded bg-[#0D1017] border border-sky-500/40 font-mono text-sky-300 tabular-nums">
            Frame: {currentFrame}
          </span>
          <span className="px-2 py-1 rounded bg-[#0D1017] border border-[#231F1D]/15 font-mono text-slate-300 tabular-nums">
            {hasCustomRange ? `Trecho: ${inFrame}â€“${outFrame}f` : `InÃ­cio: 1 Â· Fim: ${totalFrames}`}
          </span>

          {onSetPlayRange && (
            <div className="flex items-center rounded bg-[#0D1017] border border-[#231F1D]/15 divide-x divide-slate-800">
              <button
                type="button"
                onClick={() =>
                  onSetPlayRange(
                    Math.min(animProgress, clampedOut - 0.04),
                    clampedOut
                  )
                }
                title="Definir frame atual como InÃ­cio (In) do trecho de reproduÃ§Ã£o"
                className="px-1.5 h-6 text-[10px] font-mono text-amber-300 hover:bg-[#FAF8F5] cursor-pointer"
              >
                [ In
              </button>
              <button
                type="button"
                onClick={() =>
                  onSetPlayRange(
                    clampedIn,
                    Math.max(animProgress, clampedIn + 0.04)
                  )
                }
                title="Definir frame atual como Fim (Out) do trecho de reproduÃ§Ã£o"
                className="px-1.5 h-6 text-[10px] font-mono text-amber-300 hover:bg-[#FAF8F5] cursor-pointer"
              >
                Out ]
              </button>
              {hasCustomRange && onResetPlayRange && (
                <button
                  type="button"
                  onClick={onResetPlayRange}
                  title="Limpar trecho In/Out"
                  className="px-1.5 h-6 text-[10px] font-mono text-[#635B54] hover:text-[#231F1D] hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Ã—
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleLoop}
            title="Loop contÃ­nuo"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer ${
              animLoop
                ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                : 'bg-[#0D1017] border-[#231F1D]/15 text-[#635B54]'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>Loop</span>
          </button>

          <button
            type="button"
            onClick={onToggleMirror}
            title="Espelhar L/R (Mirror Symmetry)"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer ${
              mirrorClip
                ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                : 'bg-[#0D1017] border-[#231F1D]/15 text-[#635B54]'
            }`}
          >
            <FlipHorizontal2 className="w-3 h-3" />
            <span>Espelhar</span>
          </button>

          <button
            type="button"
            onClick={onToggleReverse}
            title="Reverso: reproduzir clipe de trÃ¡s para frente"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer ${
              reverseClip
                ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                : 'bg-[#0D1017] border-[#231F1D]/15 text-[#635B54]'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reverso</span>
          </button>

          <button
            type="button"
            onClick={onToggleInPlace}
            title="In Place: trava deslocamento horizontal (X/Z) na origem"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded border cursor-pointer ${
              inPlaceClip
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                : 'bg-[#0D1017] border-[#231F1D]/15 text-[#635B54]'
            }`}
          >
            <Anchor className="w-3 h-3" />
            <span>In Place</span>
          </button>

          <select
            value={animSpeed}
            onChange={(e) => onChangeSpeed(Number(e.target.value))}
            aria-label="Velocidade da animaÃ§Ã£o"
            className="px-1.5 py-1 rounded bg-[#0D1017] border border-[#231F1D]/15 font-mono text-slate-200"
          >
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((sp) => (
              <option key={sp} value={sp}>
                {sp}x
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Playhead Scrubber */}
      <div className="px-3 py-1.5 bg-[#0D1017] border-b border-[#231F1D]/15/80 flex items-center gap-2.5">
        <span className="text-[10px] font-mono text-[#635B54] tabular-nums w-14">
          {timeUnit === 'sec'
            ? `${(animProgress * animDuration).toFixed(2)}s`
            : `${currentFrame}f`}
        </span>
        <div className="relative flex-1 flex items-center">
          {hasCustomRange && (
            <div
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 h-2 rounded bg-amber-500/30 border-x-2 border-amber-400"
              style={{
                left: `${clampedIn * 100}%`,
                width: `${Math.max(2, (clampedOut - clampedIn) * 100)}%`,
              }}
            />
          )}
          <input
            type="range"
            min={0}
            max={1}
            step={0.005}
            value={animProgress}
            onChange={(e) => onSeekNormalized(Number(e.target.value))}
            aria-label="Timeline playhead"
            className="relative z-10 w-full accent-orange-500"
          />
        </div>
        <span className="text-[10px] font-mono text-[#635B54] tabular-nums w-14 text-right">
          {timeUnit === 'sec' ? `${animDuration.toFixed(2)}s` : `${totalFrames}f`}
        </span>
        <button
          type="button"
          onClick={() => setTimeUnit((u) => (u === 'sec' ? 'frm' : 'sec'))}
          title="Alternar exibiÃ§Ã£o entre segundos e frames"
          className="px-1.5 py-0.5 rounded bg-[#141923] border border-[#231F1D]/15 hover:border-slate-600 text-[10px] font-mono text-slate-300 cursor-pointer"
        >
          {timeUnit === 'sec' ? 'SEC' : 'FRM'}
        </button>
      </div>

      {/* Mode Content: Strips | Graph | Keys */}
      <div className="p-2.5 space-y-2 bg-[#0D1017] overflow-x-auto">
        {viewMode === 'strips' && (
          <div className="space-y-2" style={{ minWidth: `${Math.round(100 * zoomScale)}%` }}>
            {/* Base Track with Drop Zone */}
            <div className={`grid ${docked ? 'grid-cols-[72px_1fr]' : 'grid-cols-[96px_1fr]'} gap-2 items-stretch`}>
              <div className="px-2.5 py-2 rounded-lg bg-[#141923] border border-[#231F1D]/15 flex flex-col justify-center">
                <span className="font-semibold text-slate-200 text-[11px]">Base</span>
                <span className="text-[10px] text-slate-500">{strips.length} strip(s)</span>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverBase(true);
                }}
                onDragLeave={() => setDragOverBase(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverBase(false);
                  const clipId = e.dataTransfer.getData('text/plain');
                  if (clipId) appendStripById(clipId);
                }}
                className={`min-h-[44px] rounded-lg border border-dashed p-1.5 flex items-center gap-1.5 overflow-x-auto transition-colors ${
                  dragOverBase
                    ? 'border-orange-400 bg-orange-500/10'
                    : 'border-slate-700 bg-[#111622]'
                }`}
              >
                {strips.length === 0 ? (
                  <div className="w-full text-center text-[11px] text-[#635B54] py-1">
                    Arraste um clipe da grade acima para iniciar (Drag a clip here from the grid to start)
                  </div>
                ) : (
                  strips.map((st, idx) => (
                    <div
                      key={st.uid}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-orange-600/20 border border-orange-500/50 text-[11px] text-[#231F1D] shrink-0"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectClipById(st.clipId)}
                        className="font-medium hover:text-orange-300 cursor-pointer"
                      >
                        {st.label}
                      </button>
                      <span className="text-[10px] font-mono text-[#635B54] tabular-nums">
                        {(st.duration / st.speed).toFixed(1)}s
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          commitStrips(
                            strips.map((x) => (x.uid === st.uid ? { ...x, mirror: !x.mirror } : x))
                          )
                        }
                        title="Espelhar strip"
                        className={`px-1 rounded text-[10px] cursor-pointer ${
                          st.mirror ? 'bg-sky-600 text-[#231F1D]' : 'text-[#635B54] hover:text-[#231F1D]'
                        }`}
                      >
                        L/R
                      </button>
                      <button
                        type="button"
                        onClick={() => commitStrips(strips.filter((x) => x.uid !== st.uid))}
                        title="Remover strip"
                        className="text-[#635B54] hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      {idx < strips.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-amber-400 ml-0.5" />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Layer (Mask) Track */}
            <div className={`grid ${docked ? 'grid-cols-[72px_1fr]' : 'grid-cols-[96px_1fr]'} gap-2 items-center`}>
              <div className="px-2.5 py-2 rounded-lg bg-[#141923] border border-[#231F1D]/15 flex items-center gap-1">
                <Layers className="w-3 h-3 text-sky-400" />
                <span className="font-semibold text-slate-200 text-[11px]">Layer</span>
              </div>
              <div className="rounded-lg bg-[#111622] border border-[#231F1D]/15 p-1.5 flex flex-wrap items-center gap-2 text-[11px]">
                <select
                  value={overlayClipId}
                  onChange={(e) => onSetOverlayLayer(e.target.value, overlayMask, overlayWeight)}
                  aria-label="Clipe de camada sobreposta"
                  className="px-2 py-1 rounded bg-[#0D1017] border border-slate-700 text-slate-200 max-w-[180px]"
                >
                  <option value="">Sem camada extra</option>
                  {ACTIONFORGE_CLIPS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>

                <select
                  value={overlayMask}
                  onChange={(e) =>
                    onSetOverlayLayer(overlayClipId, e.target.value as BoneMaskRegion, overlayWeight)
                  }
                  aria-label="MÃ¡scara de ossos da camada"
                  className="px-2 py-1 rounded bg-[#0D1017] border border-slate-700 text-slate-200"
                >
                  {BONE_MASK_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-[#635B54] ml-auto">
                  <span>Peso</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={overlayWeight}
                    onChange={(e) =>
                      onSetOverlayLayer(overlayClipId, overlayMask, Number(e.target.value))
                    }
                    className="w-24 accent-sky-400"
                  />
                  <span className="font-mono text-slate-200 tabular-nums w-9 text-right">
                    {Math.round(overlayWeight * 100)}%
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {viewMode === 'graph' && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-[#635B54]">Osso na curva:</span>
                <select
                  value={graphBoneTrack?.name.split('.')[0] ?? ''}
                  onChange={(e) => onSelectBone(e.target.value)}
                  className="px-2 py-1 rounded bg-[#141923] border border-slate-700 text-slate-200 font-mono"
                >
                  {riggedBoneNames.length === 0 ? (
                    <option value="">Sem esqueleto</option>
                  ) : (
                    riggedBoneNames.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex items-center gap-3 font-mono text-[10px]">
                <span className="text-rose-400">â— Rot X</span>
                <span className="text-emerald-400">â— Rot Y</span>
                <span className="text-sky-400">â— Rot Z</span>
              </div>
            </div>

            <div className="relative rounded-lg bg-[#111622] border border-[#231F1D]/15 p-2">
              {graphPoints ? (
                <svg
                  viewBox="0 0 600 100"
                  className="w-full h-24 cursor-crosshair"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1);
                    onSeekNormalized(pct);
                  }}
                >
                  <line x1="0" y1="50" x2="600" y2="50" stroke="#1e293b" strokeWidth="1" />
                  <polyline fill="none" stroke="#fb7185" strokeWidth="2" points={graphPoints.ptsX} />
                  <polyline fill="none" stroke="#34d399" strokeWidth="2" points={graphPoints.ptsY} />
                  <polyline fill="none" stroke="#38bdf8" strokeWidth="2" points={graphPoints.ptsZ} />
                  <line
                    x1={animProgress * 600}
                    y1="0"
                    x2={animProgress * 600}
                    y2="100"
                    stroke="#f97316"
                    strokeWidth="2"
                  />
                </svg>
              ) : (
                <div className="h-24 flex items-center justify-center text-[11px] text-slate-500">
                  Aplique o Auto-Rig ou selecione um clipe com faixas de rotaÃ§Ã£o para visualizar as curvas X/Y/Z.
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'keys' && (
          <div className="max-h-40 overflow-y-auto rounded-lg bg-[#111622] border border-[#231F1D]/15 divide-y divide-slate-800/70">
            {activeClipTracks.length === 0 ? (
              <div className="p-4 text-center text-[11px] text-slate-500">
                Nenhum keyframe ativo. Aplique o Auto-Rig para inspecionar ou arrastar keyframes.
              </div>
            ) : (
              activeClipTracks.map((tr) => {
                const dur = Math.max(animDuration, 0.1);
                return (
                  <div
                    key={tr.name}
                    className={`grid ${docked ? 'grid-cols-[112px_1fr]' : 'grid-cols-[150px_1fr]'} items-center gap-2 px-2.5 py-1.5`}
                  >
                    <button
                      type="button"
                      onClick={() => onSelectBone(tr.name.split('.')[0])}
                      className="text-left font-mono text-[10px] text-slate-300 hover:text-orange-300 truncate cursor-pointer"
                    >
                      {tr.name}
                    </button>
                    <div className="relative h-5 bg-[#0D1017] rounded border border-[#231F1D]/15/80 select-none">
                      {/* Blue Blender-style Playhead Needle */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-[#38BDF8] pointer-events-none z-10"
                        style={{ left: `${animProgress * 100}%` }}
                      />
                      {tr.times.map((t, ki) => {
                        const pct = THREE.MathUtils.clamp((t / dur) * 100, 1, 99);
                        return (
                          <button
                            key={`${ki}_${t}`}
                            type="button"
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              const trackEl = e.currentTarget.parentElement;
                              if (!trackEl || !onMoveKeyframe) {
                                onSeekNormalized(THREE.MathUtils.clamp(t / dur, 0, 1));
                                return;
                              }
                              const rect = trackEl.getBoundingClientRect();
                              let dragged = false;
                              let latestTime = t;
                              const startX = e.clientX;
                              const onMove = (ev: PointerEvent) => {
                                if (Math.abs(ev.clientX - startX) > 3) dragged = true;
                                if (!dragged) return;
                                const nextPct = THREE.MathUtils.clamp(
                                  (ev.clientX - rect.left) / Math.max(1, rect.width),
                                  0,
                                  1
                                );
                                latestTime = Number((nextPct * dur).toFixed(3));
                                onSeekNormalized(nextPct);
                              };
                              const onUp = () => {
                                window.removeEventListener('pointermove', onMove);
                                window.removeEventListener('pointerup', onUp);
                                if (dragged && Math.abs(latestTime - t) > 0.01) {
                                  onMoveKeyframe(tr.name, t, latestTime);
                                } else {
                                  onSeekNormalized(THREE.MathUtils.clamp(t / dur, 0, 1));
                                }
                              };
                              window.addEventListener('pointermove', onMove);
                              window.addEventListener('pointerup', onUp);
                            }}
                            title={`Frame ${Math.max(1, Math.round(t * FPS))} (${t.toFixed(2)}s) Â· Arraste para mover`}
                            style={{ left: `${pct}%` }}
                            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-400 hover:text-[#231F1D] cursor-ew-resize"
                          >
                            <Diamond className="w-3 h-3 fill-amber-400" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

