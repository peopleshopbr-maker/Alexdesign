import { Component, ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Archive,
  ChevronDown,
  ChevronUp,
  Home,
  Redo2,
  RotateCcw,
  Search,
  Undo2,
  Upload,
} from 'lucide-react';
import { DEFAULT_STUDIO_CONFIG, StudioConfig } from './types/studioConfig';
import {
  THREE_POINT_PRESET,
  Viewport3D,
  ViewportGlobalActions,
  ViewportSceneConfig,
  ViewportStageKey,
  ViewportStatusSnapshot,
} from './components/Viewport3D';
import { INSPECTOR_TABS, findInspectorTab } from './components/InspectorTabs';
import { RigAnimationPage } from './components/RigAnimationPage';
import { LightingStudioPage, StudioLightingState } from './components/LightingStudioPage';
import { PublishExportPage } from './components/PublishExportPage';
import { GuideActionTarget, PipelineGuide } from './components/PipelineGuide';
import { SceneVariablesState, VariablesNotesPage } from './components/VariablesNotesPage';
import { SmartCommandPalette, SmartCommandTarget } from './components/SmartCommandPalette';
import { WelcomeLandingPage } from './components/WelcomeLandingPage';
import { PropertiesTabId } from './components/OutlinerPropertiesDock';
import { useStudioIntelligence } from './context/StudioIntelligenceContext';
import { GltfAuditReport } from './utils/gltfVerifier';
import { DEFAULT_VARIABLE_BINDINGS, VariableBindingRule } from './utils/reactiveShaders';

export type WorkspacePageTab =
  | 'home'
  | 'viewport'
  | 'rigging'
  | 'lighting'
  | 'studio_notes'
  | 'guide'
  | 'export'
  | ViewportStageKey;

type UnifiedWorkspaceChipId =
  | 'rig_keyframes'
  | 'blender_3d'
  | 'pbr'
  | 'autorig_audit'
  | 'motion_lab'
  | 'mograph'
  | 'lighting_hdri'
  | 'spline_3d';

interface ErrorBoundaryState {
  errorMessage: string | null;
}

class ViewportErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { errorMessage: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error?.message || 'Erro inesperado no estÃºdio 3D.' };
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="flex-1 min-h-[360px] flex flex-col items-center justify-center gap-3 bg-[#0D1017] p-6 text-center">
          <div className="text-sm font-semibold text-red-300">Falha ao inicializar o EstÃºdio 3D</div>
          <div className="max-w-md text-xs text-[#635B54]">{this.state.errorMessage}</div>
          <button
            type="button"
            onClick={() => this.setState({ errorMessage: null })}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer"
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

const DEFAULT_LIGHTING_STATE: StudioLightingState = {
  activeHdri: 'room',
  envIntensity: 1.05,
  bgAsEnvironment: false,
  envBlur: 0.15,
  lights: THREE_POINT_PRESET,
  toneMapping: 'agx',
  exposure: 1.05,
  shadowsEnabled: true,
  resolution: '1920x1080',
  transparentBg: false,
  bloomEnabled: false,
  bloomStrength: 0.45,
  bloomThreshold: 0.78,
  dofEnabled: false,
  dofFocus: 2.8,
  dofAperture: 0.00025,
  motionBlurEnabled: false,
  motionBlurDamp: 0.72,
};

const UNIFIED_WORKSPACE_LINKS: { id: UnifiedWorkspaceChipId; label: string }[] = [
  { id: 'rig_keyframes', label: 'Viewport Rig & Keyframes' },
  { id: 'blender_3d', label: 'Viewport 3D & Blender 5.3' },
  { id: 'pbr', label: 'Ecossistema PBR' },
  { id: 'autorig_audit', label: 'Auto-Rig & Auditoria' },
  { id: 'motion_lab', label: 'Motion Lab' },
  { id: 'mograph', label: 'MoGraph' },
  { id: 'lighting_hdri', label: 'Luz & HDRI' },
  { id: 'spline_3d', label: 'Spline 3D' },
];

const RIGHT_DOCK_TITLES: Partial<Record<WorkspacePageTab, string>> = {
  rigging: 'Rig & Anim (ActionForge)',
  lighting: 'Luz & Render 4K',
  studio_notes: 'VariÃ¡veis & Notas (MoGraph)',
  guide: 'Fluxo de Trabalho 3D',
  export: 'Exportar Blender (API Atual) / GLB / PNG',
};

function isRightDockTab(tab: WorkspacePageTab): boolean {
  return (
    tab === 'rigging' ||
    tab === 'lighting' ||
    tab === 'studio_notes' ||
    tab === 'guide' ||
    tab === 'export'
  );
}

export default function App() {
  const { stats } = useStudioIntelligence();
  const [activeTab, setActiveTab] = useState<WorkspacePageTab>(() =>
    typeof window !== 'undefined' && /^#clip=/i.test(window.location.hash) ? 'stage12' : 'home'
  );
  const [activeUnifiedChip, setActiveUnifiedChip] =
    useState<UnifiedWorkspaceChipId>('spline_3d');
  const [pendingImportFiles, setPendingImportFiles] = useState<File[] | null>(null);
  const globalActionsRef = useRef<ViewportGlobalActions | null>(null);
  const pendingPostMountActionRef = useRef<(() => void) | null>(null);
  const homeFileInputRef = useRef<HTMLInputElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [bottomDockOpen, setBottomDockOpen] = useState(true);
  const [bottomDockExpanded, setBottomDockExpanded] = useState(false);

  const isHubTab = isRightDockTab(activeTab);
  const inspectorStage: ViewportStageKey | null = isHubTab
    ? null
    : activeTab === 'viewport' || activeTab === 'home'
    ? 'stage2'
    : (activeTab as ViewportStageKey);

  const [config, setConfig] = useState<StudioConfig>(DEFAULT_STUDIO_CONFIG);
  const [lightingState, setLightingState] = useState<StudioLightingState>(DEFAULT_LIGHTING_STATE);
  const [viewportStatus, setViewportStatus] = useState<ViewportStatusSnapshot>({
    clipNames: [],
    activeClipIdx: 0,
    activeClipId: 'chest_open',
    isPlaying: false,
    animLoop: true,
    animSpeed: 1,
    animProgress: 0,
    animDuration: 0,
    animInPoint: 0,
    animOutPoint: 1,
    mirrorClip: false,
    reverseClip: false,
    inPlaceClip: false,
    clayShading: false,
    autoKey: false,
    interpolationMode: 'ease',
    hasCopiedKeyframe: false,
    showSkeleton: false,
    showRigMarkers: false,
    markerSymmetry: true,
    ikEnabled: false,
    floorContactEnabled: true,
    weightPaintActive: false,
    weightBrushMode: 'add',
    weightBrushRadius: 0.24,
    weightBrushStrength: 0.65,
    morphTargets: [],
    riggedBoneNames: [],
    selectedBoneName: null,
    strips: [],
    overlayClipId: '',
    overlayMask: 'upper',
    overlayWeight: 0.7,
    postureOffsets: { spineBendDeg: 0, pelvisHeight: 0, armSpreadDeg: 0 },
    activeClipTracks: [],
    hdriLoading: false,
    customHdriName: null,
    isRendering: false,
    showGrid: true,
    canUndo: false,
    canRedo: false,
    emitters: [],
    selectedEmitterId: null,
  });
  const [auditReport, setAuditReport] = useState<GltfAuditReport | null>(null);
  const [sceneVars, setSceneVars] = useState<SceneVariablesState>({
    rotationSpeed: 1.0,
    globalScale: 1.0,
    showGrid: true,
    wireframe: false,
    highlightColor: '#f97316',
  });
  const [variableBindings, setVariableBindings] = useState<VariableBindingRule[]>(
    DEFAULT_VARIABLE_BINDINGS
  );

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
      return Array.isArray(saved)
        ? saved.filter((t): t is SmartCommandTarget => typeof t === 'string' && t !== 'ecosystem').slice(0, 4)
        : [];
    } catch {
      return [];
    }
  });

  const runWhenViewportReady = useCallback((fn: () => void) => {
    if (globalActionsRef.current) {
      fn();
    } else {
      pendingPostMountActionRef.current = fn;
    }
  }, []);

  const handleSelectWorkspaceTab = useCallback(
    (tab: WorkspacePageTab | SmartCommandTarget) => {
      const pushRecent = (target: SmartCommandTarget) => {
        setRecentTargets((prev) => {
          const next = [target, ...prev.filter((t) => t !== target)].slice(0, 4);
          try {
            localStorage.setItem('alexdesign_recent_targets', JSON.stringify(next));
          } catch {
            // ignore storage errors
          }
          return next;
        });
      };

      if (tab === 'html3d') {
        setActiveUnifiedChip('spline_3d');
        setActiveTab('viewport');
        pushRecent('html3d');
        runWhenViewportReady(() => {
          globalActionsRef.current?.setRightPropTab('scene');
          globalActionsRef.current?.openHtmlTo3d();
        });
        return;
      }
      if (tab === 'reference') {
        setActiveUnifiedChip('blender_3d');
        setActiveTab('viewport');
        pushRecent('reference');
        runWhenViewportReady(() => globalActionsRef.current?.openReferenceImport());
        return;
      }
      if (tab === 'stage1') {
        setActiveUnifiedChip('blender_3d');
        setActiveTab('viewport');
        pushRecent('stage1');
        runWhenViewportReady(() => globalActionsRef.current?.importModel());
        return;
      }
      if (tab === 'stage14') {
        setActiveTab('export');
        setBottomDockOpen(true);
        pushRecent('stage14');
        return;
      }

      if (tab === 'rigging') setActiveUnifiedChip('autorig_audit');
      else if (tab === 'lighting') setActiveUnifiedChip('lighting_hdri');
      else if (tab === 'studio_notes') setActiveUnifiedChip('mograph');
      else if (tab === 'stage12' || tab === 'stage9' || tab === 'stage13') {
        setActiveUnifiedChip('rig_keyframes');
      } else if (tab === 'stage3' || tab === 'stage4') {
        setActiveUnifiedChip('pbr');
      } else if (tab === 'viewport') {
        setActiveUnifiedChip('blender_3d');
      }

      setActiveTab(tab);
      setBottomDockOpen(true);
      if (tab !== 'home') {
        pushRecent(tab as SmartCommandTarget);
      }
    },
    [runWhenViewportReady]
  );

  const handleSelectUnifiedChip = useCallback(
    (chip: UnifiedWorkspaceChipId) => {
      setActiveUnifiedChip(chip);
      switch (chip) {
        case 'rig_keyframes':
          setActiveTab('stage12');
          runWhenViewportReady(() => {
            globalActionsRef.current?.setTimelineDocked(true);
            globalActionsRef.current?.setRightPropTab('rig');
          });
          break;
        case 'blender_3d':
          setActiveTab('viewport');
          runWhenViewportReady(() => {
            globalActionsRef.current?.setRightPropTab('transform');
          });
          break;
        case 'pbr':
          setActiveTab('stage3');
          runWhenViewportReady(() => {
            globalActionsRef.current?.setRightPropTab('material');
          });
          break;
        case 'autorig_audit':
          setActiveTab('rigging');
          setBottomDockOpen(true);
          runWhenViewportReady(() => {
            globalActionsRef.current?.setRightPropTab('rig');
            const rep = globalActionsRef.current?.auditCurrentScene() ?? null;
            if (rep) setAuditReport(rep);
          });
          break;
        case 'motion_lab':
          setActiveTab('rigging');
          setBottomDockOpen(true);
          runWhenViewportReady(() => {
            globalActionsRef.current?.setRightPropTab('rig');
          });
          break;
        case 'mograph':
          setActiveTab('studio_notes');
          setBottomDockOpen(true);
          runWhenViewportReady(() => {
            globalActionsRef.current?.setRightPropTab('vfx');
          });
          break;
        case 'lighting_hdri':
          setActiveTab('lighting');
          setBottomDockOpen(true);
          runWhenViewportReady(() => {
            globalActionsRef.current?.setRightPropTab('lighting');
          });
          break;
        case 'spline_3d':
          setActiveTab('viewport');
          runWhenViewportReady(() => {
            globalActionsRef.current?.setRightPropTab('scene');
          });
          break;
      }
    },
    [runWhenViewportReady]
  );

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
        { y: 0, opacity: 1, duration: 0.32, stagger: 0.022, ease: 'power2.out', clearProps: 'transform' }
      );
    }, headerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      if (/^#clip=/i.test(window.location.hash)) {
        setActiveTab((prev) => (prev === 'rigging' ? 'rigging' : 'stage12'));
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!isHubTab || !hubContainerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        hubContainerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.28, ease: 'power3.out', clearProps: 'transform' }
      );
    }, hubContainerRef);
    return () => ctx.revert();
  }, [activeTab, isHubTab]);

  useEffect(() => {
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
        if (e.repeat) return;
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleConfigChange = useCallback(
    (patch: Partial<StudioConfig> | Partial<ViewportSceneConfig>) => {
      setConfig((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const handleLightingChange = useCallback((patch: Partial<StudioLightingState>) => {
    setLightingState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleImportedUvsChange = useCallback(() => {}, []);

  const handleConsumedPendingImport = useCallback(() => {
    setPendingImportFiles(null);
  }, []);

  const handleImportedModelFile = useCallback(() => {}, []);

  const handleRegisterGlobalActions = useCallback((a: ViewportGlobalActions) => {
    globalActionsRef.current = a;
    if (pendingPostMountActionRef.current) {
      const fn = pendingPostMountActionRef.current;
      pendingPostMountActionRef.current = null;
      window.setTimeout(fn, 0);
    }
  }, []);

  const handleStatusSnapshot = useCallback((snap: ViewportStatusSnapshot) => {
    setViewportStatus(snap);
    setSceneVars((prev) =>
      prev.rotationSpeed === snap.animSpeed && prev.showGrid === snap.showGrid
        ? prev
        : { ...prev, rotationSpeed: snap.animSpeed, showGrid: snap.showGrid }
    );
  }, []);

  const handleWireframeChange = useCallback((wf: boolean) => {
    setWireframe(wf);
    setSceneVars((prev) => (prev.wireframe === wf ? prev : { ...prev, wireframe: wf }));
  }, []);

  const handleRunSceneAudit = useCallback(() => {
    const rep = globalActionsRef.current?.auditCurrentScene() ?? null;
    if (rep) setAuditReport(rep);
  }, []);

  const handleGuideTarget = (target: GuideActionTarget) => {
    if (target === 'import') {
      setActiveTab('viewport');
      globalActionsRef.current?.importModel();
    } else {
      handleSelectWorkspaceTab(target);
    }
  };

  return (
    <div
      className={`h-dvh overflow-hidden flex flex-col bg-[#0D1017] text-[#231F1D] ${
        highContrast ? 'contrast-125' : ''
      } ${largeText ? 'text-[15px]' : ''}`}
    >
      {/* Unified Studio Top Bar */}
      <header
        ref={headerRef}
        className="h-12 sm:h-14 px-3 sm:px-4 border-b border-[#231F1D]/15/90 bg-[#0D1017] flex items-center gap-2 sm:gap-3 shrink-0"
      >
        <div className="gsap-nav-item flex items-center gap-2 shrink-0 mr-1 sm:mr-2">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('home');
            }}
            className="inline-flex items-center gap-1.5 font-display text-base sm:text-lg font-bold tracking-tight text-[#231F1D] whitespace-nowrap"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="w-5 h-5 shrink-0"
              fill="none"
            >
              <path
                d="M12 3L4.5 20h3.2l1.6-3.8h5.4L16.3 20h3.2L12 3zm-1.4 10.2L12 9.6l1.4 3.6h-2.8z"
                fill="#f97316"
              />
            </svg>
            <span>
              Alex<span className="text-orange-500">Design</span>
            </span>
          </a>
          <span className="hidden xl:inline text-[11px] font-mono text-[#635B54] truncate max-w-[170px]">
            {activeTab === 'home' ? 'PÃ¡gina Inicial' : stats.activeAssetName}
          </span>
        </div>

        <div className="gsap-nav-item flex items-center gap-0.5 shrink-0" role="group" aria-label="HistÃ³rico">
          <button
            type="button"
            disabled={activeTab === 'home' || !viewportStatus.canUndo}
            onClick={() => globalActionsRef.current?.undo()}
            title="Desfazer (Ctrl+Z)"
            aria-label="Desfazer"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-300 hover:text-[#231F1D] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={activeTab === 'home' || !viewportStatus.canRedo}
            onClick={() => globalActionsRef.current?.redo()}
            title="Refazer (Ctrl+Shift+Z)"
            aria-label="Refazer"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-300 hover:text-[#231F1D] hover:bg-[#FAF8F5] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-w-0" />

        <input
          ref={homeFileInputRef}
          type="file"
          multiple
          accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => {
            const list = e.target.files ? Array.from(e.target.files) : [];
            e.target.value = '';
            if (list.length > 0) {
              setPendingImportFiles(list);
              setActiveUnifiedChip('blender_3d');
              setActiveTab('viewport');
            }
          }}
        />

        <button
          type="button"
          onClick={() => {
            if (activeTab === 'home') {
              homeFileInputRef.current?.click();
            } else {
              globalActionsRef.current?.importModel();
            }
          }}
          title="Importar modelo .glb ou .gltf"
          className="gsap-nav-item inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#231F1D]/15 bg-[#EDE6DA]/70 text-slate-200 hover:border-slate-600 hover:text-[#231F1D] text-[11px] font-medium shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Upload className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Importar</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          title="Buscar ferramentas e pÃ¡ginas (Ctrl+K)"
          className="gsap-nav-item inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#231F1D]/15 bg-[#EDE6DA]/70 text-slate-300 hover:border-slate-700 hover:text-[#231F1D] text-[11px] font-medium transition-colors shrink-0 cursor-pointer whitespace-nowrap"
        >
          <Search className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden lg:inline">Buscar</span>
          <kbd className="hidden xl:inline text-[9px] font-mono px-1 py-0.5 rounded bg-[#FAF8F5] text-[#635B54]">
            Ctrl+K
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => handleSelectWorkspaceTab('export')}
          className={`gsap-nav-item inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[#231F1D] text-xs font-semibold shrink-0 cursor-pointer whitespace-nowrap ${
            activeTab === 'export'
              ? 'bg-orange-500 ring-2 ring-orange-400/50'
              : 'bg-orange-600 hover:bg-orange-500'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Exportar</span>
        </button>
      </header>

      {/* STUDIO UNIFICADO Quick Workspace Links Bar (PÃ¡gina 2) */}
      {activeTab !== 'home' && (
        <nav
          aria-label="Links do Studio Unificado"
          className="px-3 py-1.5 border-b border-[#231F1D]/15/90 bg-[#0A0D12] flex items-center justify-between gap-2 shrink-0"
        >
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar min-w-0">
            <span className="px-2 py-1 rounded-md bg-[#FAF8F5]/90 text-[10px] font-bold tracking-wider text-slate-200 uppercase whitespace-nowrap shrink-0">
              STUDIO UNIFICADO
            </span>
            {UNIFIED_WORKSPACE_LINKS.map((chip) => {
              const active = activeUnifiedChip === chip.id && activeTab !== 'export';
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleSelectUnifiedChip(chip.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    active
                      ? 'bg-slate-100 text-slate-950 font-semibold shadow-sm'
                      : 'text-[#635B54] hover:text-[#231F1D] hover:bg-[#FAF8F5]/70'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              globalActionsRef.current = null;
              setActiveTab('home');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-700/80 bg-[#141923] hover:border-slate-500 text-[11px] font-medium text-slate-200 hover:text-[#231F1D] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Home className="w-3 h-3 text-orange-400" />
            <span>Tela Inicial</span>
          </button>
        </nav>
      )}

      {/* Main Content Area: PÃ¡gina 1 (Welcome) OR PÃ¡gina 2 (Persistent 3D Engine + Contextual Dock) */}
      <main className="relative flex-1 flex flex-col min-h-0 overflow-hidden pb-12 sm:pb-0">
        {activeTab === 'home' ? (
          <WelcomeLandingPage
            onImportFiles={(files) => {
              setPendingImportFiles(files);
              setActiveUnifiedChip('blender_3d');
              setActiveTab('viewport');
            }}
            onLoadSampleRig={() => {
              setActiveUnifiedChip('rig_keyframes');
              setActiveTab('stage12');
              pendingPostMountActionRef.current = () => {
                globalActionsRef.current?.setTimelineDocked(true);
                globalActionsRef.current?.setRightPropTab('rig');
              };
            }}
            onOpenHtmlTo3d={() => {
              setActiveUnifiedChip('spline_3d');
              setActiveTab('viewport');
              pendingPostMountActionRef.current = () => {
                globalActionsRef.current?.setRightPropTab('scene');
                globalActionsRef.current?.openHtmlTo3d();
              };
            }}
            onOpenFullStudio={() => {
              setActiveUnifiedChip('spline_3d');
              setActiveTab('viewport');
              pendingPostMountActionRef.current = () => {
                globalActionsRef.current?.setRightPropTab('scene');
              };
            }}
          />
        ) : (
          <>
            {/* Live 3D Viewport Engine (permanently visible above commands on every tab) */}
            <div className="relative flex-1 min-w-0 min-h-[240px] flex flex-col">
              <ViewportErrorBoundary>
                <Viewport3D
                  config={config}
                  onConfigChange={handleConfigChange}
                  lightingState={lightingState}
                  onLightingChange={handleLightingChange}
                  onImportedUvs={handleImportedUvsChange}
                  substanceTextureRequest={null}
                  onOpenTab={handleSelectWorkspaceTab}
                  onImportedModelFile={handleImportedModelFile}
                  pendingImportFiles={pendingImportFiles}
                  onConsumedPendingImport={handleConsumedPendingImport}
                  focusedStage={inspectorStage}
                  activeWorkspaceTab={activeTab}
                  variableBindings={variableBindings}
                  hideRightInspector={false}
                  onRegisterGlobalActions={handleRegisterGlobalActions}
                  onWireframeChange={handleWireframeChange}
                  onStatusSnapshot={handleStatusSnapshot}
                />
              </ViewportErrorBoundary>
            </div>

        {/* Bottom Contextual Tab Commands Panel Docked Directly Below the 3D Scene */}
        {isHubTab &&
          (bottomDockOpen ? (
            <section
              ref={hubContainerRef}
              aria-label={RIGHT_DOCK_TITLES[activeTab] || 'Comandos da aba ativa'}
              className={`w-full ${
                bottomDockExpanded ? 'h-[58vh] min-h-[300px]' : 'h-[43vh] min-h-[250px]'
              } border-t border-[#231F1D]/15 bg-[#111622] flex flex-col shrink-0 min-h-0`}
            >
              <div className="px-3 py-1.5 border-b border-[#231F1D]/15 bg-[#0F131B] flex items-center justify-between gap-2 shrink-0">
                <span className="text-xs font-semibold text-[#231F1D] truncate">
                  {RIGHT_DOCK_TITLES[activeTab] || 'Comandos'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setBottomDockExpanded((v) => !v)}
                    title={bottomDockExpanded ? 'Altura padrÃ£o' : 'Expandir Ã¡rea de comandos'}
                    className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-[#FAF8F5]/80 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-[#231F1D] cursor-pointer whitespace-nowrap"
                  >
                    {bottomDockExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-orange-400" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5 text-orange-400" />
                    )}
                    <span>{bottomDockExpanded ? 'Tamanho PadrÃ£o' : 'Expandir Comandos'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBottomDockOpen(false)}
                    title="Recolher comandos abaixo da cena"
                    className="w-7 h-7 rounded-md hover:bg-[#FAF8F5] text-[#635B54] hover:text-[#231F1D] flex items-center justify-center cursor-pointer"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {activeTab === 'rigging' && (
                <RigAnimationPage
                  config={config}
                  onConfigChange={handleConfigChange}
                  assetName={stats.activeAssetName}
                  meshCount={stats.meshes}
                  boneCount={stats.bones}
                  riggedBoneNames={viewportStatus.riggedBoneNames}
                  selectedBoneName={viewportStatus.selectedBoneName}
                  showSkeleton={viewportStatus.showSkeleton}
                  onToggleSkeleton={() => globalActionsRef.current?.toggleSkeleton()}
                  showRigMarkers={viewportStatus.showRigMarkers}
                  onToggleRigMarkers={() => globalActionsRef.current?.toggleRigMarkers()}
                  markerSymmetry={viewportStatus.markerSymmetry}
                  onToggleMarkerSymmetry={() => globalActionsRef.current?.toggleMarkerSymmetry()}
                  ikEnabled={viewportStatus.ikEnabled}
                  onToggleIk={() => globalActionsRef.current?.toggleIk()}
                  floorContactEnabled={viewportStatus.floorContactEnabled}
                  onToggleFloorContact={() => globalActionsRef.current?.toggleFloorContact()}
                  weightPaintActive={viewportStatus.weightPaintActive}
                  onToggleWeightPaint={() =>
                    globalActionsRef.current?.setWeightPaintActive(!viewportStatus.weightPaintActive)
                  }
                  weightBrushMode={viewportStatus.weightBrushMode}
                  onChangeWeightBrushMode={(m) => globalActionsRef.current?.setWeightBrushMode(m)}
                  weightBrushRadius={viewportStatus.weightBrushRadius}
                  onChangeWeightBrushRadius={(r) => globalActionsRef.current?.setWeightBrushRadius(r)}
                  weightBrushStrength={viewportStatus.weightBrushStrength}
                  onChangeWeightBrushStrength={(s) =>
                    globalActionsRef.current?.setWeightBrushStrength(s)
                  }
                  morphTargets={viewportStatus.morphTargets}
                  onChangeMorphTarget={(meshId, index, value) =>
                    globalActionsRef.current?.setMorphTargetValue(meshId, index, value)
                  }
                  clipNames={viewportStatus.clipNames}
                  activeClipIdx={viewportStatus.activeClipIdx}
                  activeClipId={viewportStatus.activeClipId}
                  isPlaying={viewportStatus.isPlaying}
                  animLoop={viewportStatus.animLoop}
                  animSpeed={viewportStatus.animSpeed}
                  animProgress={viewportStatus.animProgress}
                  animDuration={viewportStatus.animDuration}
                  animInPoint={viewportStatus.animInPoint}
                  animOutPoint={viewportStatus.animOutPoint}
                  mirrorClip={viewportStatus.mirrorClip}
                  reverseClip={viewportStatus.reverseClip}
                  inPlaceClip={viewportStatus.inPlaceClip}
                  clayShading={viewportStatus.clayShading}
                  autoKey={viewportStatus.autoKey}
                  interpolationMode={viewportStatus.interpolationMode}
                  hasCopiedKeyframe={viewportStatus.hasCopiedKeyframe}
                  strips={viewportStatus.strips}
                  overlayClipId={viewportStatus.overlayClipId}
                  overlayMask={viewportStatus.overlayMask}
                  overlayWeight={viewportStatus.overlayWeight}
                  postureOffsets={viewportStatus.postureOffsets}
                  activeClipTracks={viewportStatus.activeClipTracks}
                  onRunAutoRig={(preset) => globalActionsRef.current?.runAutoRig(preset)}
                  onResetPose={() => globalActionsRef.current?.resetPose()}
                  onRemoveRig={() => globalActionsRef.current?.removeRig()}
                  onSelectBone={(boneName) => globalActionsRef.current?.selectBoneForPose(boneName)}
                  onSelectClipById={(clipId) => globalActionsRef.current?.selectClip(clipId)}
                  onTogglePlay={() => globalActionsRef.current?.togglePlay()}
                  onStopAnimation={() => globalActionsRef.current?.stopAnimation()}
                  onStepFrame={(deltaFrames) => globalActionsRef.current?.stepFrame(deltaFrames)}
                  onSeekNormalized={(pct) => globalActionsRef.current?.seekNormalized(pct)}
                  onSetPlayRange={(inPct, outPct) => globalActionsRef.current?.setPlayRange(inPct, outPct)}
                  onResetPlayRange={() => globalActionsRef.current?.resetPlayRange()}
                  onToggleLoop={() => globalActionsRef.current?.toggleLoop()}
                  onChangeSpeed={(speed) => globalActionsRef.current?.setAnimSpeed(speed)}
                  onToggleMirror={() => globalActionsRef.current?.toggleMirrorClip()}
                  onToggleReverse={() => globalActionsRef.current?.toggleReverseClip()}
                  onToggleInPlace={() => globalActionsRef.current?.toggleInPlaceClip()}
                  onToggleClayShading={() => globalActionsRef.current?.toggleClayShading()}
                  onToggleAutoKey={() => globalActionsRef.current?.toggleAutoKey()}
                  onChangeInterpolationMode={(mode) =>
                    globalActionsRef.current?.setInterpolationMode(mode)
                  }
                  onUpdateStrips={(next) => globalActionsRef.current?.setStrips(next)}
                  onSetOverlayLayer={(clipId, mask, weight) =>
                    globalActionsRef.current?.setOverlayLayer(clipId, mask, weight)
                  }
                  onUpdatePostureOffsets={(patch) =>
                    globalActionsRef.current?.setPostureOffsets(patch)
                  }
                  onAddBoneKeyframe={() => globalActionsRef.current?.addBoneKeyframe()}
                  onCopyKeyframe={() => globalActionsRef.current?.copyKeyframe()}
                  onPasteKeyframe={() => globalActionsRef.current?.pasteKeyframe()}
                  onDeleteKeyframe={() => globalActionsRef.current?.deleteKeyframe()}
                  onMoveKeyframe={(trackName, oldTime, newTime) =>
                    globalActionsRef.current?.moveKeyframe(trackName, oldTime, newTime)
                  }
                  onCopyClipLink={(clipId) => globalActionsRef.current?.copyClipLink(clipId)}
                  onImportAnimationFile={() => globalActionsRef.current?.importAnimationFile()}
                  onBakeIkPhysics={() => globalActionsRef.current?.bakeIkPhysics()}
                  onExportGlb={() => globalActionsRef.current?.exportModel('glb')}
                  onExportRestPoseGlb={() => globalActionsRef.current?.exportModel('glb', false)}
                  onOpenViewport={() => setActiveTab('viewport')}
                />
              )}

              {activeTab === 'lighting' && (
                <LightingStudioPage
                  assetName={stats.activeAssetName}
                  lighting={lightingState}
                  onLightingChange={handleLightingChange}
                  onApplyThreePointPreset={() =>
                    handleLightingChange({ lights: THREE_POINT_PRESET })
                  }
                  onUploadHdriClick={() => globalActionsRef.current?.uploadHdri()}
                  hdriLoading={viewportStatus.hdriLoading}
                  customHdriName={viewportStatus.customHdriName}
                  onRenderPng={() => globalActionsRef.current?.renderPng()}
                  isRendering={viewportStatus.isRendering}
                  onOpenViewport={() => setActiveTab('viewport')}
                />
              )}

              {activeTab === 'studio_notes' && (
                <VariablesNotesPage
                  assetName={stats.activeAssetName}
                  variables={sceneVars}
                  bindings={variableBindings}
                  onUpdateVariables={(patch) => {
                    setSceneVars((prev) => ({ ...prev, ...patch }));
                    if (patch.rotationSpeed !== undefined) {
                      globalActionsRef.current?.setAnimSpeed(patch.rotationSpeed);
                    }
                    if (patch.globalScale !== undefined) {
                      globalActionsRef.current?.applyGlobalScale(patch.globalScale);
                    }
                    if (patch.showGrid !== undefined) {
                      globalActionsRef.current?.setShowGrid(patch.showGrid);
                    }
                    if (patch.wireframe !== undefined && patch.wireframe !== wireframe) {
                      globalActionsRef.current?.toggleWireframe();
                    }
                  }}
                  onUpdateBindings={setVariableBindings}
                  onApplyAccentToScene={(hex) => globalActionsRef.current?.applyAccentColor(hex)}
                  onOpenViewport={() => setActiveTab('viewport')}
                />
              )}

              {activeTab === 'export' && (
                <PublishExportPage
                  assetName={stats.activeAssetName}
                  objects={globalActionsRef.current?.getCodeExportObjects() ?? []}
                  auditReport={auditReport}
                  toneMapping={lightingState.toneMapping}
                  variables={{
                    rotationSpeed: sceneVars.rotationSpeed,
                    globalScale: sceneVars.globalScale,
                    showGrid: sceneVars.showGrid,
                    wireframe: sceneVars.wireframe,
                    highlightColor: sceneVars.highlightColor,
                    bindingsAtivos: variableBindings.filter((b) => b.enabled).length,
                  }}
                  emitters={viewportStatus.emitters}
                  ikEnabled={viewportStatus.ikEnabled}
                  onRunSceneAudit={handleRunSceneAudit}
                  onExternalAuditReport={setAuditReport}
                  onBakeIkPhysics={() => globalActionsRef.current?.bakeIkPhysics()}
                  onExportGlb={() => globalActionsRef.current?.exportModel('glb')}
                  onExportGltf={() => globalActionsRef.current?.exportModel('gltf')}
                  onExportFbx={() => globalActionsRef.current?.exportFbx()}
                  onExportZip={() => globalActionsRef.current?.exportZip()}
                  onRenderTransparentPng={() => globalActionsRef.current?.renderTransparentPng()}
                  onCopyPublicLink={() => globalActionsRef.current?.copyPublicLink()}
                  onRestoreDefaultScene={() => {
                    globalActionsRef.current?.restoreDefaultScene();
                    setActiveTab('viewport');
                  }}
                  onOpenViewport={() => setActiveTab('viewport')}
                />
              )}

              {activeTab === 'guide' && (
                <PipelineGuide
                  onOpenViewport={() => setActiveTab('viewport')}
                  onNavigateTarget={handleGuideTarget}
                />
              )}
            </div>
          </section>
          ) : (
            <div className="w-full border-t border-[#231F1D]/15 bg-[#0F131B] px-3 py-1.5 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-[#635B54] truncate">
                {RIGHT_DOCK_TITLES[activeTab] || 'Comandos'}
              </span>
              <button
                type="button"
                onClick={() => setBottomDockOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-[11px] font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Abrir {RIGHT_DOCK_TITLES[activeTab] || 'Painel'}</span>
              </button>
            </div>
          ))}
          </>
        )}
      </main>

      {/* Mobile Fixed Thumb-Zone Bottom Tab Bar */}
      <nav
        aria-label="NavegaÃ§Ã£o mÃ³vel do estÃºdio"
        className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D1017] border-t border-[#231F1D]/15/90 pb-safe"
      >
        <div className="flex items-center gap-1 h-12 px-1.5 overflow-x-auto no-scrollbar">
          {INSPECTOR_TABS.map((tab) => {
            const isActive = !isHubTab && findInspectorTab(inspectorStage)?.id === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectWorkspaceTab(tab.stages[0].stage)}
                className={`h-11 flex-1 min-w-[56px] px-1.5 flex flex-col items-center justify-center gap-0.5 rounded-lg transition-colors cursor-pointer ${
                  isActive ? 'text-orange-400 bg-orange-500/10' : 'text-[#635B54] hover:text-slate-200'
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

