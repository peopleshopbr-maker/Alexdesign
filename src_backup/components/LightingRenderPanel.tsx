import React from 'react';
import { Camera, ChevronDown, Plus, Sparkles, Sun, Trash2 } from 'lucide-react';
import {
  RenderResolutionPreset,
  StudioLightSpec,
  StudioLightType,
  ToneMappingPreset,
} from '../utils/studioLighting';

interface LightingRenderPanelProps {
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
    <div className="rounded-lg bg-[#0D1017] border border-slate-800 p-2.5 flex flex-col gap-2.5 text-xs">
      {/* Scene Punctual / Directional Lights */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-slate-300 font-semibold">
          <span className="inline-flex items-center gap-1.5">
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span>Luzes da Cena ({lights.length})</span>
          </span>
          <button
            type="button"
            onClick={onApplyThreePointPreset}
            title="Configurar iluminação cinematográfica de 3 pontos (exportável via KHR_lights_punctual)"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-orange-500 text-[11px] font-medium text-slate-200 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3 h-3 text-orange-400" />
            <span>3 Pontos</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <select
              value={newLightType}
              onChange={(e) => onNewLightTypeChange(e.target.value as StudioLightType)}
              className="w-full appearance-none pl-2 pr-6 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-slate-500 text-[11px] text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
            >
              <option value="dir">Luz Direcional</option>
              <option value="point">Luz Pontual</option>
              <option value="spot">Luz Spot</option>
              <option value="amb">Luz Ambiente</option>
            </select>
            <ChevronDown className="pointer-events-none w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
          </div>
          <button
            type="button"
            onClick={onAddLight}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-slate-500 text-[11px] text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>Adicionar</span>
          </button>
        </div>

        {lights.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/70">
            {lights.map((light) => (
              <div
                key={light.id}
                className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-[#141923] border border-slate-800"
              >
                <span className="font-medium text-[11px] text-slate-200 truncate">{light.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
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
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums w-6 text-right">
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Render Final PNG & Tone Mapping */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/70">
        <span className="font-semibold text-slate-300">Render Estúdio PNG</span>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="relative">
            <select
              value={renderResolution}
              onChange={(e) => onRenderResolutionChange(e.target.value as RenderResolutionPreset)}
              className="w-full appearance-none pl-2 pr-6 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-slate-500 text-[11px] text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
            >
              <option value="view">Tela Atual</option>
              <option value="1920x1080">1080p Full HD</option>
              <option value="2560x1440">1440p 2K</option>
              <option value="3840x2160">2160p 4K</option>
              <option value="2048x2048">2048 × 2048</option>
            </select>
            <ChevronDown className="pointer-events-none w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
          </div>

          <div className="relative">
            <select
              value={toneMapping}
              onChange={(e) => onToneMappingChange(e.target.value as ToneMappingPreset)}
              className="w-full appearance-none pl-2 pr-6 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-slate-500 text-[11px] text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
            >
              <option value="aces">ACES Filmic</option>
              <option value="agx">AgX (Blender)</option>
              <option value="neutral">Neutro (Khronos)</option>
              <option value="none">Sem Tone Map</option>
            </select>
            <ChevronDown className="pointer-events-none w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <label className="flex flex-col gap-0.5 text-[11px]">
          <span className="flex justify-between text-slate-400">
            <span>Exposição</span>
            <span className="font-mono text-slate-200 tabular-nums">{exposure.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.3}
            max={2.5}
            step={0.05}
            value={exposure}
            onChange={(e) => onExposureChange(Number(e.target.value))}
            className="cursor-pointer"
          />
        </label>

        <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={transparentBg}
            onChange={(e) => onTransparentBgChange(e.target.checked)}
            className="accent-orange-500"
          />
          <span>Fundo Transparente</span>
        </label>

        <button
          type="button"
          onClick={onRenderPng}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold cursor-pointer whitespace-nowrap"
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Renderizar PNG</span>
        </button>
      </div>
    </div>
  );
};
