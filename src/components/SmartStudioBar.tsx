import React from 'react';
import { useStudioIntelligence } from '../context/StudioIntelligenceContext';
import { AdaptiveActionGroup } from './AdaptiveActionGroup';
import type { AdaptiveActionItem } from '../hooks/useAdaptiveUI';

export const SmartStudioBar: React.FC = () => {
  const { telemetry, activeClip, setActiveClip, logUserIntent } = useStudioIntelligence();

  const animationActions: AdaptiveActionItem[] = [
    {
      id: 'clip-idle',
      label: 'Pose Natural (Idle)',
      shortLabel: 'Idle',
      variant: activeClip === 'idle' ? 'primary' : 'secondary',
      onClick: () => {
        setActiveClip('idle');
        logUserIntent('Clipe ativado: Idle');
      },
    },
    {
      id: 'clip-walk',
      label: 'Caminhada (Walk)',
      shortLabel: 'Walk',
      variant: activeClip === 'walk' ? 'primary' : 'secondary',
      onClick: () => {
        setActiveClip('walk');
        logUserIntent('Clipe ativado: Walk');
      },
    },
    {
      id: 'clip-run',
      label: 'Corrida (Run)',
      shortLabel: 'Run',
      variant: activeClip === 'run' ? 'primary' : 'secondary',
      onClick: () => {
        setActiveClip('run');
        logUserIntent('Clipe ativado: Run');
      },
    },
    {
      id: 'clip-wave',
      label: 'Acenar (Wave)',
      shortLabel: 'Wave',
      variant: activeClip === 'wave' ? 'primary' : 'secondary',
      onClick: () => {
        setActiveClip('wave');
        logUserIntent('Clipe ativado: Wave');
      },
    },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-3 shadow-lg backdrop-blur">
      {/* Telemetria em tempo real da interligacao Rust + UI */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              telemetry.rustActive ? 'bg-emerald-400' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium text-slate-200">
            {telemetry.rustActive ? 'Núcleo Rust/WASM Ativo' : 'Modo Padrão JS'}
          </span>
          <span className="text-slate-600">|</span>
          <span>Tela: {telemetry.deviceMode.toUpperCase()}</span>
        </div>
        <span className="text-slate-400">{telemetry.lastAction}</span>
      </div>

      {/* Botoes fluidos, adaptativos e reordenados por uso */}
      <AdaptiveActionGroup actions={animationActions} dynamicOrder={true} />
    </div>
  );
};
