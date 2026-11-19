import { useCallback, useRef } from 'react';
import { ChevronsLeft, ChevronsRight, Pause, Play, SkipBack, SkipForward } from 'lucide-react';

export const TIMELINE_FPS = 24;

export interface TimelineClip {
  name: string;
}

interface AnimationTimelineProps {
  currentFrame: number;
  endFrame: number;
  isPlaying: boolean;
  keyframes: number[];
  clips: TimelineClip[];
  activeClipIdx: number;
  onTogglePlay: () => void;
  onScrub: (frame: number) => void;
  onJumpKeyframe: (direction: -1 | 1) => void;
  onAddKeyframe: () => void;
  onSelectClip: (idx: number) => void;
  onSetEndFrame: (frames: number) => void;
}

/** Rótulo amigável + ordem para os movimentos essenciais, deduzidos pelo nome do clipe. */
const ESSENTIAL_MOVES: { match: RegExp; label: string }[] = [
  { match: /idle|breath|float/i, label: 'Idle' },
  { match: /walk/i, label: 'Andar' },
  { match: /run/i, label: 'Correr' },
  { match: /jump/i, label: 'Pular' },
  { match: /wave/i, label: 'Acenar' },
  { match: /spin|turn/i, label: 'Girar' },
  { match: /test/i, label: 'Teste' },
];

export function essentialMoveLabel(clipName: string): string {
  return ESSENTIAL_MOVES.find((m) => m.match.test(clipName))?.label ?? clipName.replace(/_/g, ' ');
}

const END_FRAME_PRESETS = [24, 48, 60, 120];

function formatTime(frame: number): string {
  const sec = Math.max(0, frame - 1) / TIMELINE_FPS;
  const whole = Math.floor(sec);
  const rest = Math.round((sec - whole) * TIMELINE_FPS);
  return `${String(whole).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function AnimationTimeline({
  currentFrame,
  endFrame,
  isPlaying,
  keyframes,
  clips,
  activeClipIdx,
  onTogglePlay,
  onScrub,
  onJumpKeyframe,
  onAddKeyframe,
  onSelectClip,
  onSetEndFrame,
}: AnimationTimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const last = Math.max(1, endFrame);
  const span = Math.max(1, last - 1);
  const pct = (frame: number) => `${(Math.min(Math.max(frame, 1), last) - 1) / span * 100}%`;

  const frameFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return 1;
      const rect = el.getBoundingClientRect();
      const t = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      return Math.round(Math.min(1, Math.max(0, t)) * span) + 1;
    },
    [span]
  );

  const step = (delta: number) => onScrub(Math.min(last, Math.max(1, currentFrame + delta)));

  const tickEvery = last > 96 ? 12 : 6;
  const ticks: number[] = [];
  for (let f = 1; f <= last; f += tickEvery) ticks.push(f);

  const btn =
    'inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#0D1017] border border-slate-800 text-slate-200 hover:text-white hover:border-slate-500 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-default';

  return (
    <section
      aria-label="Timeline de animação"
      className="absolute bottom-16 left-3 right-3 z-10 rounded-xl bg-[#141923]/95 backdrop-blur-md border border-slate-700/85 shadow-2xl p-2 flex flex-col gap-2 text-[11px] text-slate-300"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => onScrub(1)} title="Ir ao início" aria-label="Ir ao início">
            <SkipBack className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={btn} onClick={() => onJumpKeyframe(-1)} title="Keyframe anterior" aria-label="Keyframe anterior">
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pausar' : 'Reproduzir'}
            aria-label={isPlaying ? 'Pausar' : 'Reproduzir'}
            className="inline-flex items-center justify-center w-9 h-7 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button type="button" className={btn} onClick={() => onJumpKeyframe(1)} title="Próximo keyframe" aria-label="Próximo keyframe">
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
          <button type="button" className={btn} onClick={() => onScrub(last)} title="Ir ao fim" aria-label="Ir ao fim">
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="font-mono tabular-nums text-slate-100" aria-live="off">
          <span className="text-emerald-300">{String(currentFrame).padStart(3, '0')}f</span>
          <span className="text-slate-500"> / {last}f · </span>
          <span>{formatTime(currentFrame)}</span>
          <span className="text-slate-500"> @{TIMELINE_FPS}fps</span>
        </div>

        <button
          type="button"
          onClick={onAddKeyframe}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600 hover:text-white font-semibold cursor-pointer transition-colors"
        >
          ◆ Keyframe
        </button>

        <label className="inline-flex items-center gap-1.5 ml-auto">
          <span className="text-slate-400">Duração</span>
          <select
            aria-label="Duração da timeline em frames"
            value={END_FRAME_PRESETS.includes(last) ? last : 'custom'}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n > 0) onSetEndFrame(n);
            }}
            className="px-1.5 py-1 rounded-md bg-[#0D1017] border border-slate-700 text-slate-200 cursor-pointer"
          >
            {!END_FRAME_PRESETS.includes(last) && (
              <option value="custom" disabled>
                {last}f
              </option>
            )}
            {END_FRAME_PRESETS.map((n) => (
              <option key={n} value={n}>
                {n}f ({(n / TIMELINE_FPS).toFixed(1)}s)
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Régua + playhead + keyframes */}
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Frame atual"
        aria-valuemin={1}
        aria-valuemax={last}
        aria-valuenow={currentFrame}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
          else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
          else if (e.key === 'Home') { e.preventDefault(); onScrub(1); }
          else if (e.key === 'End') { e.preventDefault(); onScrub(last); }
          else if (e.key === ' ') { e.preventDefault(); onTogglePlay(); }
        }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onScrub(frameFromPointer(e.clientX));
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) onScrub(frameFromPointer(e.clientX));
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        className="relative h-11 mx-2 rounded-md bg-[#0D1017] border border-slate-800 cursor-ew-resize touch-none select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
      >
        {ticks.map((f) => (
          <div key={f} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: pct(f) }}>
            <div className="w-px h-2.5 bg-slate-600" />
            <span className="absolute top-2.5 left-1 text-[9px] font-mono text-slate-500 tabular-nums">{f}</span>
          </div>
        ))}
        {keyframes.map((f) => (
          <span
            key={f}
            title={`Keyframe ${f}f`}
            className="absolute bottom-1.5 w-2.5 h-2.5 -ml-[5px] rotate-45 bg-emerald-400 border border-emerald-200 pointer-events-none"
            style={{ left: pct(f) }}
          />
        ))}
        <div className="absolute top-0 bottom-0 w-px bg-orange-500 pointer-events-none" style={{ left: pct(currentFrame) }}>
          <span className="absolute -top-0.5 -left-[5px] w-2.5 h-2.5 rounded-sm bg-orange-500" />
        </div>
      </div>

      {/* Movimentos essenciais */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-slate-400 mr-1">Movimentos</span>
        {clips.length === 0 ? (
          <span className="text-slate-500">Sem clipes: use “Gerar Rig &amp; Animação” para criar Idle, Andar, Correr, Pular e Acenar.</span>
        ) : (
          clips.map((c, idx) => (
            <button
              key={`${c.name}-${idx}`}
              type="button"
              onClick={() => onSelectClip(idx)}
              title={c.name}
              aria-pressed={idx === activeClipIdx}
              className={`px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                idx === activeClipIdx
                  ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200'
                  : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white hover:border-slate-500'
              }`}
            >
              {essentialMoveLabel(c.name)}
            </button>
          ))
        )}
      </div>
    </section>
  );
}
