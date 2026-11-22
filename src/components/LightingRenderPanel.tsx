import React from 'react';
import { Camera, Plus, Sparkles, Trash2 } from 'lucide-react';
import {
  RenderResolutionPreset,
  StudioLightSpec,
  StudioLightType,
  ToneMappingPreset,
} from '../utils/studioLighting';

export interface PostProcessingPatch {
  bloomEnabled?: boolean;
  bloomStrength?: number;
  bloomThreshold?: number;
  dofEnabled?: boolean;
  dofFocus?: number;
  dofAperture?: number;
  motionBlurEnabled?: boolean;
  motionBlurDamp?: number;
}

interface LightingRenderPanelProps {
  lights: StudioLightSpec[];
  onApplyThreePointPreset: () => void;
  onAddLight: () => void;
  onUpdateLight: (id: string, patch: Partial<StudioLightSpec>) => void;
  onRemoveLight: (id: string) => void;
  toneMapping: ToneMappingPreset;
  onToneMappingChange: (v: ToneMappingPreset) => void;
  exposure: number;
  onExposureChange: (v: number) => void;
  shadowsEnabled: boolean;
  onShadowsEnabledChange: (v: boolean) => void;
  resolution: RenderResolutionPreset;
  onResolutionChange: (v: RenderResolutionPreset) => void;
  transparentBg: boolean;
  onTransparentBgChange: (v: boolean) => void;
  bloomEnabled?: boolean;
  bloomStrength?: number;
  bloomThreshold?: number;
  dofEnabled?: boolean;
  dofFocus?: number;
  dofAperture?: number;
  motionBlurEnabled?: boolean;
  motionBlurDamp?: number;
  onPostProcessingChange?: (patch: PostProcessingPatch) => void;
  onRenderPng: () => void;
  isRendering: boolean;
}

export const LightingRenderPanel: React.FC<LightingRenderPanelProps> = ({
  lights = [],
  onApplyThreePointPreset,
  onAddLight,
  onUpdateLight,
  onRemoveLight,
  toneMapping = 'agx',
  onToneMappingChange,
  exposure = 1.05,
  onExposureChange,
  shadowsEnabled = true,
  onShadowsEnabledChange,
  resolution = '1920x1080',
  onResolutionChange,
  transparentBg = false,
  onTransparentBgChange,
  bloomEnabled = false,
  bloomStrength = 0.55,
  bloomThreshold = 0.72,
  dofEnabled = false,
  dofFocus = 2.8,
  dofAperture = 0.0025,
  motionBlurEnabled = false,
  motionBlurDamp = 0.78,
  onPostProcessingChange,
  onRenderPng,
  isRendering = false,
}) => {
  return (
    <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-3 space-y-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold text-[#231F1D]">Luzes, Pós-Processamento & Render PNG</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onApplyThreePointPreset}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F5] hover:bg-slate-700 text-[11px] font-medium text-slate-200 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>3 Pontos</span>
          </button>
          <button
            type="button"
            onClick={onAddLight}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-600/20 border border-orange-500/40 hover:bg-orange-600/30 text-[11px] font-medium text-orange-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Luz</span>
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
        {lights.map((light) => (
          <div
            key={light.id}
            className="p-2 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <input
                type="text"
                value={light.name}
                onChange={(e) => onUpdateLight(light.id, { name: e.target.value })}
                className="flex-1 min-w-0 bg-transparent text-[11px] font-medium text-[#231F1D] focus:outline-none"
              />
              <select
                value={light.type}
                onChange={(e) => onUpdateLight(light.id, { type: e.target.value as StudioLightType })}
                className="px-1.5 py-0.5 rounded bg-[#141923] border border-slate-700 text-[10px] text-slate-200"
              >
                <option value="dir">Direcional</option>
                <option value="point">Pontual</option>
                <option value="spot">Spot</option>
                <option value="amb">Ambiente</option>
              </select>
              <input
                type="color"
                value={light.color}
                onChange={(e) => onUpdateLight(light.id, { color: e.target.value })}
                className="w-6 h-6 rounded border border-slate-700 bg-transparent cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onRemoveLight(light.id)}
                disabled={lights.length <= 1}
                aria-label={`Remover ${light.name}`}
                className="w-6 h-6 rounded hover:bg-[#FAF8F5] text-[#635B54] hover:text-red-400 disabled:opacity-30 flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <label className="flex items-center gap-2 text-[11px] text-[#635B54]">
              <span className="w-16 shrink-0">Força</span>
              <input
                type="range"
                min={0}
                max={8}
                step={0.1}
                value={light.intensity}
                onChange={(e) => onUpdateLight(light.id, { intensity: Number(e.target.value) })}
                className="flex-1 accent-orange-500"
              />
              <span className="w-9 text-right font-mono text-slate-200 tabular-nums">
                {light.intensity.toFixed(1)}
              </span>
            </label>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#231F1D]/15">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[#635B54]">Tone Mapping (View Transform)</span>
          <select
            value={toneMapping}
            onChange={(e) => onToneMappingChange(e.target.value as ToneMappingPreset)}
            className="px-2 py-1.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 text-[#231F1D]"
          >
            <option value="aces">ACES Filmic</option>
            <option value="agx">AgX (Blender 5.3)</option>
            <option value="neutral">Khronos PBR Neutral</option>
            <option value="none">Linear Sem Corte</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="flex justify-between text-[11px] text-[#635B54]">
            <span>Exposição EV</span>
            <span className="font-mono text-slate-200 tabular-nums">{exposure.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.2}
            max={2.4}
            step={0.05}
            value={exposure}
            onChange={(e) => onExposureChange(Number(e.target.value))}
            onDoubleClick={() => onExposureChange(1.05)}
            className="accent-orange-500"
          />
        </label>
      </div>

      {/* Real-time Post-Processing Pipeline */}
      {onPostProcessingChange && (
        <div className="p-2.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 space-y-2.5">
          <div className="text-[11px] font-semibold text-[#231F1D]">Pós-Processamento (Compositor WebGL)</div>

          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-[11px] text-slate-200 cursor-pointer">
              <span>Bloom (Brilho Intenso / Lasers)</span>
              <input
                type="checkbox"
                checked={bloomEnabled}
                onChange={(e) => onPostProcessingChange({ bloomEnabled: e.target.checked })}
                className="accent-orange-500"
              />
            </label>
            {bloomEnabled && (
              <div className="grid grid-cols-2 gap-2 pl-2">
                <label className="flex flex-col gap-0.5 text-[10px] text-[#635B54]">
                  <span>Intensidade ({bloomStrength.toFixed(2)})</span>
                  <input
                    type="range"
                    min={0.1}
                    max={2.5}
                    step={0.05}
                    value={bloomStrength}
                    onChange={(e) => onPostProcessingChange({ bloomStrength: Number(e.target.value) })}
                    className="accent-pink-500"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] text-[#635B54]">
                  <span>Limiar ({bloomThreshold.toFixed(2)})</span>
                  <input
                    type="range"
                    min={0.1}
                    max={1.2}
                    step={0.02}
                    value={bloomThreshold}
                    onChange={(e) => onPostProcessingChange({ bloomThreshold: Number(e.target.value) })}
                    className="accent-pink-500"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-1.5 border-t border-[#231F1D]/15/80">
            <label className="flex items-center justify-between text-[11px] text-slate-200 cursor-pointer">
              <span>Depth of Field (Desfoque Bokeh)</span>
              <input
                type="checkbox"
                checked={dofEnabled}
                onChange={(e) => onPostProcessingChange({ dofEnabled: e.target.checked })}
                className="accent-orange-500"
              />
            </label>
            {dofEnabled && (
              <div className="grid grid-cols-2 gap-2 pl-2">
                <label className="flex flex-col gap-0.5 text-[10px] text-[#635B54]">
                  <span>Foco ({dofFocus.toFixed(1)}m)</span>
                  <input
                    type="range"
                    min={0.5}
                    max={12}
                    step={0.1}
                    value={dofFocus}
                    onChange={(e) => onPostProcessingChange({ dofFocus: Number(e.target.value) })}
                    className="accent-sky-400"
                  />
                </label>
                <label className="flex flex-col gap-0.5 text-[10px] text-[#635B54]">
                  <span>Abertura ({(dofAperture * 1000).toFixed(1)})</span>
                  <input
                    type="range"
                    min={0.0005}
                    max={0.01}
                    step={0.0005}
                    value={dofAperture}
                    onChange={(e) => onPostProcessingChange({ dofAperture: Number(e.target.value) })}
                    className="accent-sky-400"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-1.5 border-t border-[#231F1D]/15/80">
            <label className="flex items-center justify-between text-[11px] text-slate-200 cursor-pointer">
              <span>Motion Blur (Arrasto de Movimento)</span>
              <input
                type="checkbox"
                checked={motionBlurEnabled}
                onChange={(e) => onPostProcessingChange({ motionBlurEnabled: e.target.checked })}
                className="accent-orange-500"
              />
            </label>
            {motionBlurEnabled && (
              <label className="flex flex-col gap-0.5 text-[10px] text-[#635B54] pl-2">
                <span>Persistência ({Math.round(motionBlurDamp * 100)}%)</span>
                <input
                  type="range"
                  min={0.35}
                  max={0.94}
                  step={0.02}
                  value={motionBlurDamp}
                  onChange={(e) => onPostProcessingChange({ motionBlurDamp: Number(e.target.value) })}
                  className="accent-emerald-400"
                />
              </label>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#231F1D]/15">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-[#635B54]">Resolução Render PNG</span>
          <select
            value={resolution}
            onChange={(e) => onResolutionChange(e.target.value as RenderResolutionPreset)}
            className="px-2 py-1.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 text-[#231F1D]"
          >
            <option value="view">Tamanho do Viewport</option>
            <option value="1920x1080">Full HD (1920x1080)</option>
            <option value="2560x1440">2K QHD (2560x1440)</option>
            <option value="3840x2160">4K UHD (3840x2160)</option>
            <option value="2048x2048">Turntable (2048x2048)</option>
          </select>
        </label>

        <div className="flex flex-col justify-end gap-1.5">
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={shadowsEnabled}
              onChange={(e) => onShadowsEnabledChange(e.target.checked)}
              className="accent-orange-500"
            />
            <span>Sombras em tempo real</span>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => onTransparentBgChange(e.target.checked)}
              className="accent-orange-500"
            />
            <span>Fundo transparente (Alpha)</span>
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={onRenderPng}
        disabled={isRendering}
        className="w-full inline-flex items-center justify-center gap-2 h-9 px-3 rounded-lg bg-[#FAF8F5] hover:bg-slate-700 border border-slate-700 disabled:opacity-50 text-xs font-semibold text-[#231F1D] cursor-pointer"
      >
        <Camera className="w-3.5 h-3.5 text-emerald-400" />
        <span>{isRendering ? 'Renderizando PNG...' : 'Capturar Render PNG'}</span>
      </button>
    </div>
  );
};

