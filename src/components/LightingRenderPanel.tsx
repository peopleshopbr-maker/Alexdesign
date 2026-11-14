import React from 'react';
import { Camera, Plus, Sparkles, Sun, Trash2, Upload } from 'lucide-react';
import {
  HDRI_ENVIRONMENT_OPTIONS,
  HdriEnvironmentId,
  RenderResolutionPreset,
  StudioLightSpec,
  StudioLightType,
  ToneMappingPreset,
} from '../utils/studioLighting';

interface LightingRenderPanelProps {
  hdriId: HdriEnvironmentId;
  customHdriName: string | null;
  envIntensity: number;
  showHdriBg: boolean;
  onSelectHdri: (id: HdriEnvironmentId) => void;
  onUploadHdriClick: () => void;
  onEnvIntensityChange: (val: number) => void;
  onShowHdriBgChange: (show: boolean) => void;

  lights: StudioLightSpec[];
  newLightType: StudioLightType;
  onNewLightTypeChange: (t: StudioLightType) => void;
  onAddLight: () => void;
  onApplyThreePointPreset: () => void;
  onUpdateLight: (id: string, patch: Partial<StudioLightSpec>) => void;
  onRemoveLight: (id: string) => void;

  renderResolution: RenderResolutionPreset;
  toneMapping: ToneMappingPreset;
  exposure: number;
  transparentBg: boolean;
  onRenderResolutionChange: (res: RenderResolutionPreset) => void;
  onToneMappingChange: (tm: ToneMappingPreset) => void;
  onExposureChange: (val: number) => void;
  onTransparentBgChange: (val: boolean) => void;
  onRenderPng: () => void;
}

export const LightingRenderPanel: React.FC<LightingRenderPanelProps> = ({
  hdriId,
  customHdriName,
  envIntensity,
  showHdriBg,
  onSelectHdri,
  onUploadHdriClick,
  onEnvIntensityChange,
  onShowHdriBgChange,
  lights,
  newLightType,
  onNewLightTypeChange,
  onAddLight,
  onApplyThreePointPreset,
  onUpdateLight,
  onRemoveLight,
  renderResolution,
  toneMapping,
  exposure,
  transparentBg,
  onRenderResolutionChange,
  onToneMappingChange,
  onExposureChange,
  onTransparentBgChange,
  onRenderPng,
}) => {
  return (
    <div className="rounded-lg bg-[#0D1017] border border-slate-800 px-3 py-2.5 flex flex-col gap-2.5 text-xs">
      {/* Row A: Environment IBL + HDRI Upload + Scene Lights */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-slate-300 font-semibold">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>HDRI:</span>
          </span>
          <select
            value={hdriId}
            onChange={(e) => onSelectHdri(e.target.value as HdriEnvironmentId)}
            className="px-2 py-1 rounded-md bg-[#141923] border border-slate-700 text-slate-100"
          >
            {HDRI_ENVIRONMENT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
            {customHdriName && <option value="custom">Custom: {customHdriName}</option>}
          </select>
          <button
            type="button"
            onClick={onUploadHdriClick}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <Upload className="w-3 h-3 text-sky-400" />
            <span>.HDR / .EXR</span>
          </button>

          <label className="flex items-center gap-1.5 text-slate-400">
            <span>IBL</span>
            <input
              type="range"
              min={0}
              max={3.5}
              step={0.05}
              value={envIntensity}
              onChange={(e) => onEnvIntensityChange(Number(e.target.value))}
              className="w-16 cursor-pointer"
            />
            <span className="font-mono text-slate-200 tabular-nums w-8">{envIntensity.toFixed(1)}</span>
          </label>

          <label className="inline-flex items-center gap-1 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showHdriBg}
              onChange={(e) => onShowHdriBgChange(e.target.checked)}
              className="accent-orange-500"
            />
            <span>HDRI no Fundo</span>
          </label>
        </div>

        {/* Add Scene Lights */}
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={newLightType}
            onChange={(e) => onNewLightTypeChange(e.target.value as StudioLightType)}
            className="px-2 py-1 rounded-md bg-[#141923] border border-slate-700 text-slate-100"
          >
            <option value="dir">Luz Direcional</option>
            <option value="point">Luz Pontual</option>
            <option value="spot">Luz Spot</option>
            <option value="amb">Luz Ambiente</option>
          </select>
          <button
            type="button"
            onClick={onAddLight}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-slate-500 text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>Adicionar</span>
          </button>
          <button
            type="button"
            onClick={onApplyThreePointPreset}
            title="Configurar iluminação cinematográfica de 3 pontos (exportável via KHR_lights_punctual)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-orange-500 text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span>3 Pontos</span>
          </button>
        </div>
      </div>

      {/* Active Scene Lights Compact Strip */}
      {lights.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/70">
          {lights.map((light) => (
            <div
              key={light.id}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#141923] border border-slate-800"
            >
              <span className="font-medium text-slate-200">{light.name}</span>
              <input
                type="color"
                value={light.color}
                aria-label={`Cor de ${light.name}`}
                onChange={(e) => onUpdateLight(light.id, { color: e.target.value })}
                className="w-5 h-4 rounded bg-transparent border border-slate-700 cursor-pointer"
              />
              <input
                type="range"
                min={0}
                max={light.type === 'point' || light.type === 'spot' ? 80 : 6}
                step={0.1}
                value={light.intensity}
                onChange={(e) => onUpdateLight(light.id, { intensity: Number(e.target.value) })}
                className="w-14 cursor-pointer"
              />
              <span className="font-mono text-[10px] text-slate-400 tabular-nums w-6">
                {light.intensity.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveLight(light.id)}
                aria-label={`Remover ${light.name}`}
                className="p-0.5 text-slate-500 hover:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Row B: Render Final PNG & Tone Mapping */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-300">Render Estúdio PNG:</span>
          <select
            value={renderResolution}
            onChange={(e) => onRenderResolutionChange(e.target.value as RenderResolutionPreset)}
            className="px-2 py-1 rounded-md bg-[#141923] border border-slate-700 text-slate-100"
          >
            <option value="view">Tamanho da Tela</option>
            <option value="1920x1080">1920 × 1080 (Full HD)</option>
            <option value="2560x1440">2560 × 1440 (2K QHD)</option>
            <option value="3840x2160">3840 × 2160 (4K UHD)</option>
            <option value="2048x2048">2048 × 2048 (Quadrado)</option>
          </select>

          <select
            value={toneMapping}
            onChange={(e) => onToneMappingChange(e.target.value as ToneMappingPreset)}
            className="px-2 py-1 rounded-md bg-[#141923] border border-slate-700 text-slate-100"
          >
            <option value="aces">ACES Filmic</option>
            <option value="agx">AgX (Blender)</option>
            <option value="neutral">Neutro (Khronos)</option>
            <option value="none">Sem Tone Mapping</option>
          </select>

          <label className="flex items-center gap-1.5 text-slate-400">
            <span>Exposição</span>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.05}
              value={exposure}
              onChange={(e) => onExposureChange(Number(e.target.value))}
              className="w-16 cursor-pointer"
            />
            <span className="font-mono text-slate-200 tabular-nums w-7">{exposure.toFixed(2)}</span>
          </label>

          <label className="inline-flex items-center gap-1 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => onTransparentBgChange(e.target.checked)}
              className="accent-orange-500"
            />
            <span>Fundo Transparente</span>
          </label>
        </div>

        <button
          type="button"
          onClick={onRenderPng}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold cursor-pointer whitespace-nowrap"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Renderizar PNG</span>
        </button>
      </div>
    </div>
  );
};
