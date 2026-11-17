import { Component, ReactNode, useRef, useState } from 'react';
import {
  Archive,
  Bone,
  Box,
  Camera,
  Grid,
  Hammer,
  Palette,
  Play,
  RotateCcw,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Upload,
  Workflow,
} from 'lucide-react';
import { DEFAULT_STUDIO_CONFIG, StudioConfig } from './types/studioConfig';
import {
  ImportedUvMesh,
  Viewport3D,
  ViewportSceneConfig,
  ViewportStageKey,
} from './components/Viewport3D';
import { AtlasUvInspector } from './components/AtlasUvInspector';
import { MaterialEcosystemView } from './components/MaterialEcosystemView';
import {
  SubstanceChannelId,
  SubstanceTextureSetRequest,
  SubstanceTextureSlot,
  buildSubstanceSlotsFromGlbTextures,
} from './utils/substanceImporter';

type WorkspaceTab = 'viewport' | 'atlas' | 'ecosystem' | ViewportStageKey;

const NAV_TABS: { id: WorkspaceTab; label: string; mobileLabel: string; icon: ReactNode }[] = [
  { id: 'viewport', label: 'Viewport 3D', mobileLabel: '3D', icon: <Box className="w-4 h-4" /> },
  { id: 'stage1', label: '1. Importar', mobileLabel: '1. Import', icon: <Upload className="w-4 h-4" /> },
  { id: 'stage2', label: '2. Modelagem', mobileLabel: '2. Model', icon: <Box className="w-4 h-4" /> },
  { id: 'stage3', label: '3. Escultura', mobileLabel: '3. Escult', icon: <Hammer className="w-4 h-4" /> },
  { id: 'stage4', label: '4. Retopology', mobileLabel: '4. Retopo', icon: <Grid className="w-4 h-4" /> },
  { id: 'atlas', label: '5. UV Unwrapping', mobileLabel: '5. UV', icon: <Scissors className="w-4 h-4" /> },
  { id: 'ecosystem', label: '6. Material & Texturing', mobileLabel: '6. Mat', icon: <Palette className="w-4 h-4" /> },
  { id: 'stage7', label: '7. Rigging', mobileLabel: '7. Rig', icon: <Bone className="w-4 h-4" /> },
  { id: 'stage8', label: '8. Animação', mobileLabel: '8. Anim', icon: <Play className="w-4 h-4" /> },
  { id: 'stage9', label: '9. Simulação & FX', mobileLabel: '9. FX', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'stage10', label: '10. Luzes & HDRI', mobileLabel: '10. Luz', icon: <Sun className="w-4 h-4" /> },
  { id: 'stage11', label: '11. Pós-FX', mobileLabel: '11. Pós', icon: <SlidersHorizontal className="w-4 h-4" /> },
  { id: 'stage12', label: '12. Geometry Nodes', mobileLabel: '12. Nodes', icon: <Workflow className="w-4 h-4" /> },
  { id: 'stage13', label: '13. Câmera', mobileLabel: '13. Cam', icon: <Camera className="w-4 h-4" /> },
  { id: 'stage14', label: '14. Exportar', mobileLabel: '14. Export', icon: <Archive className="w-4 h-4" /> },
];

interface ErrorBoundaryState {
  errorMessage: string | null;
}

class ViewportErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { errorMessage: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error?.message || 'Erro inesperado no estúdio 3D.' };
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="flex-1 min-h-[360px] flex flex-col items-center justify-center gap-3 bg-[#0D1017] p-6 text-center">
          <div className="text-sm font-semibold text-red-300">Falha ao inicializar o Estúdio 3D</div>
          <div className="max-w-md text-xs text-slate-400">{this.state.errorMessage}</div>
          <button
            type="button"
            onClick={() => this.setState({ errorMessage: null })}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recarregar Viewport</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('viewport');
  const [config, setConfig] = useState<StudioConfig>(DEFAULT_STUDIO_CONFIG);
  const [importedUvs, setImportedUvs] = useState<ImportedUvMesh[] | null>(null);
  const [substanceSlots, setSubstanceSlots] = useState<
    Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>
  >({});
  const [substanceMaterialName, setSubstanceMaterialName] = useState('Substance_Material');
  const [selectedGlbMeshIdx, setSelectedGlbMeshIdx] = useState(0);
  const lastGlbImportSerialRef = useRef<number>(0);

  const [substanceRequest, setSubstanceRequest] = useState<SubstanceTextureSetRequest | null>(null);

  const handleConfigChange = (patch: Partial<StudioConfig> | Partial<ViewportSceneConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleImportedUvsChange = (meshes: ImportedUvMesh[] | null) => {
    setImportedUvs(meshes);
    if (!meshes || meshes.length === 0) {
      if (lastGlbImportSerialRef.current !== 0) {
        lastGlbImportSerialRef.current = 0;
        setSubstanceSlots({});
        setSubstanceMaterialName('Substance_Material');
        setSelectedGlbMeshIdx(0);
      }
      return;
    }

    const first = meshes[0];
    if (
      first.sourceType === 'glb' &&
      first.importSerial &&
      first.importSerial !== lastGlbImportSerialRef.current
    ) {
      lastGlbImportSerialRef.current = first.importSerial;
      const preferredIdx = Math.max(
        0,
        meshes.findIndex(
          (m) =>
            m.textures &&
            Boolean(
              m.textures.baseColor ||
                m.textures.normal ||
                m.textures.roughness ||
                m.textures.metallic ||
                m.textures.ao ||
                m.textures.emissive ||
                m.textures.opacity
            )
        )
      );
      const targetMesh = meshes[preferredIdx];
      const matName = targetMesh.materialName || targetMesh.name || 'GLB_Material';
      setSelectedGlbMeshIdx(preferredIdx);
      setSubstanceMaterialName(matName);
      setSubstanceSlots(buildSubstanceSlotsFromGlbTextures(matName, targetMesh.textures));
    }
  };

  const handleSelectGlbMeshIdx = (idx: number) => {
    const glbMeshes = (importedUvs || []).filter((m) => m.sourceType === 'glb');
    const target = glbMeshes[idx];
    if (!target) return;
    const matName = target.materialName || target.name || 'GLB_Material';
    setSelectedGlbMeshIdx(idx);
    setSubstanceMaterialName(matName);
    setSubstanceSlots(buildSubstanceSlotsFromGlbTextures(matName, target.textures));
  };

  const handleApplySubstanceToViewport = (req: SubstanceTextureSetRequest) => {
    setSubstanceRequest(req);
    setActiveTab('viewport');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#0D1017] text-slate-100">
      {/* Top Bar */}
      <header className="h-12 sm:h-14 px-3 sm:px-4 border-b border-slate-800/90 bg-[#0D1017] flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('viewport');
          }}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Alex<span className="text-orange-500">Design</span>
        </a>

        {/* Full Pipeline Navigation (Desktop & Tablet) */}
        <nav
          aria-label="Navegação principal"
          className="hidden sm:flex flex-1 min-w-0 h-full items-center gap-3 lg:gap-4 overflow-x-auto overflow-y-hidden no-scrollbar"
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative h-full inline-flex items-center text-[11px] lg:text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-orange-500" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Area (Viewport3D remains mounted and is the primary view) */}
      <main
        className={`flex-1 flex flex-col min-h-0 ${
          activeTab !== 'atlas' && activeTab !== 'ecosystem' ? 'overflow-hidden' : 'overflow-y-auto'
        }`}
      >
        <div
          className={
            activeTab !== 'atlas' && activeTab !== 'ecosystem'
              ? 'h-[calc(100dvh-6rem)] sm:h-[calc(100dvh-4rem)] min-h-[360px] flex flex-col'
              : 'hidden'
          }
        >
          <ViewportErrorBoundary>
            <Viewport3D
              config={config}
              onConfigChange={handleConfigChange}
              onImportedUvs={handleImportedUvsChange}
              substanceTextureRequest={substanceRequest}
              onOpenTab={setActiveTab}
              focusedStage={
                activeTab === 'viewport' || activeTab === 'atlas' || activeTab === 'ecosystem'
                  ? null
                  : activeTab
              }
            />
          </ViewportErrorBoundary>
        </div>

        {activeTab === 'atlas' && (
          <div className="pb-14 sm:pb-0">
            <AtlasUvInspector
              config={config}
              onConfigChange={handleConfigChange}
              importedUvs={importedUvs}
            />
          </div>
        )}

        {activeTab === 'ecosystem' && (
          <div className="pb-14 sm:pb-0">
            <MaterialEcosystemView
              config={config}
              importedUvs={importedUvs}
              onApplySubstanceToViewport={handleApplySubstanceToViewport}
              substanceSlots={substanceSlots}
              onSubstanceSlotsChange={setSubstanceSlots}
              substanceMaterialName={substanceMaterialName}
              onSubstanceMaterialNameChange={setSubstanceMaterialName}
              selectedGlbMeshIdx={selectedGlbMeshIdx}
              onSelectGlbMeshIdx={handleSelectGlbMeshIdx}
            />
          </div>
        )}
      </main>

      {/* Mobile Fixed Thumb-Zone Bottom Tab Bar (< 640px, 48px tall, scrollable) */}
      <nav
        aria-label="Navegação móvel do estúdio"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1017]/95 backdrop-blur-md border-t border-slate-800/90 pb-safe"
      >
        <div className="flex items-center gap-1 h-12 px-1.5 overflow-x-auto no-scrollbar">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`h-11 px-2.5 shrink-0 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'text-orange-400 bg-orange-500/10' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium tracking-tight leading-none whitespace-nowrap">
                  {tab.mobileLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
