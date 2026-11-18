import React from 'react';
import { Archive, Bone, Camera, Layers, Palette, Sparkles } from 'lucide-react';
import type { ViewportStageKey } from './Viewport3D';

export interface InspectorStageChip {
  stage: ViewportStageKey;
  label: string;
}

export interface InspectorTabDef {
  id: string;
  label: string;
  mobileLabel: string;
  icon: React.ReactNode;
  /** Etapas do pipeline que vivem nesta aba (a primeira é a padrão). */
  stages: InspectorStageChip[];
}

/** Fonte única da ordem do pipeline: da malha crua até o render final. */
export const INSPECTOR_TABS: InspectorTabDef[] = [
  {
    id: 'cena',
    label: 'Cena & Malha',
    mobileLabel: 'Cena',
    icon: <Layers className="w-3.5 h-3.5" />,
    stages: [
      { stage: 'stage1', label: 'Importar' },
      { stage: 'stage2', label: 'Transformar' },
      { stage: 'stage4', label: 'Retopologia' },
    ],
  },
  {
    id: 'uv',
    label: 'UV & Materiais',
    mobileLabel: 'UV/PBR',
    icon: <Palette className="w-3.5 h-3.5" />,
    stages: [{ stage: 'stage5', label: 'UV, PBR & HDRI' }],
  },
  {
    id: 'rig',
    label: 'Rig & Animação',
    mobileLabel: 'Rig',
    icon: <Bone className="w-3.5 h-3.5" />,
    stages: [
      { stage: 'stage7', label: 'Esqueleto & Clipes' },
      { stage: 'stage8', label: 'Princípios' },
    ],
  },
  {
    id: 'fx',
    label: 'FX Procedural',
    mobileLabel: 'FX',
    icon: <Sparkles className="w-3.5 h-3.5" />,
    stages: [
      { stage: 'stage9', label: 'Simulação & Pós-FX' },
      { stage: 'stage12', label: 'Geometry Nodes' },
    ],
  },
  {
    id: 'camera',
    label: 'Câmera & Render',
    mobileLabel: 'Render',
    icon: <Camera className="w-3.5 h-3.5" />,
    stages: [
      { stage: 'stage13', label: 'Câmera' },
      { stage: 'stage14', label: 'Exportar' },
    ],
  },
];

export const EXPORT_TAB_ICON = <Archive className="w-3.5 h-3.5" />;

export function findInspectorTab(stage: ViewportStageKey | null | undefined): InspectorTabDef | null {
  if (!stage) return null;
  return INSPECTOR_TABS.find((t) => t.stages.some((s) => s.stage === stage)) ?? null;
}

interface InspectorTabsProps {
  activeStage: ViewportStageKey | null;
  onSelectStage: (stage: ViewportStageKey) => void;
}

export const InspectorTabs: React.FC<InspectorTabsProps> = ({ activeStage, onSelectStage }) => {
  const activeTab = findInspectorTab(activeStage);
  return (
    <div className="flex flex-col gap-1.5">
      <div role="tablist" aria-label="Etapas do pipeline" className="grid grid-cols-5 gap-1">
        {INSPECTOR_TABS.map((tab, i) => {
          const isActive = activeTab?.id === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              title={`${i + 1}. ${tab.label}`}
              onClick={() => onSelectStage(tab.stages[0].stage)}
              className={`min-h-[44px] px-0.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-orange-500/15 border-orange-500/50 text-orange-300'
                  : 'bg-[#0D1017] border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              {tab.icon}
              <span className="text-[9px] font-semibold leading-none tracking-tight truncate max-w-full">
                {tab.mobileLabel}
              </span>
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-bold text-slate-100 mr-1">{activeTab.label}</span>
          {activeTab.stages.length > 1 &&
            activeTab.stages.map((s) => (
              <button
                key={s.stage}
                type="button"
                onClick={() => onSelectStage(s.stage)}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium cursor-pointer ${
                  activeStage === s.stage
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.label}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
