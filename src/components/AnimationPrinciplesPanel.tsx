import React from 'react';
import { Sparkles, RotateCcw, Eye, Activity } from 'lucide-react';
import {
  ActionCycleType,
  AnimationPrinciplesConfig,
  AppealPreset,
  DEFAULT_ANIMATION_PRINCIPLES,
  EasingCurve,
  SecondaryActionType,
  StagingMode,
  WorkflowMode,
  evaluateEasingCurve,
  getAppealPresetPatch,
} from '../engine/animationPrinciplesEngine';

interface AnimationPrinciplesPanelProps {
  config: AnimationPrinciplesConfig;
  onChange: (next: AnimationPrinciplesConfig) => void;
}

const ACTION_CYCLES: { id: ActionCycleType; label: string }[] = [
  { id: 'walk', label: 'Caminhar' },
  { id: 'run', label: 'Correr' },
  { id: 'jump', label: 'Pular' },
  { id: 'punch', label: 'Soco' },
  { id: 'wave', label: 'Acenar' },
  { id: 'idle', label: 'Idle' },
  { id: 'bounce', label: 'Salto/Arco' },
];

const APPEAL_PRESETS: { id: AppealPreset; label: string }[] = [
  { id: 'neutral', label: 'Neutro' },
  { id: 'hero', label: 'Heroico' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'villain', label: 'Vilão' },
];

const EASING_OPTIONS: { id: EasingCurve; label: string }[] = [
  { id: 'linear', label: 'Linear' },
  { id: 'ease_in_out', label: 'Slow In/Out' },
  { id: 'snap_out', label: 'Snap Out' },
  { id: 'elastic', label: 'Elástico' },
];

const SECONDARY_OPTIONS: { id: SecondaryActionType; label: string }[] = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'breathing', label: 'Respiração' },
  { id: 'head_look', label: 'Olhar ao Redor' },
  { id: 'sway_gesture', label: 'Gesto / Balanço' },
];

const STAGING_OPTIONS: { id: StagingMode; label: string }[] = [
  { id: 'none', label: 'Padrão' },
  { id: 'silhouette', label: 'Silhueta' },
  { id: 'rim_focus', label: 'Foco Rim' },
];

function buildCurveSvgPath(curve: EasingCurve): string {
  const pts: string[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = evaluateEasingCurve(t, curve);
    const px = 4 + t * 92;
    const py = 32 - Math.max(-0.15, Math.min(1.15, y)) * 26;
    pts.push(`${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`);
  }
  return pts.join(' ');
}

export const AnimationPrinciplesPanel: React.FC<AnimationPrinciplesPanelProps> = ({
  config,
  onChange,
}) => {
  const patch = (partial: Partial<AnimationPrinciplesConfig>) =>
    onChange({ ...config, ...partial });

  return (
    <div className="rounded-lg bg-[#0D1017] border border-emerald-500/30 p-2.5 flex flex-col gap-2.5 text-[11px]">
      {/* Header & Master Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ações & 12 Princípios 3D</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_ANIMATION_PRINCIPLES })}
            title="Resetar Animação"
            className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => patch({ enabled: !config.enabled })}
            className={`px-2 py-0.5 rounded font-semibold cursor-pointer ${
              config.enabled
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {config.enabled ? 'Ativo' : 'Ativar'}
          </button>
        </div>
      </div>

      {/* Action Cycles (Walk, Run, Jump, Punch, Wave, Idle, Bounce) */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-slate-400">
          Ciclo de Ação (Locomoção & Combate)
        </span>
        <div className="grid grid-cols-4 gap-1">
          {ACTION_CYCLES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => patch({ enabled: true, actionCycle: a.id })}
              className={`px-1.5 py-1 rounded border text-[10px] font-medium cursor-pointer ${
                config.enabled && config.actionCycle === a.id
                  ? 'bg-orange-500/25 border-orange-400 text-orange-100'
                  : 'bg-[#121621] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* 12. Appeal (Apelo / Personalidade) */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-slate-400">
          12. Apelo (Personalidade & Carisma)
        </span>
        <div className="grid grid-cols-4 gap-1">
          {APPEAL_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ ...config, ...getAppealPresetPatch(p.id) })}
              className={`px-1.5 py-1 rounded border text-[10px] font-medium cursor-pointer ${
                config.enabled && config.appealPreset === p.id
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100'
                  : 'bg-[#121621] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 1. Squash & Stretch + 2. Anticipation */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-300">
            <span>1. Comprimir/Esticar</span>
            <span className="font-mono text-emerald-300">
              {Math.round(config.squashStretch * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.squashStretch}
            onChange={(e) => patch({ enabled: true, squashStretch: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-300">
            <span>2. Antecipação</span>
            <span className="font-mono text-emerald-300">
              {Math.round(config.anticipation * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.anticipation}
            onChange={(e) => patch({ enabled: true, anticipation: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* 3. Staging (Encenação & Silhueta) */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
          <Eye className="w-3 h-3 text-sky-400" />
          3. Encenação (Staging & Leitura de Silhueta)
        </span>
        <div className="grid grid-cols-3 gap-1">
          {STAGING_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ stagingMode: opt.id })}
              className={`px-1.5 py-1 rounded border text-[10px] cursor-pointer ${
                config.stagingMode === opt.id
                  ? 'bg-sky-600/30 border-sky-400 text-sky-100'
                  : 'bg-[#121621] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Straight Ahead vs Pose-to-Pose */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-slate-400">
          4. Método (Direta vs Pose a Pose)
        </span>
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              { id: 'pose_to_pose', label: 'Pose a Pose (Blocking)' },
              { id: 'straight_ahead', label: 'Direta (Orgânica)' },
            ] as { id: WorkflowMode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => patch({ enabled: true, workflowMode: m.id })}
              className={`px-1.5 py-1 rounded border text-[10px] cursor-pointer ${
                config.workflowMode === m.id
                  ? 'bg-emerald-600/25 border-emerald-500 text-emerald-100'
                  : 'bg-[#121621] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Follow Through + 10. Exaggeration */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-300">
            <span>5. Sobreposição</span>
            <span className="font-mono text-emerald-300">
              {Math.round(config.followThrough * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.followThrough}
            onChange={(e) => patch({ enabled: true, followThrough: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-300">
            <span>10. Exagero</span>
            <span className="font-mono text-emerald-300">
              {config.exaggeration.toFixed(1)}x
            </span>
          </span>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={config.exaggeration}
            onChange={(e) => patch({ enabled: true, exaggeration: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* 6. Slow In & Slow Out (Graph Editor Preview) */}
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
          <Activity className="w-3 h-3 text-emerald-400" />
          6. Aceleração / Desaceleração (Graph Editor)
        </span>
        <div className="flex items-center gap-2">
          <svg
            viewBox="0 0 100 36"
            className="w-20 h-9 rounded bg-[#090B10] border border-slate-800 shrink-0"
          >
            <path
              d={buildCurveSvgPath(config.easingCurve)}
              fill="none"
              stroke="#34d399"
              strokeWidth="2"
            />
          </svg>
          <div className="grid grid-cols-2 gap-1 flex-1">
            {EASING_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => patch({ enabled: true, easingCurve: opt.id })}
                className={`px-1.5 py-0.5 rounded border text-[10px] cursor-pointer ${
                  config.easingCurve === opt.id
                    ? 'bg-emerald-600/25 border-emerald-500 text-emerald-100'
                    : 'bg-[#121621] border-slate-800 text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Arcs & Motion Trail 3D */}
      <div className="flex items-center justify-between gap-2">
        <label className="flex flex-col gap-0.5 flex-1">
          <span className="flex justify-between text-[10px] text-slate-300">
            <span>7. Arcos (Trajetória)</span>
            <span className="font-mono text-sky-300">
              {Math.round(config.arcsStrength * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.arcsStrength}
            onChange={(e) => patch({ enabled: true, arcsStrength: Number(e.target.value) })}
          />
        </label>
        <button
          type="button"
          onClick={() => patch({ enabled: true, motionTrail: !config.motionTrail })}
          className={`px-2 py-1.5 rounded border text-[10px] font-medium shrink-0 cursor-pointer ${
            config.motionTrail
              ? 'bg-sky-600/30 border-sky-400 text-sky-100'
              : 'bg-[#121621] border-slate-800 text-slate-300'
          }`}
        >
          Motion Trail
        </button>
      </div>

      {/* 8. Secondary Action */}
      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-medium text-slate-400">
          8. Ação Secundária
        </span>
        <div className="grid grid-cols-2 gap-1">
          {SECONDARY_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ enabled: true, secondaryAction: opt.id })}
              className={`px-1.5 py-1 rounded border text-[10px] cursor-pointer ${
                config.secondaryAction === opt.id
                  ? 'bg-emerald-600/25 border-emerald-500 text-emerald-100'
                  : 'bg-[#121621] border-slate-800 text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 9. Timing (Speed & FPS) + 11. Solid Drawing (Asymmetry) */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-300">
            <span>9. Temporização</span>
            <span className="font-mono text-emerald-300">
              {config.timingSpeed.toFixed(2)}x
            </span>
          </span>
          <input
            type="range"
            min={0.25}
            max={2.5}
            step={0.05}
            value={config.timingSpeed}
            onChange={(e) => patch({ enabled: true, timingSpeed: Number(e.target.value) })}
          />
        </label>

        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-300">
            <span>11. Desenho Sólido</span>
            <span className="font-mono text-emerald-300">
              {Math.round(config.solidAsymmetry * 100)}%
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.solidAsymmetry}
            onChange={(e) => patch({ enabled: true, solidAsymmetry: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Stepped FPS selector for 9. Timing */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <span className="text-[10px] text-slate-400">Cadência (FPS):</span>
        <div className="flex gap-1">
          {([12, 24, 60] as const).map((fps) => (
            <button
              key={fps}
              type="button"
              onClick={() => patch({ enabled: true, timingFps: fps })}
              className={`px-2 py-0.5 rounded border text-[10px] font-mono cursor-pointer ${
                config.timingFps === fps
                  ? 'bg-emerald-600/30 border-emerald-400 text-emerald-100'
                  : 'bg-[#121621] border-slate-800 text-slate-400'
              }`}
            >
              {fps}fps
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
