import { iniciarMonitoramentoAutomatico } from './autoLayoutInteligente';
import { Component, ReactNode, useEffect, useState } from 'react';
import { Archive, RotateCcw, Box } from 'lucide-react';
import { DEFAULT_STUDIO_CONFIG, StudioConfig } from './types/studioConfig';
import { ImportedUvMesh, Viewport3D, ViewportSceneConfig } from './components/Viewport3D';
import { AtlasUvInspector } from './components/AtlasUvInspector';
import { MaterialEcosystemView } from './components/MaterialEcosystemView';
import { SubstanceTextureSetRequest } from './utils/substanceImporter';

type WorkspaceTab = 'viewport' | 'atlas' | 'ecosystem';

const NAV_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'viewport', label: 'Cena & Viewport 3D' },
  { id: 'atlas', label: 'UVs & Unwrap' },
  { id: 'ecosystem', label: 'Materiais & PBR' },
];

interface ErrorBoundaryState {
  errorMessage: string | null;
}

class ViewportErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { errorMessage: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { errorMessage: error?.message || 'Erro inesperado no estudio 3D.' };
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="flex-1 min-h-[520px] flex flex-col items-center justify-center gap-3 bg-[#0D1017] p-6 text-center">
          <div className="text-sm font-semibold text-red-300">Falha ao inicializar o Estudio 3D</div>
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

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('alexdesign:sync-state', {
        detail: { activeTab, config, importedUvs, substanceRequest },
      })
    );
  }, [activeTab, config, importedUvs, substanceRequest]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1017] text-slate-100">
      <header className="h-14 px-5 border-b border-slate-800/90 bg-[#0D1017] flex items-center justify-between gap-6 shrink-0 z-20">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('viewport');
          }}
          className="inline-flex items-center gap-2 font-display text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0"
        >
          <Box className="w-4 h-4 text-sky-400" />
          <span>
            Alex<span className="text-orange-500">Design</span>
          </span>
        </a>

        <nav
          aria-label="Navegacao principal"
          className="flex items-center gap-1 p-1 rounded-lg bg-[#131722] border border-slate-800"
        >
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            disabled={isExportingZip}
            onClick={() => setExportZipNonce((n) => n + 1)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{isExportingZip ? 'Gerando ZIP...' : 'Exportar ZIP Completo'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col min-h-0 relative">
        <div
          className={
            activeTab === 'viewport'
              ? 'h-[calc(100vh-3.5rem)] min-h-[520px] flex flex-col'
              : 'fixed inset-0 top-14 opacity-0 pointer-events-none -z-10 flex flex-col'
          }
        >
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
          <div className="flex-1 w-full flex flex-col z-10 bg-[#0D1017]">
            <AtlasUvInspector
              config={config}
              onConfigChange={handleConfigChange}
              importedUvs={importedUvs}
              onGenerateAutoUv={() => setAutoUvNonce((n) => n + 1)}
            />
          </div>
        )}

        {activeTab === 'ecosystem' && (
          <div className="flex-1 w-full flex flex-col z-10 bg-[#0D1017]">
            <MaterialEcosystemView
              config={config}
              onConfigChange={handleConfigChange}
              importedUvs={importedUvs}
              onApplySubstanceToViewport={handleApplySubstanceToViewport}
            />
          </div>
        )}
      </main>
    </div>
  );
}

iniciarMonitoramentoAutomatico();