import React from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import {
  MoGraphClonerMode,
  MoGraphConfig,
  MoGraphEffectorType,
} from '../engine/mographEngine';

interface MoGraphPanelProps {
  config: MoGraphConfig;
  onChange: (patch: Partial<MoGraphConfig>) => void;
  onApply: () => void;
  onClear: () => void;
}

const CLONER_MODES: { id: MoGraphClonerMode; label: string }[] = [
  { id: 'radial', label: 'Radial 360°' },
  { id: 'grid', label: 'Grade 3D' },
  { id: 'helix', label: 'Hélice' },
];

const EFFECTOR_MODES: { id: MoGraphEffectorType; label: string }[] = [
  { id: 'wave', label: 'Onda' },
  { id: 'spiral', label: 'Espiral' },
  { id: 'fracture', label: 'Fratura' },
  { id: 'pulse', label: 'Pulso' },
];

export const MoGraphPanel: React.FC<MoGraphPanelProps> = ({
  config,
  onChange,
  onApply,
  onClear,
}) => {
  return (
    <div className="rounded-lg bg-[#0D1017] border border-purple-500/30 p-2.5 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-purple-300">
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>MoGraph Cloner &amp; Efetores</span>
        </span>
        {config.active && (
          <span className="text-[10px] font-mono text-emerald-400">ATIVO</span>
        )}
      </div>

      {/* Cloner Mode */}
      <div className="grid grid-cols-3 gap-1">
        {CLONER_MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange({ clonerMode: m.id })}
            className={`px-1.5 py-1 rounded text-[10px] font-medium cursor-pointer transition-colors ${
              config.clonerMode === m.id
                ? 'bg-purple-600 text-white'
                : 'bg-[#141923] border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Effector Mode */}
      <div className="grid grid-cols-4 gap-1">
        {EFFECTOR_MODES.map((ef) => (
          <button
            key={ef.id}
            type="button"
            onClick={() => onChange({ effector: ef.id })}
            className={`px-1.5 py-1 rounded text-[10px] font-medium cursor-pointer transition-colors ${
              config.effector === ef.id
                ? 'bg-orange-600 text-white'
                : 'bg-[#141923] border border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {ef.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <label className="flex flex-col gap-0.5">
        <span className="flex justify-between text-[10px] text-slate-400">
          <span>Quantidade de Clones</span>
          <span className="font-mono text-slate-200">{config.count}</span>
        </span>
        <input
          type="range"
          min={4}
          max={48}
          step={1}
          value={config.count}
          onChange={(e) => onChange({ count: Number(e.target.value) })}
        />
      </label>

      {/* Spacing / Radius */}
      <label className="flex flex-col gap-0.5">
        <span className="flex justify-between text-[10px] text-slate-400">
          <span>Raio / Espaçamento</span>
          <span className="font-mono text-slate-200">{config.spacing.toFixed(1)}m</span>
        </span>
        <input
          type="range"
          min={0.6}
          max={4.0}
          step={0.1}
          value={config.spacing}
          onChange={(e) => onChange({ spacing: Number(e.target.value) })}
        />
      </label>

      {/* Amplitude & Speed */}
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-400">
            <span>Força</span>
            <span className="font-mono text-slate-200">{config.amplitude.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.05}
            max={1.5}
            step={0.05}
            value={config.amplitude}
            onChange={(e) => onChange({ amplitude: Number(e.target.value) })}
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="flex justify-between text-[10px] text-slate-400">
            <span>Velocidade</span>
            <span className="font-mono text-slate-200">{config.speed.toFixed(1)}x</span>
          </span>
          <input
            type="range"
            min={0.2}
            max={4.0}
            step={0.1}
            value={config.speed}
            onChange={(e) => onChange({ speed: Number(e.target.value) })}
          />
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <button
          type="button"
          onClick={onApply}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-[11px] font-semibold text-white cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{config.active ? 'Atualizar Cloner' : 'Ativar MoGraph'}</span>
        </button>
        {config.active && (
          <button
            type="button"
            onClick={onClear}
            title="Remover Cloner MoGraph"
            className="inline-flex items-center justify-center px-2 py-1.5 rounded-md bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
