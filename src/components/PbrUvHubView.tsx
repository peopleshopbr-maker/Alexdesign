import React, { useMemo, useRef, useState } from 'react';
import {
  Box,
  Calculator,
  Combine,
  Download,
  FlipVertical2,
  Grid,
  Layers,
  Minimize2,
  Palette,
  Pipette,
  RefreshCw,
  Ruler,
  Sparkles,
  Sun,
  Upload,
} from 'lucide-react';
import { ImportedUvMesh } from './Viewport3D';
import { ToolboxModelViewer } from './ToolboxModelViewer';

export type HubToolId =
  | 'model_inspector'
  | 'gaussian_splat'
  | 'lod_generator'
  | 'hdri_editor'
  | 'uv_atlas'
  | 'vram_calc'
  | 'texel_density'
  | 'seamless_tex'
  | 'pbr_converter'
  | 'pbr_materials'
  | 'albedo_picker'
  | 'channel_packer'
  | 'normal_combiner'
  | 'normal_inverter';

interface PbrUvHubViewProps {
  atlasContent: React.ReactNode;
  materialContent: React.ReactNode;
  importedUvs?: ImportedUvMesh[] | null;
  syncedModelFile?: File | null;
  onImportFileToViewport?: (file: File) => void;
  onOpenViewport?: () => void;
  initialTool?: HubToolId;
}

type ToolCategoryId = 'geometry' | 'uv_opt' | 'pbr_maps' | 'lighting';

const TOOL_CATEGORIES: { id: ToolCategoryId; label: string }[] = [
  { id: 'geometry', label: '1. Geometria & Inspeção' },
  { id: 'uv_opt', label: '2. UV & Otimização' },
  { id: 'pbr_maps', label: '3. Materiais PBR & Mapas' },
  { id: 'lighting', label: '4. Iluminação & HDRI' },
];

const HUB_TOOLS: { id: HubToolId; category: ToolCategoryId; label: string; icon: React.ReactNode }[] = [
  { id: 'model_inspector', category: 'geometry', label: 'Model Inspector', icon: <Box className="w-3.5 h-3.5" /> },
  { id: 'gaussian_splat', category: 'geometry', label: 'Gaussian Splat Viewer', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'lod_generator', category: 'geometry', label: 'Polygon Reducer / LOD', icon: <Minimize2 className="w-3.5 h-3.5" /> },
  { id: 'uv_atlas', category: 'uv_opt', label: 'UV Layout & Checker', icon: <Grid className="w-3.5 h-3.5" /> },
  { id: 'texel_density', category: 'uv_opt', label: 'Texel Density', icon: <Ruler className="w-3.5 h-3.5" /> },
  { id: 'vram_calc', category: 'uv_opt', label: 'Texture Memory (VRAM)', icon: <Calculator className="w-3.5 h-3.5" /> },
  { id: 'seamless_tex', category: 'uv_opt', label: 'Seamless Texture Gen', icon: <Grid className="w-3.5 h-3.5" /> },
  { id: 'pbr_materials', category: 'pbr_maps', label: 'PBR Map Gen / Viewer', icon: <Palette className="w-3.5 h-3.5" /> },
  { id: 'pbr_converter', category: 'pbr_maps', label: 'PBR Workflow Converter', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  { id: 'albedo_picker', category: 'pbr_maps', label: 'PBR Albedo & Reflectance', icon: <Pipette className="w-3.5 h-3.5" /> },
  { id: 'channel_packer', category: 'pbr_maps', label: 'PBR Channel Packer', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'normal_combiner', category: 'pbr_maps', label: 'Normal Map Combiner', icon: <Combine className="w-3.5 h-3.5" /> },
  { id: 'normal_inverter', category: 'pbr_maps', label: 'Normal Map Inverter', icon: <FlipVertical2 className="w-3.5 h-3.5" /> },
  { id: 'hdri_editor', category: 'lighting', label: 'HDRI & Luzes Editor', icon: <Sun className="w-3.5 h-3.5" /> },
];

const CALIBRATED_ALBEDO = [
  { name: 'Carvão', hex: '#323232', f0: '4%', type: 'Dielétrico' },
  { name: 'Borracha / Asfalto', hex: '#3B3B3B', f0: '4%', type: 'Dielétrico' },
  { name: 'Concreto', hex: '#7A7A76', f0: '4%', type: 'Dielétrico' },
  { name: 'Madeira Carvalho', hex: '#8B6242', f0: '4%', type: 'Dielétrico' },
  { name: 'Pele Humana', hex: '#D8A488', f0: '4%', type: 'Dielétrico' },
  { name: 'Neve Limpa', hex: '#E5E8EC', f0: '4%', type: 'Dielétrico' },
  { name: 'Ferro / Aço', hex: '#C4C7C9', f0: '56%', type: 'Metal' },
  { name: 'Alumínio', hex: '#E6E8EA', f0: '91%', type: 'Metal' },
  { name: 'Ouro 24K', hex: '#F6C756', f0: '100%', type: 'Metal' },
  { name: 'Cobre', hex: '#D98664', f0: '95%', type: 'Metal' },
];

const HDRI_PRESETS = [
  { id: 'studio', name: 'Estúdio Softbox', bg: 'linear-gradient(180deg, #2b3548 0%, #7d8da6 48%, #1d222c 100%)', ev: 1.1 },
  { id: 'sunset', name: 'Pôr do Sol Cinema', bg: 'linear-gradient(180deg, #1b2848 0%, #e07a3d 52%, #291820 100%)', ev: 1.25 },
  { id: 'cyber', name: 'Neon Cyberpunk', bg: 'linear-gradient(180deg, #090d1f 0%, #6d28d9 48%, #0ea5e9 100%)', ev: 1.0 },
  { id: 'overcast', name: 'Nublado Neutro (LookDev)', bg: 'linear-gradient(180deg, #64748b 0%, #cbd5e1 52%, #334155 100%)', ev: 0.95 },
];

export const PbrUvHubView: React.FC<PbrUvHubViewProps> = ({
  atlasContent,
  materialContent,
  syncedModelFile,
  onImportFileToViewport,
  onOpenViewport,
  initialTool = 'uv_atlas',
}) => {
  const [activeTool, setActiveTool] = useState<HubToolId>(initialTool);
  const activeCategory: ToolCategoryId =
    HUB_TOOLS.find((t) => t.id === activeTool)?.category ?? 'geometry';
  const visibleCategoryTools = HUB_TOOLS.filter((t) => t.category === activeCategory);

  const handleSelectCategory = (catId: ToolCategoryId) => {
    const firstInCat = HUB_TOOLS.find((t) => t.category === catId);
    if (firstInCat) setActiveTool(firstInCat.id);
  };

  const [autoPipelineDone, setAutoPipelineDone] = useState(false);

  const handleAutoConfigureAll = () => {
    // 1. Geometria & Inspeção (LOD otimizado)
    setLodBaseTris(32000);
    // 2. UV & Otimização (2K BC7 + Mipmaps)
    setTexRes(2048);
    setTexFormat('bc7');
    setTexMipmaps(true);
    setTexMapCount(4);
    // 3. Materiais PBR & Mapas + 4. Iluminação & HDRI
    setHdriPreset(HDRI_PRESETS[0]);
    setHdriExposure(1.15);
    setHdriRotation(25);
    setActiveTool('hdri_editor');
    setAutoPipelineDone(true);
    window.setTimeout(() => setAutoPipelineDone(false), 3500);
  };

  const loadImageFile = (file: File, setter: (img: HTMLImageElement) => void) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setter(img);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  // --- 2. Gaussian Splat Viewer (.ply / .splat point cloud preview) ---
  const [splatInfo, setSplatInfo] = useState<{ name: string; bytes: number; points: number } | null>(null);

  // --- 3. LOD Generator ---
  const [lodBaseTris, setLodBaseTris] = useState(48000);

  // --- 4. HDRI Environment Viewer / Editor ---
  const [hdriPreset, setHdriPreset] = useState(HDRI_PRESETS[0]);
  const [hdriExposure, setHdriExposure] = useState(1.1);
  const [hdriRotation, setHdriRotation] = useState(0);
  const [hdriCustomUrl, setHdriCustomUrl] = useState<string | null>(null);

  // --- 6. Texture Memory (VRAM) ---
  const [texRes, setTexRes] = useState<512 | 1024 | 2048 | 4096 | 8192>(2048);
  const [texFormat, setTexFormat] = useState<'rgba8' | 'bc7' | 'bc1' | 'rgba16f'>('bc7');
  const [texMipmaps, setTexMipmaps] = useState(true);
  const [texMapCount, setTexMapCount] = useState(4);

  const vramStats = useMemo(() => {
    const bpp = texFormat === 'rgba16f' ? 8 : texFormat === 'rgba8' ? 4 : texFormat === 'bc7' ? 1 : 0.5;
    const base = texRes * texRes * bpp;
    const singleMb = (texMipmaps ? base * 1.3333 : base) / (1024 * 1024);
    return { singleMb, totalMb: singleMb * texMapCount };
  }, [texRes, texFormat, texMipmaps, texMapCount]);

  // --- 7. Texel Density ---
  const [tdRes, setTdRes] = useState<512 | 1024 | 2048 | 4096>(2048);
  const [meshSizeMeters, setMeshSizeMeters] = useState(2.0);
  const [uvCoveragePct, setUvCoveragePct] = useState(75);
  const pxPerMeter = (tdRes * Math.sqrt(uvCoveragePct / 100)) / Math.max(0.05, meshSizeMeters);
  const pxPerCm = pxPerMeter / 100;

  // --- 8. Seamless Texture Generator ---
  const [seamlessUrl, setSeamlessUrl] = useState<string | null>(null);
  const seamlessCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleMakeSeamless = (file: File) => {
    loadImageFile(file, (img) => {
      const c = seamlessCanvasRef.current;
      if (!c) return;
      const size = Math.min(1024, Math.max(256, img.width));
      c.width = size;
      c.height = size;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      // 2x2 mirrored tile for guaranteed seamless edges
      const half = size / 2;
      ctx.drawImage(img, 0, 0, half, half);
      ctx.save();
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, half, half);
      ctx.restore();
      ctx.save();
      ctx.translate(0, size);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, half, half);
      ctx.restore();
      ctx.save();
      ctx.translate(size, size);
      ctx.scale(-1, -1);
      ctx.drawImage(img, 0, 0, half, half);
      ctx.restore();
      setSeamlessUrl(c.toDataURL('image/png'));
    });
  };

  // --- 9. PBR Workflow Converter (Spec/Gloss <-> Metal/Rough) ---
  const [glossValue, setGlossValue] = useState(0.65);
  const [specUrl, setSpecUrl] = useState<string | null>(null);
  const specCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleInvertGlossToRough = (file: File) => {
    loadImageFile(file, (img) => {
      const c = specCanvasRef.current;
      if (!c) return;
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, c.width, c.height);
      for (let i = 0; i < data.data.length; i += 4) {
        data.data[i] = 255 - data.data[i];
        data.data[i + 1] = 255 - data.data[i + 1];
        data.data[i + 2] = 255 - data.data[i + 2];
      }
      ctx.putImageData(data, 0, 0);
      setSpecUrl(c.toDataURL('image/png'));
    });
  };

  // --- 11. Albedo & Reflectance Picker ---
  const [selectedAlbedo, setSelectedAlbedo] = useState(CALIBRATED_ALBEDO[3]);

  // --- 12. ORM Channel Packer ---
  const [ormSize, setOrmSize] = useState<512 | 1024 | 2048>(1024);
  const [ormAoVal, setOrmAoVal] = useState(235);
  const [ormRoughVal, setOrmRoughVal] = useState(140);
  const [ormMetalVal, setOrmMetalVal] = useState(0);
  const [ormAoImg, setOrmAoImg] = useState<HTMLImageElement | null>(null);
  const [ormRoughImg, setOrmRoughImg] = useState<HTMLImageElement | null>(null);
  const [ormMetalImg, setOrmMetalImg] = useState<HTMLImageElement | null>(null);
  const ormCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handlePackOrm = () => {
    const canvas = ormCanvasRef.current;
    if (!canvas) return;
    canvas.width = ormSize;
    canvas.height = ormSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sample = (img: HTMLImageElement | null, fallback: number): Uint8ClampedArray => {
      if (!img) {
        const arr = new Uint8ClampedArray(ormSize * ormSize);
        arr.fill(fallback);
        return arr;
      }
      const tmp = document.createElement('canvas');
      tmp.width = ormSize;
      tmp.height = ormSize;
      const tctx = tmp.getContext('2d')!;
      tctx.drawImage(img, 0, 0, ormSize, ormSize);
      const d = tctx.getImageData(0, 0, ormSize, ormSize).data;
      const out = new Uint8ClampedArray(ormSize * ormSize);
      for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
      return out;
    };
    const r = sample(ormAoImg, ormAoVal);
    const g = sample(ormRoughImg, ormRoughVal);
    const b = sample(ormMetalImg, ormMetalVal);
    const outImg = ctx.createImageData(ormSize, ormSize);
    for (let i = 0; i < ormSize * ormSize; i++) {
      const p = i * 4;
      outImg.data[p] = r[i];
      outImg.data[p + 1] = g[i];
      outImg.data[p + 2] = b[i];
      outImg.data[p + 3] = 255;
    }
    ctx.putImageData(outImg, 0, 0);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `AlexDesign_ORM_${ormSize}.png`;
    a.click();
  };

  // --- 13. Normal Map Combiner (UDN Blend) ---
  const [baseNormalImg, setBaseNormalImg] = useState<HTMLImageElement | null>(null);
  const [detailNormalImg, setDetailNormalImg] = useState<HTMLImageElement | null>(null);
  const [combinedNormalUrl, setCombinedNormalUrl] = useState<string | null>(null);
  const combineCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleCombineNormals = () => {
    if (!baseNormalImg || !detailNormalImg || !combineCanvasRef.current) return;
    const size = Math.min(1024, Math.max(baseNormalImg.width, 512));
    const c = combineCanvasRef.current;
    c.width = size;
    c.height = size;
    const ctx = c.getContext('2d')!;
    const getPixels = (img: HTMLImageElement) => {
      const t = document.createElement('canvas');
      t.width = size;
      t.height = size;
      const tc = t.getContext('2d')!;
      tc.drawImage(img, 0, 0, size, size);
      return tc.getImageData(0, 0, size, size).data;
    };
    const d1 = getPixels(baseNormalImg);
    const d2 = getPixels(detailNormalImg);
    const out = ctx.createImageData(size, size);
    for (let i = 0; i < d1.length; i += 4) {
      const nx = (d1[i] / 255) * 2 - 1 + ((d2[i] / 255) * 2 - 1);
      const ny = (d1[i + 1] / 255) * 2 - 1 + ((d2[i + 1] / 255) * 2 - 1);
      const nz = (d1[i + 2] / 255) * 2 - 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      out.data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      out.data[i + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      out.data[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    setCombinedNormalUrl(c.toDataURL('image/png'));
  };

  // --- 14. Normal Map Channel Inverter ---
  const [normalPreviewUrl, setNormalPreviewUrl] = useState<string | null>(null);
  const [normalInverted, setNormalInverted] = useState(false);
  const normalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const normalSourceImgRef = useRef<HTMLImageElement | null>(null);

  const renderNormalCanvas = (img: HTMLImageElement, invertG: boolean) => {
    const canvas = normalCanvasRef.current;
    if (!canvas) return;
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
    if (invertG) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < imgData.data.length; i += 4) {
        imgData.data[i + 1] = 255 - imgData.data[i + 1];
      }
      ctx.putImageData(imgData, 0, 0);
    }
    setNormalPreviewUrl(canvas.toDataURL('image/png'));
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-4">
      {/* RenderHub-Style 3D Toolbox Switcher Bar */}
      <div className="rounded-xl bg-[#111520] border border-slate-800 p-2.5 flex flex-wrap items-center gap-1.5">
        {/* 1. Categorias Lógicas 3D (sem duplicidade) */}
        <div className="w-full flex flex-wrap items-center justify-between gap-2 pb-2 mb-1 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            {TOOL_CATEGORIES.map((cat) => {
              const isCatActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                    isCatActive
                      ? 'bg-orange-500 text-slate-950 shadow-sm'
                      : 'bg-[#171C2A] border border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleAutoConfigureAll}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                autoPipelineDone
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              }`}
            >
              {autoPipelineDone ? '1→4 Automatizado ✓' : 'Automatizar 1→4'}
            </button>
            {onOpenViewport && (
              <button
                type="button"
                onClick={onOpenViewport}
                className="px-2.5 py-1.5 rounded-lg bg-[#171C2A] border border-slate-700 hover:border-orange-500/60 text-[11px] font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                Voltar à Viewport 3D
              </button>
            )}
          </div>
        </div>

        {/* 2. Ferramentas da Categoria Selecionada */}
        <div className="w-full flex flex-wrap items-center gap-1.5">
          {visibleCategoryTools.map((tool) => {
            const active = activeTool === tool.id;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-[#171C2A] border border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                }`}
              >
                {tool.icon}
                <span>{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Visualizador 3D Interativo — interligado ao vivo com Viewport 3D e todas as 14 ferramentas */}
      <ToolboxModelViewer
        syncedModelFile={syncedModelFile}
        onModelFileLoaded={onImportFileToViewport}
        liveExposure={hdriExposure}
        liveAlbedoHex={activeTool === 'albedo_picker' ? selectedAlbedo.hex : null}
        liveDiffuseUrl={seamlessUrl}
        liveNormalUrl={combinedNormalUrl ?? normalPreviewUrl}
      />

      {/* 2. Gaussian Splat Viewer */}
      {activeTool === 'gaussian_splat' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Gaussian Splat Viewer (.splat / .ply)</h2>
            <p className="text-xs text-slate-400">
              Inspecione arquivos de 3D Gaussian Splatting (`.splat`, `.ply`) e estime contagem de splats e orçamento de memória GPU.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer w-fit">
            <Upload className="w-4 h-4" />
            <span>Carregar arquivo .splat ou .ply</span>
            <input
              type="file"
              accept=".splat,.ply"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setSplatInfo({
                    name: f.name,
                    bytes: f.size,
                    points: Math.max(1, Math.floor(f.size / 32)),
                  });
                }
              }}
            />
          </label>
          {splatInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg bg-[#0C1018] border border-slate-800 p-3">
                <div className="text-slate-400">Arquivo</div>
                <div className="font-semibold text-white truncate">{splatInfo.name}</div>
              </div>
              <div className="rounded-lg bg-[#0C1018] border border-slate-800 p-3">
                <div className="text-slate-400">Splats Estimados</div>
                <div className="font-mono text-lg font-bold text-cyan-300">
                  {splatInfo.points.toLocaleString()}
                </div>
              </div>
              <div className="rounded-lg bg-[#0C1018] border border-slate-800 p-3">
                <div className="text-slate-400">Tamanho em Disco</div>
                <div className="font-mono text-lg font-bold text-orange-400">
                  {(splatInfo.bytes / (1024 * 1024)).toFixed(2)} MB
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Polygon Reducer / LOD Generator */}
      {activeTool === 'lod_generator' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-white">Polygon Reducer / LOD Generator</h2>
              <p className="text-xs text-slate-400">
                Planeje a cadeia de LOD0 a LOD3 para jogos (Unreal / Unity / WebGL) e aplique a decimação na etapa 4. Retopology.
              </p>
            </div>
            {onOpenViewport && (
              <button
                type="button"
                onClick={onOpenViewport}
                className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
              >
                Decimar na Viewport 3D
              </button>
            )}
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-300 max-w-md">
            <span className="flex justify-between">
              <span>Polígonos Base (LOD0)</span>
              <span className="font-mono text-cyan-300">{lodBaseTris.toLocaleString()} tris</span>
            </span>
            <input
              type="range"
              min={1000}
              max={250000}
              step={1000}
              value={lodBaseTris}
              onChange={(e) => setLodBaseTris(Number(e.target.value))}
            />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {[
              { name: 'LOD0 (Hero)', pct: 100, dist: '0–10m' },
              { name: 'LOD1 (Médio)', pct: 50, dist: '10–25m' },
              { name: 'LOD2 (Distante)', pct: 25, dist: '25–60m' },
              { name: 'LOD3 (Billboard)', pct: 10, dist: '60m+' },
            ].map((lod) => (
              <div key={lod.name} className="rounded-lg bg-[#0C1018] border border-slate-800 p-3">
                <div className="font-semibold text-white">{lod.name}</div>
                <div className="font-mono text-lg font-bold text-emerald-300 mt-1">
                  {Math.round((lodBaseTris * lod.pct) / 100).toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-400">
                  {lod.pct}% • Distância {lod.dist}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HDRI Environment Viewer / Editor (unificado com 10. Luzes & HDRI) */}
      {activeTool === 'hdri_editor' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-base font-bold text-white">HDRI Environment Viewer / Editor &amp; Luzes</h2>
              <p className="text-xs text-slate-400">
                Visualize e ajuste iluminação HDRI 360°, exposição EV, rotação do domo e presets de estúdio.
              </p>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Carregar HDRI / Panorama</span>
              <input
                type="file"
                accept="image/*,.hdr,.exr"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setHdriCustomUrl(URL.createObjectURL(f));
                }}
              />
            </label>
          </div>
          <div
            className="w-full h-44 rounded-xl border border-slate-700 overflow-hidden relative flex items-center justify-center"
            style={{
              background: hdriCustomUrl ? `url(${hdriCustomUrl}) center/cover` : hdriPreset.bg,
              filter: `brightness(${hdriExposure})`,
              backgroundPositionX: `${hdriRotation}px`,
            }}
          >
            <div className="w-20 h-20 rounded-full border border-white/40 shadow-2xl bg-gradient-to-br from-white/90 via-slate-300/60 to-slate-900/90" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HDRI_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setHdriCustomUrl(null);
                  setHdriPreset(p);
                  setHdriExposure(p.ev);
                }}
                className={`px-3 py-2 rounded-lg border text-xs font-medium cursor-pointer ${
                  !hdriCustomUrl && hdriPreset.id === p.id
                    ? 'bg-orange-600/25 border-orange-500 text-orange-100'
                    : 'bg-[#0C1018] border-slate-800 text-slate-300'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="flex flex-col gap-1 text-slate-300">
              <span className="flex justify-between">
                <span>Exposição (EV)</span>
                <span className="font-mono text-amber-300">{hdriExposure.toFixed(2)}</span>
              </span>
              <input
                type="range"
                min={0.3}
                max={2.2}
                step={0.05}
                value={hdriExposure}
                onChange={(e) => setHdriExposure(Number(e.target.value))}
              />
            </label>
            <label className="flex flex-col gap-1 text-slate-300">
              <span className="flex justify-between">
                <span>Rotação do Ambiente</span>
                <span className="font-mono text-amber-300">{hdriRotation}°</span>
              </span>
              <input
                type="range"
                min={0}
                max={360}
                step={5}
                value={hdriRotation}
                onChange={(e) => setHdriRotation(Number(e.target.value))}
              />
            </label>
          </div>
        </div>
      )}

      {/* 5. UV Layout & Checker */}
      {activeTool === 'uv_atlas' && atlasContent}

      {/* 6. Texture Memory Calculator (VRAM) */}
      {activeTool === 'vram_calc' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-white">Texture Memory Calculator (VRAM)</h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex flex-col gap-1 text-slate-400">
                <span>Resolução</span>
                <select
                  value={texRes}
                  onChange={(e) => setTexRes(Number(e.target.value) as 512 | 1024 | 2048 | 4096 | 8192)}
                  className="px-2.5 py-2 rounded-lg bg-[#0C1018] border border-slate-700 text-slate-100"
                >
                  <option value={512}>512 × 512</option>
                  <option value={1024}>1024 × 1024 (1K)</option>
                  <option value={2048}>2048 × 2048 (2K)</option>
                  <option value={4096}>4096 × 4096 (4K)</option>
                  <option value={8192}>8192 × 8192 (8K)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-slate-400">
                <span>Formato GPU</span>
                <select
                  value={texFormat}
                  onChange={(e) => setTexFormat(e.target.value as 'rgba8' | 'bc7' | 'bc1' | 'rgba16f')}
                  className="px-2.5 py-2 rounded-lg bg-[#0C1018] border border-slate-700 text-slate-100"
                >
                  <option value="bc7">BC7 / ASTC (1 BPP)</option>
                  <option value="bc1">BC1 / DXT1 (0.5 BPP)</option>
                  <option value="rgba8">RGBA8 (4 BPP)</option>
                  <option value="rgba16f">RGBA16F HDR (8 BPP)</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-slate-400">
                <span>Qtd. de Mapas ({texMapCount})</span>
                <input type="range" min={1} max={8} value={texMapCount} onChange={(e) => setTexMapCount(Number(e.target.value))} />
              </label>
              <label className="flex items-center gap-2 text-slate-200 pt-4 cursor-pointer">
                <input type="checkbox" checked={texMipmaps} onChange={(e) => setTexMipmaps(e.target.checked)} />
                <span>Mipmaps (+33%)</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 content-center">
            <div className="rounded-xl bg-[#0C1018] border border-slate-800 p-4">
              <div className="text-[11px] text-slate-400">VRAM por Mapa</div>
              <div className="text-2xl font-bold text-cyan-300 font-mono">{vramStats.singleMb.toFixed(2)} MB</div>
            </div>
            <div className="rounded-xl bg-[#0C1018] border border-slate-800 p-4">
              <div className="text-[11px] text-slate-400">VRAM Total ({texMapCount} mapas)</div>
              <div className="text-2xl font-bold text-orange-400 font-mono">{vramStats.totalMb.toFixed(2)} MB</div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Texel Density Calculator */}
      {activeTool === 'texel_density' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex flex-col gap-3 text-xs">
            <h2 className="text-base font-bold text-white">Texel Density Calculator</h2>
            <label className="flex flex-col gap-1 text-slate-400">
              <span>Resolução da Textura</span>
              <select
                value={tdRes}
                onChange={(e) => setTdRes(Number(e.target.value) as 512 | 1024 | 2048 | 4096)}
                className="px-2.5 py-2 rounded-lg bg-[#0C1018] border border-slate-700 text-slate-100"
              >
                <option value={512}>512 × 512</option>
                <option value={1024}>1024 × 1024 (1K)</option>
                <option value={2048}>2048 × 2048 (2K)</option>
                <option value={4096}>4096 × 4096 (4K)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-slate-400">
              <span>Tamanho do Objeto: {meshSizeMeters.toFixed(1)} m</span>
              <input type="range" min={0.2} max={10} step={0.1} value={meshSizeMeters} onChange={(e) => setMeshSizeMeters(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1 text-slate-400">
              <span>Aproveitamento UV: {uvCoveragePct}%</span>
              <input type="range" min={20} max={100} step={5} value={uvCoveragePct} onChange={(e) => setUvCoveragePct(Number(e.target.value))} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 content-center">
            <div className="rounded-xl bg-[#0C1018] border border-slate-800 p-4">
              <div className="text-[11px] text-slate-400">Texel Density (px/cm)</div>
              <div className="text-2xl font-bold text-emerald-300 font-mono">{pxPerCm.toFixed(1)} px/cm</div>
            </div>
            <div className="rounded-xl bg-[#0C1018] border border-slate-800 p-4">
              <div className="text-[11px] text-slate-400">Texel Density (px/m)</div>
              <div className="text-2xl font-bold text-violet-300 font-mono">{Math.round(pxPerMeter)} px/m</div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Seamless Texture Generator */}
      {activeTool === 'seamless_tex' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Seamless Texture Generator</h2>
            <p className="text-xs text-slate-400">
              Transforme qualquer foto/textura em um padrão contínuo (tileable) sem emendas com prévia 3×3 ao vivo.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Carregar Imagem</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMakeSeamless(f);
                }}
              />
            </label>
            {seamlessUrl && (
              <a
                href={seamlessUrl}
                download="AlexDesign_Seamless.png"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Textura Seamless PNG</span>
              </a>
            )}
          </div>
          {seamlessUrl && (
            <div
              className="w-full h-56 rounded-xl border border-slate-700"
              style={{
                backgroundImage: `url(${seamlessUrl})`,
                backgroundSize: '128px 128px',
                backgroundRepeat: 'repeat',
              }}
            />
          )}
          <canvas ref={seamlessCanvasRef} className="hidden" />
        </div>
      )}

      {/* 9. PBR Workflow Converter */}
      {activeTool === 'pbr_converter' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white">PBR Workflow Converter (Spec/Gloss ↔ Metal/Rough)</h2>
            <p className="text-xs text-slate-400">
              Converta mapas Glossiness em Roughness (e vice-versa) por inversão exata de canal.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="flex flex-col gap-1 text-slate-300">
              <span className="flex justify-between">
                <span>Glossiness: {glossValue.toFixed(2)}</span>
                <span className="font-mono text-emerald-300">Roughness: {(1 - glossValue).toFixed(2)}</span>
              </span>
              <input type="range" min={0} max={1} step={0.01} value={glossValue} onChange={(e) => setGlossValue(Number(e.target.value))} />
            </label>
            <div className="flex items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Converter Mapa Gloss → Rough</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleInvertGlossToRough(f);
                  }}
                />
              </label>
              {specUrl && (
                <a href={specUrl} download="Roughness_Converted.png" className="px-3 py-2 rounded-lg bg-emerald-600 text-white font-semibold">
                  Baixar PNG
                </a>
              )}
            </div>
          </div>
          <canvas ref={specCanvasRef} className="hidden" />
        </div>
      )}

      {/* 10. PBR Map Generator / Viewer */}
      {activeTool === 'pbr_materials' && materialContent}

      {/* 11. PBR Albedo & Reflectance Picker */}
      {activeTool === 'albedo_picker' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white">PBR Albedo &amp; Reflectance Picker</h2>
            <p className="text-xs text-slate-400">
              Valores fisicamente calibrados de Albedo e Refletância (F0) para dielétricos e metais reais.
            </p>
          </div>
          <div className="flex items-center gap-4 p-3 rounded-lg bg-[#0C1018] border border-slate-800">
            <span className="w-12 h-12 rounded-lg border border-slate-700 shrink-0" style={{ backgroundColor: selectedAlbedo.hex }} />
            <div className="text-xs">
              <div className="font-bold text-white">{selectedAlbedo.name} ({selectedAlbedo.type})</div>
              <div className="font-mono text-cyan-300">Albedo: {selectedAlbedo.hex} • Reflectance F0: {selectedAlbedo.f0}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {CALIBRATED_ALBEDO.map((sw) => (
              <button
                key={sw.name}
                type="button"
                onClick={() => setSelectedAlbedo(sw)}
                className="flex items-center gap-2 p-2 rounded-lg bg-[#0C1018] border border-slate-800 hover:border-blue-500 text-left cursor-pointer"
              >
                <span className="w-6 h-6 rounded shrink-0 border border-slate-700" style={{ backgroundColor: sw.hex }} />
                <span className="text-[11px] text-slate-200 truncate">{sw.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 12. PBR Channel Packer (ORM) */}
      {activeTool === 'channel_packer' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <h2 className="text-base font-bold text-white">PBR Channel Packer (ORM — R: AO, G: Roughness, B: Metallic)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { label: 'Canal R — Ambient Occlusion', val: ormAoVal, setVal: setOrmAoVal, img: ormAoImg, setImg: setOrmAoImg, color: 'text-rose-400' },
              { label: 'Canal G — Roughness', val: ormRoughVal, setVal: setOrmRoughVal, img: ormRoughImg, setImg: setOrmRoughImg, color: 'text-emerald-400' },
              { label: 'Canal B — Metallic', val: ormMetalVal, setVal: setOrmMetalVal, img: ormMetalImg, setImg: setOrmMetalImg, color: 'text-sky-400' },
            ].map((ch) => (
              <div key={ch.label} className="rounded-lg bg-[#0C1018] border border-slate-800 p-3 flex flex-col gap-2">
                <span className={`text-xs font-semibold ${ch.color}`}>{ch.label}</span>
                <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{ch.img ? 'Carregado ✓' : 'Carregar Mapa'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f, ch.setImg); }} />
                </label>
                <input type="range" min={0} max={255} value={ch.val} onChange={(e) => ch.setVal(Number(e.target.value))} />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <select value={ormSize} onChange={(e) => setOrmSize(Number(e.target.value) as 512 | 1024 | 2048)} className="px-3 py-2 rounded-lg bg-[#0C1018] border border-slate-700 text-xs text-slate-200">
              <option value={512}>512 × 512</option>
              <option value={1024}>1024 × 1024</option>
              <option value={2048}>2048 × 2048</option>
            </select>
            <button type="button" onClick={handlePackOrm} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer">
              <Download className="w-4 h-4" />
              <span>Empacotar e Baixar ORM PNG</span>
            </button>
          </div>
          <canvas ref={ormCanvasRef} className="hidden" />
        </div>
      )}

      {/* 13. Normal Map Combiner */}
      {activeTool === 'normal_combiner' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Normal Map Combiner (Base + Detail UDN Blend)</h2>
            <p className="text-xs text-slate-400">Misture um Normal Map base com um Normal Map de micro-detalhes (pele, tecido, metal escovado).</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer">
              {baseNormalImg ? 'Normal Base ✓' : '1. Carregar Normal Base'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f, setBaseNormalImg); }} />
            </label>
            <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer">
              {detailNormalImg ? 'Normal Detalhe ✓' : '2. Carregar Normal Detalhe'}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) loadImageFile(f, setDetailNormalImg); }} />
            </label>
            <button
              type="button"
              disabled={!baseNormalImg || !detailNormalImg}
              onClick={handleCombineNormals}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer"
            >
              Combinar Normais
            </button>
            {combinedNormalUrl && (
              <a href={combinedNormalUrl} download="NormalMap_Combined.png" className="px-3 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white">
                Baixar PNG
              </a>
            )}
          </div>
          {combinedNormalUrl && <img src={combinedNormalUrl} alt="Combined Normal" className="w-56 h-56 rounded-lg border border-slate-700" />}
          <canvas ref={combineCanvasRef} className="hidden" />
        </div>
      )}

      {/* 14. Normal Map Channel Inverter */}
      {activeTool === 'normal_inverter' && (
        <div className="rounded-xl bg-[#111520] border border-slate-800 p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-white">Normal Map Channel Inverter (DirectX ↔ OpenGL)</h2>
            <p className="text-xs text-slate-400">Inverta o canal Verde (Y) para converter entre DirectX e OpenGL.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Carregar Normal Map</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    loadImageFile(f, (img) => {
                      normalSourceImgRef.current = img;
                      setNormalInverted(true);
                      renderNormalCanvas(img, true);
                    });
                  }
                }}
              />
            </label>
            {normalPreviewUrl && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const next = !normalInverted;
                    setNormalInverted(next);
                    if (normalSourceImgRef.current) renderNormalCanvas(normalSourceImgRef.current, next);
                  }}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
                >
                  Canal Y: {normalInverted ? 'Invertido' : 'Original'}
                </button>
                <a href={normalPreviewUrl} download="NormalMap_Converted.png" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-xs font-semibold text-white">
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PNG</span>
                </a>
              </>
            )}
          </div>
          {normalPreviewUrl && <img src={normalPreviewUrl} alt="Normal Map Preview" className="w-56 h-56 rounded-lg border border-slate-700" />}
          <canvas ref={normalCanvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};
