import { Component, ReactNode, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Archive,
  Bone,
  Box,
  Camera,
  Compass,
  Grid,
  Hammer,
  Palette,
  Play,
  RotateCcw,
  Scissors,
  Search,
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
import { PbrUvHubView } from './components/PbrUvHubView';
import { RadialPieMenu, RadialPieActionId } from './components/RadialPieMenu';
import { SmartCommandPalette, SmartCommandTarget } from './components/SmartCommandPalette';
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
  { id: 'stage2', label: '2. Editar Cena', mobileLabel: '2. Editar', icon: <Box className="w-4 h-4" /> },
  { id: 'stage4', label: '3. Retopology', mobileLabel: '3. Retopo', icon: <Grid className="w-4 h-4" /> },
  { id: 'stage5', label: '4. PBR, UV & HDRI', mobileLabel: '4. PBR', icon: <Palette className="w-4 h-4" /> },
  { id: 'stage7', label: '5. Rigging', mobileLabel: '5. Rig', icon: <Bone className="w-4 h-4" /> },
  { id: 'stage8', label: '6. Animação', mobileLabel: '6. Anim', icon: <Play className="w-4 h-4" /> },
  { id: 'stage9', label: '7. Simulação & Pós-FX', mobileLabel: '7. FX', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'stage12', label: '8. Geometry Nodes', mobileLabel: '8. Nodes', icon: <Workflow className="w-4 h-4" /> },
  { id: 'stage13', label: '9. Câmera', mobileLabel: '9. Cam', icon: <Camera className="w-4 h-4" /> },
  { id: 'stage14', label: '10. Exportar', mobileLabel: '10. Export', icon: <Archive className="w-4 h-4" /> },
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
  const [importedModelFile, setImportedModelFile] = useState<File | null>(null);
  const [pendingImportFiles, setPendingImportFiles] = useState<File[] | null>(null);
  const [config, setConfig] = useState<StudioConfig>(DEFAULT_STUDIO_CONFIG);
  const [importedUvs, setImportedUvs] = useState<ImportedUvMesh[] | null>(null);
  const [substanceSlots, setSubstanceSlots] = useState<
    Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>
  >({});
  const [substanceMaterialName, setSubstanceMaterialName] = useState('Substance_Material');
  const [selectedGlbMeshIdx, setSelectedGlbMeshIdx] = useState(0);
  const lastGlbImportSerialRef = useRef<number>(0);

  const [substanceRequest, setSubstanceRequest] = useState<SubstanceTextureSetRequest | null>(null);
  const [pieOpen, setPieOpen] = useState(false);
  const [piePos, setPiePos] = useState({ x: 360, y: 260 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alexdesign_high_contrast') === '1';
    } catch {
      return false;
    }
  });
  const [largeText, setLargeText] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alexdesign_large_text') === '1';
    } catch {
      return false;
    }
  });
  const [recentTargets, setRecentTargets] = useState<SmartCommandTarget[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('alexdesign_recent_targets') || '[]');
      return Array.isArray(saved) ? saved.slice(0, 4) : [];
    } catch {
      return [];
    }
  });
  const pointerPosRef = useRef({ x: 360, y: 260 });

  const handleSelectWorkspaceTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    if (tab !== 'atlas' && tab !== 'ecosystem') {
      setRecentTargets((prev) => {
        const next = [tab, ...prev.filter((t) => t !== tab)].slice(0, 4);
        try {
          localStorage.setItem('alexdesign_recent_targets', JSON.stringify(next));
        } catch {
          // ignore storage quota errors
        }
        return next;
      });
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('alexdesign_high_contrast', highContrast ? '1' : '0');
    } catch {
      // ignore
    }
  }, [highContrast]);

  useEffect(() => {
    try {
      localStorage.setItem('alexdesign_large_text', largeText ? '1' : '0');
    } catch {
      // ignore
    }
  }, [largeText]);
  const headerRef = useRef<HTMLElement>(null);
  const hubContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!headerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.gsap-nav-item',
        { y: -8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.36, stagger: 0.028, ease: 'power2.out', clearProps: 'transform' }
      );
    }, headerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if ((activeTab !== 'atlas' && activeTab !== 'ecosystem') || !hubContainerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        hubContainerRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.34, ease: 'power3.out', clearProps: 'transform' }
      );
    }, hubContainerRef);
    return () => ctx.revert();
  }, [activeTab]);

  useEffect(() => {
    const onPointerMove = (e: MouseEvent) => {
      pointerPosRef.current = { x: e.clientX, y: e.clientY };
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setPiePos({
          x: Math.min(Math.max(pointerPosRef.current.x, 160), window.innerWidth - 160),
          y: Math.min(Math.max(pointerPosRef.current.y, 160), window.innerHeight - 160),
        });
        setPieOpen((prev) => !prev);
      }
    };
    window.addEventListener('mousemove', onPointerMove, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

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
    <div
      className={`min-h-dvh flex flex-col bg-[#0D1017] text-slate-100 ${
        highContrast ? 'contrast-125' : ''
      } ${largeText ? 'text-[15px]' : ''}`}
    >
      {/* Top Bar */}
      <header
        ref={headerRef}
        className="h-12 sm:h-14 px-3 sm:px-4 border-b border-slate-800/90 bg-[#0D1017] flex items-center gap-3 sm:gap-4 shrink-0"
      >
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

        {/* Clean Unified Studio Navigation */}
        <nav
          aria-label="Navegação principal"
          className="hidden sm:flex flex-1 min-w-0 h-full items-center gap-4"
        >
          <button
            type="button"
            onClick={() => setActiveTab('viewport')}
            className="gsap-nav-item relative h-full inline-flex items-center gap-1.5 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Box className="w-3.5 h-3.5 text-orange-400" />
            <span>Viewport 3D Studio</span>
            <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-orange-500" />
          </button>
        </nav>

        {/* Semantic Search & Adaptive Accessibility Trigger (Ctrl+K) */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          title="Busca Semântica e Acessibilidade (Ctrl+K)"
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white text-[11px] font-medium transition-colors shrink-0 cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden md:inline">Busca IA</span>
          <kbd className="hidden sm:inline text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400">
            Ctrl+K
          </kbd>
        </button>

        {/* Quick Radial Pie Menu Trigger */}
        <button
          type="button"
          onClick={() => {
            setPiePos({
              x: Math.round(window.innerWidth / 2),
              y: Math.round(window.innerHeight / 2),
            });
            setPieOpen((prev) => !prev);
          }}
          title="Menu Radial Rápido (Espaço)"
          className={`hidden sm:inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
            pieOpen
              ? 'border-orange-500/70 bg-orange-500/15 text-orange-300'
              : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white'
          }`}
        >
          <Compass className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden lg:inline">Menu Radial</span>
          <kbd className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-800 text-slate-400">
            Espaço
          </kbd>
        </button>
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
              onImportedModelFile={setImportedModelFile}
              pendingImportFiles={pendingImportFiles}
              onConsumedPendingImport={() => setPendingImportFiles(null)}
              focusedStage={
                activeTab === 'viewport' || activeTab === 'atlas' || activeTab === 'ecosystem'
                  ? null
                  : activeTab
              }
            />
          </ViewportErrorBoundary>
        </div>

        {(activeTab === 'atlas' || activeTab === 'ecosystem') && (
          <div ref={hubContainerRef} className="pb-14 sm:pb-0">
            <PbrUvHubView
              key={activeTab}
              importedUvs={importedUvs}
              syncedModelFile={importedModelFile}
              onImportFileToViewport={(file) => {
                setImportedModelFile(file);
                setPendingImportFiles([file]);
              }}
              onOpenViewport={() => setActiveTab('viewport')}
              initialTool={activeTab === 'ecosystem' ? 'pbr_materials' : 'model_inspector'}
              atlasContent={
                <AtlasUvInspector
                  config={config}
                  onConfigChange={handleConfigChange}
                  importedUvs={importedUvs}
                />
              }
              materialContent={
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
              }
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

      <RadialPieMenu
        open={pieOpen}
        position={piePos}
        activeTab={activeTab}
        onSelect={(id: RadialPieActionId) => handleSelectWorkspaceTab(id)}
        onClose={() => setPieOpen(false)}
      />

      <SmartCommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(target) => handleSelectWorkspaceTab(target)}
        highContrast={highContrast}
        onToggleHighContrast={() => setHighContrast((v) => !v)}
        largeText={largeText}
        onToggleLargeText={() => setLargeText((v) => !v)}
        recentTargets={recentTargets}
      />
    </div>
  );
}
