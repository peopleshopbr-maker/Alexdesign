import React, { useEffect, useRef, useState } from 'react';
import { Download, Eye, EyeOff, Upload, X } from 'lucide-react';
import { StudioConfig } from '../types/studioConfig';
import { ImportedUvMesh } from './Viewport3D';

type PbrAtlasChannel = 'base_color' | 'roughness' | 'metallic' | 'normal' | 'ao';

interface AtlasIsland {
  part: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  roughnessGray: number;
  metallicGray: number;
  aoGray: number;
}

const ATLAS_ISLANDS: AtlasIsland[] = [
  { part: 'Head', label: 'Head', x: 0.04, y: 0.04, w: 0.28, h: 0.28, color: '#f2cbb8', roughnessGray: 135, metallicGray: 0, aoGray: 235 },
  { part: 'Hair', label: 'Hair', x: 0.35, y: 0.04, w: 0.32, h: 0.28, color: '#3b2a4a', roughnessGray: 108, metallicGray: 14, aoGray: 175 },
  { part: 'Jacket', label: 'Jacket', x: 0.04, y: 0.35, w: 0.44, h: 0.32, color: '#273549', roughnessGray: 210, metallicGray: 10, aoGray: 192 },
  { part: 'Body', label: 'Body', x: 0.51, y: 0.35, w: 0.26, h: 0.32, color: '#eac1ae', roughnessGray: 140, metallicGray: 0, aoGray: 220 },
  { part: 'Skirt', label: 'Skirt', x: 0.04, y: 0.7, w: 0.52, h: 0.26, color: '#1e293b', roughnessGray: 185, metallicGray: 12, aoGray: 162 },
  { part: 'Zipper', label: 'Zipper', x: 0.7, y: 0.04, w: 0.26, h: 0.28, color: '#cbd5e1', roughnessGray: 42, metallicGray: 242, aoGray: 210 },
];

interface PbrAtlasPanelProps {
  config: StudioConfig;
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

export const PbrAtlasPanel: React.FC<PbrAtlasPanelProps> = ({ config, importedUvs }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);
  const imgCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [channel, setChannel] = useState<PbrAtlasChannel>('base_color');
  const [selectedImportedIdx, setSelectedImportedIdx] = useState<number | 'all'>('all');
  const [selectedIsland, setSelectedIsland] = useState<string>('all');
  const [overlayUvOnAtlas, setOverlayUvOnAtlas] = useState(true);
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

    if (channel === 'normal') {
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, S, S);
    } else {
      ctx.fillStyle = '#0b0e14';
      ctx.fillRect(0, 0, S, S);
    }

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

    if (importedUvs && importedUvs.length > 0) {
      const meshesToDraw =
        selectedImportedIdx === 'all' ? importedUvs : [importedUvs[selectedImportedIdx]].filter(Boolean);

      const activeMesh = meshesToDraw[0];
      const texKeyMap: Record<PbrAtlasChannel, keyof NonNullable<ImportedUvMesh['textures']>> = {
        base_color: 'baseColor',
        roughness: 'roughness',
        metallic: 'metallic',
        normal: 'normal',
        ao: 'ao',
      };
      const texKey = texKeyMap[channel];
      const meshWithTex = meshesToDraw.find((m) => m.textures?.[texKey]) || activeMesh;
      const texUrl = customTexture ? null : meshWithTex?.textures?.[texKey] || null;

      if (customTexture) {
        ctx.drawImage(customTexture.img, 0, 0, S, S);
      } else if (texUrl) {
        const loadedImg = loadImageCached(texUrl, imgCacheRef.current, () =>
          setImgTick((t) => t + 1)
        );
        if (loadedImg) {
          ctx.drawImage(loadedImg, 0, 0, S, S);
        }
      } else {
        if (channel === 'base_color' && meshWithTex?.materialColor) {
          ctx.fillStyle = meshWithTex.materialColor;
          ctx.fillRect(0, 0, S, S);
        } else if (channel === 'roughness' || channel === 'metallic' || channel === 'ao') {
          ctx.fillStyle = channel === 'ao' ? '#e2e8f0' : channel === 'metallic' ? '#1e293b' : '#808080';
          ctx.fillRect(0, 0, S, S);
        }
        ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
        ctx.font = '500 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(
          `Canal "${texKey}" sem mapa bitmap conectado neste material (valor uniforme).`,
          20,
          36
        );
      }

      if (overlayUvOnAtlas) {
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.48)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const m of meshesToDraw) {
          const edges = m.uvEdges;
          for (let i = 0; i < edges.length; i += 4) {
            const u1 = edges[i];
            const v1 = edges[i + 1];
            const u2 = edges[i + 2];
            const v2 = edges[i + 3];
            if (Math.abs(u1 - u2) > 0.65 || Math.abs(v1 - v2) > 0.65) continue;
            ctx.moveTo(u1 * S, (1 - v1) * S);
            ctx.lineTo(u2 * S, (1 - v2) * S);
          }
        }
        ctx.stroke();
      }
      return;
    }

    // Default procedural reference atlas islands
    if (customTexture) {
      ctx.drawImage(customTexture.img, 0, 0, S, S);
      return;
    }

    const marginPx = config.uvMargin * S * 0.45;
    for (const isl of ATLAS_ISLANDS) {
      const isFocused = selectedIsland === 'all' || selectedIsland === isl.part;
      const x = isl.x * S + marginPx;
      const y = isl.y * S + marginPx;
      const w = Math.max(12, isl.w * S - marginPx * 2);
      const h = Math.max(12, isl.h * S - marginPx * 2);

      let fill = isl.color;
      if (channel === 'roughness') {
        fill = `rgb(${isl.roughnessGray}, ${isl.roughnessGray}, ${isl.roughnessGray})`;
      } else if (channel === 'metallic') {
        fill = `rgb(${isl.metallicGray}, ${isl.metallicGray}, ${isl.metallicGray})`;
      } else if (channel === 'ao') {
        fill = `rgb(${isl.aoGray}, ${isl.aoGray}, ${isl.aoGray})`;
      } else if (channel === 'normal') {
        fill = '#8488ff';
      }

      ctx.globalAlpha = isFocused ? 1.0 : 0.25;
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1.0;

      if (overlayUvOnAtlas && isFocused) {
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = channel === 'roughness' || channel === 'metallic' || channel === 'ao' ? '#f97316' : '#f8fafc';
        ctx.font = '600 13px "JetBrains Mono", monospace';
        ctx.fillText(isl.label, x + 8, y + 20);
      }
    }
  }, [
    channel,
    config.uvMargin,
    importedUvs,
    selectedImportedIdx,
    selectedIsland,
    overlayUvOnAtlas,
    customTexture,
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
    a.download = importedUvs ? `Imported_Atlas_${channel}.png` : `Atlas_${channel}.png`;
    a.click();
  };

  return (
    <section className="rounded-xl bg-[#141923] border border-slate-800 p-4 sm:p-6 flex flex-col gap-5">
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

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-white">Atlas de Texturas PBR</h2>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">
            Inspecione os canais do Atlas PBR ({config.textureResolution}px) do modelo GLB/glTF importado ou do ativo padrão, com sobreposição opcional da malha UV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setOverlayUvOnAtlas((v) => !v)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              overlayUvOnAtlas
                ? 'bg-orange-600/20 border-orange-500 text-orange-200'
                : 'bg-[#0D1017] border-slate-700 text-slate-300'
            }`}
          >
            {overlayUvOnAtlas ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Sobrepor UV</span>
          </button>
          <button
            type="button"
            onClick={() => textureInputRef.current?.click()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-2 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Textura</span>
          </button>
          {customTexture && (
            <button
              type="button"
              onClick={() => setCustomTexture(null)}
              title="Remover textura importada"
              aria-label="Remover textura importada"
              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center p-2 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleExportPng}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Atlas PNG</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="text-xs font-semibold text-slate-300">
            {importedUvs && importedUvs.length > 0
              ? `Malhas no Atlas (${importedUvs.length})`
              : 'Ilhas do Atlas (Referência)'}
          </div>

          {importedUvs && importedUvs.length > 0 ? (
            <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
              <button
                type="button"
                onClick={() => setSelectedImportedIdx('all')}
                className={`min-h-[40px] sm:min-h-0 px-3 py-2 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
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
                  className={`min-h-[40px] sm:min-h-0 px-3 py-2 rounded-lg text-left text-xs font-mono transition-colors truncate cursor-pointer flex items-center justify-between gap-2 ${
                    selectedImportedIdx === idx
                      ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                      : 'bg-[#0D1017] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  <span className="truncate">{m.name}</span>
                  <span className="text-slate-500 shrink-0 tabular-nums">{m.triCount} tris</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedIsland('all')}
                className={`col-span-2 min-h-[40px] sm:min-h-0 px-3 py-2 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                  selectedIsland === 'all'
                    ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                    : 'bg-[#0D1017] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                Atlas Completo (Todas)
              </button>
              {ATLAS_ISLANDS.map((isl) => (
                <button
                  key={isl.part}
                  type="button"
                  onClick={() => setSelectedIsland(isl.part)}
                  className={`min-h-[40px] sm:min-h-0 px-3 py-2 rounded-lg text-left text-xs font-mono transition-colors cursor-pointer ${
                    selectedIsland === isl.part
                      ? 'bg-orange-600/20 text-orange-300 border border-orange-500/40'
                      : 'bg-[#0D1017] text-slate-400 hover:text-slate-200 border border-slate-800/80'
                  }`}
                >
                  {isl.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0D1017] border border-slate-800 overflow-x-auto overflow-y-hidden no-scrollbar">
            {(
              [
                { id: 'base_color', label: 'Base Color' },
                { id: 'roughness', label: 'Roughness' },
                { id: 'metallic', label: 'Metallic' },
                { id: 'normal', label: 'Normal Map' },
                { id: 'ao', label: 'Ambient Occlusion' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setChannel(tab.id)}
                className={`min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  channel === tab.id ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="w-full aspect-square max-h-[520px] rounded-lg overflow-hidden border border-slate-800 bg-[#0B0E14] flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
};
