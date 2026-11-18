import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Repeat,
  Circle,
  Diamond,
  Trash2,
  Plus,
} from 'lucide-react';
import { ActionForgeClipItem } from '../data/actionForgeClips';

export interface TimelineStrip {
  id: string;
  clip: ActionForgeClipItem;
  startFrame: number;
  endFrame: number;
}

interface ActionForgeTimelineProps {
  activeClip: ActionForgeClipItem | null;
  isPlaying: boolean;
  speed: number;
  onTogglePlay: () => void;
  onStop: () => void;
  onSelectClip: (clip: ActionForgeClipItem) => void;
  onSpeedChange: (speed: number) => void;
}

type TimelineTab = 'strips' | 'graph' | 'keys';

export const ActionForgeTimeline: React.FC<ActionForgeTimelineProps> = ({
  activeClip,
  isPlaying,
  speed,
  onTogglePlay,
  onStop,
  onSelectClip,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [tab, setTab] = useState<TimelineTab>('strips');
  const [currentFrame, setCurrentFrame] = useState(1);
  const [startFrame, setStartFrame] = useState(1);
  const [endFrame, setEndFrame] = useState(75);
  const [fps] = useState(30);
  const [loop, setLoop] = useState(true);
  const [strips, setStrips] = useState<TimelineStrip[]>([]);
  const [keyframes, setKeyframes] = useState<number[]>([1, 15, 30, 45, 60, 75]);

  // Sync active clip into Strips track automatically (unlimited strips, auto-expanding timeline)
  useEffect(() => {
    if (!activeClip) return;
    setStrips((prev) => {
      if (prev.some((s) => s.clip.id === activeClip.id)) return prev;
      const lastEnd = prev.length > 0 ? prev[prev.length - 1].endFrame : 0;
      const sStart = lastEnd + 1;
      const sEnd = sStart + 29;
      if (sEnd > endFrame) {
        setEndFrame(sEnd);
      }
      return [
        ...prev,
        {
          id: `${activeClip.id}_${Date.now()}`,
          clip: activeClip,
          startFrame: sStart,
          endFrame: sEnd,
        },
      ];
    });
  }, [activeClip, endFrame]);

  // Advance playhead when playing
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(16, Math.round(1000 / (fps * Math.max(0.25, speed))));
    const timer = window.setInterval(() => {
      setCurrentFrame((prev) => {
        if (prev >= endFrame) {
          if (loop) return startFrame;
          onStop();
          return endFrame;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, fps, speed, startFrame, endFrame, loop, onStop]);

  // Automatically switch 3D character movement to match the strip under the current playhead frame
  useEffect(() => {
    if (strips.length === 0) return;
    const matched = strips.find(
      (s) => currentFrame >= s.startFrame && currentFrame <= s.endFrame
    );
    if (matched && matched.clip.id !== activeClip?.id) {
      onSelectClip(matched.clip);
    }
  }, [currentFrame, strips, activeClip?.id, onSelectClip]);

  const totalFrames = Math.max(10, endFrame - startFrame + 1);
  const playheadPct = Math.min(
    100,
    Math.max(0, ((currentFrame - startFrame) / Math.max(1, totalFrames - 1)) * 100)
  );

  const rulerCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = rulerCanvasRef.current;
    if (!canvas || collapsed) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(100, Math.floor(rect.width));
    const h = Math.max(20, Math.floor(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const span = Math.max(1, totalFrames - 1);
    const majorStep = totalFrames > 200 ? 20 : totalFrames > 100 ? 10 : 5;
    ctx.font = '9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textBaseline = 'top';

    for (let f = startFrame; f <= endFrame; f++) {
      const x = Math.round(((f - startFrame) / span) * w) + 0.5;
      const isMajor = (f - startFrame) % majorStep === 0 || f === startFrame || f === endFrame;
      ctx.strokeStyle = isMajor ? '#475569' : '#1e293b';
      ctx.beginPath();
      ctx.moveTo(x, isMajor ? h - 8 : h - 4);
      ctx.lineTo(x, h);
      ctx.stroke();
      if (isMajor && x < w - 16) {
        ctx.fillStyle = '#64748b';
        ctx.fillText(String(f), x + 2, 2);
      }
    }
  }, [startFrame, endFrame, totalFrames, collapsed]);

  const handleRulerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const frame = Math.round(startFrame + ratio * (endFrame - startFrame));
    setCurrentFrame(frame);
  };

  const addKeyframeAtCurrent = () => {
    setKeyframes((prev) =>
      prev.includes(currentFrame) ? prev : [...prev, currentFrame].sort((a, b) => a - b)
    );
  };

  const removeStrip = (id: string) => {
    setStrips((prev) => prev.filter((s) => s.id !== id));
  };

  // Generate SVG path for Graph tab based on active clip
  const graphPaths = useMemo(() => {
    const pts = (phase: number, amp: number) => {
      const coords: string[] = [];
      for (let i = 0; i <= 40; i++) {
        const x = (i / 40) * 100;
        const y = 50 - Math.sin((i / 40) * Math.PI * 2 * (activeClip ? activeClip.speed : 1) + phase) * amp;
        coords.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
      }
      return coords.join(' ');
    };
    return {
      rotX: pts(0, 32),
      rotY: pts(1.2, 22),
      rotZ: pts(2.4, 15),
    };
  }, [activeClip]);

  return (
    <div className="hidden md:flex flex-col w-full shrink-0 z-20 bg-[#0B0E14] border-t border-slate-800 text-[10px] text-slate-300 select-none">
      {/* Transport & Mode Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-slate-800/90 bg-[#10141D]">
        {/* Left: Collapse + Active Clip */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-[#181E2C] hover:bg-slate-700 text-slate-200 cursor-pointer"
            title={collapsed ? 'Expandir Timeline' : 'Recolher Timeline'}
          >
            {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span className="font-semibold tracking-wide uppercase text-[9px]">Timeline</span>
          </button>
          <span className="text-[10px] text-cyan-300 font-medium truncate max-w-[160px]">
            {activeClip ? activeClip.label : 'Base (nenhum clipe ativo)'}
          </span>
        </div>

        {/* Center: Playback Transport */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLoop((l) => !l)}
            title="Loop"
            className={`p-1 rounded cursor-pointer ${
              loop ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentFrame(startFrame)}
            title="Ir para o início"
            className="p-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <ChevronFirst className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentFrame((f) => Math.max(startFrame, f - 1))}
            title="Frame anterior"
            className="p-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pausar (Espaço)' : 'Reproduzir (Espaço)'}
            className={`px-2.5 py-1 rounded font-semibold inline-flex items-center gap-1 cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setCurrentFrame((f) => Math.min(endFrame, f + 1))}
            title="Próximo frame"
            className="p-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCurrentFrame(endFrame)}
            title="Ir para o fim"
            className="p-1 rounded text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <ChevronLast className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={addKeyframeAtCurrent}
            title="Inserir Keyframe no frame atual"
            className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-500/20 border border-rose-500/50 text-rose-300 hover:bg-rose-500 hover:text-white cursor-pointer"
          >
            <Circle className="w-2.5 h-2.5 fill-current" />
            <span className="text-[9px] font-semibold">Key</span>
          </button>
        </div>

        {/* Right: Mode Tabs + Frame Counters */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded bg-[#0B0E14] border border-slate-800 p-0.5">
            {(['strips', 'graph', 'keys'] as TimelineTab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTab(t);
                  setCollapsed(false);
                }}
                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider cursor-pointer ${
                  tab === t
                    ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="px-1.5 py-0.5 rounded bg-[#181E2C] text-cyan-300">
              Frame {currentFrame}
            </span>
            <label className="inline-flex items-center gap-1 text-slate-400">
              <span>Start</span>
              <input
                type="number"
                value={startFrame}
                min={1}
                max={endFrame - 5}
                onChange={(e) => setStartFrame(Math.max(1, Number(e.target.value) || 1))}
                className="w-10 px-1 py-0.5 rounded bg-[#0B0E14] border border-slate-800 text-slate-200 text-center"
              />
            </label>
            <label className="inline-flex items-center gap-1 text-slate-400">
              <span>End</span>
              <input
                type="number"
                value={endFrame}
                min={startFrame + 10}
                max={600}
                onChange={(e) => setEndFrame(Math.max(startFrame + 10, Number(e.target.value) || 75))}
                className="w-10 px-1 py-0.5 rounded bg-[#0B0E14] border border-slate-800 text-slate-200 text-center"
              />
            </label>
            <span className="px-1.5 py-0.5 rounded bg-[#181E2C] text-slate-400">{fps} FPS</span>
          </div>
        </div>
      </div>

      {/* Timeline Body */}
      {!collapsed && (
        <div className="flex flex-col h-32">
          {/* Frame Ruler */}
          <div className="flex border-b border-slate-800/80 bg-[#0E121B]">
            <div className="w-28 shrink-0 px-2.5 py-1 border-r border-slate-800 text-[9px] text-slate-500 uppercase font-semibold">
              Range
            </div>
            <div
              onClick={handleRulerClick}
              className="relative flex-1 h-6 cursor-ew-resize overflow-hidden"
            >
              <canvas ref={rulerCanvasRef} className="w-full h-full block" />
              {/* Red Playhead Badge */}
              <div
                style={{ left: `${playheadPct}%` }}
                className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
              >
                <span className="px-1 rounded-sm bg-rose-500 text-white text-[8px] font-mono font-bold leading-tight">
                  {currentFrame}
                </span>
                <span className="w-px flex-1 bg-rose-500" />
              </div>
            </div>
          </div>

          {/* STRIPS VIEW */}
          {tab === 'strips' && (
            <div className="flex flex-1 min-h-0">
              <div className="w-28 shrink-0 px-2.5 py-2 border-r border-slate-800 flex flex-col justify-between bg-[#0E121B]">
                <div>
                  <div className="font-semibold text-slate-200 text-[10px]">Base</div>
                  <div className="text-[8px] text-slate-500">Clique em um clipe</div>
                </div>
                {strips.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStrips([])}
                    className="inline-flex items-center gap-1 text-[9px] text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
              <div
                onClick={handleRulerClick}
                className="relative flex-1 p-2 overflow-hidden bg-[#0A0D13]"
              >
                {strips.length === 0 ? (
                  <div className="h-full rounded border border-dashed border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                    Clique em qualquer um dos 85 clipes na biblioteca à esquerda para adicionar na faixa Base
                  </div>
                ) : (
                  <div className="relative h-full">
                    {strips.map((strip) => {
                      const leftPct =
                        ((strip.startFrame - startFrame) / Math.max(1, totalFrames - 1)) * 100;
                      const widthPct = Math.max(
                        12,
                        ((strip.endFrame - strip.startFrame) / Math.max(1, totalFrames - 1)) * 100
                      );
                      const isSelected = activeClip?.id === strip.clip.id;
                      return (
                        <div
                          key={strip.id}
                          style={{ left: `${leftPct}%`, width: `${Math.min(100 - leftPct, widthPct)}%` }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectClip(strip.clip);
                          }}
                          className={`absolute top-2 bottom-2 rounded-md border px-2 py-1 flex items-center justify-between gap-1 cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100'
                              : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-cyan-500/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold truncate">{strip.clip.label}</div>
                            <div className="text-[8px] font-mono text-slate-400">
                              {strip.startFrame}f – {strip.endFrame}f · {strip.clip.tag}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeStrip(strip.id);
                            }}
                            className="p-0.5 rounded hover:bg-rose-500/30 text-slate-400 hover:text-rose-200 cursor-pointer"
                            title="Remover strip"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Playhead line */}
                <div
                  style={{ left: `${playheadPct}%` }}
                  className="absolute top-0 bottom-0 w-px bg-rose-500 pointer-events-none z-10"
                />
              </div>
            </div>
          )}

          {/* GRAPH VIEW */}
          {tab === 'graph' && (
            <div className="flex flex-1 min-h-0">
              <div className="w-28 shrink-0 px-2.5 py-2 border-r border-slate-800 flex flex-col gap-1 bg-[#0E121B] text-[9px]">
                <span className="font-semibold text-slate-300 uppercase">F-Curves</span>
                <span className="text-rose-400">● Rot X (Pitch)</span>
                <span className="text-emerald-400">● Rot Y (Yaw)</span>
                <span className="text-cyan-400">● Rot Z (Roll)</span>
              </div>
              <div
                onClick={handleRulerClick}
                className="relative flex-1 bg-[#0A0D13] overflow-hidden cursor-ew-resize"
              >
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#1e293b" strokeWidth="0.5" />
                  <path d={graphPaths.rotX} fill="none" stroke="#f43f5e" strokeWidth="1.2" />
                  <path d={graphPaths.rotY} fill="none" stroke="#10b981" strokeWidth="1.2" />
                  <path d={graphPaths.rotZ} fill="none" stroke="#06b6d4" strokeWidth="1.2" />
                </svg>
                <div
                  style={{ left: `${playheadPct}%` }}
                  className="absolute top-0 bottom-0 w-px bg-rose-500 pointer-events-none"
                />
              </div>
            </div>
          )}

          {/* KEYS VIEW */}
          {tab === 'keys' && (
            <div className="flex flex-1 min-h-0">
              <div className="w-28 shrink-0 px-2.5 py-1.5 border-r border-slate-800 flex flex-col justify-between bg-[#0E121B] text-[9px]">
                <div className="flex flex-col gap-1 text-slate-400">
                  <span>Hips / Root</span>
                  <span>Spine &amp; Head</span>
                  <span>Arms (IK/FK)</span>
                  <span>Legs (IK/FK)</span>
                </div>
                <button
                  type="button"
                  onClick={addKeyframeAtCurrent}
                  className="inline-flex items-center gap-1 text-cyan-300 hover:text-cyan-200 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Key ({currentFrame}f)</span>
                </button>
              </div>
              <div
                onClick={handleRulerClick}
                className="relative flex-1 bg-[#0A0D13] overflow-hidden flex flex-col justify-around py-1"
              >
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="relative h-4 border-b border-slate-800/40">
                    {keyframes.map((kf) => {
                      const leftPct = ((kf - startFrame) / Math.max(1, totalFrames - 1)) * 100;
                      return (
                        <button
                          key={`${row}_${kf}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentFrame(kf);
                          }}
                          style={{ left: `${leftPct}%` }}
                          title={`Keyframe ${kf}`}
                          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-amber-400 hover:text-cyan-300 cursor-pointer"
                        >
                          <Diamond className="w-2.5 h-2.5 fill-current" />
                        </button>
                      );
                    })}
                  </div>
                ))}
                <div
                  style={{ left: `${playheadPct}%` }}
                  className="absolute top-0 bottom-0 w-px bg-rose-500 pointer-events-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
