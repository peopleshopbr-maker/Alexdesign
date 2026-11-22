import React from 'react';
import { Box, Camera, Sun } from 'lucide-react';
import { HdriEnvironmentPanel } from './HdriEnvironmentPanel';
import { LightingRenderPanel } from './LightingRenderPanel';
import {
  HdriEnvironmentId,
  RenderResolutionPreset,
  StudioLightSpec,
  ToneMappingPreset,
} from '../utils/studioLighting';

export interface StudioLightingState {
  activeHdri: HdriEnvironmentId;
  envIntensity: number;
  bgAsEnvironment: boolean;
  envBlur: number;
  lights: StudioLightSpec[];
  toneMapping: ToneMappingPreset;
  exposure: number;
  shadowsEnabled: boolean;
  resolution: RenderResolutionPreset;
  transparentBg: boolean;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  dofEnabled: boolean;
  dofFocus: number;
  dofAperture: number;
  motionBlurEnabled: boolean;
  motionBlurDamp: number;
}

interface LightingStudioPageProps {
  assetName: string;
  lighting: StudioLightingState;
  onLightingChange: (patch: Partial<StudioLightingState>) => void;
  onApplyThreePointPreset: () => void;
  onUploadHdriClick: () => void;
  hdriLoading: boolean;
  customHdriName: string | null;
  onRenderPng: () => void;
  isRendering: boolean;
  onOpenViewport: () => void;
}

export const LightingStudioPage: React.FC<LightingStudioPageProps> = ({
  assetName,
  lighting,
  onLightingChange,
  onApplyThreePointPreset,
  onUploadHdriClick,
  hdriLoading,
  customHdriName,
  onRenderPng,
  isRendering,
  onOpenViewport,
}) => {
  return (
    <div className="max-w-[1440px] mx-auto p-3.5 sm:p-4 space-y-4">
      <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-base font-bold text-[#231F1D] flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            <span>EstÃºdio de Luz HDRI, PÃ³s-Processamento & Render PNG 4K</span>
          </h1>
          <p className="text-xs text-[#635B54]">
            Ajuste iluminaÃ§Ã£o IBL, Bloom, Depth of Field, Motion Blur e Tone Mapping (ACES / AgX) para{' '}
            <span className="font-mono text-slate-200">{assetName}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRenderPng}
            disabled={isRendering}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isRendering ? 'Renderizando...' : 'Capturar Render PNG'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenViewport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
          >
            <Box className="w-3.5 h-3.5" />
            <span>EstÃºdio 3D</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <HdriEnvironmentPanel
          activeHdri={lighting.activeHdri}
          onSelectHdri={(activeHdri) => onLightingChange({ activeHdri })}
          envIntensity={lighting.envIntensity}
          onEnvIntensityChange={(envIntensity) => onLightingChange({ envIntensity })}
          bgAsEnvironment={lighting.bgAsEnvironment}
          onBgAsEnvironmentChange={(bgAsEnvironment) => onLightingChange({ bgAsEnvironment })}
          envBlur={lighting.envBlur}
          onEnvBlurChange={(envBlur) => onLightingChange({ envBlur })}
          onUploadHdriClick={onUploadHdriClick}
          hdriLoading={hdriLoading}
          customHdriName={customHdriName}
        />

        <LightingRenderPanel
          lights={lighting.lights}
          onApplyThreePointPreset={onApplyThreePointPreset}
          onAddLight={() =>
            onLightingChange({
              lights: [
                ...lighting.lights,
                {
                  id: `light_${Date.now()}`,
                  name: `Luz Extra ${lighting.lights.length + 1}`,
                  type: 'point',
                  color: '#ffffff',
                  intensity: 1.8,
                  position: [1.5, 2.5, 1.5],
                },
              ],
            })
          }
          onUpdateLight={(id, patch) =>
            onLightingChange({
              lights: lighting.lights.map((l) => (l.id === id ? { ...l, ...patch } : l)),
            })
          }
          onRemoveLight={(id) =>
            onLightingChange({
              lights:
                lighting.lights.length > 1
                  ? lighting.lights.filter((l) => l.id !== id)
                  : lighting.lights,
            })
          }
          toneMapping={lighting.toneMapping}
          onToneMappingChange={(toneMapping) => onLightingChange({ toneMapping })}
          exposure={lighting.exposure}
          onExposureChange={(exposure) => onLightingChange({ exposure })}
          shadowsEnabled={lighting.shadowsEnabled}
          onShadowsEnabledChange={(shadowsEnabled) => onLightingChange({ shadowsEnabled })}
          resolution={lighting.resolution}
          onResolutionChange={(resolution) => onLightingChange({ resolution })}
          transparentBg={lighting.transparentBg}
          onTransparentBgChange={(transparentBg) => onLightingChange({ transparentBg })}
          bloomEnabled={lighting.bloomEnabled}
          bloomStrength={lighting.bloomStrength}
          bloomThreshold={lighting.bloomThreshold}
          dofEnabled={lighting.dofEnabled}
          dofFocus={lighting.dofFocus}
          dofAperture={lighting.dofAperture}
          motionBlurEnabled={lighting.motionBlurEnabled}
          motionBlurDamp={lighting.motionBlurDamp}
          onPostProcessingChange={(patch) => onLightingChange(patch)}
          onRenderPng={onRenderPng}
          isRendering={isRendering}
        />
      </div>
    </div>
  );
};

