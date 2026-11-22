import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sun, Upload } from 'lucide-react';
import {
  HDRI_ENVIRONMENT_OPTIONS,
  HdriEnvironmentId,
} from '../utils/studioLighting';

interface HdriEnvironmentPanelProps {
  activeHdri: HdriEnvironmentId;
  onSelectHdri: (id: HdriEnvironmentId) => void;
  envIntensity: number;
  onEnvIntensityChange: (v: number) => void;
  bgAsEnvironment: boolean;
  onBgAsEnvironmentChange: (v: boolean) => void;
  envBlur: number;
  onEnvBlurChange: (v: number) => void;
  onUploadHdriClick: () => void;
  hdriLoading: boolean;
  customHdriName: string | null;
}

export const HdriEnvironmentPanel: React.FC<HdriEnvironmentPanelProps> = ({
  activeHdri,
  onSelectHdri,
  envIntensity,
  onEnvIntensityChange,
  bgAsEnvironment,
  onBgAsEnvironmentChange,
  envBlur,
  onEnvBlurChange,
  onUploadHdriClick,
  hdriLoading,
  customHdriName,
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-3 space-y-3 text-xs">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-[#231F1D]">Ambiente HDRI & Reflexos</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-[#635B54]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#635B54]" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {HDRI_ENVIRONMENT_OPTIONS.map((opt) => {
              const active = activeHdri === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onSelectHdri(opt.id)}
                  className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    active
                      ? 'border-orange-500 bg-orange-500/15 text-[#231F1D]'
                      : 'border-[#231F1D]/15 bg-[#0D1017] text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    {opt.swatches.map((hex, i) => (
                      <span
                        key={i}
                        className="w-3 h-1.5 rounded-sm"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                  <div className="text-[11px] font-semibold truncate">{opt.label}</div>
                  <div className="text-[10px] text-[#635B54] truncate">{opt.subtitle}</div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#231F1D]/15/80">
            <button
              type="button"
              onClick={onUploadHdriClick}
              disabled={hdriLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-slate-700 text-[11px] font-medium text-[#231F1D] cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>{hdriLoading ? 'Carregando HDR...' : 'Carregar .hdr / .exr'}</span>
            </button>
            {customHdriName && (
              <span className="text-[10px] font-mono text-emerald-400 truncate max-w-[160px]">
                {customHdriName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-[#635B54] text-[11px]">
                <span>Intensidade IBL</span>
                <span className="font-mono text-slate-200 tabular-nums">{envIntensity.toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={3}
                step={0.05}
                value={envIntensity}
                onChange={(e) => onEnvIntensityChange(Number(e.target.value))}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-[#635B54] text-[11px]">
                <span>Desfoque Fundo</span>
                <span className="font-mono text-slate-200 tabular-nums">{envBlur.toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={envBlur}
                onChange={(e) => onEnvBlurChange(Number(e.target.value))}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={bgAsEnvironment}
              onChange={(e) => onBgAsEnvironmentChange(e.target.checked)}
              className="accent-orange-500"
            />
            <span>Usar HDRI como plano de fundo visível</span>
          </label>
        </div>
      )}
    </div>
  );
};

