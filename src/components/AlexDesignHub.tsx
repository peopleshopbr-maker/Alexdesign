
npm run build; if ($?) { npx wrangler pages deploy dist }
import React, { useState, Suspense } from "react";
import { useStudioIntelligence } from "../context/StudioIntelligenceContext";

const Viewport3D = React.lazy(() =>
  import("./Viewport3D").then((m) => ({ default: (m as any).Viewport3D || (m as any).default }))
);
const SmartStudioBar = React.lazy(() =>
  import("./SmartStudioBar").then((m) => ({ default: (m as any).SmartStudioBar || (m as any).default }))
);
const InspectorTabs = React.lazy(() =>
  import("./InspectorTabs").then((m) => ({ default: (m as any).InspectorTabs || (m as any).default }))
);
const MaterialEcosystemView = React.lazy(() =>
  import("./MaterialEcosystemView").then((m) => ({ default: (m as any).MaterialEcosystemView || (m as any).default }))
);
const MotionLabPanel = React.lazy(() =>
  import("./MotionLabPanel").then((m) => ({ default: (m as any).MotionLabPanel || (m as any).default }))
);
const MoGraphPanel = React.lazy(() =>
  import("./MoGraphPanel").then((m) => ({ default: (m as any).MoGraphPanel || (m as any).default }))
);
const RigAuditPanel = React.lazy(() =>
  import("./RigAuditPanel").then((m) => ({ default: (m as any).RigAuditPanel || (m as any).default }))
);

const LightingRenderPanel = React.lazy(() =>
  import("./LightingRenderPanel").then((m) => ({ default: (m as any).LightingRenderPanel || (m as any).default }))
);
const HdriEnvironmentPanel = React.lazy(() =>
  import("./HdriEnvironmentPanel").then((m) => ({ default: (m as any).HdriEnvironmentPanel || (m as any).default }))
);

const SplineDesignPanel = React.lazy(() =>
  import("./SplineDesignPanel").then((m) => ({ default: (m as any).SplineDesignPanel || (m as any).default }))
);


class SafeModuleBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { name: string; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(err: Error) {
    return { hasError: true, errorMsg: err.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-4 text-xs text-amber-200">
          <p className="font-semibold">Módulo {this.props.name} aguardando parâmetros da cena:</p>
          <p className="mt-1 opacity-80">{this.state.errorMsg}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

type StudioTab =
  | "viewport"
  | "inspector"
  | "materials"
  | "motion"
  | "mograph"
  | "rig"
  | "lighting"
  | "substance"
  | "spline";

export function AlexDesignHub({ onClose }: { onClose: () => void }) {
  const { config, updateConfig, telemetry, activeClip, setActiveClip, logUserIntent } =
    useStudioIntelligence();
  const [activeTab, setActiveTab] = useState<StudioTab>("viewport");

  const tabs: { id: StudioTab; label: string }[] = [
    { id: "viewport", label: "Viewport 3D & Blender 5.3" },
    { id: "inspector", label: "Inspetor & Smart Bar" },
    { id: "materials", label: "Ecossistema PBR" },

    { id: "rig", label: "Auto-Rig & Auditoria" },
    { id: "motion", label: "Motion Lab" },
    { id: "mograph", label: "MoGraph" },
    { id: "lighting", label: "Luz & HDRI" },
    { id: "spline", label: "Spline 3D" },

  ];

  const handleSelectTab = (id: StudioTab, label: string) => {
    setActiveTab(id);
    logUserIntent(`Aba selecionada: ${label}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-zinc-100">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900/95 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <span className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-bold tracking-wide text-white">
            ALEXDESIGN 3D STUDIO
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              telemetry.rustActive
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {telemetry.rustActive ? "Rust/WASM Ativo" : "JS Fallback"}
          </span>
          <span className="hidden text-xs text-zinc-400 md:inline">
            {telemetry.lastAction}
          </span>
        </div>

        <button
          onClick={onClose}
          className="rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-zinc-700"
        >
          ← Voltar ao Roboticela Animator
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto border-b border-zinc-800 bg-zinc-900/60 px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleSelectTab(tab.id, tab.label)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition ${
              activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-4">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-sm text-zinc-400">
              Carregando módulo AlexDesign 3D Studio...
            </div>
          }
        >
          {activeTab === "viewport" && (
            <div className="flex h-full flex-col gap-3">
              <SafeModuleBoundary name="SmartStudioBar">
                <SmartStudioBar
                  config={config}
                  onUpdateConfig={updateConfig}
                  activeClip={activeClip}
                  onSelectClip={setActiveClip}
                />
              </SafeModuleBoundary>
              <div className="min-h-[420px] flex-1 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
                <SafeModuleBoundary name="Viewport3D">
                  <Viewport3D config={config} onUpdateConfig={updateConfig} />
                </SafeModuleBoundary>
              </div>
            </div>
          )}

          {activeTab === "inspector" && (
            <SafeModuleBoundary name="InspectorTabs">
              <InspectorTabs config={config} onUpdateConfig={updateConfig} />
            </SafeModuleBoundary>
          )}

          {activeTab === "materials" && (
            <SafeModuleBoundary name="MaterialEcosystemView">
              <MaterialEcosystemView config={config} importedUvs={null} />
            </SafeModuleBoundary>
          )}



          {activeTab === "rig" && (
            <SafeModuleBoundary name="RigAuditPanel">
              <RigAuditPanel config={config} onUpdateConfig={updateConfig} />
            </SafeModuleBoundary>
          )}

          {activeTab === "motion" && (
            <SafeModuleBoundary name="MotionLabPanel">
              <MotionLabPanel
                config={config}
                onUpdateConfig={updateConfig}
                activeClip={activeClip}
                onSelectClip={setActiveClip}
              />
            </SafeModuleBoundary>
          )}

          {activeTab === "mograph" && (
            <SafeModuleBoundary name="MoGraphPanel">
              <MoGraphPanel config={config} onUpdateConfig={updateConfig} />
            </SafeModuleBoundary>
          )}

          {activeTab === "lighting" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <SafeModuleBoundary name="LightingRenderPanel">
                <LightingRenderPanel config={config} onUpdateConfig={updateConfig} />
              </SafeModuleBoundary>
              <SafeModuleBoundary name="HdriEnvironmentPanel">
                <HdriEnvironmentPanel config={config} onUpdateConfig={updateConfig} />
              </SafeModuleBoundary>
            </div>
          )}

          {activeTab === "spline" && (
            <SafeModuleBoundary name="SplineDesignPanel">
              <SplineDesignPanel config={config} onUpdateConfig={updateConfig} />
            </SafeModuleBoundary>
          )}


        </Suspense>
      </div>
    </div>
  );
}
