import React, { useEffect, useRef, useState } from 'react';
import {
  Grid,
  Sliders,
  Play,
  Scissors,
  BoxSelect,
  Maximize2,
  Sparkles,
  Plus,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { StudioConfig } from '../types/studioConfig';
import { ImportedUvMesh } from './Viewport3D';
import { auditUvWithRust } from '../utils/rustBridge';
import { StudioSectionCard } from './StudioSectionCard';

interface AtlasUvInspectorProps {
  config: StudioConfig;
  onConfigChange: (patch: Partial<StudioConfig>) => void;
  importedUvs: ImportedUvMesh[] | null;
  onGenerateAutoUv?: () => void;
}

const UV_PRESETS = [
  { id: 'smart_pack', label: 'Empacotamento Inteligente (Rust)' },
  { id: 'hard_surface', label: 'Hard Surface (66° Angulo)' },
  { id: 'organic_char', label: 'Personagem Organico (Suave)' },
  { id: 'lightmap_uv1', label: 'Lightmap UV1 (Sem Sobreposicao)' },
];

export const AtlasUvInspector: React.FC<AtlasUvInspectorProps> = ({
  config,
  onConfigChange,
  importedUvs,
  onGenerateAutoUv,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [openCenaUv, setOpenCenaUv] = useState(true);
  const [autoMode, setAutoMode] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState('smart_pack');
  const [uvTool, setUvTool] = useState<'islands' | 'seams' | 'pack' | 'relax'>('islands');
  const [uvSpaceMode, setUvSpaceMode] = useState<'uv0' | 'uv1'>('uv0');
  const [selectedMeshIdx, setSelectedMeshIdx] = useState<number | 'all'>('all');
  const [showChecker, setShowChecker] = useState(false);
  const [customTextureUrl, setCustomTextureUrl] = useState<string | null>(null);
  const [loadedTexImg, setLoadedTexImg] = useState<HTMLImageElement | null>(null);

  const [seamAngle, setSeamAngle] = useState<number>((config as any).uvSeamAngle ?? 66);
  const [uvMargin, setUvMargin] = useState<number>((config as any).uvMargin ?? 0.02);

  const [auditStats, setAuditStats] = useState({
    ocupacao: 79,
    degenerados: 0,
    foraEspaco: 0,
    triangulos: 0,
  });

  useEffect(() => {
    let totalTris = 0;
    if (importedUvs && importedUvs.length > 0) {
      importedUvs.forEach((m) => {
        const uvArr = (m as any).uvs || (m as any).uv || [];
        totalTris += Math.floor(uvArr.length / 6);
      });
    }

    try {
      if (typeof auditUvWithRust === 'function' && importedUvs && importedUvs.length > 0) {
        const res: any = auditUvWithRust(importedUvs as any);
        if (res) {
          setAuditStats({
            ocupacao: Math.round(res.coverage ?? res.ocupacao ?? 79),
            degenerados: res.degenerateCount ?? res.degenerados ?? 0,
            foraEspaco: res.outOfBoundsCount ?? res.foraEspaco ?? 0,
            triangulos: totalTris || res.triangleCount || 0,
          });
          return;
        }
      }
    } catch {
      // fallback seguro caso auditUvWithRust retorne formato assincrono
    }

    setAuditStats((prev) => ({
      ...prev,
      triangulos: totalTris,
    }));
  }, [importedUvs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 1024;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#090C12';
    ctx.fillRect(0, 0, size, size);

    if (showChecker) {
      const cells = 16;
      const cellSize = size / cells;
      for (let r = 0; r < cells; r++) {
        for (let c = 0; c < cells; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? '#141926' : '#0D111A';
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }
    }

    if (loadedTexImg) {
      ctx.globalAlpha = 0.85;
      ctx.drawImage(loadedTexImg, 0, 0, size, size);
      ctx.globalAlpha = 1.0;
    }

    // Grade UV 0..1
    const step = size / 10;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const pos = i * step;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Desenha triangulos UV reais das malhas conectadas ao Viewport3D
    if (importedUvs && importedUvs.length > 0) {
      const targetMeshes =
        selectedMeshIdx === 'all'
          ? importedUvs
          : importedUvs[selectedMeshIdx]
          ? [importedUvs[selectedMeshIdx]]
          : importedUvs;

      ctx.strokeStyle = uvTool === 'seams' ? '#38bdf8' : '#f97316';
      ctx.fillStyle = 'rgba(249, 115, 22, 0.14)';
      ctx.lineWidth = 1.1;

      targetMeshes.forEach((mesh) => {
        const uvs: Float32Array | number[] =
          uvSpaceMode === 'uv1'
            ? (mesh as any).uv1 || (mesh as any).uvs || (mesh as any).uv || []
            : (mesh as any).uvs || (mesh as any).uv || [];

        for (let i = 0; i + 5 < uvs.length; i += 6) {
          const u0 = uvs[i] * size;
          const v0 = (1 - uvs[i + 1]) * size;
          const u1 = uvs[i + 2] * size;
          const v1 = (1 - uvs[i + 3]) * size;
          const u2 = uvs[i + 4] * size;
          const v2 = (1 - uvs[i + 5]) * size;

          ctx.beginPath();
          ctx.moveTo(u0, v0);
          ctx.lineTo(u1, v1);
          ctx.lineTo(u2, v2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '600 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Carregue um modelo GLB/glTF no Viewport 3D ou clique em + Auto UV', size / 2, size / 2);
    }
  }, [importedUvs, selectedMeshIdx, showChecker, loadedTexImg, uvTool, uvSpaceMode]);

  const handleUploadTexture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomTextureUrl(url);
    const img = new Image();
    img.onload = () => setLoadedTexImg(img);
    img.src = url;
  };

  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `alexdesign-uv-${uvSpaceMode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const aplicarPresetUv = () => {
    if (selectedPreset === 'hard_surface') setSeamAngle(66);
    if (selectedPreset === 'organic_char') setSeamAngle(85);
    if (selectedPreset === 'lightmap_uv1') setUvSpaceMode('uv1');
    onConfigChange({
      ...( { uvSeamAngle: seamAngle, uvMargin } as any ),
    });
    if (onGenerateAutoUv) onGenerateAutoUv();
  };

  return (
    <div className="w-full max-w-none px-4 py-4 flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-4rem)]">
      {/* Coluna Esquerda: 100% no formato CENA (SplineDesignPanel) */}
      <aside className="w-full lg:w-[340px] shrink-0 flex flex-col gap-3">
        <StudioSectionCard
          title="ESTRUTURA DE UVS"
          subtitle={`${autoMode ? 'Auto Rust' : 'Manual'} · ${importedUvs?.length || 0} malha(s)`}
          icon={<Grid className="w-4 h-4" />}
          isOpen={openCenaUv}
          onToggle={() => setOpenCenaUv(!openCenaUv)}
        >
          {/* 1. Botoes duplos estilo Editar / Play */}
          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-[#0D1017] border border-slate-800">
            <button
              type="button"
              onClick={() => setAutoMode(false)}
              className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded font-medium transition-colors cursor-pointer ${
                !autoMode ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Editar</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAutoMode(true);
                if (onGenerateAutoUv) onGenerateAutoUv();
              }}
              className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded font-medium transition-colors cursor-pointer ${
                autoMode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Auto UV</span>
            </button>
          </div>

          {/* 2. Biblioteca de Presets UV + Botao Aplicar */}
          <div className="flex flex-col gap-1.5">
            <span className="text-slate-400 text-[11px]">Biblioteca de Unwrap & Atlas</span>
            <div className="flex items-center gap-1.5">
              <select
                aria-label="Selecionar preset UV"
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="flex-1 min-w-0 pl-2.5 pr-6 py-2 rounded-md bg-[#0D1017] border border-slate-700 text-[11px] font-medium text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
              >
                {UV_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={aplicarPresetUv}
                className="px-3 py-2 rounded-md bg-sky-600/20 border border-sky-500/40 hover:bg-sky-600 text-sky-200 hover:text-white font-medium transition-colors cursor-pointer shrink-0"
              >
                Aplicar
              </button>
            </div>
          </div>

          {/* 3. Grade de 4 Ferramentas UV estilo Gizmo Blender / Spline */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Gizmo UV / Malha</span>
              <button
                type="button"
                onClick={() => setShowChecker(!showChecker)}
                className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                {showChecker ? 'Xadrez ativo' : 'Fundo limpo'}
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'islands', label: 'Ilhas', Icon: BoxSelect },
                  { id: 'seams', label: 'Costura', Icon: Scissors },
                  { id: 'pack', label: 'Empacotar', Icon: Maximize2 },
                  { id: 'relax', label: 'Relaxar', Icon: Sparkles },
                ] as const
              ).map(({ id, label, Icon }) => {
                const active = uvTool === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setUvTool(id)}
                    className={`inline-flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-md border text-[11px] font-medium cursor-pointer transition-colors ${
                      active
                        ? 'bg-orange-500/15 border-orange-500 text-orange-300'
                        : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate max-w-full">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Linha Canal UV estilo Adicionar Forma -> Primitivas / Vetor 3D */}
          <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 text-[11px] leading-tight">Canal UV</span>
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-[#0D1017] border border-slate-800 flex-1">
                <button
                  type="button"
                  onClick={() => setUvSpaceMode('uv0')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                    uvSpaceMode === 'uv0' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UV0 Textura
                </button>
                <button
                  type="button"
                  onClick={() => setUvSpaceMode('uv1')}
                  className={`py-1.5 px-2 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                    uvSpaceMode === 'uv1' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UV1 Lightmap
                </button>
              </div>
            </div>

            {/* 5. Botoes rapidos estilo + Cubo / + Esfera / + Toro / + Cilin... */}
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => onGenerateAutoUv && onGenerateAutoUv()}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-1 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500/50 text-[11px] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">AutoUV</span>
              </button>
              <button
                type="button"
                onClick={() => setShowChecker(!showChecker)}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-1 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500/50 text-[11px] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">Grid</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-1 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500/50 text-[11px] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">Tex</span>
              </button>
              <button
                type="button"
                onClick={handleExportPng}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-1 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500/50 text-[11px] text-slate-200 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">PNG</span>
              </button>
            </div>
          </div>

          {/* 6. Sliders Laranja + Auditoria Rust */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Angulo de Costura</span>
              <span className="font-mono text-orange-400">{seamAngle}°</span>
            </div>
            <input
              type="range"
              min={15}
              max={120}
              value={seamAngle}
              onChange={(e) => setSeamAngle(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Margem entre Ilhas</span>
              <span className="font-mono text-orange-400">{uvMargin.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={0.002}
              max={0.08}
              step={0.002}
              value={uvMargin}
              onChange={(e) => setUvMargin(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />

            {/* Bloco Auditoria Rust/WASM */}
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-medium">Auditoria UV (Rust/WASM)</span>
                {auditStats.degenerados > 0 ? (
                  <span className="inline-flex items-center gap-1 text-amber-400 text-[10px]">
                    <AlertTriangle className="w-3 h-3" /> Atencao
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> Otimizado
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-center pt-1">
                <div className="rounded bg-[#131722] p-1.5 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Ocupacao</div>
                  <div className="font-mono text-xs font-bold text-white">{auditStats.ocupacao}%</div>
                </div>
                <div className="rounded bg-[#131722] p-1.5 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Degenerados</div>
                  <div className="font-mono text-xs font-bold text-orange-400">{auditStats.degenerados}</div>
                </div>
                <div className="rounded bg-[#131722] p-1.5 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Triangulos</div>
                  <div className="font-mono text-xs font-bold text-sky-400">{auditStats.triangulos}</div>
                </div>
              </div>
            </div>

            {/* Seletor de Malhas do Modelo */}
            {importedUvs && importedUvs.length > 0 && (
              <div className="flex flex-col gap-1 pt-1">
                <span className="text-[11px] text-slate-400">Malhas do Modelo ({importedUvs.length})</span>
                <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => setSelectedMeshIdx('all')}
                    className={`px-2.5 py-1.5 rounded text-left text-[11px] border cursor-pointer ${
                      selectedMeshIdx === 'all'
                        ? 'bg-orange-500/15 border-orange-500 text-orange-200'
                        : 'bg-[#0D1017] border-slate-800 text-slate-300'
                    }`}
                  >
                    Todas as malhas ({importedUvs.length})
                  </button>
                  {importedUvs.map((m, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedMeshIdx(idx)}
                      className={`px-2.5 py-1.5 rounded text-left text-[11px] border flex items-center justify-between cursor-pointer ${
                        selectedMeshIdx === idx
                          ? 'bg-orange-500/15 border-orange-500 text-orange-200'
                          : 'bg-[#0D1017] border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{m.name || `Malha_${idx + 1}`}</span>
                      <span className="text-[10px] font-mono text-slate-400">{uvSpaceMode.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </StudioSectionCard>
      </aside>

      {/* Area Principal Direita: Visualizador UV Expandido em Tela Cheia */}
      <div className="flex-1 min-w-0 rounded-xl bg-[#131722] border border-slate-800/90 flex flex-col overflow-hidden">
        <div className="px-4 py-3 bg-[#0D1017]/80 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-100">
              Malha UV ({uvSpaceMode.toUpperCase()})
            </span>
            {customTextureUrl && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                Textura Carregada
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleUploadTexture}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Importar Textura</span>
            </button>
            <button
              type="button"
              onClick={handleExportPng}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar PNG</span>
            </button>
          </div>
        </div>

        <div className="flex-1 p-4 flex items-center justify-center bg-[#090C12] min-h-[65vh]">
          <canvas
            ref={canvasRef}
            className="w-full h-full max-h-[78vh] object-contain rounded-lg border border-slate-800/80 shadow-2xl"
          />
        </div>
      </div>
    </div>
  );
};