import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Download, Layers, Sliders, Sparkles } from 'lucide-react';
import {
  PROCEDURAL_PBR_PRESETS,
  ProceduralPbrParams,
  generateProceduralPbrCanvases,
} from '../utils/pbrTextureGenerator';

interface MaterialEcosystemViewProps {
  params: ProceduralPbrParams;
  onParamsChange: (next: ProceduralPbrParams) => void;
  onApplyToViewport: (params: ProceduralPbrParams) => void;
}

type DepthPreviewMode = 'normal' | 'height';

interface PbrMapCardMeta {
  id: 'baseColor' | 'roughness' | 'metallic' | 'depth' | 'ao';
  title: string;
  specLabel: string;
  description: string;
}

const PBR_MAP_CARDS: PbrMapCardMeta[] = [
  {
    id: 'baseColor',
    title: 'Base Color / Albedo',
    specLabel: 'sRGB · Difuso',
    description: 'A cor e o padrão visual base do material, sem sombras diretas ou reflexos.',
  },
  {
    id: 'roughness',
    title: 'Roughness (Rugosidade)',
    specLabel: 'Linear · Escala de Cinza',
    description: 'O quão lisa (preto = espelhado) ou opaca/fosca (branco = difuso) é a superfície.',
  },
  {
    id: 'metallic',
    title: 'Metallic',
    specLabel: 'Linear · Condutor / Dielétrico',
    description: 'Determina se o material se comporta como metal (branco) ou dielétrico não-metal (preto).',
  },
  {
    id: 'depth',
    title: 'Normal / Height',
    specLabel: 'Tangent Space / Elevação',
    description: 'Mapas responsáveis por criar a ilusão (Normal) ou o relevo real de profundidade (Height).',
  },
  {
    id: 'ao',
    title: 'Ambient Occlusion',
    specLabel: 'Linear · Cavidades',
    description: 'Simula o sombreamento suave nas dobras, frestas e cavidades do objeto.',
  },
];

export const MaterialEcosystemView: React.FC<MaterialEcosystemViewProps> = ({
  params,
  onParamsChange,
  onApplyToViewport,
}) => {
  const [depthMode, setDepthMode] = useState<DepthPreviewMode>('normal');
  const canvasRefs = useRef<Record<string, HTMLCanvasElement | null>>({});

  useEffect(() => {
    const maps = generateProceduralPbrCanvases(params, 256);

    const drawToTarget = (id: string, source: HTMLCanvasElement) => {
      const target = canvasRefs.current[id];
      if (!target) return;
      if (target.width !== 256) target.width = 256;
      if (target.height !== 256) target.height = 256;
      const ctx = target.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 256, 256);
        ctx.drawImage(source, 0, 0, 256, 256);
      }
    };

    drawToTarget('baseColor', maps.baseColor);
    drawToTarget('roughness', maps.roughness);
    drawToTarget('metallic', maps.metallic);
    drawToTarget('depth', depthMode === 'normal' ? maps.normal : maps.height);
    drawToTarget('ao', maps.ao);
  }, [params, depthMode]);

  const handleDownloadMapPng = (id: PbrMapCardMeta['id']) => {
    const maps = generateProceduralPbrCanvases(params, 512);
    const mapLookup: Record<PbrMapCardMeta['id'], { canvas: HTMLCanvasElement; suffix: string }> = {
      baseColor: { canvas: maps.baseColor, suffix: 'BaseColor' },
      roughness: { canvas: maps.roughness, suffix: 'Roughness' },
      metallic: { canvas: maps.metallic, suffix: 'Metallic' },
      depth: {
        canvas: depthMode === 'normal' ? maps.normal : maps.height,
        suffix: depthMode === 'normal' ? 'Normal' : 'Height',
      },
      ao: { canvas: maps.ao, suffix: 'AmbientOcclusion' },
    };

    const chosen = mapLookup[id];
    const url = chosen.canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.preset}_${chosen.suffix}_512.png`;
    a.click();
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-10 flex flex-col gap-10">
      {/* Header & Official Substance Assets Link */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-semibold text-white tracking-tight text-balance">
            Tipos de Arquivos e Materiais no Ecossistema PBR
          </h1>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            Entenda como materiais procedurais paramétricos, Smart Materials com máscaras de geometria e os cinco mapas fundamentais PBR atuam juntos em fluxos modernos de texturização e visualização 3D.
          </p>
        </div>

        <a
          href="https://substance3d.adobe.com/assets"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#141923] border border-slate-700 hover:border-orange-500 text-xs font-semibold text-slate-100 hover:text-white transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto"
        >
          <span>Explorar Adobe Substance 3D Assets</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-orange-400" />
        </a>
      </div>

      {/* Section 1: Ecosystem Material File Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="font-mono text-orange-400">01. Substance 3D Designer · .SBSAR</span>
            <span>Paramétrico &amp; Escalável</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Materiais Procedurais (SBSAR)</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Criados no <strong>Substance 3D Designer</strong>, são dinâmicos e infinitamente escaláveis. Permitem alterar parâmetros como nível de desgaste, cor, densidade e rachaduras em tempo real sem perda de resolução.
          </p>
          <div className="pt-3 mt-auto border-t border-slate-800/80 text-xs text-slate-400">
            Variações ilimitadas a partir de um único grafo procedural compacto.
          </div>
        </section>

        <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
            <span className="font-mono text-orange-400">02. Substance 3D Painter · .SPSM</span>
            <span>Sensível à Geometria</span>
          </div>
          <h2 className="text-lg font-semibold text-white">Materiais Inteligentes (Smart Materials)</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Exclusivos do <strong>Substance 3D Painter</strong>, combinam texturas PBR com máscaras baseadas na geometria do objeto — como poeira acumulada em bordas ou ferrugem em reentrâncias.
          </p>
          <div className="pt-3 mt-auto border-t border-slate-800/80 text-xs text-slate-400">
            Curvatura, Ambient Occlusion e normal do modelo orientam o desgaste automaticamente.
          </div>
        </section>
      </div>

      {/* Official Assets Attribution Strip */}
      <div className="rounded-xl bg-[#141923] border border-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-slate-300 leading-relaxed">
          Você pode explorar ou baixar esses recursos diretamente na página oficial do{' '}
          <strong className="text-white">Adobe Substance 3D Assets</strong> para utilizar em seus projetos GLB/glTF e pipelines PBR.
        </p>
        <a
          href="https://substance3d.adobe.com/assets"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors whitespace-nowrap shrink-0"
        >
          <span>substance3d.adobe.com/assets</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Section 2: Interactive Procedural SBSAR + Smart Material Synthesizer + 5 PBR Maps */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Procedural SBSAR & Smart Material Parameter Controls */}
        <div className="lg:col-span-4 rounded-xl bg-[#141923] border border-slate-800 p-5 flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Sliders className="w-4 h-4 text-orange-400" />
              <span>Simulador SBSAR &amp; Smart Material</span>
            </div>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Ajuste parâmetros em tempo real para sintetizar os 5 mapas PBR e enviá-los diretamente ao modelo 3D na Viewport.
            </p>
          </div>

          {/* Base Presets */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Base Procedural</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PROCEDURAL_PBR_PRESETS.map((preset) => {
                const active = params.preset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onParamsChange({ ...preset.defaultParams })}
                    className={`px-2.5 py-2 rounded-lg border text-left text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-orange-600/20 border-orange-500 text-white'
                        : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="truncate">{preset.label}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SBSAR Dynamic Parameters */}
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="font-semibold text-slate-200">Parâmetros Procedurais (SBSAR)</div>

            <label className="flex items-center justify-between gap-3">
              <span className="text-slate-400">Cor Base (Albedo)</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-slate-300">{params.baseColor.toUpperCase()}</span>
                <input
                  type="color"
                  value={params.baseColor}
                  onChange={(e) => onParamsChange({ ...params, baseColor: e.target.value })}
                  className="w-7 h-7 rounded bg-transparent border border-slate-700 cursor-pointer"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-slate-400">
                <span>Nível de Desgaste</span>
                <span className="font-mono text-orange-400 tabular-nums">{Math.round(params.wear * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={params.wear}
                onChange={(e) => onParamsChange({ ...params, wear: Number(e.target.value) })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-slate-400">
                <span>Densidade / Escala</span>
                <span className="font-mono text-orange-400 tabular-nums">{params.density.toFixed(1)}x</span>
              </span>
              <input
                type="range"
                min={1}
                max={5}
                step={0.5}
                value={params.density}
                onChange={(e) => onParamsChange({ ...params, density: Number(e.target.value) })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-slate-400">
                <span>Rachaduras</span>
                <span className="font-mono text-orange-400 tabular-nums">{Math.round(params.cracks * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={params.cracks}
                onChange={(e) => onParamsChange({ ...params, cracks: Number(e.target.value) })}
              />
            </label>
          </div>

          {/* Smart Material Geometry Masks */}
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>Máscaras Smart Material (Geometria)</span>
            </div>

            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-slate-400">
                <span>Poeira Acumulada em Bordas</span>
                <span className="font-mono text-slate-200 tabular-nums">{Math.round(params.edgeDust * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={params.edgeDust}
                onChange={(e) => onParamsChange({ ...params, edgeDust: Number(e.target.value) })}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="flex justify-between text-slate-400">
                <span>Ferrugem em Reentrâncias</span>
                <span className="font-mono text-slate-200 tabular-nums">{Math.round(params.cavityRust * 100)}%</span>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={params.cavityRust}
                onChange={(e) => onParamsChange({ ...params, cavityRust: Number(e.target.value) })}
              />
            </label>
          </div>

          <button
            type="button"
            onClick={() => onApplyToViewport(params)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <Layers className="w-4 h-4" />
            <span>Aplicar Material no Viewport 3D</span>
          </button>
        </div>

        {/* Right: Mapas de Textura PBR (Componentes do Material) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Mapas de Textura PBR (Componentes do Material)</h2>
              <p className="mt-1 text-xs text-slate-400">
                Cada material é composto pelos cinco mapas fundamentais abaixo — gerados ao vivo pelos parâmetros ao lado.
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#141923] border border-slate-800 self-start">
              <button
                type="button"
                onClick={() => setDepthMode('normal')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  depthMode === 'normal' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Normal Map
              </button>
              <button
                type="button"
                onClick={() => setDepthMode('height')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  depthMode === 'height' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Height Map
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {PBR_MAP_CARDS.map((card) => (
              <article
                key={card.id}
                className="rounded-xl bg-[#141923] border border-slate-800 p-4 flex flex-col gap-3"
              >
                <div className="w-full aspect-square rounded-lg overflow-hidden border border-slate-800 bg-[#0B0E14]">
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[card.id] = el;
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  <div className="text-xs font-mono text-slate-400">
                    {card.id === 'depth'
                      ? depthMode === 'normal'
                        ? 'Tangent Space · RGB'
                        : 'Altura / Relevo · Linear'
                      : card.specLabel}
                  </div>
                  <h3 className="text-sm font-semibold text-white">{card.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{card.description}</p>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadMapPng(card.id)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-orange-400" />
                  <span>
                    {card.id === 'depth'
                      ? `Baixar ${depthMode === 'normal' ? 'Normal' : 'Height'} PNG`
                      : 'Baixar PNG (512px)'}
                  </span>
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
