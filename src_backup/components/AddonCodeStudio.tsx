import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2 } from 'lucide-react';
import {
  AddonConfig,
  BlenderCompatTarget,
  RIG_PRESET_DEFINITIONS,
  RigPreset,
  ShaderPreset,
  TargetEngine,
  generateAddonFiles,
} from '../addon/blenderAddonTemplates';

interface AddonCodeStudioProps {
  config: AddonConfig;
  onConfigChange: (patch: Partial<AddonConfig>) => void;
  onDownloadZip: () => void;
  isDownloading: boolean;
}

export const AddonCodeStudio: React.FC<AddonCodeStudioProps> = ({
  config,
  onConfigChange,
  onDownloadZip,
  isDownloading,
}) => {
  const files = useMemo(() => generateAddonFiles(config), [config]);
  const [activeFilename, setActiveFilename] = useState<string>('operators_uv.py');
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const activeFile = files.find((f) => f.filename === activeFilename) || files[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedFile(activeFile.filename);
      setTimeout(() => setCopiedFile(null), 1800);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Addon Configurator */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-semibold text-white">Configuração do Addon</h2>
          <p className="mt-1 text-sm text-slate-400">
            Personalize os parâmetros padrão gravados nos módulos Python e baixe o pacote pronto para instalar no Blender.
          </p>
        </div>

        <div className="rounded-xl bg-[#141923] border border-slate-800 p-5 flex flex-col gap-4 text-xs">
          <div className="text-sm font-semibold text-slate-200">Identidade & Compatibilidade</div>

          <label className="flex flex-col gap-1">
            <span className="text-slate-400">Nome do Addon</span>
            <input
              type="text"
              value={config.displayName}
              onChange={(e) => onConfigChange({ displayName: e.target.value })}
              className="px-3 py-2 rounded-lg bg-[#0D1017] border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Versão Alvo</span>
              <select
                value={config.blenderTarget}
                onChange={(e) => onConfigChange({ blenderTarget: e.target.value as BlenderCompatTarget })}
                className="px-2.5 py-2 rounded-lg bg-[#0D1017] border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value="3.5_TO_5.3">Blender 3.5 a 5.3</option>
                <option value="5.3_EXT">Blender 5.3+ Extension</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Engine Destino</span>
              <select
                value={config.targetEngine}
                onChange={(e) => onConfigChange({ targetEngine: e.target.value as TargetEngine })}
                className="px-2.5 py-2 rounded-lg bg-[#0D1017] border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value="UNITY">Unity (FBX/GLB)</option>
                <option value="UNREAL">Unreal Engine 5</option>
                <option value="GODOT">Godot 4</option>
                <option value="BLENDER">Blender Nativo</option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-slate-400">Predefinição de Rig Automático</span>
            <select
              value={config.rigPreset}
              onChange={(e) => onConfigChange({ rigPreset: e.target.value as RigPreset })}
              className="px-2.5 py-2 rounded-lg bg-[#0D1017] border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
            >
              {(Object.keys(RIG_PRESET_DEFINITIONS) as RigPreset[]).map((key) => (
                <option key={key} value={key}>
                  {RIG_PRESET_DEFINITIONS[key].label}
                </option>
              ))}
            </select>
          </label>

          <div className="pt-3 border-t border-slate-800 text-sm font-semibold text-slate-200">
            Mapeamento UV & Atlas
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-slate-400">
                <span>Seam Angle</span>
                <span className="font-mono text-slate-200 tabular-nums">{config.seamAngleDeg}°</span>
              </span>
              <input
                type="range"
                min={15}
                max={135}
                step={1}
                value={config.seamAngleDeg}
                onChange={(e) => onConfigChange({ seamAngleDeg: Number(e.target.value) })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-slate-400">
                <span>UV Margin</span>
                <span className="font-mono text-slate-200 tabular-nums">{config.uvMargin.toFixed(3)}</span>
              </span>
              <input
                type="range"
                min={0.002}
                max={0.06}
                step={0.002}
                value={config.uvMargin}
                onChange={(e) => onConfigChange({ uvMargin: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Resolução Atlas</span>
              <select
                value={config.textureResolution}
                onChange={(e) =>
                  onConfigChange({ textureResolution: Number(e.target.value) as 1024 | 2048 | 4096 })
                }
                className="px-2.5 py-2 rounded-lg bg-[#0D1017] border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value={1024}>1024 x 1024</option>
                <option value={2048}>2048 x 2048</option>
                <option value={4096}>4096 x 4096</option>
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-slate-400">Preset de Shader</span>
              <select
                value={config.shaderPreset}
                onChange={(e) => onConfigChange({ shaderPreset: e.target.value as ShaderPreset })}
                className="px-2.5 py-2 rounded-lg bg-[#0D1017] border border-slate-800 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value="PBR_PRINCIPLED">PBR Principled BSDF</option>
                <option value="PBR_CEL_OUTLINE">PBR + Cel & Borde</option>
                <option value="ANIME_TOON">Anime Toon Shader</option>
              </select>
            </label>
          </div>

          <div className="pt-3 border-t border-slate-800 text-sm font-semibold text-slate-200">
            Canais Bake & Rigging
          </div>

          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.bakeBaseColor}
                onChange={(e) => onConfigChange({ bakeBaseColor: e.target.checked })}
                className="accent-orange-500"
              />
              <span>Bake Base Color</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.bakeRoughness}
                onChange={(e) => onConfigChange({ bakeRoughness: e.target.checked })}
                className="accent-orange-500"
              />
              <span>Bake Roughness</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.bakeNormal}
                onChange={(e) => onConfigChange({ bakeNormal: e.target.checked })}
                className="accent-orange-500"
              />
              <span>Bake Normal Map</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.bakeAO}
                onChange={(e) => onConfigChange({ bakeAO: e.target.checked })}
                className="accent-orange-500"
              />
              <span>Bake Ambient Occlusion</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.exportUvLayouts}
                onChange={(e) => onConfigChange({ exportUvLayouts: e.target.checked })}
                className="accent-orange-500"
              />
              <span>Exportar UV PNGs</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.exportPreviews}
                onChange={(e) => onConfigChange({ exportPreviews: e.target.checked })}
                className="accent-orange-500"
              />
              <span>Render 4 Previews</span>
            </label>
          </div>

          <button
            type="button"
            onClick={onDownloadZip}
            disabled={isDownloading}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{isDownloading ? 'Empacotando ZIP...' : 'Baixar Addon Completo (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Right Column: Generated Python / Manifest Code Explorer */}
      <div className="lg:col-span-8 rounded-xl bg-[#141923] border border-slate-800 overflow-hidden flex flex-col">
        {/* File Tabs */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-800 bg-[#10141D]">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {files.map((file) => (
              <button
                key={file.filename}
                type="button"
                onClick={() => setActiveFilename(file.filename)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeFile.filename === file.filename
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>{file.filename}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedFile === activeFile.filename ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Arquivo</span>
              </>
            )}
          </button>
        </div>

        {/* File Summary Strip */}
        <div className="px-5 py-2.5 bg-[#0F131B] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>{activeFile.summary}</span>
          <span className="font-mono text-slate-500 tabular-nums">
            {activeFile.content.split('\n').length} linhas
          </span>
        </div>

        {/* Code Viewer */}
        <div className="p-5 overflow-auto max-h-[640px] bg-[#0B0E14]">
          <pre className="text-xs leading-relaxed font-mono text-slate-200 whitespace-pre">
            <code>{activeFile.content}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
