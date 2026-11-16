import React, { useEffect, useRef, useState } from 'react';
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
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Download,
  Eraser,
  Eye,
  Grid,
  ImagePlus,
  Layers,
  Maximize2,
  MousePointer2,
  Paintbrush,
  Palette,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Undo2,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import {
  RIG_PRESET_DEFINITIONS,
  RigPreset,
} from '../types/studioConfig';
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
import {
  MeshHierarchyDrawer,
  SceneMeshListItem,
  SceneMetricsSummary,
} from './MeshHierarchyDrawer';
import { LightingRenderPanel } from './LightingRenderPanel';
import { HdriEnvironmentPanel } from './HdriEnvironmentPanel';
import { SplineDesignPanel } from './SplineDesignPanel';
import { SplineCodeExportModal } from './SplineCodeExportModal';

type ShadingMode = 'pbr' | 'uv_checker' | 'normals' | 'cel_borde';
type CameraPreset = 'q34' | 'front' | 'side' | 'back';
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
}

export interface ImportedUvMesh {
  name: string;
  uvEdges: Float32Array;
  uv1Edges?: Float32Array;
  triCount: number;
  textures?: ImportedAtlasTextures;
  materialColor?: string;
}

export interface ViewportSceneConfig {
  rigPreset: RigPreset;
  shaderPreset: 'PBR_PRINCIPLED' | 'PBR_CEL_OUTLINE' | 'ANIME_TOON';
  normalStrength: number;
  outlineThickness: number;
  animEndFrame: number;
  textureResolution: 1024 | 2048 | 4096;
}

interface Viewport3DProps {
  config: ViewportSceneConfig;
  onConfigChange: (patch: Partial<ViewportSceneConfig>) => void;
  onImportedUvs?: (meshes: ImportedUvMesh[] | null) => void;
  proceduralMaterialRequest?: { params: ProceduralPbrParams; nonce: number } | null;
  substanceTextureRequest?: SubstanceTextureSetRequest | null;
  pendingImportFiles?: File[] | null;
  onConsumedPendingImport?: () => void;
  exportZipNonce?: number;
  autoUvNonce?: number;
  onExportStateChange?: (exporting: boolean) => void;
}

const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number]; label: string }> = {
  q34: { pos: [1.85, 1.45, 2.35], target: [0, 0.92, 0], label: '3/4' },
  front: { pos: [0, 1.05, 2.85], target: [0, 0.92, 0], label: 'Frontal' },
  side: { pos: [2.85, 1.05, 0], target: [0, 0.92, 0], label: 'Lateral' },
  back: { pos: [0, 1.05, -2.85], target: [0, 0.92, 0], label: 'Costas' },
};

const _camTargetPos = new THREE.Vector3();
const _camTargetLook = new THREE.Vector3();

function createUvCheckerTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cells = 8;
    const step = size / cells;
    for (let y = 0; y < cells; y++) {
      for (let x = 0; x < cells; x++) {
        const even = (x + y) % 2 === 0;
        ctx.fillStyle = even ? '#1e293b' : '#e2e8f0';
        ctx.fillRect(x * step, y * step, step, step);
        ctx.strokeStyle = even ? '#334155' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * step, y * step, step, step);

        ctx.fillStyle = even ? '#f97316' : '#0f172a';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = `${String.fromCharCode(65 + x)}${y + 1}`;
        ctx.fillText(label, x * step + step / 2, y * step + step / 2);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function createProceduralFabricNormalTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const weaveX = Math.sin(x * 0.65) * 24;
        const weaveY = Math.cos(y * 0.65) * 24;
        data[idx] = Math.max(0, Math.min(255, 128 + weaveX));
        data[idx + 1] = Math.max(0, Math.min(255, 128 + weaveY));
        data[idx + 2] = 248;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 6);
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0,0,0,0.65)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createToonGradient(): THREE.DataTexture {
  const colors = new Uint8Array([70, 175, 255]);
  const grad = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
  grad.minFilter = THREE.NearestFilter;
  grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  return grad;
}

function disposeMaterialTree(mat: THREE.Material) {
  const mapKeys = [
    'map',
    'normalMap',
    'roughnessMap',
    'metalnessMap',
    'aoMap',
    'emissiveMap',
    'alphaMap',
    'bumpMap',
    'displacementMap',
  ] as const;
  const record = mat as unknown as Record<string, unknown>;
  for (const key of mapKeys) {
    const tex = record[key];
    if (tex instanceof THREE.Texture) {
      tex.dispose();
    }
  }
  mat.dispose();
}

function extractTextureDataUrl(
  tex: THREE.Texture | null | undefined,
  cache: Map<THREE.Texture, string | null>
): string | null {
  if (!tex || !tex.image) return null;
  if (cache.has(tex)) return cache.get(tex) || null;
  try {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      cache.set(tex, null);
      return null;
    }
    ctx.save();
    // Align glTF flipY=false textures with Blender/UV bottom-left (1 - v) convention
    if (!tex.flipY) {
      ctx.translate(0, size);
      ctx.scale(1, -1);
    }
    ctx.drawImage(tex.image as CanvasImageSource, 0, 0, size, size);
    ctx.restore();
    const url = canvas.toDataURL('image/png');
    cache.set(tex, url);
    return url;
  } catch {
    cache.set(tex, null);
    return null;
  }
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  config,
  onConfigChange,
  onImportedUvs,
  proceduralMaterialRequest,
  substanceTextureRequest,
  pendingImportFiles,
  onConsumedPendingImport,
  exportZipNonce,
  autoUvNonce,
  onExportStateChange,
}) => {
  const onImportedUvsRef = useRef(onImportedUvs);
  onImportedUvsRef.current = onImportedUvs;
  const onExportStateChangeRef = useRef(onExportStateChange);
  onExportStateChangeRef.current = onExportStateChange;
  const mountRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);
  const pbrChannelInputRef = useRef<HTMLInputElement>(null);
  const hdriFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  const [shadingMode, setShadingMode] = useState<ShadingMode>(
    config.shaderPreset === 'PBR_PRINCIPLED' ? 'pbr' : 'cel_borde'
  );
  const [activePreset, setActivePreset] = useState<CameraPreset>('q34');
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(1);
  const [roughnessOverride, setRoughnessOverride] = useState(0.55);
  const [metalnessOverride, setMetalnessOverride] = useState(0.15);
  const [dockExpanded, setDockExpanded] = useState(true);
  const [openSections, setOpenSections] = useState<{
    file: boolean;
    view: boolean;
    anim: boolean;
    rig: boolean;
    tools: boolean;
    pbr: boolean;
  }>({
    file: true,
    view: false,
    anim: false,
    rig: false,
    tools: false,
    pbr: false,
  });
  const toggleSection = (key: keyof typeof openSections) => {
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
    fileName: 'Ativo Padrão',
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
  const [showHdriBg, setShowHdriBg] = useState(false);
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
  const [hideDefaultBase, setHideDefaultBase] = useState(false);
  const [primitiveCount, setPrimitiveCount] = useState(0);
  const [selectedObjectInspector, setSelectedObjectInspector] =
    useState<SelectedObjectInspector | null>(null);
  const [codeExportModalOpen, setCodeExportModalOpen] = useState(false);
  const [exportedThreeCode, setExportedThreeCode] = useState('');
  const [exportedReactCode, setExportedReactCode] = useState('');

  const loadedAssetNameRef = useRef<string | null>(null);
  loadedAssetNameRef.current = loadedAsset?.name ?? null;
  const exportStatusTimerRef = useRef<number | null>(null);

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
  const selectObjectByIdRef = useRef<((id: string | null) => void) | null>(null);
  const openCodeExportRef = useRef<(() => void) | null>(null);
  const syncSplineModeRef = useRef<(() => void) | null>(null);

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
    transformControls.addEventListener('dragging-changed', (ev) => {
      controls.enabled = !Boolean((ev as { value?: unknown }).value);
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

    // Composite articulated character asset (grounded bottom-center at y=0)
    const characterRoot = new THREE.Group();
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
      const def = RIG_PRESET_DEFINITIONS[preset] || RIG_PRESET_DEFINITIONS.HUMANOIDE;
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
    const uvCheckerFallbackMat = new THREE.MeshStandardMaterial({
      map: checkerTex,
      roughness: 0.65,
      metalness: 0.05,
    });

    // Uploaded GLB / glTF tracking
    interface UploadedMeshRecord {
      mesh: THREE.Mesh;
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
      uvCheckerFallbackMat.side = sideMode;
      uvCheckerFallbackMat.wireframe = wireMode;

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

        if (mode === 'cel_borde') {
          if (!(p.mesh.material instanceof THREE.MeshToonMaterial)) {
            if (p.mesh.material !== normalMat && !Array.isArray(p.mesh.material)) {
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
          if (p.mesh.material !== normalMat && !Array.isArray(p.mesh.material)) {
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
              if (rec.pbrMaps.emissiveMap) {
                m.emissiveMap = rec.pbrMaps.emissiveMap;
                m.emissive.setHex(0xffffff);
              }
              if (rec.pbrMaps.alphaMap) {
                m.alphaMap = rec.pbrMaps.alphaMap;
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
      const t = ((frame - 1) / 59) * Math.PI * 2;
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
        fileName: loadedAssetNameRef.current || `Ativo_${RIG_PRESET_DEFINITIONS[stateRef.current.rigPreset].shortLabel}`,
        vertices: totalVertices,
        triangles: totalTriangles,
        meshes: items.length,
        materials: matSet.size,
        textures: texSet.size,
        dimensions,
        animations: uploadedGroup ? uploadedClips.length : 1,
      });
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

      if (templateId === 'character_rig') {
        setHideDefaultBase(false);
        stateRef.current.hideDefaultBase = false;
        setBloomEnabled(false);
        stateRef.current.bloomEnabled = false;
        setPlayMode(false);
        stateRef.current.playMode = false;
        applyMaterialSettings();
        refreshHierarchyState();
        frameSceneRef.current?.();
        showBriefStatus('Template aplicado: Estúdio Personagem');
        return;
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

    runBooleanRef.current = (op: BooleanOperation) => {
      if (studioPrimitives.length < 2) {
        setLoadError('Adicione pelo menos 2 formas 3D para aplicar operação booleana CSG.');
        return;
      }
      const bRec =
        getPrimitiveRecord(selectedSceneObject) && studioPrimitives[studioPrimitives.length - 1] !== getPrimitiveRecord(selectedSceneObject)
          ? studioPrimitives[studioPrimitives.length - 1]
          : studioPrimitives[studioPrimitives.length - 1];
      const aRec =
        getPrimitiveRecord(selectedSceneObject) && getPrimitiveRecord(selectedSceneObject) !== bRec
          ? getPrimitiveRecord(selectedSceneObject)!
          : studioPrimitives[studioPrimitives.length - 2];

      const result = performMeshBoolean(aRec.mesh, bRec.mesh, op);
      if (!result) {
        setLoadError('Não foi possível calcular a booleana CSG (malhas muito densas ou sem interseção).');
        return;
      }

      const opNames: Record<BooleanOperation, string> = {
        union: 'Uniao_CSG',
        subtract: 'Subtracao_CSG',
        intersect: 'Intersecao_CSG',
      };
      const baseMat = (aRec.mesh.material as THREE.MeshPhysicalMaterial).clone();
      const newMesh = new THREE.Mesh(result.geometry, baseMat);
      newMesh.name = `${opNames[op]}_${studioPrimitives.length + 1}`;
      newMesh.position.copy(result.center);
      newMesh.castShadow = !isSoftwareGl;
      newMesh.receiveShadow = !isSoftwareGl;

      selectThreeObject(null);
      [aRec, bRec].forEach((r) => {
        const idx = studioPrimitives.indexOf(r);
        if (idx >= 0) studioPrimitives.splice(idx, 1);
        disposePrimitiveRecord(r);
      });

      studioObjectsGroup.add(newMesh);
      const newRec: StudioPrimitiveRecord = {
        mesh: newMesh,
        kind: 'mesh',
        materialStyle: aRec.materialStyle,
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
      const mesh = selectedSceneObject as THREE.Mesh;
      const rec = getPrimitiveRecord(selectedSceneObject);
      if (rec && patch.materialStyle) rec.materialStyle = patch.materialStyle;

      if (!(mesh.material instanceof THREE.MeshPhysicalMaterial)) {
        const old = mesh.material;
        const std = Array.isArray(old) ? old[0] : old;
        const c = std instanceof THREE.MeshStandardMaterial ? std.color.getHex() : 0x38bdf8;
        mesh.material = new THREE.MeshPhysicalMaterial({ color: c });
      }
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const nextStyle = patch.materialStyle ?? rec?.materialStyle ?? 'physical';
      const nextColor = patch.color ?? `#${mat.color.getHexString()}`;
      applySplineStyleToPhysicalMaterial(mat, nextStyle, nextColor, {
        roughness: patch.materialStyle ? undefined : patch.roughness ?? mat.roughness,
        metalness: patch.materialStyle ? undefined : patch.metalness ?? mat.metalness,
        transmission: patch.materialStyle ? undefined : patch.transmission ?? mat.transmission,
        emissiveIntensity: patch.materialStyle ? undefined : patch.emissiveIntensity ?? mat.emissiveIntensity,
      });
      syncSelectedInspector();
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
      const targetMesh = (selectedSceneObject as THREE.Mesh | null) || studioPrimitives[0]?.mesh || null;
      if (!targetMesh || !(targetMesh as THREE.Mesh).isMesh) {
        setLoadError('Selecione ou crie uma forma 3D antes de aplicar uma textura de vídeo.');
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
      refreshHierarchyState();
      showBriefStatus(`Textura de vídeo aplicada: ${file.name}`);
    };

    duplicateSelectedRef.current = () => {
      const rec = getPrimitiveRecord(selectedSceneObject);
      if (!rec) {
        if (!selectedSceneObject) return;
        const targetObj = selectedSceneObject;
        const removedName = targetObj.name || 'Modelo da Cena';
        selectThreeObject(null);
        targetObj.visible = false;
        if (targetObj.parent) targetObj.parent.remove(targetObj);
        refreshHierarchyState();
        showBriefStatus(`Removido: ${removedName}`);
        return;
      }
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
    };

    deleteSelectedRef.current = () => {
      const rec = getPrimitiveRecord(selectedSceneObject);
      if (!rec) {
        if (!selectedSceneObject) return;
        const targetObj = selectedSceneObject;
        const removedName = targetObj.name || 'Modelo da Cena';
        selectThreeObject(null);
        targetObj.visible = false;
        if (targetObj.parent) targetObj.parent.remove(targetObj);
        refreshHierarchyState();
        showBriefStatus(`Removido: ${removedName}`);
        return;
      }
      const removedName = rec.mesh.name;
      selectThreeObject(null);
      const idx = studioPrimitives.indexOf(rec);
      if (idx >= 0) studioPrimitives.splice(idx, 1);
      disposePrimitiveRecord(rec);
      refreshHierarchyState();
      showBriefStatus(`Removido: ${removedName}`);
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
      containerCheck: ContainerCheckResult | null
    ) {
      disposeUploadedModel();
      activeObjectUrls = batchUrls;
      lastContainerCheck = containerCheck;

      const model = gltf.scene || new THREE.Group();
      model.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(model);
      if (!box.isEmpty()) {
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

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
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
          const origRoughness: number[] = [];
          const origMetalness: number[] = [];
          const origNormalScale: THREE.Vector2[] = [];
          const origColorHex: number[] = [];
          const origMap: (THREE.Texture | null)[] = [];
          const origRoughnessMap: (THREE.Texture | null)[] = [];
          const origMetalnessMap: (THREE.Texture | null)[] = [];
          const origNormalMap: (THREE.Texture | null)[] = [];
          const origAoMap: (THREE.Texture | null)[] = [];

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
            }
          }

          const texCache = new Map<THREE.Texture, string | null>();
          extractedUvs.push({
            name: mesh.name || `Malha_${meshCount}`,
            uvEdges: extractedEdges,
            uv1Edges: extractedUv1Edges,
            triCount: meshTris,
            materialColor: `#${(origColorHex[0] ?? 0xffffff).toString(16).padStart(6, '0')}`,
            textures: {
              baseColor: extractTextureDataUrl(origMap[0], texCache),
              roughness: extractTextureDataUrl(origRoughnessMap[0], texCache),
              metallic: extractTextureDataUrl(origMetalnessMap[0], texCache),
              normal: extractTextureDataUrl(origNormalMap[0], texCache),
              ao: extractTextureDataUrl(origAoMap[0], texCache),
            },
          });

          let outlineMesh: THREE.Mesh | null = null;
          if (!(mesh as THREE.SkinnedMesh).isSkinnedMesh && !(mesh as THREE.InstancedMesh).isInstancedMesh && geo) {
            outlineMesh = new THREE.Mesh(geo, outlineBaseMat);
            outlineMesh.scale.setScalar(1.02);
            outlineMesh.visible = false;
            mesh.add(outlineMesh);
          }

          uploadedRecords.push({
            mesh,
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
            customMap: null,
            pbrMaps: {},
            paintData: null,
            outlineMesh,
            toonMat: null,
          });
        }
      });

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
      setIsPlaying(uploadedClips.length > 0);
      setCurrentFrame(1);
      stateRef.current.frame = 1;
      stateRef.current.camTarget = 'q34';
      stateRef.current.camTransitioning = true;
      setActivePreset('q34');
      setIsLoadingModel(false);
    }

    loadFilesRef.current = async (fileList: FileList | File[]) => {
      const rawFiles = Array.from(fileList);
      if (rawFiles.length === 0) return;

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
      disposeUploadedModel();
      setHideDefaultBase(false);
      stateRef.current.hideDefaultBase = false;
      characterRoot.visible = true;
      onImportedUvsRef.current?.(null);
      loadedAssetNameRef.current = null;
      setLoadedAsset(null);
      setLoadError(null);
      setShowSkeleton(false);
      setIsPlaying(true);
      setCurrentFrame(1);
      stateRef.current.frame = 1;
      applyMaterialSettings();
      applyFramePose(1);
      refreshHierarchyState();
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
      const timeSec = ((frame - 1) / 59) * dur;
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
        (target === studioObjectsGroup ? 'Cena_Objetos_3D' : `Ativo Padrão · ${rigLabel}`);
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
      const texCache = new Map<THREE.Texture, string | null>();
      if (uploadedGroup && uploadedRecords.length > 0) {
        const synced: ImportedUvMesh[] = uploadedRecords.map((rec, idx) => {
          const { edges, uv1Edges, triCount } = extractUvEdgesFromMesh(rec.mesh);
          const baseTex = rec.paintData?.tex || rec.customMap || rec.origMap[0] || null;
          const roughTex = rec.pbrMaps.roughnessMap || rec.origRoughnessMap[0] || null;
          const metalTex = rec.pbrMaps.metalnessMap || rec.origMetalnessMap[0] || null;
          const normalTex = rec.pbrMaps.normalMap || rec.origNormalMap[0] || null;
          const aoTex = rec.pbrMaps.aoMap || rec.origAoMap[0] || null;
          return {
            name: rec.mesh.name || `Malha_${idx + 1}`,
            uvEdges: edges,
            uv1Edges,
            triCount,
            materialColor: `#${(rec.origColorHex[0] ?? 0xffffff).toString(16).padStart(6, '0')}`,
            textures: {
              baseColor: extractTextureDataUrl(baseTex, texCache),
              roughness: extractTextureDataUrl(roughTex, texCache),
              metallic: extractTextureDataUrl(metalTex, texCache),
              normal: extractTextureDataUrl(normalTex, texCache),
              ao: extractTextureDataUrl(aoTex, texCache),
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
            for (const rec of uploadedRecords) {
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

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerDownClient = { x: e.clientX, y: e.clientY };

      const mode = stateRef.current.toolMode;
      if (mode !== 'paint' && mode !== 'assign_mat') return;

      const hit = getRaycastHit(e);
      if (!hit) return;

      controls.enabled = false;
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
      if (stateRef.current.playMode && !isPointerPainting) {
        const hit = getRaycastHit(e);
        hoveredPlayMesh = hit ? hit.object : null;
        return;
      }
      if (!isPointerPainting || stateRef.current.toolMode !== 'paint') return;
      const hit = getRaycastHit(e);
      if (hit) {
        paintHit(hit);
      } else {
        lastPaintMesh = null;
        lastPaintUv = null;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
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
        if (dist < 5 && !transformControls.dragging && mode !== 'paint' && mode !== 'assign_mat') {
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
      const uvs = autoGenerateUvsForGroup(target);
      if (stateRef.current.shadingMode === 'uv_checker') {
        applyMaterialSettings();
      }
      syncInspectorUvs(true);
      showBriefStatus(`UV Mapping automático gerado em [0, 1] (${uvs.length} malha(s))`);
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
    };
    syncRendererSettingsRef.current = syncRendererSettings;

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

    function tick() {
      if (disposed) return;
      try {
        const delta = Math.min(clock.getDelta(), 0.1);
        const isVisible = syncViewportSize();

        if (isVisible) {
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

          if (uploadedGroup) {
            if (uploadedMixer && uploadedClips.length > 0 && stateRef.current.isPlaying) {
              uploadedMixer.update(delta);
              const action = uploadedActions[activeUploadedClipIdx];
              const dur = uploadedClips[activeUploadedClipIdx]?.duration || 1;
              if (action && dur > 0) {
                const norm = (action.time % dur) / dur;
                const nextFrame = Math.max(1, Math.min(60, Math.round(norm * 59) + 1));
                if (nextFrame !== lastReportedFrame) {
                  lastReportedFrame = nextFrame;
                  setCurrentFrame(nextFrame);
                }
              }
            }
          } else if (stateRef.current.isPlaying && !stateRef.current.hideDefaultBase) {
            stateRef.current.frame += delta * 24;
            if (stateRef.current.frame > 60) stateRef.current.frame = 1;
            const rounded = Math.round(stateRef.current.frame);
            applyFramePose(stateRef.current.frame);
            if (rounded !== lastReportedFrame) {
              lastReportedFrame = rounded;
              setCurrentFrame(rounded);
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

    requestRenderRef.current = () => {
      if (!disposed) {
        syncViewportSize();
        if (stateRef.current.bloomEnabled && composer) {
          composer.render();
        } else {
          activeRenderer.render(scene, camera);
        }
      }
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

    tick();

    cleanupFn = () => {
      disposed = true;
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
  }, [toneMapping, exposure, envIntensity, envRotationDeg, showHdriBg]);

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
      } else if (e.code === 'Delete' || e.code === 'Backspace' || e.code === 'KeyX') {
        deleteSelectedRef.current?.();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault();
        undoPaintRef.current?.();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [verificationReport]);

  const handleSelectPreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    stateRef.current.camTarget = preset;
    stateRef.current.camTransitioning = true;
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
    if (!loadFilesRef.current) {
      setLoadError('A Viewport 3D não foi inicializada (WebGL indisponível). Recarregue a janela ou tente novamente.');
      return;
    }
    loadFilesRef.current(files);
  };

  return (
    <div
      className="relative flex-1 w-full h-full min-h-[520px] bg-[#0D1017] flex overflow-hidden select-none"
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

      {/* Collapsible Left Studio Sidebar (Keeps 3D Viewport 100% Free) */}
      {dockExpanded && (
        <aside
          aria-label="Comandos do Estúdio"
          className="max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:z-20 max-sm:shadow-2xl sm:relative w-[260px] md:w-[280px] lg:w-[296px] shrink-0 h-full border-r border-slate-800/90 bg-[#10141D] flex flex-col z-10"
        >
          <div className="p-2.5 border-b border-slate-800/80 shrink-0">
            <button
              type="button"
              onClick={() => setDockExpanded(false)}
              className="w-full inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141923] border border-slate-700/80 hover:border-slate-500 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Ocultar Controles</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-1.5 text-xs">
            {/* 0. CENA, MODELAGEM, GIZMO BLENDER/SPLINE, FÍSICA & INTERAÇÕES */}
            <SplineDesignPanel
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
            />
            {/* 1. ARQUIVO & EXPORTAÇÃO */}
            <section className="rounded-lg bg-[#141923] border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                aria-expanded={openSections.file}
                onClick={() => toggleSection('file')}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Archive className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
                      Arquivo &amp; Exportação
                    </div>
                    <div className="text-[11px] text-slate-400 truncate leading-tight">
                      {loadedAsset ? loadedAsset.name : 'Ativo padrão · GLB / glTF / ZIP'}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      openSections.file ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </span>
              </button>
              {openSections.file && (
                <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isLoadingModel || isExporting}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 font-semibold text-white transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isLoadingModel ? 'Carregando...' : 'Importar GLB/glTF'}</span>
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      aria-expanded={showMeshDrawer}
                      onClick={() => setShowMeshDrawer((v) => !v)}
                      title="Abrir hierarquia de malhas e dimensões técnicas"
                      className={`inline-flex items-center justify-between gap-1 px-2 py-1.5 rounded-md border font-medium cursor-pointer ${
                        showMeshDrawer
                          ? 'bg-slate-700 border-slate-500 text-white'
                          : 'bg-[#0D1017] border-slate-800 text-slate-200 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-orange-400" />
                        <span>Malhas</span>
                      </span>
                      <ChevronDown
                        className={`w-3 h-3 text-slate-400 transition-transform duration-150 ${
                          showMeshDrawer ? 'rotate-180 text-white' : ''
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      disabled={isLoadingModel}
                      onClick={() => verifyCurrentSceneRef.current?.()}
                      title="Verificar integridade GLB/glTF, UVs, normais, materiais PBR e rig"
                      className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-slate-600 font-medium text-slate-200 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Verificar</span>
                    </button>
                  </div>

                  {loadError && (
                    <div className="rounded-md bg-red-950/90 border border-red-700/70 px-2 py-1.5 text-[11px] text-red-200 leading-snug">
                      {loadError}
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-800/70 flex flex-col gap-1.5">
                    <button
                      type="button"
                      disabled={isLoadingModel || isExporting}
                      onClick={() => exportZipRef.current?.()}
                      title="Exportar pacote ZIP completo com GLB, glTF, 5 mapas PBR, UV Layout e relatório técnico"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md font-semibold bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Exportar ZIP Completo</span>
                    </button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={isLoadingModel || isExporting}
                        onClick={() => exportModelRef.current?.('glb')}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-slate-600 font-medium text-slate-200 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                        <span>.glb</span>
                      </button>
                      <button
                        type="button"
                        disabled={isLoadingModel || isExporting}
                        onClick={() => exportModelRef.current?.('gltf')}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-slate-600 font-medium text-slate-200 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-400" />
                        <span>.gltf</span>
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => openCodeExportRef.current?.()}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0D1017] border border-slate-800 hover:border-sky-500 text-slate-200 hover:text-white font-medium transition-colors cursor-pointer"
                    >
                      <Code2 className="w-3.5 h-3.5 text-sky-400" />
                      <span>Exportar Código (React / Three.js)</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 2. VISUALIZAÇÃO */}
            <section className="rounded-lg bg-[#141923] border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                aria-expanded={openSections.view}
                onClick={() => toggleSection('view')}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
                      Visualização
                    </div>
                    <div className="text-[11px] text-slate-400 truncate leading-tight">
                      {shadingMode === 'pbr'
                        ? 'PBR Físico'
                        : shadingMode === 'uv_checker'
                        ? 'UV Checker'
                        : shadingMode === 'normals'
                        ? 'Normais'
                        : 'Cel + Borde'}{' '}
                      · Câmera {CAMERA_PRESETS[activePreset].label}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      openSections.view ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </span>
              </button>
              {openSections.view && (
                <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Shading</span>
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

                  <label className="flex flex-col gap-1 pt-0.5">
                    <span className="text-[11px] text-slate-400">Ângulo de Câmera</span>
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

                  <div className="grid grid-cols-2 gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => frameSceneRef.current?.()}
                      title="Enquadrar modelo (Tecla F)"
                      className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded-md bg-[#0D1017] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 cursor-pointer"
                    >
                      <Maximize2 className="w-3 h-3" />
                      <span>Enquadrar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('q34')}
                      title="Resetar Câmera"
                      className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] rounded-md bg-[#0D1017] border border-slate-800 text-slate-300 hover:text-white hover:border-slate-600 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Resetar</span>
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* 3. ANIMAÇÃO */}
            <section className="rounded-lg bg-[#141923] border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                aria-expanded={openSections.anim}
                onClick={() => toggleSection('anim')}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Play className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
                      Animação
                    </div>
                    <div className="text-[11px] text-slate-400 truncate leading-tight tabular-nums">
                      {isPlaying ? 'Reproduzindo' : 'Pausada'} · Frame {currentFrame}f
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      openSections.anim ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </span>
              </button>
              {openSections.anim && (
                <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
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
                          max={60}
                          value={currentFrame}
                          onChange={(e) => handleScrubFrame(Number(e.target.value))}
                          aria-label="Frame da animação"
                          className="flex-1 min-w-0 cursor-pointer"
                        />
                        <span className="font-mono text-slate-300 tabular-nums w-8 text-right shrink-0">
                          {currentFrame}f
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Este modelo não contém clipes de animação. Use <strong>Gerar Rig &amp; Animação</strong> abaixo.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 4. RIG & UV */}
            <section className="rounded-lg bg-[#141923] border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                aria-expanded={openSections.rig}
                onClick={() => toggleSection('rig')}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Bone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
                      Rig &amp; UV
                    </div>
                    <div className="text-[11px] text-slate-400 truncate leading-tight">
                      {RIG_PRESET_DEFINITIONS[config.rigPreset].shortLabel} ·{' '}
                      {RIG_PRESET_DEFINITIONS[config.rigPreset].boneCount} ossos
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      openSections.rig ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </span>
              </button>
              {openSections.rig && (
                <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-slate-400">Preset de Armadura (Rig)</span>
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

                  <button
                    type="button"
                    disabled={isLoadingModel}
                    onClick={() => generateAutoUvRef.current?.()}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#0D1017] border border-slate-700 hover:border-sky-500 text-slate-100 font-medium cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5 text-sky-400" />
                    <span>Gerar UV Auto</span>
                  </button>
                </div>
              )}
            </section>

            {/* 5. EXIBIÇÃO & FERRAMENTAS */}
            <section className="rounded-lg bg-[#141923] border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                aria-expanded={openSections.tools}
                onClick={() => toggleSection('tools')}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Palette className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
                      Exibição &amp; Ferramentas
                    </div>
                    <div className="text-[11px] text-slate-400 truncate leading-tight">
                      Luzes, Render PNG &amp; Pintura 3D
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      openSections.tools ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </span>
              </button>
              {openSections.tools && (
                <div className="px-2.5 pb-2.5 pt-2 border-t border-slate-800/80 flex flex-col gap-2">
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setDoubleSided((v) => !v)}
                      className={`px-2 py-1.5 rounded-md border text-[11px] font-medium cursor-pointer ${
                        doubleSided
                          ? 'bg-slate-700 border-slate-500 text-white'
                          : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Dois Lados
                    </button>
                    <button
                      type="button"
                      onClick={() => setWireframeMode((v) => !v)}
                      className={`px-2 py-1.5 rounded-md border text-[11px] font-medium cursor-pointer ${
                        wireframeMode
                          ? 'bg-slate-700 border-slate-500 text-white'
                          : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Wire
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGrid((v) => !v)}
                      className={`px-2 py-1.5 rounded-md border text-[11px] font-medium cursor-pointer ${
                        showGrid
                          ? 'bg-slate-700 border-slate-500 text-white'
                          : 'bg-[#0D1017] border-slate-800 text-slate-300 hover:text-white'
                      }`}
                    >
                      Grade
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5">
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
                        showPaintStudio || toolMode !== 'orbit'
                          ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                          : 'bg-[#0D1017] border-slate-700 text-slate-200 hover:text-white'
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-orange-400" />
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
                              toolMode === 'orbit' ? 'bg-slate-700 text-white' : 'bg-[#141923] text-slate-400 hover:text-white'
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
                          <span className="truncate">{customTextureName ? customTextureName : 'Inserir Textura'}</span>
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
                            <span className="font-mono text-slate-200 tabular-nums w-8 text-right">{brushSize}px</span>
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
                  </div>
                </div>
              )}
            </section>

            {/* 6. PBR AO VIVO */}
            <section className="rounded-lg bg-[#141923] border border-slate-800/90 overflow-hidden">
              <button
                type="button"
                aria-expanded={openSections.pbr}
                onClick={() => toggleSection('pbr')}
                className="w-full px-3 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <div className="text-[11px] font-semibold tracking-wider uppercase text-slate-200 leading-tight">
                      PBR ao Vivo
                    </div>
                    <div className="text-[11px] text-slate-400 truncate leading-tight tabular-nums">
                      Rug {roughnessOverride.toFixed(2)} · Met {metalnessOverride.toFixed(2)}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#0D1017] border border-slate-800 text-slate-400 shrink-0">
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      openSections.pbr ? 'rotate-180 text-orange-400' : ''
                    }`}
                  />
                </span>
              </button>
              {openSections.pbr && (
                <div className="px-3 pb-3 pt-2 border-t border-slate-800/80 flex flex-col gap-2.5 text-[11px]">
                  <label className="flex flex-col gap-1">
                    <span className="flex justify-between text-slate-400">
                      <span>Rugosidade (Roughness)</span>
                      <span className="font-mono text-slate-200 tabular-nums">{roughnessOverride.toFixed(2)}</span>
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
                      <span className="font-mono text-slate-200 tabular-nums">{metalnessOverride.toFixed(2)}</span>
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

                  <label className="flex flex-col gap-1">
                    <span className="flex justify-between text-slate-400">
                      <span>Força Normal Map</span>
                      <span className="font-mono text-slate-200 tabular-nums">{config.normalStrength.toFixed(2)}</span>
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

                  <label className="flex flex-col gap-1">
                    <span className="flex justify-between text-slate-400">
                      <span>Contorno Borde</span>
                      <span className="font-mono text-slate-200 tabular-nums">{config.outlineThickness.toFixed(3)}</span>
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
                </div>
              )}
            </section>

            {/* 7. AMBIENTE HDRI (Acoplado na barra lateral esquerda) */}
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
          </div>
        </aside>
      )}

      {/* Unobstructed 3D Viewport Area */}
      <div className="relative flex-1 min-w-0 h-full min-h-[480px] overflow-hidden">
        {/* Dedicated WebGL Mount Container */}
        <div
          ref={mountRef}
          className={`w-full h-full min-h-[480px] ${toolMode === 'paint' ? 'cursor-crosshair' : toolMode === 'assign_mat' ? 'cursor-cell' : ''}`}
        />

        {webglError && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-[#0D1017]/95 p-6 text-center">
            <div className="text-sm font-semibold text-red-300">
              Não foi possível iniciar a Viewport 3D (WebGL)
            </div>
            <div className="max-w-md text-xs text-slate-400 leading-relaxed">{webglError}</div>
            <button
              type="button"
              onClick={() => setRetryWebglNonce((n) => n + 1)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Tentar Novamente</span>
            </button>
          </div>
        )}

        {contextLost && !webglError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0D1017] text-slate-300 text-sm">
            Contexto WebGL pausado. Recarregue a janela para restaurar a visualização 3D.
          </div>
        )}

        {/* Drag Overlay */}
        {isDragging && (
          <div className="pointer-events-none absolute inset-4 z-20 rounded-2xl border-2 border-dashed border-orange-500 bg-[#0D1017]/80 flex flex-col items-center justify-center gap-2">
            <Upload className="w-8 h-8 text-orange-400" />
            <div className="text-base font-semibold text-white">Solte seu arquivo .glb, .gltf ou .zip aqui</div>
            <div className="text-xs text-slate-400">
              Suporte a pacotes .zip, compressão Draco, KTX2 e Meshopt
            </div>
          </div>
        )}

        {/* Minimal Top-Left Viewport Readout + Expand Toggle (when sidebar is hidden) */}
        <div className="absolute top-4 left-5 z-10 flex flex-col gap-1.5 max-w-[calc(100%-2.5rem)]">
          {!dockExpanded && (
            <div>
              <button
                type="button"
                onClick={() => setDockExpanded(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141923]/92 border border-slate-700/80 hover:border-slate-500 text-xs font-medium text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5 text-orange-400" />
                <span>Mostrar Controles</span>
              </button>
            </div>
          )}

          <div className="pointer-events-none text-xs font-medium text-slate-400">
            {loadedAsset
              ? `${loadedAsset.meshCount} malha(s) · ${loadedAsset.triCount.toLocaleString('pt-BR')} triângulos · ${loadedAsset.matCount} material(is) · Rig: ${RIG_PRESET_DEFINITIONS[config.rigPreset].label}${activeProceduralLabel ? ` · Procedural: ${activeProceduralLabel}` : ''}`
              : `Ativo de Referência · Rig ${RIG_PRESET_DEFINITIONS[config.rigPreset].label}${activeProceduralLabel ? ` · Procedural: ${activeProceduralLabel}` : ''}`}
          </div>
          <div className="flex items-center gap-3">
            <div className="pointer-events-none text-sm font-semibold text-slate-100 tabular-nums">
              {loadedAsset ? (
                <span>{loadedAsset.name}</span>
              ) : (
                <span>
                  Frame {String(currentFrame).padStart(2, '0')} / {config.animEndFrame} · Atlas {config.textureResolution}px
                </span>
              )}
            </div>
            {loadedAsset && (
              <button
                type="button"
                onClick={() => resetAssetRef.current?.()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#161B26] border border-slate-700 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Voltar ao Padrão</span>
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
        />
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
    </div>
  );
};

