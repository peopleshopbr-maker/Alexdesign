import React from 'react';
import {
  Bone,
  Box,
  Paintbrush,
  Play,
  Shapes,
  Sun,
} from 'lucide-react';
import { ViewportStageKey } from './Viewport3D';

export interface InspectorTabDef {
  id: string;
  label: string;
  mobileLabel: string;
  icon: React.ReactNode;
  stages: { stage: ViewportStageKey; label: string }[];
}

export const INSPECTOR_TABS: InspectorTabDef[] = [
  {
    id: 'camera',
    label: 'Cena & Câmera',
    mobileLabel: 'Cena',
    icon: <Box className="w-4 h-4" />,
    stages: [{ stage: 'stage2', label: 'Cena & Enquadramento' }],
  },
  {
    id: 'pintura',
    label: 'Pintura 3D & Aparência',
    mobileLabel: 'Pintura',
    icon: <Paintbrush className="w-4 h-4" />,
    stages: [
      { stage: 'stage3', label: 'Pintura 3D & Cor' },
      { stage: 'stage4', label: 'Materiais Procedurais' },
    ],
  },
  {
    id: 'modelagem',
    label: 'Primitivas & CSG',
    mobileLabel: 'Objetos',
    icon: <Shapes className="w-4 h-4" />,
    stages: [
      { stage: 'stage5', label: 'Objetos & Templates' },
      { stage: 'stage6', label: 'CSG & Física' },
    ],
  },
  {
    id: 'luz',
    label: 'Luz & Render',
    mobileLabel: 'Luz',
    icon: <Sun className="w-4 h-4" />,
    stages: [
      { stage: 'stage7', label: 'HDRI & Atmosfera' },
      { stage: 'stage8', label: 'Luzes & Render PNG' },
    ],
  },
  {
    id: 'rig',
    label: 'Auto-Rig & Ossos',
    mobileLabel: 'Rig',
    icon: <Bone className="w-4 h-4" />,
    stages: [{ stage: 'stage9', label: 'Marcadores & Rig' }],
  },
  {
    id: 'anim',
    label: 'Animação',
    mobileLabel: 'Anim',
    icon: <Play className="w-4 h-4" />,
    stages: [
      { stage: 'stage12', label: 'Clipes & Camadas' },
      { stage: 'stage13', label: 'Postura & Exportar' },
    ],
  },
];

export function findInspectorTab(stage: ViewportStageKey | null): InspectorTabDef | undefined {
  if (!stage) return INSPECTOR_TABS[0];
  return INSPECTOR_TABS.find((tab) => tab.stages.some((s) => s.stage === stage));
}

export const HUB_SHORTCUTS: { id: 'rigging'; label: string; icon: React.ReactNode }[] = [
  { id: 'rigging', label: 'Estúdio Rig & Animação', icon: <Bone className="w-3.5 h-3.5" /> },
];
