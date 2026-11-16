import { iniciarMonitoramentoAutomatico } from './autoLayoutInteligente';
import { Component, ReactNode, useState } from 'react';
import { Archive, RotateCcw } from 'lucide-react';
import { DEFAULT_STUDIO_CONFIG, StudioConfig } from './types/studioConfig';
import { ImportedUvMesh, Viewport3D, ViewportSceneConfig } from './components/Viewport3D';
import { AtlasUvInspector } from './components/AtlasUvInspector';
import { MaterialEcosystemView } from './components/MaterialEcosystemView';
import { SubstanceTextureSetRequest } from './utils/substanceImporter';

type WorkspaceTab = 'viewport' | 'atlas' | 'ecosystem';

const NAV_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'viewport', label: 'Viewport 3D' },
  { id: 'atlas', label: 'UVs' },
  { id: 'ecosystem', label: 'Ecossistema & Materiais' },
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
        <div className="flex-1 min-h-[520px] flex flex-col items-center justify-center gap-3 bg-[#0D1017] p-6 text-center">
          <div className="text-sm font-semibold text-red-300">Falha ao inicializar o Estúdio 3D</div>
          <div className="max-w-md text-xs text-slate-400">{this.state.errorMessage}</div>
          <button
            type="button"
            onClick={() => this.setState({ errorMessage: null })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
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
  const [substanceRequest, setSubstanceRequest] = useState<SubstanceTextureSetRequest | null>(null);
  const [exportZipNonce, setExportZipNonce] = useState(0);
  const [autoUvNonce, setAutoUvNonce] = useState(0);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleConfigChange = (patch: Partial<StudioConfig> | Partial<ViewportSceneConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleApplySubstanceToViewport = (req: SubstanceTextureSetRequest) => {
    setSubstanceRequest(req);
    setActiveTab('viewport');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1017] text-slate-100">
      {/* 3-Zone Top Bar Contract */}
      <header className="h-16 px-6 border-b border-slate-800/90 bg-[#0D1017] flex items-center justify-between gap-8 shrink-0">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('viewport');
          }}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          Alex<span className="text-orange-500">Design</span>
        </a>

        {/* Zone 2: 3 concise single-line nav links */}
        <nav
          aria-label="Navegação principal"
          className="h-full flex items-center gap-6 overflow-x-auto overflow-y-hidden no-scrollbar"
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative h-full inline-flex items-center text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

        {/* Zone 3: 1 Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            disabled={isExportingZip}
            onClick={() => setExportZipNonce((n) => n + 1)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isExportingZip ? 'Gerando ZIP...' : 'Exportar ZIP Completo'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area (Viewport3D remains mounted to preserve 3D model, rig, paints and atlas) */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className={activeTab === 'viewport' ? 'h-[calc(100vh-4rem)] min-h-[520px] flex flex-col' : 'hidden'}>
          <ViewportErrorBoundary>
            <Viewport3D
              config={config}
              onConfigChange={handleConfigChange}
              onImportedUvs={setImportedUvs}
              substanceTextureRequest={substanceRequest}
              exportZipNonce={exportZipNonce}
              autoUvNonce={autoUvNonce}
              onExportStateChange={setIsExportingZip}
            />
          </ViewportErrorBoundary>
        </div>
        {activeTab === 'atlas' && (
          <AtlasUvInspector
            config={config}
            onConfigChange={handleConfigChange}
            importedUvs={importedUvs}
            onGenerateAutoUv={() => setAutoUvNonce((n) => n + 1)}
          />
        )}
        {activeTab === 'ecosystem' && (
          <MaterialEcosystemView
            config={config}
            importedUvs={importedUvs}
            onApplySubstanceToViewport={handleApplySubstanceToViewport}
          />
        )}
      </main>
    </div>
  );
}

iniciarMonitoramentoAutomatico();

