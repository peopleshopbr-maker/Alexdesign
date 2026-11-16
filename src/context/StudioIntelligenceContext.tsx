import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ensureRustCore,
  getRustProceduralPose,
  normalizeSymmetryWithRust,
  isSkeletonValidWithRust,
  type ProceduralClipName,
} from '../utils/rustBridge';
import { DEFAULT_STUDIO_CONFIG, type StudioConfig } from '../types/studioConfig';

interface SystemTelemetry {
  rustActive: boolean;
  skeletonHealthy: boolean;
  lastAction: string;
  activeClip: ProceduralClipName;
  deviceMode: 'mobile' | 'tablet' | 'desktop';
}

interface StudioIntelligenceContextType {
  config: StudioConfig;
  updateConfig: (partial: Partial<StudioConfig>) => void;
  telemetry: SystemTelemetry;
  activeClip: ProceduralClipName;
  setActiveClip: (clip: ProceduralClipName) => void;
  computePoseFrame: (timeSec: number) => ReturnType<typeof getRustProceduralPose>;
  validateAndNormalizeRig: (
    left: [number, number, number],
    right: [number, number, number]
  ) => { left: [number, number, number]; right: [number, number, number]; valid: boolean };
  logUserIntent: (actionName: string) => void;
}

const StudioIntelligenceContext = createContext<StudioIntelligenceContextType | null>(null);

export const StudioIntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<StudioConfig>(DEFAULT_STUDIO_CONFIG);
  const [rustActive, setRustActive] = useState(false);
  const [skeletonHealthy, setSkeletonHealthy] = useState(true);
  const [activeClip, setActiveClip] = useState<ProceduralClipName>('idle');
  const [lastAction, setLastAction] = useState('Sistema inicializado');
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  // 1. Inicializa o motor Rust/WebAssembly automaticamente ao abrir o site
  useEffect(() => {
    let mounted = true;
    ensureRustCore().then((ready) => {
      if (mounted) {
        setRustActive(ready);
        setLastAction(ready ? 'Motor Rust/WASM ativo' : 'Modo fallback JS ativo');
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Monitora o tamanho da tela para adaptar toda a interface em tempo real
  useEffect(() => {
    const syncViewport = () => {
      const w = window.innerWidth;
      setDeviceMode(w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    syncViewport();
    window.addEventListener('resize', syncViewport);
    return () => window.removeEventListener('resize', syncViewport);
  }, []);

  const updateConfig = useCallback((partial: Partial<StudioConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
    setLastAction(`Configuracao atualizada: ${Object.keys(partial).join(', ')}`);
  }, []);

  const logUserIntent = useCallback((actionName: string) => {
    setLastAction(actionName);
  }, []);

  // 3. Calcula cada quadro de animacao usando o nucleo Rust (se disponivel)
  const computePoseFrame = useCallback(
    (timeSec: number) => {
      if (rustActive) {
        return getRustProceduralPose(activeClip, timeSec);
      }
      // Fallback matematico caso WASM ainda esteja carregando
      const swing = Math.sin(timeSec * 4) * 0.4;
      return {
        spineX: 0.02,
        armLZ: 1.25 - swing,
        armRZ: -1.25 - swing,
        armRX: 0,
        legLX: swing,
        legRX: -swing,
      };
    },
    [rustActive, activeClip]
  );

  // 4. Valida limites e aplica simetria bilateral via Rust antes de renderizar
  const validateAndNormalizeRig = useCallback(
    (left: [number, number, number], right: [number, number, number]) => {
      const valid = rustActive ? isSkeletonValidWithRust([...left, ...right]) : true;
      setSkeletonHealthy(valid);

      if (rustActive && valid) {
        const synced = normalizeSymmetryWithRust(left, right);
        return { ...synced, valid: true };
      }
      return { left, right, valid };
    },
    [rustActive]
  );

  return (
    <StudioIntelligenceContext.Provider
      value={{
        config,
        updateConfig,
        telemetry: {
          rustActive,
          skeletonHealthy,
          lastAction,
          activeClip,
          deviceMode,
        },
        activeClip,
        setActiveClip,
        computePoseFrame,
        validateAndNormalizeRig,
        logUserIntent,
      }}
    >
      {children}
    </StudioIntelligenceContext.Provider>
  );
};

export function useStudioIntelligence() {
  const ctx = useContext(StudioIntelligenceContext);
  if (!ctx) {
    throw new Error('useStudioIntelligence deve ser usado dentro de StudioIntelligenceProvider');
  }
  return ctx;
}
