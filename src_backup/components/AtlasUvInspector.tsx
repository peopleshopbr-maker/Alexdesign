import React, { useEffect, useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import { StudioConfig } from '../types/studioConfig';
import { ImportedUvMesh } from './Viewport3D';

type UvLayerId =
  | 'UV_all_parts'
  | 'UV_all_parts_dark'
  | 'UV_Head'
  | 'UV_Hair'
  | 'UV_Jacket'
  | 'UV_Body'
  | 'UV_Skirt'
  | 'UV_Zipper';

interface UvIsland {
  part: UvLayerId;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  tris: number;
}

const UV_ISLANDS: UvIsland[] = [
  { part: 'UV_Head', label: 'Head', x: 0.04, y: 0.04, w: 0.28, h: 0.28, tris: 1840 },
  { part: 'UV_Hair', label: 'Hair', x: 0.35, y: 0.04, w: 0.32, h: 0.28, tris: 2420 },
  { part: 'UV_Jacket', label: 'Jacket', x: 0.04, y: 0.35, w: 0.44, h: 0.32, tris: 3120 },
  { part: 'UV_Body', label: 'Body', x: 0.51, y: 0.35, w: 0.26, h: 0.32, tris: 2160 },
  { part: 'UV_Skirt', label: 'Skirt', x: 0.04, y: 0.7, w: 0.52, h: 0.26, tris: 1960 },
  { part: 'UV_Zipper', label: 'Zipper', x: 0.7, y: 0.04, w: 0.26, h: 0.28, tris: 680 },
];

const UV_LAYERS: { id: UvLayerId; label: string }[] = [
  { id: 'UV_all_parts', label: 'UV_all_parts.png' },
  { id: 'UV_all_parts_dark', label: 'UV_all_parts_dark.png' },
  { id: 'UV_Head', label: 'UV_Head.png' },
  { id: 'UV_Hair', label: 'UV_Hair.png' },
  { id: 'UV_Jacket', label: 'UV_Jacket.png' },
  { id: 'UV_Body', label: 'UV_Body.png' },
  { id: 'UV_Skirt', label: 'UV_Skirt.png' },
  { id: 'UV_Zipper', label: 'UV_Zipper.png' },
];

interface AtlasUvInspectorProps {
  config: StudioConfig;
  onConfigChange: (patch: Partial<StudioConfig>) => void;
  importedUvs: ImportedUvMesh[] | null;
}

function loadImageCached(
  url: string,
  cache: Map<string, HTMLImageElement>,
  onLoaded: () => void
): HTMLImageElement | null {
  const existing = cache.get(url);
  if (existing) {
    return existing.complete ? existing : null;
  }
  const img = new Image();
  img.onload = onLoaded;
  img.src = url;
  cache.set(url, img);
  return img.complete ? img : null;
}

function wrapUnit(val: number): number {
  const m = val % 1;
  return m < 0 ? m + 1 : m;
}

export const AtlasUvInspector: React.FC<AtlasUvInspectorProps> = ({
  config,
  onConfigChange,
  importedUvs,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [selectedLayer, setSelectedLayer] = useState<UvLayerId>('UV_all_parts_dark');
  const [selectedImportedIdx, setSelectedImportedIdx] = useState<number | 'all'>('all');
  const [uvChannel, setUvChannel] = useState<'uv' | 'uv1'>('uv');
  const [wrapOutOfBoundsUv, setWrapOutOfBoundsUv] = useState(true);
  const [showUvChecker, setShowUvChecker] = useState(false);
  const [uvStats, setUvStats] = useState<{ edges: number; outOfBounds: number }>({ edges: 0, outOfBounds: 0 });
  const [customTexture, setCustomTexture] = useState<{ name: string; img: HTMLImageElement } | null>(null);
  const [imgTick, setImgTick] = useState(0);

  useEffect(() => {
    setSelectedImportedIdx('all');
  }, [importedUvs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const S = 768;
    canvas.width = S;
    canvas.height = S;

    const isDarkUv = selectedLayer === 'UV_all_parts_dark';

    if (customTexture) {
      ctx.drawImage(customTexture.img, 0, 0, S, S);
      ctx.fillStyle = 'rgba(11, 14, 20, 0.35)';
      ctx.fillRect(0, 0, S, S);
    } else if (showUvChecker || (selectedLayer === 'UV_all_parts' && !importedUvs)) {
      const cSize = 32;
      for (let y = 0; y < S; y += cSize) {
        for (let x = 0; x < S; x += cSize) {
          ctx.fillStyle = (x / cSize + y / cSize) % 2 === 0 ? '#1e2430' : '#141923';
          ctx.fillRect(x, y, cSize, cSize);
        }
      }
    } else {
      ctx.fillStyle = isDarkUv ? '#0b0e14' : '#181e29';
      ctx.fillRect(0, 0, S, S);
    }

    // Subtle 8x8 UV grid
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      const pos = (i / 8) * S;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, S);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(S, pos);
      ctx.stroke();
    }

    // Imported Character / GLB UV Rendering
    if (importedUvs && importedUvs.length > 0) {
      const meshesToDraw =
        selectedImportedIdx === 'all' ? importedUvs : [importedUvs[selectedImportedIdx]].filter(Boolean);

      const activeMesh = meshesToDraw[0];
      const meshWithTex = meshesToDraw.find((m) => m.textures?.baseColor) || activeMesh;
      const texUrl = customTexture ? null : meshWithTex?.textures?.baseColor || null;

      if (customTexture) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.drawImage(customTexture.img, 0, 0, S, S);
        ctx.restore();
      } else if (texUrl) {
        const loadedImg = loadImageCached(texUrl, imgCacheRef.current, () =>
          setImgTick((t) => t + 1)
        );
        if (loadedImg) {
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.drawImage(loadedImg, 0, 0, S, S);
          ctx.restore();
        }
      }

      let totalEdgesDrawn = 0;
      let outOfBoundsEdges = 0;

      ctx.strokeStyle = 'rgba(249, 115, 22, 0.82)';
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (const m of meshesToDraw) {
        const edges = uvChannel === 'uv1' && m.uv1Edges?.length ? m.uv1Edges : m.uvEdges;
        for (let i = 0; i < edges.length; i += 4) {
          const rawU1 = edges[i];
          const rawV1 = edges[i + 1];
          const rawU2 = edges[i + 2];
          const rawV2 = edges[i + 3];

          if (
            rawU1 < 0 || rawU1 > 1 || rawV1 < 0 || rawV1 > 1 ||
            rawU2 < 0 || rawU2 > 1 || rawV2 < 0 || rawV2 > 1
          ) {
            outOfBoundsEdges++;
          }

          const u1 = wrapOutOfBoundsUv && (rawU1 < 0 || rawU1 > 1) ? wrapUnit(rawU1) : rawU1;
          const v1 = wrapOutOfBoundsUv && (rawV1 < 0 || rawV1 > 1) ? wrapUnit(rawV1) : rawV1;
          const u2 = wrapOutOfBoundsUv && (rawU2 < 0 || rawU2 > 1) ? wrapUnit(rawU2) : rawU2;
          const v2 = wrapOutOfBoundsUv && (rawV2 < 0 || rawV2 > 1) ? wrapUnit(rawV2) : rawV2;

          if (wrapOutOfBoundsUv && (Math.abs(u1 - u2) > 0.65 || Math.abs(v1 - v2) > 0.65)) {
            continue;
          }

          ctx.moveTo(u1 * S, (1 - v1) * S);
          ctx.lineTo(u2 * S, (1 - v2) * S);
          totalEdgesDrawn++;
        }
      }

      ctx.stroke();
      if (totalEdgesDrawn === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 15px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Nenhuma coordenada UV encontrada nesta malha.', S / 2, S / 2 - 10);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Volte para Viewport 3D e clique em "Gerar UV Auto" para criar o mapa UV.', S / 2, S / 2 + 16);
        ctx.textAlign = 'left';
      }

      setUvStats({ edges: totalEdgesDrawn, outOfBounds: outOfBoundsEdges });
      return;
    }

    // Default procedural reference UV islands
    const marginPx = config.uvMargin * S * 0.45;

    for (const isl of UV_ISLANDS) {
      const isFocused =
        selectedLayer === 'UV_all_parts' ||
        selectedLayer === 'UV_all_parts_dark' ||
        selectedLayer === isl.part;

      const x = isl.x * S + marginPx;
      const y = isl.y * S + marginPx;
      const w = Math.max(12, isl.w * S - marginPx * 2);
      const h = Math.max(12, isl.h * S - marginPx * 2);

      if (isFocused) {
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(isl.x * S, isl.y * S, isl.w * S, isl.h * S);
        ctx.setLineDash([]);
      }

      if (!customTexture) {
        ctx.fillStyle = isFocused ? 'rgba(56, 189, 248, 0.14)' : 'rgba(100, 116, 139, 0.05)';
        ctx.fillRect(x, y, w, h);
      }

      const cols = 6;
      const rows = 5;
      ctx.strokeStyle = isFocused ? 'rgba(226, 232, 240, 0.72)' : 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = isFocused ? 1 : 0.5;

      for (let c = 0; c <= cols; c++) {
        const lx = x + (c / cols) * w;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(lx, y + h);
        ctx.stroke();
      }
      for (let r = 0; r <= rows; r++) {
        const ly = y + (r / rows) * h;
        ctx.beginPath();
        ctx.moveTo(x, ly);
        ctx.lineTo(x + w, ly);
        ctx.stroke();
      }

      if (isFocused) {
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = config.seamAngleDeg < 60 ? 2.5 : 1.75;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.fillText(isl.label, x + 8, y + 20);
      }
    }
  }, [
    selectedLayer,
    uvChannel,
    config.uvMargin,
    config.seamAngleDeg,
    importedUvs,
    selectedImportedIdx,
    customTexture,
    wrapOutOfBoundsUv,
    showUvChecker,
    imgTick,
  ]);

  const handleImportTexture = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setCustomTexture({ name: file.name, img });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = importedUvs ? 'Imported_UV_Layout.png' : `${selectedLayer}.png`;
    a.click();
  };

  const totalTris = importedUvs
    ? importedUvs.reduce((acc, m) => acc + m.triCount, 0)
    : UV_ISLANDS.reduce((acc, i) => acc + i.tris, 0);
  const uvCoverage = Math.max(62, Math.min(92, Math.round(86 - config.uvMargin * 340)));

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <input
        ref={textureInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportTexture(f);
          e.target.value = '';
        }}
      />

      {/* Left Column: UV Controls */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Estrutura de UVs</h2>
          <p className="mt-1 text-sm text-slate-400">
            Inspecione o empacotamento de ilhas, coordenadas UV0/UV1 e a malha UV real do modelo GLB/glTF inserido.
          </p>
        </div>

        {/* UV Parameters Live Control */}
        <div className="rounded-xl bg-[#141923] border border-slate-800 p-5 flex flex-col gap-4">
          <div className="text-sm font-semibold text-slate-200">Parâmetros de Unwrap &amp; Densidade UV</div>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="flex justify-between text-slate-400">
              <span>Seam Angle (Ângulo de Costura)</span>
              <span className="font-mono text-orange-400 tabular-nums">{config.seamAngleDeg.toFixed(1)}°</span>
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

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="flex justify-between text-slate-400">
              <span>UV Margin (Espaçamento entre Ilhas)</span>
              <span className="font-mono text-orange-400 tabular-nums">{config.uvMargin.toFixed(3)}</span>
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

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-800 text-xs">
            <div>
              <div className="text-slate-500">Ocupação UV</div>
              <div className="mt-0.5 text-base font-semibold text-white font-mono tabular-nums">{uvCoverage}%</div>
            </div>
            <div>
              <div className="text-slate-500">Densidade</div>
              <div className="mt-0.5 text-base font-semibold text-white font-mono tabular-nums">{config.texelDensity} px/cm</div>
            </div>
            <div>
              <div className="text-slate-500">Triângulos</div>
              <div className="mt-0.5 text-base font-semibold text-white font-mono tabular-nums">{totalTris.toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </div>

        {/* Imported GLB Mesh UVs OR Reference UV Layouts */}
        {importedUvs && importedUvs.length > 0 ? (
          <div className="rounded-xl bg-[#141923] border border-slate-800 p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-200">
                Malhas do Modelo ({importedUvs.length})
              </div>
              <select
                value={uvChannel}
                onChange={(e) => setUvChannel(e.target.value as 'uv' | 'uv1')}
                aria-label="Canal UV"
                className="px-2 py-1 rounded bg-[#0D1017] border border-slate-700 text-xs text-slate-200"
              >
                <option value="uv">UV0 (TEXCOORD_0)</option>
                <option value="uv1">UV1 (TEXCOORD_1)</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wrapOutOfBoundsUv}
                  onChange={(e) => setWrapOutOfBoundsUv(e.target.checked)}
                  className="accent-orange-500"
                />
                <span>Normalizar Tiles</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showUvChecker}
                  onChange={(e) => setShowUvChecker(e.target.checked)}
                  className="accent-orange-500"
                />
                <span>Fundo Xadrez</span>
              </label>
            </div>
            <div className="text-xs text-slate-400">
              {uvStats.outOfBounds > 0 ? (
                <span className="text-amber-400">
                  {uvStats.outOfBounds.toLocaleString('pt-BR')} arestas fora de [0, 1] (tiling/repetição)
                </span>
              ) : (
                <span className="text-emerald-400">Todas as UVs dentro do espaço [0, 1]</span>
              )}
            </div>
            <div className="grid grid-cols-1 gap-1.5 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => setSelectedImportedIdx('all')}
                className={`px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                  selectedImportedIdx === 'all'
                    ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                    : 'bg-[#0D1017] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                Todas as malhas ({importedUvs.length})
              </button>
              {importedUvs.map((m, idx) => (
                <button
                  key={`${m.name}-${idx}`}
                  type="button"
                  onClick={() => setSelectedImportedIdx(idx)}
                  className={`px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors truncate cursor-pointer flex items-center justify-between gap-2 ${
                    selectedImportedIdx === idx
                      ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                      : 'bg-[#0D1017] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  <span className="text-slate-500 shrink-0 tabular-nums">
                    {m.uvEdges.length === 0 ? 'sem UV' : `${m.triCount} tris`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#141923] border border-slate-800 p-5 flex flex-col gap-2">
            <div className="text-sm font-semibold text-slate-200 mb-1">Layouts UV (Referência)</div>
            <div className="grid grid-cols-2 gap-1.5">
              {UV_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setSelectedLayer(layer.id)}
                  className={`px-2.5 py-2 rounded-lg text-left text-xs font-mono transition-colors truncate cursor-pointer ${
                    selectedLayer === layer.id
                      ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                      : 'bg-[#0D1017] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {layer.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column: Interactive 2D UV Canvas */}
      <div className="lg:col-span-8 rounded-xl bg-[#141923] border border-slate-800 p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-200">
            Malha UV ({uvChannel.toUpperCase()})
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => textureInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar Textura</span>
            </button>
            {customTexture && (
              <button
                type="button"
                onClick={() => setCustomTexture(null)}
                title="Remover textura importada"
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={handleExportPng}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar PNG</span>
            </button>
          </div>
        </div>

        {customTexture && (
          <div className="text-xs text-slate-400 font-mono">
            Textura sobreposta: <span className="text-slate-200">{customTexture.name}</span>
          </div>
        )}

        <div className="w-full aspect-square max-h-[620px] rounded-lg overflow-hidden border border-slate-800 bg-[#0B0E14] flex items-center justify-center">
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
        </div>
      </div>
    </div>
  );
};
