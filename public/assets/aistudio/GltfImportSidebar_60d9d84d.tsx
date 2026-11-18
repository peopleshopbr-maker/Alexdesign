import { Bone, Check, Crosshair, Download, Eye, EyeOff, Layers, Pin, Play, RotateCcw, Trash2, Upload, Wand2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import type { AutoRigPreset, LodTelemetry, RigExportProfile } from '../types/graphics';

interface GltfImportSidebarProps {
  lodTelemetry: LodTelemetry;
  autoRigOnImport: boolean;
  showBones: boolean;
  jointMarkersActive: boolean;
  jointMarkerSymmetry: boolean;
  exportProfile: RigExportProfile;
  startupModelName: string | null;
  onToggleAutoRigOnImport: () => void;
  onToggleShowBones: () => void;
  onUploadFile: (file: File) => void;
  onAutoRigLoaded: (rigType: AutoRigPreset) => void;
  onStartJointMarkers: () => void;
  onCommitJointMarkers: () => void;
  onCancelJointMarkers: () => void;
  onToggleJointMarkerSymmetry: () => void;
  onChangeExportProfile: (profile: RigExportProfile) => void;
  onInsertRiggedHumanoid: () => void;
  onGoToAnimation: () => void;
  onExportGlb: (profile?: RigExportProfile) => void;
  onPinStartupModel: () => void;
  onClearStartupModel: () => void;
  onResetLodAssembly: () => void;
  onClose: () => void;
}

const EXPORT_PROFILES: Array<{ id: RigExportProfile; label: string }> = [
  { id: 'standard', label: 'Padrão' },
  { id: 'mixamo', label: 'Mixamo' },
  { id: 'ue5', label: 'Unreal UE5' },
  { id: 'unity', label: 'Unity' },
  { id: 'godot', label: 'Godot' },
];

export function GltfImportSidebar({
  lodTelemetry,
  autoRigOnImport,
  showBones,
  jointMarkersActive,
  jointMarkerSymmetry,
  exportProfile,
  startupModelName,
  onToggleAutoRigOnImport,
  onToggleShowBones,
  onUploadFile,
  onAutoRigLoaded,
  onStartJointMarkers,
  onCommitJointMarkers,
  onCancelJointMarkers,
  onToggleJointMarkerSymmetry,
  onChangeExportProfile,
  onInsertRiggedHumanoid,
  onGoToAnimation,
  onExportGlb,
  onPinStartupModel,
  onClearStartupModel,
  onResetLodAssembly,
  onClose,
}: GltfImportSidebarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const meshCountDisplay = lodTelemetry.loadedModelName
    ? lodTelemetry.loadedMeshCount
    : lodTelemetry.totalLodNodes;

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    onUploadFile(file);
  };

  return (
    <aside
      aria-label="Importação de Modelos GLB, GLTF e ZIP"
      className="fixed top-20 left-[68px] bottom-20 z-20 w-[332px] max-w-[calc(100vw-5rem)] overflow-y-auto bg-[#101521]/95 border border-white/12 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5"
    >
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center shrink-0">
          <Upload className="w-4 h-4 text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold tracking-wide text-white uppercase">
              Importar GLB / GLTF
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-mono tabular-nums text-sky-300 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-md whitespace-nowrap">
                {meshCountDisplay} malha(s)
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar painel"
                title="Recolher painel"
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Traga malhas do <span className="text-slate-200">Blender</span> (`.glb`, `.gltf`, `.zip`) e aplique Auto-Rigging estilo ActionForge.
          </p>
        </div>
      </div>

      {/* Dropzone Interativa */}
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf,.zip"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`w-full rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center text-center gap-2 cursor-pointer ${
          dragActive
            ? 'bg-sky-500/15 border-sky-400 text-white'
            : 'bg-[#090c13] hover:bg-[#0e1420] border-white/15 hover:border-sky-400/50 text-slate-200'
        }`}
      >
        <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center">
          <Upload className="w-4 h-4 text-sky-400" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-white">
            Clique ou Arraste .GLB / .GLTF / .ZIP
          </span>
          <span className="text-[11px] text-slate-400">
            Persistente em todos os modos do estúdio
          </span>
        </div>
      </button>

      {/* Opção Auto-Rigging ao importar malha sem ossos */}
      <button
        type="button"
        aria-pressed={autoRigOnImport}
        onClick={onToggleAutoRigOnImport}
        className={`w-full h-8 px-3 text-[11px] font-medium rounded-lg border flex items-center justify-between cursor-pointer ${
          autoRigOnImport
            ? 'bg-sky-500/15 text-sky-200 border-sky-400/45'
            : 'bg-[#090c13] text-slate-300 border-white/10 hover:text-white'
        }`}
      >
        <span className="flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Auto-Rigging se malha vier sem ossos</span>
        </span>
        <span className="font-mono text-[10px]">{autoRigOnImport ? 'ON' : 'OFF'}</span>
      </button>

      {/* Ações para Modelo Carregado ou Array LOD */}
      {lodTelemetry.loadedModelName ? (
        <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="text-[11px] text-slate-400 block">Modelo Ativo</span>
              <span className="text-xs font-semibold text-white truncate block">
                {lodTelemetry.loadedModelName}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span
                className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md border ${
                  lodTelemetry.boneCount > 0
                    ? 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30'
                    : 'text-amber-300 bg-amber-500/15 border-amber-400/30'
                }`}
              >
                {lodTelemetry.boneCount > 0 ? `${lodTelemetry.boneCount} ossos` : 'Sem ossos'}
              </span>
            </div>
          </div>

          {/* Ossos & Auto-Rigging */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-pressed={showBones}
              disabled={lodTelemetry.boneCount === 0}
              onClick={onToggleShowBones}
              className={`h-8 px-2 text-[11px] font-medium rounded-lg border flex items-center justify-center gap-1.5 ${
                lodTelemetry.boneCount === 0
                  ? 'bg-[#0b0f17] text-slate-600 border-white/5 cursor-not-allowed'
                  : showBones
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/55 cursor-pointer'
                    : 'bg-[#121826] text-slate-300 border-white/10 hover:text-white cursor-pointer'
              }`}
            >
              {showBones ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showBones ? 'Ocultar Ossos' : 'Mostrar Ossos'}</span>
            </button>
            <button
              type="button"
              onClick={() => onAutoRigLoaded('biped')}
              className="h-8 px-2 text-[11px] font-medium rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5 shrink-0" />
              <span>Auto-Rig Bípede</span>
            </button>
          </div>

          {/* Marcadores de Rigging (ActionForge Style) */}
          {jointMarkersActive ? (
            <div className="rounded-lg bg-sky-500/10 border border-sky-400/35 p-2 flex flex-col gap-2">
              <span className="text-[11px] text-sky-200 leading-snug">
                Clique e arraste as esferas na malha para posicionar cada junta antes de gerar os ossos.
              </span>
              <button
                type="button"
                aria-pressed={jointMarkerSymmetry}
                onClick={onToggleJointMarkerSymmetry}
                className={`h-7 px-2 text-[11px] font-medium rounded-md border flex items-center justify-between cursor-pointer ${
                  jointMarkerSymmetry
                    ? 'bg-sky-500/20 text-sky-100 border-sky-400/45'
                    : 'bg-[#121826] text-slate-300 border-white/10'
                }`}
              >
                <span>Simetria E/D nos Marcadores</span>
                <span className="font-mono text-[10px]">{jointMarkerSymmetry ? 'ON' : 'OFF'}</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={onCommitJointMarkers}
                  className="h-8 px-2 text-[11px] font-semibold rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Gerar Skeleton</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelJointMarkers}
                  className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-300 border border-white/10 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onStartJointMarkers}
              className="w-full h-8 px-2.5 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-sky-200 border border-sky-400/30 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-sky-400" />
              <span>Rig Manual com Marcadores 3D</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onAutoRigLoaded('flex_spine')}
            className="w-full h-7 px-2.5 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-300 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bone className="w-3 h-3 text-sky-400" />
            <span>Auto-Rig Espinha Articulada (5 Ossos)</span>
          </button>

          <button
            type="button"
            onClick={onGoToAnimation}
            className="w-full h-9 px-3 text-xs font-semibold rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Animar &amp; Usar Comandos (IK / FK / Camadas)</span>
          </button>

          {/* Perfil de Esqueleto para Exportação */}
          <div className="flex flex-col gap-1 pt-1 border-t border-white/8">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">
              Perfil de Ossos (Exportação Engine)
            </span>
            <div className="grid grid-cols-5 gap-1">
              {EXPORT_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChangeExportProfile(p.id)}
                  className={`h-7 px-1 text-[10px] font-medium rounded-md border cursor-pointer truncate ${
                    exportProfile === p.id
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                      : 'bg-[#121826] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => onExportGlb(exportProfile)}
              className="h-8 px-2.5 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Exportar .GLB</span>
            </button>
            <button
              type="button"
              onClick={onResetLodAssembly}
              className="h-8 px-2.5 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Restaurar LOD</span>
            </button>
          </div>

          <div className="pt-1 border-t border-white/8 flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPinStartupModel}
              className={`flex-1 h-8 px-2.5 text-[11px] font-medium rounded-lg border flex items-center justify-center gap-1.5 cursor-pointer ${
                startupModelName === lodTelemetry.loadedModelName
                  ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/45'
                  : 'bg-[#121826] hover:bg-[#192235] text-sky-200 border-sky-400/30'
              }`}
            >
              <Pin className="w-3.5 h-3.5 shrink-0" />
              <span>
                {startupModelName === lodTelemetry.loadedModelName
                  ? 'Modelo Inicial Ativo'
                  : 'Fixar como Inicial'}
              </span>
            </button>
            {startupModelName && (
              <button
                type="button"
                title="Remover modelo salvo ao iniciar"
                onClick={onClearStartupModel}
                className="h-8 px-2 text-[11px] rounded-lg bg-[#121826] hover:bg-rose-500/15 text-slate-300 hover:text-rose-200 border border-white/10 flex items-center justify-center cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Layers className="w-3.5 h-3.5 text-sky-400" />
            <span>Exemplo Multi-LOD Ativo</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-[#121826] border border-white/8 py-1.5 px-1">
              <span className="text-[10px] text-slate-400 block">LOD0 (Alta)</span>
              <span className="text-xs font-mono tabular-nums text-sky-300">
                {lodTelemetry.lod0Count}
              </span>
            </div>
            <div className="rounded-lg bg-[#121826] border border-white/8 py-1.5 px-1">
              <span className="text-[10px] text-slate-400 block">LOD1 (Média)</span>
              <span className="text-xs font-mono tabular-nums text-emerald-300">
                {lodTelemetry.lod1Count}
              </span>
            </div>
            <div className="rounded-lg bg-[#121826] border border-white/8 py-1.5 px-1">
              <span className="text-[10px] text-slate-400 block">LOD2 (Baixa)</span>
              <span className="text-xs font-mono tabular-nums text-amber-300">
                {lodTelemetry.lod2Count}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onInsertRiggedHumanoid}
            className="w-full h-9 px-3 text-xs font-semibold rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Bone className="w-3.5 h-3.5" />
            <span>Inserir Malha com Ossos (19 Ossos)</span>
          </button>

          <button
            type="button"
            onClick={() => onExportGlb()}
            className="w-full h-8 px-3 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-sky-400" />
            <span>Gerar .GLB de Exemplo para Teste</span>
          </button>
        </div>
      )}
    </aside>
  );
}
