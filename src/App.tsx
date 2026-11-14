import { useState } from 'react';
import { Archive } from 'lucide-react';
import { AddonConfig, DEFAULT_ADDON_CONFIG } from './addon/blenderAddonTemplates';
import { ImportedUvMesh, Viewport3D, ViewportSceneConfig } from './components/Viewport3D';
import { AtlasUvInspector } from './components/AtlasUvInspector';
import { MaterialEcosystemView } from './components/MaterialEcosystemView';
import { PipelineGuide } from './components/PipelineGuide';
import { PROCEDURAL_PBR_PRESETS, ProceduralPbrParams } from './utils/pbrTextureGenerator';

type WorkspaceTab = 'viewport' | 'atlas' | 'ecosystem' | 'guide';

const NAV_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: 'viewport', label: 'Viewport 3D' },
  { id: 'atlas', label: 'Atlas & UVs' },
  { id: 'ecosystem', label: 'Ecossistema & Materiais' },
  { id: 'guide', label: 'Guia PBR' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('viewport');
  const [config, setConfig] = useState<AddonConfig>(DEFAULT_ADDON_CONFIG);
  const [importedUvs, setImportedUvs] = useState<ImportedUvMesh[] | null>(null);
  const [proceduralParams, setProceduralParams] = useState<ProceduralPbrParams>(
    PROCEDURAL_PBR_PRESETS[0].defaultParams
  );
  const [proceduralRequest, setProceduralRequest] = useState<{
    params: ProceduralPbrParams;
    nonce: number;
  } | null>(null);
  const [exportZipNonce, setExportZipNonce] = useState(0);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleConfigChange = (patch: Partial<AddonConfig> | Partial<ViewportSceneConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }));
  };

  const handleApplyProceduralToViewport = (params: ProceduralPbrParams) => {
    setProceduralParams(params);
    setProceduralRequest((prev) => ({
      params,
      nonce: (prev?.nonce ?? 0) + 1,
    }));
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

        {/* Zone 2: 4 concise single-line nav links */}
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
      <main className="flex-1 flex flex-col">
        <div className={activeTab === 'viewport' ? 'flex-1 flex flex-col' : 'hidden'}>
          <Viewport3D
            config={config}
            onConfigChange={handleConfigChange}
            onImportedUvs={setImportedUvs}
            proceduralMaterialRequest={proceduralRequest}
            exportZipNonce={exportZipNonce}
            onExportStateChange={setIsExportingZip}
          />
        </div>
        {activeTab === 'atlas' && (
          <AtlasUvInspector
            config={config}
            onConfigChange={handleConfigChange}
            importedUvs={importedUvs}
          />
        )}
        {activeTab === 'ecosystem' && (
          <MaterialEcosystemView
            params={proceduralParams}
            onParamsChange={setProceduralParams}
            onApplyToViewport={handleApplyProceduralToViewport}
          />
        )}
        {activeTab === 'guide' && <PipelineGuide config={config} />}
      </main>
    </div>
  );
}
