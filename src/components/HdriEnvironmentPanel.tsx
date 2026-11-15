import React, { useState } from 'react';
import { ChevronDown, RotateCw, Sun, Upload } from 'lucide-react';
import { HDRI_ENVIRONMENT_OPTIONS, HdriEnvironmentId } from '../utils/studioLighting';

interface HdriEnvironmentPanelProps {
  hdriId: HdriEnvironmentId;
  customHdriName: string | null;
  envIntensity: number;
  envRotationDeg: number;
  exposure: number;
  showHdriBg: boolean;
  onSelectHdri: (id: HdriEnvironmentId) => void;
  onUploadHdriClick: () => void;
  onEnvIntensityChange: (val: number) => void;
  onEnvRotationChange: (deg: number) => void;
  onExposureChange: (val: number) => void;
  onShowHdriBgChange: (show: boolean) => void;
}

export const HdriEnvironmentPanel: React.FC<HdriEnvironmentPanelProps> = ({
  hdriId,
  customHdriName,
  envIntensity,
  envRotationDeg,
  exposure,
  showHdriBg,
  onSelectHdri,
  onUploadHdriClick,
  onEnvIntensityChange,
  onEnvRotationChange,
  onExposureChange,
  onShowHdriBgChange,
}) => {
  const [expanded, setExpanded] = useState(false);

  const builtInPresets = HDRI_ENVIRONMENT_OPTIONS.filter((o) => o.kind !== 'cdn');
  const webPresets = HDRI_ENVIRONMENT_OPTIONS.filter((o) => o.kind === 'cdn');
  const activeMeta = HDRI_ENVIRONMENT_OPTIONS.find((o) => o.id === hdriId);
  const activeLabel =
    hdriId === 'custom' && customHdriName ? customHdriName : activeMeta?.label || 'Estúdio Neutro';

  return (
    <section
      aria-label="Painel de ambientes HDRI"
      className="rounded-lg bg-[#141923] border border-slate-800/90 text-xs overflow-hidden"
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <div className="text-left min-w-0">
            <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
              Ambiente HDRI
            </div>
            <div className="text-[11px] text-orange-400 truncate leading-tight">{activeLabel}</div>
          </div>
        </div>
        <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              expanded ? 'rotate-180 text-orange-400' : ''
            }`}
          />
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-800/90 flex flex-col gap-2.5">
          {/* Built-in Procedural + None Swatch Cards */}
          <div className="grid grid-cols-2 gap-1.5">
            {builtInPresets.map((opt) => {
              const active = hdriId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.subtitle}
                  onClick={() => onSelectHdri(opt.id)}
                  className={`p-1.5 rounded-lg border text-left transition-colors cursor-pointer flex flex-col gap-1 ${
                    active
                      ? 'bg-orange-600/20 border-orange-500 text-white'
                      : 'bg-[#0D1017]/80 border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  <div
                    className="h-2 w-full rounded-sm border border-white/10"
                    style={{
                      background: `linear-gradient(90deg, ${opt.swatches[0]} 0%, ${opt.swatches[1]} 50%, ${opt.swatches[2]} 100%)`,
                    }}
                  />
                  <span className="text-[11px] font-medium truncate leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Web HDRIs + Custom .HDR/.EXR Upload */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <select
                aria-label="HDRIs equiretangulares online"
                value={webPresets.some((p) => p.id === hdriId) ? hdriId : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    onSelectHdri(e.target.value as HdriEnvironmentId);
                  }
                }}
                className="w-full appearance-none pl-2 pr-6 py-1 rounded-md bg-[#0D1017] border border-slate-800 hover:border-slate-600 text-[11px] text-slate-200 cursor-pointer focus:outline-none focus:border-orange-500"
              >
                <option value="" disabled>
                  HDRIs Web (.hdr)...
                </option>
                {webPresets.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none w-3 h-3 text-slate-400 absolute right-1.5 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={onUploadHdriClick}
              title="Carregar arquivo .hdr ou .exr local"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#0D1017] border border-slate-700 hover:border-orange-500 text-[11px] font-medium text-slate-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3 h-3 text-sky-400" />
              <span>.HDR/.EXR</span>
            </button>
          </div>

          {/* Sliders: IBL Intensity, HDRI Rotation, Exposure */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
            <label className="flex flex-col gap-0.5">
              <span className="flex justify-between text-slate-400">
                <span>Intensidade IBL</span>
                <span className="font-mono text-slate-200 tabular-nums">{envIntensity.toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={3.5}
                step={0.05}
                value={envIntensity}
                onChange={(e) => onEnvIntensityChange(Number(e.target.value))}
                className="cursor-pointer"
              />
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="flex justify-between text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-slate-400" />
                  <span>Rotação HDRI</span>
                </span>
                <span className="font-mono text-slate-200 tabular-nums">{envRotationDeg}°</span>
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={envRotationDeg}
                onChange={(e) => onEnvRotationChange(Number(e.target.value))}
                className="cursor-pointer"
              />
            </label>

            <label className="flex flex-col gap-0.5">
              <span className="flex justify-between text-slate-400">
                <span>Exposição (EV)</span>
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

            <label className="inline-flex items-center gap-1.5 pt-0.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showHdriBg}
                onChange={(e) => onShowHdriBgChange(e.target.checked)}
                className="accent-orange-500"
              />
              <span>Exibir HDRI no fundo da cena</span>
            </label>
          </div>
        </div>
      )}
    </section>
  );
};
