import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import JSZip from 'jszip';
import {
  Archive,
  Bone,
  Box,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Code2,
  Copy,
  Download,
  Eraser,
  ExternalLink,
  Eye,
  Grid,
  Hammer,
  ImagePlus,
  Layers,
  Maximize2,
  MousePointer2,
  Move,
  Paintbrush,
  Palette,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Save,
  Scissors,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trash2,
  Undo2,
  Upload,
  Sliders,
  Video,
  Wand2,
  Wind,
  Workflow,
  X,
} from 'lucide-react';
import {
  DEFAULT_STUDIO_CONFIG,
  RIG_PRESET_DEFINITIONS,
  RigPreset,
  StudioConfig,
} from '../types/studioConfig';
import {
  clearSavedStudioProject,
  loadSavedStudioProject,
  saveStudioProject,
} from '../utils/projectStorage';
import {
  PROCEDURAL_PBR_PRESETS,
  ProceduralPbrParams,
  ThreePbrTextureBundle,
  createThreePbrTextureBundle,
} from '../utils/pbrTextureGenerator';
import {
  SubstanceTextureSetRequest,
  loadSubstanceBundleToThree,
} from '../utils/substanceImporter';
import {
  auditThreeScene,
  ContainerCheckResult,
  FileVerificationReport,
  inspectGltfBinaryOrJson,
} from '../utils/gltfVerifier';
import { autoGenerateUvsForGroup, autoRigAndAnimateGroup } from '../utils/autoRigger';
import { exportCompleteProjectZip } from '../utils/projectZipExporter';
import {
  HDRI_CDN_BASE,
  HDRI_ENVIRONMENT_OPTIONS,
  HdriEnvironmentId,
  RenderResolutionPreset,
  StudioLightSpec,
  StudioLightType,
  TONE_MAPPING_MAP,
  ToneMappingPreset,
  buildProceduralHdriTexture,
  buildThreeLightFromSpec,
  renderSceneToPngBlob,
} from '../utils/studioLighting';
import { BooleanOperation, performMeshBoolean } from '../utils/csgBoolean';
import {
  PRIMITIVE_CATALOG,
  PrimitiveShapeKind,
  SelectedObjectInspector,
  SplineInteractionType,
  SplineMaterialStyle,
  SplineTemplateId,
  SplineToolMode,
  applySplineStyleToPhysicalMaterial,
  createSplinePrimitiveGeometry,
  generateReactThreeFiberCode,
  generateThreeJsSceneCode,
} from '../utils/splineSceneObjects';
import { FileVerificationModal } from './FileVerificationModal';
import { CameraOrientationGizmo, GizmoCameraPreset } from './CameraOrientationGizmo';
import {
  MeshHierarchyDrawer,
  SceneMeshListItem,
  SceneMetricsSummary,
} from './MeshHierarchyDrawer';
import { InspectorTabs } from './InspectorTabs';
import { LightingRenderPanel } from './LightingRenderPanel';
import { HdriEnvironmentPanel } from './HdriEnvironmentPanel';
import { SplineDesignPanel } from './SplineDesignPanel';
import { SplineCodeExportModal } from './SplineCodeExportModal';
import { PipelineStageCard } from './PipelineStageCard';
import {
  retopologizeMeshGeometry,
  subdivideMeshGeometry,
  weldCleanTopology,
} from '../utils/retopologyOps';
import {
  createContactShadowTexture,
  createMatcapTexture,
  createProceduralFabricNormalTexture,
  createToonGradient,
  createUvCheckerTexture,
  disposeMaterialTree,
  extractTextureDataUrl,
  type TextureExtractCache,
} from '../engine/viewportTextureUtils';
import { bakeAoAndCurvatureForGroup } from '../engine/meshBakeUtils';
import {
  SceneHistoryManager,
  captureObjectSnapshot,
  type ObjectTransformSnapshot,
} from '../engine/historyManager';
import {
  DEFAULT_MOGRAPH_CONFIG,
  type MoGraphCloneEntry,
  type MoGraphConfig,
  buildMoGraphClones,
  updateMoGraphEffectorFrame,
} from '../engine/mographEngine';
import { MoGraphPanel } from './MoGraphPanel';
import { AnimationPrinciplesPanel } from './AnimationPrinciplesPanel';
import { RigBonePicker, RigJointSpec } from './RigBonePicker';
import { ACTIONFORGE_CLIPS, type ActionForgeClipItem } from '../data/actionForgeClips';
import { ActionForgeTimeline } from './ActionForgeTimeline';
import {
  type AnimationPrinciplesConfig,
  DEFAULT_ANIMATION_PRINCIPLES,
  applyAnimationPrinciplesFrame,
  createMotionTrailLine,
  createPrinciplesRuntimeState,
  syncActionForgeRigRings,
} from '../engine/animationPrinciplesEngine';
import {
  RapierSceneWorld,
  DEFAULT_RAPIER_PHYSICS,
  type RapierPhysicsConfig,
} from '../engine/rapierPhysicsEngine';
import {
  applyProceduralIkFrame,
  DEFAULT_PROCEDURAL_IK,
  type ProceduralIkConfig,
} from '../engine/proceduralIkEngine';
import {
  type MeshModelingOp,
  applyMeshModelingOp,
} from '../engine/meshModelingOps';
import { GoogleDriveModal } from './drive/GoogleDriveModal';

type ShadingMode =
  | 'pbr'
  | 'uv_checker'
  | 'normals'
  | 'cel_borde'
  | 'matcap_clay'
  | 'matcap_chrome'
  | 'matcap_redwax';
type CameraPreset = 'q34' | 'front' | 'side' | 'back' | 'top';
type ToolMode = SplineToolMode;

interface PbrMaterialPreset {
  id: string;
  label: string;
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  useNormal: boolean;
}

const PBR_MATERIAL_LIBRARY: PbrMaterialPreset[] = [
  { id: 'fabric', label: 'Tecido', color: '#2B3A4E', roughness: 0.84, metalness: 0.04, clearcoat: 0, useNormal: true },
  { id: 'leather', label: 'Couro', color: '#6B422B', roughness: 0.48, metalness: 0.06, clearcoat: 0.15, useNormal: true },
  { id: 'chrome', label: 'Metal', color: '#D8DEE9', roughness: 0.14, metalness: 0.96, clearcoat: 0.5, useNormal: false },
  { id: 'gold', label: 'Ouro', color: '#F59E0B', roughness: 0.22, metalness: 0.94, clearcoat: 0.45, useNormal: false },
  { id: 'ceramic', label: 'Cerâmica', color: '#F1F5F9', roughness: 0.18, metalness: 0.0, clearcoat: 0.65, useNormal: false },
  { id: 'rubber', label: 'Borracha', color: '#181C24', roughness: 0.78, metalness: 0.05, clearcoat: 0, useNormal: true },
];

const BRUSH_SWATCHES = ['#F97316', '#38BDF8', '#10B981', '#F43F5E', '#FACC15', '#FFFFFF', '#0F172A'];

interface LoadedAssetInfo {
  name: string;
  meshCount: number;
  triCount: number;
  matCount: number;
  hasSkeleton: boolean;
  animClips: string[];
  activeClipIdx: number;
  duration: number;
}

export interface ImportedAtlasTextures {
  baseColor?: string | null;
  roughness?: string | null;
  metallic?: string | null;
  normal?: string | null;
  ao?: string | null;
  emissive?: string | null;
  opacity?: string | null;
}

export interface ImportedUvMesh {
  name: string;
  materialName?: string;
  sourceType?: 'glb' | 'default';
  importSerial?: number;
  uvEdges: Float32Array;
  uv1Edges?: Float32Array;
  triCount: number;
  textures?: ImportedAtlasTextures;
  materialColor?: string;
}

export interface ViewportSceneConfig {
  targetEngine?: 'BLENDER' | 'UNITY' | 'UNREAL' | 'GODOT';
  rigPreset: RigPreset;
  shaderPreset: 'PBR_PRINCIPLED' | 'PBR_CEL_OUTLINE' | 'ANIME_TOON';
  normalStrength: number;
  outlineThickness: number;
  animEndFrame: number;
  textureResolution: 1024 | 2048 | 4096;
  uvMargin?: number;
  seamAngleDeg?: number;
  texelDensity?: number;
}

export interface ViewportGlobalActions {
  undo: () => void;
  redo: () => void;
  toggleWireframe: () => void;
  importModel: () => void;
}

export type ViewportStageKey =
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'stage5'
  | 'stage7'
  | 'stage8'
  | 'stage9'
  | 'stage10'
  | 'stage11'
  | 'stage12'
  | 'stage13'
  | 'stage14';

interface Viewport3DProps {
  config: ViewportSceneConfig;
  onConfigChange: (patch: Partial<ViewportSceneConfig>) => void;
  onImportedUvs?: (meshes: ImportedUvMesh[] | null) => void;
  proceduralMaterialRequest?: { params: ProceduralPbrParams; nonce: number } | null;
  substanceTextureRequest?: SubstanceTextureSetRequest | null;
  pendingImportFiles?: File[] | null;
  onConsumedPendingImport?: () => void;
  exportZipNonce?: number;
  onExportStateChange?: (exporting: boolean) => void;
  onOpenTab?: (tab: 'viewport' | 'atlas' | 'ecosystem' | ViewportStageKey) => void;
  focusedStage?: ViewportStageKey | null;
  /** Expõe ações globais (desfazer/refazer/wireframe) para a barra superior. */
  onRegisterGlobalActions?: (actions: ViewportGlobalActions | null) => void;
  onWireframeChange?: (wireframe: boolean) => void;
  onImportedModelFile?: (file: File) => void;
}

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number]; label: string }> = {
  q34: { pos: [1.85, 1.45, 2.35], target: [0, 0.92, 0], label: '3/4' },
  front: { pos: [0, 1.05, 2.85], target: [0, 0.92, 0], label: 'Frontal' },
  side: { pos: [2.85, 1.05, 0], target: [0, 0.92, 0], label: 'Lateral' },
  back: { pos: [0, 1.05, -2.85], target: [0, 0.92, 0], label: 'Costas' },
  top: { pos: [0.01, 3.35, 0.01], target: [0, 0.92, 0], label: 'Topo' },
};

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();

export const Viewport3D: React.FC<Viewport3DProps> = ({
  config,
  onConfigChange,
  onImportedUvs,
  proceduralMaterialRequest,
  substanceTextureRequest,
  pendingImportFiles,
  onConsumedPendingImport,
  exportZipNonce,
  onExportStateChange,
  onOpenTab,
  focusedStage = null,
  onRegisterGlobalActions,
  onWireframeChange,
  onImportedModelFile,
}) => {
  const onImportedUvsRef = useRef(onImportedUvs);
  onImportedUvsRef.current = onImportedUvs;
  const onExportStateChangeRef = useRef(onExportStateChange);
  onExportStateChangeRef.current = onExportStateChange;
  const onConfigChangeRef = useRef(onConfigChange);
  onConfigChangeRef.current = onConfigChange;
  const onImportedModelFileRef = useRef(onImportedModelFile);
  onImportedModelFileRef.current = onImportedModelFile;
  const latestConfigRef = useRef(config);
  latestConfigRef.current = config;
  const mountRef = useRef<HTMLDivElement>(null);
  const tweenCameraPresetRef = useRef<((preset: CameraPreset) => void) | null>(null);
  const autoSetupPipelineRef = useRef<(() => void) | null>(null);
  const autoRigCurrentCharacterRef = useRef<(() => void) | null>(null);
  const rotateBoneJointRef = useRef<((joint: RigJointSpec, axis: 'x' | 'y' | 'z', deg: number) => void) | null>(null);
  const resetRigPoseRef = useRef<(() => void) | null>(null);
  const [selectedRigJointId, setSelectedRigJointId] = useState<string | null>('hips');
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const [clipSearch, setClipSearch] = useState('');
  const [clipTagFilter, setClipTagFilter] = useState<string>('Todos');
  const [onlyRootMotion, setOnlyRootMotion] = useState(false);
  const [clipViewMode, setClipViewMode] = useState<'grid' | 'list'>('grid');
  const [isAutoTestingAnims, setIsAutoTestingAnims] = useState(false);
  const [rapierConfig, setRapierConfig] = useState<RapierPhysicsConfig>(DEFAULT_RAPIER_PHYSICS);
  const rapierConfigRef = useRef<RapierPhysicsConfig>(DEFAULT_RAPIER_PHYSICS);
  rapierConfigRef.current = rapierConfig;
  const rapierWorldRef = useRef<RapierSceneWorld>(new RapierSceneWorld());
  const rapierToggleRef = useRef<((enabled: boolean) => Promise<void>) | null>(null);
  const rapierDropRef = useRef<(() => Promise<void>) | null>(null);
  const rapierImpulseRef = useRef<(() => void) | null>(null);
  const rapierSpawnRef = useRef<((kind: 'sphere' | 'box') => Promise<void>) | null>(null);
  const rapierResetRef = useRef<(() => void) | null>(null);
  const [ikConfig, setIkConfig] = useState<ProceduralIkConfig>(DEFAULT_PROCEDURAL_IK);
  const ikConfigRef = useRef<ProceduralIkConfig>(DEFAULT_PROCEDURAL_IK);
  ikConfigRef.current = ikConfig;

  useEffect(() => {
    if (!isAutoTestingAnims) return;
    const testLabels = [
      'Walk Loop',
      'Sprint Loop',
      'Jump Start',
      'Sword Attack',
      'Pistol Shoot',
      'Dance Loop',
      'Crouch Fwd Loop',
      'Zombie Walk Fwd',
      'Idle Loop',
    ];
    const clips = testLabels
      .map((lbl) => ACTIONFORGE_CLIPS.find((c) => c.label === lbl))
      .filter((c): c is ActionForgeClipItem => Boolean(c));
    if (clips.length === 0) return;

    let idx = 0;
    const applyClip = (clip: ActionForgeClipItem) => {
      const next = {
        ...DEFAULT_ANIMATION_PRINCIPLES,
        enabled: true,
        actionCycle: clip.cycle,
        timingSpeed: clip.speed,
        exaggeration: clip.exag,
        rootMotion: true,
        physicsEnabled: true,
        physicsStrength: 0.95,
        squashStretch: 0,
        anticipation: 0,
        arcsStrength: 0,
        solidAsymmetry: 0,
      };
      setAnimPrinciples(next);
      animPrinciplesRef.current = next;
      setActiveClipId(clip.id);
    };

    applyClip(clips[0]);
    const timer = window.setInterval(() => {
      idx = (idx + 1) % clips.length;
      applyClip(clips[idx]);
    }, 2400);

    return () => window.clearInterval(timer);
  }, [isAutoTestingAnims]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);
  const pbrChannelInputRef = useRef<HTMLInputElement>(null);
  const hdriFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const [shadingMode, setShadingMode] = useState<ShadingMode>(
    config.shaderPreset === 'PBR_PRINCIPLED' ? 'pbr' : 'cel_borde'
  );
  const [activePreset, setActivePreset] = useState<CameraPreset>('q34');
  const [cameraQuat, setCameraQuat] = useState<[number, number, number, number]>([0, 0, 0, 1]);
  const lastCameraQuatRef = useRef<[number, number, number, number]>([0, 0, 0, 1]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [roughnessOverride, setRoughnessOverride] = useState(0.55);
  const [metalnessOverride, setMetalnessOverride] = useState(0.15);
  const [dockExpanded, setDockExpanded] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 768
  );
  const [openSections, setOpenSections] = useState<{
    stage1: boolean;
    stage2: boolean;
    stage3: boolean;
    stage4: boolean;
    stage5: boolean;
    stage6: boolean;
    stage7: boolean;
    stage8: boolean;
    stage9: boolean;
    stage10: boolean;
    stage11: boolean;
    stage12: boolean;
    stage13: boolean;
    stage14: boolean;
  }>({
    stage1: true,
    stage2: false,
    stage3: false,
    stage4: false,
    stage5: false,
    stage6: false,
    stage7: false,
    stage8: false,
    stage9: false,
    stage10: false,
    stage11: false,
    stage12: false,
    stage13: false,
    stage14: false,
  });
  const toggleSection = (key: keyof typeof openSections) => {
    if (!focusedStage && onOpenTab) {
      if (key === 'stage5') {
        onOpenTab('atlas');
        return;
      }
      if (key === 'stage6') {
        onOpenTab('ecosystem');
        return;
      }
      onOpenTab(key);
      return;
    }
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const [contextLost, setContextLost] = useState(false);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [retryWebglNonce, setRetryWebglNonce] = useState(0);

  const [loadedAsset, setLoadedAsset] = useState<LoadedAssetInfo | null>(null);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [verificationReport, setVerificationReport] = useState<FileVerificationReport | null>(null);

  const [showMeshDrawer, setShowMeshDrawer] = useState(false);
  const [meshList, setMeshList] = useState<SceneMeshListItem[]>([]);
  const [selectedMeshId, setSelectedMeshId] = useState<string | null>(null);
  const [sceneMetrics, setSceneMetrics] = useState<SceneMetricsSummary>({
    fileName: 'DamagedHelmet.glb',
    vertices: 0,
    triangles: 0,
    meshes: 0,
    materials: 0,
    textures: 0,
    dimensions: '—',
    animations: 0,
  });

  const [showPaintStudio, setShowPaintStudio] = useState(false);
  const [showLightingPanel, setShowLightingPanel] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [wireframeMode, setWireframeMode] = useState(false);
  const [doubleSided, setDoubleSided] = useState(false);
  const [canUndoPaint, setCanUndoPaint] = useState(false);

  const [hdriId, setHdriId] = useState<HdriEnvironmentId>('room');
  const [customHdriName, setCustomHdriName] = useState<string | null>(null);
  const [envIntensity, setEnvIntensity] = useState(1.0);
  const [envRotationDeg, setEnvRotationDeg] = useState(0);
  const [showHdriBg, setShowHdriBg] = useState(true);
  const [studioLights, setStudioLights] = useState<StudioLightSpec[]>([]);
  const [newLightType, setNewLightType] = useState<StudioLightType>('dir');
  const [renderResolution, setRenderResolution] = useState<RenderResolutionPreset>('1920x1080');
  const [toneMapping, setToneMapping] = useState<ToneMappingPreset>('aces');
  const [exposure, setExposure] = useState(1.1);
  const [transparentBg, setTransparentBg] = useState(false);

  const [toolMode, setToolMode] = useState<ToolMode>('orbit');
  const [selectedMatId, setSelectedMatId] = useState<string>('fabric');
  const [customMatColor, setCustomMatColor] = useState<string>('#2B3A4E');
  const [brushColor, setBrushColor] = useState<string>('#F97316');
  const [brushSize, setBrushSize] = useState<number>(24);
  const [customTextureName, setCustomTextureName] = useState<string | null>(null);
  const [activePbrChannelUpload, setActivePbrChannelUpload] = useState<
    'map' | 'roughnessMap' | 'metalnessMap' | 'normalMap' | 'aoMap'
  >('map');
  const [activeProceduralLabel, setActiveProceduralLabel] = useState<string | null>(null);

  const [playMode, setPlayMode] = useState(false);
  const [physicsActive, setPhysicsActive] = useState(false);
  const [bloomEnabled, setBloomEnabled] = useState(false);
  const [bloomStrength, setBloomStrength] = useState(0.55);
  const [hideDefaultBase, setHideDefaultBase] = useState(true);
  const [primitiveCount, setPrimitiveCount] = useState(0);
  const [selectedObjectInspector, setSelectedObjectInspector] =
    useState<SelectedObjectInspector | null>(null);
  const [codeExportModalOpen, setCodeExportModalOpen] = useState(false);
  const [exportedThreeCode, setExportedThreeCode] = useState('');
  const [exportedReactCode, setExportedReactCode] = useState('');

  // Etapa 3: Escultura / Detalhamento
  const [sculptRadius, setSculptRadius] = useState(0.18);
  const [sculptStrength, setSculptStrength] = useState(0.018);
  const [sculptMirrorX, setSculptMirrorX] = useState(true);
  const [canUndoSculpt, setCanUndoSculpt] = useState(false);

  // Etapa 4: Retopologia
  const [retopoRatio, setRetopoRatio] = useState<number>(0.5);

  // Etapa 8 & 13: Keyframes, Rotação e Lente da Câmera
  const [rotationMode, setRotationMode] = useState<'XYZ' | 'QUATERNION'>('XYZ');
  const [cameraLensMm, setCameraLensMm] = useState<number>(50);
  const [recordedKeyframes, setRecordedKeyframes] = useState<
    {
      frame: number;
      label: string;
      pos: [number, number, number];
      rot: [number, number, number];
      scl: [number, number, number];
    }[]
  >([]);

  const loadedAssetNameRef = useRef<string | null>(null);
  loadedAssetNameRef.current = loadedAsset?.name ?? null;
  const exportStatusTimerRef = useRef<number | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const latestHdriRef = useRef(hdriId);
  latestHdriRef.current = hdriId;
  const latestLightsRef = useRef(studioLights);
  latestLightsRef.current = studioLights;

  const stateRef = useRef({
    shadingMode,
    isPlaying,
    frame: 1,
    roughnessOverride,
    metalnessOverride,
    normalStrength: config.normalStrength,
    outlineThickness: config.outlineThickness,
    rigPreset: config.rigPreset,
    textureResolution: config.textureResolution,
    showSkeleton,
    showGrid,
    wireframeMode,
    doubleSided,
    envIntensity,
    envRotationDeg,
    showHdriBg,
    toneMapping,
    exposure,
    renderResolution,
    transparentBg,
    selectedMeshId,
    toolMode,
    selectedMatId,
    customMatColor,
    brushColor,
    brushSize,
    playMode,
    physicsActive,
    bloomEnabled,
    bloomStrength,
    hideDefaultBase,
    sculptRadius,
    sculptStrength,
    sculptMirrorX,
    uvMargin: config.uvMargin ?? 0.02,
    seamAngleDeg: config.seamAngleDeg ?? 66,
    animEndFrame: config.animEndFrame,
    cameraLensMm,
    rotationMode,
    camTransitioning: false,
    camTarget: 'q34' as CameraPreset,
  });

  stateRef.current.shadingMode = shadingMode;
  stateRef.current.isPlaying = isPlaying;
  stateRef.current.roughnessOverride = roughnessOverride;
  stateRef.current.metalnessOverride = metalnessOverride;
  stateRef.current.normalStrength = config.normalStrength;
  stateRef.current.outlineThickness = config.outlineThickness;
  stateRef.current.rigPreset = config.rigPreset;
  stateRef.current.textureResolution = config.textureResolution;
  stateRef.current.showSkeleton = showSkeleton;
  stateRef.current.showGrid = showGrid;
  stateRef.current.wireframeMode = wireframeMode;
  stateRef.current.doubleSided = doubleSided;
  stateRef.current.envIntensity = envIntensity;
  stateRef.current.envRotationDeg = envRotationDeg;
  stateRef.current.showHdriBg = showHdriBg;
  stateRef.current.toneMapping = toneMapping;
  stateRef.current.exposure = exposure;
  stateRef.current.renderResolution = renderResolution;
  stateRef.current.transparentBg = transparentBg;
  stateRef.current.selectedMeshId = selectedMeshId;
  stateRef.current.toolMode = toolMode;
  stateRef.current.selectedMatId = selectedMatId;
  stateRef.current.customMatColor = customMatColor;
  stateRef.current.brushColor = brushColor;
  stateRef.current.brushSize = brushSize;
  stateRef.current.playMode = playMode;
  stateRef.current.physicsActive = physicsActive;
  stateRef.current.bloomEnabled = bloomEnabled;
  stateRef.current.bloomStrength = bloomStrength;
  stateRef.current.hideDefaultBase = hideDefaultBase;
  stateRef.current.sculptRadius = sculptRadius;
  stateRef.current.sculptStrength = sculptStrength;
  stateRef.current.sculptMirrorX = sculptMirrorX;
  stateRef.current.uvMargin = config.uvMargin ?? 0.02;
  stateRef.current.seamAngleDeg = config.seamAngleDeg ?? 66;
  stateRef.current.animEndFrame = config.animEndFrame;
  stateRef.current.cameraLensMm = cameraLensMm;
  stateRef.current.rotationMode = rotationMode;

  const [turntableEnabled, setTurntableEnabled] = useState(false);
  const turntableRef = useRef(false);
  turntableRef.current = turntableEnabled;
  const dropToFloorRef = useRef<(() => void) | null>(null);
  const bakeAoCurvatureRef = useRef<(() => void) | null>(null);
  const undoSceneRef = useRef<(() => void) | null>(null);
  const redoSceneRef = useRef<(() => void) | null>(null);
  const [mographConfig, setMographConfig] = useState<MoGraphConfig>(DEFAULT_MOGRAPH_CONFIG);
  const mographConfigRef = useRef<MoGraphConfig>(DEFAULT_MOGRAPH_CONFIG);
  mographConfigRef.current = mographConfig;
  const applyMoGraphRef = useRef<(() => void) | null>(null);
  const clearMoGraphRef = useRef<(() => void) | null>(null);
  const [morphTargets, setMorphTargets] = useState<{ name: string; value: number }[]>([]);
  const setMorphTargetWeightRef = useRef<((name: string, value: number) => void) | null>(null);
  const [animPrinciples, setAnimPrinciples] = useState<AnimationPrinciplesConfig>(
    DEFAULT_ANIMATION_PRINCIPLES
  );
  const animPrinciplesRef = useRef<AnimationPrinciplesConfig>(DEFAULT_ANIMATION_PRINCIPLES);
  animPrinciplesRef.current = animPrinciples;
  const runMeshModelingOpRef = useRef<((op: MeshModelingOp, strength?: number) => void) | null>(null);
  const [deformStrength, setDeformStrength] = useState(0.35);
  // Etapa 9: Simulação & FX (Vento + Partículas 3D)
  const [windEnabled, setWindEnabled] = useState(false);
  const [windStrength, setWindStrength] = useState(0.35);
  const [particlesEnabled, setParticlesEnabled] = useState(false);
  const windEnabledRef = useRef(false);
  windEnabledRef.current = windEnabled;
  const windStrengthRef = useRef(0.35);
  windStrengthRef.current = windStrength;
  const particlesEnabledRef = useRef(false);
  particlesEnabledRef.current = particlesEnabled;
  // Etapa 11: Composição & Pós-FX (Color Grading ao vivo)
  const [gradeContrast, setGradeContrast] = useState(1.0);
  const [gradeSaturation, setGradeSaturation] = useState(1.0);
  const [gradeBrightness, setGradeBrightness] = useState(1.0);
  const [gradeHueDeg, setGradeHueDeg] = useState(0);

  const requestRenderRef = useRef<(() => void) | null>(null);
  const applyMaterialsRef = useRef<(() => void) | null>(null);
  const applyFramePoseRef = useRef<((frame: number) => void) | null>(null);
  const rebuildRigPreviewRef = useRef<((preset: RigPreset) => void) | null>(null);
  const applyMaterialToAllRef = useRef<(() => void) | null>(null);
  const applyProceduralBundleRef = useRef<((params: ProceduralPbrParams) => void) | null>(null);
  const applySubstanceBundleRef = useRef<((req: SubstanceTextureSetRequest) => void) | null>(null);
  const loadPbrChannelTextureRef = useRef<
    ((channel: 'map' | 'roughnessMap' | 'metalnessMap' | 'normalMap' | 'aoMap', file: File) => void) | null
  >(null);
  const loadCustomTextureFileRef = useRef<((file: File) => void) | null>(null);
  const clearPaintTexturesRef = useRef<(() => void) | null>(null);
  const undoPaintRef = useRef<(() => void) | null>(null);
  const undoSculptRef = useRef<(() => void) | null>(null);
  const generateRigAndAnimRef = useRef<(() => void) | null>(null);
  const generateAutoUvRef = useRef<(() => void) | null>(null);
  const exportZipRef = useRef<(() => void) | null>(null);
  const loadFilesRef = useRef<((files: FileList | File[]) => void) | null>(null);
  const loadSampleRef = useRef<(() => void) | null>(null);
  const exportModelRef = useRef<((format: 'glb' | 'gltf') => void) | null>(null);
  const verifyCurrentSceneRef = useRef<(() => void) | null>(null);
  const resetAssetRef = useRef<(() => void) | null>(null);
  const selectClipRef = useRef<((idx: number) => void) | null>(null);
  const scrubUploadedTimeRef = useRef<((normalized: number) => void) | null>(null);
  const frameSceneRef = useRef<(() => void) | null>(null);
  const focusMeshByIdRef = useRef<((id: string) => void) | null>(null);
  const toggleMeshVisibilityRef = useRef<((id: string) => void) | null>(null);
  const showAllMeshesRef = useRef<(() => void) | null>(null);
  const selectHdriRef = useRef<((id: HdriEnvironmentId) => void) | null>(null);
  const loadCustomHdriRef = useRef<((file: File) => void) | null>(null);
  const syncLightsRef = useRef<((specs: StudioLightSpec[]) => void) | null>(null);
  const syncRendererSettingsRef = useRef<(() => void) | null>(null);
  const renderStudioPngRef = useRef<(() => void) | null>(null);

  const addPrimitiveRef = useRef<((kind: PrimitiveShapeKind) => void) | null>(null);
  const applyTemplateRef = useRef<((templateId: SplineTemplateId) => void) | null>(null);
  const runBooleanRef = useRef<((op: BooleanOperation) => void) | null>(null);
  const updateObjectTransformRef = useRef<
    ((group: 'position' | 'rotationDeg' | 'scale', idx: 0 | 1 | 2, val: number) => void) | null
  >(null);
  const updateObjectMaterialRef = useRef<
    ((patch: {
      materialStyle?: SplineMaterialStyle;
      color?: string;
      roughness?: number;
      metalness?: number;
      transmission?: number;
      emissiveIntensity?: number;
    }) => void) | null
  >(null);
  const updateObjectInteractionRef = useRef<((interaction: SplineInteractionType) => void) | null>(null);
  const toggleObjectPhysicsRef = useRef<((enabled: boolean) => void) | null>(null);
  const applyVideoTextureRef = useRef<((file: File) => void) | null>(null);
  const duplicateSelectedRef = useRef<(() => void) | null>(null);
  const deleteSelectedRef = useRef<(() => void) | null>(null);
  const deleteMeshByIdRef = useRef<((id: string | null) => void) | null>(null);
  const saveProjectRef = useRef<((silent?: boolean) => Promise<void>) | null>(null);
  const exportGlbBlobRef = useRef<(() => Promise<Blob | null>) | null>(null);
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const scheduleAutoSaveRef = useRef<(() => void) | null>(null);
  const selectObjectByIdRef = useRef<((id: string | null) => void) | null>(null);
  const selectUploadedRootRef = useRef<(() => void) | null>(null);
  const openCodeExportRef = useRef<(() => void) | null>(null);
  const syncSplineModeRef = useRef<(() => void) | null>(null);
  const subdivideMeshRef = useRef<(() => void) | null>(null);
  const retopoMeshRef = useRef<((ratio: number) => void) | null>(null);
  const weldMeshRef = useRef<(() => void) | null>(null);
  const runGeoArrayRef = useRef<(() => void) | null>(null);
  const insertKeyframeRef = useRef<(() => void) | null>(null);
  const jumpKeyframeRef = useRef<
    ((kf: {
      frame: number;
      pos: [number, number, number];
      rot: [number, number, number];
      scl: [number, number, number];
    }) => void) | null
  >(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    setWebglError(null);
    let cleanupFn: (() => void) | null = null;
    let renderer: THREE.WebGLRenderer | null = null;

    try {
      const isSoftwareGl = (() => {
        try {
          const probe =
            document.createElement('canvas').getContext('webgl2') ||
            document.createElement('canvas').getContext('webgl');
          if (!probe) return true;
          const ext = probe.getExtension('WEBGL_debug_renderer_info');
          const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
          const gpu = String(probe.getParameter(param) || '');
          probe.getExtension('WEBGL_lose_context')?.loseContext();
          return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
        } catch {
          return false;
        }
      })();

      const width = container.clientWidth || 960;
      const height = container.clientHeight || 600;

      const rendererAttempts: THREE.WebGLRendererParameters[] = [
        { antialias: !isSoftwareGl, powerPreference: 'high-performance' },
        { antialias: false, powerPreference: 'default' },
        { antialias: false },
      ];
      let lastRendererErr: unknown = null;
      for (const opts of rendererAttempts) {
        try {
          renderer = new THREE.WebGLRenderer(opts);
          break;
        } catch (err) {
          lastRendererErr = err;
        }
      }
      if (!renderer) {
        throw lastRendererErr instanceof Error
          ? lastRendererErr
          : new Error('Não foi possível criar o contexto WebGL 3D neste navegador.');
      }

      const activeRenderer = renderer;
      activeRenderer.outputColorSpace = THREE.SRGBColorSpace;
      activeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      activeRenderer.toneMappingExposure = 1.1;
      activeRenderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      activeRenderer.setSize(width, height, false);
      activeRenderer.domElement.style.display = 'block';
      activeRenderer.domElement.style.width = '100%';
      activeRenderer.domElement.style.height = '100%';
      activeRenderer.shadowMap.enabled = !isSoftwareGl;
      activeRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.replaceChildren(activeRenderer.domElement);

      const onContextLost = (e: Event) => {
        e.preventDefault();
        setContextLost(true);
      };
      const onContextRestored = () => {
        setContextLost(false);
        requestRenderRef.current?.();
      };
      activeRenderer.domElement.addEventListener('webglcontextlost', onContextLost);
      activeRenderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0d1017);
      scene.fog = new THREE.Fog(0x0d1017, 4.8, 13.5);

      const pmremGenerator = new THREE.PMREMGenerator(activeRenderer);
      let envTexture: THREE.Texture | null = null;
      try {
        const roomEnv = new RoomEnvironment();
        envTexture = pmremGenerator.fromScene(roomEnv, 0.04).texture;
        roomEnv.dispose();
        scene.environment = envTexture;
      } catch {
        envTexture = null;
      }

      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('./libs/draco/');
      const ktx2Loader = new KTX2Loader();
      ktx2Loader.setTranscoderPath('./libs/basis/');
      try {
        ktx2Loader.detectSupport(activeRenderer);
      } catch {
        // Ignore KTX2 capability detection fallback
      }

    const buildConfiguredGltfLoader = (manager?: THREE.LoadingManager) => {
      const loader = new GLTFLoader(manager);
      loader.setDRACOLoader(dracoLoader);
      loader.setKTX2Loader(ktx2Loader);
      loader.setMeshoptDecoder(MeshoptDecoder);
      return loader;
    };

    const userLightsGroup = new THREE.Group();
    userLightsGroup.name = 'Luzes_Estudio';
    scene.add(userLightsGroup);

    const setEnvironmentTexture = (tex: THREE.Texture | null) => {
      if (envTexture) {
        envTexture.dispose();
      }
      envTexture = tex;
      scene.environment = tex;
      scene.environmentIntensity = stateRef.current.envIntensity;
      scene.background = stateRef.current.showHdriBg && tex ? tex : new THREE.Color(0x0d1017);
    };

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(...CAMERA_PRESETS.q34.pos);

    const controls = new OrbitControls(camera, activeRenderer.domElement);
    controls.target.set(...CAMERA_PRESETS.q34.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.5;
    controls.maxDistance = 12.0;
    controls.maxPolarAngle = Math.PI * 0.55;
    controls.update();

    controls.addEventListener('start', () => {
      stateRef.current.camTransitioning = false;
    });

    const studioObjectsGroup = new THREE.Group();
    studioObjectsGroup.name = 'Objetos_Spline';
    scene.add(studioObjectsGroup);

    const transformControls = new TransformControls(camera, activeRenderer.domElement);
    const transformHelper = transformControls.getHelper();
    scene.add(transformHelper);
    const historyManager = new SceneHistoryManager(40);
    const mographGroup = new THREE.Group();
    mographGroup.name = 'MoGraph_Cloner';
    scene.add(mographGroup);
    let mographEntries: MoGraphCloneEntry[] = [];

    // Etapa 9: Campo de partículas atmosféricas 3D (GPU Points)
    const particleCount = 240;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 6.5;
      particlePositions[i * 3 + 1] = Math.random() * 3.8 + 0.1;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 6.5;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfdba74,
      size: 0.032,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const fxParticles = new THREE.Points(particleGeo, particleMat);
    fxParticles.name = 'FX_Particles';
    fxParticles.visible = false;
    scene.add(fxParticles);
    let dragBeforeSnapshot: ObjectTransformSnapshot | null = null;
    transformControls.addEventListener('dragging-changed', (ev) => {
      const isDraggingNow = Boolean((ev as { value?: unknown }).value);
      controls.enabled = !isDraggingNow;
      if (isDraggingNow && transformControls.object) {
        dragBeforeSnapshot = captureObjectSnapshot(transformControls.object);
      } else if (!isDraggingNow && transformControls.object && dragBeforeSnapshot) {
        const afterSnap = captureObjectSnapshot(transformControls.object);
        historyManager.push({
          label: `Transformar ${transformControls.object.name || 'Objeto'}`,
          before: [dragBeforeSnapshot],
          after: [afterSnap],
        });
        dragBeforeSnapshot = null;
        scheduleAutoSaveRef.current?.();
      }
      requestRenderRef.current?.();
    });

    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    try {
      composer = new EffectComposer(activeRenderer);
      composer.setSize(width, height);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.35, 0.85);
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    } catch {
      composer = null;
      bloomPass = null;
    }

    // Three-point studio rig + dedicated back fill for Costas view
    const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.3);
    keyLight.position.set(2.6, 4.2, 2.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.left = -1.8;
    keyLight.shadow.camera.right = 1.8;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -0.4;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.35);
    rimLight.position.set(-2.4, 2.2, -2.6);
    scene.add(rimLight);

    const backFillLight = new THREE.DirectionalLight(0xfff7ed, 0.95);
    backFillLight.position.set(1.8, 2.1, -2.8);
    scene.add(backFillLight);

    // Studio floor & subtle grid (smooth fog falloff eliminates hard circular edge)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0e121b,
      roughness: 0.95,
      metalness: 0.0,
      envMapIntensity: 0.2,
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(8, 32, 0x334155, 0x1b2230);
    grid.position.y = 0.003;
    scene.add(grid);

    const contactShadowTex = createContactShadowTexture();
    const contactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 1.1),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      })
    );
    contactPlane.rotation.x = -Math.PI / 2;
    contactPlane.position.y = 0.006;
    scene.add(contactPlane);

    // Procedural textures
    const maxAniso = activeRenderer.capabilities.getMaxAnisotropy();
    const checkerTex = createUvCheckerTexture(maxAniso);
    const fabricNormalTex = createProceduralFabricNormalTexture(maxAniso);
    const toonGradTex = createToonGradient();

    // Internal reference group (kept hidden so only DamagedHelmet.glb / user GLB loads by default)
    const characterRoot = new THREE.Group();
    characterRoot.visible = false;
    scene.add(characterRoot);

    interface PaintCanvasState {
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      tex: THREE.CanvasTexture;
    }

    interface PartEntry {
      mesh: THREE.Mesh;
      groupType: 'humanoid' | 'quadruped';
      baseColor: number;
      baseRoughness: number;
      baseMetalness: number;
      clearcoat: number;
      useNormal: boolean;
      outlineMesh: THREE.Mesh;
      customMap: THREE.Texture | null;
      pbrMaps: Partial<Record<'roughnessMap' | 'metalnessMap' | 'normalMap' | 'aoMap' | 'emissiveMap' | 'alphaMap', THREE.Texture | null>>;
      paintData: PaintCanvasState | null;
    }
    const parts: PartEntry[] = [];

    const outlineBaseMat = new THREE.MeshBasicMaterial({
      color: 0x090b10,
      side: THREE.BackSide,
    });

    function registerPart(
      geo: THREE.BufferGeometry,
      name: string,
      baseColor: number,
      baseRoughness: number,
      baseMetalness: number,
      clearcoat = 0,
      useNormal = true,
      groupType: 'humanoid' | 'quadruped' = 'humanoid'
    ): THREE.Mesh {
      geo.computeVertexNormals();
      if (geo.attributes.uv) {
        if (!geo.attributes.uv1) geo.setAttribute('uv1', geo.attributes.uv);
        if (!geo.attributes.uv2) geo.setAttribute('uv2', geo.attributes.uv);
      }
      const mat = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        roughness: baseRoughness,
        metalness: baseMetalness,
        clearcoat,
        normalMap: useNormal ? fabricNormalTex : null,
        normalScale: new THREE.Vector2(1, 1),
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = name;
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;

      const outlineMesh = new THREE.Mesh(geo, outlineBaseMat);
      outlineMesh.scale.setScalar(1.03);
      outlineMesh.visible = false;
      mesh.add(outlineMesh);

      parts.push({
        mesh,
        groupType,
        baseColor,
        baseRoughness,
        baseMetalness,
        clearcoat,
        useNormal,
        outlineMesh,
        customMap: null,
        pbrMaps: {},
        paintData: null,
      });
      return mesh;
    }

    // Rig pivots matching 21-bone hierarchy
    const pelvisPivot = new THREE.Group();
    pelvisPivot.position.set(0, 0.88, 0);
    characterRoot.add(pelvisPivot);

    const spinePivot = new THREE.Group();
    spinePivot.position.set(0, 0.08, 0);
    pelvisPivot.add(spinePivot);

    const jacketMesh = registerPart(
      new THREE.CylinderGeometry(0.14, 0.16, 0.36, 20, 4),
      'Jacket',
      0x273549,
      0.82,
      0.04,
      0,
      true
    );
    jacketMesh.position.set(0, 0.2, 0);
    spinePivot.add(jacketMesh);

    const zipperMesh = registerPart(
      new THREE.BoxGeometry(0.028, 0.34, 0.03),
      'Zipper',
      0xe2e8f0,
      0.16,
      0.95,
      0.6,
      false
    );
    zipperMesh.position.set(0, 0.2, 0.15);
    spinePivot.add(zipperMesh);

    const beltBuckle = registerPart(
      new THREE.TorusGeometry(0.035, 0.008, 10, 20),
      'ZipperBuckle',
      0xf59e0b,
      0.18,
      0.94,
      0.7,
      false
    );
    beltBuckle.position.set(0, 0.03, 0.162);
    spinePivot.add(beltBuckle);

    const skirtPts = [
      new THREE.Vector2(0.155, 0.06),
      new THREE.Vector2(0.19, -0.05),
      new THREE.Vector2(0.25, -0.22),
      new THREE.Vector2(0.27, -0.26),
    ];
    const skirtMesh = registerPart(
      new THREE.LatheGeometry(skirtPts, 24),
      'Skirt',
      0x273549,
      0.72,
      0.05,
      0,
      true
    );
    skirtMesh.position.set(0, 0.02, 0);
    pelvisPivot.add(skirtMesh);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.42, 0);
    spinePivot.add(headPivot);

    const neckMesh = registerPart(
      new THREE.CylinderGeometry(0.045, 0.052, 0.09, 14),
      'Body_Neck',
      0xf3d2c1,
      0.55,
      0.0,
      0.08,
      false
    );
    neckMesh.position.set(0, 0.03, 0);
    headPivot.add(neckMesh);

    const headMesh = registerPart(
      new THREE.SphereGeometry(0.135, 24, 20),
      'Head',
      0xf5d7c6,
      0.52,
      0.0,
      0.1,
      false
    );
    headMesh.position.set(0, 0.16, 0.01);
    headMesh.scale.set(0.95, 1.05, 0.98);
    headPivot.add(headMesh);

    const hairPivot = new THREE.Group();
    hairPivot.position.set(0, 0.18, 0);
    headPivot.add(hairPivot);

    const hairCrown = registerPart(
      new THREE.SphereGeometry(0.148, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65),
      'Hair_Crown',
      0x3b2a4a,
      0.42,
      0.05,
      0.45,
      true
    );
    hairCrown.rotation.x = -0.22;
    hairPivot.add(hairCrown);

    const hairLockL = registerPart(
      new THREE.ConeGeometry(0.052, 0.34, 12),
      'Hair_Lock_L',
      0x3b2a4a,
      0.42,
      0.05,
      0.45,
      true
    );
    hairLockL.position.set(0.12, -0.1, -0.05);
    hairLockL.rotation.z = 0.22;
    hairLockL.rotation.x = 0.15;
    hairPivot.add(hairLockL);

    const hairLockR = registerPart(
      new THREE.ConeGeometry(0.052, 0.34, 12),
      'Hair_Lock_R',
      0x3b2a4a,
      0.42,
      0.05,
      0.45,
      true
    );
    hairLockR.position.set(-0.12, -0.1, -0.05);
    hairLockR.rotation.z = -0.22;
    hairLockR.rotation.x = 0.15;
    hairPivot.add(hairLockR);

    const armLPivot = new THREE.Group();
    armLPivot.position.set(0.175, 0.35, 0);
    spinePivot.add(armLPivot);

    const upperArmL = registerPart(
      new THREE.CapsuleGeometry(0.042, 0.22, 8, 14),
      'Jacket_Arm_L',
      0x2d3c52,
      0.8,
      0.04,
      0,
      true
    );
    upperArmL.position.set(0, -0.14, 0);
    armLPivot.add(upperArmL);

    const forearmLPivot = new THREE.Group();
    forearmLPivot.position.set(0, -0.28, 0);
    armLPivot.add(forearmLPivot);

    const forearmL = registerPart(
      new THREE.CapsuleGeometry(0.035, 0.2, 8, 14),
      'Body_Forearm_L',
      0xf3d2c1,
      0.55,
      0.0,
      0.08,
      false
    );
    forearmL.position.set(0, -0.12, 0);
    forearmLPivot.add(forearmL);

    const armRPivot = new THREE.Group();
    armRPivot.position.set(-0.175, 0.35, 0);
    spinePivot.add(armRPivot);

    const upperArmR = registerPart(
      new THREE.CapsuleGeometry(0.042, 0.22, 8, 14),
      'Jacket_Arm_R',
      0x2d3c52,
      0.8,
      0.04,
      0,
      true
    );
    upperArmR.position.set(0, -0.14, 0);
    armRPivot.add(upperArmR);

    const forearmRPivot = new THREE.Group();
    forearmRPivot.position.set(0, -0.28, 0);
    armRPivot.add(forearmRPivot);

    const forearmR = registerPart(
      new THREE.CapsuleGeometry(0.035, 0.2, 8, 14),
      'Body_Forearm_R',
      0xf3d2c1,
      0.55,
      0.0,
      0.08,
      false
    );
    forearmR.position.set(0, -0.12, 0);
    forearmRPivot.add(forearmR);

    const thighLPivot = new THREE.Group();
    thighLPivot.position.set(0.085, -0.02, 0);
    pelvisPivot.add(thighLPivot);

    const legL = registerPart(
      new THREE.CapsuleGeometry(0.052, 0.34, 8, 14),
      'Body_Leg_L',
      0xf3d2c1,
      0.55,
      0.0,
      0.08,
      false
    );
    legL.position.set(0, -0.22, 0);
    thighLPivot.add(legL);

    const bootL = registerPart(
      new THREE.CylinderGeometry(0.058, 0.066, 0.42, 16),
      'Boot_L',
      0x1f2735,
      0.38,
      0.12,
      0.35,
      true
    );
    bootL.position.set(0, -0.64, 0.01);
    thighLPivot.add(bootL);

    const thighRPivot = new THREE.Group();
    thighRPivot.position.set(-0.085, -0.02, 0);
    pelvisPivot.add(thighRPivot);

    const legR = registerPart(
      new THREE.CapsuleGeometry(0.052, 0.34, 8, 14),
      'Body_Leg_R',
      0xf3d2c1,
      0.55,
      0.0,
      0.08,
      false
    );
    legR.position.set(0, -0.22, 0);
    thighRPivot.add(legR);

    const bootR = registerPart(
      new THREE.CylinderGeometry(0.058, 0.066, 0.42, 16),
      'Boot_R',
      0x1f2735,
      0.38,
      0.12,
      0.35,
      true
    );
    bootR.position.set(0, -0.64, 0.01);
    thighRPivot.add(bootR);

    // Quadruped articulated reference asset (visible when rigPreset === 'QUADRUPEDE')
    const quadrupedRoot = new THREE.Group();
    quadrupedRoot.visible = false;
    scene.add(quadrupedRoot);

    const quadPelvisPivot = new THREE.Group();
    quadPelvisPivot.position.set(0, 0.78, 0);
    quadrupedRoot.add(quadPelvisPivot);

    const quadTorsoMesh = registerPart(
      new THREE.CapsuleGeometry(0.18, 0.62, 10, 18),
      'Quad_Torso',
      0x334155,
      0.72,
      0.06,
      0,
      true,
      'quadruped'
    );
    quadTorsoMesh.rotation.x = Math.PI / 2;
    quadTorsoMesh.position.set(0, 0.04, 0);
    quadPelvisPivot.add(quadTorsoMesh);

    const quadCollarMesh = registerPart(
      new THREE.TorusGeometry(0.16, 0.025, 10, 22),
      'Quad_Collar',
      0xf59e0b,
      0.22,
      0.88,
      0.5,
      false,
      'quadruped'
    );
    quadCollarMesh.position.set(0, 0.08, 0.36);
    quadPelvisPivot.add(quadCollarMesh);

    const quadNeckPivot = new THREE.Group();
    quadNeckPivot.position.set(0, 0.1, 0.44);
    quadPelvisPivot.add(quadNeckPivot);

    const quadNeckMesh = registerPart(
      new THREE.CylinderGeometry(0.085, 0.115, 0.28, 16),
      'Quad_Neck',
      0x475569,
      0.68,
      0.04,
      0,
      true,
      'quadruped'
    );
    quadNeckMesh.position.set(0, 0.11, 0.08);
    quadNeckMesh.rotation.x = 0.55;
    quadNeckPivot.add(quadNeckMesh);

    const quadHeadMesh = registerPart(
      new THREE.BoxGeometry(0.18, 0.16, 0.28),
      'Quad_Head',
      0x475569,
      0.6,
      0.04,
      0.05,
      true,
      'quadruped'
    );
    quadHeadMesh.position.set(0, 0.24, 0.24);
    quadNeckPivot.add(quadHeadMesh);

    const quadEarL = registerPart(
      new THREE.ConeGeometry(0.042, 0.12, 8),
      'Quad_Ear_L',
      0x1e293b,
      0.5,
      0.08,
      0,
      false,
      'quadruped'
    );
    quadEarL.position.set(0.065, 0.35, 0.17);
    quadNeckPivot.add(quadEarL);

    const quadEarR = registerPart(
      new THREE.ConeGeometry(0.042, 0.12, 8),
      'Quad_Ear_R',
      0x1e293b,
      0.5,
      0.08,
      0,
      false,
      'quadruped'
    );
    quadEarR.position.set(-0.065, 0.35, 0.17);
    quadNeckPivot.add(quadEarR);

    const quadTailPivot = new THREE.Group();
    quadTailPivot.position.set(0, 0.04, -0.44);
    quadPelvisPivot.add(quadTailPivot);

    const quadTailMesh = registerPart(
      new THREE.ConeGeometry(0.045, 0.42, 12),
      'Quad_Tail',
      0x334155,
      0.65,
      0.05,
      0,
      true,
      'quadruped'
    );
    quadTailMesh.rotation.x = -Math.PI * 0.58;
    quadTailMesh.position.set(0, 0.04, -0.2);
    quadTailPivot.add(quadTailMesh);

    function createQuadLeg(namePrefix: string, x: number, z: number) {
      const hipPivot = new THREE.Group();
      hipPivot.position.set(x, -0.04, z);
      quadPelvisPivot.add(hipPivot);

      const leg = registerPart(
        new THREE.CapsuleGeometry(0.052, 0.48, 8, 14),
        `${namePrefix}_Leg`,
        0x334155,
        0.72,
        0.04,
        0,
        true,
        'quadruped'
      );
      leg.position.set(0, -0.32, 0);
      hipPivot.add(leg);

      const paw = registerPart(
        new THREE.SphereGeometry(0.064, 14, 12),
        `${namePrefix}_Paw`,
        0x141820,
        0.35,
        0.12,
        0.3,
        false,
        'quadruped'
      );
      paw.scale.set(1, 0.7, 1.35);
      paw.position.set(0, -0.69, 0.03);
      hipPivot.add(paw);
      return hipPivot;
    }

    const quadFrontLegL = createQuadLeg('Quad_Front_L', 0.15, 0.38);
    const quadFrontLegR = createQuadLeg('Quad_Front_R', -0.15, 0.38);
    const quadHindLegL = createQuadLeg('Quad_Hind_L', 0.15, -0.38);
    const quadHindLegR = createQuadLeg('Quad_Hind_R', -0.15, -0.38);

    // 3D Reference Rig Skeleton Preview Group (Humanoide / Bipede / Quadrupede)
    const refSkeletonGroup = new THREE.Group();
    refSkeletonGroup.visible = false;
    scene.add(refSkeletonGroup);

    const boneVisualMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    const jointVisualMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });

    function clearRefSkeleton() {
      while (refSkeletonGroup.children.length > 0) {
        const child = refSkeletonGroup.children[0] as THREE.Mesh;
        refSkeletonGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
      }
    }

    function rebuildRefSkeleton(preset: RigPreset) {
      clearRefSkeleton();
      const def = RIG_PRESET_DEFINITIONS[preset] || RIG_PRESET_DEFINITIONS.OBJETO;
      const upVec = new THREE.Vector3(0, 1, 0);

      for (const [, , headB, tailB] of def.bones) {
        // Convert Blender Z-up (x, y, z) -> Three.js Y-up (x, z, -y)
        const pHead = new THREE.Vector3(headB[0], headB[2], -headB[1]);
        const pTail = new THREE.Vector3(tailB[0], tailB[2], -tailB[1]);
        const dir = new THREE.Vector3().subVectors(pTail, pHead);
        const len = dir.length();

        const joint = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), jointVisualMat);
        joint.position.copy(pHead);
        joint.renderOrder = 20;
        refSkeletonGroup.add(joint);

        if (len > 0.005) {
          const boneGeo = new THREE.ConeGeometry(0.024, len, 6);
          boneGeo.translate(0, len / 2, 0);
          const boneMesh = new THREE.Mesh(boneGeo, boneVisualMat);
          boneMesh.position.copy(pHead);
          boneMesh.quaternion.setFromUnitVectors(upVec, dir.clone().normalize());
          boneMesh.renderOrder = 19;
          refSkeletonGroup.add(boneMesh);
        }
      }
    }

    rebuildRefSkeleton(stateRef.current.rigPreset);

    const normalMat = new THREE.MeshNormalMaterial();
    const matcapClayTex = createMatcapTexture('clay');
    const matcapChromeTex = createMatcapTexture('chrome');
    const matcapRedwaxTex = createMatcapTexture('redwax');
    const matcapClayMat = new THREE.MeshMatcapMaterial({ matcap: matcapClayTex });
    const matcapChromeMat = new THREE.MeshMatcapMaterial({ matcap: matcapChromeTex });
    const matcapRedwaxMat = new THREE.MeshMatcapMaterial({ matcap: matcapRedwaxTex });
    const isSharedOverrideMat = (m: THREE.Material | THREE.Material[]) =>
      m === normalMat || m === matcapClayMat || m === matcapChromeMat || m === matcapRedwaxMat;
    const uvCheckerFallbackMat = new THREE.MeshStandardMaterial({
      map: checkerTex,
      roughness: 0.65,
      metalness: 0.05,
    });

    // Uploaded GLB / glTF tracking
    interface UploadedMeshRecord {
      mesh: THREE.Mesh;
      materialName: string;
      origMat: THREE.Material | THREE.Material[];
      origRoughness: number[];
      origMetalness: number[];
      origNormalScale: THREE.Vector2[];
      origColorHex: number[];
      origMap: (THREE.Texture | null)[];
      origRoughnessMap: (THREE.Texture | null)[];
      origMetalnessMap: (THREE.Texture | null)[];
      origNormalMap: (THREE.Texture | null)[];
      origAoMap: (THREE.Texture | null)[];
      origEmissiveMap: (THREE.Texture | null)[];
      origAlphaMap: (THREE.Texture | null)[];
      customMap: THREE.Texture | null;
      pbrMaps: Partial<Record<'roughnessMap' | 'metalnessMap' | 'normalMap' | 'aoMap' | 'emissiveMap' | 'alphaMap', THREE.Texture | null>>;
      paintData: PaintCanvasState | null;
      outlineMesh: THREE.Mesh | null;
      toonMat: THREE.MeshToonMaterial | null;
    }

    let uploadedGroup: THREE.Group | null = null;
    let uploadedSkeletonHelper: THREE.SkeletonHelper | null = null;
    let uploadedMixer: THREE.AnimationMixer | null = null;
    let uploadedClips: THREE.AnimationClip[] = [];
    let uploadedActions: THREE.AnimationAction[] = [];
    let activeUploadedClipIdx = 0;
    let uploadedRecords: UploadedMeshRecord[] = [];
    let activeObjectUrls: string[] = [];
    let lastContainerCheck: ContainerCheckResult | null = null;
    let sharedUploadedCustomTex: THREE.Texture | null = null;
    let activeProceduralBundle: ThreePbrTextureBundle | null = null;
    let glbImportSerialCounter = 0;
    let currentGlbImportSerial = 0;
    const manualChannelTextures: Partial<Record<'roughnessMap' | 'metalnessMap' | 'normalMap' | 'aoMap', THREE.Texture>> = {};

    const paintUndoStack: { mesh: THREE.Mesh; imageData: ImageData }[] = [];

    function pushPaintUndoSnapshot(mesh: THREE.Mesh, paintState: PaintCanvasState) {
      try {
        const snap = paintState.ctx.getImageData(0, 0, paintState.canvas.width, paintState.canvas.height);
        paintUndoStack.push({ mesh, imageData: snap });
        if (paintUndoStack.length > 25) {
          paintUndoStack.shift();
        }
        setCanUndoPaint(paintUndoStack.length > 0);
      } catch {
        // Ignore readback failures
      }
    }

    function createPaintCanvas(baseColorHex: number, sourceTex: THREE.Texture | null): PaintCanvasState {
      const size = 1024;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = `#${baseColorHex.toString(16).padStart(6, '0')}`;
      ctx.fillRect(0, 0, size, size);

      if (sourceTex && sourceTex.image) {
        try {
          ctx.drawImage(sourceTex.image as CanvasImageSource, 0, 0, size, size);
        } catch {
          // Fallback to solid base color if cross-origin image blocks canvas readback
        }
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = sourceTex ? sourceTex.flipY : true;
      tex.anisotropy = maxAniso;
      tex.needsUpdate = true;
      return { canvas, ctx, tex };
    }

    function paintDabOnCanvas(
      paintData: PaintCanvasState,
      u: number,
      v: number,
      color: string,
      radiusPx: number
    ) {
      const size = paintData.canvas.width;
      const wrappedU = ((u % 1) + 1) % 1;
      const wrappedV = ((v % 1) + 1) % 1;
      const px = wrappedU * size;
      const py = paintData.tex.flipY ? (1 - wrappedV) * size : wrappedV * size;

      const ctx = paintData.ctx;
      const grad = ctx.createRadialGradient(px, py, radiusPx * 0.25, px, py, radiusPx);
      grad.addColorStop(0, color);
      grad.addColorStop(0.7, color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radiusPx, 0, Math.PI * 2);
      ctx.fill();
      paintData.tex.needsUpdate = true;
    }

    function getActiveMaterialSpec() {
      const preset =
        PBR_MATERIAL_LIBRARY.find((m) => m.id === stateRef.current.selectedMatId) || PBR_MATERIAL_LIBRARY[0];
      return {
        label: preset.label,
        colorHex: parseInt(stateRef.current.customMatColor.replace('#', ''), 16) || 0x334155,
        roughness: preset.roughness,
        metalness: preset.metalness,
        clearcoat: preset.clearcoat,
        useNormal: preset.useNormal,
      };
    }

    function disposeUploadedModel() {
      paintUndoStack.length = 0;
      setCanUndoPaint(false);
      setSelectedMeshId(null);

      if (uploadedMixer) {
        uploadedMixer.stopAllAction();
        uploadedMixer = null;
      }
      uploadedClips = [];
      uploadedActions = [];
      activeUploadedClipIdx = 0;
      lastContainerCheck = null;

      if (uploadedSkeletonHelper) {
        scene.remove(uploadedSkeletonHelper);
        uploadedSkeletonHelper.dispose();
        uploadedSkeletonHelper = null;
      }

      if (sharedUploadedCustomTex) {
        sharedUploadedCustomTex.dispose();
        sharedUploadedCustomTex = null;
      }

      for (const rec of uploadedRecords) {
        if (rec.outlineMesh) {
          rec.mesh.remove(rec.outlineMesh);
        }
        if (rec.toonMat) {
          rec.toonMat.dispose();
        }
        if (rec.paintData) {
          rec.paintData.tex.dispose();
        }
        if (Array.isArray(rec.origMat)) {
          rec.origMat.forEach(disposeMaterialTree);
        } else {
          disposeMaterialTree(rec.origMat);
        }
        rec.mesh.geometry.dispose();
      }
      uploadedRecords = [];

      if (uploadedGroup) {
        scene.remove(uploadedGroup);
        uploadedGroup = null;
      }

      for (const url of activeObjectUrls) {
        URL.revokeObjectURL(url);
      }
      activeObjectUrls = [];
    }

    function applyMaterialSettings() {
      const mode = stateRef.current.shadingMode;
      const rShift = stateRef.current.roughnessOverride - 0.55;
      const mShift = stateRef.current.metalnessOverride - 0.15;
      const nStrength = stateRef.current.normalStrength;
      const outlineScale = 1.015 + stateRef.current.outlineThickness * 2.5;
      const isQuad = stateRef.current.rigPreset === 'QUADRUPEDE';
      const sideMode = stateRef.current.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
      const wireMode = stateRef.current.wireframeMode;

      grid.visible = stateRef.current.showGrid;
      normalMat.side = sideMode;
      normalMat.wireframe = wireMode;
      matcapClayMat.side = sideMode;
      matcapClayMat.wireframe = wireMode;
      matcapChromeMat.side = sideMode;
      matcapChromeMat.wireframe = wireMode;
      matcapRedwaxMat.side = sideMode;
      matcapRedwaxMat.wireframe = wireMode;
      uvCheckerFallbackMat.side = sideMode;
      uvCheckerFallbackMat.wireframe = wireMode;

      const activeMatcapMat =
        mode === 'matcap_clay'
          ? matcapClayMat
          : mode === 'matcap_chrome'
          ? matcapChromeMat
          : mode === 'matcap_redwax'
          ? matcapRedwaxMat
          : null;

      if (!uploadedGroup && !stateRef.current.hideDefaultBase) {
        characterRoot.visible = !isQuad;
        quadrupedRoot.visible = isQuad;
      } else {
        characterRoot.visible = false;
        quadrupedRoot.visible = false;
      }

      // 1. Default composite humanoid & quadruped parts
      for (const p of parts) {
        p.outlineMesh.visible = mode === 'cel_borde';
        p.outlineMesh.scale.setScalar(outlineScale);

        const activeMap = p.paintData?.tex || p.customMap || null;

        if (mode === 'normals') {
          p.mesh.material = normalMat;
          continue;
        }
        if (activeMatcapMat) {
          p.mesh.material = activeMatcapMat;
          continue;
        }

        if (mode === 'cel_borde') {
          if (!(p.mesh.material instanceof THREE.MeshToonMaterial)) {
            if (!isSharedOverrideMat(p.mesh.material) && !Array.isArray(p.mesh.material)) {
              p.mesh.material.dispose();
            }
            p.mesh.material = new THREE.MeshToonMaterial({
              color: activeMap ? 0xffffff : p.baseColor,
              map: activeMap,
              gradientMap: toonGradTex,
              side: sideMode,
              wireframe: wireMode,
            });
          } else {
            p.mesh.material.map = activeMap;
            p.mesh.material.color.setHex(activeMap ? 0xffffff : p.baseColor);
            p.mesh.material.side = sideMode;
            p.mesh.material.wireframe = wireMode;
            p.mesh.material.needsUpdate = true;
          }
          continue;
        }

        if (!(p.mesh.material instanceof THREE.MeshPhysicalMaterial)) {
          if (!isSharedOverrideMat(p.mesh.material) && !Array.isArray(p.mesh.material)) {
            p.mesh.material.dispose();
          }
          p.mesh.material = new THREE.MeshPhysicalMaterial({
            color: p.baseColor,
            roughness: p.baseRoughness,
            metalness: p.baseMetalness,
            clearcoat: p.clearcoat,
          });
        }

        const mat = p.mesh.material as THREE.MeshPhysicalMaterial;
        mat.side = sideMode;
        mat.wireframe = wireMode;
        if (mode === 'uv_checker') {
          mat.map = checkerTex;
          mat.color.setHex(0xffffff);
          mat.roughness = 0.65;
          mat.metalness = 0.05;
          mat.roughnessMap = null;
          mat.metalnessMap = null;
          mat.normalMap = null;
          mat.aoMap = null;
        } else {
          mat.map = activeMap;
          mat.color.setHex(activeMap ? 0xffffff : p.baseColor);
          mat.roughnessMap = p.pbrMaps.roughnessMap || null;
          mat.metalnessMap = p.pbrMaps.metalnessMap || null;
          mat.aoMap = p.pbrMaps.aoMap || null;
          mat.aoMapIntensity = p.pbrMaps.aoMap ? 1.0 : 0;
          mat.roughness = mat.roughnessMap ? 1.0 : THREE.MathUtils.clamp(p.baseRoughness + rShift, 0.05, 1.0);
          mat.metalness = mat.metalnessMap ? 1.0 : THREE.MathUtils.clamp(p.baseMetalness + mShift, 0.0, 1.0);
          mat.clearcoat = p.clearcoat;
          mat.normalMap = p.pbrMaps.normalMap || (p.useNormal ? fabricNormalTex : null);
          mat.normalScale.set(nStrength, nStrength);
          mat.emissiveMap = p.pbrMaps.emissiveMap || null;
          mat.emissive.setHex(p.pbrMaps.emissiveMap ? 0xffffff : 0x000000);
          mat.alphaMap = p.pbrMaps.alphaMap || null;
          mat.transparent = Boolean(p.pbrMaps.alphaMap);
        }
        mat.needsUpdate = true;
      }

      // 2. Uploaded GLB/glTF model
      for (const rec of uploadedRecords) {
        if (rec.outlineMesh) {
          rec.outlineMesh.visible = mode === 'cel_borde';
          rec.outlineMesh.scale.setScalar(outlineScale);
        }

        const overrideMap = rec.paintData?.tex || rec.customMap || null;

        if (mode === 'normals') {
          rec.mesh.material = normalMat;
        } else if (activeMatcapMat) {
          rec.mesh.material = activeMatcapMat;
        } else if (mode === 'uv_checker') {
          rec.mesh.material = uvCheckerFallbackMat;
        } else if (mode === 'cel_borde') {
          if (!rec.toonMat) {
            const firstOrig = Array.isArray(rec.origMat) ? rec.origMat[0] : rec.origMat;
            const std = firstOrig as THREE.MeshStandardMaterial;
            rec.toonMat = new THREE.MeshToonMaterial({
              color: overrideMap ? new THREE.Color(0xffffff) : std?.color ? std.color.clone() : new THREE.Color(0xffffff),
              map: overrideMap || std?.map || null,
              gradientMap: toonGradTex,
              side: sideMode,
              wireframe: wireMode,
            });
          } else {
            const firstOrig = Array.isArray(rec.origMat) ? rec.origMat[0] : rec.origMat;
            const std = firstOrig as THREE.MeshStandardMaterial;
            rec.toonMat.map = overrideMap || std?.map || null;
            rec.toonMat.side = sideMode;
            rec.toonMat.wireframe = wireMode;
            rec.toonMat.needsUpdate = true;
          }
          rec.mesh.material = rec.toonMat;
        } else {
          rec.mesh.material = rec.origMat;
          const matList = Array.isArray(rec.origMat) ? rec.origMat : [rec.origMat];
          matList.forEach((m, idx) => {
            if (!m) return;
            m.side = sideMode;
            if ('wireframe' in m) {
              (m as THREE.MeshStandardMaterial).wireframe = wireMode;
            }
            if (m instanceof THREE.MeshStandardMaterial) {
              const baseR = rec.origRoughness[idx] ?? 0.5;
              const baseM = rec.origMetalness[idx] ?? 0.0;
              m.roughnessMap = rec.pbrMaps.roughnessMap || rec.origRoughnessMap[idx] || null;
              m.metalnessMap = rec.pbrMaps.metalnessMap || rec.origMetalnessMap[idx] || null;
              m.normalMap = rec.pbrMaps.normalMap || rec.origNormalMap[idx] || null;
              m.aoMap = rec.pbrMaps.aoMap || rec.origAoMap[idx] || null;
              m.aoMapIntensity = m.aoMap ? 1.0 : 0;

              m.roughness = rec.pbrMaps.roughnessMap ? 1.0 : THREE.MathUtils.clamp(baseR + rShift, 0.05, 1.0);
              m.metalness = rec.pbrMaps.metalnessMap ? 1.0 : THREE.MathUtils.clamp(baseM + mShift, 0.0, 1.0);
              if (overrideMap) {
                m.map = overrideMap;
                m.color.setHex(0xffffff);
              } else {
                m.map = rec.origMap[idx] ?? null;
                m.color.setHex(rec.origColorHex[idx] ?? 0xffffff);
              }
              if (m.normalScale && rec.origNormalScale[idx]) {
                m.normalScale.set(
                  rec.origNormalScale[idx].x * nStrength,
                  rec.origNormalScale[idx].y * nStrength
                );
              }
              if (rec.pbrMaps.emissiveMap || rec.origEmissiveMap[idx]) {
                m.emissiveMap = rec.pbrMaps.emissiveMap || rec.origEmissiveMap[idx] || null;
                if (rec.pbrMaps.emissiveMap) m.emissive.setHex(0xffffff);
              }
              if (rec.pbrMaps.alphaMap || rec.origAlphaMap[idx]) {
                m.alphaMap = rec.pbrMaps.alphaMap || rec.origAlphaMap[idx] || null;
                m.transparent = true;
              }
              m.needsUpdate = true;
            }
          });
        }
      }

      // 3. Skeleton helper visibility
      if (uploadedSkeletonHelper) {
        uploadedSkeletonHelper.visible = stateRef.current.showSkeleton;
      }
      refSkeletonGroup.visible = !uploadedGroup && !stateRef.current.hideDefaultBase && stateRef.current.showSkeleton;
    }

    function applyFramePose(frame: number) {
      const endF = Math.max(1, stateRef.current.animEndFrame);
      const t = endF > 1 ? ((frame - 1) / (endF - 1)) * Math.PI * 2 : 0;
      pelvisPivot.position.y = 0.88 + Math.abs(Math.sin(t)) * 0.028;
      spinePivot.rotation.y = Math.sin(t) * 0.08;
      spinePivot.rotation.x = Math.cos(t * 2) * 0.03;
      headPivot.rotation.y = Math.sin(t * 0.5) * 0.18;
      headPivot.rotation.x = Math.sin(t) * 0.05;
      hairPivot.rotation.x = Math.sin(t * 2 - 0.5) * 0.07;

      armLPivot.rotation.z = -0.18 + Math.sin(t) * 0.06;
      armLPivot.rotation.x = Math.sin(t) * 0.34;
      forearmLPivot.rotation.x = -0.32 - Math.max(0, Math.sin(t)) * 0.25;

      armRPivot.rotation.z = 0.18 - Math.sin(t) * 0.06;
      armRPivot.rotation.x = -Math.sin(t) * 0.34;
      forearmRPivot.rotation.x = -0.32 - Math.max(0, -Math.sin(t)) * 0.25;

      thighLPivot.rotation.x = -Math.sin(t) * 0.28;
      thighRPivot.rotation.x = Math.sin(t) * 0.28;

      // Quadruped trot animation
      quadPelvisPivot.position.y = 0.78 + Math.abs(Math.sin(t * 2)) * 0.022;
      quadNeckPivot.rotation.x = Math.sin(t * 2) * 0.06;
      quadNeckPivot.rotation.y = Math.sin(t) * 0.12;
      quadTailPivot.rotation.y = Math.sin(t * 2) * 0.28;
      quadFrontLegL.rotation.x = Math.sin(t) * 0.32;
      quadHindLegR.rotation.x = Math.sin(t) * 0.32;
      quadFrontLegR.rotation.x = -Math.sin(t) * 0.32;
      quadHindLegL.rotation.x = -Math.sin(t) * 0.32;
    }

    function frameCameraOnObject(targetObj: THREE.Object3D) {
      targetObj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(targetObj);
      if (box.isEmpty()) return;
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const dist = Math.max(0.8, (maxDim / (2 * Math.tan(fovRad / 2))) * 1.45);
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
      if (dir.lengthSq() < 0.0001) dir.set(1.85, 0.55, 2.35);
      dir.normalize();
      stateRef.current.camTransitioning = false;
      camera.position.copy(center).addScaledVector(dir, dist);
      controls.target.copy(center);
      controls.update();
    }

    interface StudioPrimitiveRecord {
      mesh: THREE.Mesh;
      kind: PrimitiveShapeKind | 'mesh';
      materialStyle: SplineMaterialStyle;
      interaction: SplineInteractionType;
      physicsEnabled: boolean;
      velocityY: number;
      baseY: number;
      baseScale: THREE.Vector3;
      clickToggled: boolean;
      videoEl?: HTMLVideoElement | null;
      videoTex?: THREE.VideoTexture | null;
    }

    const studioPrimitives: StudioPrimitiveRecord[] = [];
    let selectedSceneObject: THREE.Object3D | null = null;
    let hoveredPlayMesh: THREE.Object3D | null = null;

    const getPrimitiveRecord = (obj: THREE.Object3D | null): StudioPrimitiveRecord | undefined =>
      obj ? studioPrimitives.find((r) => r.mesh === obj) : undefined;

    const syncSelectedInspector = () => {
      if (!selectedSceneObject) {
        setSelectedObjectInspector(null);
        return;
      }
      const rec = getPrimitiveRecord(selectedSceneObject);
      const mesh = selectedSceneObject as THREE.Mesh;
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const phys = mat instanceof THREE.MeshStandardMaterial ? mat : null;
      const colorHex = phys?.color ? `#${phys.color.getHexString()}` : '#38BDF8';
      setSelectedObjectInspector({
        id: selectedSceneObject.uuid,
        name: selectedSceneObject.name || 'Objeto_3D',
        isPrimitive: Boolean(rec),
        position: [
          selectedSceneObject.position.x,
          selectedSceneObject.position.y,
          selectedSceneObject.position.z,
        ],
        rotationDeg: [
          THREE.MathUtils.radToDeg(selectedSceneObject.rotation.x),
          THREE.MathUtils.radToDeg(selectedSceneObject.rotation.y),
          THREE.MathUtils.radToDeg(selectedSceneObject.rotation.z),
        ],
        scale: [
          selectedSceneObject.scale.x,
          selectedSceneObject.scale.y,
          selectedSceneObject.scale.z,
        ],
        materialStyle: rec?.materialStyle ?? 'physical',
        color: colorHex,
        roughness: phys?.roughness ?? 0.35,
        metalness: phys?.metalness ?? 0.12,
        transmission: phys instanceof THREE.MeshPhysicalMaterial ? phys.transmission : 0,
        emissiveIntensity: phys ? phys.emissiveIntensity : 0,
        interaction: rec?.interaction ?? 'none',
        physicsEnabled: rec?.physicsEnabled ?? false,
      });
    };

    const syncTransformAttachment = () => {
      const mode = stateRef.current.toolMode;
      const isTransform = mode === 'translate' || mode === 'rotate' || mode === 'scale';
      if (!stateRef.current.playMode && isTransform && selectedSceneObject) {
        transformControls.setMode(mode);
        transformControls.attach(selectedSceneObject);
      } else {
        transformControls.detach();
      }
    };

    transformControls.addEventListener('objectChange', () => {
      const rec = getPrimitiveRecord(selectedSceneObject);
      if (rec && selectedSceneObject) {
        rec.baseY = selectedSceneObject.position.y;
        rec.baseScale.copy(selectedSceneObject.scale);
      }
      syncSelectedInspector();
    });

    const selectThreeObject = (obj: THREE.Object3D | null) => {
      selectedSceneObject = obj;
      setSelectedMeshId(obj ? obj.uuid : null);
      syncTransformAttachment();
      syncSelectedInspector();
    };

    const disposePrimitiveRecord = (rec: StudioPrimitiveRecord) => {
      if (rec.videoEl) {
        rec.videoEl.pause();
        if (rec.videoEl.src.startsWith('blob:')) URL.revokeObjectURL(rec.videoEl.src);
        rec.videoEl = null;
      }
      if (rec.videoTex) {
        rec.videoTex.dispose();
        rec.videoTex = null;
      }
      studioObjectsGroup.remove(rec.mesh);
      rec.mesh.geometry.dispose();
      if (Array.isArray(rec.mesh.material)) {
        rec.mesh.material.forEach((m) => m.dispose());
      } else {
        rec.mesh.material.dispose();
      }
    };

    function refreshHierarchyState() {
      const activeDefaultRoot = stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot;
      const activeMain = uploadedGroup || activeDefaultRoot;
      const roots: THREE.Object3D[] = [];
      if (uploadedGroup || !stateRef.current.hideDefaultBase) roots.push(activeMain);
      if (studioObjectsGroup.children.length > 0) roots.push(studioObjectsGroup);

      const items: SceneMeshListItem[] = [];
      let totalVertices = 0;
      let totalTriangles = 0;
      const matSet = new Set<THREE.Material>();
      const texSet = new Set<THREE.Texture>();
      const combinedBox = new THREE.Box3();

      for (const target of roots) {
        target.updateMatrixWorld(true);
        combinedBox.expandByObject(target);
        target.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
              return;
            }
            const geo = m.geometry;
            const vCount = geo?.attributes?.position?.count || 0;
            const tCount = geo?.index ? Math.round(geo.index.count / 3) : Math.round(vCount / 3);
            totalVertices += vCount;
            totalTriangles += tCount;

            const mats = Array.isArray(m.material) ? m.material : [m.material];
            for (const mat of mats) {
              if (!mat) continue;
              matSet.add(mat);
              const rec = mat as unknown as Record<string, unknown>;
              for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap']) {
                const t = rec[key];
                if (t instanceof THREE.Texture) texSet.add(t);
              }
            }

            items.push({
              id: m.uuid,
              name: m.name || `Malha_${items.length + 1}`,
              triCount: tCount,
              visible: m.visible,
            });
          }
        });
      }

      const sz = new THREE.Vector3();
      combinedBox.getSize(sz);
      const dimensions = combinedBox.isEmpty()
        ? '—'
        : `${sz.x.toFixed(2)} × ${sz.y.toFixed(2)} × ${sz.z.toFixed(2)} m`;

      setPrimitiveCount(studioPrimitives.length);
      setMeshList(items);
      setSceneMetrics({
        fileName:
          loadedAssetNameRef.current ||
          (studioPrimitives.length > 0 ? 'Cena_3D_Editavel' : 'Cena Vazia'),
        vertices: totalVertices,
        triangles: totalTriangles,
        meshes: items.length,
        materials: matSet.size,
        textures: texSet.size,
        dimensions,
        animations: uploadedGroup ? uploadedClips.length : 1,
      });
      scheduleAutoSaveRef.current?.();
    }

    frameSceneRef.current = () => {
      const box = new THREE.Box3();
      const activeDefaultRoot = stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot;
      if (uploadedGroup) box.expandByObject(uploadedGroup);
      else if (!stateRef.current.hideDefaultBase) box.expandByObject(activeDefaultRoot);
      if (studioObjectsGroup.children.length > 0) box.expandByObject(studioObjectsGroup);
      if (box.isEmpty()) return;
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fovRad = THREE.MathUtils.degToRad(camera.fov);
      const dist = Math.max(0.9, (maxDim / (2 * Math.tan(fovRad / 2))) * 1.45);
      const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
      if (dir.lengthSq() < 0.0001) dir.set(1.85, 0.55, 2.35);
      dir.normalize();
      stateRef.current.camTransitioning = false;
      camera.position.copy(center).addScaledVector(dir, dist);
      controls.target.copy(center);
      controls.update();
    };

    const findSceneObjectById = (id: string): THREE.Object3D | null => {
      let found: THREE.Object3D | null = null;
      const targets = [
        studioObjectsGroup,
        uploadedGroup || (stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot),
      ];
      for (const t of targets) {
        t.traverse((o) => {
          if (o.uuid === id) found = o;
        });
        if (found) break;
      }
      return found;
    };

    focusMeshByIdRef.current = (id: string) => {
      const found = findSceneObjectById(id);
      if (found) frameCameraOnObject(found);
    };

    toggleMeshVisibilityRef.current = (id: string) => {
      const found = findSceneObjectById(id);
      if (found) found.visible = !found.visible;
      refreshHierarchyState();
    };

    showAllMeshesRef.current = () => {
      const targets = [
        studioObjectsGroup,
        uploadedGroup || (stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot),
      ];
      for (const t of targets) {
        t.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) o.visible = true;
        });
      }
      refreshHierarchyState();
    };

    selectObjectByIdRef.current = (id: string | null) => {
      if (!id) {
        selectThreeObject(null);
        return;
      }
      selectThreeObject(findSceneObjectById(id));
    };

    const spawnPrimitiveMesh = (
      kind: PrimitiveShapeKind,
      opts?: {
        name?: string;
        position?: [number, number, number];
        scale?: [number, number, number];
        style?: SplineMaterialStyle;
        color?: string;
        interaction?: SplineInteractionType;
        physicsEnabled?: boolean;
      }
    ) => {
      const catalogItem = PRIMITIVE_CATALOG.find((c) => c.kind === kind);
      const color = opts?.color || catalogItem?.defaultColor || '#38BDF8';
      const style = opts?.style || 'physical';
      const geo = createSplinePrimitiveGeometry(kind);
      const mat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color) });
      applySplineStyleToPhysicalMaterial(mat, style, color);
      const mesh = new THREE.Mesh(geo, mat);
      const idx = studioPrimitives.length + 1;
      mesh.name = opts?.name || `${catalogItem?.label || 'Forma'}_${idx}`;
      mesh.castShadow = !isSoftwareGl;
      mesh.receiveShadow = !isSoftwareGl;
      const offsetX = opts?.position ? opts.position[0] : ((idx - 1) % 3 - 1) * 0.65;
      const posY = opts?.position ? opts.position[1] : 0.85;
      const posZ = opts?.position ? opts.position[2] : 0;
      mesh.position.set(offsetX, posY, posZ);
      if (opts?.scale) mesh.scale.set(...opts.scale);
      studioObjectsGroup.add(mesh);

      const rec: StudioPrimitiveRecord = {
        mesh,
        kind,
        materialStyle: style,
        interaction: opts?.interaction || 'none',
        physicsEnabled: opts?.physicsEnabled ?? false,
        velocityY: 0,
        baseY: posY,
        baseScale: mesh.scale.clone(),
        clickToggled: false,
      };
      studioPrimitives.push(rec);
      return rec;
    };

    addPrimitiveRef.current = (kind: PrimitiveShapeKind) => {
      const rec = spawnPrimitiveMesh(kind);
      if (stateRef.current.toolMode === 'orbit' || stateRef.current.toolMode === 'paint' || stateRef.current.toolMode === 'assign_mat') {
        setToolMode('translate');
        stateRef.current.toolMode = 'translate';
      }
      selectThreeObject(rec.mesh);
      refreshHierarchyState();
      showBriefStatus(`Forma adicionada: ${rec.mesh.name}`);
    };

    applyTemplateRef.current = (templateId: SplineTemplateId) => {
      selectThreeObject(null);
      while (studioPrimitives.length > 0) {
        const r = studioPrimitives.pop()!;
        disposePrimitiveRecord(r);
      }

      setHideDefaultBase(true);
      stateRef.current.hideDefaultBase = true;
      applyMaterialSettings();

      if (templateId === 'glass_neon') {
        const knot = spawnPrimitiveMesh('torus_knot', {
          name: 'Cristal_Central',
          position: [0, 0.95, 0],
          scale: [1.3, 1.3, 1.3],
          style: 'glass',
          color: '#7DD3FC',
          interaction: 'spin',
        });
        spawnPrimitiveMesh('sphere', {
          name: 'Orbe_Neon_1',
          position: [-0.85, 0.72, 0.35],
          scale: [0.6, 0.6, 0.6],
          style: 'neon',
          color: '#F97316',
          interaction: 'float',
        });
        spawnPrimitiveMesh('sphere', {
          name: 'Orbe_Neon_2',
          position: [0.85, 1.25, -0.3],
          scale: [0.5, 0.5, 0.5],
          style: 'neon',
          color: '#A855F7',
          interaction: 'float',
        });
        setBloomEnabled(true);
        stateRef.current.bloomEnabled = true;
        setPlayMode(true);
        stateRef.current.playMode = true;
        selectThreeObject(knot.mesh);
      } else if (templateId === 'product_showcase') {
        spawnPrimitiveMesh('cylinder', {
          name: 'Pedestal',
          position: [0, 0.25, 0],
          scale: [1.8, 0.6, 1.8],
          style: 'clay',
          color: '#1E293B',
        });
        const hero = spawnPrimitiveMesh('icosahedron', {
          name: 'Produto_Cromado',
          position: [0, 0.92, 0],
          scale: [1.15, 1.15, 1.15],
          style: 'chrome',
          color: '#E2E8F0',
          interaction: 'spin',
        });
        spawnPrimitiveMesh('torus', {
          name: 'Anel_Orbita',
          position: [0, 0.92, 0],
          scale: [1.45, 1.45, 1.45],
          style: 'ceramic',
          color: '#F97316',
          interaction: 'hover_pulse',
        });
        setBloomEnabled(false);
        stateRef.current.bloomEnabled = false;
        selectThreeObject(hero.mesh);
      } else if (templateId === 'floating_shapes') {
        const main = spawnPrimitiveMesh('capsule', {
          name: 'Capsula_Principal',
          position: [0, 1.0, 0],
          scale: [1.1, 1.1, 1.1],
          style: 'ceramic',
          color: '#38BDF8',
          interaction: 'float',
        });
        spawnPrimitiveMesh('star', {
          name: 'Estrela_Vetor',
          position: [-0.8, 1.15, 0.2],
          scale: [0.9, 0.9, 0.9],
          style: 'neon',
          color: '#FACC15',
          interaction: 'spin',
        });
        spawnPrimitiveMesh('heart', {
          name: 'Coracao_3D',
          position: [0.8, 0.95, 0.15],
          scale: [0.9, 0.9, 0.9],
          style: 'glass',
          color: '#FB7185',
          interaction: 'click_toggle',
        });
        setPlayMode(true);
        stateRef.current.playMode = true;
        selectThreeObject(main.mesh);
      }

      refreshHierarchyState();
      frameSceneRef.current?.();
      showBriefStatus('Template 3D carregado com sucesso');
    };

    selectUploadedRootRef.current = () => {
      if (!uploadedGroup) return;
      if (stateRef.current.toolMode === 'orbit' || stateRef.current.toolMode === 'paint' || stateRef.current.toolMode === 'assign_mat') {
        setToolMode('translate');
        stateRef.current.toolMode = 'translate';
      }
      selectThreeObject(uploadedGroup);
      showBriefStatus('Modelo GLB/glTF selecionado — mova, gire ou escale livremente');
    };

    runBooleanRef.current = (op: BooleanOperation) => {
      const candidatePool: THREE.Mesh[] = [
        ...studioPrimitives.map((r) => r.mesh),
        ...uploadedRecords.map((r) => r.mesh).filter((m) => m.visible),
      ];
      if (candidatePool.length < 2) {
        setLoadError('Importe um GLB com 2+ malhas ou adicione formas 3D para aplicar booleana CSG.');
        return;
      }

      const selectedMesh =
        selectedSceneObject && (selectedSceneObject as THREE.Mesh).isMesh
          ? (selectedSceneObject as THREE.Mesh)
          : null;
      const meshA =
        selectedMesh && candidatePool.includes(selectedMesh)
          ? selectedMesh
          : candidatePool[candidatePool.length - 2];
      const meshB =
        [...candidatePool].reverse().find((m) => m !== meshA) ||
        candidatePool[candidatePool.length - 1];
      if (!meshA || !meshB || meshA === meshB) {
        setLoadError('Selecione duas malhas distintas para calcular a booleana CSG.');
        return;
      }

      const result = performMeshBoolean(meshA, meshB, op);
      if (!result) {
        setLoadError('Não foi possível calcular a booleana CSG (malhas muito densas ou sem interseção).');
        return;
      }

      const opNames: Record<BooleanOperation, string> = {
        union: 'Uniao_CSG',
        subtract: 'Subtracao_CSG',
        intersect: 'Intersecao_CSG',
      };
      const firstMatA = Array.isArray(meshA.material) ? meshA.material[0] : meshA.material;
      const baseMat =
        firstMatA instanceof THREE.MeshPhysicalMaterial
          ? firstMatA.clone()
          : new THREE.MeshPhysicalMaterial({
              color:
                firstMatA instanceof THREE.MeshStandardMaterial
                  ? firstMatA.color.clone()
                  : new THREE.Color('#38BDF8'),
              roughness:
                firstMatA instanceof THREE.MeshStandardMaterial ? firstMatA.roughness : 0.4,
              metalness:
                firstMatA instanceof THREE.MeshStandardMaterial ? firstMatA.metalness : 0.15,
            });
      const newMesh = new THREE.Mesh(result.geometry, baseMat);
      newMesh.name = `${opNames[op]}_${studioPrimitives.length + 1}`;
      newMesh.position.copy(result.center);
      newMesh.castShadow = !isSoftwareGl;
      newMesh.receiveShadow = !isSoftwareGl;

      const aRec = getPrimitiveRecord(meshA);
      selectThreeObject(null);
      [meshA, meshB].forEach((m) => {
        const pRec = getPrimitiveRecord(m);
        if (pRec) {
          const idx = studioPrimitives.indexOf(pRec);
          if (idx >= 0) studioPrimitives.splice(idx, 1);
          disposePrimitiveRecord(pRec);
        } else {
          m.visible = false;
        }
      });

      studioObjectsGroup.add(newMesh);
      const newRec: StudioPrimitiveRecord = {
        mesh: newMesh,
        kind: 'mesh',
        materialStyle: aRec?.materialStyle || 'physical',
        interaction: 'none',
        physicsEnabled: false,
        velocityY: 0,
        baseY: newMesh.position.y,
        baseScale: newMesh.scale.clone(),
        clickToggled: false,
      };
      studioPrimitives.push(newRec);
      selectThreeObject(newMesh);
      refreshHierarchyState();
      showBriefStatus(`Booleana CSG aplicada: ${newMesh.name}`);
    };

    runGeoArrayRef.current = () => {
      const selectedRec = getPrimitiveRecord(selectedSceneObject);
      const selectedMesh =
        selectedSceneObject && (selectedSceneObject as THREE.Mesh).isMesh
          ? (selectedSceneObject as THREE.Mesh)
          : null;
      const baseKind: PrimitiveShapeKind =
        selectedRec && selectedRec.kind !== 'mesh' ? selectedRec.kind : 'icosahedron';
      const firstSelMat = selectedMesh
        ? Array.isArray(selectedMesh.material)
          ? selectedMesh.material[0]
          : selectedMesh.material
        : null;
      const baseColor =
        firstSelMat instanceof THREE.MeshStandardMaterial
          ? `#${firstSelMat.color.getHexString()}`
          : '#38BDF8';
      const baseStyle = selectedRec?.materialStyle || 'physical';
      const count = 6;
      const radius = 1.15;
      const yBase = selectedMesh ? selectedMesh.position.y : 0.85;
      let lastMesh: THREE.Mesh | null = null;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const rec = spawnPrimitiveMesh(baseKind, {
          name: `${selectedMesh ? `${selectedMesh.name}_Node` : 'GeoArray'}_${i + 1}`,
          position: [Math.cos(angle) * radius, yBase, Math.sin(angle) * radius],
          scale: selectedMesh ? [0.65, 0.65, 0.65] : [0.65, 0.65, 0.65],
          style: baseStyle,
          color: baseColor,
          interaction: 'spin',
        });
        if (selectedMesh) {
          rec.mesh.geometry.dispose();
          rec.mesh.geometry = selectedMesh.geometry.clone();
          rec.kind = 'mesh';
          if (firstSelMat instanceof THREE.MeshStandardMaterial) {
            const matClone = new THREE.MeshPhysicalMaterial({
              color: firstSelMat.color.clone(),
              roughness: firstSelMat.roughness,
              metalness: firstSelMat.metalness,
              map: firstSelMat.map || null,
              normalMap: firstSelMat.normalMap || null,
            });
            if (Array.isArray(rec.mesh.material)) {
              rec.mesh.material.forEach((m) => m.dispose());
            } else {
              rec.mesh.material.dispose();
            }
            rec.mesh.material = matClone;
          }
        }
        rec.mesh.rotation.y = -angle;
        lastMesh = rec.mesh;
      }
      if (lastMesh) selectThreeObject(lastMesh);
      refreshHierarchyState();
      frameSceneRef.current?.();
      showBriefStatus(`Geometry Nodes: Array Circular procedural gerado (${count} instâncias)`);
    };

    updateObjectTransformRef.current = (group, idx, val) => {
      if (!selectedSceneObject) return;
      const arr: [number, number, number] =
        group === 'position'
          ? [selectedSceneObject.position.x, selectedSceneObject.position.y, selectedSceneObject.position.z]
          : group === 'rotationDeg'
          ? [
              THREE.MathUtils.radToDeg(selectedSceneObject.rotation.x),
              THREE.MathUtils.radToDeg(selectedSceneObject.rotation.y),
              THREE.MathUtils.radToDeg(selectedSceneObject.rotation.z),
            ]
          : [selectedSceneObject.scale.x, selectedSceneObject.scale.y, selectedSceneObject.scale.z];
      arr[idx] = val;
      if (group === 'position') {
        selectedSceneObject.position.set(arr[0], arr[1], arr[2]);
        const rec = getPrimitiveRecord(selectedSceneObject);
        if (rec) rec.baseY = arr[1];
      } else if (group === 'rotationDeg') {
        selectedSceneObject.rotation.set(
          THREE.MathUtils.degToRad(arr[0]),
          THREE.MathUtils.degToRad(arr[1]),
          THREE.MathUtils.degToRad(arr[2])
        );
      } else {
        const safeScale = arr.map((s) => Math.max(0.05, s)) as [number, number, number];
        selectedSceneObject.scale.set(...safeScale);
        const rec = getPrimitiveRecord(selectedSceneObject);
        if (rec) rec.baseScale.copy(selectedSceneObject.scale);
      }
      syncSelectedInspector();
      requestRenderRef.current?.();
    };

    updateObjectMaterialRef.current = (patch) => {
      if (!selectedSceneObject) return;
      const targetMeshes: THREE.Mesh[] = [];
      if ((selectedSceneObject as THREE.Mesh).isMesh) {
        targetMeshes.push(selectedSceneObject as THREE.Mesh);
      } else {
        selectedSceneObject.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) targetMeshes.push(child as THREE.Mesh);
        });
      }
      if (targetMeshes.length === 0) return;

      for (const mesh of targetMeshes) {
        const rec = getPrimitiveRecord(mesh);
        const upRec = uploadedRecords.find((r) => r.mesh === mesh);
        if (rec && patch.materialStyle) rec.materialStyle = patch.materialStyle;

        if (!(mesh.material instanceof THREE.MeshPhysicalMaterial)) {
          const old = mesh.material;
          const std = Array.isArray(old) ? old[0] : old;
          const stdMat = std instanceof THREE.MeshStandardMaterial ? std : null;
          const physMat = new THREE.MeshPhysicalMaterial({
            color: stdMat ? stdMat.color.clone() : new THREE.Color(0x38bdf8),
            roughness: stdMat ? stdMat.roughness : 0.45,
            metalness: stdMat ? stdMat.metalness : 0.1,
            map: stdMat?.map || null,
            normalMap: stdMat?.normalMap || null,
            roughnessMap: stdMat?.roughnessMap || null,
            metalnessMap: stdMat?.metalnessMap || null,
            aoMap: stdMat?.aoMap || null,
          });
          mesh.material = physMat;
        }
        const mat = mesh.material as THREE.MeshPhysicalMaterial;
        const nextStyle = patch.materialStyle ?? rec?.materialStyle ?? 'physical';
        const nextColor = patch.color ?? `#${mat.color.getHexString()}`;
        applySplineStyleToPhysicalMaterial(mat, nextStyle, nextColor, {
          roughness: patch.materialStyle ? undefined : patch.roughness ?? mat.roughness,
          metalness: patch.materialStyle ? undefined : patch.metalness ?? mat.metalness,
          transmission: patch.materialStyle ? undefined : patch.transmission ?? mat.transmission,
          emissiveIntensity: patch.materialStyle
            ? undefined
            : patch.emissiveIntensity ?? mat.emissiveIntensity,
        });

        if (upRec) {
          upRec.origMat = mat;
          upRec.origColorHex = [mat.color.getHex()];
          upRec.origRoughness = [mat.roughness];
          upRec.origMetalness = [mat.metalness];
          if (patch.materialStyle) {
            upRec.origRoughnessMap = [null];
            upRec.origMetalnessMap = [null];
            mat.roughnessMap = null;
            mat.metalnessMap = null;
          }
          if (patch.color) {
            upRec.origMap = [null];
            mat.map = null;
          }
          mat.needsUpdate = true;
        }
      }
      syncSelectedInspector();
      syncInspectorUvs();
      refreshHierarchyState();
      requestRenderRef.current?.();
    };

    updateObjectInteractionRef.current = (interaction) => {
      const rec = getPrimitiveRecord(selectedSceneObject);
      if (rec) {
        rec.interaction = interaction;
        rec.baseY = rec.mesh.position.y;
        rec.baseScale.copy(rec.mesh.scale);
        syncSelectedInspector();
      }
    };

    toggleObjectPhysicsRef.current = (enabled) => {
      const rec = getPrimitiveRecord(selectedSceneObject);
      if (rec) {
        rec.physicsEnabled = enabled;
        rec.velocityY = 0;
        if (enabled && !stateRef.current.physicsActive) {
          setPhysicsActive(true);
          stateRef.current.physicsActive = true;
        }
        syncSelectedInspector();
      }
    };

    applyVideoTextureRef.current = (file: File) => {
      const targetMesh =
        (selectedSceneObject && (selectedSceneObject as THREE.Mesh).isMesh
          ? (selectedSceneObject as THREE.Mesh)
          : null) ||
        uploadedRecords[0]?.mesh ||
        studioPrimitives[0]?.mesh ||
        null;
      if (!targetMesh || !(targetMesh as THREE.Mesh).isMesh) {
        setLoadError('Selecione ou importe uma malha 3D antes de aplicar uma textura de vídeo.');
        return;
      }
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.src = url;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      video.play().catch(() => undefined);

      const vTex = new THREE.VideoTexture(video);
      vTex.colorSpace = THREE.SRGBColorSpace;
      const rec = getPrimitiveRecord(targetMesh);
      if (rec) {
        if (rec.videoEl) {
          rec.videoEl.pause();
          if (rec.videoEl.src.startsWith('blob:')) URL.revokeObjectURL(rec.videoEl.src);
        }
        if (rec.videoTex) rec.videoTex.dispose();
        rec.videoEl = video;
        rec.videoTex = vTex;
      }
      const mat = Array.isArray(targetMesh.material) ? targetMesh.material[0] : targetMesh.material;
      if (mat instanceof THREE.MeshStandardMaterial) {
        mat.map = vTex;
        mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
      }
      const upRec = uploadedRecords.find((r) => r.mesh === targetMesh);
      if (upRec) {
        upRec.origMap[0] = vTex;
        upRec.origColorHex[0] = 0xffffff;
      }
      refreshHierarchyState();
      showBriefStatus(`Textura de vídeo aplicada: ${file.name}`);
    };

    duplicateSelectedRef.current = () => {
      const rec = getPrimitiveRecord(selectedSceneObject);
      if (rec) {
        const dup = spawnPrimitiveMesh(rec.kind === 'mesh' ? 'cube' : rec.kind, {
          name: `${rec.mesh.name}_Copia`,
          position: [rec.mesh.position.x + 0.45, rec.mesh.position.y, rec.mesh.position.z],
          scale: [rec.mesh.scale.x, rec.mesh.scale.y, rec.mesh.scale.z],
          style: rec.materialStyle,
          color: `#${(rec.mesh.material as THREE.MeshPhysicalMaterial).color.getHexString()}`,
          interaction: rec.interaction,
          physicsEnabled: rec.physicsEnabled,
        });
        if (rec.kind === 'mesh') {
          dup.mesh.geometry.dispose();
          dup.mesh.geometry = rec.mesh.geometry.clone();
          dup.kind = 'mesh';
        }
        dup.mesh.rotation.copy(rec.mesh.rotation);
        selectThreeObject(dup.mesh);
        refreshHierarchyState();
        showBriefStatus(`Duplicado: ${dup.mesh.name}`);
        return;
      }

      if (!selectedSceneObject) return;
      const sourceMeshes: THREE.Mesh[] = [];
      if ((selectedSceneObject as THREE.Mesh).isMesh) {
        sourceMeshes.push(selectedSceneObject as THREE.Mesh);
      } else {
        selectedSceneObject.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.visible) sourceMeshes.push(child as THREE.Mesh);
        });
      }
      if (sourceMeshes.length === 0) return;

      const wPos = new THREE.Vector3();
      const wQuat = new THREE.Quaternion();
      const wScale = new THREE.Vector3();
      let lastDup: THREE.Mesh | null = null;
      for (const src of sourceMeshes) {
        src.updateMatrixWorld(true);
        src.matrixWorld.decompose(wPos, wQuat, wScale);
        const srcMat = Array.isArray(src.material) ? src.material[0] : src.material;
        const std = srcMat instanceof THREE.MeshStandardMaterial ? srcMat : null;
        const colorHex = std ? `#${std.color.getHexString()}` : '#94A3B8';
        const dup = spawnPrimitiveMesh('cube', {
          name: `${src.name || 'Malha'}_Copia`,
          position: [wPos.x + 0.55, wPos.y, wPos.z],
          scale: [Math.max(0.05, wScale.x), Math.max(0.05, wScale.y), Math.max(0.05, wScale.z)],
          style: 'physical',
          color: colorHex,
        });
        dup.mesh.geometry.dispose();
        dup.mesh.geometry = src.geometry.clone();
        dup.kind = 'mesh';
        dup.mesh.quaternion.copy(wQuat);
        if (std) {
          const mat = dup.mesh.material as THREE.MeshPhysicalMaterial;
          mat.roughness = std.roughness;
          mat.metalness = std.metalness;
          mat.map = std.map || null;
          mat.normalMap = std.normalMap || null;
          mat.roughnessMap = std.roughnessMap || null;
          mat.metalnessMap = std.metalnessMap || null;
          mat.aoMap = std.aoMap || null;
          mat.needsUpdate = true;
        }
        lastDup = dup.mesh;
      }
      if (lastDup) selectThreeObject(lastDup);
      refreshHierarchyState();
      showBriefStatus(`Duplicado na cena: ${lastDup?.name || 'Malha'}`);
    };

    const clearUploadedAssetOnly = () => {
      disposeUploadedModel();
      currentGlbImportSerial = 0;
      setHideDefaultBase(true);
      stateRef.current.hideDefaultBase = true;
      characterRoot.visible = false;
      quadrupedRoot.visible = false;
      onImportedUvsRef.current?.(null);
      loadedAssetNameRef.current = null;
      setLoadedAsset(null);
      setLoadError(null);
      setShowSkeleton(false);
      refreshHierarchyState();
    };

    const deleteTargetObject = (target: THREE.Object3D | null) => {
      if (!target) return;

      const rec = getPrimitiveRecord(target);
      if (rec) {
        const removedName = rec.mesh.name;
        if (selectedSceneObject === rec.mesh) selectThreeObject(null);
        const idx = studioPrimitives.indexOf(rec);
        if (idx >= 0) studioPrimitives.splice(idx, 1);
        disposePrimitiveRecord(rec);
        refreshHierarchyState();
        showBriefStatus(`Excluído (Delete): ${removedName}`);
        return;
      }

      if (uploadedGroup && target === uploadedGroup) {
        selectThreeObject(null);
        clearUploadedAssetOnly();
        showBriefStatus('Modelo excluído da cena (Delete)');
        return;
      }

      if ((target as THREE.Mesh).isMesh) {
        const targetMesh = target as THREE.Mesh;
        const removedName = targetMesh.name || 'Malha';
        if (selectedSceneObject === targetMesh) selectThreeObject(null);
        targetMesh.parent?.remove(targetMesh);

        const uIdx = uploadedRecords.findIndex((r) => r.mesh === targetMesh);
        if (uIdx >= 0) {
          const [uRec] = uploadedRecords.splice(uIdx, 1);
          if (uRec.outlineMesh) targetMesh.remove(uRec.outlineMesh);
          if (uRec.toonMat) uRec.toonMat.dispose();
          if (uRec.paintData) uRec.paintData.tex.dispose();
          if (Array.isArray(uRec.origMat)) uRec.origMat.forEach(disposeMaterialTree);
          else disposeMaterialTree(uRec.origMat);
          targetMesh.geometry.dispose();
        } else {
          targetMesh.geometry?.dispose();
        }

        if (uploadedGroup && uploadedRecords.length === 0) {
          clearUploadedAssetOnly();
        } else if (uploadedGroup) {
          let remTris = 0;
          uploadedRecords.forEach((r) => {
            remTris += countMeshTris(r.mesh);
          });
          setLoadedAsset((prev) =>
            prev ? { ...prev, meshCount: uploadedRecords.length, triCount: remTris } : prev
          );
          refreshHierarchyState();
        } else {
          refreshHierarchyState();
        }
        syncInspectorUvs();
        showBriefStatus(`Malha excluída (Delete): ${removedName}`);
        return;
      }

      if (target.parent && target !== scene) {
        const removedName = target.name || 'Grupo';
        if (selectedSceneObject === target) selectThreeObject(null);
        target.parent.remove(target);
        refreshHierarchyState();
        showBriefStatus(`Excluído (Delete): ${removedName}`);
      }
    };

    deleteSelectedRef.current = () => {
      deleteTargetObject(selectedSceneObject);
    };

    deleteMeshByIdRef.current = (id: string | null) => {
      if (!id) {
        selectThreeObject(null);
        if (uploadedGroup) clearUploadedAssetOnly();
        while (studioPrimitives.length > 0) {
          const r = studioPrimitives.pop()!;
          disposePrimitiveRecord(r);
        }
        refreshHierarchyState();
        syncInspectorUvs();
        showBriefStatus('Cena limpa — todos os objetos excluídos');
        return;
      }
      const found = findSceneObjectById(id);
      if (found) deleteTargetObject(found);
    };

    openCodeExportRef.current = () => {
      const specs = studioPrimitives.map((r) => {
        const mat = r.mesh.material as THREE.MeshPhysicalMaterial;
        return {
          name: r.mesh.name,
          kind: r.kind,
          position: [r.mesh.position.x, r.mesh.position.y, r.mesh.position.z] as [number, number, number],
          rotationDeg: [
            THREE.MathUtils.radToDeg(r.mesh.rotation.x),
            THREE.MathUtils.radToDeg(r.mesh.rotation.y),
            THREE.MathUtils.radToDeg(r.mesh.rotation.z),
          ] as [number, number, number],
          scale: [r.mesh.scale.x, r.mesh.scale.y, r.mesh.scale.z] as [number, number, number],
          color: `#${mat.color.getHexString()}`,
          roughness: mat.roughness,
          metalness: mat.metalness,
          transmission: mat.transmission,
          emissiveIntensity: mat.emissiveIntensity,
          interaction: r.interaction,
        };
      });
      setExportedThreeCode(generateThreeJsSceneCode(specs, loadedAssetNameRef.current, '#0D1017'));
      setExportedReactCode(generateReactThreeFiberCode(specs, '#0D1017'));
      setCodeExportModalOpen(true);
    };

    syncSplineModeRef.current = () => {
      transformControls.enabled = !stateRef.current.playMode;
      syncTransformAttachment();
      if (bloomPass) {
        bloomPass.strength = stateRef.current.bloomStrength;
      }
      applyMaterialSettings();
      refreshHierarchyState();
    };

    applyMaterialsRef.current = applyMaterialSettings;
    applyFramePoseRef.current = applyFramePose;
    rebuildRigPreviewRef.current = (preset: RigPreset) => {
      rebuildRefSkeleton(preset);
      applyMaterialSettings();
      if (!uploadedGroup) refreshHierarchyState();
    };

    function extractEdgesForAttr(
      geo: THREE.BufferGeometry,
      uvAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
      meshTris: number,
      maxTrisCap = 40000
    ): Float32Array {
      if (!uvAttr || uvAttr.count <= 0 || meshTris <= 0) {
        return new Float32Array(0);
      }
      const maxTris = Math.min(meshTris, maxTrisCap);
      const edges = new Float32Array(maxTris * 12);
      const idxAttr = geo.index;
      const vertCount = uvAttr.count;
      for (let t = 0; t < maxTris; t++) {
        const i0 = idxAttr ? idxAttr.getX(t * 3) : t * 3;
        const i1 = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;
        if (i0 >= vertCount || i1 >= vertCount || i2 >= vertCount) continue;
        const u0 = uvAttr.getX(i0);
        const v0 = uvAttr.getY(i0);
        const u1 = uvAttr.getX(i1);
        const v1 = uvAttr.getY(i1);
        const u2 = uvAttr.getX(i2);
        const v2 = uvAttr.getY(i2);
        const o = t * 12;
        edges[o] = u0;
        edges[o + 1] = v0;
        edges[o + 2] = u1;
        edges[o + 3] = v1;
        edges[o + 4] = u1;
        edges[o + 5] = v1;
        edges[o + 6] = u2;
        edges[o + 7] = v2;
        edges[o + 8] = u2;
        edges[o + 9] = v2;
        edges[o + 10] = u0;
        edges[o + 11] = v0;
      }
      return edges;
    }

    function mountLoadedGltf(
      gltf: { scene: THREE.Group; animations: THREE.AnimationClip[] },
      assetName: string,
      batchUrls: string[],
      containerCheck: ContainerCheckResult | null,
      preserveTransform = false
    ) {
      disposeUploadedModel();
      activeObjectUrls = batchUrls;
      lastContainerCheck = containerCheck;

      const model = gltf.scene || new THREE.Group();
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      if (!preserveTransform && !box.isEmpty()) {
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        const rawMax = Math.max(size.x, size.y, size.z);
        const maxDim = Number.isFinite(rawMax) && rawMax > 0.0001 ? rawMax : 1;
        const targetScale = 1.75 / maxDim;
        model.scale.multiplyScalar(targetScale);
        model.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(model);
        scaledBox.getCenter(center);
        if (Number.isFinite(center.x) && Number.isFinite(center.z) && Number.isFinite(scaledBox.min.y)) {
          model.position.x -= center.x;
          model.position.z -= center.z;
          model.position.y -= scaledBox.min.y;
          model.updateMatrixWorld(true);
        }
      }

      let meshCount = 0;
      let triCount = 0;
      let hasSkeleton = false;
      const matSet = new Set<THREE.Material>();
      const extractedUvs: ImportedUvMesh[] = [];
      currentGlbImportSerial = ++glbImportSerialCounter;
      const texCache: TextureExtractCache = new WeakMap();

      const collectedMeshes: THREE.Mesh[] = [];
      const staleHelpers: THREE.Mesh[] = [];
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (
            m.userData?.isAlexHelper ||
            (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name)
          ) {
            staleHelpers.push(m);
            return;
          }
          collectedMeshes.push(m);
        }
      });
      staleHelpers.forEach((h) => h.parent?.remove(h));

      const foundMorphMap = new Map<string, number>();
      for (const mesh of collectedMeshes) {
        if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
          for (const [mName, mIdx] of Object.entries(mesh.morphTargetDictionary)) {
            if (!foundMorphMap.has(mName)) {
              foundMorphMap.set(mName, mesh.morphTargetInfluences[mIdx] ?? 0);
            }
          }
        }
      }
      setMorphTargets(
        Array.from(foundMorphMap.entries())
          .slice(0, 24)
          .map(([name, value]) => ({ name, value }))
      );

      for (const mesh of collectedMeshes) {
        meshCount += 1;
        mesh.castShadow = !isSoftwareGl;
        mesh.receiveShadow = !isSoftwareGl;
        if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
          hasSkeleton = true;
        }

        const geo = mesh.geometry;
        let extractedEdges: Float32Array = new Float32Array(0);
        let extractedUv1Edges: Float32Array | undefined;
        let meshTris = 0;
        if (geo) {
          meshTris = geo.index
            ? Math.round(geo.index.count / 3)
            : Math.round((geo.attributes.position?.count || 0) / 3);
          triCount += meshTris;

          const realUv1Attr = geo.attributes.uv1;
          const uvAttr = geo.attributes.uv || realUv1Attr || geo.attributes.uv2;
          if (uvAttr) {
            extractedEdges = extractEdgesForAttr(geo, uvAttr, meshTris);
            if (realUv1Attr && realUv1Attr !== uvAttr) {
              extractedUv1Edges = extractEdgesForAttr(geo, realUv1Attr, meshTris);
            }
            if (!geo.attributes.uv) geo.setAttribute('uv', uvAttr);
            if (!geo.attributes.uv1) geo.setAttribute('uv1', uvAttr);
            if (!geo.attributes.uv2) geo.setAttribute('uv2', uvAttr);
          }
        }

        const origMat = mesh.material;
        const matList = Array.isArray(origMat) ? origMat : [origMat];
        const firstMat = matList[0];
        const materialName =
          (firstMat && firstMat.name ? firstMat.name : '') || mesh.name || `Material_${meshCount}`;

        const origRoughness: number[] = [];
        const origMetalness: number[] = [];
        const origNormalScale: THREE.Vector2[] = [];
        const origColorHex: number[] = [];
        const origMap: (THREE.Texture | null)[] = [];
        const origRoughnessMap: (THREE.Texture | null)[] = [];
        const origMetalnessMap: (THREE.Texture | null)[] = [];
        const origNormalMap: (THREE.Texture | null)[] = [];
        const origAoMap: (THREE.Texture | null)[] = [];
        const origEmissiveMap: (THREE.Texture | null)[] = [];
        const origAlphaMap: (THREE.Texture | null)[] = [];

        for (const m of matList) {
          if (m) matSet.add(m);
          if (m instanceof THREE.MeshStandardMaterial) {
            origRoughness.push(m.roughness);
            origMetalness.push(m.metalness);
            origNormalScale.push(m.normalScale ? m.normalScale.clone() : new THREE.Vector2(1, 1));
            origColorHex.push(m.color ? m.color.getHex() : 0xffffff);
            origMap.push(m.map || null);
            origRoughnessMap.push(m.roughnessMap || null);
            origMetalnessMap.push(m.metalnessMap || null);
            origNormalMap.push(m.normalMap || null);
            origAoMap.push(m.aoMap || null);
            origEmissiveMap.push(m.emissiveMap || null);
            origAlphaMap.push(m.alphaMap || null);
            if (m.map) m.map.anisotropy = maxAniso;
            if (m.normalMap) m.normalMap.anisotropy = maxAniso;
          } else {
            origRoughness.push(0.5);
            origMetalness.push(0.0);
            origNormalScale.push(new THREE.Vector2(1, 1));
            origColorHex.push(0xffffff);
            origMap.push(null);
            origRoughnessMap.push(null);
            origMetalnessMap.push(null);
            origNormalMap.push(null);
            origAoMap.push(null);
            origEmissiveMap.push(null);
            origAlphaMap.push(null);
          }
        }

        const isPackedMr = Boolean(origRoughnessMap[0] && origRoughnessMap[0] === origMetalnessMap[0]);
        const isPackedOrmAo = Boolean(
          origAoMap[0] && origRoughnessMap[0] && origAoMap[0] === origRoughnessMap[0]
        );

        extractedUvs.push({
          name: mesh.name || `Malha_${meshCount}`,
          materialName,
          sourceType: 'glb',
          importSerial: currentGlbImportSerial,
          uvEdges: extractedEdges,
          uv1Edges: extractedUv1Edges,
          triCount: meshTris,
          materialColor: `#${(origColorHex[0] ?? 0xffffff).toString(16).padStart(6, '0')}`,
          textures: {
            baseColor: extractTextureDataUrl(origMap[0], texCache),
            roughness: extractTextureDataUrl(origRoughnessMap[0], texCache, isPackedMr ? 'g' : undefined),
            metallic: extractTextureDataUrl(origMetalnessMap[0], texCache, isPackedMr ? 'b' : undefined),
            normal: extractTextureDataUrl(origNormalMap[0], texCache),
            ao: extractTextureDataUrl(origAoMap[0], texCache, isPackedOrmAo ? 'r' : undefined),
            emissive: extractTextureDataUrl(origEmissiveMap[0], texCache),
            opacity: extractTextureDataUrl(origAlphaMap[0], texCache),
          },
        });

        let outlineMesh: THREE.Mesh | null = null;
        if (!(mesh as THREE.SkinnedMesh).isSkinnedMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && geo) {
          outlineMesh = new THREE.Mesh(geo, outlineBaseMat);
          outlineMesh.userData.isAlexHelper = true;
          outlineMesh.scale.setScalar(1.02);
          outlineMesh.visible = false;
          mesh.add(outlineMesh);
        }

        uploadedRecords.push({
          mesh,
          materialName,
          origMat,
          origRoughness,
          origMetalness,
          origNormalScale,
          origColorHex,
          origMap,
          origRoughnessMap,
          origMetalnessMap,
          origNormalMap,
          origAoMap,
          origEmissiveMap,
          origAlphaMap,
          customMap: null,
          pbrMaps: {},
          paintData: null,
          outlineMesh,
          toonMat: null,
        });
      }

      uploadedGroup = model;
      scene.add(model);
      characterRoot.visible = false;

      if (hasSkeleton) {
        uploadedSkeletonHelper = new THREE.SkeletonHelper(model);
        uploadedSkeletonHelper.visible = stateRef.current.showSkeleton;
        scene.add(uploadedSkeletonHelper);
      }

      uploadedClips = gltf.animations || [];
      let duration = 0;
      if (uploadedClips.length > 0) {
        uploadedMixer = new THREE.AnimationMixer(model);
        uploadedActions = uploadedClips.map((clip) => uploadedMixer!.clipAction(clip));
        uploadedActions[0].play();
        activeUploadedClipIdx = 0;
        duration = uploadedClips[0].duration || 1;
      }

      applyMaterialSettings();

      onImportedUvsRef.current?.(extractedUvs.length > 0 ? extractedUvs : null);
      loadedAssetNameRef.current = assetName;
      setLoadedAsset({
        name: assetName,
        meshCount,
        triCount,
        matCount: matSet.size,
        hasSkeleton,
        animClips: uploadedClips.map((c, i) => c.name || `Clip_${i + 1}`),
        activeClipIdx: 0,
        duration,
      });
      refreshHierarchyState();
      selectThreeObject(model);
      setIsPlaying(uploadedClips.length > 0);
      setCurrentFrame(1);
      stateRef.current.frame = 1;
      if (!preserveTransform) {
        stateRef.current.camTarget = 'q34';
        stateRef.current.camTransitioning = true;
        setActivePreset('q34');
      }
      setIsLoadingModel(false);
    }

    loadFilesRef.current = async (fileList: FileList | File[]) => {
      const rawFiles = Array.from(fileList);
      if (rawFiles.length === 0) return;

      const directModelFile = rawFiles.find((f) => /\.(glb|gltf|obj)$/i.test(f.name));
      if (directModelFile) {
        onImportedModelFileRef.current?.(directModelFile);
      }

      setLoadError(null);
      setIsLoadingModel(true);

      const expandedEntries: { file: File; relPath: string }[] = [];
      for (const f of rawFiles) {
        if (/\.zip$/i.test(f.name)) {
          try {
            const zip = await JSZip.loadAsync(f);
            const entries = Object.values(zip.files).filter(
              (entry) => !entry.dir && !entry.name.startsWith('__MACOSX')
            );
            for (const entry of entries) {
              const blob = await entry.async('blob');
              const cleanBase = entry.name.split('/').pop() || entry.name;
              expandedEntries.push({
                file: new File([blob], cleanBase),
                relPath: entry.name.replace(/^\.\//, '').toLowerCase(),
              });
            }
          } catch {
            setIsLoadingModel(false);
            setLoadError('Não foi possível abrir o pacote .zip selecionado.');
            return;
          }
        } else {
          expandedEntries.push({
            file: f,
            relPath: f.name.toLowerCase(),
          });
        }
      }

      const expandedFiles = expandedEntries.map((e) => e.file);
      const mainEntry = expandedEntries.find((e) => /\.(glb|gltf)$/i.test(e.file.name));
      if (!mainEntry) {
        setIsLoadingModel(false);
        setLoadError('Selecione um arquivo .glb, .gltf ou .zip contendo um modelo 3D válido.');
        return;
      }

      const mainFile = mainEntry.file;
      const containerCheck = await inspectGltfBinaryOrJson(mainFile, expandedFiles);

      const urlMap = new Map<string, string>();
      const batchUrls: string[] = [];
      for (const entry of expandedEntries) {
        const blobUrl = URL.createObjectURL(entry.file);
        batchUrls.push(blobUrl);
        urlMap.set(entry.relPath, blobUrl);
        urlMap.set(entry.file.name.toLowerCase(), blobUrl);
      }

      const manager = new THREE.LoadingManager();
      manager.setURLModifier((url) => {
        if (url.startsWith('blob:') || url.startsWith('data:')) return url;
        try {
          const normalized = decodeURIComponent(url.split('?')[0]).replace(/^\.\//, '').toLowerCase();
          if (urlMap.has(normalized)) return urlMap.get(normalized)!;
          const cleanName = normalized.split('/').pop() || '';
          return urlMap.get(cleanName) || url;
        } catch {
          return url;
        }
      });

      try {
        if (MeshoptDecoder?.ready) {
          await MeshoptDecoder.ready.catch(() => undefined);
        }
        const loader = buildConfiguredGltfLoader(manager);
        const isGlb = /\.glb$/i.test(mainFile.name);
        const payload = isGlb ? await mainFile.arrayBuffer() : await mainFile.text();
        const gltf = await loader.parseAsync(payload, '');
        mountLoadedGltf(gltf, mainFile.name, batchUrls, containerCheck);
        showBriefStatus(`Modelo importado: ${mainFile.name}`);
      } catch (err) {
        batchUrls.forEach((u) => URL.revokeObjectURL(u));
        setIsLoadingModel(false);
        const reason = err instanceof Error && err.message ? ` (${err.message})` : '';
        setLoadError(
          `Não foi possível ler o arquivo GLB/glTF${reason}. Verifique se o arquivo é um glTF 2.0 válido.`
        );
      }
    };

    loadSampleRef.current = async () => {
      const sampleCandidates = [
        './samples/DamagedHelmet.glb',
        '/samples/DamagedHelmet.glb',
        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
      ];
      setLoadError(null);
      setIsLoadingModel(true);
      try {
        if (MeshoptDecoder?.ready) {
          await MeshoptDecoder.ready.catch(() => undefined);
        }
        let buffer: ArrayBuffer | null = null;
        let lastStatus = 'Falha de rede';
        for (const candidateUrl of sampleCandidates) {
          try {
            const res = await fetch(candidateUrl);
            if (!res.ok) {
              lastStatus = `HTTP ${res.status}`;
              continue;
            }
            const ab = await res.arrayBuffer();
            if (ab.byteLength >= 12 && new DataView(ab).getUint32(0, true) === 0x46546c67) {
              buffer = ab;
              break;
            }
            lastStatus = 'Conteúdo não é um binário GLB válido';
          } catch (fetchErr) {
            lastStatus = fetchErr instanceof Error ? fetchErr.message : 'Erro de rede';
          }
        }
        if (!buffer) {
          throw new Error(lastStatus);
        }
        const loader = buildConfiguredGltfLoader();
        const gltf = await loader.parseAsync(buffer, '');
        mountLoadedGltf(gltf, 'DamagedHelmet.glb', [], null);
        showBriefStatus('Modelo de exemplo PBR carregado (DamagedHelmet.glb)');
      } catch (err) {
        setIsLoadingModel(false);
        const reason = err instanceof Error && err.message ? ` (${err.message})` : '';
        setLoadError(`Não foi possível carregar o modelo de exemplo${reason}.`);
      }
    };

    resetAssetRef.current = () => {
      void clearSavedStudioProject();
      setLastSavedLabel(null);
      disposeUploadedModel();
      currentGlbImportSerial = 0;
      setHideDefaultBase(true);
      stateRef.current.hideDefaultBase = true;
      characterRoot.visible = false;
      quadrupedRoot.visible = false;
      onImportedUvsRef.current?.(null);
      loadedAssetNameRef.current = null;
      setLoadedAsset(null);
      setLoadError(null);
      setShowSkeleton(false);
      setIsPlaying(true);
      setCurrentFrame(1);
      stateRef.current.frame = 1;
      applyMaterialSettings();
      refreshHierarchyState();
      void loadSampleRef.current?.();
    };

    selectClipRef.current = (idx: number) => {
      if (!uploadedMixer || !uploadedActions[idx]) return;
      uploadedActions.forEach((a, i) => {
        if (i === idx) {
          a.reset().play();
        } else {
          a.stop();
        }
      });
      activeUploadedClipIdx = idx;
      const dur = uploadedClips[idx]?.duration || 1;
      setLoadedAsset((prev) => (prev ? { ...prev, activeClipIdx: idx, duration: dur } : prev));
    };

    scrubUploadedTimeRef.current = (frame: number) => {
      if (!uploadedMixer || !uploadedActions[activeUploadedClipIdx]) return;
      const action = uploadedActions[activeUploadedClipIdx];
      const dur = uploadedClips[activeUploadedClipIdx]?.duration || 1;
      const maxF = Math.max(1, stateRef.current.animEndFrame);
      const norm = maxF > 1 ? THREE.MathUtils.clamp((frame - 1) / (maxF - 1), 0, 1) : 0;
      const timeSec = norm * dur;
      action.paused = false;
      uploadedMixer.setTime(timeSec);
    };

    verifyCurrentSceneRef.current = () => {
      const activeDefaultRoot = stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot;
      const target =
        uploadedGroup ||
        (stateRef.current.hideDefaultBase && studioObjectsGroup.children.length > 0
          ? studioObjectsGroup
          : activeDefaultRoot);
      const clips = uploadedGroup ? uploadedClips : [];
      const rigLabel = RIG_PRESET_DEFINITIONS[stateRef.current.rigPreset].label;
      const name =
        loadedAssetNameRef.current ||
        (target === studioObjectsGroup ? 'Cena_Objetos_3D' : `DamagedHelmet.glb · ${rigLabel}`);
      const report = auditThreeScene(target, clips, name, lastContainerCheck);
      setVerificationReport(report);
    };

    const showBriefStatus = (msg: string) => {
      if (exportStatusTimerRef.current !== null) {
        window.clearTimeout(exportStatusTimerRef.current);
      }
      setExportStatus(msg);
      exportStatusTimerRef.current = window.setTimeout(() => {
        setExportStatus(null);
        exportStatusTimerRef.current = null;
      }, 3200);
    };

    function extractUvEdgesFromMesh(
      mesh: THREE.Mesh,
      maxTrisCap = 40000
    ): { edges: Float32Array; uv1Edges?: Float32Array; triCount: number } {
      const geo = mesh.geometry;
      if (!geo) return { edges: new Float32Array(0), triCount: 0 };
      const meshTris = geo.index
        ? Math.round(geo.index.count / 3)
        : Math.round((geo.attributes.position?.count || 0) / 3);
      const realUv1Attr = geo.attributes.uv1;
      const uvAttr = geo.attributes.uv || realUv1Attr || geo.attributes.uv2;
      if (!uvAttr) return { edges: new Float32Array(0), triCount: meshTris };

      const edges = extractEdgesForAttr(geo, uvAttr, meshTris, maxTrisCap);
      const uv1Edges =
        realUv1Attr && realUv1Attr !== uvAttr
          ? extractEdgesForAttr(geo, realUv1Attr, meshTris, maxTrisCap)
          : undefined;

      if (!geo.attributes.uv) geo.setAttribute('uv', uvAttr);
      if (!geo.attributes.uv1) geo.setAttribute('uv1', uvAttr);
      if (!geo.attributes.uv2) geo.setAttribute('uv2', uvAttr);

      return { edges, uv1Edges, triCount: meshTris };
    }

    function syncInspectorUvs(forceEmitDefault = false) {
      const texCache: TextureExtractCache = new WeakMap();
      if (uploadedGroup && uploadedRecords.length > 0) {
        const synced: ImportedUvMesh[] = uploadedRecords.map((rec, idx) => {
          const { edges, uv1Edges, triCount } = extractUvEdgesFromMesh(rec.mesh);
          const baseTex = rec.paintData?.tex || rec.customMap || rec.origMap[0] || null;
          const roughTex = rec.pbrMaps.roughnessMap || rec.origRoughnessMap[0] || null;
          const metalTex = rec.pbrMaps.metalnessMap || rec.origMetalnessMap[0] || null;
          const normalTex = rec.pbrMaps.normalMap || rec.origNormalMap[0] || null;
          const aoTex = rec.pbrMaps.aoMap || rec.origAoMap[0] || null;
          const emissiveTex = rec.pbrMaps.emissiveMap || rec.origEmissiveMap[0] || null;
          const alphaTex = rec.pbrMaps.alphaMap || rec.origAlphaMap[0] || null;
          const isPackedMr = Boolean(roughTex && roughTex === metalTex);
          const isPackedOrmAo = Boolean(aoTex && roughTex && aoTex === roughTex);
          return {
            name: rec.mesh.name || `Malha_${idx + 1}`,
            materialName: rec.materialName,
            sourceType: 'glb',
            importSerial: currentGlbImportSerial,
            uvEdges: edges,
            uv1Edges,
            triCount,
            materialColor: `#${(rec.origColorHex[0] ?? 0xffffff).toString(16).padStart(6, '0')}`,
            textures: {
              baseColor: extractTextureDataUrl(baseTex, texCache),
              roughness: extractTextureDataUrl(roughTex, texCache, isPackedMr ? 'g' : undefined),
              metallic: extractTextureDataUrl(metalTex, texCache, isPackedMr ? 'b' : undefined),
              normal: extractTextureDataUrl(normalTex, texCache),
              ao: extractTextureDataUrl(aoTex, texCache, isPackedOrmAo ? 'r' : undefined),
              emissive: extractTextureDataUrl(emissiveTex, texCache),
              opacity: extractTextureDataUrl(alphaTex, texCache),
            },
          };
        });
        onImportedUvsRef.current?.(synced.length > 0 ? synced : null);
        return;
      }

      const targetGroupType = stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid';
      const activeParts = parts.filter((p) => p.groupType === targetGroupType);
      const hasCustomDefault = activeParts.some(
        (p) => p.paintData || p.customMap || Object.keys(p.pbrMaps).length > 0
      );
      if (forceEmitDefault || hasCustomDefault) {
        const synced: ImportedUvMesh[] = activeParts.map((p, idx) => {
          const { edges, uv1Edges, triCount } = extractUvEdgesFromMesh(p.mesh);
          return {
            name: p.mesh.name || `Parte_${idx + 1}`,
            sourceType: 'default',
            uvEdges: edges,
            uv1Edges,
            triCount,
            materialColor: `#${p.baseColor.toString(16).padStart(6, '0')}`,
            textures: {
              baseColor: extractTextureDataUrl(p.paintData?.tex || p.customMap || null, texCache),
              roughness: extractTextureDataUrl(p.pbrMaps.roughnessMap || null, texCache),
              metallic: extractTextureDataUrl(p.pbrMaps.metalnessMap || null, texCache),
              normal: extractTextureDataUrl(p.pbrMaps.normalMap || null, texCache),
              ao: extractTextureDataUrl(p.pbrMaps.aoMap || null, texCache),
              emissive: extractTextureDataUrl(p.pbrMaps.emissiveMap || null, texCache),
              opacity: extractTextureDataUrl(p.pbrMaps.alphaMap || null, texCache),
            },
          };
        });
        onImportedUvsRef.current?.(synced.length > 0 ? synced : null);
      } else {
        onImportedUvsRef.current?.(null);
      }
    }

    const assignMaterialToPartOrRecord = (hitMesh: THREE.Mesh | null, applyAll = false) => {
      const spec = getActiveMaterialSpec();
      const targetGroupType = stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid';

      if (uploadedGroup) {
        for (const rec of uploadedRecords) {
          if (!applyAll && rec.mesh !== hitMesh) continue;
          rec.origColorHex = rec.origColorHex.map(() => spec.colorHex);
          rec.origRoughness = rec.origRoughness.map(() => spec.roughness);
          rec.origMetalness = rec.origMetalness.map(() => spec.metalness);
          if (rec.paintData) {
            rec.paintData.tex.dispose();
            rec.paintData = null;
          }
          rec.pbrMaps = {};
          rec.customMap = sharedUploadedCustomTex;
        }
        if (applyAll) setActiveProceduralLabel(null);
        applyMaterialSettings();
        syncInspectorUvs();
        showBriefStatus(
          applyAll
            ? `Material "${spec.label}" aplicado em todo o modelo`
            : `Material "${spec.label}" aplicado em: ${hitMesh?.name || 'malha'}`
        );
        return;
      }

      for (const p of parts) {
        if (p.groupType !== targetGroupType) continue;
        if (!applyAll && p.mesh !== hitMesh) continue;
        p.baseColor = spec.colorHex;
        p.baseRoughness = spec.roughness;
        p.baseMetalness = spec.metalness;
        p.clearcoat = spec.clearcoat;
        p.useNormal = spec.useNormal;
        p.customMap = null;
        p.pbrMaps = {};
        if (p.paintData) {
          p.paintData.tex.dispose();
          p.paintData = null;
        }
      }
      if (applyAll) setActiveProceduralLabel(null);
      applyMaterialSettings();
      syncInspectorUvs();
      showBriefStatus(
        applyAll
          ? `Material "${spec.label}" aplicado em todo o modelo`
          : `Material "${spec.label}" aplicado em: ${hitMesh?.name || 'parte'}`
      );
    };

    applyMaterialToAllRef.current = () => {
      if (stateRef.current.shadingMode !== 'pbr') {
        setShadingMode('pbr');
        stateRef.current.shadingMode = 'pbr';
      }
      assignMaterialToPartOrRecord(null, true);
    };

    applyProceduralBundleRef.current = (params: ProceduralPbrParams) => {
      if (activeProceduralBundle) {
        activeProceduralBundle.dispose();
        activeProceduralBundle = null;
      }
      const bundle = createThreePbrTextureBundle(params, maxAniso, 512, !uploadedGroup);
      activeProceduralBundle = bundle;

      if (uploadedGroup) {
        for (const rec of uploadedRecords) {
          if (rec.paintData) {
            rec.paintData.tex.dispose();
            rec.paintData = null;
          }
          rec.customMap = bundle.map;
          rec.pbrMaps = {
            roughnessMap: bundle.roughnessMap,
            metalnessMap: bundle.metalnessMap,
            normalMap: bundle.normalMap,
            aoMap: bundle.aoMap,
          };
        }
      } else {
        const targetGroupType = stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid';
        for (const p of parts) {
          if (p.groupType !== targetGroupType) continue;
          if (p.paintData) {
            p.paintData.tex.dispose();
            p.paintData = null;
          }
          p.customMap = bundle.map;
          p.pbrMaps = {
            roughnessMap: bundle.roughnessMap,
            metalnessMap: bundle.metalnessMap,
            normalMap: bundle.normalMap,
            aoMap: bundle.aoMap,
          };
        }
      }

      if (stateRef.current.shadingMode !== 'pbr') {
        setShadingMode('pbr');
        stateRef.current.shadingMode = 'pbr';
      }
      const presetMeta = PROCEDURAL_PBR_PRESETS.find((pr) => pr.id === params.preset);
      const label = presetMeta?.label || params.preset;
      setActiveProceduralLabel(label);
      setCustomTextureName(null);
      applyMaterialSettings();
      syncInspectorUvs();
      showBriefStatus(`Material Procedural + 5 mapas PBR aplicado: ${label}`);
    };

    applySubstanceBundleRef.current = (req: SubstanceTextureSetRequest) => {
      void (async () => {
        try {
          setLoadError(null);
          const bundle = await loadSubstanceBundleToThree(req, !uploadedGroup, maxAniso);
          if (activeProceduralBundle) {
            activeProceduralBundle.dispose();
            activeProceduralBundle = null;
          }
          activeProceduralBundle = bundle;

          const hasSelectedPrim =
            selectedSceneObject != null && studioPrimitives.some((r) => r.mesh === selectedSceneObject);
          const applyToPrimitives =
            !uploadedGroup && studioPrimitives.length > 0 && (stateRef.current.hideDefaultBase || hasSelectedPrim);

          if (uploadedGroup) {
            const matchedTargets = req.targetMeshName
              ? uploadedRecords.filter((r) => r.mesh.name === req.targetMeshName)
              : [];
            const targets = matchedTargets.length > 0 ? matchedTargets : uploadedRecords;
            for (const rec of targets) {
              if (rec.paintData) {
                rec.paintData.tex.dispose();
                rec.paintData = null;
              }
              rec.customMap = req.slots.baseColor ? bundle.map : null;
              rec.pbrMaps = {
                roughnessMap: req.slots.roughness ? bundle.roughnessMap : null,
                metalnessMap: req.slots.metallic ? bundle.metalnessMap : null,
                normalMap: req.slots.normal ? bundle.normalMap : null,
                aoMap: req.slots.ao ? bundle.aoMap : null,
                emissiveMap: req.slots.emissive ? (bundle.emissiveMap ?? null) : null,
                alphaMap: req.slots.opacity ? (bundle.alphaMap ?? null) : null,
              };
            }
          } else if (applyToPrimitives) {
            const targets = hasSelectedPrim
              ? studioPrimitives.filter((r) => r.mesh === selectedSceneObject)
              : studioPrimitives;
            for (const r of targets) {
              const mat = r.mesh.material;
              if (mat instanceof THREE.MeshStandardMaterial) {
                if (req.slots.baseColor) {
                  mat.map = bundle.map;
                  mat.color.setHex(0xffffff);
                }
                if (req.slots.roughness) {
                  mat.roughnessMap = bundle.roughnessMap;
                  mat.roughness = 1.0;
                }
                if (req.slots.metallic) {
                  mat.metalnessMap = bundle.metalnessMap;
                  mat.metalness = 1.0;
                }
                if (req.slots.normal) {
                  mat.normalMap = bundle.normalMap;
                }
                if (req.slots.ao) {
                  mat.aoMap = bundle.aoMap;
                  mat.aoMapIntensity = 1.0;
                }
                if (req.slots.emissive && bundle.emissiveMap) {
                  mat.emissiveMap = bundle.emissiveMap;
                  mat.emissive.setHex(0xffffff);
                }
                if (req.slots.opacity && bundle.alphaMap) {
                  mat.alphaMap = bundle.alphaMap;
                  mat.transparent = true;
                }
                mat.needsUpdate = true;
              }
            }
          } else {
            const targetGroupType = stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid';
            for (const p of parts) {
              if (p.groupType !== targetGroupType) continue;
              if (p.paintData) {
                p.paintData.tex.dispose();
                p.paintData = null;
              }
              p.customMap = req.slots.baseColor ? bundle.map : null;
              p.pbrMaps = {
                roughnessMap: req.slots.roughness ? bundle.roughnessMap : null,
                metalnessMap: req.slots.metallic ? bundle.metalnessMap : null,
                normalMap: req.slots.normal ? bundle.normalMap : null,
                aoMap: req.slots.ao ? bundle.aoMap : null,
                emissiveMap: req.slots.emissive ? (bundle.emissiveMap ?? null) : null,
                alphaMap: req.slots.opacity ? (bundle.alphaMap ?? null) : null,
              };
            }
          }

          if (stateRef.current.shadingMode !== 'pbr') {
            setShadingMode('pbr');
            stateRef.current.shadingMode = 'pbr';
          }
          setActiveProceduralLabel(`Substance: ${req.materialName}`);
          setCustomTextureName(null);
          applyMaterialSettings();
          syncInspectorUvs();
          const count = Object.values(req.slots).filter(Boolean).length;
          showBriefStatus(`Substance PBR aplicado (${count} canal(is)): ${req.materialName}`);
        } catch (err) {
          setLoadError(err instanceof Error ? err.message : 'Falha ao aplicar texturas Substance.');
        }
      })();
    };

    loadPbrChannelTextureRef.current = (
      channel: 'map' | 'roughnessMap' | 'metalnessMap' | 'normalMap' | 'aoMap',
      file: File
    ) => {
      if (channel === 'map') {
        loadCustomTextureFileRef.current?.(file);
        return;
      }
      const url = URL.createObjectURL(file);
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (tex) => {
          URL.revokeObjectURL(url);
          tex.colorSpace = THREE.NoColorSpace;
          tex.flipY = !uploadedGroup;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.anisotropy = maxAniso;
          if (channel === 'aoMap') tex.channel = 0;
          tex.needsUpdate = true;

          const oldTex = manualChannelTextures[channel];
          if (oldTex) oldTex.dispose();
          manualChannelTextures[channel] = tex;

          if (uploadedGroup) {
            for (const rec of uploadedRecords) {
              rec.pbrMaps = { ...rec.pbrMaps, [channel]: tex };
            }
          } else {
            const targetGroupType = stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid';
            for (const p of parts) {
              if (p.groupType !== targetGroupType) continue;
              p.pbrMaps = { ...p.pbrMaps, [channel]: tex };
            }
          }

          if (stateRef.current.shadingMode !== 'pbr') {
            setShadingMode('pbr');
            stateRef.current.shadingMode = 'pbr';
          }
          applyMaterialSettings();
          syncInspectorUvs();
          showBriefStatus(`Mapa PBR (${channel.replace('Map', '')}) aplicado: ${file.name}`);
        },
        undefined,
        () => {
          URL.revokeObjectURL(url);
          setLoadError('Não foi possível carregar o mapa de textura PBR.');
        }
      );
    };

    loadCustomTextureFileRef.current = (file: File) => {
      const url = URL.createObjectURL(file);
      const loader = new THREE.TextureLoader();
      loader.load(
        url,
        (tex) => {
          URL.revokeObjectURL(url);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.flipY = !uploadedGroup;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.anisotropy = maxAniso;
          tex.needsUpdate = true;

          if (uploadedGroup) {
            if (sharedUploadedCustomTex) sharedUploadedCustomTex.dispose();
            sharedUploadedCustomTex = tex;
            for (const rec of uploadedRecords) {
              if (rec.paintData) {
                rec.paintData.tex.dispose();
                rec.paintData = null;
              }
              rec.customMap = tex;
            }
          } else {
            const targetGroupType = stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid';
            const disposed = new Set<THREE.Texture>();
            for (const p of parts) {
              if (p.groupType !== targetGroupType) continue;
              if (p.customMap && !disposed.has(p.customMap) && p.customMap !== activeProceduralBundle?.map) {
                p.customMap.dispose();
                disposed.add(p.customMap);
              }
              if (p.paintData) {
                p.paintData.tex.dispose();
                p.paintData = null;
              }
              p.customMap = tex;
            }
          }

          if (stateRef.current.shadingMode !== 'pbr') {
            setShadingMode('pbr');
            stateRef.current.shadingMode = 'pbr';
          }
          setCustomTextureName(file.name);
          applyMaterialSettings();
          syncInspectorUvs();
          showBriefStatus(`Textura Base Color aplicada: ${file.name}`);
        },
        undefined,
        () => {
          URL.revokeObjectURL(url);
          setLoadError('Não foi possível carregar a imagem de textura (use PNG, JPG ou WEBP).');
        }
      );
    };

    clearPaintTexturesRef.current = () => {
      paintUndoStack.length = 0;
      setCanUndoPaint(false);
      if (activeProceduralBundle) {
        activeProceduralBundle.dispose();
        activeProceduralBundle = null;
      }
      (['roughnessMap', 'metalnessMap', 'normalMap', 'aoMap'] as const).forEach((ch) => {
        if (manualChannelTextures[ch]) {
          manualChannelTextures[ch]!.dispose();
          delete manualChannelTextures[ch];
        }
      });

      if (uploadedGroup) {
        if (sharedUploadedCustomTex) {
          sharedUploadedCustomTex.dispose();
          sharedUploadedCustomTex = null;
        }
        for (const rec of uploadedRecords) {
          if (rec.paintData) {
            rec.paintData.tex.dispose();
            rec.paintData = null;
          }
          rec.customMap = null;
          rec.pbrMaps = {};
        }
      } else {
        const disposed = new Set<THREE.Texture>();
        for (const p of parts) {
          if (p.paintData) {
            p.paintData.tex.dispose();
            p.paintData = null;
          }
          if (p.customMap && !disposed.has(p.customMap)) {
            p.customMap.dispose();
            disposed.add(p.customMap);
          }
          p.customMap = null;
          p.pbrMaps = {};
        }
      }
      setCustomTextureName(null);
      setActiveProceduralLabel(null);
      applyMaterialSettings();
      syncInspectorUvs();
      showBriefStatus('Pintura, mapas e texturas customizadas removidas');
    };

    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let isPointerPainting = false;
    let lastPaintMesh: THREE.Mesh | null = null;
    let lastPaintUv: { u: number; v: number } | null = null;
    let pointerDownClient: { x: number; y: number } | null = null;

    const getRaycastHit = (e: PointerEvent) => {
      const rect = activeRenderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const baseMeshes: THREE.Object3D[] = uploadedGroup
        ? uploadedRecords.map((r) => r.mesh)
        : stateRef.current.hideDefaultBase
        ? []
        : parts
            .filter(
              (p) =>
                p.groupType === (stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid')
            )
            .map((p) => p.mesh);

      const candidateMeshes: THREE.Object3D[] = [
        ...studioPrimitives.map((r) => r.mesh),
        ...baseMeshes,
      ];

      const hits = raycaster.intersectObjects(candidateMeshes, false);
      return hits.length > 0 ? hits[0] : null;
    };

    const ensurePaintData = (mesh: THREE.Mesh): PaintCanvasState | null => {
      if (uploadedGroup) {
        const rec = uploadedRecords.find((r) => r.mesh === mesh);
        if (!rec) return null;
        if (!rec.paintData) {
          rec.paintData = createPaintCanvas(
            rec.origColorHex[0] ?? 0xffffff,
            rec.customMap || rec.origMap[0] || null
          );
          applyMaterialSettings();
        }
        return rec.paintData;
      }
      const part = parts.find((p) => p.mesh === mesh);
      if (!part) return null;
      if (!part.paintData) {
        part.paintData = createPaintCanvas(part.baseColor, part.customMap);
        applyMaterialSettings();
      }
      return part.paintData;
    };

    undoPaintRef.current = () => {
      const snap = paintUndoStack.pop();
      setCanUndoPaint(paintUndoStack.length > 0);
      if (!snap) return;
      const paintState = ensurePaintData(snap.mesh);
      if (!paintState) return;
      paintState.ctx.putImageData(snap.imageData, 0, 0);
      paintState.tex.needsUpdate = true;
      syncInspectorUvs();
      showBriefStatus('Última pincelada desfeita');
    };

    const paintHit = (hit: THREE.Intersection) => {
      const mesh = hit.object as THREE.Mesh;
      const uv = hit.uv ? { u: hit.uv.x, v: hit.uv.y } : { u: 0.5, v: 0.5 };
      const paintState = ensurePaintData(mesh);
      if (!paintState) return;
      const color = stateRef.current.brushColor;
      const radius = stateRef.current.brushSize;

      if (lastPaintMesh === mesh && lastPaintUv) {
        const steps = Math.max(
          1,
          Math.min(18, Math.ceil(Math.hypot(uv.u - lastPaintUv.u, uv.v - lastPaintUv.v) * 140))
        );
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          paintDabOnCanvas(
            paintState,
            lastPaintUv.u + (uv.u - lastPaintUv.u) * t,
            lastPaintUv.v + (uv.v - lastPaintUv.v) * t,
            color,
            radius
          );
        }
      } else {
        paintDabOnCanvas(paintState, uv.u, uv.v, color, radius);
      }
      lastPaintMesh = mesh;
      lastPaintUv = uv;
    };

    const sculptUndoStack: { mesh: THREE.Mesh; geometryClone: THREE.BufferGeometry }[] = [];
    const _sculptLocalPt = new THREE.Vector3();
    const _sculptMirrorPt = new THREE.Vector3();
    const _sculptWorldScale = new THREE.Vector3();
    const _sculptVert = new THREE.Vector3();
    const _sculptNorm = new THREE.Vector3();
    const _sculptAvg = new THREE.Vector3();

    const syncMeshGeometryAttachment = (mesh: THREE.Mesh, nextGeo: THREE.BufferGeometry) => {
      const oldGeo = mesh.geometry;
      // Preserve skin weights via nearest-vertex lookup if this is a SkinnedMesh
      if (
        (mesh as THREE.SkinnedMesh).isSkinnedMesh &&
        oldGeo.attributes.skinIndex &&
        oldGeo.attributes.skinWeight &&
        !nextGeo.attributes.skinIndex
      ) {
        const oldPos = oldGeo.attributes.position;
        const oldSI = oldGeo.attributes.skinIndex;
        const oldSW = oldGeo.attributes.skinWeight;
        const newPos = nextGeo.attributes.position;
        const count = newPos.count;
        const newSI = new Uint16Array(count * 4);
        const newSW = new Float32Array(count * 4);
        const pN = new THREE.Vector3();
        const pO = new THREE.Vector3();
        for (let i = 0; i < count; i++) {
          pN.fromBufferAttribute(newPos, i);
          let bestIdx = 0;
          let bestDist = Infinity;
          const step = oldPos.count > 4000 ? Math.ceil(oldPos.count / 2500) : 1;
          for (let j = 0; j < oldPos.count; j += step) {
            pO.fromBufferAttribute(oldPos, j);
            const d = pN.distanceToSquared(pO);
            if (d < bestDist) {
              bestDist = d;
              bestIdx = j;
            }
          }
          for (let k = 0; k < 4; k++) {
            newSI[i * 4 + k] = oldSI.array[bestIdx * 4 + k] || 0;
            newSW[i * 4 + k] = oldSW.array[bestIdx * 4 + k] || (k === 0 ? 1 : 0);
          }
        }
        nextGeo.setAttribute('skinIndex', new THREE.BufferAttribute(newSI, 4));
        nextGeo.setAttribute('skinWeight', new THREE.BufferAttribute(newSW, 4));
      }

      mesh.geometry = nextGeo;
      const upRec = uploadedRecords.find((r) => r.mesh === mesh);
      if (upRec?.outlineMesh) upRec.outlineMesh.geometry = nextGeo;
      const partRec = parts.find((p) => p.mesh === mesh);
      if (partRec?.outlineMesh) partRec.outlineMesh.geometry = nextGeo;
    };

    const getEditableTargetMeshes = (): THREE.Mesh[] => {
      if (selectedSceneObject) {
        if ((selectedSceneObject as THREE.Mesh).isMesh && selectedSceneObject.visible) {
          return [selectedSceneObject as THREE.Mesh];
        }
        const selectedGroupMeshes: THREE.Mesh[] = [];
        selectedSceneObject.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.visible) {
            selectedGroupMeshes.push(child as THREE.Mesh);
          }
        });
        if (selectedGroupMeshes.length > 0) return selectedGroupMeshes;
      }
      const list: THREE.Mesh[] = [];
      if (uploadedGroup) {
        uploadedRecords.forEach((r) => {
          if (r.mesh.visible) list.push(r.mesh);
        });
      } else {
        if (!stateRef.current.hideDefaultBase) {
          const groupTag = stateRef.current.rigPreset === 'QUADRUPEDE' ? 'quadruped' : 'humanoid';
          parts.forEach((p) => {
            if (p.groupType === groupTag && p.mesh.visible) list.push(p.mesh);
          });
        }
        studioPrimitives.forEach((pr) => {
          if (pr.mesh.visible) list.push(pr.mesh);
        });
      }
      return list;
    };

    const countMeshTris = (m: THREE.Mesh) => {
      const g = m.geometry;
      return g?.index
        ? Math.round(g.index.count / 3)
        : Math.round((g?.attributes?.position?.count || 0) / 3);
    };

    const pushSculptUndoSnapshot = (mesh: THREE.Mesh) => {
      if (!mesh.geometry?.attributes?.position) return;
      sculptUndoStack.push({
        mesh,
        geometryClone: mesh.geometry.clone(),
      });
      if (sculptUndoStack.length > 15) {
        const dropped = sculptUndoStack.shift();
        dropped?.geometryClone.dispose();
      }
      setCanUndoSculpt(sculptUndoStack.length > 0);
    };

    undoSculptRef.current = () => {
      const snap = sculptUndoStack.pop();
      setCanUndoSculpt(sculptUndoStack.length > 0);
      if (!snap) return;
      const oldGeo = snap.mesh.geometry;
      syncMeshGeometryAttachment(snap.mesh, snap.geometryClone);
      if (oldGeo !== snap.geometryClone) oldGeo.dispose();
      refreshHierarchyState();
      syncInspectorUvs();
      showBriefStatus('Alteração de escultura/malha desfeita');
    };

    subdivideMeshRef.current = () => {
      const targets = getEditableTargetMeshes();
      if (targets.length === 0) return;
      let beforeTris = 0;
      let afterTris = 0;
      for (const m of targets) {
        beforeTris += countMeshTris(m);
        pushSculptUndoSnapshot(m);
        const subGeo = subdivideMeshGeometry(m.geometry);
        const prev = m.geometry;
        syncMeshGeometryAttachment(m, subGeo);
        if (prev !== subGeo) prev.dispose();
        afterTris += countMeshTris(m);
      }
      if (uploadedGroup) {
        setLoadedAsset((prev) => (prev ? { ...prev, triCount: afterTris } : prev));
      }
      refreshHierarchyState();
      syncInspectorUvs();
      showBriefStatus(
        `Subdivisão (Multires): ${beforeTris.toLocaleString('pt-BR')} → ${afterTris.toLocaleString('pt-BR')} tris`
      );
    };

    retopoMeshRef.current = (ratio: number) => {
      const targets = getEditableTargetMeshes();
      if (targets.length === 0) return;
      let beforeTris = 0;
      let afterTris = 0;
      for (const m of targets) {
        beforeTris += countMeshTris(m);
        pushSculptUndoSnapshot(m);
        const nextGeo = retopologizeMeshGeometry(m.geometry, ratio);
        const prev = m.geometry;
        syncMeshGeometryAttachment(m, nextGeo);
        if (prev !== nextGeo) prev.dispose();
        afterTris += countMeshTris(m);
      }
      if (uploadedGroup) {
        setLoadedAsset((prev) => (prev ? { ...prev, triCount: afterTris } : prev));
      }
      refreshHierarchyState();
      syncInspectorUvs();
      showBriefStatus(
        `Retopology (${Math.round(ratio * 100)}%): ${beforeTris.toLocaleString('pt-BR')} → ${afterTris.toLocaleString('pt-BR')} tris`
      );
    };

    weldMeshRef.current = () => {
      const targets = getEditableTargetMeshes();
      if (targets.length === 0) return;
      let beforeVerts = 0;
      let afterVerts = 0;
      let totalTris = 0;
      for (const m of targets) {
        beforeVerts += m.geometry?.attributes?.position?.count || 0;
        pushSculptUndoSnapshot(m);
        const cleanGeo = weldCleanTopology(m.geometry, 1e-4);
        const prev = m.geometry;
        syncMeshGeometryAttachment(m, cleanGeo);
        if (prev !== cleanGeo) prev.dispose();
        afterVerts += cleanGeo.attributes.position.count;
        totalTris += countMeshTris(m);
      }
      if (uploadedGroup) {
        setLoadedAsset((prev) => (prev ? { ...prev, triCount: totalTris } : prev));
      }
      refreshHierarchyState();
      syncInspectorUvs();
      showBriefStatus(
        `Malha soldada (bmesh weld): ${beforeVerts.toLocaleString('pt-BR')} → ${afterVerts.toLocaleString('pt-BR')} vértices`
      );
    };

    const applySculptBrush = (
      hit: THREE.Intersection,
      mode: 'sculpt_push' | 'sculpt_pull' | 'sculpt_smooth'
    ) => {
      const mesh = hit.object as THREE.Mesh;
      const geo = mesh.geometry;
      const posAttr = geo?.attributes?.position;
      if (!posAttr) return;
      let normAttr = geo.attributes.normal;
      if (!normAttr) {
        geo.computeVertexNormals();
        normAttr = geo.attributes.normal;
      }

      mesh.getWorldScale(_sculptWorldScale);
      const maxAxis = Math.max(
        Math.abs(_sculptWorldScale.x),
        Math.abs(_sculptWorldScale.y),
        Math.abs(_sculptWorldScale.z),
        0.001
      );
      const localRadius = stateRef.current.sculptRadius / maxAxis;
      const radiusSq = localRadius * localRadius;
      const strength = stateRef.current.sculptStrength / maxAxis;
      _sculptLocalPt.copy(hit.point);
      mesh.worldToLocal(_sculptLocalPt);

      // Coincident vertex grouping prevents seam tearing on non-indexed geometries
      const seamGroups = new Map<string, number[]>();
      const vertexGroupKey: string[] = new Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) {
        const key = `${Math.round(posAttr.getX(i) * 1e4)}_${Math.round(
          posAttr.getY(i) * 1e4
        )}_${Math.round(posAttr.getZ(i) * 1e4)}`;
        vertexGroupKey[i] = key;
        let arr = seamGroups.get(key);
        if (!arr) {
          arr = [];
          seamGroups.set(key, arr);
        }
        arr.push(i);
      }

      const sculptCenter = (centerPt: THREE.Vector3) => {
        const deltas = new Map<string, [number, number, number]>();
        if (mode === 'sculpt_smooth') {
          _sculptAvg.set(0, 0, 0);
          let count = 0;
          for (let i = 0; i < posAttr.count; i++) {
            _sculptVert.fromBufferAttribute(posAttr, i);
            if (_sculptVert.distanceToSquared(centerPt) <= radiusSq) {
              _sculptAvg.add(_sculptVert);
              count++;
            }
          }
          if (count > 1) {
            _sculptAvg.divideScalar(count);
            for (let i = 0; i < posAttr.count; i++) {
              const key = vertexGroupKey[i];
              if (deltas.has(key)) continue;
              _sculptVert.fromBufferAttribute(posAttr, i);
              const distSq = _sculptVert.distanceToSquared(centerPt);
              if (distSq <= radiusSq) {
                const dist = Math.sqrt(distSq);
                const w = (0.5 + 0.5 * Math.cos((Math.PI * dist) / localRadius)) * 0.22;
                deltas.set(key, [
                  THREE.MathUtils.lerp(_sculptVert.x, _sculptAvg.x, w),
                  THREE.MathUtils.lerp(_sculptVert.y, _sculptAvg.y, w),
                  THREE.MathUtils.lerp(_sculptVert.z, _sculptAvg.z, w),
                ]);
              }
            }
          }
        } else {
          const dirSign = mode === 'sculpt_pull' ? -1 : 1;
          for (let i = 0; i < posAttr.count; i++) {
            const key = vertexGroupKey[i];
            if (deltas.has(key)) continue;
            _sculptVert.fromBufferAttribute(posAttr, i);
            const distSq = _sculptVert.distanceToSquared(centerPt);
            if (distSq <= radiusSq) {
              const dist = Math.sqrt(distSq);
              const falloff = 0.5 + 0.5 * Math.cos((Math.PI * dist) / localRadius);
              if (normAttr) {
                // Average normal across coincident seam vertices for uniform displacement
                const grp = seamGroups.get(key) || [i];
                _sculptNorm.set(0, 0, 0);
                for (const gi of grp) {
                  _sculptNorm.x += normAttr.getX(gi);
                  _sculptNorm.y += normAttr.getY(gi);
                  _sculptNorm.z += normAttr.getZ(gi);
                }
                _sculptNorm.normalize();
              } else {
                _sculptNorm.copy(_sculptVert).sub(centerPt).normalize();
              }
              const delta = falloff * strength * dirSign;
              deltas.set(key, [
                _sculptVert.x + _sculptNorm.x * delta,
                _sculptVert.y + _sculptNorm.y * delta,
                _sculptVert.z + _sculptNorm.z * delta,
              ]);
            }
          }
        }

        deltas.forEach((xyz, key) => {
          const grp = seamGroups.get(key);
          if (!grp) return;
          for (const idx of grp) {
            posAttr.setXYZ(idx, xyz[0], xyz[1], xyz[2]);
          }
        });
      };

      sculptCenter(_sculptLocalPt);
      if (stateRef.current.sculptMirrorX && Math.abs(_sculptLocalPt.x) > 0.01) {
        _sculptMirrorPt.set(-_sculptLocalPt.x, _sculptLocalPt.y, _sculptLocalPt.z);
        sculptCenter(_sculptMirrorPt);
      }

      posAttr.needsUpdate = true;
      geo.computeVertexNormals();
      geo.computeBoundingSphere();
    };

    let isPointerSculpting = false;

    const isSculptMode = (m: ToolMode): m is 'sculpt_push' | 'sculpt_pull' | 'sculpt_smooth' =>
      m === 'sculpt_push' || m === 'sculpt_pull' || m === 'sculpt_smooth';

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerDownClient = { x: e.clientX, y: e.clientY };

      const mode = stateRef.current.toolMode;
      if (mode !== 'paint' && mode !== 'assign_mat' && !isSculptMode(mode)) return;

      const hit = getRaycastHit(e);
      if (!hit) return;

      controls.enabled = false;

      if (isSculptMode(mode)) {
        const hitMesh = hit.object as THREE.Mesh;
        pushSculptUndoSnapshot(hitMesh);
        isPointerSculpting = true;
        applySculptBrush(hit, mode);
        return;
      }

      if (stateRef.current.shadingMode !== 'pbr') {
        setShadingMode('pbr');
        stateRef.current.shadingMode = 'pbr';
      }

      if (mode === 'assign_mat') {
        assignMaterialToPartOrRecord(hit.object as THREE.Mesh, false);
        return;
      }

      if (mode === 'paint') {
        const hitMesh = hit.object as THREE.Mesh;
        const ps = ensurePaintData(hitMesh);
        if (ps) pushPaintUndoSnapshot(hitMesh, ps);
        isPointerPainting = true;
        lastPaintMesh = null;
        lastPaintUv = null;
        paintHit(hit);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (stateRef.current.playMode && !isPointerPainting && !isPointerSculpting) {
        const hit = getRaycastHit(e);
        hoveredPlayMesh = hit ? hit.object : null;
        return;
      }
      const mode = stateRef.current.toolMode;
      if (isPointerSculpting && isSculptMode(mode)) {
        const hit = getRaycastHit(e);
        if (hit) applySculptBrush(hit, mode);
        return;
      }
      if (!isPointerPainting || mode !== 'paint') return;
      const hit = getRaycastHit(e);
      if (hit) {
        paintHit(hit);
      } else {
        lastPaintMesh = null;
        lastPaintUv = null;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isPointerSculpting) {
        isPointerSculpting = false;
        refreshHierarchyState();
      }
      if (isPointerPainting) {
        isPointerPainting = false;
        lastPaintMesh = null;
        lastPaintUv = null;
        syncInspectorUvs();
      }
      controls.enabled = true;

      if (pointerDownClient) {
        const dist = Math.hypot(e.clientX - pointerDownClient.x, e.clientY - pointerDownClient.y);
        pointerDownClient = null;
        const mode = stateRef.current.toolMode;
        if (
          dist < 5 &&
          !transformControls.dragging &&
          mode !== 'paint' &&
          mode !== 'assign_mat' &&
          !isSculptMode(mode)
        ) {
          const hit = getRaycastHit(e);
          if (stateRef.current.playMode) {
            if (hit) {
              const rec = getPrimitiveRecord(hit.object);
              if (rec && rec.interaction === 'click_toggle') {
                rec.clickToggled = !rec.clickToggled;
              }
            }
          } else if (hit) {
            selectThreeObject(hit.object);
          } else {
            selectThreeObject(null);
          }
        }
      }
    };

    activeRenderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    exportModelRef.current = (format: 'glb' | 'gltf') => {
      const activeDefaultRoot = stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot;
      const baseTarget = uploadedGroup || activeDefaultRoot;
      const exportTargets: THREE.Object3D[] = [];
      if (uploadedGroup || !stateRef.current.hideDefaultBase) exportTargets.push(baseTarget);
      if (studioObjectsGroup.children.length > 0) exportTargets.push(studioObjectsGroup);
      const exportInput = exportTargets.length === 1 ? exportTargets[0] : exportTargets.length > 1 ? exportTargets : baseTarget;
      const prevMode = stateRef.current.shadingMode;

      const restoreMode = () => {
        if (stateRef.current.shadingMode !== prevMode) {
          stateRef.current.shadingMode = prevMode;
          applyMaterialSettings();
        }
      };

      if (prevMode !== 'pbr') {
        stateRef.current.shadingMode = 'pbr';
        applyMaterialSettings();
      }

      if (exportStatusTimerRef.current !== null) {
        window.clearTimeout(exportStatusTimerRef.current);
        exportStatusTimerRef.current = null;
      }

      setLoadError(null);
      setIsExporting(true);
      setExportStatus(format === 'glb' ? 'Gerando arquivo .glb...' : 'Gerando arquivo .gltf...');

      const rawBase = loadedAssetNameRef.current
        ? loadedAssetNameRef.current.replace(/\.(glb|gltf)$/i, '')
        : 'Anime_character_UV_textured';
      const fileName = `${rawBase}_pbr.${format}`;

      const exporter = new GLTFExporter();
      try {
        exporter.parse(
          exportInput,
          (result) => {
            restoreMode();
            const blob =
              result instanceof ArrayBuffer
                ? new Blob([result], { type: 'model/gltf-binary' })
                : new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' });

            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = fileName;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);

            setIsExporting(false);
            setExportStatus(`Exportado: ${fileName}`);
            exportStatusTimerRef.current = window.setTimeout(() => {
              setExportStatus(null);
              exportStatusTimerRef.current = null;
            }, 4000);
          },
          () => {
            restoreMode();
            setIsExporting(false);
            setExportStatus(null);
            setLoadError('Falha ao exportar modelo GLB/glTF. Verifique os materiais e texturas.');
          },
          {
            binary: format === 'glb',
            onlyVisible: true,
            animations: uploadedGroup ? uploadedClips : [],
          }
        );
      } catch {
        restoreMode();
        setIsExporting(false);
        setExportStatus(null);
        setLoadError('Não foi possível iniciar a exportação GLB/glTF.');
      }
    };

    generateAutoUvRef.current = () => {
      const activeDefaultRoot = stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot;
      const target = uploadedGroup || activeDefaultRoot;
      const uvs = autoGenerateUvsForGroup(target, {
        uvMargin: stateRef.current.uvMargin,
        seamAngleDeg: stateRef.current.seamAngleDeg,
      });
      if (stateRef.current.shadingMode === 'uv_checker') {
        applyMaterialSettings();
      }
      syncInspectorUvs(true);
      showBriefStatus(
        `UV Mapping gerado (${uvs.length} malha(s), margem ${stateRef.current.uvMargin.toFixed(3)})`
      );
    };

    generateRigAndAnimRef.current = () => {
      const preset = stateRef.current.rigPreset;
      const rigMeta = RIG_PRESET_DEFINITIONS[preset];

      if (!uploadedGroup) {
        const sourceRoot = preset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot;
        const prevShading = stateRef.current.shadingMode;
        if (prevShading !== 'pbr') {
          stateRef.current.shadingMode = 'pbr';
          applyMaterialSettings();
        }
        const clone = sourceRoot.clone(true);
        clone.visible = true;
        // Clone geometries cleanly so uploadedRecords owns independent buffers
        clone.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.geometry = m.geometry.clone();
          }
        });
        mountLoadedGltf(
          { scene: clone, animations: [] },
          `Ativo_Rig_${rigMeta.shortLabel}.glb`,
          [],
          null
        );
        if (prevShading !== 'pbr') {
          stateRef.current.shadingMode = prevShading;
          setShadingMode(prevShading);
        }
      }

      if (!uploadedGroup) return;

      const rigResult = autoRigAndAnimateGroup(uploadedGroup, preset);
      if (uploadedSkeletonHelper) {
        scene.remove(uploadedSkeletonHelper);
        uploadedSkeletonHelper.dispose();
        uploadedSkeletonHelper = null;
      }

      // Sync uploadedRecords to newly converted SkinnedMeshes
      const nextRecords: UploadedMeshRecord[] = [];
      let totalTris = 0;
      uploadedGroup.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
            return;
          }
          const geo = m.geometry;
          totalTris += geo?.index
            ? Math.round(geo.index.count / 3)
            : Math.round((geo?.attributes?.position?.count || 0) / 3);
          const existing = uploadedRecords.find((r) => r.mesh.name === m.name);
          if (existing) {
            nextRecords.push({ ...existing, mesh: m, outlineMesh: null });
          } else {
            const matList = Array.isArray(m.material) ? m.material : [m.material];
            nextRecords.push({
              mesh: m,
              origMat: m.material,
              origRoughness: matList.map((mm) => (mm instanceof THREE.MeshStandardMaterial ? mm.roughness : 0.5)),
              origMetalness: matList.map((mm) => (mm instanceof THREE.MeshStandardMaterial ? mm.metalness : 0.0)),
              origNormalScale: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial && mm.normalScale
                  ? mm.normalScale.clone()
                  : new THREE.Vector2(1, 1)
              ),
              origColorHex: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial && mm.color ? mm.color.getHex() : 0xffffff
              ),
              origMap: matList.map((mm) => (mm instanceof THREE.MeshStandardMaterial ? mm.map || null : null)),
              origRoughnessMap: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial ? mm.roughnessMap || null : null
              ),
              origMetalnessMap: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial ? mm.metalnessMap || null : null
              ),
              origNormalMap: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial ? mm.normalMap || null : null
              ),
              origAoMap: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial ? mm.aoMap || null : null
              ),
              origEmissiveMap: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial ? mm.emissiveMap || null : null
              ),
              origAlphaMap: matList.map((mm) =>
                mm instanceof THREE.MeshStandardMaterial ? mm.alphaMap || null : null
              ),
              materialName:
                (matList[0] && matList[0].name ? matList[0].name : '') ||
                m.name ||
                `Material_${nextRecords.length + 1}`,
              customMap: null,
              pbrMaps: {},
              paintData: null,
              outlineMesh: null,
              toonMat: null,
            });
          }
        }
      });
      uploadedRecords = nextRecords;

      uploadedSkeletonHelper = new THREE.SkeletonHelper(uploadedGroup);
      uploadedSkeletonHelper.visible = true;
      scene.add(uploadedSkeletonHelper);
      setShowSkeleton(true);
      stateRef.current.showSkeleton = true;

      if (uploadedMixer) {
        uploadedMixer.stopAllAction();
      }
      uploadedClips = rigResult.clips;
      uploadedMixer = new THREE.AnimationMixer(uploadedGroup);
      uploadedActions = uploadedClips.map((c) => uploadedMixer!.clipAction(c));
      activeUploadedClipIdx = 0;
      if (uploadedActions[0]) uploadedActions[0].play();

      setLoadedAsset((prev) => ({
        name: prev?.name || `Ativo_Rig_${rigMeta.shortLabel}.glb`,
        meshCount: uploadedRecords.length,
        triCount: prev?.triCount || totalTris,
        matCount: prev?.matCount || uploadedRecords.length,
        hasSkeleton: true,
        animClips: uploadedClips.map((c) => c.name),
        activeClipIdx: 0,
        duration: uploadedClips[0]?.duration || 2.5,
      }));
      setIsPlaying(true);
      applyMaterialSettings();
      syncInspectorUvs();
      refreshHierarchyState();
      showBriefStatus(
        `Rig ${rigMeta.shortLabel} (${rigResult.boneCount} ossos) e ${uploadedClips.length} animações geradas!`
      );
    };

    const syncRendererSettings = () => {
      activeRenderer.toneMapping = TONE_MAPPING_MAP[stateRef.current.toneMapping];
      activeRenderer.toneMappingExposure = stateRef.current.exposure;
      scene.environmentIntensity = stateRef.current.envIntensity;
      const rotRad = THREE.MathUtils.degToRad(stateRef.current.envRotationDeg);
      scene.environmentRotation.set(0, rotRad, 0);
      scene.backgroundRotation.set(0, rotRad, 0);
      const showBg = stateRef.current.showHdriBg && Boolean(envTexture);
      scene.background = showBg && envTexture ? envTexture : new THREE.Color(0x0d1017);
      scene.fog = showBg ? null : new THREE.Fog(0x0d1017, 4.8, 13.5);
      camera.setFocalLength(stateRef.current.cameraLensMm);
      camera.updateProjectionMatrix();
    };
    syncRendererSettingsRef.current = syncRendererSettings;

    insertKeyframeRef.current = () => {
      const targetObj =
        selectedSceneObject ||
        studioPrimitives[0]?.mesh ||
        uploadedGroup ||
        (stateRef.current.rigPreset === 'QUADRUPEDE' ? quadPelvisPivot : pelvisPivot);
      const frame = Math.round(stateRef.current.frame);
      const kfEntry = {
        frame,
        label: targetObj.name || 'Ativo_Principal',
        pos: [targetObj.position.x, targetObj.position.y, targetObj.position.z] as [number, number, number],
        rot: [
          THREE.MathUtils.radToDeg(targetObj.rotation.x),
          THREE.MathUtils.radToDeg(targetObj.rotation.y),
          THREE.MathUtils.radToDeg(targetObj.rotation.z),
        ] as [number, number, number],
        scl: [targetObj.scale.x, targetObj.scale.y, targetObj.scale.z] as [number, number, number],
      };
      setRecordedKeyframes((prev) =>
        [...prev.filter((k) => k.frame !== frame), kfEntry].sort((a, b) => a.frame - b.frame)
      );
      showBriefStatus(`Keyframe inserido no frame ${frame}f (${kfEntry.label})`);
    };

    jumpKeyframeRef.current = (kf) => {
      const targetObj =
        selectedSceneObject ||
        studioPrimitives[0]?.mesh ||
        uploadedGroup ||
        (stateRef.current.rigPreset === 'QUADRUPEDE' ? quadPelvisPivot : pelvisPivot);
      setIsPlaying(false);
      setCurrentFrame(kf.frame);
      stateRef.current.frame = kf.frame;
      if (loadedAssetNameRef.current) {
        scrubUploadedTimeRef.current?.(kf.frame);
      } else {
        applyFramePose(kf.frame);
      }
      targetObj.position.set(...kf.pos);
      targetObj.rotation.set(
        THREE.MathUtils.degToRad(kf.rot[0]),
        THREE.MathUtils.degToRad(kf.rot[1]),
        THREE.MathUtils.degToRad(kf.rot[2])
      );
      targetObj.scale.set(...kf.scl);
      syncSelectedInspector();
      showBriefStatus(`Salto para keyframe ${kf.frame}f`);
    };

    selectHdriRef.current = (id: HdriEnvironmentId) => {
      const meta = HDRI_ENVIRONMENT_OPTIONS.find((o) => o.id === id);
      if (id === 'none') {
        setEnvironmentTexture(null);
        syncRendererSettings();
        showBriefStatus('Ambiente HDRI desativado (apenas luzes da cena)');
        return;
      }

      const proceduralTex = buildProceduralHdriTexture(id, pmremGenerator);
      if (proceduralTex) {
        setEnvironmentTexture(proceduralTex);
        syncRendererSettings();
        showBriefStatus(`Ambiente HDRI: ${meta?.label || id}`);
        return;
      }

      new HDRLoader().load(
        HDRI_CDN_BASE + id,
        (tex) => {
          tex.mapping = THREE.EquirectangularReflectionMapping;
          const rt = pmremGenerator.fromEquirectangular(tex);
          tex.dispose();
          setEnvironmentTexture(rt.texture);
          syncRendererSettings();
          showBriefStatus(`Ambiente HDRI aplicado: ${meta?.label || id}`);
        },
        undefined,
        () => {
          setLoadError('Não foi possível baixar o HDRI online. Use os presets HDRI locais ou envie um .hdr/.exr.');
        }
      );
    };

    loadCustomHdriRef.current = (file: File) => {
      const isExr = /\.exr$/i.test(file.name);
      const url = URL.createObjectURL(file);
      const onLoaded = (tex: THREE.DataTexture) => {
        URL.revokeObjectURL(url);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        const rt = pmremGenerator.fromEquirectangular(tex);
        tex.dispose();
        setEnvironmentTexture(rt.texture);
        setCustomHdriName(file.name);
        setHdriId('custom');
        syncRendererSettings();
        showBriefStatus(`HDRI/EXR aplicado: ${file.name}`);
      };
      const onErr = () => {
        URL.revokeObjectURL(url);
        setLoadError('Não foi possível ler o arquivo .hdr ou .exr.');
      };
      if (isExr) {
        new EXRLoader().load(url, onLoaded, undefined, onErr);
      } else {
        new HDRLoader().load(url, onLoaded, undefined, onErr);
      }
    };

    syncLightsRef.current = (specs: StudioLightSpec[]) => {
      while (userLightsGroup.children.length > 0) {
        const c = userLightsGroup.children[0];
        userLightsGroup.remove(c);
        if ((c as THREE.Light).dispose) (c as THREE.Light).dispose();
      }
      for (const spec of specs) {
        userLightsGroup.add(buildThreeLightFromSpec(spec, !isSoftwareGl));
      }
    };

    renderStudioPngRef.current = async () => {
      const hideHelpers: THREE.Object3D[] = [grid, contactPlane, refSkeletonGroup, transformHelper];
      if (uploadedSkeletonHelper) hideHelpers.push(uploadedSkeletonHelper);
      const blob = await renderSceneToPngBlob({
        renderer: activeRenderer,
        scene,
        camera,
        container,
        resolution: stateRef.current.renderResolution,
        transparentBg: stateRef.current.transparentBg,
        hideObjects: hideHelpers,
      });
      if (!blob) {
        setLoadError('Falha ao capturar render PNG.');
        return;
      }
      const rawBase = loadedAssetNameRef.current
        ? loadedAssetNameRef.current.replace(/\.(glb|gltf)$/i, '')
        : 'AlexDesign_Asset';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rawBase}_render_${stateRef.current.renderResolution}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 1200);
      showBriefStatus(`Render PNG salvo (${stateRef.current.renderResolution})`);
    };

    exportZipRef.current = async () => {
      const activeDefaultRoot = stateRef.current.rigPreset === 'QUADRUPEDE' ? quadrupedRoot : characterRoot;
      const target =
        uploadedGroup ||
        (stateRef.current.hideDefaultBase && studioObjectsGroup.children.length > 0
          ? studioObjectsGroup
          : activeDefaultRoot);
      const prevMode = stateRef.current.shadingMode;

      const restoreMode = () => {
        if (stateRef.current.shadingMode !== prevMode) {
          stateRef.current.shadingMode = prevMode;
          applyMaterialSettings();
        }
      };

      if (prevMode !== 'pbr') {
        stateRef.current.shadingMode = 'pbr';
        applyMaterialSettings();
      }

      setLoadError(null);
      setIsExporting(true);
      onExportStateChangeRef.current?.(true);
      setExportStatus('Gerando ZIP completo (GLB, glTF, 5 mapas PBR, UVs, render e auditoria)...');

      const shadingNames: Record<ShadingMode, string> = {
        pbr: 'PBR Físico',
        uv_checker: 'UV Checker',
        normals: 'Normais',
        cel_borde: 'Cel + Borde',
        matcap_clay: 'Matcap Argila',
        matcap_chrome: 'Matcap Cromo',
        matcap_redwax: 'Matcap RedWax',
      };

      try {
        const hideHelpers: THREE.Object3D[] = [grid, contactPlane, refSkeletonGroup, transformHelper];
        if (uploadedSkeletonHelper) hideHelpers.push(uploadedSkeletonHelper);
        const studioRenderBlob = await renderSceneToPngBlob({
          renderer: activeRenderer,
          scene,
          camera,
          container,
          resolution: '1920x1080',
          transparentBg: stateRef.current.transparentBg,
          hideObjects: hideHelpers,
        });

        const assetName =
          loadedAssetNameRef.current || `AlexDesign_${RIG_PRESET_DEFINITIONS[stateRef.current.rigPreset].shortLabel}`;
        const zipName = await exportCompleteProjectZip({
          targetRoot: target,
          clips: uploadedGroup ? uploadedClips : [],
          assetName,
          rigPreset: stateRef.current.rigPreset,
          shadingLabel: shadingNames[prevMode],
          roughnessVal: stateRef.current.roughnessOverride,
          metalnessVal: stateRef.current.metalnessOverride,
          resolution: stateRef.current.textureResolution,
          userLights: userLightsGroup,
          studioRenderBlob,
        });
        restoreMode();
        setIsExporting(false);
        onExportStateChangeRef.current?.(false);
        showBriefStatus(`ZIP completo exportado: ${zipName}`);
      } catch {
        restoreMode();
        setIsExporting(false);
        onExportStateChangeRef.current?.(false);
        setExportStatus(null);
        setLoadError('Falha ao empacotar o arquivo ZIP completo.');
      }
    };

    applyMaterialSettings();
    applyFramePose(1);
    syncRendererSettings();
    refreshHierarchyState();

    if (!isSoftwareGl) {
      try {
        activeRenderer.compile(scene, camera);
      } catch {
        // Proceed cleanly if pre-compile is skipped by driver
      }
    }

    let frameId = 0;
    let disposed = false;
    let lastReportedFrame = 1;
    let lastWidth = width;
    let lastHeight = height;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      try {
        const gl = activeRenderer.getContext() as WebGL2RenderingContext;
        if (!gl || typeof gl.fenceSync !== 'function') {
          frameId = window.setTimeout(cb, 80);
          return;
        }
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const syncViewportSize = () => {
      if (!container || disposed) return false;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return false;
      if (w !== lastWidth || h !== lastHeight) {
        lastWidth = w;
        lastHeight = h;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        activeRenderer.setSize(w, h, false);
        if (composer) composer.setSize(w, h);
        if (bloomPass) bloomPass.resolution.set(w, h);
      }
      return true;
    };

    let elapsedPlaySec = 0;
    const principlesRuntime = createPrinciplesRuntimeState();
    const motionTrailLine = createMotionTrailLine();
    scene.add(motionTrailLine);

    runMeshModelingOpRef.current = (op: MeshModelingOp, strength = 0.35) => {
      const targetObj = transformControls.object ?? uploadedGroup ?? refSkeletonGroup;
      applyMeshModelingOp(targetObj, op, strength);
    };

    function tick() {
      if (disposed) return;
      try {
        const delta = Math.min(clock.getDelta(), 0.1);
        const isVisible = syncViewportSize();

        if (isVisible) {
          const nowSec = performance.now() * 0.001;
          if (mographConfigRef.current.active && mographEntries.length > 0) {
            updateMoGraphEffectorFrame(mographEntries, mographConfigRef.current, nowSec);
          }
          // 12 Princípios da Animação 3D + Ciclos + Física Real Rapier3D (Rust/WASM)
          const animTarget =
            uploadedGroup ??
            (studioObjectsGroup.children.length > 0 ? studioObjectsGroup : refSkeletonGroup);

          rapierToggleRef.current = async (enabled: boolean) => {
            const nextCfg = { ...rapierConfigRef.current, enabled };
            setRapierConfig(nextCfg);
            rapierConfigRef.current = nextCfg;
            if (enabled) {
              await rapierWorldRef.current.ensureReady(nextCfg);
              rapierWorldRef.current.updateConfig(nextCfg);
              if (animTarget) rapierWorldRef.current.attachPrimaryObject(animTarget, 0);
            } else {
              rapierWorldRef.current.resetAll(scene);
            }
          };
          rapierDropRef.current = async () => {
            const nextCfg = { ...rapierConfigRef.current, enabled: true };
            setRapierConfig(nextCfg);
            rapierConfigRef.current = nextCfg;
            await rapierWorldRef.current.ensureReady(nextCfg);
            rapierWorldRef.current.updateConfig(nextCfg);
            if (animTarget) {
              rapierWorldRef.current.attachPrimaryObject(animTarget, 2.4);
              rapierWorldRef.current.dropPrimary(2.4);
            }
          };
          rapierImpulseRef.current = () => {
            rapierWorldRef.current.impulsePrimary(
              (Math.random() - 0.5) * 6,
              18,
              (Math.random() - 0.5) * 6
            );
          };
          rapierSpawnRef.current = async (kind: 'sphere' | 'box') => {
            const nextCfg = { ...rapierConfigRef.current, enabled: true };
            setRapierConfig(nextCfg);
            rapierConfigRef.current = nextCfg;
            await rapierWorldRef.current.ensureReady(nextCfg);
            rapierWorldRef.current.updateConfig(nextCfg);
            rapierWorldRef.current.spawnCollidingProp(scene, kind);
          };
          rapierResetRef.current = () => {
            rapierWorldRef.current.resetAll(scene);
            const nextCfg = { ...rapierConfigRef.current, enabled: false };
            setRapierConfig(nextCfg);
            rapierConfigRef.current = nextCfg;
          };

          if (rapierConfigRef.current.enabled) {
            rapierWorldRef.current.step(delta);
          } else {
            applyAnimationPrinciplesFrame(
              animTarget,
              animPrinciplesRef.current,
              principlesRuntime,
              motionTrailLine,
              delta
            );
            applyProceduralIkFrame(
              animTarget,
              camera,
              scene,
              ikConfigRef.current,
              animPrinciplesRef.current.enabled
            );
          }
          syncActionForgeRigRings(
            scene,
            animTarget,
            animPrinciplesRef.current.enabled || stateRef.current.showSkeleton
          );
          if (animPrinciplesRef.current.stagingMode === 'silhouette') {
            activeRenderer.domElement.style.filter = 'brightness(0.08) contrast(4.5) grayscale(1)';
          } else if (animPrinciplesRef.current.stagingMode === 'rim_focus') {
            activeRenderer.domElement.style.filter = 'contrast(1.35) saturate(1.15) brightness(0.92)';
          } else {
            activeRenderer.domElement.style.filter = '';
          }
          fxParticles.visible = particlesEnabledRef.current;
          if (particlesEnabledRef.current) {
            const pAttr = particleGeo.attributes.position as THREE.BufferAttribute;
            const wForce = windEnabledRef.current ? windStrengthRef.current * 0.9 : 0.12;
            for (let i = 0; i < particleCount; i++) {
              let px = pAttr.getX(i) + delta * wForce;
              let py = pAttr.getY(i) + delta * 0.18 * Math.sin(nowSec + i);
              if (px > 3.25) px = -3.25;
              if (py > 4.0) py = 0.15;
              if (py < 0.08) py = 3.8;
              pAttr.setXYZ(i, px, py, pAttr.getZ(i));
            }
            pAttr.needsUpdate = true;
          }
          if (windEnabledRef.current && uploadedGroup) {
            uploadedGroup.rotation.z = Math.sin(nowSec * 2.4) * 0.04 * windStrengthRef.current;
          }
          controls.autoRotate = turntableRef.current;
          controls.autoRotateSpeed = 2.4;
          if (turntableRef.current) {
            controls.update();
          }
          if (stateRef.current.camTransitioning) {
            const preset = CAMERA_PRESETS[stateRef.current.camTarget];
            _camTargetPos.set(...preset.pos);
            _camTargetLook.set(...preset.target);
            const factor = 1 - Math.exp(-7 * delta);
            camera.position.lerp(_camTargetPos, factor);
            controls.target.lerp(_camTargetLook, factor);
            if (camera.position.distanceTo(_camTargetPos) < 0.015) {
              camera.position.copy(_camTargetPos);
              controls.target.copy(_camTargetLook);
              stateRef.current.camTransitioning = false;
            }
          }

          const endFrame = Math.max(1, stateRef.current.animEndFrame);
          if (uploadedGroup) {
            if (
              uploadedMixer &&
              uploadedClips.length > 0 &&
              stateRef.current.isPlaying &&
              !animPrinciplesRef.current.enabled
            ) {
              if (endFrame <= 1) {
                uploadedMixer.setTime(0);
                if (lastReportedFrame !== 1) {
                  lastReportedFrame = 1;
                  setCurrentFrame(1);
                }
              } else {
                uploadedMixer.update(delta);
                const action = uploadedActions[activeUploadedClipIdx];
                const dur = uploadedClips[activeUploadedClipIdx]?.duration || 1;
                if (action && dur > 0) {
                  const norm = (action.time % dur) / dur;
                  const nextFrame = Math.max(
                    1,
                    Math.min(endFrame, Math.round(norm * (endFrame - 1)) + 1)
                  );
                  if (nextFrame !== lastReportedFrame) {
                    lastReportedFrame = nextFrame;
                    setCurrentFrame(nextFrame);
                  }
                }
              }
            }
          } else if (stateRef.current.isPlaying && !stateRef.current.hideDefaultBase) {
            if (endFrame <= 1) {
              stateRef.current.frame = 1;
              applyFramePose(1);
              if (lastReportedFrame !== 1) {
                lastReportedFrame = 1;
                setCurrentFrame(1);
              }
            } else {
              stateRef.current.frame += delta * 24;
              if (stateRef.current.frame > endFrame) stateRef.current.frame = 1;
              const rounded = Math.round(stateRef.current.frame);
              applyFramePose(stateRef.current.frame);
              if (rounded !== lastReportedFrame) {
                lastReportedFrame = rounded;
                setCurrentFrame(rounded);
              }
            }
          }

          if (stateRef.current.playMode || stateRef.current.physicsActive) {
            elapsedPlaySec += delta;
            for (const rec of studioPrimitives) {
              if (stateRef.current.playMode) {
                if (rec.interaction === 'spin') {
                  rec.mesh.rotation.y += delta * 1.15;
                } else if (rec.interaction === 'float' && !rec.physicsEnabled) {
                  rec.mesh.position.y = rec.baseY + Math.sin(elapsedPlaySec * 2.2) * 0.14;
                } else if (rec.interaction === 'hover_pulse') {
                  const targetFactor = hoveredPlayMesh === rec.mesh ? 1.22 : 1.0;
                  const targetScale = rec.baseScale.clone().multiplyScalar(targetFactor);
                  rec.mesh.scale.lerp(targetScale, 1 - Math.exp(-10 * delta));
                } else if (rec.interaction === 'click_toggle') {
                  const targetFactor = rec.clickToggled ? 1.32 : 1.0;
                  const targetScale = rec.baseScale.clone().multiplyScalar(targetFactor);
                  rec.mesh.scale.lerp(targetScale, 1 - Math.exp(-10 * delta));
                  if (rec.clickToggled) rec.mesh.rotation.y += delta * 1.6;
                }
              }

              if (stateRef.current.physicsActive && rec.physicsEnabled) {
                rec.velocityY -= 9.81 * delta;
                rec.mesh.position.y += rec.velocityY * delta;
                const box = new THREE.Box3().setFromObject(rec.mesh);
                const minY = box.min.y;
                if (minY < 0) {
                  rec.mesh.position.y += -minY;
                  if (Math.abs(rec.velocityY) > 0.25) {
                    rec.velocityY = -rec.velocityY * 0.62;
                  } else {
                    rec.velocityY = 0;
                  }
                }
              }
            }
          }

          controls.update();
          if (stateRef.current.bloomEnabled && composer) {
            if (bloomPass) bloomPass.strength = stateRef.current.bloomStrength;
            composer.render();
          } else {
            activeRenderer.render(scene, camera);
          }

          const q = camera.quaternion;
          const prevQ = lastCameraQuatRef.current;
          if (
            Math.abs(q.x - prevQ[0]) > 0.008 ||
            Math.abs(q.y - prevQ[1]) > 0.008 ||
            Math.abs(q.z - prevQ[2]) > 0.008 ||
            Math.abs(q.w - prevQ[3]) > 0.008
          ) {
            const nextQ: [number, number, number, number] = [q.x, q.y, q.z, q.w];
            lastCameraQuatRef.current = nextQ;
            setCameraQuat(nextQ);
          }
        }

        if (isSoftwareGl) {
          if (isVisible) afterDraw(tick);
          else frameId = window.setTimeout(tick, 180);
        } else {
          frameId = requestAnimationFrame(tick);
        }
      } catch (tickErr) {
        disposed = true;
        setWebglError(
          tickErr instanceof Error
            ? `Erro no loop de renderização 3D: ${tickErr.message}`
            : 'Erro ao renderizar a cena WebGL.'
        );
      }
    }

    tweenCameraPresetRef.current = (preset: CameraPreset) => {
      const targetPreset = CAMERA_PRESETS[preset];
      if (!targetPreset) return;
      stateRef.current.camTransitioning = false;
      gsap.killTweensOf(camera.position);
      gsap.killTweensOf(controls.target);
      gsap.to(camera.position, {
        x: targetPreset.pos[0],
        y: targetPreset.pos[1],
        z: targetPreset.pos[2],
        duration: 0.72,
        ease: 'power3.inOut',
        onUpdate: () => {
          controls.update();
        },
      });
      gsap.to(controls.target, {
        x: targetPreset.target[0],
        y: targetPreset.target[1],
        z: targetPreset.target[2],
        duration: 0.72,
        ease: 'power3.inOut',
      });
    };

    requestRenderRef.current = () => {
      if (!disposed) {
        if (mographConfigRef.current.active && mographEntries.length > 0) {
          updateMoGraphEffectorFrame(mographEntries, mographConfigRef.current, performance.now() * 0.001);
        }
        controls.autoRotate = turntableRef.current;
        controls.autoRotateSpeed = 2.4;
        if (turntableRef.current) {
          controls.update();
        }
        syncViewportSize();
        if (stateRef.current.bloomEnabled && composer) {
          composer.render();
        } else {
          activeRenderer.render(scene, camera);
        }
      }
    };

    dropToFloorRef.current = () => {
      const target = selectedSceneObject || uploadedGroup || studioPrimitives[0]?.mesh;
      if (!target) return;
      const beforeSnap = captureObjectSnapshot(target);
      target.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(target);
      if (!box.isEmpty()) {
        target.position.y -= box.min.y;
        target.updateMatrixWorld(true);
        const afterSnap = captureObjectSnapshot(target);
        historyManager.push({
          label: `Apoiar ${target.name || 'Modelo'} no chão`,
          before: [beforeSnap],
          after: [afterSnap],
        });
        syncSelectedInspector();
        scheduleAutoSaveRef.current?.();
        showBriefStatus(`"${target.name || 'Modelo'}" apoiado no chão (Y = 0)`);
      }
    };

    rotateBoneJointRef.current = (joint: RigJointSpec, axis: 'x' | 'y' | 'z', deg: number) => {
      const target = uploadedGroup ?? refSkeletonGroup;
      if (!target) return;
      let matchedBone: THREE.Bone | null = null;
      target.traverse((o) => {
        if (matchedBone || !(o as THREE.Bone).isBone) return;
        const n = o.name.toLowerCase();
        if (joint.matchTerms.some((term) => n.includes(term))) {
          matchedBone = o as THREE.Bone;
        }
      });
      if (matchedBone) {
        (matchedBone as THREE.Bone).rotation[axis] = THREE.MathUtils.degToRad(deg);
        setShowSkeleton(true);
        requestRenderRef.current?.();
      } else {
        target.rotation[axis] = THREE.MathUtils.degToRad(deg * 0.5);
        requestRenderRef.current?.();
      }
    };

    resetRigPoseRef.current = () => {
      const target = uploadedGroup ?? refSkeletonGroup;
      if (!target) return;
      target.traverse((o) => {
        if ((o as THREE.Bone).isBone) {
          o.rotation.set(0, 0, 0);
        }
      });
      requestRenderRef.current?.();
      showBriefStatus('Pose dos ossos resetada.');
    };

    autoRigCurrentCharacterRef.current = () => {
      const target = uploadedGroup || (studioObjectsGroup.children.length > 0 ? studioObjectsGroup : null);
      if (!target) {
        showBriefStatus('Importe um personagem 3D para gerar o Auto-Rig.');
        return;
      }
      let hasBones = false;
      target.traverse((o) => {
        if ((o as THREE.Bone).isBone || (o as THREE.SkinnedMesh).isSkinnedMesh) {
          hasBones = true;
        }
      });
      if (!hasBones) {
        try {
          autoRigAndAnimateGroup(target, latestConfigRef.current.rigPreset);
        } catch {
          // non-blocking fallback
        }
      }
      setShowSkeleton(true);
      requestRenderRef.current?.();
      showBriefStatus(
        hasBones
          ? 'Esqueleto detectado no personagem: Anéis 3D e Picker ativados.'
          : 'Auto-Rig humanoide gerado automaticamente conforme as proporções do personagem!'
      );
    };

    autoSetupPipelineRef.current = () => {
      const target = uploadedGroup || (studioObjectsGroup.children.length > 0 ? studioObjectsGroup : null);
      if (!target) {
        showBriefStatus('Importe um modelo ou gere um exemplo 3D primeiro.');
        return;
      }

      // 1. Apoiar no chão (Y = 0)
      target.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(target);
      if (!box.isEmpty()) {
        target.position.y -= box.min.y;
        target.updateMatrixWorld(true);
      }

      // 1b. Auto-Rig automático se o personagem importado ainda não possuir esqueleto
      autoRigCurrentCharacterRef.current?.();

      // 2. Gerar UV automático nas malhas do objeto
      autoGenerateUvsForGroup(target);

      // 3. Gerar plano UV automático logo abaixo do objeto na cena
      const existingUvFloor = scene.getObjectByName('__alexdesign_auto_uv_floor__');
      if (existingUvFloor) {
        scene.remove(existingUvFloor);
      }
      const updatedBox = new THREE.Box3().setFromObject(target);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      updatedBox.getSize(size);
      updatedBox.getCenter(center);
      const footprint = Math.max(1.6, Math.max(size.x, size.z) * 1.45);

      const uvCanvas = document.createElement('canvas');
      uvCanvas.width = 512;
      uvCanvas.height = 512;
      const ctx = uvCanvas.getContext('2d');
      if (ctx) {
        const cells = 8;
        const step = 512 / cells;
        for (let y = 0; y < cells; y++) {
          for (let x = 0; x < cells; x++) {
            const isEven = (x + y) % 2 === 0;
            ctx.fillStyle = isEven ? '#162033' : '#0d1320';
            ctx.fillRect(x * step, y * step, step, step);
            ctx.strokeStyle = 'rgba(249, 115, 22, 0.35)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x * step + 0.5, y * step + 0.5, step - 1, step - 1);
            ctx.fillStyle = isEven ? 'rgba(248, 250, 252, 0.55)' : 'rgba(56, 189, 248, 0.55)';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`U${x}V${y}`, x * step + 8, y * step + 22);
          }
        }
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, 508, 508);
      }
      const uvTex = new THREE.CanvasTexture(uvCanvas);
      uvTex.colorSpace = THREE.SRGBColorSpace;
      uvTex.anisotropy = 4;

      const uvPlaneGeo = new THREE.PlaneGeometry(footprint, footprint);
      const uvPlaneMat = new THREE.MeshBasicMaterial({
        map: uvTex,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      });
      const uvPlane = new THREE.Mesh(uvPlaneGeo, uvPlaneMat);
      uvPlane.name = '__alexdesign_auto_uv_floor__';
      uvPlane.rotation.x = -Math.PI / 2;
      uvPlane.position.set(center.x, Math.min(0, updatedBox.min.y) + 0.004, center.z);
      scene.add(uvPlane);

      // 4. Sincronizar modelo com TODAS as ferramentas (3D Toolbox, UV Layout, PBR)
      try {
        const exporter = new GLTFExporter();
        exporter.parse(
          target,
          (result) => {
            if (result instanceof ArrayBuffer) {
              const syncedFile = new File(
                [result],
                `${(target.name || 'modelo_cena').replace(/\s+/g, '_')}.glb`,
                { type: 'model/gltf-binary' }
              );
              onImportedModelFileRef.current?.(syncedFile);
            }
          },
          () => {
            // Silent fallback if export fails on custom helper
          },
          { binary: true }
        );
      } catch {
        // Non-blocking sync
      }

      // 5. Ativar PBR + Bloom sutil + Câmera 3/4 suave via GSAP
      setShadingMode('pbr');
      setBloomEnabled(true);
      tweenCameraPresetRef.current?.('q34');
      requestRenderRef.current?.();
      showBriefStatus('Automação concluída: estrutura UV gerada abaixo do objeto e sincronizada em todas as ferramentas.');
    };

    bakeAoCurvatureRef.current = () => {
      const target = uploadedGroup || (studioObjectsGroup.children.length > 0 ? studioObjectsGroup : null);
      if (!target) {
        showBriefStatus('Carregue ou crie um modelo 3D para gerar Bake AO & Curvatura.');
        return;
      }
      if (stateRef.current.shadingMode !== 'pbr') {
        setShadingMode('pbr');
        stateRef.current.shadingMode = 'pbr';
        applyMaterialSettings();
      }
      const res = bakeAoAndCurvatureForGroup(target, {
        textureSize: 512,
        cavityDarkness: 0.58,
        edgeWearIntensity: 0.48,
        applyWearToAlbedo: true,
      });
      requestRenderRef.current?.();
      scheduleAutoSaveRef.current?.();
      showBriefStatus(
        `Bake AO & Curvatura aplicado em ${res.meshesBaked} malha(s) (${res.verticesProcessed.toLocaleString('pt-BR')} vértices)`
      );
    };

    undoSceneRef.current = () => {
      const label = historyManager.undo(scene);
      if (label) {
        syncSelectedInspector();
        requestRenderRef.current?.();
        scheduleAutoSaveRef.current?.();
        showBriefStatus(`Desfeito: ${label}`);
        return;
      }
      // Fallback 1: desfazer MoGraph Cloner ativo
      if (mographGroup.children.length > 0) {
        clearMoGraphRef.current?.();
        showBriefStatus('Desfeito: MoGraph Cloner');
        return;
      }
      // Fallback 2: desfazer último objeto/template procedural adicionado (ex: Vidro & Neon)
      if (studioPrimitives.length > 0) {
        const last = studioPrimitives[studioPrimitives.length - 1];
        deleteMeshByIdRef.current?.(last.mesh.uuid);
        requestRenderRef.current?.();
        scheduleAutoSaveRef.current?.();
        showBriefStatus(`Desfeito: ${last.mesh.name || 'Objeto 3D'}`);
        return;
      }
      showBriefStatus('Nada para desfazer no histórico');
    };

    redoSceneRef.current = () => {
      const label = historyManager.redo(scene);
      if (label) {
        syncSelectedInspector();
        requestRenderRef.current?.();
        scheduleAutoSaveRef.current?.();
        showBriefStatus(`Refeito: ${label}`);
      } else {
        showBriefStatus('Nada para refazer no histórico');
      }
    };

    applyMoGraphRef.current = () => {
      let sourceMesh: THREE.Mesh | null = null;
      if (selectedSceneObject && (selectedSceneObject as THREE.Mesh).isMesh) {
        sourceMesh = selectedSceneObject as THREE.Mesh;
      } else if (uploadedRecords.length > 0) {
        sourceMesh = uploadedRecords[0].mesh;
      } else if (studioPrimitives.length > 0) {
        sourceMesh = studioPrimitives[0].mesh;
      }
      const nextCfg: MoGraphConfig = { ...mographConfigRef.current, active: true };
      mographConfigRef.current = nextCfg;
      setMographConfig(nextCfg);
      mographEntries = buildMoGraphClones(mographGroup, sourceMesh, nextCfg);
      requestRenderRef.current?.();
      showBriefStatus(
        `MoGraph Cloner ativo (${mographEntries.length} clones · Efetor: ${nextCfg.effector})`
      );
    };

    clearMoGraphRef.current = () => {
      while (mographGroup.children.length > 0) {
        mographGroup.remove(mographGroup.children[0]);
      }
      mographEntries = [];
      const nextCfg: MoGraphConfig = { ...mographConfigRef.current, active: false };
      mographConfigRef.current = nextCfg;
      setMographConfig(nextCfg);
      requestRenderRef.current?.();
      showBriefStatus('MoGraph Cloner removido');
    };

    setMorphTargetWeightRef.current = (morphName: string, weight: number) => {
      const clamped = THREE.MathUtils.clamp(weight, 0, 1);
      if (uploadedGroup) {
        uploadedGroup.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            if (m.morphTargetDictionary && m.morphTargetInfluences) {
              const idx = m.morphTargetDictionary[morphName];
              if (idx !== undefined) {
                m.morphTargetInfluences[idx] = clamped;
              }
            }
          }
        });
      }
      setMorphTargets((prev) =>
        prev.map((item) => (item.name === morphName ? { ...item, value: clamped } : item))
      );
      requestRenderRef.current?.();
    };

    const handleResize = () => {
      if (syncViewportSize()) {
        if (stateRef.current.bloomEnabled && composer) {
          composer.render();
        } else {
          activeRenderer.render(scene, camera);
        }
      }
    };

    const initResizeRaf = requestAnimationFrame(handleResize);
    window.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    let bootReady = false;
    let autoSaveTimer: number | null = null;

    saveProjectRef.current = async (silent = false) => {
      if (disposed) return;
      if (!silent) setIsSavingProject(true);
      try {
        const exportTargets: THREE.Object3D[] = [];
        if (uploadedGroup) exportTargets.push(uploadedGroup);
        if (studioObjectsGroup.children.length > 0) exportTargets.push(studioObjectsGroup);
        const exportInput =
          exportTargets.length === 1
            ? exportTargets[0]
            : exportTargets.length > 1
            ? exportTargets
            : new THREE.Group();

        const exporter = new GLTFExporter();
        const sceneGlb = await new Promise<ArrayBuffer>((resolve, reject) => {
          exporter.parse(
            exportInput,
            (res) => resolve(res as ArrayBuffer),
            (err) => reject(err),
            {
              binary: true,
              onlyVisible: false,
              animations: uploadedGroup ? uploadedClips : [],
            }
          );
        });

        const cfg = latestConfigRef.current;
        const fullConfig: StudioConfig = {
          targetEngine: cfg.targetEngine ?? DEFAULT_STUDIO_CONFIG.targetEngine,
          rigPreset: cfg.rigPreset,
          textureResolution: cfg.textureResolution,
          uvMargin: cfg.uvMargin ?? DEFAULT_STUDIO_CONFIG.uvMargin,
          seamAngleDeg: cfg.seamAngleDeg ?? DEFAULT_STUDIO_CONFIG.seamAngleDeg,
          texelDensity: cfg.texelDensity ?? DEFAULT_STUDIO_CONFIG.texelDensity,
          shaderPreset: cfg.shaderPreset,
          outlineThickness: cfg.outlineThickness,
          normalStrength: cfg.normalStrength,
          animEndFrame: cfg.animEndFrame,
        };

        await saveStudioProject({
          version: 1,
          savedAt: Date.now(),
          assetName: loadedAssetNameRef.current || 'Cena_AlexDesign.glb',
          sceneGlb,
          config: fullConfig,
          cameraPos: [camera.position.x, camera.position.y, camera.position.z],
          cameraTarget: [controls.target.x, controls.target.y, controls.target.z],
          cameraLensMm: stateRef.current.cameraLensMm,
          hdriId: latestHdriRef.current,
          envIntensity: stateRef.current.envIntensity,
          envRotationDeg: stateRef.current.envRotationDeg,
          exposure: stateRef.current.exposure,
          toneMapping: stateRef.current.toneMapping,
          studioLights: latestLightsRef.current,
        });

        const timeLabel = new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        setLastSavedLabel(`Salvo ${timeLabel}`);
        if (!silent) {
          showBriefStatus('Projeto salvo localmente (Ctrl+S)');
        }
      } catch {
        if (!silent) {
          setLoadError('Não foi possível salvar o projeto no navegador.');
        }
      } finally {
        if (!silent) setIsSavingProject(false);
      }
    };

    exportGlbBlobRef.current = async () => {
      if (disposed) return null;
      const exportTargets: THREE.Object3D[] = [];
      if (uploadedGroup) exportTargets.push(uploadedGroup);
      if (studioObjectsGroup.children.length > 0) exportTargets.push(studioObjectsGroup);
      const exportInput =
        exportTargets.length === 1
          ? exportTargets[0]
          : exportTargets.length > 1
          ? exportTargets
          : new THREE.Group();
      const exporter = new GLTFExporter();
      const buf = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          exportInput,
          (res) => resolve(res as ArrayBuffer),
          (err) => reject(err),
          {
            binary: true,
            onlyVisible: true,
            animations: uploadedGroup ? uploadedClips : [],
          }
        );
      });
      return new Blob([buf], { type: 'model/gltf-binary' });
    };

    scheduleAutoSaveRef.current = () => {
      if (!bootReady || disposed) return;
      if (autoSaveTimer !== null) {
        window.clearTimeout(autoSaveTimer);
      }
      autoSaveTimer = window.setTimeout(() => {
        autoSaveTimer = null;
        void saveProjectRef.current?.(true);
      }, 2200);
    };

    const bootInitialScene = async () => {
      const saved = await loadSavedStudioProject();
      if (disposed) return;
      if (saved) {
        try {
          if (MeshoptDecoder?.ready) {
            await MeshoptDecoder.ready.catch(() => undefined);
          }
          onConfigChangeRef.current(saved.config);
          setCameraLensMm(saved.cameraLensMm);
          stateRef.current.cameraLensMm = saved.cameraLensMm;
          setEnvIntensity(saved.envIntensity);
          stateRef.current.envIntensity = saved.envIntensity;
          setEnvRotationDeg(saved.envRotationDeg);
          stateRef.current.envRotationDeg = saved.envRotationDeg;
          setExposure(saved.exposure);
          stateRef.current.exposure = saved.exposure;
          setToneMapping(saved.toneMapping);
          stateRef.current.toneMapping = saved.toneMapping;
          setHdriId(saved.hdriId);
          selectHdriRef.current?.(saved.hdriId);
          setStudioLights(saved.studioLights);
          syncLightsRef.current?.(saved.studioLights);
          syncRendererSettings();

          const loader = buildConfiguredGltfLoader();
          const gltf = await loader.parseAsync(saved.sceneGlb, '');
          if (disposed) return;

          let savedMeshCount = 0;
          gltf.scene.traverse((o) => {
            if ((o as THREE.Mesh).isMesh) savedMeshCount += 1;
          });
          if (savedMeshCount > 0) {
            mountLoadedGltf(gltf, saved.assetName, [], null, true);
          } else {
            clearUploadedAssetOnly();
          }

          stateRef.current.camTransitioning = false;
          camera.position.set(...saved.cameraPos);
          controls.target.set(...saved.cameraTarget);
          controls.update();

          const timeLabel = new Date(saved.savedAt).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
          });
          setLastSavedLabel(`Salvo ${timeLabel}`);
          showBriefStatus('Projeto salvo restaurado');
          bootReady = true;
          return;
        } catch {
          // Fallback to default Helmet if saved binary is unreadable
        }
      }
      await loadSampleRef.current?.();
      bootReady = true;
    };

    tick();
    void bootInitialScene();

    cleanupFn = () => {
      disposed = true;
      if (autoSaveTimer !== null) {
        window.clearTimeout(autoSaveTimer);
      }
      cancelAnimationFrame(initResizeRaf);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      if (exportStatusTimerRef.current !== null) {
        window.clearTimeout(exportStatusTimerRef.current);
      }
      window.removeEventListener('resize', handleResize);
      ro.disconnect();
      transformControls.dispose();
      if (composer) composer.dispose();
      controls.dispose();
      activeRenderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      activeRenderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      activeRenderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      while (studioPrimitives.length > 0) {
        disposePrimitiveRecord(studioPrimitives.pop()!);
      }
      disposeUploadedModel();
      if (activeProceduralBundle) {
        activeProceduralBundle.dispose();
        activeProceduralBundle = null;
      }
      (['roughnessMap', 'metalnessMap', 'normalMap', 'aoMap'] as const).forEach((ch) => {
        if (manualChannelTextures[ch]) {
          manualChannelTextures[ch]!.dispose();
          delete manualChannelTextures[ch];
        }
      });
      clearRefSkeleton();
      boneVisualMat.dispose();
      jointVisualMat.dispose();

      const disposedCustomMaps = new Set<THREE.Texture>();
      for (const p of parts) {
        if (p.paintData) p.paintData.tex.dispose();
        if (p.customMap && !disposedCustomMaps.has(p.customMap)) {
          p.customMap.dispose();
          disposedCustomMaps.add(p.customMap);
        }
        p.mesh.geometry.dispose();
        if (p.mesh.material !== normalMat) {
          if (Array.isArray(p.mesh.material)) {
            p.mesh.material.forEach((m) => m.dispose());
          } else {
            p.mesh.material.dispose();
          }
        }
      }
      normalMat.dispose();
      uvCheckerFallbackMat.dispose();
      outlineBaseMat.dispose();
      floorMat.dispose();
      floor.geometry.dispose();
      contactPlane.geometry.dispose();
      (contactPlane.material as THREE.Material).dispose();
      checkerTex.dispose();
      fabricNormalTex.dispose();
      toonGradTex.dispose();
      contactShadowTex.dispose();
      if (envTexture) envTexture.dispose();
      pmremGenerator.dispose();
      dracoLoader.dispose();
      ktx2Loader.dispose();
      while (userLightsGroup.children.length > 0) {
        const c = userLightsGroup.children[0];
        userLightsGroup.remove(c);
        if ((c as THREE.Light).dispose) (c as THREE.Light).dispose();
      }
      activeRenderer.dispose();
      if (activeRenderer.domElement.parentNode === container) {
        container.removeChild(activeRenderer.domElement);
      }
    };
    } catch (initErr) {
      if (renderer) {
        try {
          renderer.dispose();
          if (renderer.domElement.parentNode === container) {
            container.removeChild(renderer.domElement);
          }
        } catch {
          // Ignore secondary cleanup errors
        }
      }
      const msg =
        initErr instanceof Error && initErr.message
          ? initErr.message
          : 'Não foi possível inicializar a Viewport 3D WebGL.';
      setWebglError(msg);
    }

    return () => {
      cleanupFn?.();
    };
  }, [retryWebglNonce]);

  useEffect(() => {
    applyMaterialsRef.current?.();
  }, [
    shadingMode,
    roughnessOverride,
    metalnessOverride,
    config.normalStrength,
    config.outlineThickness,
    config.rigPreset,
    showSkeleton,
    wireframeMode,
    doubleSided,
    showGrid,
  ]);

  useEffect(() => {
    rebuildRigPreviewRef.current?.(config.rigPreset);
  }, [config.rigPreset]);

  useEffect(() => {
    syncLightsRef.current?.(studioLights);
  }, [studioLights]);

  useEffect(() => {
    syncRendererSettingsRef.current?.();
  }, [toneMapping, exposure, envIntensity, envRotationDeg, showHdriBg, cameraLensMm]);

  useEffect(() => {
    const maxF = Math.max(1, config.animEndFrame);
    if (currentFrame > maxF) {
      setCurrentFrame(maxF);
      stateRef.current.frame = maxF;
    }
  }, [config.animEndFrame, currentFrame]);

  useEffect(() => {
    if (proceduralMaterialRequest) {
      applyProceduralBundleRef.current?.(proceduralMaterialRequest.params);
    }
  }, [proceduralMaterialRequest]);

  useEffect(() => {
    if (substanceTextureRequest) {
      applySubstanceBundleRef.current?.(substanceTextureRequest);
    }
  }, [substanceTextureRequest]);

  useEffect(() => {
    if (pendingImportFiles && pendingImportFiles.length > 0) {
      loadFilesRef.current?.(pendingImportFiles);
      onConsumedPendingImport?.();
    }
  }, [pendingImportFiles, onConsumedPendingImport]);

  useEffect(() => {
    if (exportZipNonce && exportZipNonce > 0) {
      exportZipRef.current?.();
    }
  }, [exportZipNonce]);

  useEffect(() => {
    syncSplineModeRef.current?.();
  }, [toolMode, playMode, physicsActive, bloomEnabled, bloomStrength, hideDefaultBase]);

  useEffect(() => {
    if (focusedStage) {
      setDockExpanded(true);
    }
  }, [focusedStage]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || verificationReport) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        frameSceneRef.current?.();
      } else if (e.code === 'KeyV') {
        setToolMode('orbit');
      } else if (e.code === 'KeyG' || e.code === 'KeyW') {
        setToolMode('translate');
      } else if (e.code === 'KeyE') {
        setToolMode('rotate');
      } else if (e.code === 'KeyS' || e.code === 'KeyR') {
        setToolMode('scale');
      } else if (e.code === 'KeyP') {
        setPlayMode((p) => !p);
      } else if (
        e.key === 'Delete' ||
        e.code === 'Delete' ||
        e.key === 'Backspace' ||
        e.code === 'Backspace' ||
        (!e.ctrlKey && !e.metaKey && e.code === 'KeyX')
      ) {
        e.preventDefault();
        deleteSelectedRef.current?.();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
        e.preventDefault();
        void saveProjectRef.current?.(false);
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD') {
        e.preventDefault();
        duplicateSelectedRef.current?.();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ') {
        e.preventDefault();
        redoSceneRef.current?.();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') {
        e.preventDefault();
        redoSceneRef.current?.();
      } else if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyZ' || e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        if (stateRef.current.toolMode.startsWith('sculpt_')) {
          undoSculptRef.current?.();
        } else if (stateRef.current.toolMode === 'paint') {
          undoPaintRef.current?.();
        } else {
          undoSceneRef.current?.();
        }
      } else if (e.code === 'Escape') {
        if (
          stateRef.current.toolMode === 'paint' ||
          stateRef.current.toolMode === 'assign_mat' ||
          stateRef.current.toolMode.startsWith('sculpt_')
        ) {
          setToolMode('orbit');
        } else if (window.innerWidth < 768) {
          setDockExpanded(false);
        } else {
          selectObjectByIdRef.current?.(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [verificationReport]);

  useEffect(() => {
    onRegisterGlobalActions?.({
      undo: () => {
        if (stateRef.current.toolMode.startsWith('sculpt_')) undoSculptRef.current?.();
        else if (stateRef.current.toolMode === 'paint') undoPaintRef.current?.();
        else undoSceneRef.current?.();
      },
      redo: () => redoSceneRef.current?.(),
      toggleWireframe: () => setWireframeMode((v) => !v),
      importModel: () => fileInputRef.current?.click(),
    });
    return () => onRegisterGlobalActions?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    onWireframeChange?.(wireframeMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wireframeMode]);

  const isEditModeActive =
    toolMode === 'paint' || toolMode === 'assign_mat' || toolMode.startsWith('sculpt_');

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    stateRef.current.camTarget = preset;
    if (tweenCameraPresetRef.current) {
      tweenCameraPresetRef.current(preset);
    } else {
      stateRef.current.camTransitioning = true;
    }
  };

  const handleGizmoCameraPreset = (preset: GizmoCameraPreset) => {
    const mapped: CameraPreset =
      preset === 'orbital' ? 'q34' : preset === 'top' ? 'top' : preset === 'side' ? 'side' : 'front';
    handleSelectPreset(mapped);
  };

  const handleScrubFrame = (frame: number) => {
    setIsPlaying(false);
    setCurrentFrame(frame);
    stateRef.current.frame = frame;
    if (loadedAsset) {
      scrubUploadedTimeRef.current?.(frame);
    } else {
      applyFramePoseRef.current?.(frame);
    }
  };

  const triggerImportFiles = (files: File[]) => {
    if (files.length === 0) return;
    const modelFile = files.find((f) => /\.(glb|gltf|obj)$/i.test(f.name));
    if (modelFile) {
      onImportedModelFile?.(modelFile);
      window.setTimeout(() => {
        autoSetupPipelineRef.current?.();
      }, 650);
    }
    if (!loadFilesRef.current) {
      setLoadError('A Viewport 3D não foi inicializada (WebGL indisponível). Recarregue a janela ou tente novamente.');
      return;
    }
    loadFilesRef.current(files);
  };

  const triggerLoadSample = () => {
    if (!loadSampleRef.current) {
      setLoadError('A Viewport 3D não foi inicializada (WebGL indisponível). Recarregue a janela ou tente novamente.');
      return;
    }
    loadSampleRef.current();
  };

  return (
    <div
      className="relative flex-1 w-full h-full min-h-[360px] bg-[#0D1017] flex overflow-hidden select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
        triggerImportFiles(files);
      }}
    >
      {/* Hidden GLB/glTF/ZIP Multi-File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf,.zip,.bin,.png,.jpg,.jpeg,.webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          e.target.value = '';
          triggerImportFiles(files);
        }}
      />

      {/* Hidden Texture Image Input */}
      <input
        ref={textureFileInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) {
            loadCustomTextureFileRef.current?.(f);
          }
        }}
      />

      {/* Hidden Individual PBR Channel Texture Input */}
      <input
        ref={pbrChannelInputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) {
            loadPbrChannelTextureRef.current?.(activePbrChannelUpload, f);
          }
        }}
      />

      {/* Hidden Custom HDRI / EXR Input */}
      <input
        ref={hdriFileInputRef}
        type="file"
        accept=".hdr,.exr"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) {
            loadCustomHdriRef.current?.(f);
          }
        }}
      />

      {/* Hidden Video Texture Input (.mp4 / .webm) */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/webm,.mp4,.webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) {
            applyVideoTextureRef.current?.(f);
          }
        }}
      />

      {/* Mobile Scrim Backdrop for Studio Sidebar */}
      {dockExpanded && (
        <button
          type="button"
          aria-label="Fechar controles do estúdio"
          onClick={() => setDockExpanded(false)}
          className="md:hidden absolute inset-0 z-20 bg-black/60 backdrop-blur-[2px] cursor-pointer"
        />
      )}

      {/* Left Sidebar — Hierarquia da Cena (desktop, sempre visível) */}
      <MeshHierarchyDrawer
        docked
        open
        onClose={() => undefined}
        meshes={meshList}
        selectedMeshId={selectedMeshId}
        metrics={sceneMetrics}
        onSelectMesh={(id) => {
          setSelectedMeshId(id);
          selectObjectByIdRef.current?.(id);
        }}
        onFocusMesh={(id) => focusMeshByIdRef.current?.(id)}
        onToggleMeshVisibility={(id) => toggleMeshVisibilityRef.current?.(id)}
        onShowAllMeshes={() => showAllMeshesRef.current?.()}
        onDeleteMesh={(id) => deleteMeshByIdRef.current?.(id)}
      />

      {/* Right Inspector — Pipeline contextual (abas por etapa) */}
      {dockExpanded && (
        <aside
          aria-label="Inspetor do Estúdio"
          className="order-3 max-md:absolute max-md:inset-y-0 max-md:right-0 max-md:z-30 max-md:shadow-2xl md:relative w-[min(88vw,340px)] md:w-[300px] lg:w-[320px] xl:w-[340px] shrink-0 h-full border-l border-slate-800/90 bg-[#10141D] flex flex-col md:z-10"
        >
          <div className="px-2.5 pt-2 pb-1.5 border-b border-slate-800/80 shrink-0 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className="flex-1 min-w-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                Inspetor
              </div>
              <button
                type="button"
                disabled={isSavingProject || isLoadingModel}
                onClick={() => void saveProjectRef.current?.(false)}
                title="Salvar estado atual do projeto no navegador (Ctrl+S)"
                className="min-h-[32px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600 text-xs font-semibold text-emerald-300 hover:text-white disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>{isSavingProject ? '...' : 'Salvar'}</span>
              </button>
              <button
                type="button"
                onClick={() => setDockExpanded(false)}
                aria-label="Fechar inspetor"
                className="md:hidden min-w-[32px] min-h-[32px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <InspectorTabs activeStage={focusedStage} onSelectStage={(k) => onOpenTab?.(k)} />
          </div>
          {focusedStage === 'stage5' && (
            <div className="px-2.5 py-2 border-b border-slate-800/80 shrink-0 grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => onOpenTab?.('atlas')}
                className="min-h-[32px] px-2 py-1 rounded-md bg-[#0D1017] border border-slate-700 hover:border-violet-500 text-slate-200 cursor-pointer"
              >
                Abrir Editor de UV
              </button>
              <button
                type="button"
                onClick={() => onOpenTab?.('ecosystem')}
                className="min-h-[32px] px-2 py-1 rounded-md bg-[#0D1017] border border-slate-700 hover:border-violet-500 text-slate-200 cursor-pointer"
              >
                Abrir Hub PBR
              </button>
            </div>
          )}
          {focusedStage === 'stage7' && loadedAsset && !loadedAsset.hasSkeleton && (
            <div className="mx-2.5 mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-100 leading-relaxed shrink-0">
              Nenhuma animação ou esqueleto detectado neste modelo. Use &ldquo;Gerar Rig Automático&rdquo; abaixo para criar um.
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain p-2.5 flex flex-col gap-2 text-xs">
            {/* 1. IMPORTAR GLB / glTF (Edição livre em todo o pipeline) */}
            <PipelineStageCard
              title="1. IMPORTAR GLB / glTF"
              description="Importar modelo .glb, .gltf ou .zip para editar livremente em todo o pipeline."
              icon={<Upload className="w-4 h-4 text-orange-400" />}
              expanded={focusedStage === 'stage1' || openSections.stage1}
              hidden={Boolean(focusedStage && focusedStage !== 'stage1')}
              standalone={focusedStage === 'stage1'}
              onToggle={() => toggleSection('stage1')}
              badgeText={loadedAsset ? `${loadedAsset.meshCount} malha(s)` : undefined}
            >
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={isLoadingModel || isExporting}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 font-semibold text-white transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isLoadingModel ? 'Lendo...' : 'Importar GLB'}</span>
                </button>
                <button
                  type="button"
                  disabled={isLoadingModel}
                  onClick={triggerLoadSample}
                  title="Carregar modelo de exemplo PBR (DamagedHelmet.glb)"
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-slate-500 font-medium text-slate-200 cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>Helmet Exemplo</span>
                </button>
              </div>
              <button
                type="button"
                disabled={isLoadingModel}
                onClick={() => autoSetupPipelineRef.current?.()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span>Automatizar Tudo (UV Abaixo + PBR)</span>
              </button>

              {/* Gerar Exemplos Prontos (1 clique + UV automático) */}
              <div className="rounded-lg bg-[#0D1017] border border-slate-800 p-2 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Gerar Exemplos Prontos
                </span>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    disabled={isLoadingModel}
                    onClick={() => {
                      applyTemplateRef.current?.('product_showcase');
                      window.setTimeout(() => autoSetupPipelineRef.current?.(), 120);
                    }}
                    className="px-2 py-1.5 rounded bg-[#141923] border border-slate-800 hover:border-orange-500/60 text-slate-200 hover:text-white text-[10px] font-medium cursor-pointer"
                  >
                    Produto Estúdio
                  </button>
                  <button
                    type="button"
                    disabled={isLoadingModel}
                    onClick={() => {
                      applyTemplateRef.current?.('glass_neon');
                      window.setTimeout(() => autoSetupPipelineRef.current?.(), 120);
                    }}
                    className="px-2 py-1.5 rounded bg-[#141923] border border-slate-800 hover:border-orange-500/60 text-slate-200 hover:text-white text-[10px] font-medium cursor-pointer"
                  >
                    Vidro &amp; Neon
                  </button>
                  <button
                    type="button"
                    disabled={isLoadingModel}
                    onClick={() => {
                      applyTemplateRef.current?.('floating_shapes');
                      window.setTimeout(() => autoSetupPipelineRef.current?.(), 120);
                    }}
                    className="px-2 py-1.5 rounded bg-[#141923] border border-slate-800 hover:border-orange-500/60 text-slate-200 hover:text-white text-[10px] font-medium cursor-pointer"
                  >
                    Formas 3D
                  </button>
                  <button
                    type="button"
                    disabled={isLoadingModel}
                    onClick={() => {
                      triggerLoadSample();
                      window.setTimeout(() => autoSetupPipelineRef.current?.(), 900);
                    }}
                    className="px-2 py-1.5 rounded bg-[#141923] border border-slate-800 hover:border-orange-500/60 text-slate-200 hover:text-white text-[10px] font-medium cursor-pointer"
                  >
                    Helmet PBR
                  </button>
                </div>
              </div>

              <button
                type="button"
                disabled={isLoadingModel}
                onClick={() => setDriveModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-600/15 border border-sky-500/40 hover:bg-sky-600 hover:text-white text-sky-200 font-semibold transition-colors cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span>Abrir / Salvar no Google Drive</span>
              </button>

              {loadError && (
                <div className="rounded-md bg-red-950/90 border border-red-700/70 px-2 py-1.5 text-[11px] text-red-200 leading-snug">
                  {loadError}
                </div>
              )}

              {loadedAsset ? (
                <div className="rounded-lg bg-[#0D1017] border border-slate-800 p-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100 truncate">{loadedAsset.name}</span>
                    <span className="font-mono text-[10px] text-emerald-300 shrink-0">
                      {loadedAsset.triCount.toLocaleString('pt-BR')} tris
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => selectUploadedRootRef.current?.()}
                      className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-orange-600/20 border border-orange-500/40 hover:bg-orange-600 hover:text-white text-orange-200 text-[10px] font-semibold cursor-pointer"
                    >
                      <MousePointer2 className="w-3 h-3 shrink-0" />
                      <span>Editar Raiz (Gizmo)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowMeshDrawer((v) => !v)}
                      className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-[#141923] border border-slate-700 hover:border-slate-500 text-slate-200 text-[10px] font-medium cursor-pointer"
                    >
                      <Layers className="w-3 h-3 text-sky-400 shrink-0" />
                      <span>Malhas ({loadedAsset.meshCount})</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => resetAssetRef.current?.()}
                    className="w-full inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-[#141923] border border-slate-800 hover:border-sky-500 text-[10px] text-slate-300 hover:text-sky-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restaurar Helmet Exemplo</span>
                  </button>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 leading-snug">
                  Aceita <strong className="text-slate-200">.glb</strong>,{' '}
                  <strong className="text-slate-200">.gltf</strong> ou{' '}
                  <strong className="text-slate-200">.zip</strong> (ou arraste direto para a viewport) para editar livremente em todas as etapas.
                </div>
              )}

            </PipelineStageCard>

            {/* 2. EDITAR CENA & OBJETOS */}
            <PipelineStageCard
              title="2. EDITAR CENA & OBJETOS"
              description="Transformar, posicionar, inspecionar hierarquia, materiais, booleanas e ajustes de modelos importados."
              icon={<Box className="w-4 h-4 text-sky-400" />}
              expanded={focusedStage === 'stage2' || openSections.stage2}
              hidden={Boolean(focusedStage && focusedStage !== 'stage2')}
              standalone={focusedStage === 'stage2'}
              onToggle={() => toggleSection('stage2')}
              badgeText={sceneMetrics.meshes > 0 ? `${sceneMetrics.meshes} malha(s)` : undefined}
            >
              <SplineDesignPanel
                section="modeling"
                wrapperless
                playMode={playMode}
                onTogglePlayMode={setPlayMode}
                physicsActive={physicsActive}
                onTogglePhysicsActive={() => setPhysicsActive((v) => !v)}
                bloomEnabled={bloomEnabled}
                onToggleBloom={() => setBloomEnabled((v) => !v)}
                bloomStrength={bloomStrength}
                onBloomStrengthChange={setBloomStrength}
                toolMode={toolMode}
                onSelectToolMode={setToolMode}
                onAddPrimitive={(kind) => addPrimitiveRef.current?.(kind)}
                onApplyTemplate={(tpl) => applyTemplateRef.current?.(tpl)}
                onRunBoolean={(op) => runBooleanRef.current?.(op)}
                selectedObject={selectedObjectInspector}
                onUpdateTransform={(g, i, v) => updateObjectTransformRef.current?.(g, i, v)}
                onUpdateObjectMaterial={(patch) => updateObjectMaterialRef.current?.(patch)}
                onUpdateInteraction={(interaction) => updateObjectInteractionRef.current?.(interaction)}
                onToggleObjectPhysics={(en) => toggleObjectPhysicsRef.current?.(en)}
                onUploadVideoTexture={() => videoFileInputRef.current?.click()}
                onDuplicateSelected={() => duplicateSelectedRef.current?.()}
                onDeleteSelected={() => deleteSelectedRef.current?.()}
                onFocusSelected={() => {
                  if (selectedObjectInspector) {
                    focusMeshByIdRef.current?.(selectedObjectInspector.id);
                  } else {
                    frameSceneRef.current?.();
                  }
                }}
                hideDefaultBase={hideDefaultBase}
                onToggleHideDefaultBase={() => setHideDefaultBase((v) => !v)}
                primitiveCount={primitiveCount}
                editableMeshCount={sceneMetrics.meshes}
              />
            </PipelineStageCard>

            {/* 3. ESCULTURA / DETALHAMENTO */}
            <PipelineStageCard
              title="3. ESCULTURA / DETALHAMENTO"
              description="Adicionar detalhes finos e relevos à malha antes de otimizá-la."
              icon={<Hammer className="w-4 h-4 text-amber-400" />}
              expanded={focusedStage === 'stage3' || openSections.stage3}
              hidden={Boolean(focusedStage && focusedStage !== 'stage3')}
              standalone={focusedStage === 'stage3'}
              onToggle={() => toggleSection('stage3')}
            >
              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  onClick={() => setToolMode('orbit')}
                  className={`px-1.5 py-1.5 rounded border text-[10px] font-medium cursor-pointer ${
                    toolMode === 'orbit'
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Câmera
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('sculpt_push')}
                  className={`px-1.5 py-1.5 rounded border text-[10px] font-medium cursor-pointer ${
                    toolMode === 'sculpt_push'
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  + Relevo
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('sculpt_pull')}
                  className={`px-1.5 py-1.5 rounded border text-[10px] font-medium cursor-pointer ${
                    toolMode === 'sculpt_pull'
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  - Escavar
                </button>
                <button
                  type="button"
                  onClick={() => setToolMode('sculpt_smooth')}
                  className={`px-1.5 py-1.5 rounded border text-[10px] font-medium cursor-pointer ${
                    toolMode === 'sculpt_smooth'
                      ? 'bg-orange-600 border-orange-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Suavizar
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => subdivideMeshRef.current?.()}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-amber-500 text-slate-100 font-medium cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Subdividir (+4x)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSculptMirrorX((v) => !v)}
                  className={`inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                    sculptMirrorX
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  <span>Espelho X: {sculptMirrorX ? 'On' : 'Off'}</span>
                </button>
              </div>

              <button
                type="button"
                disabled={!canUndoSculpt}
                onClick={() => undoSculptRef.current?.()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 disabled:opacity-40 text-slate-200 hover:text-white font-medium cursor-pointer"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Desfazer Escultura / Malha</span>
              </button>

              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-slate-400">
                  <span>Raio do Pincel</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {sculptRadius.toFixed(2)}m
                  </span>
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={0.65}
                  step={0.01}
                  value={sculptRadius}
                  onChange={(e) => setSculptRadius(Number(e.target.value))}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-slate-400">
                  <span>Força de Escultura</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {Math.round(sculptStrength * 1000)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0.004}
                  max={0.06}
                  step={0.002}
                  value={sculptStrength}
                  onChange={(e) => setSculptStrength(Number(e.target.value))}
                />
              </label>

              <label className="flex flex-col gap-1 pt-1 border-t border-slate-800/70">
                <span className="flex justify-between text-slate-400">
                  <span>Relevo Normal Map</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {config.normalStrength.toFixed(2)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.05}
                  value={config.normalStrength}
                  onChange={(e) => onConfigChange({ normalStrength: Number(e.target.value) })}
                />
              </label>
            </PipelineStageCard>

            {/* 4. RETOPOLOGY */}
            <PipelineStageCard
              title="3. RETOPOLOGY"
              description="Reorganizar e limpar a malha para ficar leve e deformar corretamente."
              icon={<Layers className="w-4 h-4 text-cyan-400" />}
              expanded={focusedStage === 'stage4' || openSections.stage4}
              hidden={Boolean(focusedStage && focusedStage !== 'stage4')}
              standalone={focusedStage === 'stage4'}
              onToggle={() => toggleSection('stage4')}
              badgeText={
                sceneMetrics.triangles > 0
                  ? `${sceneMetrics.triangles.toLocaleString('pt-BR')} tris`
                  : undefined
              }
            >
              <div className="grid grid-cols-3 gap-1 text-center rounded-lg bg-[#0D1017] border border-slate-800 p-1.5">
                <div>
                  <div className="text-[10px] text-slate-500">Vértices</div>
                  <div className="font-mono text-slate-200 tabular-nums">
                    {sceneMetrics.vertices.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Triângulos</div>
                  <div className="font-mono text-slate-200 tabular-nums">
                    {sceneMetrics.triangles.toLocaleString('pt-BR')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">Malhas</div>
                  <div className="font-mono text-slate-200 tabular-nums">{sceneMetrics.meshes}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5 rounded-lg bg-[#0D1017] border border-slate-800/90 p-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>Alvo Retopologia (Remesh)</span>
                  <span className="font-mono text-cyan-300">{Math.round(retopoRatio * 100)}% tris</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[0.75, 0.5, 0.25].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRetopoRatio(r)}
                      className={`px-1.5 py-1 rounded border text-[10px] font-medium cursor-pointer ${
                        retopoRatio === r
                          ? 'bg-cyan-600/25 border-cyan-500 text-cyan-200'
                          : 'bg-[#141923] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {Math.round(r * 100)}%
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    disabled={isLoadingModel}
                    onClick={() => retopoMeshRef.current?.(retopoRatio)}
                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-cyan-600/20 border border-cyan-500/40 hover:bg-cyan-600 hover:text-white text-cyan-200 font-semibold transition-colors cursor-pointer"
                  >
                    <Layers className="w-3 h-3 shrink-0" />
                    <span>Retopologizar</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLoadingModel}
                    onClick={() => weldMeshRef.current?.()}
                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#141923] border border-slate-700 hover:border-cyan-500 text-slate-200 font-medium cursor-pointer"
                  >
                    <span>Limpar (Weld)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  aria-expanded={showMeshDrawer}
                  onClick={() => setShowMeshDrawer((v) => !v)}
                  className={`inline-flex items-center justify-between gap-1 px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                    showMeshDrawer
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-orange-400" />
                    <span>Malhas</span>
                  </span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-150 ${
                      showMeshDrawer ? 'rotate-180 text-white' : 'text-slate-400'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  disabled={isLoadingModel}
                  onClick={() => verifyCurrentSceneRef.current?.()}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-amber-500 font-medium text-slate-200 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Verificar</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setWireframeMode((v) => !v)}
                  className={`px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                    wireframeMode
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Wireframe
                </button>
                <button
                  type="button"
                  onClick={() => setDoubleSided((v) => !v)}
                  className={`px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                    doubleSided
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Dois Lados
                </button>
                <button
                  type="button"
                  onClick={() => setShowGrid((v) => !v)}
                  className={`px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                    showGrid
                      ? 'bg-slate-700 border-slate-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Grade
                </button>
              </div>

              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-slate-400">
                  <span>Contorno Borde</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {config.outlineThickness.toFixed(3)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0.002}
                  max={0.025}
                  step={0.001}
                  value={config.outlineThickness}
                  onChange={(e) => onConfigChange({ outlineThickness: Number(e.target.value) })}
                />
              </label>
            </PipelineStageCard>

            {/* 5. UV UNWRAPPING */}
            <PipelineStageCard
              title="5. UV UNWRAPPING"
              description="Abrir a superfície 3D em plano 2D para preparar o modelo para pintura."
              icon={<Scissors className="w-4 h-4 text-violet-400" />}
              expanded={focusedStage === 'stage5' || openSections.stage5}
              hidden={Boolean(focusedStage && focusedStage !== 'stage5')}
              standalone={focusedStage === 'stage5'}
              onToggle={() => toggleSection('stage5')}
            >
              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-slate-400">
                  <span>Margem das Ilhas UV</span>
                  <span className="font-mono text-slate-200 tabular-nums">
                    {(config.uvMargin ?? 0.02).toFixed(3)}
                  </span>
                </span>
                <input
                  type="range"
                  min={0.004}
                  max={0.08}
                  step={0.002}
                  value={config.uvMargin ?? 0.02}
                  onChange={(e) => onConfigChange({ uvMargin: Number(e.target.value) })}
                />
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={isLoadingModel}
                  onClick={() => generateAutoUvRef.current?.()}
                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-sky-500 text-slate-100 font-medium cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5 text-sky-400" />
                  <span>Gerar UV Auto</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setShadingMode((m) => (m === 'uv_checker' ? 'pbr' : 'uv_checker'))
                  }
                  className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border font-medium cursor-pointer ${
                    shadingMode === 'uv_checker'
                      ? 'bg-orange-600/20 border-orange-500 text-orange-200'
                      : 'bg-[#0D1017] border-slate-800 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 text-orange-400" />
                  <span>UV Checker</span>
                </button>
              </div>
              {onOpenTab && (
                <button
                  type="button"
                  onClick={() => onOpenTab('atlas')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-orange-600/15 border border-orange-500/40 hover:bg-orange-600 hover:text-white text-orange-300 font-semibold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir 5. UV Unwrapping</span>
                </button>
              )}
            </PipelineStageCard>

            {/* 6. MATERIAL & TEXTURING */}
            <PipelineStageCard
              title="6. MATERIAL & TEXTURING"
              description="Aplicar cores, texturas, reflexos e propriedades de superfície PBR."
              icon={<Palette className="w-4 h-4 text-orange-400" />}
              expanded={focusedStage === 'stage5' || openSections.stage6}
              hidden={Boolean(focusedStage && focusedStage !== 'stage5')}
              standalone={focusedStage === 'stage5'}
              onToggle={() => toggleSection('stage6')}
            >
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Shading da Viewport</span>
                <div className="relative">
                  <select
                    value={shadingMode}
                    onChange={(e) => setShadingMode(e.target.value as ShadingMode)}
                    className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-[11px] font-medium text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
                  >
                    <option value="pbr">PBR Físico</option>
                    <option value="uv_checker">UV Checker</option>
                    <option value="normals">Normais</option>
                    <option value="cel_borde">Cel + Borde</option>
                  </select>
                  <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </label>

              <button
                type="button"
                aria-expanded={showPaintStudio}
                onClick={() => {
                  setShowPaintStudio((v) => {
                    const next = !v;
                    if (!next) setToolMode('orbit');
                    return next;
                  });
                }}
                className={`w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border font-semibold cursor-pointer ${
                  showPaintStudio || toolMode === 'paint' || toolMode === 'assign_mat'
                    ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                    : 'bg-[#0D1017] border-slate-700 text-slate-200 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Paintbrush className="w-3.5 h-3.5 text-orange-400" />
                  <span>Pintura &amp; Materiais 3D</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    showPaintStudio ? 'rotate-180 text-orange-300' : 'text-slate-400'
                  }`}
                />
              </button>

              {showPaintStudio && (
                <div className="rounded-lg bg-[#0D1017] border border-slate-800 p-2.5 flex flex-col gap-2.5 text-[11px]">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setToolMode('orbit')}
                      className={`inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded font-medium cursor-pointer ${
                        toolMode === 'orbit'
                          ? 'bg-slate-700 text-white'
                          : 'bg-[#141923] text-slate-400 hover:text-white'
                      }`}
                    >
                      <MousePointer2 className="w-3 h-3" />
                      <span>Câmera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToolMode('assign_mat')}
                      className={`inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded font-medium cursor-pointer ${
                        toolMode === 'assign_mat'
                          ? 'bg-orange-600 text-white'
                          : 'bg-[#141923] text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Peça</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToolMode('paint')}
                      className={`inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded font-medium cursor-pointer ${
                        toolMode === 'paint'
                          ? 'bg-orange-600 text-white'
                          : 'bg-[#141923] text-slate-400 hover:text-white'
                      }`}
                    >
                      <Paintbrush className="w-3 h-3" />
                      <span>Pintar</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!canUndoPaint}
                      onClick={() => undoPaintRef.current?.()}
                      title="Desfazer última pincelada (Ctrl+Z)"
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-[#141923] border border-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                    >
                      <Undo2 className="w-3 h-3 text-amber-400" />
                      <span>Desfazer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => clearPaintTexturesRef.current?.()}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 rounded bg-[#141923] border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                    >
                      <Eraser className="w-3 h-3 text-rose-400" />
                      <span>Limpar</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => textureFileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded bg-[#141923] border border-slate-700 text-slate-200 cursor-pointer truncate"
                  >
                    <ImagePlus className="w-3 h-3 text-sky-400 shrink-0" />
                    <span className="truncate">
                      {customTextureName ? customTextureName : 'Inserir Textura'}
                    </span>
                  </button>

                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/70">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Material PBR</span>
                      <input
                        type="color"
                        value={customMatColor}
                        aria-label="Cor base do material"
                        onChange={(e) => setCustomMatColor(e.target.value)}
                        className="w-6 h-5 rounded bg-transparent border border-slate-700 cursor-pointer"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {PBR_MATERIAL_LIBRARY.map((mat) => {
                        const active = selectedMatId === mat.id;
                        return (
                          <button
                            key={mat.id}
                            type="button"
                            onClick={() => {
                              setSelectedMatId(mat.id);
                              setCustomMatColor(mat.color);
                              if (toolMode === 'orbit') setToolMode('assign_mat');
                            }}
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border cursor-pointer ${
                              active
                                ? 'bg-slate-800 border-orange-500 text-white'
                                : 'bg-[#141923] border-slate-800 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-sm border border-white/20 shrink-0"
                              style={{ backgroundColor: mat.color }}
                            />
                            <span className="truncate">{mat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => applyMaterialToAllRef.current?.()}
                      className="w-full px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium cursor-pointer"
                    >
                      Aplicar em Tudo
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/70">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-400">Pincel</span>
                      <div className="flex items-center gap-1">
                        {BRUSH_SWATCHES.map((swatch) => (
                          <button
                            key={swatch}
                            type="button"
                            aria-label={`Cor ${swatch}`}
                            onClick={() => {
                              setBrushColor(swatch);
                              setToolMode('paint');
                            }}
                            className={`w-3.5 h-3.5 rounded-sm border cursor-pointer ${
                              brushColor.toLowerCase() === swatch.toLowerCase()
                                ? 'border-white scale-110'
                                : 'border-slate-700'
                            }`}
                            style={{ backgroundColor: swatch }}
                          />
                        ))}
                        <input
                          type="color"
                          value={brushColor}
                          aria-label="Cor personalizada do pincel"
                          onChange={(e) => {
                            setBrushColor(e.target.value);
                            setToolMode('paint');
                          }}
                          className="w-5 h-4 rounded bg-transparent border border-slate-700 cursor-pointer"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-slate-400">
                      <span>Tam.</span>
                      <input
                        type="range"
                        min={6}
                        max={64}
                        step={2}
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="flex-1 min-w-0 cursor-pointer"
                      />
                      <span className="font-mono text-slate-200 tabular-nums w-8 text-right">
                        {brushSize}px
                      </span>
                    </label>
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-800/70">
                    <span className="text-slate-400">Procedural / Smart</span>
                    <div className="flex flex-wrap gap-1">
                      {PROCEDURAL_PBR_PRESETS.map((pr) => (
                        <button
                          key={pr.id}
                          type="button"
                          onClick={() => applyProceduralBundleRef.current?.(pr.defaultParams)}
                          className={`px-2 py-1 rounded border cursor-pointer ${
                            activeProceduralLabel === pr.label
                              ? 'bg-orange-600/20 border-orange-500 text-orange-200'
                              : 'bg-[#141923] border-slate-800 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          {pr.label}
                        </button>
                      ))}
                    </div>

                    <span className="text-slate-400 pt-1">Mapas PBR</span>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          { id: 'map', label: 'Base Color' },
                          { id: 'roughnessMap', label: 'Roughness' },
                          { id: 'metalnessMap', label: 'Metallic' },
                          { id: 'normalMap', label: 'Normal' },
                          { id: 'aoMap', label: 'AO' },
                        ] as const
                      ).map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActivePbrChannelUpload(ch.id);
                            pbrChannelInputRef.current?.click();
                          }}
                          className="px-1.5 py-1 rounded bg-[#141923] border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white cursor-pointer"
                        >
                          + {ch.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1.5 border-t border-slate-800/70">
                <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>PBR ao Vivo</span>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="flex justify-between text-slate-400">
                    <span>Rugosidade (Roughness)</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {roughnessOverride.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.01}
                    value={roughnessOverride}
                    onChange={(e) => setRoughnessOverride(Number(e.target.value))}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="flex justify-between text-slate-400">
                    <span>Metálico (Metallic)</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {metalnessOverride.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={metalnessOverride}
                    onChange={(e) => setMetalnessOverride(Number(e.target.value))}
                  />
                </label>
              </div>

              {selectedObjectInspector && (
                <div className="pt-1.5 border-t border-slate-800/70">
                  <SplineDesignPanel
                    section="material"
                    wrapperless
                    playMode={playMode}
                    onTogglePlayMode={setPlayMode}
                    physicsActive={physicsActive}
                    onTogglePhysicsActive={() => setPhysicsActive((v) => !v)}
                    bloomEnabled={bloomEnabled}
                    onToggleBloom={() => setBloomEnabled((v) => !v)}
                    bloomStrength={bloomStrength}
                    onBloomStrengthChange={setBloomStrength}
                    toolMode={toolMode}
                    onSelectToolMode={setToolMode}
                    onAddPrimitive={(kind) => addPrimitiveRef.current?.(kind)}
                    onApplyTemplate={(tpl) => applyTemplateRef.current?.(tpl)}
                    onRunBoolean={(op) => runBooleanRef.current?.(op)}
                    selectedObject={selectedObjectInspector}
                    onUpdateTransform={(g, i, v) => updateObjectTransformRef.current?.(g, i, v)}
                    onUpdateObjectMaterial={(patch) => updateObjectMaterialRef.current?.(patch)}
                    onUpdateInteraction={(interaction) => updateObjectInteractionRef.current?.(interaction)}
                    onToggleObjectPhysics={(en) => toggleObjectPhysicsRef.current?.(en)}
                    onUploadVideoTexture={() => videoFileInputRef.current?.click()}
                    onDuplicateSelected={() => duplicateSelectedRef.current?.()}
                    onDeleteSelected={() => deleteSelectedRef.current?.()}
                    onFocusSelected={() => {
                      if (selectedObjectInspector) {
                        focusMeshByIdRef.current?.(selectedObjectInspector.id);
                      } else {
                        frameSceneRef.current?.();
                      }
                    }}
                    hideDefaultBase={hideDefaultBase}
                    onToggleHideDefaultBase={() => setHideDefaultBase((v) => !v)}
                    primitiveCount={primitiveCount}
                    editableMeshCount={sceneMetrics.meshes}
                  />
                </div>
              )}

              {onOpenTab && (
                <button
                  type="button"
                  onClick={() => onOpenTab('ecosystem')}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-orange-600/15 border border-orange-500/40 hover:bg-orange-600 hover:text-white text-orange-300 font-semibold transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir 6. Material &amp; Texturing</span>
                </button>
              )}
            </PipelineStageCard>

            {/* 7. RIGGING */}
            <PipelineStageCard
              title="5. RIGGING & ANIMAÇÃO"
              description="Seletor visual de ossos (Picker), anéis 3D de controle, ações articuladas e 12 Princípios da Animação."
              icon={<Bone className="w-4 h-4 text-orange-400" />}
              expanded={focusedStage === 'stage7' || openSections.stage7}
              hidden={Boolean(focusedStage && focusedStage !== 'stage7' && focusedStage !== 'stage8')}
              standalone={focusedStage === 'stage7' || focusedStage === 'stage8'}
              onToggle={() => toggleSection('stage7')}
              badgeText={`${RIG_PRESET_DEFINITIONS[config.rigPreset].boneCount} ossos`}
            >
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => autoRigCurrentCharacterRef.current?.()}
                  className="inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-bold transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Auto-Rig</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (isAutoTestingAnims) {
                      setIsAutoTestingAnims(false);
                      return;
                    }
                    setShowSkeleton(true);
                    autoRigCurrentCharacterRef.current?.();
                    setIsAutoTestingAnims(true);
                  }}
                  className={`inline-flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                    isAutoTestingAnims
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 shrink-0" />
                  <span>{isAutoTestingAnims ? 'Parar Teste' : 'Testar Rig + Tudo'}</span>
                </button>
              </div>
              <RigBonePicker
                selectedJointId={selectedRigJointId}
                onSelectJoint={(joint) => {
                  setSelectedRigJointId(joint.id);
                  setShowSkeleton(true);
                }}
                onRotateJoint={(joint, axis, deg) => rotateBoneJointRef.current?.(joint, axis, deg)}
                onResetPose={() => resetRigPoseRef.current?.()}
              />
              {/* Biblioteca de Ações — Padrão ActionForge (85 Clipes) */}
              <div className="rounded-lg bg-[#0D1017] border border-cyan-500/30 p-2.5 flex flex-col gap-2 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-cyan-300 tracking-wide uppercase">
                      Library · {ACTIONFORGE_CLIPS.length} Clips
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setClipViewMode('grid')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold cursor-pointer ${
                        clipViewMode === 'grid'
                          ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60'
                          : 'bg-[#121621] text-slate-400 border border-slate-800'
                      }`}
                    >
                      Thumbnails
                    </button>
                    <button
                      type="button"
                      onClick={() => setClipViewMode('list')}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold cursor-pointer ${
                        clipViewMode === 'list'
                          ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60'
                          : 'bg-[#121621] text-slate-400 border border-slate-800'
                      }`}
                    >
                      List
                    </button>
                    {animPrinciples.enabled && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = { ...animPrinciples, enabled: false };
                          setAnimPrinciples(next);
                          animPrinciplesRef.current = next;
                          setActiveClipId(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500 hover:text-white font-semibold cursor-pointer"
                      >
                        Parar
                      </button>
                    )}
                  </div>
                </div>

                <input
                  type="text"
                  value={clipSearch}
                  onChange={(e) => setClipSearch(e.target.value)}
                  placeholder="Buscar entre 85 clipes (Walk, Sword, Pistol, Zombie)..."
                  className="w-full px-2 py-1 rounded bg-[#121621] border border-slate-800 text-[10px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />

                {/* Filtros por Tag / Categoria + Root Motion na Cena */}
                <div className="flex flex-wrap items-center gap-1">
                  {['Todos', 'Move', 'Combat', 'Sword', 'Idle', 'Shooter', 'Air', 'Action', 'Work', 'Magic', 'Zombie'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setClipTagFilter(tag)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium cursor-pointer transition-colors ${
                        clipTagFilter === tag
                          ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60'
                          : 'bg-[#121621] text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOnlyRootMotion((v) => !v)}
                    title="Filtrar apenas clipes com deslocamento (→)"
                    className={`px-1.5 py-0.5 rounded text-[9px] font-semibold cursor-pointer ${
                      onlyRootMotion
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60'
                        : 'bg-[#121621] text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    → Move
                  </button>
                </div>

                {/* Toggle Andar/Correr Real na Cena (Root Motion) + Física */}
                <div className="grid grid-cols-2 gap-1">
                  <label className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-[#121621] border border-slate-800 cursor-pointer">
                    <span className="text-[9px] text-slate-200 font-medium truncate">
                      Andar na Cena
                    </span>
                    <input
                      type="checkbox"
                      checked={animPrinciples.rootMotion !== false}
                      onChange={(e) => {
                        const next = { ...animPrinciples, rootMotion: e.target.checked };
                        setAnimPrinciples(next);
                        animPrinciplesRef.current = next;
                      }}
                      className="accent-cyan-400 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-[#121621] border border-slate-800 cursor-pointer">
                    <span className="text-[9px] text-emerald-300 font-medium truncate">
                      Física (Inércia)
                    </span>
                    <input
                      type="checkbox"
                      checked={animPrinciples.physicsEnabled !== false}
                      onChange={(e) => {
                        const next = { ...animPrinciples, physicsEnabled: e.target.checked };
                        setAnimPrinciples(next);
                        animPrinciplesRef.current = next;
                      }}
                      className="accent-emerald-400 cursor-pointer"
                    />
                  </label>
                </div>

                <div
                  className={
                    clipViewMode === 'grid'
                      ? 'grid grid-cols-2 gap-1 max-h-60 overflow-y-auto pr-0.5'
                      : 'flex flex-col gap-1 max-h-60 overflow-y-auto pr-0.5'
                  }
                >
                  {ACTIONFORGE_CLIPS.filter((c) => {
                    if (clipTagFilter !== 'Todos' && c.tag !== clipTagFilter) return false;
                    if (onlyRootMotion && !c.rootMotion) return false;
                    const q = clipSearch.trim().toLowerCase();
                    return !q || c.label.toLowerCase().includes(q) || c.tag.toLowerCase().includes(q);
                  }).map((clip) => {
                    const isActive = animPrinciples.enabled && activeClipId === clip.id;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        onClick={() => {
                          const nextEnabled = !isActive;
                          const next = {
                            ...DEFAULT_ANIMATION_PRINCIPLES,
                            enabled: nextEnabled,
                            actionCycle: clip.cycle,
                            timingSpeed: clip.speed,
                            exaggeration: clip.exag,
                            rootMotion: animPrinciples.rootMotion !== false,
                            squashStretch: 0,
                            anticipation: 0,
                            arcsStrength: 0,
                            solidAsymmetry: 0,
                          };
                          setAnimPrinciples(next);
                          animPrinciplesRef.current = next;
                          setActiveClipId(nextEnabled ? clip.id : null);
                        }}
                        className={`px-2 py-1.5 rounded border text-left transition-colors cursor-pointer ${
                          clipViewMode === 'list'
                            ? 'flex items-center justify-between gap-2'
                            : 'flex flex-col gap-0.5'
                        } ${
                          isActive
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100'
                            : 'bg-[#121621] border-slate-800 text-slate-300 hover:border-cyan-500/50 hover:text-white'
                        }`}
                      >
                        <span className="text-[10px] font-semibold truncate">{clip.label}</span>
                        <span className="flex items-center gap-1 text-[8px] font-mono uppercase text-slate-500 shrink-0">
                          <span>{clip.tag}</span>
                          {clip.rootMotion && <span className="text-cyan-400">→</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <label className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400 shrink-0">Velocidade</span>
                  <input
                    type="range"
                    min={0.4}
                    max={2.0}
                    step={0.1}
                    value={animPrinciples.timingSpeed}
                    onChange={(e) => {
                      const next = { ...animPrinciples, timingSpeed: Number(e.target.value) };
                      setAnimPrinciples(next);
                      animPrinciplesRef.current = next;
                    }}
                    className="flex-1"
                  />
                  <span className="font-mono text-cyan-300 w-8 text-right">
                    {animPrinciples.timingSpeed.toFixed(1)}x
                  </span>
                </label>
              </div>

              {/* Física Real em Tempo Real — Rapier3D (Rust / WebAssembly) */}
              <div className="rounded-lg bg-[#0D1017] border border-emerald-500/35 p-2.5 flex flex-col gap-2 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-emerald-300 uppercase tracking-wide">
                    Física Real · Rapier3D (Rust/WASM)
                  </span>
                  <button
                    type="button"
                    onClick={() => void rapierToggleRef.current?.(!rapierConfig.enabled)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                      rapierConfig.enabled
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-[#121621] text-slate-300 border border-slate-700 hover:border-emerald-400'
                    }`}
                  >
                    {rapierConfig.enabled ? 'Ativo' : 'Ativar'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => void rapierDropRef.current?.()}
                    className="px-2 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-500 hover:text-slate-950 font-semibold cursor-pointer"
                  >
                    Queda Livre
                  </button>
                  <button
                    type="button"
                    onClick={() => rapierImpulseRef.current?.()}
                    className="px-2 py-1.5 rounded bg-[#121621] border border-slate-800 text-slate-200 hover:border-cyan-400 font-semibold cursor-pointer"
                  >
                    Impulso / Pulo
                  </button>
                  <button
                    type="button"
                    onClick={() => void rapierSpawnRef.current?.('sphere')}
                    className="px-2 py-1 rounded bg-[#121621] border border-slate-800 text-cyan-300 hover:border-cyan-400 font-medium cursor-pointer"
                  >
                    + Esfera Colisão
                  </button>
                  <button
                    type="button"
                    onClick={() => void rapierSpawnRef.current?.('box')}
                    className="px-2 py-1 rounded bg-[#121621] border border-slate-800 text-amber-300 hover:border-amber-400 font-medium cursor-pointer"
                  >
                    + Caixa Colisão
                  </button>
                </div>

                <label className="flex items-center gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Gravidade</span>
                  <input
                    type="range"
                    min={-25}
                    max={-1}
                    step={0.5}
                    value={rapierConfig.gravityY}
                    onChange={(e) => {
                      const next = { ...rapierConfig, gravityY: Number(e.target.value) };
                      setRapierConfig(next);
                      rapierConfigRef.current = next;
                      rapierWorldRef.current.updateConfig(next);
                    }}
                    className="flex-1"
                  />
                  <span className="font-mono text-emerald-300 w-12 text-right">
                    {rapierConfig.gravityY.toFixed(1)}
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Peso (kg)</span>
                  <input
                    type="range"
                    min={0.5}
                    max={30}
                    step={0.5}
                    value={rapierConfig.mass}
                    onChange={(e) => {
                      const next = { ...rapierConfig, mass: Number(e.target.value) };
                      setRapierConfig(next);
                      rapierConfigRef.current = next;
                      rapierWorldRef.current.updateConfig(next);
                    }}
                    className="flex-1"
                  />
                  <span className="font-mono text-emerald-300 w-12 text-right">
                    {rapierConfig.mass.toFixed(1)}kg
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Elasticid.</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={rapierConfig.restitution}
                    onChange={(e) => {
                      const next = { ...rapierConfig, restitution: Number(e.target.value) };
                      setRapierConfig(next);
                      rapierConfigRef.current = next;
                      rapierWorldRef.current.updateConfig(next);
                    }}
                    className="flex-1"
                  />
                  <span className="font-mono text-emerald-300 w-12 text-right">
                    {Math.round(rapierConfig.restitution * 100)}%
                  </span>
                </label>

                {rapierConfig.enabled && (
                  <button
                    type="button"
                    onClick={() => rapierResetRef.current?.()}
                    className="w-full py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-200 hover:bg-rose-500 hover:text-white font-semibold cursor-pointer"
                  >
                    Resetar Física &amp; Posição
                  </button>
                )}
              </div>

              {/* IK Procedural — Adaptação ao Ambiente (Cabeça/Olhos + Pés no Terreno) */}
              <div className="rounded-lg bg-[#0D1017] border border-sky-500/35 p-2.5 flex flex-col gap-2 text-[10px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sky-300 uppercase tracking-wide">
                    IK Procedural · Ambiente
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...ikConfig, enabled: !ikConfig.enabled };
                      setIkConfig(next);
                      ikConfigRef.current = next;
                    }}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold cursor-pointer ${
                      ikConfig.enabled
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-[#121621] text-slate-300 border border-slate-700 hover:border-sky-400'
                    }`}
                  >
                    {ikConfig.enabled ? 'Ativo' : 'Ativar'}
                  </button>
                </div>

                <label className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#121621] border border-slate-800 cursor-pointer">
                  <span className="text-slate-200">Cabeça &amp; Olhos (Look-At Câmera)</span>
                  <input
                    type="checkbox"
                    checked={ikConfig.headLookAtCamera}
                    onChange={(e) => {
                      const next = { ...ikConfig, enabled: true, headLookAtCamera: e.target.checked };
                      setIkConfig(next);
                      ikConfigRef.current = next;
                    }}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#121621] border border-slate-800 cursor-pointer">
                  <span className="text-slate-200">Pés no Terreno (2-Bone Foot IK)</span>
                  <input
                    type="checkbox"
                    checked={ikConfig.footGroundIk}
                    onChange={(e) => {
                      const next = { ...ikConfig, enabled: true, footGroundIk: e.target.checked };
                      setIkConfig(next);
                      ikConfigRef.current = next;
                    }}
                    className="accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-[#121621] border border-slate-800 cursor-pointer">
                  <span className="text-amber-300 font-medium">Gerar Terreno Irregular 3D</span>
                  <input
                    type="checkbox"
                    checked={ikConfig.unevenTerrain}
                    onChange={(e) => {
                      const next = { ...ikConfig, enabled: true, unevenTerrain: e.target.checked };
                      setIkConfig(next);
                      ikConfigRef.current = next;
                    }}
                    className="accent-amber-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center gap-2">
                  <span className="text-slate-400 w-16 shrink-0">Peso IK</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={ikConfig.ikWeight}
                    onChange={(e) => {
                      const next = { ...ikConfig, ikWeight: Number(e.target.value) };
                      setIkConfig(next);
                      ikConfigRef.current = next;
                    }}
                    className="flex-1"
                  />
                  <span className="font-mono text-sky-300 w-10 text-right">
                    {Math.round(ikConfig.ikWeight * 100)}%
                  </span>
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Preset de Armadura (Rig)</span>
                <div className="relative">
                  <select
                    value={config.rigPreset}
                    onChange={(e) => {
                      onConfigChange({ rigPreset: e.target.value as RigPreset });
                      setShowSkeleton(true);
                    }}
                    className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-[11px] font-medium text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
                  >
                    {(Object.keys(RIG_PRESET_DEFINITIONS) as RigPreset[]).map((presetKey) => {
                      const def = RIG_PRESET_DEFINITIONS[presetKey];
                      return (
                        <option key={presetKey} value={presetKey}>
                          {def.shortLabel} ({def.boneCount} ossos)
                        </option>
                      );
                    })}
                  </select>
                  <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </label>

              <button
                type="button"
                onClick={() => setShowSkeleton((s) => !s)}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md border font-medium cursor-pointer ${
                  showSkeleton
                    ? 'bg-slate-700 border-slate-500 text-white'
                    : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Bone className="w-3.5 h-3.5 text-orange-400" />
                <span>{showSkeleton ? 'Ocultar Ossos' : 'Mostrar Ossos'}</span>
              </button>

              <button
                type="button"
                disabled={isLoadingModel}
                onClick={() => generateRigAndAnimRef.current?.()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-orange-500 text-slate-100 font-medium cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5 text-orange-400" />
                <span>Gerar Rig &amp; Animação</span>
              </button>
            </PipelineStageCard>

            {/* 8. ANIMATION */}
            <PipelineStageCard
              title="6. ANIMAÇÃO"
              description="Dar movimento e vida ao modelo utilizando os controles criados no rigging."
              icon={<Video className="w-4 h-4 text-emerald-400" />}
              expanded={focusedStage === 'stage8' || openSections.stage8}
              hidden={Boolean(focusedStage && focusedStage !== 'stage8')}
              standalone={focusedStage === 'stage8'}
              onToggle={() => toggleSection('stage8')}
              badgeText={`${config.animEndFrame}f`}
            >
              <AnimationPrinciplesPanel
                config={animPrinciples}
                onChange={setAnimPrinciples}
              />
              {morphTargets.length > 0 && (
                <div className="rounded-lg bg-[#0D1017] border border-emerald-500/30 p-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-emerald-300">
                      Pose Morph / Expressões ({morphTargets.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        morphTargets.forEach((mt) => setMorphTargetWeightRef.current?.(mt.name, 0));
                      }}
                      className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      Zerar
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto flex flex-col gap-1.5 pr-1">
                    {morphTargets.map((mt) => (
                      <label key={mt.name} className="flex flex-col gap-0.5">
                        <span className="flex justify-between text-[10px] text-slate-300">
                          <span className="truncate max-w-[160px]">{mt.name}</span>
                          <span className="font-mono text-emerald-300">
                            {Math.round(mt.value * 100)}%
                          </span>
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={mt.value}
                          onChange={(e) =>
                            setMorphTargetWeightRef.current?.(mt.name, Number(e.target.value))
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1 p-0.5 rounded-md bg-[#0D1017] border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPlayMode(false)}
                  className={`px-2 py-1 rounded font-medium cursor-pointer ${
                    !playMode ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => setPlayMode(true)}
                  className={`px-2 py-1 rounded font-medium cursor-pointer ${
                    playMode ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Play
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    onConfigChange({ animEndFrame: 1 });
                    handleScrubFrame(1);
                  }}
                  className={`px-2 py-1.5 rounded-md border text-[10px] font-medium cursor-pointer ${
                    config.animEndFrame === 1
                      ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Pose Estática (1f)
                </button>
                <button
                  type="button"
                  onClick={() => onConfigChange({ animEndFrame: 60 })}
                  className={`px-2 py-1.5 rounded-md border text-[10px] font-medium cursor-pointer ${
                    config.animEndFrame >= 60
                      ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Ciclo Completo (60f)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => setRotationMode((m) => (m === 'XYZ' ? 'QUATERNION' : 'XYZ'))}
                  className="px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-slate-600 text-[10px] text-slate-200 font-medium cursor-pointer"
                  title="Alternar modo de rotação (convert_rotation_mode no Blender 5.3)"
                >
                  Rotação: {rotationMode === 'XYZ' ? 'Euler XYZ' : 'Quaternion'}
                </button>
                <button
                  type="button"
                  onClick={() => insertKeyframeRef.current?.()}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600 hover:text-white text-emerald-200 text-[10px] font-semibold cursor-pointer"
                >
                  <span>+ Keyframe ({currentFrame}f)</span>
                </button>
              </div>

              {recordedKeyframes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {recordedKeyframes.map((kf) => (
                    <button
                      key={kf.frame}
                      type="button"
                      onClick={() => jumpKeyframeRef.current?.(kf)}
                      className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-[10px] font-mono text-emerald-200 hover:bg-emerald-600 hover:text-white cursor-pointer"
                    >
                      ◆ {kf.frame}f
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => setPhysicsActive((v) => !v)}
                className={`w-full px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                  physicsActive
                    ? 'bg-amber-600/20 border-amber-500 text-amber-200'
                    : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Física: {physicsActive ? 'Gravidade Ativa' : 'Desligada'}
              </button>

              {!loadedAsset || loadedAsset.animClips.length > 0 ? (
                <>
                  {loadedAsset && loadedAsset.animClips.length > 1 && (
                    <div className="relative">
                      <select
                        aria-label="Selecionar clipe de animação"
                        value={loadedAsset.activeClipIdx}
                        onChange={(e) => selectClipRef.current?.(Number(e.target.value))}
                        className="w-full appearance-none pl-2.5 pr-7 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 text-xs text-slate-200 cursor-pointer focus:outline-none focus:border-orange-500"
                      >
                        {loadedAsset.animClips.map((name, idx) => (
                          <option key={`${name}-${idx}`} value={idx}>
                            {name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlaying((p) => !p)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 font-medium text-slate-100 cursor-pointer shrink-0"
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      <span>{isPlaying ? 'Pausar' : 'Animar'}</span>
                    </button>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, config.animEndFrame)}
                      disabled={config.animEndFrame <= 1}
                      value={Math.min(currentFrame, Math.max(1, config.animEndFrame))}
                      onChange={(e) => handleScrubFrame(Number(e.target.value))}
                      aria-label="Frame da animação"
                      className="flex-1 min-w-0 cursor-pointer disabled:opacity-40"
                    />
                    <span className="font-mono text-slate-300 tabular-nums w-8 text-right shrink-0">
                      {currentFrame}f
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-slate-500">
                  Sem clipes no modelo. Use <strong>Gerar Rig &amp; Animação</strong> na etapa 7.
                </div>
              )}
            </PipelineStageCard>

            {/* 9. SIMULAÇÃO, FX & PÓS-FX */}
            <PipelineStageCard
              title="7. SIMULAÇÃO, FX & PÓS-FX"
              description="Física dinâmica, gravidade, vento, partículas 3D, Bloom em tempo real e Color Grading."
              icon={<Sparkles className="w-4 h-4 text-cyan-400" />}
              expanded={focusedStage === 'stage9' || openSections.stage9}
              hidden={Boolean(focusedStage && focusedStage !== 'stage9')}
              standalone={focusedStage === 'stage9'}
              onToggle={() => toggleSection('stage9')}
              badgeText={
                physicsActive || windEnabled || particlesEnabled || bloomEnabled
                  ? 'ATIVO'
                  : undefined
              }
            >
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setPhysicsActive((v) => !v)}
                  className={`px-2 py-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                    physicsActive
                      ? 'bg-cyan-600 border-cyan-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Gravidade / Física
                </button>
                <button
                  type="button"
                  onClick={() => setParticlesEnabled((v) => !v)}
                  className={`px-2 py-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                    particlesEnabled
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Partículas 3D
                </button>
              </div>
              <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 cursor-pointer">
                <span className="text-slate-200 font-medium">Vento / Turbulência Procedural</span>
                <input
                  type="checkbox"
                  checked={windEnabled}
                  onChange={(e) => setWindEnabled(e.target.checked)}
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="flex justify-between text-slate-400">
                  <span>Intensidade do Vento</span>
                  <span className="font-mono text-cyan-300">{windStrength.toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  min={0.05}
                  max={1.5}
                  step={0.05}
                  value={windStrength}
                  onChange={(e) => setWindStrength(Number(e.target.value))}
                />
              </label>

              {/* Composição & Pós-FX (Bloom + Color Grading) */}
              <div className="pt-2 mt-1 border-t border-slate-800/90 flex flex-col gap-2">
                <span className="text-[11px] font-semibold text-pink-300">
                  Composição &amp; Pós-FX (Bloom / Color Grading)
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBloomEnabled((v) => !v)}
                    className={`px-2 py-1.5 rounded-md border text-[11px] font-semibold cursor-pointer transition-colors ${
                      bloomEnabled
                        ? 'bg-pink-600 border-pink-500 text-white'
                        : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    Bloom / Glow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGradeContrast(1.0);
                      setGradeSaturation(1.0);
                      setGradeBrightness(1.0);
                      setGradeHueDeg(0);
                    }}
                    className="px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-slate-600 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                  >
                    Resetar Grading
                  </button>
                </div>
                {bloomEnabled && (
                  <label className="flex flex-col gap-0.5">
                    <span className="flex justify-between text-slate-400">
                      <span>Força do Bloom</span>
                      <span className="font-mono text-pink-300">{bloomStrength.toFixed(2)}</span>
                    </span>
                    <input
                      type="range"
                      min={0.05}
                      max={2.0}
                      step={0.05}
                      value={bloomStrength}
                      onChange={(e) => setBloomStrength(Number(e.target.value))}
                    />
                  </label>
                )}
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setGradeContrast(1.16);
                      setGradeSaturation(1.22);
                      setGradeBrightness(1.02);
                      setGradeHueDeg(-6);
                    }}
                    className="px-1.5 py-1 rounded bg-[#0D1017] border border-slate-800 hover:border-orange-500 text-[10px] text-slate-200 cursor-pointer"
                  >
                    Cinema
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGradeContrast(1.3);
                      setGradeSaturation(0);
                      setGradeBrightness(1.05);
                      setGradeHueDeg(0);
                    }}
                    className="px-1.5 py-1 rounded bg-[#0D1017] border border-slate-800 hover:border-slate-400 text-[10px] text-slate-200 cursor-pointer"
                  >
                    Noir B&amp;W
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGradeContrast(1.2);
                      setGradeSaturation(1.45);
                      setGradeBrightness(1.04);
                      setGradeHueDeg(18);
                    }}
                    className="px-1.5 py-1 rounded bg-[#0D1017] border border-slate-800 hover:border-pink-500 text-[10px] text-slate-200 cursor-pointer"
                  >
                    Cyberpunk
                  </button>
                </div>
                <label className="flex flex-col gap-0.5">
                  <span className="flex justify-between text-slate-400">
                    <span>Contraste</span>
                    <span className="font-mono text-slate-200">{Math.round(gradeContrast * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.02}
                    value={gradeContrast}
                    onChange={(e) => setGradeContrast(Number(e.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="flex justify-between text-slate-400">
                    <span>Saturação</span>
                    <span className="font-mono text-slate-200">{Math.round(gradeSaturation * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1.8}
                    step={0.02}
                    value={gradeSaturation}
                    onChange={(e) => setGradeSaturation(Number(e.target.value))}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="flex justify-between text-slate-400">
                    <span>Brilho</span>
                    <span className="font-mono text-slate-200">{Math.round(gradeBrightness * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.5}
                    step={0.02}
                    value={gradeBrightness}
                    onChange={(e) => setGradeBrightness(Number(e.target.value))}
                  />
                </label>
              </div>
            </PipelineStageCard>

            {/* 10. LIGHTS */}
            <PipelineStageCard
              title="10. LIGHTS"
              description="Configurar iluminação da cena, HDRI e renderização PNG."
              icon={<Sun className="w-4 h-4 text-amber-400" />}
              expanded={focusedStage === 'stage10' || openSections.stage10}
              hidden={Boolean(focusedStage && focusedStage !== 'stage10')}
              standalone={focusedStage === 'stage10'}
              onToggle={() => toggleSection('stage10')}
            >
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setBloomEnabled((v) => !v)}
                  className={`flex-1 px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                    bloomEnabled
                      ? 'bg-orange-600/20 border-orange-500 text-orange-200'
                      : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  Bloom Pós-FX: {bloomEnabled ? 'On' : 'Off'}
                </button>
              </div>
              {bloomEnabled && (
                <label className="flex flex-col gap-1">
                  <span className="flex justify-between text-slate-400">
                    <span>Força Bloom</span>
                    <span className="font-mono text-slate-200 tabular-nums">
                      {bloomStrength.toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={0.1}
                    max={2}
                    step={0.05}
                    value={bloomStrength}
                    onChange={(e) => setBloomStrength(Number(e.target.value))}
                  />
                </label>
              )}

              <button
                type="button"
                aria-expanded={showLightingPanel}
                onClick={() => setShowLightingPanel((v) => !v)}
                className={`w-full inline-flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border font-semibold cursor-pointer ${
                  showLightingPanel
                    ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                    : 'bg-[#0D1017] border-slate-700 text-slate-200 hover:text-white'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Luzes &amp; Render PNG</span>
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-150 ${
                    showLightingPanel ? 'rotate-180 text-amber-300' : 'text-slate-400'
                  }`}
                />
              </button>

              {showLightingPanel && (
                <LightingRenderPanel
                  lights={studioLights}
                  newLightType={newLightType}
                  onNewLightTypeChange={setNewLightType}
                  onAddLight={() => {
                    const labels: Record<StudioLightType, string> = {
                      dir: 'Direcional',
                      point: 'Pontual',
                      spot: 'Spot',
                      amb: 'Ambiente',
                    };
                    const count = studioLights.length + 1;
                    setStudioLights((prev) => [
                      ...prev,
                      {
                        id: `light_${Date.now()}_${count}`,
                        name: `${labels[newLightType]} ${count}`,
                        type: newLightType,
                        color: '#ffffff',
                        intensity: newLightType === 'point' || newLightType === 'spot' ? 18 : 1.8,
                        position: [2.2, 2.8, 2.2],
                      },
                    ]);
                  }}
                  onApplyThreePointPreset={() =>
                    setStudioLights([
                      {
                        id: 'key_3pt',
                        name: 'Key',
                        type: 'dir',
                        color: '#fff3e0',
                        intensity: 2.2,
                        position: [2.6, 3.8, 2.8],
                      },
                      {
                        id: 'fill_3pt',
                        name: 'Fill',
                        type: 'dir',
                        color: '#bae6fd',
                        intensity: 1.0,
                        position: [-2.8, 1.8, 2.0],
                      },
                      {
                        id: 'rim_3pt',
                        name: 'Rim',
                        type: 'dir',
                        color: '#fdba74',
                        intensity: 1.6,
                        position: [-1.4, 2.6, -2.8],
                      },
                    ])
                  }
                  onUpdateLight={(id, patch) =>
                    setStudioLights((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
                  }
                  onRemoveLight={(id) => setStudioLights((prev) => prev.filter((l) => l.id !== id))}
                  renderResolution={renderResolution}
                  toneMapping={toneMapping}
                  exposure={exposure}
                  transparentBg={transparentBg}
                  onRenderResolutionChange={setRenderResolution}
                  onToneMappingChange={setToneMapping}
                  onExposureChange={setExposure}
                  onTransparentBgChange={setTransparentBg}
                  onRenderPng={() => renderStudioPngRef.current?.()}
                />
              )}

              <HdriEnvironmentPanel
                hdriId={hdriId}
                customHdriName={customHdriName}
                envIntensity={envIntensity}
                envRotationDeg={envRotationDeg}
                exposure={exposure}
                showHdriBg={showHdriBg}
                onSelectHdri={(id) => {
                  setHdriId(id);
                  if (id !== 'custom') setCustomHdriName(null);
                  selectHdriRef.current?.(id);
                }}
                onUploadHdriClick={() => hdriFileInputRef.current?.click()}
                onEnvIntensityChange={setEnvIntensity}
                onEnvRotationChange={setEnvRotationDeg}
                onExposureChange={setExposure}
                onShowHdriBgChange={setShowHdriBg}
              />
            </PipelineStageCard>



            {/* 12. GEOMETRY NODES */}
            <PipelineStageCard
              title="8. GEOMETRY NODES"
              description="MoGraph Cloner, efetores procedurais, operações booleanas CSG e efeitos."
              icon={<Workflow className="w-4 h-4 text-purple-400" />}
              expanded={focusedStage === 'stage12' || openSections.stage12}
              hidden={Boolean(focusedStage && focusedStage !== 'stage12')}
              standalone={focusedStage === 'stage12'}
              onToggle={() => toggleSection('stage12')}
            >
              <MoGraphPanel
                config={mographConfig}
                onChange={(patch) => {
                  const next = { ...mographConfig, ...patch };
                  setMographConfig(next);
                  mographConfigRef.current = next;
                  if (next.active && (patch.count !== undefined || patch.spacing !== undefined || patch.clonerMode !== undefined)) {
                    applyMoGraphRef.current?.();
                  }
                }}
                onApply={() => applyMoGraphRef.current?.()}
                onClear={() => clearMoGraphRef.current?.()}
              />
              <SplineDesignPanel
                section="geometry_nodes"
                wrapperless
                playMode={playMode}
                onTogglePlayMode={setPlayMode}
                physicsActive={physicsActive}
                onTogglePhysicsActive={() => setPhysicsActive((v) => !v)}
                bloomEnabled={bloomEnabled}
                onToggleBloom={() => setBloomEnabled((v) => !v)}
                bloomStrength={bloomStrength}
                onBloomStrengthChange={setBloomStrength}
                toolMode={toolMode}
                onSelectToolMode={setToolMode}
                onAddPrimitive={(kind) => addPrimitiveRef.current?.(kind)}
                onApplyTemplate={(tpl) => applyTemplateRef.current?.(tpl)}
                onRunBoolean={(op) => runBooleanRef.current?.(op)}
                onRunGeoArray={() => runGeoArrayRef.current?.()}
                selectedObject={selectedObjectInspector}
                onUpdateTransform={(g, i, v) => updateObjectTransformRef.current?.(g, i, v)}
                onUpdateObjectMaterial={(patch) => updateObjectMaterialRef.current?.(patch)}
                onUpdateInteraction={(interaction) => updateObjectInteractionRef.current?.(interaction)}
                onToggleObjectPhysics={(en) => toggleObjectPhysicsRef.current?.(en)}
                onUploadVideoTexture={() => videoFileInputRef.current?.click()}
                onDuplicateSelected={() => duplicateSelectedRef.current?.()}
                onDeleteSelected={() => deleteSelectedRef.current?.()}
                onFocusSelected={() => {
                  if (selectedObjectInspector) {
                    focusMeshByIdRef.current?.(selectedObjectInspector.id);
                  } else {
                    frameSceneRef.current?.();
                  }
                }}
                hideDefaultBase={hideDefaultBase}
                onToggleHideDefaultBase={() => setHideDefaultBase((v) => !v)}
                primitiveCount={primitiveCount}
                editableMeshCount={sceneMetrics.meshes}
              />
            </PipelineStageCard>

            {/* 13. CAMERA SETUP */}
            <PipelineStageCard
              title="9. CÂMERA"
              description="Configurar ângulos de câmera, enquadramento e movimento."
              icon={<Camera className="w-4 h-4 text-sky-400" />}
              expanded={focusedStage === 'stage13' || openSections.stage13}
              hidden={Boolean(focusedStage && focusedStage !== 'stage13')}
              standalone={focusedStage === 'stage13'}
              onToggle={() => toggleSection('stage13')}
              badgeText={`${CAMERA_PRESETS[activePreset].label} · ${cameraLensMm}mm`}
            >
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Ângulo de Câmera</span>
                <div className="relative">
                  <select
                    value={activePreset}
                    onChange={(e) => handleSelectPreset(e.target.value as CameraPreset)}
                    className="w-full appearance-none pl-7 pr-7 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-[11px] font-medium text-slate-100 cursor-pointer focus:outline-none focus:border-orange-500"
                  >
                    {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => (
                      <option key={key} value={key}>
                        {CAMERA_PRESETS[key].label}
                      </option>
                    ))}
                  </select>
                  <Camera className="pointer-events-none w-3.5 h-3.5 text-sky-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <ChevronDown className="pointer-events-none w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" />
                </div>
              </label>

              <label className="flex flex-col gap-1">
                <span className="flex justify-between text-slate-400">
                  <span>Distância Focal (cam.data.lens)</span>
                  <span className="font-mono text-sky-300 tabular-nums">{cameraLensMm}mm</span>
                </span>
                <input
                  type="range"
                  min={18}
                  max={120}
                  step={1}
                  value={cameraLensMm}
                  onChange={(e) => setCameraLensMm(Number(e.target.value))}
                />
                <div className="grid grid-cols-4 gap-1 pt-0.5">
                  {[24, 35, 50, 85].map((mm) => (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => setCameraLensMm(mm)}
                      className={`px-1 py-1 rounded border text-[10px] font-mono cursor-pointer ${
                        cameraLensMm === mm
                          ? 'bg-sky-600/25 border-sky-500 text-sky-200'
                          : 'bg-[#0D1017] border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mm}mm
                    </button>
                  ))}
                </div>
              </label>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => frameSceneRef.current?.()}
                  title="Enquadrar modelo (Tecla F)"
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 cursor-pointer"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>Enquadrar (F)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPreset('q34');
                    setCameraLensMm(50);
                  }}
                  title="Resetar Câmera"
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Resetar</span>
                </button>
              </div>
            </PipelineStageCard>

            {/* 14. EXPORTAR */}
            <PipelineStageCard
              title="10. EXPORTAR"
              description="Exportar o projeto final em .glb, .gltf, pacote ZIP e código Web 3D (React / Three.js)."
              icon={<Archive className="w-4 h-4 text-emerald-400" />}
              expanded={focusedStage === 'stage14' || openSections.stage14}
              hidden={Boolean(focusedStage && focusedStage !== 'stage14')}
              standalone={focusedStage === 'stage14'}
              onToggle={() => toggleSection('stage14')}
              badgeText="GLB · ZIP"
            >
              <button
                type="button"
                disabled={isSavingProject || isLoadingModel}
                onClick={() => void saveProjectRef.current?.(false)}
                title="Salvar projeto no navegador para continuar depois sem perder edições (Ctrl+S)"
                className="w-full inline-flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-md font-semibold bg-sky-600/20 border border-sky-500/40 text-sky-200 hover:bg-sky-600 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingProject ? 'Salvando...' : 'Salvar Projeto (Ctrl+S)'}</span>
                </span>
                {lastSavedLabel && (
                  <span className="text-[10px] font-mono opacity-85">{lastSavedLabel}</span>
                )}
              </button>
              <button
                type="button"
                disabled={isLoadingModel || isExporting}
                onClick={() => exportZipRef.current?.()}
                title="Exportar pacote ZIP completo com GLB, glTF, 5 mapas PBR e UV Layout"
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md font-semibold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Exportando pacote...' : 'Exportar ZIP Completo'}</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  disabled={isLoadingModel || isExporting}
                  onClick={() => exportModelRef.current?.('glb')}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-emerald-500/60 font-medium text-slate-200 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar .glb</span>
                </button>
                <button
                  type="button"
                  disabled={isLoadingModel || isExporting}
                  onClick={() => exportModelRef.current?.('gltf')}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500/60 font-medium text-slate-200 disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exportar .gltf</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setDriveModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-sky-600/20 border border-sky-500/40 hover:bg-sky-600 text-sky-200 hover:text-white font-semibold transition-colors cursor-pointer"
              >
                <Cloud className="w-3.5 h-3.5" />
                <span>Sincronizar com Google Drive</span>
              </button>
              <button
                type="button"
                onClick={() => openCodeExportRef.current?.()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500 text-slate-200 hover:text-white font-medium transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Exportar Código Web (React / Three.js)</span>
              </button>
            </PipelineStageCard>
          </div>
        </aside>
      )}

      {/* Right Column: 3D Viewport Area + Docked ActionForge Timeline Below */}
      <div className="order-2 flex-1 min-w-0 h-full flex flex-col overflow-hidden">
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {/* Dedicated WebGL Mount Container */}
        <div
          ref={mountRef}
          style={{
            filter:
              gradeContrast !== 1 || gradeSaturation !== 1 || gradeBrightness !== 1 || gradeHueDeg !== 0
                ? `contrast(${gradeContrast}) saturate(${gradeSaturation}) brightness(${gradeBrightness}) hue-rotate(${gradeHueDeg}deg)`
                : undefined,
          }}
          className={`w-full h-full min-h-[360px] touch-none ${
            toolMode === 'paint' ||
            toolMode === 'sculpt_push' ||
            toolMode === 'sculpt_pull' ||
            toolMode === 'sculpt_smooth'
              ? 'cursor-crosshair'
              : toolMode === 'assign_mat'
              ? 'cursor-cell'
              : ''
          }`}
        />

        {isEditModeActive && (
          <div
            role="status"
            className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-orange-500/90 text-slate-950 text-[11px] font-semibold shadow-lg whitespace-nowrap"
          >
            Modo de Edição Ativo — Pressione ESC para voltar à câmera
          </div>
        )}

        {/* 3D Interactive Camera Orientation Gizmo (Top-Right, below floating toolbar) */}
        {!webglError && (
          <div className="hidden sm:block absolute top-16 right-3 z-20">
            <CameraOrientationGizmo
              cameraQuaternion={cameraQuat}
              onSelectPreset={handleGizmoCameraPreset}
            />
          </div>
        )}

        {webglError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0D1017]/95 p-6 text-center">
            <div className="text-sm font-semibold text-red-300">
              Não foi possível iniciar a Viewport 3D (WebGL)
            </div>
            <div className="max-w-md text-xs text-slate-400 leading-relaxed">{webglError}</div>
            <button
              type="button"
              onClick={() => setRetryWebglNonce((n) => n + 1)}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        )}

        {contextLost && !webglError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0D1017] p-6 text-center text-slate-300 text-sm">
            Contexto WebGL pausado. Recarregue a janela para restaurar a visualização 3D.
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-4 z-20 rounded-2xl border-2 border-dashed border-orange-500 bg-[#0D1017]/80 flex flex-col items-center justify-center gap-2 p-4 text-center">
            <Upload className="w-8 h-8 text-orange-400" />
            <div className="text-base font-semibold text-white">Solte seu arquivo .glb, .gltf ou .zip aqui</div>
            <div className="text-xs text-slate-400">
              Suporte a pacotes .zip, compressão Draco, KTX2 e Meshopt
            </div>
          </div>
        )}

        {/* Minimal Top-Left Viewport Readout + Expand Toggle (when sidebar is hidden) */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-5 z-10 flex flex-col gap-1.5 max-w-[calc(100%-1.5rem)] sm:max-w-[calc(100%-2.5rem)]">
          {!dockExpanded && (
            <div>
              <button
                type="button"
                onClick={() => setDockExpanded(true)}
                className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-0 px-3.5 py-2 sm:px-3 sm:py-1.5 rounded-lg bg-[#141923]/92 backdrop-blur-md border border-slate-700/80 hover:border-slate-500 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer shadow-lg"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>Mostrar Inspetor</span>
              </button>
            </div>
          )}

          <div className="pointer-events-none text-[11px] sm:text-xs font-medium text-slate-400 line-clamp-2 sm:line-clamp-none">
            {loadedAsset
              ? `${loadedAsset.meshCount} malha(s) · ${loadedAsset.triCount.toLocaleString('pt-BR')} triângulos · ${loadedAsset.matCount} material(is) · Rig: ${RIG_PRESET_DEFINITIONS[config.rigPreset].label}${activeProceduralLabel ? ` · Procedural: ${activeProceduralLabel}` : ''}`
              : `Cena 3D · Rig ${RIG_PRESET_DEFINITIONS[config.rigPreset].label}${activeProceduralLabel ? ` · Procedural: ${activeProceduralLabel}` : ''}`}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="pointer-events-none text-xs sm:text-sm font-semibold text-slate-100 tabular-nums truncate max-w-[70vw] sm:max-w-none">
              {loadedAsset ? (
                <span>{loadedAsset.name}</span>
              ) : (
                <span>
                  Frame {String(currentFrame).padStart(2, '0')} / {config.animEndFrame} · Atlas {config.textureResolution}px
                </span>
              )}
            </div>
            {loadedAsset && loadedAsset.name !== 'DamagedHelmet.glb' && (
              <button
                type="button"
                onClick={() => resetAssetRef.current?.()}
                className="inline-flex items-center gap-1 min-h-[36px] sm:min-h-0 px-2.5 py-1 rounded-md bg-[#161B26] border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Helmet</span>
              </button>
            )}
          </div>
          {isLoadingModel && (
            <div className="text-xs text-orange-400 font-medium">Carregando modelo GLB/glTF...</div>
          )}
          {exportStatus && (
            <div className="text-xs text-emerald-400 font-medium">{exportStatus}</div>
          )}
          {loadError && (
            <div className="max-w-md rounded-lg bg-red-950/90 border border-red-700/70 px-3 py-2 text-xs text-red-200 leading-relaxed">
              {loadError}
            </div>
          )}
        </div>

        {/* Barra Rápida de Edição & Exclusão (Delete) do Objeto Selecionado */}
        {!playMode && selectedObjectInspector && (
          <div
            role="toolbar"
            aria-label="Edição rápida do objeto selecionado"
            className="hidden sm:flex items-center gap-1.5 absolute top-3 right-3 sm:top-4 sm:right-4 z-10 px-2 py-1.5 rounded-xl bg-[#141923]/92 backdrop-blur-md border border-slate-700/85 shadow-xl text-[11px]"
          >
            <span className="max-w-[130px] truncate font-semibold text-orange-300 px-1.5">
              {selectedObjectInspector.name}
            </span>
            <span className="h-4 w-px bg-slate-700/80" />
            <button
              type="button"
              title="Orbitar câmera (V)"
              onClick={() => setToolMode('orbit')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                toolMode === 'orbit'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MousePointer2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Mover objeto (G / W)"
              onClick={() => setToolMode('translate')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                toolMode === 'translate'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              <span>Mover</span>
            </button>
            <button
              type="button"
              title="Girar objeto (E)"
              onClick={() => setToolMode('rotate')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                toolMode === 'rotate'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Girar</span>
            </button>
            <button
              type="button"
              title="Escalar objeto (R)"
              onClick={() => setToolMode('scale')}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                toolMode === 'scale'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Escalar</span>
            </button>
            <span className="h-4 w-px bg-slate-700/80" />
            <button
              type="button"
              title="Duplicar selecionado (Ctrl+D)"
              onClick={() => duplicateSelectedRef.current?.()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              type="button"
              title="Excluir selecionado (Tecla Delete)"
              onClick={() => deleteSelectedRef.current?.()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white cursor-pointer transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Del</span>
            </button>
          </div>
        )}

        {/* Pro Floating 3D Studio Bar (Desktop Bottom-Center) */}
        {!playMode && (
          <div
            role="toolbar"
            aria-label="Barra Pro da Viewport 3D"
            className="hidden md:flex items-center gap-1 absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-2 py-1.5 rounded-xl bg-[#141923]/92 backdrop-blur-md border border-slate-700/85 shadow-2xl text-[11px] max-w-[calc(100%-2rem)] overflow-x-auto no-scrollbar"
          >
            {(
              [
                { id: 'pbr', label: 'PBR' },
                { id: 'matcap_clay', label: 'Argila' },
                { id: 'matcap_redwax', label: 'RedWax' },
                { id: 'matcap_chrome', label: 'Cromo' },
                { id: 'normals', label: 'Normais' },
                { id: 'uv_checker', label: 'UV' },
                { id: 'cel_borde', label: 'Cel' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setShadingMode(mode.id)}
                className={`px-2 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  shadingMode === mode.id
                    ? 'bg-orange-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {mode.label}
              </button>
            ))}
            <span className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={() => setWireframeMode((v) => !v)}
              title="Alternar Wireframe"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                wireframeMode
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Wire</span>
            </button>
            <button
              type="button"
              onClick={() => bakeAoCurvatureRef.current?.()}
              title="Gerar Bake de Ambient Occlusion & Curvatura (desgaste/cavidades)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-violet-600/20 border border-violet-500/40 text-violet-200 hover:bg-violet-600 hover:text-white font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Bake AO</span>
            </button>
            <button
              type="button"
              onClick={() => setTurntableEnabled((v) => !v)}
              title="Girar modelo 360° (Turntable Showcase)"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                turntableEnabled
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <RotateCw className={`w-3.5 h-3.5 ${turntableEnabled ? 'animate-spin' : ''}`} />
              <span>360°</span>
            </button>
            <button
              type="button"
              onClick={() => dropToFloorRef.current?.()}
              title="Apoiar modelo/objeto selecionado exatamente no chão (Y = 0)"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Y=0</span>
            </button>
            <span className="h-4 w-px bg-slate-700/80 mx-0.5 shrink-0" />
            <button
              type="button"
              onClick={() => undoSceneRef.current?.()}
              title="Desfazer (Ctrl+Z)"
              className="inline-flex items-center px-1.5 py-1 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => redoSceneRef.current?.()}
              title="Refazer (Ctrl+Y)"
              className="inline-flex items-center px-1.5 py-1 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => frameSceneRef.current?.()}
              title="Enquadrar modelo (F)"
              className="inline-flex items-center px-1.5 py-1 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            </button>
            <button
              type="button"
              onClick={() => renderStudioPngRef.current?.()}
              title="Capturar Render PNG de alta resolução"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer whitespace-nowrap"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>PNG</span>
            </button>
          </div>
        )}

        {/* Mobile Bottom Frosted Quick-Action Bar (Thumb Zone) */}
        {!dockExpanded && !showMeshDrawer && (
          <div
            role="toolbar"
            aria-label="Atalhos rápidos da Viewport"
            className="md:hidden absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 p-1 rounded-xl bg-[#141923]/90 backdrop-blur-md border border-slate-700/80 shadow-xl max-w-[calc(100%-1.5rem)]"
          >
            <button
              type="button"
              disabled={isLoadingModel || isExporting}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>GLB</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              aria-label={isPlaying ? 'Pausar animação' : 'Reproduzir animação'}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-[#0D1017]/90 border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-white cursor-pointer whitespace-nowrap"
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span>{isPlaying ? 'Pausar' : 'Animar'}</span>
            </button>
            <button
              type="button"
              onClick={() => frameSceneRef.current?.()}
              aria-label="Enquadrar modelo"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-[#0D1017]/90 border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-white cursor-pointer whitespace-nowrap"
            >
              <Maximize2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Enquadrar</span>
            </button>
            <button
              type="button"
              onClick={() => setShowMeshDrawer(true)}
              aria-label="Hierarquia de malhas"
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg bg-[#0D1017]/90 border border-slate-700/80 text-xs font-medium text-slate-200 hover:text-white cursor-pointer whitespace-nowrap"
            >
              <Layers className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>Malhas</span>
            </button>
          </div>
        )}

        <MeshHierarchyDrawer
          open={showMeshDrawer}
          onClose={() => setShowMeshDrawer(false)}
          meshes={meshList}
          selectedMeshId={selectedMeshId}
          metrics={sceneMetrics}
          onSelectMesh={(id) => {
            setSelectedMeshId(id);
            selectObjectByIdRef.current?.(id);
          }}
          onFocusMesh={(id) => focusMeshByIdRef.current?.(id)}
          onToggleMeshVisibility={(id) => toggleMeshVisibilityRef.current?.(id)}
          onShowAllMeshes={() => showAllMeshesRef.current?.()}
          onDeleteMesh={(id) => deleteMeshByIdRef.current?.(id)}
        />
      </div>

      {/* ActionForge Bottom Timeline Docked Below the 3D Scene (Strips | Graph | Keys) */}
      {(focusedStage === 'stage7' || focusedStage === 'stage8' || animPrinciples.enabled) && (
        <ActionForgeTimeline
          activeClip={ACTIONFORGE_CLIPS.find((c) => c.id === activeClipId) || null}
          isPlaying={animPrinciples.enabled}
          speed={animPrinciples.timingSpeed}
          onTogglePlay={() => {
            const nextEnabled = !animPrinciples.enabled;
            const fallbackClip: ActionForgeClipItem =
              ACTIONFORGE_CLIPS.find((c) => c.id === activeClipId) ||
              ACTIONFORGE_CLIPS.find((c) => c.label === 'Walk Loop') ||
              ACTIONFORGE_CLIPS[0];
            const next = {
              ...animPrinciples,
              enabled: nextEnabled,
              actionCycle: fallbackClip.cycle,
              rootMotion: animPrinciples.rootMotion !== false,
            };
            setAnimPrinciples(next);
            animPrinciplesRef.current = next;
            if (nextEnabled && !activeClipId) setActiveClipId(fallbackClip.id);
          }}
          onStop={() => {
            const next = { ...animPrinciples, enabled: false };
            setAnimPrinciples(next);
            animPrinciplesRef.current = next;
          }}
          onSelectClip={(clip) => {
            const next = {
              ...DEFAULT_ANIMATION_PRINCIPLES,
              enabled: true,
              actionCycle: clip.cycle,
              timingSpeed: clip.speed,
              exaggeration: clip.exag,
              rootMotion: animPrinciples.rootMotion !== false,
              squashStretch: 0,
              anticipation: 0,
              arcsStrength: 0,
              solidAsymmetry: 0,
            };
            setAnimPrinciples(next);
            animPrinciplesRef.current = next;
            setActiveClipId(clip.id);
          }}
          onSpeedChange={(spd) => {
            const next = { ...animPrinciples, timingSpeed: spd };
            setAnimPrinciples(next);
            animPrinciplesRef.current = next;
          }}
        />
      )}
      </div>

      {verificationReport && (
        <FileVerificationModal
          report={verificationReport}
          onClose={() => setVerificationReport(null)}
          onReportChange={setVerificationReport}
          onVerifyCurrentScene={() => verifyCurrentSceneRef.current?.()}
        />
      )}

      <SplineCodeExportModal
        open={codeExportModalOpen}
        threeCode={exportedThreeCode}
        reactCode={exportedReactCode}
        onClose={() => setCodeExportModalOpen(false)}
      />

      <GoogleDriveModal
        open={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        defaultFileName={loadedAsset?.name || 'AlexDesign_Scene.glb'}
        onImportFileFromDrive={(file) => triggerImportFiles([file])}
        onExportCurrentGlbBlob={async () => (exportGlbBlobRef.current ? exportGlbBlobRef.current() : null)}
      />
    </div>
  );
};

