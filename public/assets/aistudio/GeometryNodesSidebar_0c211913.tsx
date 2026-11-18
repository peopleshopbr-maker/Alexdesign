import { Boxes, Layers, Sparkles, X } from 'lucide-react';
import type {
  BooleanCsgOp,
  GeometryNodesSettings,
  MoGraphDistribution,
  MoGraphEffector,
  ProceduralNodeTemplate,
} from '../types/graphics';

interface GeometryNodesSidebarProps {
  nodes: GeometryNodesSettings;
  meshCount: number;
  onUpdateNodes: (patch: Partial<GeometryNodesSettings>) => void;
  onApplyTemplate: (template: ProceduralNodeTemplate) => void;
  onInstantiateCircular6x: () => void;
  onApplyBooleanCsg: (op: BooleanCsgOp) => void;
  onClose: () => void;
}

const DISTRIBUTIONS: Array<{ id: MoGraphDistribution; label: string }> = [
  { id: 'radial', label: 'Radial 360°' },
  { id: 'grid', label: 'Grade 3D' },
  { id: 'helix', label: 'Hélice' },
];

const EFFECTORS: Array<{ id: MoGraphEffector; label: string }> = [
  { id: 'wave', label: 'Onda' },
  { id: 'spiral', label: 'Espiral' },
  { id: 'fracture', label: 'Fratura' },
  { id: 'pulse', label: 'Pulso' },
];

const TEMPLATES: Array<{ id: ProceduralNodeTemplate; label: string }> = [
  { id: 'glass_neon', label: 'Vidro & Neon' },
  { id: 'organic_sculpt', label: 'Escultura Orgânica' },
  { id: 'parametric_arch', label: 'Arquitetura Paramétrica' },
  { id: 'holo_grid', label: 'Grade Holográfica' },
];

const CSG_OPS: Array<{ id: BooleanCsgOp; label: string }> = [
  { id: 'union', label: 'União' },
  { id: 'subtract', label: 'Subtração' },
  { id: 'intersect', label: 'Interseção' },
];

export function GeometryNodesSidebar({
  nodes,
  meshCount,
  onUpdateNodes,
  onApplyTemplate,
  onInstantiateCircular6x,
  onApplyBooleanCsg,
  onClose,
}: GeometryNodesSidebarProps) {
  return (
    <aside
      aria-label="Ferramentas de Geometry Nodes e MoGraph"
      className="fixed top-20 left-[68px] bottom-20 z-20 w-[336px] max-w-[calc(100vw-5rem)] overflow-y-auto bg-[#101521]/95 border border-white/12 rounded-2xl p-4 shadow-2xl flex flex-col gap-4"
    >
      {/* Cabeçalho único limpo */}
      <div className="flex items-start gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center shrink-0">
          <Boxes className="w-4 h-4 text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold tracking-wide text-white uppercase">
              Geometry Nodes
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-mono tabular-nums text-sky-300 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-md whitespace-nowrap">
                {meshCount} malha(s)
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar painel"
                title="Recolher painel"
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            MoGraph Cloner, efetores procedurais, templates 3D e booleanas CSG.
          </p>
        </div>
      </div>

      {/* Cartão: MoGraph Cloner & Efetores */}
      <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-200">
              MoGraph Cloner &amp; Efetores
            </span>
          </div>
        </div>

        {/* Distribuição: 3 colunas uniformes */}
        <div className="grid grid-cols-3 gap-1.5">
          {DISTRIBUTIONS.map((dist) => {
            const active = nodes.distribution === dist.id;
            return (
              <button
                key={dist.id}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdateNodes({ distribution: dist.id })}
                className={`h-8 px-2 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                  active
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/55 shadow-sm'
                    : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                }`}
              >
                {dist.label}
              </button>
            );
          })}
        </div>

        {/* Efetores: 4 colunas uniformes */}
        <div className="grid grid-cols-4 gap-1.5">
          {EFFECTORS.map((eff) => {
            const active = nodes.effector === eff.id;
            return (
              <button
                key={eff.id}
                type="button"
                aria-pressed={active}
                onClick={() => onUpdateNodes({ effector: eff.id })}
                className={`h-8 px-1.5 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                  active
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/55 shadow-sm'
                    : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                }`}
              >
                {eff.label}
              </button>
            );
          })}
        </div>

        {/* Sliders de Quantidade e Raio / Espaçamento */}
        <label className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Quantidade de Clones</span>
            <span className="font-mono tabular-nums text-sky-300">{nodes.cloneCount}</span>
          </div>
          <input
            type="range"
            min={4}
            max={36}
            step={1}
            value={nodes.cloneCount}
            onChange={(e) => onUpdateNodes({ cloneCount: Number(e.target.value) })}
            className="studio-slider w-full"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Raio / Espaçamento</span>
            <span className="font-mono tabular-nums text-sky-300">
              {nodes.spacing.toFixed(1)}m
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3.5}
            step={0.1}
            value={nodes.spacing}
            onChange={(e) => onUpdateNodes({ spacing: Number(e.target.value) })}
            className="studio-slider w-full"
          />
        </label>

        {/* Força e Velocidade em 2 colunas */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Força</span>
              <span className="font-mono tabular-nums text-sky-300">
                {nodes.strength.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={nodes.strength}
              onChange={(e) => onUpdateNodes({ strength: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Velocidade</span>
              <span className="font-mono tabular-nums text-sky-300">
                {nodes.speed.toFixed(1)}x
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={2.5}
              step={0.1}
              value={nodes.speed}
              onChange={(e) => onUpdateNodes({ speed: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </label>
        </div>

        {/* Botão Primário Ativar / Pausar MoGraph */}
        <button
          type="button"
          aria-pressed={nodes.enabled}
          onClick={() => onUpdateNodes({ enabled: !nodes.enabled })}
          className={`h-9 w-full px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-2 cursor-pointer ${
            nodes.enabled
              ? 'bg-sky-400 hover:bg-sky-300 text-slate-950 border-sky-300 shadow-sm'
              : 'bg-[#121826] hover:bg-[#192235] text-slate-200 border-white/12'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          <span>{nodes.enabled ? 'MoGraph Ativo' : 'Ativar MoGraph'}</span>
        </button>
      </div>

      {/* Seção: Templates Procedurais 3D */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-slate-200">Templates Procedurais 3D</span>
        <div className="flex items-center gap-2">
          <select
            aria-label="Template Procedural 3D"
            value={nodes.template}
            onChange={(e) =>
              onUpdateNodes({ template: e.target.value as ProceduralNodeTemplate })
            }
            className="h-8 flex-1 min-w-0 px-2.5 text-xs rounded-lg bg-[#090c13] text-slate-200 border border-white/12 outline-none cursor-pointer focus-visible:border-sky-400"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onApplyTemplate(nodes.template)}
            className="h-8 px-3.5 text-xs font-medium rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/45 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Aplicar
          </button>
        </div>
      </div>

      {/* Ação: Instanciar Array Circular (6x Nodes) */}
      <button
        type="button"
        onClick={onInstantiateCircular6x}
        className="h-9 w-full px-3 text-xs font-medium rounded-xl bg-[#090c13] hover:bg-[#141c2b] text-slate-100 border border-sky-400/35 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
      >
        <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
        <span>Instanciar Array Circular (6x Nodes)</span>
      </button>

      {/* Seção: Booleana CSG (2 malhas da cena) */}
      <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-slate-300">
            Booleana CSG (2 malhas da cena)
          </span>
          <span className="text-[11px] font-mono tabular-nums text-slate-400">
            {meshCount} malha(s)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {CSG_OPS.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => onApplyBooleanCsg(op.id)}
              className="h-8 px-2 text-xs font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 whitespace-nowrap cursor-pointer flex items-center justify-center"
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
