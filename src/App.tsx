import { Component, ReactNode, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_STUDIO_CONFIG, StudioConfig } from './types/studioConfig';
import {
  ImportedUvMesh,
  Viewport3D,
  ViewportSceneConfig,
  ViewportStageKey,
} from './components/Viewport3D';
import type { SubstanceTextureSetRequest } from './utils/substanceImporter';

type WorkspaceTab = 'viewport' | ViewportStageKey;

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
  const [, setImportedUvs] = useState<ImportedUvMesh[] | null>(null);
  const [substanceRequest] = useState<SubstanceTextureSetRequest | null>(null);

  const handleConfigChange = (patch: Partial<StudioConfig> | Partial<ViewportSceneConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleImportedUvsChange = (meshes: ImportedUvMesh[] | null) => {
    setImportedUvs(meshes);
  };

  return (
    <div className="min-h-dvh flex flex-col bg-[#0D1017] text-slate-100 select-none">
      {/* Top Bar - Clean & Modern */}
      <header className="h-12 px-3 sm:px-4 border-b border-slate-800/80 bg-[#0A0D14]/95 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-30">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveTab('viewport');
            }}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap flex items-center gap-1.5"
          >
            <span>Alex</span>
            <span className="text-orange-500 drop-shadow-[0_0_12px_rgba(249,115,22,0.4)]">Design</span>
          </a>
        </div>

        {/* Advanced Graphics Engine Status Badge */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#121622]/90 border border-slate-800/90 text-[10px] text-slate-300 font-mono shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
            <span className="hidden xs:inline text-slate-400">Rigging · Animação · VFX →</span>
            <span className="text-emerald-400 font-semibold">GLB/glTF · Blender 3.5+</span>
          </div>
        </div>
      </header>

      {/* Main Content Area (Viewport 3D permanently active with integrated stages) */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="h-[calc(100dvh-3rem)] min-h-[360px] flex flex-col">
          <ViewportErrorBoundary>
            <Viewport3D
              config={config}
              onConfigChange={handleConfigChange}
              onImportedUvs={handleImportedUvsChange}
              substanceTextureRequest={substanceRequest}
              onOpenTab={setActiveTab}
              focusedStage={activeTab === 'viewport' ? null : activeTab}
            />
          </ViewportErrorBoundary>
        </div>
      </main>
    </div>
  );
}
