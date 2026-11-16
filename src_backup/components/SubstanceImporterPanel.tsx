import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  CheckCircle2,
  FileCode2,
  FolderOpen,
  FolderUp,
  Layers,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  SUBSTANCE_CHANNEL_META,
  SubstanceChannelId,
  SubstanceTextureSetRequest,
  SubstanceTextureSlot,
  exportSubstanceBundleForBlenderZip,
  extractSubstanceFiles,
  generateBlenderSubstanceImporterAddonPy,
} from '../utils/substanceImporter';

interface SubstanceImporterPanelProps {
  onApplyToViewport: (req: SubstanceTextureSetRequest) => void;
}

type ImporterMode = 'auto' | 'manual';

export const SubstanceImporterPanel: React.FC<SubstanceImporterPanelProps> = ({
  onApplyToViewport,
}) => {
  const [mode, setMode] = useState<ImporterMode>('auto');
  const [materialName, setMaterialName] = useState('Substance_Material');
  const [slots, setSlots] = useState<Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>>({});
  const [normalDirectXToOpenGL, setNormalDirectXToOpenGL] = useState(false);
  const [useBumpConversion, setUseBumpConversion] = useState(true);
  const [uvScale, setUvScale] = useState(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [unmatchedFiles, setUnmatchedFiles] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTargetChannel, setActiveTargetChannel] = useState<SubstanceChannelId>('baseColor');

  const multiInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const slotInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const loadedCount = Object.values(slots).filter(Boolean).length;
  const totalChannels = SUBSTANCE_CHANNEL_META.length;

  const buildRequest = (): SubstanceTextureSetRequest => ({
    materialName: materialName.trim() || 'Substance_Material',
    slots,
    normalDirectXToOpenGL,
    useBumpConversion,
    uvScale,
    nonce: Date.now(),
  });

  const handleBulkFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    try {
      const result = await extractSubstanceFiles(files);
      if (Object.keys(result.slots).length === 0 && result.unmatchedFiles.length === 0) {
        setErrorMsg('Nenhum arquivo .png, .jpg, .webp ou .zip válido encontrado.');
        return;
      }
      setSlots((prev) => ({ ...prev, ...result.slots }));
      if (result.materialName) setMaterialName(result.materialName);
      if (result.isDirectXNormal) setNormalDirectXToOpenGL(true);
      setUnmatchedFiles(result.unmatchedFiles);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar texturas.');
    }
  };

  const handleSingleSlotUpload = async (channel: SubstanceChannelId, file: File) => {
    setErrorMsg(null);
    if (!/\.(png|jpe?g|webp)$/i.test(file.name)) {
      setErrorMsg('Formato inválido. Envie PNG, JPG ou WEBP para o canal.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setSlots((prev) => ({
        ...prev,
        [channel]: {
          channel,
          fileName: file.name,
          dataUrl: String(reader.result),
        },
      }));
    };
    reader.onerror = () => setErrorMsg('Falha ao ler arquivo selecionado.');
    reader.readAsDataURL(file);
  };

  const handleClearSlot = (channel: SubstanceChannelId) => {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[channel];
      return next;
    });
  };

  const handleResetAll = () => {
    setSlots({});
    setUnmatchedFiles([]);
    setErrorMsg(null);
    setMaterialName('Substance_Material');
    setNormalDirectXToOpenGL(false);
    setUseBumpConversion(true);
    setUvScale(1.0);
  };

  const handleApplyToViewport = () => {
    if (loadedCount === 0) return;
    onApplyToViewport(buildRequest());
  };

  const handleExportBlenderZip = async () => {
    if (loadedCount === 0 || isExportingZip) return;
    setErrorMsg(null);
    setIsExportingZip(true);
    try {
      const req = buildRequest();
      const zipBlob = await exportSubstanceBundleForBlenderZip(req);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      const safeName = req.materialName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Substance_Material';
      a.href = url;
      a.download = `${safeName}_Blender5_PBR.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao gerar pacote Blender.');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleDownloadBlenderAddon = () => {
    const pyCode = generateBlenderSubstanceImporterAddonPy();
    const blob = new Blob([pyCode], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'substance_textures_importer.py';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-xl bg-[#141923] border border-slate-800 p-6 flex flex-col gap-6">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-600/15 border border-orange-500/30 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Substance Textures Importer · Blender 5.3+
            </h2>
            <p className="text-xs text-slate-400">
              Detecta sufixos Substance, UDIMs e mapas ORM/ARM, aplica na Viewport 3D e exporta para Principled BSDF.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center p-1 rounded-lg bg-[#0D1017] border border-slate-800">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'auto' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Automático (Pasta / ZIP)
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                mode === 'manual' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Manual por Canal
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadBlenderAddon}
            title="Baixar script add-on compatível com Blender 4.2 - 5.3+"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-orange-500 text-xs font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileCode2 className="w-3.5 h-3.5 text-orange-400" />
            <span>Add-on Blender 5.3+ (.py)</span>
          </button>
        </div>
      </div>

      {/* Main Tool Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {mode === 'auto' && (
            <div className="flex flex-col gap-2">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files?.length) {
                    handleBulkFiles(e.dataTransfer.files);
                  }
                }}
                onClick={() => multiInputRef.current?.click()}
                className={`rounded-xl border border-dashed p-5 text-center transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
                  isDragging
                    ? 'border-orange-400 bg-orange-500/10'
                    : 'border-slate-700 bg-[#0D1017] hover:border-slate-500'
                }`}
              >
                <FolderUp className="w-6 h-6 text-orange-400" />
                <div className="text-xs font-semibold text-white">
                  Arraste texturas ou .ZIP aqui
                </div>
                <div className="text-[11px] text-slate-400">
                  PNG, JPG, WEBP, ORM/ARM empacotado ou .ZIP Substance
                </div>
              </div>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-orange-500 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <FolderOpen className="w-3.5 h-3.5 text-orange-400" />
                <span>Selecionar Pasta de Texturas</span>
              </button>
            </div>
          )}

          {/* Material Name & Node Settings */}
          <div className="rounded-xl bg-[#0D1017] border border-slate-800 p-4 flex flex-col gap-3.5 text-xs">
            <label className="flex flex-col gap-1.5">
              <span className="text-slate-400 font-medium">Nome do Material</span>
              <input
                type="text"
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="Substance_Material"
                className="w-full px-3 py-2 rounded-lg bg-[#141923] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-orange-500"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="flex justify-between text-slate-400">
                <span>Escala UV (Mapping)</span>
                <span className="font-mono text-orange-400 tabular-nums">{uvScale.toFixed(1)}x</span>
              </span>
              <input
                type="range"
                min={0.5}
                max={8.0}
                step={0.5}
                value={uvScale}
                onChange={(e) => setUvScale(Number(e.target.value))}
              />
            </label>

            <label className="flex items-center justify-between gap-3 pt-1 cursor-pointer">
              <span className="text-slate-300">DirectX (Y-) → OpenGL (Y+)</span>
              <input
                type="checkbox"
                checked={normalDirectXToOpenGL}
                onChange={(e) => setNormalDirectXToOpenGL(e.target.checked)}
                className="accent-orange-500 w-4 h-4 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="text-slate-300">Converter Height / Bump</span>
              <input
                type="checkbox"
                checked={useBumpConversion}
                onChange={(e) => setUseBumpConversion(e.target.checked)}
                className="accent-orange-500 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-950/50 border border-red-700/60 px-3 py-2 text-xs text-red-200">
              {errorMsg}
            </div>
          )}

          {unmatchedFiles.length > 0 && (
            <div className="rounded-lg bg-amber-950/40 border border-amber-700/50 px-3 py-2 text-[11px] text-amber-200">
              Arquivos sem sufixo reconhecido ({unmatchedFiles.length}):{' '}
              <span className="font-mono">{unmatchedFiles.slice(0, 3).join(', ')}</span>. Atribua manualmente nos slots ao lado.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={loadedCount === 0}
                onClick={handleApplyToViewport}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Aplicar na Viewport 3D ({loadedCount}/{totalChannels})
                </span>
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                title="Limpar canais"
                className="p-2.5 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              disabled={loadedCount === 0 || isExportingZip}
              onClick={handleExportBlenderZip}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-orange-500 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              <Archive className="w-3.5 h-3.5 text-orange-400" />
              <span>
                {isExportingZip
                  ? 'Empacotando ZIP...'
                  : 'Exportar Pacote Blender 5.3+ (.zip)'}
              </span>
            </button>
          </div>
        </div>

        {/* Right 8-Channel Principled BSDF Slot Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {SUBSTANCE_CHANNEL_META.map((ch) => {
            const slot = slots[ch.id];
            return (
              <div
                key={ch.id}
                className="rounded-xl bg-[#0D1017] border border-slate-800 p-3 flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{ch.label}</div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {ch.colorSpace} · {ch.bsdfInput}
                    </div>
                  </div>
                  {slot && (
                    <button
                      type="button"
                      onClick={() => handleClearSlot(ch.id)}
                      title={`Remover ${ch.label}`}
                      className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="w-full h-24 rounded-lg border border-slate-800 bg-[#141923] overflow-hidden flex items-center justify-center">
                  {slot ? (
                    <img
                      src={slot.dataUrl}
                      alt={ch.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[11px] font-mono text-slate-500 px-2 text-center">
                      {ch.suffixHint}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 mt-auto">
                  <span className="text-[11px] font-mono text-slate-400 truncate">
                    {slot ? slot.fileName : 'Vazio'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTargetChannel(ch.id);
                      slotInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-orange-500 text-[11px] font-medium text-slate-200 hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Upload className="w-3 h-3 text-orange-400" />
                    <span>{slot ? 'Trocar' : 'Selecionar'}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Live Blender 5.3+ & WebGL Shader Node Status Card */}
          <div className="rounded-xl bg-[#0D1017] border border-slate-800 p-3 flex flex-col justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-white">
                Grafo Principled BSDF (5.3+)
              </div>
              <div className="mt-1.5 flex flex-col gap-1 text-[11px] font-mono text-slate-400">
                <div className="flex justify-between">
                  <span>Material:</span>
                  <span className="text-slate-200 truncate max-w-[120px]">{materialName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Canais ativos:</span>
                  <span className="text-orange-400 tabular-nums">
                    {loadedCount} / {totalChannels}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Normal:</span>
                  <span className="text-slate-200">
                    {normalDirectXToOpenGL ? 'DirectX -> GL' : 'OpenGL (Y+)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>UV Mapping:</span>
                  <span className="text-slate-200 tabular-nums">{uvScale.toFixed(1)}x</span>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
              Pronto p/ Viewport 3D e Blender 5.3+
            </div>
          </div>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={multiInputRef}
        type="file"
        multiple
        accept=".png,.jpg,.jpeg,.webp,.zip"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleBulkFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) handleBulkFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <input
        ref={slotInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSingleSlotUpload(activeTargetChannel, f);
          e.target.value = '';
        }}
      />
    </section>
  );
};
