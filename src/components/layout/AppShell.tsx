
import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Viewport3D as AnimatorViewport3D } from "@/components/viewport/Viewport3D";
import { ModelHierarchyPanel } from "@/components/panels/ModelHierarchyPanel";
import { PropertiesPanel } from "@/components/panels/PropertiesPanel";
import { TimelinePanel } from "@/components/timeline/TimelinePanel";
import { StatusBar } from "@/components/layout/StatusBar";
import { ResizeHandle } from "@/components/layout/ResizeHandle";
import { useAnimationStore } from "@/store/animationStore";
import { useModelStore } from "@/store/modelStore";
import { useImportReference } from "@/hooks/useImportReference";
import { HtmlTo3dModal } from "@/components/modals/HtmlTo3dModal";
import { useStudioIntelligence } from "@/context/StudioIntelligenceContext";
import {
  copySelectedBoneTransforms,
  deleteKeyframesAtPlayheadForSelection,
  mirrorSelectedBonesOnX,
  pasteSelectedBoneTransforms,
  resetSelectedBones,
  setKeyframesForSelection,
} from "@/lib/app-actions";
import {
  clampLayout,
  loadLayoutPreferences,
  LAYOUT_LIMITS,
  saveLayoutPreferences,
  type LayoutPreferences,
} from "@/lib/layout-preferences";

const AlexViewport3D = React.lazy(() =>
  import("@/components/Viewport3D").then((m) => ({ default: (m as any).Viewport3D || (m as any).default }))
);
const SmartStudioBar = React.lazy(() =>
  import("@/components/SmartStudioBar").then((m) => ({ default: (m as any).SmartStudioBar || (m as any).default }))
);
const InspectorTabs = React.lazy(() =>
  import("@/components/InspectorTabs").then((m) => ({ default: (m as any).InspectorTabs || (m as any).default }))
);
const MaterialEcosystemView = React.lazy(() =>
  import("@/components/MaterialEcosystemView").then((m) => ({ default: (m as any).MaterialEcosystemView || (m as any).default }))
);
const MotionLabPanel = React.lazy(() =>
  import("@/components/MotionLabPanel").then((m) => ({ default: (m as any).MotionLabPanel || (m as any).default }))
);
const MoGraphPanel = React.lazy(() =>
  import("@/components/MoGraphPanel").then((m) => ({ default: (m as any).MoGraphPanel || (m as any).default }))
);
const RigAuditPanel = React.lazy(() =>
  import("@/components/RigAuditPanel").then((m) => ({ default: (m as any).RigAuditPanel || (m as any).default }))
);
const LightingRenderPanel = React.lazy(() =>
  import("@/components/LightingRenderPanel").then((m) => ({ default: (m as any).LightingRenderPanel || (m as any).default }))
);
const HdriEnvironmentPanel = React.lazy(() =>
  import("@/components/HdriEnvironmentPanel").then((m) => ({ default: (m as any).HdriEnvironmentPanel || (m as any).default }))
);
const SplineDesignPanel = React.lazy(() =>
  import("@/components/SplineDesignPanel").then((m) => ({ default: (m as any).SplineDesignPanel || (m as any).default }))
);
const PbrAtlasPanel = React.lazy(() =>
  import("@/components/PbrAtlasPanel").then((m) => ({ default: (m as any).PbrAtlasPanel || (m as any).default }))
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
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
          <p className="font-semibold">Módulo {this.props.name} aguardando parâmetros da cena:</p>
          <p className="mt-1 opacity-80">{this.state.errorMsg}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

type UnifiedWorkspaceTab =
  | "animator"
  | "alex-viewport"
  | "materials"
  | "rig"
  | "motion"
  | "mograph"
  | "lighting"
  | "spline";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

interface AppShellProps {
  onReturnHome?: () => void;
}

export function AppShell({ onReturnHome }: AppShellProps) {
  const setTransformMode = useAnimationStore((s) => s.setTransformMode);
  const togglePlay = useAnimationStore((s) => s.togglePlay);
  const stepFrame = useAnimationStore((s) => s.stepFrame);
  const toggleGizmoSpace = useAnimationStore((s) => s.toggleGizmoSpace);
  const selectAllActive = useModelStore((s) => s.selectAllActive);
  const clearActiveSelection = useModelStore((s) => s.clearActiveSelection);
  const undo = useAnimationStore((s) => s.undo);
  const redo = useAnimationStore((s) => s.redo);
  const { openReferenceFile } = useImportReference();

  const { config, updateConfig, telemetry, activeClip, setActiveClip, logUserIntent } =
    useStudioIntelligence();

  const [layout, setLayout] = useState<LayoutPreferences>(() => loadLayoutPreferences());
  const [htmlReferenceOpen, setHtmlReferenceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<UnifiedWorkspaceTab>("animator");
  const [rightInspectorMode, setRightInspectorMode] = useState<"properties" | "alex-inspector">("properties");
  const shellRef = useRef<HTMLDivElement>(null);

  const patchLayout = useCallback(
    (patch: Partial<LayoutPreferences> | ((prev: LayoutPreferences) => Partial<LayoutPreferences>)) => {
      setLayout((prev) => {
        const next = typeof patch === "function" ? patch(prev) : patch;
        return clampLayout({ ...prev, ...next });
      });
    },
    []
  );

  useEffect(() => {
    saveLayoutPreferences(layout);
  }, [layout]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        copySelectedBoneTransforms();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        pasteSelectedBoneTransforms();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAllActive();
        return;
      }
      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "w":
          setTransformMode("translate");
          break;
        case "e":
          setTransformMode("rotate");
          break;
        case "r":
          setTransformMode("scale");
          break;
        case "x":
          toggleGizmoSpace();
          break;
        case "i":
          setKeyframesForSelection();
          break;
        case "delete":
        case "backspace":
          deleteKeyframesAtPlayheadForSelection();
          break;
        case "m":
          mirrorSelectedBonesOnX();
          break;
        case "0":
          resetSelectedBones();
          break;
        case "escape":
          clearActiveSelection();
          break;
        case "arrowleft":
          stepFrame(-1);
          break;
        case "arrowright":
          stepFrame(1);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    clearActiveSelection,
    redo,
    selectAllActive,
    setTransformMode,
    stepFrame,
    toggleGizmoSpace,
    togglePlay,
    undo,
  ]);

  const timelineMaxHeight = () => {
    const shell = shellRef.current;
    if (!shell) return LAYOUT_LIMITS.timelineHeight.max;
    return Math.max(LAYOUT_LIMITS.timelineHeight.min, Math.floor(shell.clientHeight * 0.72));
  };

  const tabs: { id: UnifiedWorkspaceTab; label: string }[] = [
    { id: "animator", label: "Viewport Rig & Keyframes" },
    { id: "alex-viewport", label: "Viewport 3D & Blender 5.3" },
    { id: "materials", label: "Ecossistema PBR" },
    { id: "rig", label: "Auto-Rig & Auditoria" },
    { id: "motion", label: "Motion Lab" },
    { id: "mograph", label: "MoGraph" },
    { id: "lighting", label: "Luz & HDRI" },
    { id: "spline", label: "Spline 3D" },
  ];

  const handleSelectTab = (id: UnifiedWorkspaceTab, label: string) => {
    setActiveTab(id);
    logUserIntent(`Aba unificada selecionada: ${label}`);
  };

  return (
    <div ref={shellRef} className="flex h-full min-h-0 flex-col overflow-hidden p-2 sm:p-3">
      {/* Barra superior unificada: Roboticela Animator + AlexDesign 3D Studio */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/80 px-3 py-1.5 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="mr-1 rounded bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-primary">
            STUDIO UNIFICADO
          </span>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id, tab.label)}
              className={`whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-foreground/70 hover:bg-background/70 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium sm:inline-flex ${
              telemetry.rustActive
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-amber-500/30 bg-amber-500/10 text-amber-400"
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {telemetry.rustActive ? "Rust/WASM" : "JS Engine"}
          </span>

          {onReturnHome && (
            <button
              type="button"
              onClick={onReturnHome}
              className="rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-medium text-foreground/80 transition hover:bg-background hover:text-foreground"
            >
              Tela Inicial
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className="flex min-h-0 flex-shrink-0 flex-col overflow-hidden"
          style={{ width: layout.leftWidth }}
        >
          <ModelHierarchyPanel
            onImportReference3d={() => void openReferenceFile()}
            onImportReferenceHtml={() => setHtmlReferenceOpen(true)}
          />
        </aside>

        <ResizeHandle
          axis="horizontal"
          onDrag={(delta) => patchLayout((prev) => ({ leftWidth: prev.leftWidth + delta }))}
        />

        <main className="custom-scrollbar relative min-h-0 min-w-[240px] flex-1 overflow-y-auto rounded-xl border border-border/60 bg-card/40">
          {activeTab === "animator" && <AnimatorViewport3D />}

          {activeTab !== "animator" && (
            <div className="h-full p-3">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-xs text-foreground/60">
                    Carregando módulo do AlexDesign Studio...
                  </div>
                }
              >
                {activeTab === "alex-viewport" && (
                  <SafeModuleBoundary name="AlexViewport3D">
                    <div className="flex h-full flex-col gap-2">
                      <SmartStudioBar />
                      <div className="min-h-0 flex-1">
                        <AlexViewport3D />
                      </div>
                    </div>
                  </SafeModuleBoundary>
                )}

                {activeTab === "materials" && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SafeModuleBoundary name="MaterialEcosystemView">
                      <MaterialEcosystemView config={config} importedUvs={null} />
                    </SafeModuleBoundary>
                    <SafeModuleBoundary name="PbrAtlasPanel">
                      <PbrAtlasPanel config={config} onUpdateConfig={updateConfig} />
                    </SafeModuleBoundary>
                  </div>
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
          )}
        </main>

        <ResizeHandle
          axis="horizontal"
          onDrag={(delta) => patchLayout((prev) => ({ rightWidth: prev.rightWidth - delta }))}
        />

        <aside
          className="flex h-full min-h-0 flex-shrink-0 flex-col overflow-hidden"
          style={{ width: layout.rightWidth }}
        >
          <div className="mb-1.5 flex gap-1 rounded-lg border border-border/60 bg-card/70 p-1">
            <button
              type="button"
              onClick={() => setRightInspectorMode("properties")}
              className={`flex-1 rounded-md py-1 text-[11px] font-medium transition ${
                rightInspectorMode === "properties"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/65 hover:text-foreground"
              }`}
            >
              Propriedades Rig
            </button>
            <button
              type="button"
              onClick={() => setRightInspectorMode("alex-inspector")}
              className={`flex-1 rounded-md py-1 text-[11px] font-medium transition ${
                rightInspectorMode === "alex-inspector"
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/65 hover:text-foreground"
              }`}
            >
              Inspetor AlexDesign
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {rightInspectorMode === "properties" ? (
              <PropertiesPanel />
            ) : (
              <Suspense fallback={<div className="p-3 text-xs text-foreground/60">Carregando Inspetor...</div>}>
                <SafeModuleBoundary name="InspectorTabs">
                  <InspectorTabs />
                </SafeModuleBoundary>
              </Suspense>
            )}
          </div>
        </aside>
      </div>

      <ResizeHandle
        axis="vertical"
        onDrag={(delta) =>
          patchLayout((prev) => ({
            timelineHeight: Math.min(timelineMaxHeight(), prev.timelineHeight - delta),
          }))
        }
      />

      <div
        className="flex min-h-0 flex-shrink-0 flex-col overflow-hidden"
        style={{ height: layout.timelineHeight }}
      >
        <div className="min-h-0 flex-1 overflow-hidden">
          <TimelinePanel />
        </div>
        <StatusBar />
      </div>

      <HtmlTo3dModal
        isOpen={htmlReferenceOpen}
        onClose={() => setHtmlReferenceOpen(false)}
        mode="reference"
      />
    </div>
  );
}
