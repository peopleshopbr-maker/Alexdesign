import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import JSZip from 'jszip';
import {
  Bone,
  Camera,
  ChevronRight,
  ChevronUp,
  CircleDot,
  Code2,
  Eye,
  EyeOff,
  FlipHorizontal2,
  Grid3X3,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minus,
  MousePointer,
  Move,
  Paintbrush,
  Palette,
  Plus,
  RotateCcw,
  RotateCw,
  Scaling,
  Shapes,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import {
  ExtractedGlbTextures,
  ImportedUvMesh,
  RIG_PRESET_DEFINITIONS,
  RigPreset,
  StudioConfig,
} from '../types/studioConfig';
import {
  ACTIONFORGE_CLIPS,
  BoneMaskRegion,
  RIG_MARKER_DEFS,
  RigMarkerId,
  RigPostureOffsets,
  TimelineStripItem,
  autoGenerateUvsForGroup,
  autoRigAndAnimateGroup,
  compileTimelineStripsToClip,
  computeDefaultRigMarkers,
  filterClipByBoneMask,
  lockClipInPlace,
  mirrorClipLeftRight,
  removeAutoRigFromGroup,
  reverseAnimationClip,
} from '../utils/autoRigger';
import {
  CodeExportObjectSpec,
  PRIMITIVE_CATALOG,
  PrimitiveShapeKind,
  RigidBodyMode,
  SelectedObjectInspector,
  SplineMaterialStyle,
  SplineTemplateId,
  SplineToolMode,
  applySplineStyleToPhysicalMaterial,
  createSplinePrimitiveGeometry,
} from '../utils/splineSceneObjects';
import {
  HDRI_CDN_BASE,
  HdriEnvironmentId,
  RenderResolutionPreset,
  StudioLightSpec,
  TONE_MAPPING_MAP,
  ToneMappingPreset,
  buildProceduralHdriTexture,
  buildThreeLightFromSpec,
  isSoftwareWebGLContext,
  renderSceneToPngBlob,
} from '../utils/studioLighting';
import {
  PROCEDURAL_MATERIAL_PRESETS,
  ProceduralPbrParams,
  generateProceduralPbrBundle,
} from '../utils/pbrTextureGenerator';
import {
  SubstanceChannelId,
  SubstanceTextureSetRequest,
  detectSubstanceChannel,
} from '../utils/substanceImporter';
import {
  HtmlTo3dSpec,
  createHtmlTo3dGroup,
  updateHtmlTo3dGroup,
} from '../utils/htmlTo3d';
import { GltfAuditReport, auditThreeSceneGroup } from '../utils/gltfVerifier';
import { BooleanOpKind, performCsgBoolean } from '../utils/csgBoolean';
import { exportProjectAssetZip } from '../utils/projectZipExporter';
import { prepareBlenderCompatibleExport } from '../utils/blenderExport';
import { exportSceneToFbxBlob } from '../utils/fbxExporter';
import {
  KeyframeInterpolationMode,
  WeightBrushMode,
  applyWeightPaintStroke,
  enforceFloorContactOnLegs,
  retargetClipToRig,
  setClipInterpolationMode,
  solveTwoBoneIK,
  updateMeshWeightHeatmapColors,
} from '../utils/ikSolver';
import {
  DEFAULT_PARTICLE_EMITTER,
  ParticleEmitterConfig,
  ParticleEmitterInstance,
} from '../utils/particleSystem';
import {
  DEFAULT_REACTIVE_SHADER,
  DEFAULT_VARIABLE_BINDINGS,
  ReactiveShaderSharedUniforms,
  VariableBindingRule,
  attachReactiveShaderToMaterial,
  effectToModeInt,
} from '../utils/reactiveShaders';
import { useStudioIntelligence } from '../context/StudioIntelligenceContext';
import { StudioLightingState } from './LightingStudioPage';
import { SceneMeshItem } from './MeshHierarchyDrawer';
import { SplineDesignPanel } from './SplineDesignPanel';
import { SplineCodeExportModal } from './SplineCodeExportModal';
import { FileVerificationModal } from './FileVerificationModal';
import { HtmlTo3dModal } from './HtmlTo3dModal';
import { ActionForgeTimeline, ActiveClipTrackSample } from './ActionForgeTimeline';
import {
  ExplorerOutlinerDock,
  HtmlReferenceSummary,
  MorphTargetItem,
  OutlinerPropertiesDock,
  PropertiesTabId,
} from './OutlinerPropertiesDock';
import {
  AxisGizmo3D,
  CameraSnapDirection,
  ShortcutTooltip,
} from './StudioPrimitives';
import { BoneHierarchyNode, SkeletonVisualizerRig } from '../utils/skeletonVisualizer';

export type { ImportedUvMesh };

export type ViewportStageKey =
  | 'stage1'
  | 'stage2'
  | 'stage3'
  | 'stage4'
  | 'stage5'
  | 'stage6'
  | 'stage7'
  | 'stage8'
  | 'stage9'
  | 'stage12'
  | 'stage13'
  | 'stage14';

export type ViewportSceneConfig = StudioConfig;
export type BlenderInteractionMode = 'object' | 'edit' | 'pose' | 'weight_paint';
export type ViewportShadingMode = 'wireframe' | 'solid' | 'material' | 'rendered';

export interface ViewportStatusSnapshot {
  clipNames: string[];
  activeClipIdx: number;
  activeClipId: string;
  isPlaying: boolean;
  animLoop: boolean;
  animSpeed: number;
  animProgress: number;
  animDuration: number;
  mirrorClip: boolean;
  reverseClip: boolean;
  inPlaceClip: boolean;
  clayShading: boolean;
  autoKey: boolean;
  interpolationMode: KeyframeInterpolationMode;
  hasCopiedKeyframe: boolean;
  showSkeleton: boolean;
  showRigMarkers: boolean;
  markerSymmetry: boolean;
  ikEnabled: boolean;
  floorContactEnabled: boolean;
  weightPaintActive: boolean;
  weightBrushMode: WeightBrushMode;
  weightBrushRadius: number;
  weightBrushStrength: number;
  morphTargets: MorphTargetItem[];
  riggedBoneNames: string[];
  selectedBoneName: string | null;
  strips: TimelineStripItem[];
  overlayClipId: string;
  overlayMask: BoneMaskRegion;
  overlayWeight: number;
  postureOffsets: RigPostureOffsets;
  activeClipTracks: ActiveClipTrackSample[];
  hdriLoading: boolean;
  customHdriName: null | string;
  isRendering: boolean;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  emitters: ParticleEmitterConfig[];
  selectedEmitterId: string | null;
  animInPoint: number;
  animOutPoint: number;
}

export interface ViewportGlobalActions {
  undo: () => void;
  redo: () => void;
  toggleWireframe: () => void;
  toggleClayShading: () => void;
  importModel: () => void;
  importAnimationFile: () => void;
  frameScene: () => void;
  runAutoRig: (preset?: RigPreset) => void;
  resetPose: () => void;
  removeRig: () => void;
  toggleRigMarkers: () => void;
  toggleMarkerSymmetry: () => void;
  toggleSkeleton: () => void;
  toggleIk: () => void;
  toggleFloorContact: () => void;
  setWeightPaintActive: (active: boolean) => void;
  setWeightBrushMode: (mode: WeightBrushMode) => void;
  setWeightBrushRadius: (radius: number) => void;
  setWeightBrushStrength: (strength: number) => void;
  setMorphTargetValue: (meshId: string, index: number, value: number) => void;
  selectBoneForPose: (boneName: string) => void;
  selectClip: (idxOrId: number | string) => void;
  togglePlay: () => void;
  stopAnimation: () => void;
  stepFrame: (deltaFrames: number) => void;
  seekNormalized: (pct: number) => void;
  setPlayRange: (inPct: number, outPct: number) => void;
  resetPlayRange: () => void;
  toggleLoop: () => void;
  toggleMirrorClip: () => void;
  toggleReverseClip: () => void;
  toggleInPlaceClip: () => void;
  toggleAutoKey: () => void;
  setInterpolationMode: (mode: KeyframeInterpolationMode) => void;
  setAnimSpeed: (speed: number) => void;
  setStrips: (next: TimelineStripItem[]) => void;
  setOverlayLayer: (clipId: string, mask: BoneMaskRegion, weight: number) => void;
  setPostureOffsets: (patch: Partial<RigPostureOffsets>) => void;
  addBoneKeyframe: () => void;
  copyKeyframe: () => void;
  pasteKeyframe: () => void;
  deleteKeyframe: () => void;
  moveKeyframe: (trackName: string, oldTime: number, newTime: number) => void;
  copyClipLink: (clipId: string) => void;
  copyPublicLink: () => void;
  bakeIkPhysics: () => void;
  setToolMode: (mode: SplineToolMode) => void;
  setShowGrid: (show: boolean) => void;
  applyGlobalScale: (scale: number) => void;
  applyAccentColor: (hex: string) => void;
  getCodeExportObjects: () => CodeExportObjectSpec[];
  auditCurrentScene: () => GltfAuditReport | null;
  exportModel: (fmt: 'glb' | 'gltf', includeAnimations?: boolean) => void;
  exportFbx: () => void;
  exportZip: () => void;
  uploadHdri: () => void;
  renderPng: () => void;
  renderTransparentPng: () => void;
  restoreDefaultScene: () => void;
  openCodeExport: () => void;
  openHtmlTo3d: () => void;
  openReferenceImport: () => void;
  setRightPropTab: (tab: PropertiesTabId) => void;
  setTimelineDocked: (docked: boolean) => void;
  addEmitter: () => void;
  selectEmitter: (id: string) => void;
  updateEmitter: (id: string, patch: Partial<ParticleEmitterConfig>) => void;
  removeEmitter: (id: string) => void;
}

interface Viewport3DProps {
  config: StudioConfig;
  onConfigChange: (patch: Partial<StudioConfig> | Partial<ViewportSceneConfig>) => void;
  lightingState?: StudioLightingState;
  onLightingChange?: (patch: Partial<StudioLightingState>) => void;
  onImportedUvs: (meshes: ImportedUvMesh[] | null) => void;
  substanceTextureRequest: SubstanceTextureSetRequest | null;
  onOpenTab: (
    tab: 'viewport' | 'rigging' | 'lighting' | 'export' | ViewportStageKey
  ) => void;
  onImportedModelFile: (file: File | null) => void;
  pendingImportFiles: File[] | null;
  onConsumedPendingImport: () => void;
  focusedStage: ViewportStageKey | null;
  activeWorkspaceTab?: string;
  variableBindings?: VariableBindingRule[];
  hideRightInspector?: boolean;
  onRegisterGlobalActions: (actions: ViewportGlobalActions) => void;
  onWireframeChange: (wireframe: boolean) => void;
  onStatusSnapshot?: (snapshot: ViewportStatusSnapshot) => void;
}

type CameraPreset = CameraSnapDirection;

interface ReferencePlaneConfig {
  active: boolean;
  visible: boolean;
  name: string;
  dataUrl: string;
  aspect: number;
  axis: 'front' | 'side' | 'top';
  opacity: number;
  scale: number;
  flipX: boolean;
}

export const THREE_POINT_PRESET: StudioLightSpec[] = [
  { id: 'key', name: 'Luz Principal (Key)', type: 'dir', color: '#fff4e6', intensity: 2.3, position: [3.2, 4.8, 3.4] },
  { id: 'fill', name: 'Preenchimento (Fill)', type: 'dir', color: '#dbeafe', intensity: 0.9, position: [-3.5, 2.2, 2.4] },
  { id: 'rim', name: 'Recorte (Rim)', type: 'spot', color: '#fb923c', intensity: 2.0, position: [-1.8, 3.4, -3.2] },
  { id: 'amb', name: 'Luz Ambiente', type: 'amb', color: '#e2e8f0', intensity: 0.5, position: [0, 0, 0] },
];

function extractUvEdgesFromMesh(mesh: THREE.Mesh, maxTris = 12000): Float32Array {
  const geo = mesh.geometry;
  const uv = geo?.attributes?.uv;
  if (!uv) return new Float32Array(0);
  const idx = geo.index;
  const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(uv.count / 3);
  const count = Math.min(triCount, maxTris);
  const edges = new Float32Array(count * 12);

  for (let t = 0; t < count; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    const o = t * 12;
    edges[o] = uv.getX(i0);
    edges[o + 1] = uv.getY(i0);
    edges[o + 2] = uv.getX(i1);
    edges[o + 3] = uv.getY(i1);
    edges[o + 4] = uv.getX(i1);
    edges[o + 5] = uv.getY(i1);
    edges[o + 6] = uv.getX(i2);
    edges[o + 7] = uv.getY(i2);
    edges[o + 8] = uv.getX(i2);
    edges[o + 9] = uv.getY(i2);
    edges[o + 10] = uv.getX(i0);
    edges[o + 11] = uv.getY(i0);
  }
  return edges;
}

function textureToDataUrl(tex: THREE.Texture | null | undefined): string | undefined {
  if (!tex || !tex.image) return undefined;
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  const w = (img as HTMLImageElement).naturalWidth || img.width || 256;
  const h = (img as HTMLImageElement).naturalHeight || img.height || 256;
  if (!w || !h) return undefined;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(512, w);
    canvas.height = Math.min(512, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img as CanvasImageSource, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch {
    return undefined;
  }
}

function disposeObject3D(root: THREE.Object3D | null) {
  if (!root) return;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat) return;
        const std = mat as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.normalMap?.dispose();
        std.roughnessMap?.dispose();
        std.metalnessMap?.dispose();
        std.aoMap?.dispose();
        std.emissiveMap?.dispose();
        mat.dispose();
      });
    }
  });
}

function upgradeToPhysicalMaterial(
  mat: THREE.Material
): THREE.MeshPhysicalMaterial {
  if (mat instanceof THREE.MeshPhysicalMaterial) return mat;
  const std = mat as THREE.MeshStandardMaterial;
  const phys = new THREE.MeshPhysicalMaterial({
    name: std.name || 'Material_PBR',
    color: std.color ? std.color.clone() : new THREE.Color('#cbd5e1'),
    roughness: typeof std.roughness === 'number' ? std.roughness : 0.4,
    metalness: typeof std.metalness === 'number' ? std.metalness : 0.15,
    map: std.map ?? null,
    normalMap: std.normalMap ?? null,
    roughnessMap: std.roughnessMap ?? null,
    metalnessMap: std.metalnessMap ?? null,
    aoMap: std.aoMap ?? null,
    emissive: std.emissive ? std.emissive.clone() : new THREE.Color(0x000000),
    emissiveMap: std.emissiveMap ?? null,
    emissiveIntensity: typeof std.emissiveIntensity === 'number' ? std.emissiveIntensity : 0,
    alphaMap: std.alphaMap ?? null,
    transparent: Boolean(std.transparent),
    opacity: typeof std.opacity === 'number' ? std.opacity : 1,
    side: std.side ?? THREE.FrontSide,
    wireframe: Boolean((std as THREE.MeshStandardMaterial).wireframe),
  });
  if (std.normalScale && phys.normalScale) {
    phys.normalScale.copy(std.normalScale);
  }
  return phys;
}

function createDefaultStudioCharacterGroup(): THREE.Group {
  const root = new THREE.Group();
  root.name = 'Modelo_Studio_AlexDesign';

  const bodyMat = new THREE.MeshPhysicalMaterial({
    name: 'Armadura_Chumbo',
    color: '#334155',
    roughness: 0.34,
    metalness: 0.45,
    clearcoat: 0.35,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    name: 'Laranja_AlexDesign',
    color: '#f97316',
    roughness: 0.24,
    metalness: 0.28,
    clearcoat: 0.7,
  });
  const limbMat = new THREE.MeshPhysicalMaterial({
    name: 'Articulacao_Titanio',
    color: '#94a3b8',
    roughness: 0.3,
    metalness: 0.75,
  });
  const visorMat = new THREE.MeshPhysicalMaterial({
    name: 'Visor_Ciano_Emissivo',
    color: '#0ea5e9',
    emissive: '#38bdf8',
    emissiveIntensity: 1.15,
    roughness: 0.12,
    metalness: 0.1,
  });

  const addPart = (
    name: string,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    pos: [number, number, number],
    rot?: [number, number, number]
  ) => {
    const mesh = new THREE.Mesh(geo, mat.clone());
    mesh.name = name;
    mesh.position.set(...pos);
    if (rot) mesh.rotation.set(...rot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  // Pelvis & Torso
  addPart('Pelve', new THREE.CylinderGeometry(0.16, 0.14, 0.18, 24), bodyMat, [0, 0.92, 0]);
  addPart('Torso', new THREE.CapsuleGeometry(0.18, 0.28, 12, 24), bodyMat, [0, 1.24, 0]);
  addPart('Peitoral_Accent', new THREE.BoxGeometry(0.32, 0.16, 0.24), accentMat, [0, 1.32, 0.04]);

  // Head with procedural Blendshapes (Morph Targets: Sorriso, Boca_Aberta, Largura_Facial, Alongar_Craneo) & Visor & Crest
  const headGeo = new THREE.SphereGeometry(0.175, 28, 22);
  const headPos = headGeo.attributes.position as THREE.BufferAttribute;
  const smileOffsets = new Float32Array(headPos.count * 3);
  const jawOffsets = new Float32Array(headPos.count * 3);
  const wideOffsets = new Float32Array(headPos.count * 3);
  const tallOffsets = new Float32Array(headPos.count * 3);
  for (let i = 0; i < headPos.count; i++) {
    const x = headPos.getX(i);
    const y = headPos.getY(i);
    const z = headPos.getZ(i);
    const frontFactor = z > 0.04 ? Math.min(1, (z - 0.04) / 0.13) : 0;
    const lowerFactor = y < 0.01 ? Math.min(1, (-y + 0.01) / 0.16) : 0;
    smileOffsets[i * 3] = x * 0.22 * frontFactor * lowerFactor;
    smileOffsets[i * 3 + 1] = 0.028 * frontFactor * lowerFactor;
    smileOffsets[i * 3 + 2] = 0.012 * frontFactor * lowerFactor;

    jawOffsets[i * 3] = 0;
    jawOffsets[i * 3 + 1] = -0.055 * frontFactor * lowerFactor;
    jawOffsets[i * 3 + 2] = -0.015 * frontFactor * lowerFactor;

    wideOffsets[i * 3] = x * 0.28;
    wideOffsets[i * 3 + 1] = 0;
    wideOffsets[i * 3 + 2] = 0;

    tallOffsets[i * 3] = 0;
    tallOffsets[i * 3 + 1] = y > 0 ? y * 0.32 : 0;
    tallOffsets[i * 3 + 2] = 0;
  }
  headGeo.morphTargetsRelative = true;
  headGeo.morphAttributes.position = [
    new THREE.BufferAttribute(smileOffsets, 3),
    new THREE.BufferAttribute(jawOffsets, 3),
    new THREE.BufferAttribute(wideOffsets, 3),
    new THREE.BufferAttribute(tallOffsets, 3),
  ];
  const headMesh = addPart('Cabeca', headGeo, limbMat, [0, 1.64, 0]);
  headMesh.morphTargetDictionary = {
    Sorriso: 0,
    Boca_Aberta: 1,
    Largura_Facial: 2,
    Alongar_Craneo: 3,
  };
  headMesh.updateMorphTargets();
  addPart('Visor', new THREE.BoxGeometry(0.24, 0.08, 0.12), visorMat, [0, 1.65, 0.12]);
  addPart('Crista_Cabelo', new THREE.ConeGeometry(0.08, 0.22, 16), accentMat, [0, 1.78, -0.05], [-0.45, 0, 0]);

  // Arms & Hands
  addPart('Braco_L', new THREE.CapsuleGeometry(0.055, 0.22, 8, 16), limbMat, [0.25, 1.35, 0], [0, 0, -0.22]);
  addPart('Antebraco_L', new THREE.CapsuleGeometry(0.05, 0.22, 8, 16), accentMat, [0.32, 1.07, 0.03], [0.2, 0, -0.08]);
  addPart('Mao_L', new THREE.SphereGeometry(0.052, 14, 12), limbMat, [0.35, 0.89, 0.07]);
  addPart('Braco_R', new THREE.CapsuleGeometry(0.055, 0.22, 8, 16), limbMat, [-0.25, 1.35, 0], [0, 0, 0.22]);
  addPart('Antebraco_R', new THREE.CapsuleGeometry(0.05, 0.22, 8, 16), accentMat, [-0.32, 1.07, 0.03], [0.2, 0, 0.08]);
  addPart('Mao_R', new THREE.SphereGeometry(0.052, 14, 12), limbMat, [-0.35, 0.89, 0.07]);

  // Legs & Boots (continuous from pelvis y=0.83 down into boots y=0.12)
  addPart('Perna_L', new THREE.CapsuleGeometry(0.072, 0.62, 8, 18), limbMat, [0.1, 0.47, 0]);
  addPart('Bota_L', new THREE.BoxGeometry(0.13, 0.12, 0.22), accentMat, [0.1, 0.06, 0.04]);
  addPart('Perna_R', new THREE.CapsuleGeometry(0.072, 0.62, 8, 18), limbMat, [-0.1, 0.47, 0]);
  addPart('Bota_R', new THREE.BoxGeometry(0.13, 0.12, 0.22), accentMat, [-0.1, 0.06, 0.04]);

  return root;
}

function buildBoneHierarchy(bones: THREE.Bone[]): BoneHierarchyNode[] {
  const boneSet = new Set(bones);
  return bones.map((b) => ({
    name: b.name || 'Bone',
    parentName:
      b.parent && (b.parent as THREE.Bone).isBone && boneSet.has(b.parent as THREE.Bone)
        ? b.parent.name || 'Bone'
        : null,
  }));
}

export const Viewport3D: React.FC<Viewport3DProps> = ({
  config,
  onConfigChange,
  lightingState,
  onLightingChange,
  onImportedUvs,
  substanceTextureRequest,
  onOpenTab,
  onImportedModelFile,
  pendingImportFiles,
  onConsumedPendingImport,
  focusedStage,
  activeWorkspaceTab = 'viewport',
  variableBindings = DEFAULT_VARIABLE_BINDINGS,
  hideRightInspector = false,
  onRegisterGlobalActions,
  onWireframeChange,
  onStatusSnapshot,
}) => {
  const { updateStats, notifyAction } = useStudioIntelligence();

  // Keep parent callbacks and context dispatchers in stable refs so Three.js effects never tear down on re-render
  const onImportedUvsRef = useRef(onImportedUvs);
  onImportedUvsRef.current = onImportedUvs;
  const onImportedModelFileRef = useRef(onImportedModelFile);
  onImportedModelFileRef.current = onImportedModelFile;
  const onConsumedPendingImportRef = useRef(onConsumedPendingImport);
  onConsumedPendingImportRef.current = onConsumedPendingImport;
  const onRegisterGlobalActionsRef = useRef(onRegisterGlobalActions);
  onRegisterGlobalActionsRef.current = onRegisterGlobalActions;
  const onWireframeChangeRef = useRef(onWireframeChange);
  onWireframeChangeRef.current = onWireframeChange;
  const onStatusSnapshotRef = useRef(onStatusSnapshot);
  onStatusSnapshotRef.current = onStatusSnapshot;
  const onLightingChangeRef = useRef(onLightingChange);
  onLightingChangeRef.current = onLightingChange;
  const updateStatsRef = useRef(updateStats);
  updateStatsRef.current = updateStats;
  const notifyActionRef = useRef(notifyAction);
  notifyActionRef.current = notifyAction;

  const mountRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);
  const hdriFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const particleSpriteInputRef = useRef<HTMLInputElement>(null);
  const spriteUploadTargetEmitterRef = useRef<string | null>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);

  // Core Three refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const outlinePassRef = useRef<OutlinePass | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const bokehPassRef = useRef<BokehPass | null>(null);
  const afterimagePassRef = useRef<AfterimagePass | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const cameraQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const pmremRef = useRef<THREE.PMREMGenerator | null>(null);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const splineGroupRef = useRef<THREE.Group | null>(null);
  const referenceGroupRef = useRef<THREE.Group | null>(null);
  const editingHtml3dGroupRef = useRef<THREE.Group | null>(null);
  const lightsGroupRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const skeletonVisualizerRef = useRef<SkeletonVisualizerRig | null>(null);
  const rigMarkersGroupRef = useRef<THREE.Group | null>(null);
  const ikTargetsGroupRef = useRef<THREE.Group | null>(null);
  const emittersGroupRef = useRef<THREE.Group | null>(null);
  const emitterInstancesRef = useRef<Map<string, ParticleEmitterInstance>>(new Map());
  const markerCenterXRef = useRef(0);
  const skeletonRef = useRef<THREE.Skeleton | null>(null);
  const bonesRef = useRef<THREE.Bone[]>([]);
  const restBoneTransformsRef = useRef<
    Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }>
  >(new Map());
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipsRef = useRef<THREE.AnimationClip[]>([]);
  const clipPoolMapRef = useRef<Map<string, THREE.AnimationClip>>(new Map());
  const activeActionRef = useRef<THREE.AnimationAction | null>(null);
  const overlayActionRef = useRef<THREE.AnimationAction | null>(null);
  const envTexRef = useRef<THREE.Texture | null>(null);
  const paintSnapshotsRef = useRef<Map<string, ImageData[]>>(new Map());
  const importSerialRef = useRef(0);
  const selectedObjectRef = useRef<THREE.Object3D | null>(null);
  const undoStackRef = useRef<{ obj: THREE.Object3D; pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[]>([]);
  const redoStackRef = useRef<{ obj: THREE.Object3D; pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[]>([]);
  const lastAnimPctRef = useRef(-1);
  const copiedKeyframeRef = useRef<{
    boneName: string;
    quat: [number, number, number, number];
  } | null>(null);
  const pointerNormRef = useRef({ x: 0.5, y: 0.5 });
  const scrollAccumRef = useRef(0);
  const clickBurstRef = useRef(0);
  const reactiveUniformsRef = useRef<ReactiveShaderSharedUniforms>({
    uTime: { value: 0 },
    uEffectMode: { value: 0 },
    uEffectIntensity: { value: 0.55 },
    uEffectColor: { value: new THREE.Color('#38bdf8') },
    uEffectSpeed: { value: 1.0 },
  });

  // UI state
  const [webglError, setWebglError] = useState<string | null>(null);
  const [retryWebglNonce, setRetryWebglNonce] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [dockExpanded, setDockExpanded] = useState(true);
  const [activePropTab, setActivePropTab] = useState<PropertiesTabId>('transform');
  const [showPrimitivesDrawer, setShowPrimitivesDrawer] = useState(false);
  const [interactionMode, setInteractionMode] = useState<BlenderInteractionMode>('object');
  const [shadingMode, setShadingMode] = useState<ViewportShadingMode>('rendered');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [activeAssetName, setActiveAssetName] = useState('Modelo_Studio_AlexDesign');
  const activeAssetNameRef = useRef(activeAssetName);
  activeAssetNameRef.current = activeAssetName;
  const [wireframeMode, setWireframeMode] = useState(false);
  const [doubleSided, setDoubleSided] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showRigMarkers, setShowRigMarkers] = useState(false);
  const [markerSymmetry, setMarkerSymmetry] = useState(true);
  const [ikEnabled, setIkEnabled] = useState(false);
  const [floorContactEnabled, setFloorContactEnabled] = useState(true);
  const [weightPaintActive, setWeightPaintActive] = useState(false);
  const [weightBrushMode, setWeightBrushMode] = useState<WeightBrushMode>('add');
  const [weightBrushRadius, setWeightBrushRadius] = useState(0.24);
  const [weightBrushStrength, setWeightBrushStrength] = useState(0.65);
  const [morphTargets, setMorphTargets] = useState<MorphTargetItem[]>([]);
  const [riggedBoneNames, setRiggedBoneNames] = useState<string[]>([]);
  const [riggedBoneTree, setRiggedBoneTree] = useState<BoneHierarchyNode[]>([]);
  const [selectedBoneName, setSelectedBoneName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animLoop, setAnimLoop] = useState(true);
  const [mirrorClip, setMirrorClip] = useState(false);
  const [reverseClip, setReverseClip] = useState(false);
  const [inPlaceClip, setInPlaceClip] = useState(false);
  const [clayShading, setClayShading] = useState(false);
  const [autoKey, setAutoKey] = useState(false);
  const [interpolationMode, setInterpolationMode] = useState<KeyframeInterpolationMode>('ease');
  const [hasCopiedKeyframe, setHasCopiedKeyframe] = useState(false);
  const [clipNames, setClipNames] = useState<string[]>([]);
  const [activeClipIdx, setActiveClipIdx] = useState(0);
  const [activeClipId, setActiveClipId] = useState('chest_open');
  const [animProgress, setAnimProgress] = useState(0);
  const [animDuration, setAnimDuration] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [strips, setStrips] = useState<TimelineStripItem[]>([]);
  const [overlayClipId, setOverlayClipId] = useState('');
  const [overlayMask, setOverlayMask] = useState<BoneMaskRegion>('upper');
  const [overlayWeight, setOverlayWeight] = useState(0.7);
  const [postureOffsets, setPostureOffsets] = useState<RigPostureOffsets>({
    spineBendDeg: 0,
    pelvisHeight: 0,
    armSpreadDeg: 0,
  });
  const [activeClipTracks, setActiveClipTracks] = useState<ActiveClipTrackSample[]>([]);
  const [timelineDocked, setTimelineDocked] = useState(true);

  const [toolMode, setToolMode] = useState<SplineToolMode>('orbit');
  const [brushColor, setBrushColor] = useState('#f97316');
  const [brushSize, setBrushSize] = useState(18);
  const [selectedColor, setSelectedColor] = useState('#f97316');
  const [selectedRoughness, setSelectedRoughness] = useState(0.32);
  const [selectedMetalness, setSelectedMetalness] = useState(0.25);

  // Particle Emitters (VFX)
  const [emitters, setEmitters] = useState<ParticleEmitterConfig[]>([]);
  const [selectedEmitterId, setSelectedEmitterId] = useState<string | null>(null);

  // HDRI & Lighting state (synced with LightingStudioPage when provided)
  const [activeHdri, setActiveHdri] = useState<HdriEnvironmentId>(lightingState?.activeHdri ?? 'room');
  const [envIntensity, setEnvIntensity] = useState(lightingState?.envIntensity ?? 1.05);
  const [bgAsEnvironment, setBgAsEnvironment] = useState(lightingState?.bgAsEnvironment ?? false);
  const [envBlur, setEnvBlur] = useState(lightingState?.envBlur ?? 0.15);
  const [hdriLoading, setHdriLoading] = useState(false);
  const [customHdriName, setCustomHdriName] = useState<string | null>(null);
  const [lights, setLights] = useState<StudioLightSpec[]>(lightingState?.lights ?? THREE_POINT_PRESET);
  const [toneMapping, setToneMapping] = useState<ToneMappingPreset>(lightingState?.toneMapping ?? 'agx');
  const [exposure, setExposure] = useState(lightingState?.exposure ?? 1.05);
  const [shadowsEnabled, setShadowsEnabled] = useState(lightingState?.shadowsEnabled ?? true);
  const [resolution, setResolution] = useState<RenderResolutionPreset>(lightingState?.resolution ?? '1920x1080');
  const [transparentBg, setTransparentBg] = useState(lightingState?.transparentBg ?? false);
  const [postBloomEnabled, setPostBloomEnabled] = useState(lightingState?.bloomEnabled ?? false);
  const [postBloomStrength, setPostBloomStrength] = useState(lightingState?.bloomStrength ?? 0.45);
  const [postBloomThreshold, setPostBloomThreshold] = useState(lightingState?.bloomThreshold ?? 0.78);
  const [dofEnabled, setDofEnabled] = useState(lightingState?.dofEnabled ?? false);
  const [dofFocus, setDofFocus] = useState(lightingState?.dofFocus ?? 2.8);
  const [dofAperture, setDofAperture] = useState(lightingState?.dofAperture ?? 0.00025);
  const [motionBlurEnabled, setMotionBlurEnabled] = useState(lightingState?.motionBlurEnabled ?? false);
  const [motionBlurDamp, setMotionBlurDamp] = useState(lightingState?.motionBlurDamp ?? 0.72);
  const [isRendering, setIsRendering] = useState(false);

  // Spline design & modals
  const [playMode, setPlayMode] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<SplineTemplateId>('glass_neon');
  const [hideDefaultBase, setHideDefaultBase] = useState(false);
  const [physicsActive, setPhysicsActive] = useState(false);
  const [bloomEnabled, setBloomEnabled] = useState(false);
  const [selectedInspector, setSelectedInspector] = useState<SelectedObjectInspector | null>(null);
  const [showMeshDrawer, setShowMeshDrawer] = useState(true);
  const [sceneMeshes, setSceneMeshes] = useState<SceneMeshItem[]>([]);
  const [selectedMeshId, setSelectedMeshId] = useState<string | null>(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [html3dModalOpen, setHtml3dModalOpen] = useState(false);
  const [editingHtml3dSpec, setEditingHtml3dSpec] = useState<HtmlTo3dSpec | null>(null);
  const [htmlReferences, setHtmlReferences] = useState<HtmlReferenceSummary[]>([]);
  const [showReferencePopover, setShowReferencePopover] = useState(false);
  const suppressAutoPropTabRef = useRef(false);
  const [refPlane, setRefPlane] = useState<ReferencePlaneConfig>({
    active: false,
    visible: true,
    name: '',
    dataUrl: '',
    aspect: 1,
    axis: 'front',
    opacity: 0.45,
    scale: 1.0,
    flipX: false,
  });
  const [activeTextureMaps, setActiveTextureMaps] = useState<
    Partial<Record<SubstanceChannelId, string>>
  >({});
  const [animInPoint, setAnimInPoint] = useState(0);
  const [animOutPoint, setAnimOutPoint] = useState(1);
  const [auditReport, setAuditReport] = useState<GltfAuditReport | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const lastPbrParamsRef = useRef<ProceduralPbrParams | undefined>(undefined);

  // Mutable live flags read by RAF loop
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const animLoopRef = useRef(animLoop);
  animLoopRef.current = animLoop;
  const animSpeedRef = useRef(animSpeed);
  animSpeedRef.current = animSpeed;
  const animInPointRef = useRef(animInPoint);
  animInPointRef.current = animInPoint;
  const animOutPointRef = useRef(animOutPoint);
  animOutPointRef.current = animOutPoint;
  const mirrorClipRef = useRef(mirrorClip);
  mirrorClipRef.current = mirrorClip;
  const reverseClipRef = useRef(reverseClip);
  reverseClipRef.current = reverseClip;
  const inPlaceClipRef = useRef(inPlaceClip);
  inPlaceClipRef.current = inPlaceClip;
  const autoKeyRef = useRef(autoKey);
  autoKeyRef.current = autoKey;
  const interpolationModeRef = useRef(interpolationMode);
  interpolationModeRef.current = interpolationMode;
  const addBoneKeyframeRef = useRef<() => void>(() => {});
  const markerSymmetryRef = useRef(markerSymmetry);
  markerSymmetryRef.current = markerSymmetry;
  const ikEnabledRef = useRef(ikEnabled);
  ikEnabledRef.current = ikEnabled;
  const floorContactEnabledRef = useRef(floorContactEnabled);
  floorContactEnabledRef.current = floorContactEnabled;
  const weightPaintActiveRef = useRef(weightPaintActive);
  weightPaintActiveRef.current = weightPaintActive;
  const weightBrushModeRef = useRef(weightBrushMode);
  weightBrushModeRef.current = weightBrushMode;
  const weightBrushRadiusRef = useRef(weightBrushRadius);
  weightBrushRadiusRef.current = weightBrushRadius;
  const weightBrushStrengthRef = useRef(weightBrushStrength);
  weightBrushStrengthRef.current = weightBrushStrength;
  const selectedBoneNameRef = useRef(selectedBoneName);
  selectedBoneNameRef.current = selectedBoneName;
  const showSkeletonRef = useRef(showSkeleton);
  showSkeletonRef.current = showSkeleton;
  const handleSelectBoneForPoseRef = useRef<(boneName: string) => void>(() => {});
  const showRigMarkersRef = useRef(showRigMarkers);
  showRigMarkersRef.current = showRigMarkers;
  const postureOffsetsRef = useRef(postureOffsets);
  postureOffsetsRef.current = postureOffsets;
  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;
  const physicsActiveRef = useRef(physicsActive);
  physicsActiveRef.current = physicsActive;
  const toolModeRef = useRef(toolMode);
  toolModeRef.current = toolMode;
  const brushColorRef = useRef(brushColor);
  brushColorRef.current = brushColor;
  const brushSizeRef = useRef(brushSize);
  brushSizeRef.current = brushSize;
  const variableBindingsRef = useRef(variableBindings);
  variableBindingsRef.current = variableBindings;
  const postBloomEnabledRef = useRef(postBloomEnabled || bloomEnabled);
  postBloomEnabledRef.current = postBloomEnabled || bloomEnabled;
  const dofEnabledRef = useRef(dofEnabled);
  dofEnabledRef.current = dofEnabled;
  const motionBlurEnabledRef = useRef(motionBlurEnabled);
  motionBlurEnabledRef.current = motionBlurEnabled;

  const flashBanner = useCallback((msg: string) => {
    setStatusBanner(msg);
    notifyActionRef.current(msg);
  }, []);

  // Auto-sync right Properties rail tab when top workspace tab changes
  useEffect(() => {
    if (suppressAutoPropTabRef.current) {
      suppressAutoPropTabRef.current = false;
      return;
    }
    if (activeWorkspaceTab === 'rigging') setActivePropTab('rig');
    else if (activeWorkspaceTab === 'lighting') setActivePropTab('lighting');
    else if (activeWorkspaceTab === 'guide' || activeWorkspaceTab === 'studio_notes') setActivePropTab('vfx');
    else if (activeWorkspaceTab === 'stage3' || activeWorkspaceTab === 'stage4') setActivePropTab('material');
    else if (activeWorkspaceTab === 'viewport') setActivePropTab('transform');
  }, [activeWorkspaceTab]);

  // Sync external lightingState from LightingStudioPage into Viewport3D
  useEffect(() => {
    if (!lightingState) return;
    setActiveHdri(lightingState.activeHdri);
    setEnvIntensity(lightingState.envIntensity);
    setBgAsEnvironment(lightingState.bgAsEnvironment);
    setEnvBlur(lightingState.envBlur);
    setLights(lightingState.lights);
    setToneMapping(lightingState.toneMapping);
    setExposure(lightingState.exposure);
    setShadowsEnabled(lightingState.shadowsEnabled);
    setResolution(lightingState.resolution);
    setTransparentBg(lightingState.transparentBg);
    setPostBloomEnabled(lightingState.bloomEnabled);
    setPostBloomStrength(lightingState.bloomStrength);
    setPostBloomThreshold(lightingState.bloomThreshold);
    setDofEnabled(lightingState.dofEnabled);
    setDofFocus(lightingState.dofFocus);
    setDofAperture(lightingState.dofAperture);
    setMotionBlurEnabled(lightingState.motionBlurEnabled);
    setMotionBlurDamp(lightingState.motionBlurDamp);
  }, [lightingState]);

  const syncUndoRedoFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  const applyPostureOffsets = useCallback(() => {
    const off = postureOffsetsRef.current;
    if (!off.spineBendDeg && !off.pelvisHeight && !off.armSpreadDeg) return;
    const bendRad = THREE.MathUtils.degToRad(off.spineBendDeg);
    const spreadRad = THREE.MathUtils.degToRad(off.armSpreadDeg);
    const tmpQ = new THREE.Quaternion();
    const euler = new THREE.Euler();
    for (const b of bonesRef.current) {
      if (b.name === 'pelvis' && off.pelvisHeight !== 0) {
        b.position.y += off.pelvisHeight;
      }
      if ((b.name === 'spine_01' || b.name === 'spine') && bendRad !== 0) {
        tmpQ.setFromEuler(euler.set(bendRad, 0, 0));
        b.quaternion.multiply(tmpQ);
      }
      if (b.name === 'upper_arm_L' && spreadRad !== 0) {
        tmpQ.setFromEuler(euler.set(0, 0, -spreadRad));
        b.quaternion.multiply(tmpQ);
      }
      if (b.name === 'upper_arm_R' && spreadRad !== 0) {
        tmpQ.setFromEuler(euler.set(0, 0, spreadRad));
        b.quaternion.multiply(tmpQ);
      }
    }
  }, []);
  const applyPostureOffsetsRef = useRef(applyPostureOffsets);
  applyPostureOffsetsRef.current = applyPostureOffsets;

  const solveAllActiveIk = useCallback(() => {
    if (!ikEnabledRef.current || !ikTargetsGroupRef.current || bonesRef.current.length === 0) return;
    const boneMap = new Map<string, THREE.Bone>();
    bonesRef.current.forEach((b) => boneMap.set(b.name, b));
    const wp = new THREE.Vector3();

    const pairs: { root: string; mid: string; end: string; target: string; pole: THREE.Vector3 }[] = [
      { root: 'upper_arm_L', mid: 'forearm_L', end: 'hand_L', target: 'IK_Hand_L', pole: new THREE.Vector3(0, 0, -1) },
      { root: 'upper_arm_R', mid: 'forearm_R', end: 'hand_R', target: 'IK_Hand_R', pole: new THREE.Vector3(0, 0, -1) },
      { root: 'thigh_L', mid: 'shin_L', end: 'foot_L', target: 'IK_Foot_L', pole: new THREE.Vector3(0, 0, 1) },
      { root: 'thigh_R', mid: 'shin_R', end: 'foot_R', target: 'IK_Foot_R', pole: new THREE.Vector3(0, 0, 1) },
    ];
    for (const p of pairs) {
      const tObj = ikTargetsGroupRef.current.getObjectByName(p.target);
      const rB = boneMap.get(p.root);
      const mB = boneMap.get(p.mid);
      const eB = boneMap.get(p.end);
      if (tObj && rB && mB && eB) {
        tObj.getWorldPosition(wp);
        solveTwoBoneIK(rB, mB, eB, wp, p.pole);
      }
    }
    if (floorContactEnabledRef.current) {
      enforceFloorContactOnLegs(boneMap, 0.05);
    }
  }, []);
  const solveAllActiveIkRef = useRef(solveAllActiveIk);
  solveAllActiveIkRef.current = solveAllActiveIk;

  const evaluateFrameNow = useCallback(() => {
    // Reset non-tracked bones cleanly before evaluating mixer + additive posture offsets
    for (const b of bonesRef.current) {
      const rest = restBoneTransformsRef.current.get(b.name);
      if (rest) {
        b.position.copy(rest.pos);
        b.quaternion.copy(rest.quat);
      }
    }
    if (mixerRef.current) {
      mixerRef.current.update(0);
    }
    applyPostureOffsetsRef.current();
    if (ikEnabledRef.current) {
      solveAllActiveIkRef.current();
    } else if (floorContactEnabledRef.current && bonesRef.current.length > 0) {
      const bMap = new Map<string, THREE.Bone>();
      bonesRef.current.forEach((b) => bMap.set(b.name, b));
      enforceFloorContactOnLegs(bMap, 0.05);
    }
  }, []);

  const refreshMorphTargets = useCallback(() => {
    const collected: MorphTargetItem[] = [];
    const scan = (root: THREE.Object3D | null) => {
      root?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          if (m.morphTargetDictionary && m.morphTargetInfluences) {
            Object.entries(m.morphTargetDictionary).forEach(([tName, idx]) => {
              collected.push({
                key: `${m.uuid}_${idx}`,
                meshId: m.uuid,
                meshName: m.name || 'Malha',
                targetName: tName,
                index: idx,
                value: m.morphTargetInfluences![idx] ?? 0,
              });
            });
          }
        }
      });
    };
    scan(modelRootRef.current);
    scan(splineGroupRef.current);
    setMorphTargets(collected);
  }, []);

  const syncSceneHierarchy = useCallback((assetNameOverride?: string) => {
    const items: SceneMeshItem[] = [];
    const scan = (root: THREE.Object3D | null, defaultCollection: string) => {
      if (!root) return;
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
            return;
          }
          const geo = m.geometry;
          const triCount = geo?.index
            ? Math.floor(geo.index.count / 3)
            : Math.floor((geo?.attributes?.position?.count || 0) / 3);
          const mat = Array.isArray(m.material) ? m.material[0] : m.material;
          items.push({
            id: m.uuid,
            name: m.name || 'Malha',
            triCount,
            visible: m.visible,
            renderVisible: m.userData.renderVisible !== false,
            locked: Boolean(m.userData.locked),
            collectionName: (m.userData.collectionName as string) || defaultCollection,
            materialName: mat?.name || 'Principled_BSDF',
          });
        }
      });
    };
    scan(modelRootRef.current, 'Personagem_Rig');
    scan(splineGroupRef.current, 'Objetos_3D');
    setSceneMeshes(items);
    const htmlRefs: HtmlReferenceSummary[] = [];
    if (splineGroupRef.current) {
      for (const ch of splineGroupRef.current.children) {
        if (ch.userData?.isHtml3d) {
          htmlRefs.push({
            id: ch.uuid,
            name: ch.name || 'Painel HTML 3D',
            visible: ch.visible,
          });
        }
      }
    }
    setHtmlReferences(htmlRefs);
    refreshMorphTargets();

    const totalTris = items.reduce((acc, i) => acc + i.triCount, 0);
    const matNames = new Set(items.map((i) => i.materialName));
    updateStatsRef.current({
      meshes: items.length,
      triangles: totalTris,
      materials: matNames.size,
      activeAssetName: assetNameOverride ?? activeAssetNameRef.current,
    });
  }, [refreshMorphTargets]);

  const extractAndPushUvs = useCallback(
    (root: THREE.Object3D, sourceType: 'glb' | 'obj' | 'stl' | 'auto') => {
      importSerialRef.current += 1;
      const serial = importSerialRef.current;
      const extracted: ImportedUvMesh[] = [];

      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
            return;
          }
          const edges = extractUvEdgesFromMesh(m);
          const geo = m.geometry;
          const triCount = geo?.index
            ? Math.floor(geo.index.count / 3)
            : Math.floor((geo?.attributes?.position?.count || 0) / 3);
          const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial | undefined;
          let textures: ExtractedGlbTextures | undefined;
          if (sourceType === 'glb' && mat) {
            const baseColor = textureToDataUrl(mat.map);
            const normal = textureToDataUrl(mat.normalMap);
            const roughness = textureToDataUrl(mat.roughnessMap);
            const metallic = textureToDataUrl(mat.metalnessMap);
            const ao = textureToDataUrl(mat.aoMap);
            const emissive = textureToDataUrl(mat.emissiveMap);
            if (baseColor || normal || roughness || metallic || ao || emissive) {
              textures = { baseColor, normal, roughness, metallic, ao, emissive };
            }
          }
          extracted.push({
            name: m.name || `Malha_${extracted.length + 1}`,
            uvEdges: edges,
            triCount,
            sourceType,
            importSerial: serial,
            materialName: mat?.name || m.name || 'Material_PBR',
            textures,
          });
        }
      });

      onImportedUvsRef.current(extracted.length > 0 ? extracted : null);
    },
    []
  );

  const frameCameraToScene = useCallback(() => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    const model = modelRootRef.current;
    const splines = splineGroupRef.current;
    if (!cam || !ctrl) return;

    const box = new THREE.Box3();
    if (selectedObjectRef.current && selectedObjectRef.current.visible) {
      box.expandByObject(selectedObjectRef.current);
    } else {
      if (model && model.visible) box.expandByObject(model);
      if (splines && splines.children.length > 0) box.expandByObject(splines);
    }
    if (box.isEmpty()) {
      box.set(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1.8, 0.5));
    }
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    const radius = Math.max(sphere.radius, 0.35);
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(cam.fov * 0.5));
    ctrl.target.copy(sphere.center);
    cam.position.set(
      sphere.center.x + dist * 0.68,
      sphere.center.y + dist * 0.36,
      sphere.center.z + dist * 0.78
    );
    cam.near = Math.max(0.01, radius * 0.02);
    cam.far = Math.max(80, radius * 40);
    cam.updateProjectionMatrix();
    ctrl.update();
  }, []);

  const setCameraPreset = useCallback((preset: CameraPreset) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const target = ctrl.target.clone();
    const d = cam.position.distanceTo(target) || 2.8;
    if (preset === 'front') cam.position.set(target.x, target.y, target.z + d);
    else if (preset === 'back') cam.position.set(target.x, target.y, target.z - d);
    else if (preset === 'side') cam.position.set(target.x + d, target.y, target.z);
    else if (preset === 'left') cam.position.set(target.x - d, target.y, target.z);
    else if (preset === 'top') cam.position.set(target.x, target.y + d, target.z + 0.01);
    else if (preset === 'bottom') cam.position.set(target.x, target.y - d, target.z + 0.01);
    else cam.position.set(target.x + d * 0.62, target.y + d * 0.35, target.z + d * 0.72);
    ctrl.update();
  }, []);

  const dollyCamera = useCallback((factor: number) => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    const offset = cam.position.clone().sub(ctrl.target);
    const nextDist = THREE.MathUtils.clamp(offset.length() * factor, 0.45, 30);
    offset.normalize().multiplyScalar(nextDist);
    cam.position.copy(ctrl.target).add(offset);
    ctrl.update();
  }, []);

  const refreshWeightHeatmapForScene = useCallback((active: boolean, targetBone?: string | null) => {
    const boneIdx = Math.max(
      0,
      bonesRef.current.findIndex((b) => b.name === (targetBone ?? selectedBoneNameRef.current))
    );
    modelRootRef.current?.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
        const sm = obj as THREE.SkinnedMesh;
        if (active) {
          if (!sm.userData._preWeightMat) {
            sm.userData._preWeightMat = sm.material;
          }
          updateMeshWeightHeatmapColors(sm, boneIdx);
          if (!sm.userData._weightHeatmapMat) {
            sm.userData._weightHeatmapMat = new THREE.MeshStandardMaterial({
              vertexColors: true,
              roughness: 0.55,
              metalness: 0.05,
            });
          }
          sm.material = sm.userData._weightHeatmapMat;
        } else if (sm.userData._preWeightMat) {
          sm.material = sm.userData._preWeightMat;
          delete sm.userData._preWeightMat;
        }
      }
    });
  }, []);

  const syncSelectedInspectorFromObject = useCallback((obj: THREE.Object3D | null) => {
    selectedObjectRef.current = obj;
    setSelectedMeshId(obj ? obj.uuid : null);
    const isBone = Boolean(obj && (obj as THREE.Bone).isBone);
    setSelectedBoneName(isBone ? obj!.name : null);
    skeletonVisualizerRef.current?.setSelectedBone(isBone ? obj!.name : null);

    if (outlinePassRef.current) {
      if (!obj || obj.userData.isRigMarker || obj.userData.isIkTarget || isBone) {
        outlinePassRef.current.selectedObjects = [];
      } else {
        const outlines: THREE.Object3D[] = [];
        obj.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) outlines.push(c);
        });
        outlinePassRef.current.selectedObjects = outlines.length > 0 ? outlines.slice(0, 16) : [obj];
      }
    }

    if (isBone && weightPaintActiveRef.current) {
      refreshWeightHeatmapForScene(true, obj!.name);
    }

    if (!obj) {
      setSelectedInspector(null);
      setActiveTextureMaps({});
      transformRef.current?.detach();
      return;
    }

    let matSourceMesh: THREE.Mesh | undefined = (obj as THREE.Mesh).isMesh
      ? (obj as THREE.Mesh)
      : undefined;
    if (!matSourceMesh) {
      obj.traverse((c) => {
        if (!matSourceMesh && (c as THREE.Mesh).isMesh && (c as THREE.Mesh).material) {
          matSourceMesh = c as THREE.Mesh;
        }
      });
    }
    const rawMat = matSourceMesh?.material;
    const mat = (Array.isArray(rawMat) ? rawMat[0] : rawMat) as THREE.MeshPhysicalMaterial | undefined;
    const colorHex = mat?.color ? `#${mat.color.getHexString()}` : '#f97316';
    const roughnessVal = mat?.roughness ?? 0.35;
    const metalnessVal = mat?.metalness ?? 0.2;

    setSelectedColor(colorHex);
    setSelectedRoughness(roughnessVal);
    setSelectedMetalness(metalnessVal);
    setActiveTextureMaps(
      mat
        ? {
            baseColor: textureToDataUrl(mat.map),
            normal: textureToDataUrl(mat.normalMap),
            roughness: textureToDataUrl(mat.roughnessMap),
            metallic: textureToDataUrl(mat.metalnessMap),
            emissive: textureToDataUrl(mat.emissiveMap),
            ao: textureToDataUrl(mat.aoMap),
          }
        : {}
    );

    const savedFx = obj.userData.shaderEffect || DEFAULT_REACTIVE_SHADER;
    reactiveUniformsRef.current.uEffectMode.value = effectToModeInt(savedFx.effect);
    reactiveUniformsRef.current.uEffectIntensity.value = savedFx.intensity;
    reactiveUniformsRef.current.uEffectColor.value.set(savedFx.color);
    reactiveUniformsRef.current.uEffectSpeed.value = savedFx.speed;

    setSelectedInspector({
      id: obj.uuid,
      name: obj.name || 'Objeto 3D',
      isPrimitive: Boolean(obj.userData.isSplinePrimitive),
      position: [obj.position.x, obj.position.y, obj.position.z],
      rotationDeg: [
        THREE.MathUtils.radToDeg(obj.rotation.x),
        THREE.MathUtils.radToDeg(obj.rotation.y),
        THREE.MathUtils.radToDeg(obj.rotation.z),
      ],
      scale: [obj.scale.x, obj.scale.y, obj.scale.z],
      materialStyle: (obj.userData.materialStyle as SplineMaterialStyle) || 'physical',
      color: colorHex,
      roughness: roughnessVal,
      metalness: metalnessVal,
      transmission: mat?.transmission ?? 0,
      emissiveIntensity: mat?.emissiveIntensity ?? 0,
      interaction: (obj.userData.interaction as SelectedObjectInspector['interaction']) || 'none',
      physicsEnabled: Boolean(obj.userData.physicsEnabled),
      rigidBodyMode: (obj.userData.rigidBodyMode as RigidBodyMode) || (obj.userData.physicsEnabled ? 'dynamic' : 'none'),
      shaderEffect: savedFx,
    });

    const tc = transformRef.current;
    if (
      tc &&
      (toolModeRef.current === 'translate' ||
        toolModeRef.current === 'rotate' ||
        toolModeRef.current === 'scale')
    ) {
      tc.setMode(toolModeRef.current);
      tc.attach(obj);
    }
  }, [refreshWeightHeatmapForScene]);

  const syncSelectedInspectorRef = useRef(syncSelectedInspectorFromObject);
  syncSelectedInspectorRef.current = syncSelectedInspectorFromObject;

  const setWeightPaintMode = useCallback(
    (nextActive: boolean) => {
      if (nextActive && bonesRef.current.length === 0) {
        flashBanner('Aplique o Auto-Rig antes de usar a Pintura de Pesos.');
        return;
      }
      setWeightPaintActive(nextActive);
      weightPaintActiveRef.current = nextActive;
      refreshWeightHeatmapForScene(nextActive);
      if (nextActive) {
        setToolMode('weight_paint');
        setInteractionMode('weight_paint');
        transformRef.current?.detach();
        flashBanner('Pintura de Pesos (Mapa de Calor Azul → Vermelho) ativa!');
      } else if (toolModeRef.current === 'weight_paint') {
        setToolMode('orbit');
        setInteractionMode('object');
      }
    },
    [flashBanner, refreshWeightHeatmapForScene]
  );

  const selectToolModeWithTarget = useCallback(
    (nextMode: SplineToolMode) => {
      let resolvedMode = nextMode;
      if (
        nextMode === 'paint' &&
        bonesRef.current.length > 0 &&
        (activeWorkspaceTab === 'rigging' || interactionMode === 'pose' || interactionMode === 'weight_paint')
      ) {
        resolvedMode = 'weight_paint';
      }

      setToolMode(resolvedMode);
      if (resolvedMode === 'weight_paint') {
        setWeightPaintMode(true);
        return;
      } else if (weightPaintActiveRef.current) {
        setWeightPaintMode(false);
      }

      if (
        (resolvedMode === 'translate' || resolvedMode === 'rotate' || resolvedMode === 'scale') &&
        !selectedObjectRef.current
      ) {
        let fallbackObj: THREE.Object3D | null = null;
        if (splineGroupRef.current && splineGroupRef.current.children.length > 0) {
          fallbackObj = splineGroupRef.current.children[0];
        } else if (modelRootRef.current) {
          modelRootRef.current.traverse((o) => {
            if (!fallbackObj && (o as THREE.Mesh).isMesh) fallbackObj = o;
          });
          if (!fallbackObj) fallbackObj = modelRootRef.current;
        }
        if (fallbackObj) {
          syncSelectedInspectorFromObject(fallbackObj);
        }
      }
    },
    [activeWorkspaceTab, interactionMode, setWeightPaintMode, syncSelectedInspectorFromObject]
  );

  const loadModelFromFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || !sceneRef.current) return;
      setIsImporting(true);
      const createdBlobUrls: string[] = [];
      let dracoLoader: DRACOLoader | null = null;

      try {
        const assetUrlMap = new Map<string, string>();
        const registerAssetBlob = (pathKey: string, blob: Blob) => {
          const blobUrl = URL.createObjectURL(blob);
          createdBlobUrls.push(blobUrl);
          const clean = pathKey.replace(/^\.?\//, '').replace(/\\/g, '/').toLowerCase();
          assetUrlMap.set(clean, blobUrl);
          const base = clean.split('/').pop();
          if (base && !assetUrlMap.has(base)) {
            assetUrlMap.set(base, blobUrl);
          }
          return blobUrl;
        };

        let targetFile: File | null = null;
        let mtlFileText: string | null = null;

        const zipFile = files.find((f) => f.name.toLowerCase().endsWith('.zip'));
        if (zipFile) {
          const zip = await JSZip.loadAsync(zipFile);
          const entries = Object.values(zip.files).filter((zf) => !zf.dir);
          const modelEntry = entries.find((zf) => /\.(glb|gltf|fbx|obj|stl)$/i.test(zf.name));
          if (!modelEntry) {
            flashBanner('Nenhum arquivo .glb, .gltf, .fbx, .obj ou .stl encontrado no ZIP.');
            return;
          }
          for (const zf of entries) {
            const blob = await zf.async('blob');
            registerAssetBlob(zf.name, blob);
            if (zf === modelEntry) {
              targetFile = new File([blob], zf.name.split('/').pop() || 'modelo.glb');
            } else if (/\.mtl$/i.test(zf.name) && !mtlFileText) {
              mtlFileText = await zf.async('text');
            }
          }
        } else {
          files.forEach((f) => registerAssetBlob(f.name, f));
          targetFile =
            files.find((f) => /\.(glb|gltf|fbx|obj|stl)$/i.test(f.name)) ?? files[0];
          const mtlFile = files.find((f) => /\.mtl$/i.test(f.name));
          if (mtlFile) mtlFileText = await mtlFile.text();
        }

        if (!targetFile) {
          flashBanner('Selecione um arquivo .glb, .gltf, .fbx, .obj, .stl ou .zip.');
          return;
        }

        const ext = targetFile.name.toLowerCase().split('.').pop() || '';
        const targetUrl =
          assetUrlMap.get(targetFile.name.toLowerCase()) ||
          registerAssetBlob(targetFile.name, targetFile);

        const manager = new THREE.LoadingManager();
        manager.setURLModifier((requestedUrl) => {
          if (requestedUrl.startsWith('blob:') || requestedUrl.startsWith('data:')) {
            return requestedUrl;
          }
          const cleaned = decodeURIComponent(requestedUrl)
            .split('?')[0]
            .replace(/^\.?\//, '')
            .replace(/\\/g, '/')
            .toLowerCase();
          if (assetUrlMap.has(cleaned)) return assetUrlMap.get(cleaned)!;
          const base = cleaned.split('/').pop() || '';
          if (assetUrlMap.has(base)) return assetUrlMap.get(base)!;
          return requestedUrl;
        });

        let loadedGroup = new THREE.Group();
        let clips: THREE.AnimationClip[] = [];
        let srcType: 'glb' | 'obj' | 'stl' = 'glb';

        if (ext === 'glb' || ext === 'gltf') {
          srcType = 'glb';
          const loader = new GLTFLoader(manager);
          dracoLoader = new DRACOLoader(manager);
          dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
          loader.setDRACOLoader(dracoLoader);
          const gltf = await loader.loadAsync(targetUrl);
          loadedGroup = gltf.scene || new THREE.Group();
          clips = gltf.animations || [];
        } else if (ext === 'fbx') {
          srcType = 'glb';
          const fbxLoader = new FBXLoader(manager);
          const fbxObj = await fbxLoader.loadAsync(targetUrl);
          loadedGroup = fbxObj;
          clips = fbxObj.animations || [];
        } else if (ext === 'obj') {
          srcType = 'obj';
          const text = await targetFile.text();
          const objLoader = new OBJLoader(manager);
          if (mtlFileText) {
            const materials = new MTLLoader(manager).parse(mtlFileText, '');
            materials.preload();
            objLoader.setMaterials(materials);
          }
          loadedGroup = objLoader.parse(text);
        } else if (ext === 'stl') {
          srcType = 'stl';
          const buf = await targetFile.arrayBuffer();
          const geo = new STLLoader().parse(buf);
          geo.computeVertexNormals();
          const mesh = new THREE.Mesh(
            geo,
            new THREE.MeshPhysicalMaterial({ color: '#cbd5e1', roughness: 0.35, metalness: 0.2 })
          );
          mesh.name = targetFile.name.replace(/\.[^.]+$/, '');
          loadedGroup.add(mesh);
        } else {
          flashBanner(`Formato não suportado: .${ext} (use .glb, .gltf, .fbx, .obj, .stl ou .zip).`);
          return;
        }

        // Normalize imported model scale & place bottom-center at y=0
        loadedGroup.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(loadedGroup);
        if (!box.isEmpty()) {
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z, 1e-4);
          const targetHeight = 1.8;
          const scale = targetHeight / maxDim;
          loadedGroup.scale.multiplyScalar(scale);
          loadedGroup.updateMatrixWorld(true);

          const normBox = new THREE.Box3().setFromObject(loadedGroup);
          const center = new THREE.Vector3();
          normBox.getCenter(center);
          loadedGroup.position.x -= center.x;
          loadedGroup.position.z -= center.z;
          loadedGroup.position.y -= normBox.min.y;
        }

        let firstMesh: THREE.Mesh | null = null;
        loadedGroup.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            m.castShadow = true;
            m.receiveShadow = true;
            m.userData.isImported = true;
            if (!firstMesh) firstMesh = m;
          }
        });

        // Clean up previous model cleanly
        const scene = sceneRef.current;
        transformRef.current?.detach();
        undoStackRef.current = [];
        redoStackRef.current = [];
        paintSnapshotsRef.current.clear();

        skeletonVisualizerRef.current?.setBones([], true);
        skeletonVisualizerRef.current?.setSelectedBone(null);
        if (modelRootRef.current) {
          scene.remove(modelRootRef.current);
          disposeObject3D(modelRootRef.current);
        }

        const cleanName = targetFile.name.replace(/\.[^.]+$/, '') || 'Modelo_Importado';
        loadedGroup.name = cleanName;
        modelRootRef.current = loadedGroup;
        scene.add(loadedGroup);

        setHideDefaultBase(false);
        setActiveAssetName(cleanName);
        activeAssetNameRef.current = cleanName;
        onImportedModelFileRef.current(targetFile);

        // Ensure UV exists if missing
        let hasAnyUv = false;
        loadedGroup.traverse((o) => {
          if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).geometry?.attributes?.uv) {
            hasAnyUv = true;
          }
        });
        if (!hasAnyUv) {
          autoGenerateUvsForGroup(loadedGroup);
        }
        extractAndPushUvs(loadedGroup, srcType);

        // Detect existing skeleton & bones in imported GLB/glTF
        const detectedBones: THREE.Bone[] = [];
        let detectedSkeleton: THREE.Skeleton | null = null;
        loadedGroup.traverse((o) => {
          if ((o as THREE.Bone).isBone) {
            detectedBones.push(o as THREE.Bone);
          }
          if (!detectedSkeleton && (o as THREE.SkinnedMesh).isSkinnedMesh) {
            detectedSkeleton = (o as THREE.SkinnedMesh).skeleton ?? null;
          }
        });
        bonesRef.current = detectedBones;
        skeletonRef.current = detectedSkeleton;
        restBoneTransformsRef.current = new Map(
          detectedBones.map((b) => [b.name, { pos: b.position.clone(), quat: b.quaternion.clone() }])
        );
        setRiggedBoneNames(detectedBones.map((b) => b.name || 'Bone'));
        setRiggedBoneTree(buildBoneHierarchy(detectedBones));
        setSelectedBoneName(null);
        updateStatsRef.current({ bones: detectedBones.length });

        skeletonVisualizerRef.current?.setBones(detectedBones, true);
        skeletonVisualizerRef.current?.setSelectedBone(null);
        if (detectedBones.length > 0) {
          skeletonVisualizerRef.current?.setVisible(showSkeletonRef.current);
        }

        // Setup animations if present
        if (mixerRef.current) {
          mixerRef.current.stopAllAction();
          mixerRef.current = null;
        }
        activeActionRef.current = null;
        overlayActionRef.current = null;
        clipsRef.current = clips;
        const nextPool = new Map<string, THREE.AnimationClip>();
        clips.forEach((c) => nextPool.set((c.name || '').toLowerCase(), c));
        clipPoolMapRef.current = nextPool;
        setClipNames(clips.map((c) => c.name || 'Clipe'));
        setActiveClipIdx(0);
        setActiveClipId(clips[0]?.name || 'chest_open');
        setAnimProgress(0);
        setAnimDuration(clips[0]?.duration ?? 0);
        setActiveClipTracks(
          (clips[0]?.tracks ?? []).map((tr) => ({
            name: tr.name,
            times: Array.from(tr.times),
            values: Array.from(tr.values),
            type: tr.ValueTypeName === 'quaternion' ? 'quaternion' : 'vector',
          }))
        );
        if (clips.length > 0) {
          const mixer = new THREE.AnimationMixer(loadedGroup);
          mixerRef.current = mixer;
          const act = mixer.clipAction(clips[0]);
          act.setLoop(animLoopRef.current ? THREE.LoopRepeat : THREE.LoopOnce, animLoopRef.current ? Infinity : 1);
          act.clampWhenFinished = !animLoopRef.current;
          act.play();
          activeActionRef.current = act;
          setIsPlaying(true);
        } else {
          setIsPlaying(false);
        }

        loadedGroup.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            const mats = Array.isArray(m.material) ? m.material : [m.material];
            mats.forEach((mt) => attachReactiveShaderToMaterial(mt, reactiveUniformsRef.current));
          }
        });

        syncSceneHierarchy(cleanName);
        refreshMorphTargets();
        syncUndoRedoFlags();
        frameCameraToScene();
        // Auto-select first imported mesh so the user can immediately move/rotate/scale/edit materials
        syncSelectedInspectorFromObject(firstMesh ?? loadedGroup);
        flashBanner(`Modelo carregado: ${targetFile.name} — clique para mover, girar ou editar PBR.`);
      } catch (err) {
        flashBanner(err instanceof Error ? err.message : 'Falha ao carregar modelo 3D.');
      } finally {
        dracoLoader?.dispose();
        createdBlobUrls.forEach((u) => URL.revokeObjectURL(u));
        setIsImporting(false);
      }
    },
    [extractAndPushUvs, flashBanner, frameCameraToScene, refreshMorphTargets, syncSceneHierarchy, syncSelectedInspectorFromObject, syncUndoRedoFlags]
  );

  // Consume pending files triggered from Hub view
  useEffect(() => {
    if (pendingImportFiles && pendingImportFiles.length > 0) {
      loadModelFromFiles(pendingImportFiles).finally(() => {
        onConsumedPendingImportRef.current();
      });
    }
  }, [pendingImportFiles, loadModelFromFiles]);

  const sampleClipTracks = useCallback((clip: THREE.AnimationClip | null) => {
    if (!clip) {
      setActiveClipTracks([]);
      return;
    }
    setActiveClipTracks(
      clip.tracks.map((tr) => ({
        name: tr.name,
        times: Array.from(tr.times),
        values: Array.from(tr.values),
        type: tr.ValueTypeName === 'quaternion' ? 'quaternion' : 'vector',
      }))
    );
  }, []);

  const playClipInstance = useCallback(
    (rawClip: THREE.AnimationClip, idx: number, clipId: string, shouldLoop?: boolean) => {
      const mixer = mixerRef.current;
      if (!mixer) return;
      let playClip = rawClip;
      if (mirrorClipRef.current) playClip = mirrorClipLeftRight(playClip);
      if (reverseClipRef.current) playClip = reverseAnimationClip(playClip);
      if (inPlaceClipRef.current) {
        playClip = lockClipInPlace(playClip, restBoneTransformsRef.current.get('pelvis')?.pos);
      }
      const prevAction = activeActionRef.current;
      const nextAction = mixer.clipAction(playClip);
      nextAction.reset();
      const useLoop = shouldLoop ?? animLoopRef.current;
      nextAction.setLoop(useLoop ? THREE.LoopRepeat : THREE.LoopOnce, useLoop ? Infinity : 1);
      nextAction.clampWhenFinished = !useLoop;
      nextAction.setEffectiveWeight(1);
      nextAction.play();
      if (prevAction && prevAction !== nextAction) {
        if (prevAction.isRunning()) {
          prevAction.crossFadeTo(nextAction, 0.18, false);
        } else {
          prevAction.stop();
        }
      }
      activeActionRef.current = nextAction;
      setActiveClipIdx(idx);
      setActiveClipId(clipId);
      setAnimDuration(playClip.duration);
      setAnimProgress(0);
      sampleClipTracks(playClip);
      setIsPlaying(true);
      evaluateFrameNow();
    },
    [evaluateFrameNow, sampleClipTracks]
  );

  const rebuildRigMarkers = useCallback((show: boolean) => {
    const scene = sceneRef.current;
    const group = modelRootRef.current;
    if (!scene || !group) return;

    if (!show) {
      if (rigMarkersGroupRef.current) {
        if (selectedObjectRef.current?.userData?.isRigMarker) {
          transformRef.current?.detach();
          syncSelectedInspectorFromObject(null);
        }
        rigMarkersGroupRef.current.visible = false;
      }
      return;
    }

    let markersGroup = rigMarkersGroupRef.current;
    if (!markersGroup) {
      markersGroup = new THREE.Group();
      markersGroup.name = 'ActionForge_RigMarkers';
      const defaults = computeDefaultRigMarkers(group);
      markerCenterXRef.current = defaults.pelvis.x;
      for (const def of RIG_MARKER_DEFS) {
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.036, 16, 14),
          new THREE.MeshBasicMaterial({
            color: def.color,
            depthTest: false,
            transparent: true,
            opacity: 0.92,
          })
        );
        sphere.name = `Marker_${def.id}`;
        sphere.renderOrder = 1000;
        sphere.position.copy(defaults[def.id]);
        sphere.userData = {
          isRigMarker: true,
          markerId: def.id,
          mirrorPartner: def.mirrorPartner,
        };
        markersGroup.add(sphere);
      }
      scene.add(markersGroup);
      rigMarkersGroupRef.current = markersGroup;
    }
    markersGroup.position.copy(group.position);
    markersGroup.quaternion.copy(group.quaternion);
    markersGroup.scale.copy(group.scale);
    markersGroup.visible = true;
  }, [syncSelectedInspectorFromObject]);

  const handleToggleRigMarkers = useCallback(() => {
    setShowRigMarkers((prev) => {
      const next = !prev;
      rebuildRigMarkers(next);
      if (next) {
        selectToolModeWithTarget('translate');
        flashBanner('Marcadores 3D ativos — arraste as esferas nas juntas e clique em Vincular Esqueleto.');
      }
      return next;
    });
  }, [flashBanner, rebuildRigMarkers, selectToolModeWithTarget]);

  const handleRunAutoRig = useCallback(
    (presetOverride?: RigPreset, initialClipId?: string) => {
      const group = modelRootRef.current;
      const scene = sceneRef.current;
      if (!group || !scene) return;

      // Stop any running animation before recomputing skin weights so bones reset cleanly to rest pose
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
      activeActionRef.current = null;
      overlayActionRef.current = null;
      transformRef.current?.detach();
      syncSelectedInspectorFromObject(null);

      // Gather custom marker positions in group-local space if markers were created
      let customMarkers: Partial<Record<RigMarkerId, THREE.Vector3>> | undefined;
      if (rigMarkersGroupRef.current && rigMarkersGroupRef.current.children.length > 0) {
        customMarkers = {};
        for (const child of rigMarkersGroupRef.current.children) {
          const id = child.userData.markerId as RigMarkerId | undefined;
          if (id) customMarkers[id] = child.position.clone();
        }
      }

      const preset = presetOverride ?? config.rigPreset;
      const res = autoRigAndAnimateGroup(group, preset, customMarkers);

      skeletonVisualizerRef.current?.setBones(res.bones, true);
      skeletonVisualizerRef.current?.setVisible(true);
      skeletonVisualizerRef.current?.setSelectedBone(null);
      setShowSkeleton(true);

      skeletonRef.current = res.skeleton;
      bonesRef.current = res.bones;
      restBoneTransformsRef.current = new Map(
        res.bones.map((b) => [b.name, { pos: b.position.clone(), quat: b.quaternion.clone() }])
      );
      setRiggedBoneNames(res.bones.map((b) => b.name));
      setRiggedBoneTree(buildBoneHierarchy(res.bones));
      setSelectedBoneName(null);

      const mixer = new THREE.AnimationMixer(group);
      mixerRef.current = mixer;
      clipsRef.current = res.clips;
      const nextPool = new Map<string, THREE.AnimationClip>();
      res.clips.forEach((c) => nextPool.set(c.name.toLowerCase(), c));
      clipPoolMapRef.current = nextPool;

      setClipNames(res.clips.map((c) => c.name));

      const targetId = (initialClipId || activeClipId || 'chest_open').toLowerCase();
      let startIdx = res.clips.findIndex((c) => c.name.toLowerCase() === targetId);
      if (startIdx < 0) startIdx = 0;

      if (res.clips.length > 0) {
        const startClip = res.clips[startIdx];
        const def = ACTIONFORGE_CLIPS.find((c) => c.id === startClip.name.toLowerCase());
        const useLoop = def ? def.loop : animLoopRef.current;
        setAnimLoop(useLoop);
        animLoopRef.current = useLoop;
        playClipInstance(startClip, startIdx, startClip.name, useLoop);
      } else {
        setIsPlaying(false);
      }

      updateStatsRef.current({ bones: res.boneCount });
      syncSceneHierarchy();
      flashBanner(`Auto-Rig ${RIG_PRESET_DEFINITIONS[preset].shortLabel} (${res.boneCount} ossos · ${res.clips.length} clipes) ativo!`);
    },
    [activeClipId, config.rigPreset, flashBanner, playClipInstance, syncSceneHierarchy, syncSelectedInspectorFromObject]
  );

  const handleResetPose = useCallback(() => {
    setIsPlaying(false);
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current.update(0);
    }
    setPostureOffsets({ spineBendDeg: 0, pelvisHeight: 0, armSpreadDeg: 0 });
    if (skeletonRef.current) {
      skeletonRef.current.pose();
    } else {
      bonesRef.current.forEach((b) => {
        b.rotation.set(0, 0, 0);
      });
    }
    setAnimProgress(0);
    if (selectedObjectRef.current && (selectedObjectRef.current as THREE.Bone).isBone) {
      syncSelectedInspectorFromObject(selectedObjectRef.current);
    }
    flashBanner('Pose restaurada para posição neutra (Rest Pose).');
  }, [flashBanner, syncSelectedInspectorFromObject]);

  const handleRemoveRig = useCallback(() => {
    const group = modelRootRef.current;
    const scene = sceneRef.current;
    if (!group || !scene) return;

    setIsPlaying(false);
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    activeActionRef.current = null;
    overlayActionRef.current = null;
    transformRef.current?.detach();
    syncSelectedInspectorFromObject(null);

    skeletonVisualizerRef.current?.setBones([], true);
    skeletonVisualizerRef.current?.setSelectedBone(null);
    if (rigMarkersGroupRef.current) {
      scene.remove(rigMarkersGroupRef.current);
      disposeObject3D(rigMarkersGroupRef.current);
      rigMarkersGroupRef.current = null;
      setShowRigMarkers(false);
    }

    const revertedCount = removeAutoRigFromGroup(group);
    skeletonRef.current = null;
    bonesRef.current = [];
    restBoneTransformsRef.current.clear();
    clipsRef.current = [];
    clipPoolMapRef.current.clear();
    setClipNames([]);
    setActiveClipTracks([]);
    setRiggedBoneNames([]);
    setRiggedBoneTree([]);
    setSelectedBoneName(null);
    setShowSkeleton(false);
    setAnimProgress(0);
    setAnimDuration(0);
    updateStatsRef.current({ bones: 0 });
    syncSceneHierarchy();
    flashBanner(
      revertedCount > 0
        ? `Rig removido de ${revertedCount} malha(s).`
        : 'Armature e clipes removidos da cena.'
    );
  }, [flashBanner, syncSceneHierarchy, syncSelectedInspectorFromObject]);

  const handleSelectBoneForPose = useCallback(
    (boneName: string) => {
      const bone = bonesRef.current.find((b) => b.name === boneName);
      if (!bone) return;
      setIsPlaying(false);
      if (toolModeRef.current === 'orbit' || toolModeRef.current === 'paint') {
        toolModeRef.current = 'rotate';
        setToolMode('rotate');
      }
      setInteractionMode('pose');
      syncSelectedInspectorFromObject(bone);
      skeletonVisualizerRef.current?.setSelectedBone(bone.name);
      setShowSkeleton(true);
      flashBanner(`Osso selecionado: ${boneName} — W Mover · E Girar · K Gravar Key ◆.`);
    },
    [flashBanner, syncSelectedInspectorFromObject]
  );
  handleSelectBoneForPoseRef.current = handleSelectBoneForPose;

  const handleSelectClip = useCallback(
    (idxOrId: number | string, skipHashSync = false) => {
      const resolveAndPlay = () => {
        if (typeof idxOrId === 'number') {
          const clip = clipsRef.current[idxOrId];
          if (!clip) return;
          const def = ACTIONFORGE_CLIPS.find((c) => c.id === clip.name.toLowerCase());
          const useLoop = def ? def.loop : animLoopRef.current;
          setAnimLoop(useLoop);
          animLoopRef.current = useLoop;
          playClipInstance(clip, idxOrId, clip.name, useLoop);
          if (!skipHashSync) {
            try {
              window.history.replaceState(null, '', `#clip=${clip.name}`);
            } catch {
              // ignore
            }
          }
          return;
        }
        const slug = idxOrId.trim().toLowerCase();
        const idx = clipsRef.current.findIndex(
          (c) => c.name.toLowerCase() === slug || c.name.toLowerCase().replace(/\s+/g, '_') === slug
        );
        if (idx >= 0) {
          const clip = clipsRef.current[idx];
          const def = ACTIONFORGE_CLIPS.find((c) => c.id === clip.name.toLowerCase());
          const useLoop = def ? def.loop : animLoopRef.current;
          setAnimLoop(useLoop);
          animLoopRef.current = useLoop;
          playClipInstance(clip, idx, clip.name, useLoop);
          if (!skipHashSync) {
            try {
              window.history.replaceState(null, '', `#clip=${clip.name}`);
            } catch {
              // ignore
            }
          }
        }
      };

      if (clipsRef.current.length === 0) {
        const targetId = typeof idxOrId === 'string' ? idxOrId : 'chest_open';
        handleRunAutoRig(undefined, targetId);
        if (!skipHashSync) {
          try {
            window.history.replaceState(null, '', `#clip=${targetId}`);
          } catch {
            // ignore
          }
        }
        return;
      }
      resolveAndPlay();
    },
    [handleRunAutoRig, playClipInstance]
  );

  const handleStopAnimation = useCallback(() => {
    setIsPlaying(false);
    const mixer = mixerRef.current;
    const act = activeActionRef.current;
    if (act && mixer) {
      act.reset();
      act.time = 0;
      act.paused = false;
    }
    setAnimProgress(0);
    evaluateFrameNow();
  }, [evaluateFrameNow]);

  const handleSeekNormalized = useCallback(
    (p: number) => {
      const clamped = THREE.MathUtils.clamp(p, 0, 1);
      setAnimProgress(clamped);
      const act = activeActionRef.current;
      if (act && mixerRef.current) {
        act.paused = false;
        act.time = clamped * act.getClip().duration;
        evaluateFrameNow();
      }
    },
    [evaluateFrameNow]
  );

  const handleStepFrame = useCallback(
    (deltaFrames: number) => {
      setIsPlaying(false);
      const dur = Math.max(animDuration, 0.1);
      const totalFrames = Math.max(1, dur * 30);
      const nextP = THREE.MathUtils.clamp(animProgress + deltaFrames / totalFrames, 0, 1);
      handleSeekNormalized(nextP);
    },
    [animDuration, animProgress, handleSeekNormalized]
  );

  const handleSetPlayRange = useCallback(
    (inPct: number, outPct: number) => {
      const clampedIn = THREE.MathUtils.clamp(inPct, 0, 0.96);
      const clampedOut = THREE.MathUtils.clamp(outPct, clampedIn + 0.04, 1);
      setAnimInPoint(clampedIn);
      setAnimOutPoint(clampedOut);
      animInPointRef.current = clampedIn;
      animOutPointRef.current = clampedOut;
      if (animProgress < clampedIn || animProgress > clampedOut) {
        handleSeekNormalized(clampedIn);
      }
      flashBanner(
        `Trecho definido: ${Math.round(clampedIn * 100)}% – ${Math.round(clampedOut * 100)}%`
      );
    },
    [animProgress, flashBanner, handleSeekNormalized]
  );

  const handleResetPlayRange = useCallback(() => {
    setAnimInPoint(0);
    setAnimOutPoint(1);
    animInPointRef.current = 0;
    animOutPointRef.current = 1;
    flashBanner('Trecho In/Out restaurado para clipe completo.');
  }, [flashBanner]);

  const handleToggleMirrorClip = useCallback(() => {
    setMirrorClip((prev) => {
      const next = !prev;
      mirrorClipRef.current = next;
      const cur = clipsRef.current[activeClipIdx];
      if (cur && mixerRef.current) {
        playClipInstance(cur, activeClipIdx, cur.name, animLoopRef.current);
      }
      return next;
    });
  }, [activeClipIdx, playClipInstance]);

  const handleToggleReverseClip = useCallback(() => {
    setReverseClip((prev) => {
      const next = !prev;
      reverseClipRef.current = next;
      const cur = clipsRef.current[activeClipIdx];
      if (cur && mixerRef.current) {
        playClipInstance(cur, activeClipIdx, cur.name, animLoopRef.current);
      }
      return next;
    });
  }, [activeClipIdx, playClipInstance]);

  const handleToggleInPlaceClip = useCallback(() => {
    setInPlaceClip((prev) => {
      const next = !prev;
      inPlaceClipRef.current = next;
      const cur = clipsRef.current[activeClipIdx];
      if (cur && mixerRef.current) {
        playClipInstance(cur, activeClipIdx, cur.name, animLoopRef.current);
      }
      return next;
    });
  }, [activeClipIdx, playClipInstance]);

  const handleToggleClayShading = useCallback(() => {
    setClayShading((prev) => {
      const next = !prev;
      const root = modelRootRef.current;
      if (root) {
        root.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            if (next) {
              if (!m.userData._origMat) m.userData._origMat = m.material;
              m.material = new THREE.MeshStandardMaterial({
                color: '#b9bcc1',
                roughness: 0.68,
                metalness: 0.05,
                wireframe: wireframeMode,
                side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
              });
            } else if (m.userData._origMat) {
              if (m.material && m.material !== m.userData._origMat) {
                (m.material as THREE.Material).dispose?.();
              }
              m.material = m.userData._origMat;
              delete m.userData._origMat;
            }
          }
        });
      }
      return next;
    });
  }, [doubleSided, wireframeMode]);

  const handleUpdateStrips = useCallback(
    (nextStrips: TimelineStripItem[]) => {
      setStrips(nextStrips);
      if (nextStrips.length === 0) {
        const cur = clipsRef.current[activeClipIdx];
        if (cur && mixerRef.current) {
          playClipInstance(cur, activeClipIdx, cur.name, animLoopRef.current);
        }
        return;
      }
      if (clipsRef.current.length === 0) {
        handleRunAutoRig(undefined, nextStrips[0].clipId);
      }
      const compiled = compileTimelineStripsToClip(
        nextStrips,
        clipPoolMapRef.current,
        mirrorClipLeftRight
      );
      if (compiled && mixerRef.current) {
        setAnimLoop(true);
        animLoopRef.current = true;
        playClipInstance(compiled, activeClipIdx, nextStrips[0].clipId, true);
        flashBanner(`Sequência NLA compilada (${nextStrips.length} clipe(s), ${compiled.duration.toFixed(2)}s).`);
      }
    },
    [activeClipIdx, flashBanner, handleRunAutoRig, playClipInstance]
  );

  const handleSetOverlayLayer = useCallback(
    (clipId: string, mask: BoneMaskRegion, weight: number) => {
      setOverlayClipId(clipId);
      setOverlayMask(mask);
      setOverlayWeight(weight);

      const mixer = mixerRef.current;
      if (!mixer) return;
      if (overlayActionRef.current) {
        overlayActionRef.current.stop();
        overlayActionRef.current = null;
      }
      if (!clipId || weight <= 0.01) {
        evaluateFrameNow();
        return;
      }
      const src = clipPoolMapRef.current.get(clipId.toLowerCase());
      if (!src) return;
      const masked = filterClipByBoneMask(src, mask);
      const act = mixer.clipAction(masked);
      act.reset();
      act.setLoop(THREE.LoopRepeat, Infinity);
      act.setEffectiveWeight(weight);
      act.play();
      overlayActionRef.current = act;
      evaluateFrameNow();
    },
    [evaluateFrameNow]
  );

  const handleUpdatePostureOffsets = useCallback(
    (patch: Partial<RigPostureOffsets>) => {
      setPostureOffsets((prev) => {
        const next = { ...prev, ...patch };
        postureOffsetsRef.current = next;
        evaluateFrameNow();
        return next;
      });
    },
    [evaluateFrameNow]
  );

  const handleAddBoneKeyframe = useCallback(() => {
    const bone =
      bonesRef.current.find((b) => b.name === selectedBoneName) ??
      (selectedObjectRef.current && (selectedObjectRef.current as THREE.Bone).isBone
        ? (selectedObjectRef.current as THREE.Bone)
        : null);
    if (!bone) {
      flashBanner('Selecione um osso no Pose Mode para gravar um keyframe (◆).');
      return;
    }

    if (!mixerRef.current && modelRootRef.current) {
      mixerRef.current = new THREE.AnimationMixer(modelRootRef.current);
    }
    const mixer = mixerRef.current;
    if (!mixer) return;

    const q = bone.quaternion;
    const p = bone.position;
    let act = activeActionRef.current;
    let clipIdx = activeClipIdx;
    if (!act) {
      const customClip = new THREE.AnimationClip('Custom_Animation', 2.0, [
        new THREE.QuaternionKeyframeTrack(
          `${bone.name}.quaternion`,
          [0, 2.0],
          [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w]
        ),
        new THREE.VectorKeyframeTrack(
          `${bone.name}.position`,
          [0, 2.0],
          [p.x, p.y, p.z, p.x, p.y, p.z]
        ),
      ]);
      clipsRef.current = [...clipsRef.current, customClip];
      clipPoolMapRef.current.set(customClip.name.toLowerCase(), customClip);
      clipIdx = clipsRef.current.length - 1;
      setClipNames(clipsRef.current.map((c) => c.name));
      playClipInstance(customClip, clipIdx, customClip.name, animLoopRef.current);
      setIsPlaying(false);
      handleSeekNormalized(0);
      flashBanner(`Clipe Custom_Animation criado com keyframe em ${bone.name} @ frame 0.`);
      return;
    }

    const srcClip = act.getClip();
    const cloned = srcClip.clone();
    const targetTime = THREE.MathUtils.clamp(animProgress * Math.max(cloned.duration, 0.1), 0, cloned.duration);
    const quatTrackName = `${bone.name}.quaternion`;

    const existingQuat = cloned.tracks.find((t) => t.name === quatTrackName) as THREE.QuaternionKeyframeTrack | undefined;
    if (existingQuat) {
      const pairs: { t: number; v: [number, number, number, number] }[] = [];
      for (let i = 0; i < existingQuat.times.length; i++) {
        if (Math.abs(existingQuat.times[i] - targetTime) > 0.03) {
          const o = i * 4;
          pairs.push({
            t: existingQuat.times[i],
            v: [existingQuat.values[o], existingQuat.values[o + 1], existingQuat.values[o + 2], existingQuat.values[o + 3]],
          });
        }
      }
      pairs.push({ t: targetTime, v: [q.x, q.y, q.z, q.w] });
      pairs.sort((a, b) => a.t - b.t);

      // Hemisphere shortest-path continuity
      for (let i = 1; i < pairs.length; i++) {
        const prevQ = pairs[i - 1].v;
        const currQ = pairs[i].v;
        if (prevQ[0] * currQ[0] + prevQ[1] * currQ[1] + prevQ[2] * currQ[2] + prevQ[3] * currQ[3] < 0) {
          currQ[0] = -currQ[0];
          currQ[1] = -currQ[1];
          currQ[2] = -currQ[2];
          currQ[3] = -currQ[3];
        }
      }
      existingQuat.times = new Float32Array(pairs.map((item) => item.t));
      existingQuat.values = new Float32Array(pairs.flatMap((item) => item.v));
    } else {
      cloned.tracks.push(
        new THREE.QuaternionKeyframeTrack(
          quatTrackName,
          [0, targetTime || cloned.duration],
          [q.x, q.y, q.z, q.w, q.x, q.y, q.z, q.w]
        )
      );
    }

    const posTrackName = `${bone.name}.position`;
    const restPos = restBoneTransformsRef.current.get(bone.name)?.pos;
    const posChanged = restPos ? p.distanceToSquared(restPos) > 1e-6 : false;
    const existingPos = cloned.tracks.find((t) => t.name === posTrackName) as THREE.VectorKeyframeTrack | undefined;
    if (existingPos) {
      const posPairs: { t: number; v: [number, number, number] }[] = [];
      for (let i = 0; i < existingPos.times.length; i++) {
        if (Math.abs(existingPos.times[i] - targetTime) > 0.03) {
          const o = i * 3;
          posPairs.push({
            t: existingPos.times[i],
            v: [existingPos.values[o], existingPos.values[o + 1], existingPos.values[o + 2]],
          });
        }
      }
      posPairs.push({ t: targetTime, v: [p.x, p.y, p.z] });
      posPairs.sort((a, b) => a.t - b.t);
      existingPos.times = new Float32Array(posPairs.map((item) => item.t));
      existingPos.values = new Float32Array(posPairs.flatMap((item) => item.v));
    } else if (posChanged || bone.name.toLowerCase() === 'pelvis') {
      const basePos = restPos ?? p;
      cloned.tracks.push(
        new THREE.VectorKeyframeTrack(
          posTrackName,
          [0, targetTime || cloned.duration],
          [basePos.x, basePos.y, basePos.z, p.x, p.y, p.z]
        )
      );
    }

    if (clipsRef.current[clipIdx]) {
      clipsRef.current[clipIdx] = cloned;
      clipPoolMapRef.current.set(cloned.name.toLowerCase(), cloned);
    }
    const resumePct = animProgress;
    playClipInstance(cloned, clipIdx, cloned.name, animLoopRef.current);
    setIsPlaying(false);
    handleSeekNormalized(resumePct);
    flashBanner(`Keyframe gravado em ${bone.name} @ frame ${Math.round(targetTime * 30)}.`);
  }, [activeClipIdx, animProgress, flashBanner, handleSeekNormalized, playClipInstance, selectedBoneName]);
  addBoneKeyframeRef.current = handleAddBoneKeyframe;

  const handleResetSelectedBone = useCallback(() => {
    const bone =
      bonesRef.current.find((b) => b.name === selectedBoneName) ??
      (selectedObjectRef.current && (selectedObjectRef.current as THREE.Bone).isBone
        ? (selectedObjectRef.current as THREE.Bone)
        : null);
    if (!bone) return;
    const rest = restBoneTransformsRef.current.get(bone.name);
    if (rest) {
      bone.position.copy(rest.pos);
      bone.quaternion.copy(rest.quat);
    } else {
      bone.rotation.set(0, 0, 0);
    }
    bone.updateMatrixWorld(true);
    skeletonVisualizerRef.current?.update();
    syncSelectedInspectorFromObject(bone);
    flashBanner(`Osso ${bone.name} restaurado para Rest Pose.`);
  }, [flashBanner, selectedBoneName, syncSelectedInspectorFromObject]);

  const handleMirrorSelectedBonePose = useCallback(() => {
    const bone =
      bonesRef.current.find((b) => b.name === selectedBoneName) ??
      (selectedObjectRef.current && (selectedObjectRef.current as THREE.Bone).isBone
        ? (selectedObjectRef.current as THREE.Bone)
        : null);
    if (!bone) return;
    let partnerName = bone.name;
    if (/_L$/i.test(bone.name)) {
      partnerName = bone.name.replace(/_L$/, '_R').replace(/_l$/, '_r');
    } else if (/_R$/i.test(bone.name)) {
      partnerName = bone.name.replace(/_R$/, '_L').replace(/_r$/, '_l');
    } else if (bone.name.startsWith('Left')) {
      partnerName = `Right${bone.name.slice(4)}`;
    } else if (bone.name.startsWith('Right')) {
      partnerName = `Left${bone.name.slice(5)}`;
    }
    const partner = partnerName !== bone.name
      ? bonesRef.current.find((b) => b.name.toLowerCase() === partnerName.toLowerCase())
      : null;

    if (partner) {
      partner.quaternion.set(
        bone.quaternion.x,
        -bone.quaternion.y,
        -bone.quaternion.z,
        bone.quaternion.w
      ).normalize();
      partner.updateMatrixWorld(true);
      skeletonVisualizerRef.current?.update();
      flashBanner(`Pose espelhada: ${bone.name} → ${partner.name}.`);
    } else {
      bone.quaternion.set(
        bone.quaternion.x,
        -bone.quaternion.y,
        -bone.quaternion.z,
        bone.quaternion.w
      ).normalize();
      bone.updateMatrixWorld(true);
      skeletonVisualizerRef.current?.update();
      syncSelectedInspectorFromObject(bone);
      flashBanner(`Pose espelhada no eixo X em ${bone.name}.`);
    }
  }, [flashBanner, selectedBoneName, syncSelectedInspectorFromObject]);

  const handleCopyKeyframe = useCallback(() => {
    const bone =
      bonesRef.current.find((b) => b.name === selectedBoneName) ??
      (selectedObjectRef.current && (selectedObjectRef.current as THREE.Bone).isBone
        ? (selectedObjectRef.current as THREE.Bone)
        : bonesRef.current[0] ?? null);
    if (!bone) {
      flashBanner('Selecione um osso para copiar a pose do keyframe.');
      return;
    }
    copiedKeyframeRef.current = {
      boneName: bone.name,
      quat: [bone.quaternion.x, bone.quaternion.y, bone.quaternion.z, bone.quaternion.w],
    };
    setHasCopiedKeyframe(true);
    flashBanner(`Keyframe copiado de ${bone.name}.`);
  }, [flashBanner, selectedBoneName]);

  const handlePasteKeyframe = useCallback(() => {
    const copied = copiedKeyframeRef.current;
    if (!copied) return;
    const bone =
      bonesRef.current.find((b) => b.name === selectedBoneName) ??
      bonesRef.current.find((b) => b.name === copied.boneName) ??
      null;
    if (!bone) return;
    bone.quaternion.set(...copied.quat).normalize();
    bone.updateMatrixWorld(true);
    addBoneKeyframeRef.current();
  }, [selectedBoneName]);

  const handleDeleteKeyframe = useCallback(() => {
    const act = activeActionRef.current;
    if (!act) return;
    const boneName = selectedBoneName ?? bonesRef.current[0]?.name;
    if (!boneName) return;
    const srcClip = act.getClip();
    const cloned = srcClip.clone();
    const targetTime = animProgress * Math.max(cloned.duration, 0.1);
    let removed = 0;

    for (const tr of cloned.tracks) {
      if (!tr.name.startsWith(`${boneName}.`)) continue;
      if (tr.times.length <= 2) continue;
      const stride = Math.max(1, Math.round(tr.values.length / tr.times.length));
      const keepTimes: number[] = [];
      const keepValues: number[] = [];
      for (let i = 0; i < tr.times.length; i++) {
        if (Math.abs(tr.times[i] - targetTime) > 0.05) {
          keepTimes.push(tr.times[i]);
          for (let s = 0; s < stride; s++) {
            keepValues.push(tr.values[i * stride + s]);
          }
        } else {
          removed += 1;
        }
      }
      if (keepTimes.length >= 2) {
        tr.times = new Float32Array(keepTimes);
        tr.values = new Float32Array(keepValues);
      }
    }
    if (removed > 0) {
      if (clipsRef.current[activeClipIdx]) {
        clipsRef.current[activeClipIdx] = cloned;
        clipPoolMapRef.current.set(cloned.name.toLowerCase(), cloned);
      }
      const resumePct = animProgress;
      playClipInstance(cloned, activeClipIdx, cloned.name, animLoopRef.current);
      setIsPlaying(false);
      handleSeekNormalized(resumePct);
      flashBanner(`Keyframe removido de ${boneName}.`);
    } else {
      flashBanner('Posicione a agulha sobre um keyframe do osso para apagar.');
    }
  }, [activeClipIdx, animProgress, flashBanner, handleSeekNormalized, playClipInstance, selectedBoneName]);

  const handleMoveKeyframe = useCallback(
    (trackName: string, oldTime: number, newTime: number) => {
      const act = activeActionRef.current;
      if (!act) return;
      const cloned = act.getClip().clone();
      const tr = cloned.tracks.find((t) => t.name === trackName);
      if (!tr || tr.times.length === 0) return;

      const stride = Math.max(1, Math.round(tr.values.length / tr.times.length));
      const entries: { t: number; v: number[] }[] = [];
      for (let i = 0; i < tr.times.length; i++) {
        const vals: number[] = [];
        for (let s = 0; s < stride; s++) vals.push(tr.values[i * stride + s]);
        const isTarget = Math.abs(tr.times[i] - oldTime) < 0.015;
        entries.push({ t: isTarget ? THREE.MathUtils.clamp(newTime, 0, cloned.duration) : tr.times[i], v: vals });
      }
      entries.sort((a, b) => a.t - b.t);
      tr.times = new Float32Array(entries.map((e) => e.t));
      tr.values = new Float32Array(entries.flatMap((e) => e.v));

      if (clipsRef.current[activeClipIdx]) {
        clipsRef.current[activeClipIdx] = cloned;
        clipPoolMapRef.current.set(cloned.name.toLowerCase(), cloned);
      }
      const resumePct = animProgress;
      playClipInstance(cloned, activeClipIdx, cloned.name, animLoopRef.current);
      setIsPlaying(false);
      handleSeekNormalized(resumePct);
      flashBanner(`Keyframe movido para ${newTime.toFixed(2)}s.`);
    },
    [activeClipIdx, animProgress, flashBanner, handleSeekNormalized, playClipInstance]
  );

  const handleChangeInterpolationMode = useCallback(
    (mode: KeyframeInterpolationMode) => {
      setInterpolationMode(mode);
      interpolationModeRef.current = mode;
      const act = activeActionRef.current;
      if (!act) return;
      const updated = setClipInterpolationMode(act.getClip(), mode);
      if (clipsRef.current[activeClipIdx]) {
        clipsRef.current[activeClipIdx] = updated;
        clipPoolMapRef.current.set(updated.name.toLowerCase(), updated);
      }
      const resumePct = animProgress;
      playClipInstance(updated, activeClipIdx, updated.name, animLoopRef.current);
      setIsPlaying(false);
      handleSeekNormalized(resumePct);
      flashBanner(`Curva de interpolação alterada para: ${mode.toUpperCase()}.`);
    },
    [activeClipIdx, animProgress, flashBanner, handleSeekNormalized, playClipInstance]
  );

  const handleToggleIk = useCallback(() => {
    setIkEnabled((prev) => {
      const next = !prev;
      ikEnabledRef.current = next;
      const scene = sceneRef.current;
      if (!scene) return next;

      if (next && bonesRef.current.length > 0) {
        if (!ikTargetsGroupRef.current) {
          const grp = new THREE.Group();
          grp.name = 'ActionForge_IKTargets';
          ikTargetsGroupRef.current = grp;
          scene.add(grp);
        }
        const grp = ikTargetsGroupRef.current;
        grp.clear();
        const boneMap = new Map<string, THREE.Bone>();
        bonesRef.current.forEach((b) => boneMap.set(b.name, b));
        const endDefs = [
          { targetName: 'IK_Hand_L', boneName: 'hand_L', color: '#38bdf8' },
          { targetName: 'IK_Hand_R', boneName: 'hand_R', color: '#f97316' },
          { targetName: 'IK_Foot_L', boneName: 'foot_L', color: '#22c55e' },
          { targetName: 'IK_Foot_R', boneName: 'foot_R', color: '#eab308' },
        ];
        const wp = new THREE.Vector3();
        for (const ed of endDefs) {
          const bone = boneMap.get(ed.boneName);
          if (!bone) continue;
          bone.getWorldPosition(wp);
          const sphere = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.055, 0),
            new THREE.MeshBasicMaterial({
              color: ed.color,
              wireframe: true,
              depthTest: false,
              transparent: true,
              opacity: 0.95,
            })
          );
          sphere.name = ed.targetName;
          sphere.renderOrder = 1002;
          sphere.position.copy(wp);
          sphere.userData = { isIkTarget: true, boneName: ed.boneName };
          grp.add(sphere);
        }
        grp.visible = true;
        setIsPlaying(false);
        flashBanner('Alvos IK ativos! Arraste os octaedros nas mãos ou pés com Mover (W).');
      } else if (ikTargetsGroupRef.current) {
        ikTargetsGroupRef.current.visible = false;
        if (selectedObjectRef.current?.userData?.isIkTarget) {
          transformRef.current?.detach();
          syncSelectedInspectorFromObject(null);
        }
      }
      return next;
    });
  }, [flashBanner, syncSelectedInspectorFromObject]);

  const handleImportAnimationFile = useCallback(async (file: File) => {
    if (bonesRef.current.length === 0) {
      handleRunAutoRig();
    }
    const ext = file.name.toLowerCase().split('.').pop() || '';
    const blobUrl = URL.createObjectURL(file);
    try {
      let incomingClips: THREE.AnimationClip[] = [];
      if (ext === 'fbx') {
        const fbx = await new FBXLoader().loadAsync(blobUrl);
        incomingClips = fbx.animations || [];
      } else if (ext === 'glb' || ext === 'gltf') {
        const gltf = await new GLTFLoader().loadAsync(blobUrl);
        incomingClips = gltf.animations || [];
      }
      if (incomingClips.length === 0) {
        flashBanner(`Nenhuma faixa de animação encontrada em ${file.name}.`);
        return;
      }
      const targetNames = bonesRef.current.map((b) => b.name);
      const retargeted = incomingClips.map((c, idx) => {
        const mapped = retargetClipToRig(c, targetNames);
        mapped.name = c.name || `${file.name.replace(/\.[^.]+$/, '')}_${idx + 1}`;
        return mapped;
      });
      if (!mixerRef.current && modelRootRef.current) {
        mixerRef.current = new THREE.AnimationMixer(modelRootRef.current);
      }
      clipsRef.current = [...retargeted, ...clipsRef.current];
      retargeted.forEach((c) => clipPoolMapRef.current.set(c.name.toLowerCase(), c));
      setClipNames(clipsRef.current.map((c) => c.name));
      playClipInstance(retargeted[0], 0, retargeted[0].name, true);
      flashBanner(`Animação importada e retargetada: ${retargeted[0].name} (${retargeted[0].tracks.length} tracks).`);
    } catch (err) {
      flashBanner(err instanceof Error ? err.message : 'Falha ao importar animação FBX/GLB.');
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }, [flashBanner, handleRunAutoRig, playClipInstance]);

  const handleBakeIkPhysics = useCallback(() => {
    if (bonesRef.current.length === 0) {
      flashBanner('Aplique o Auto-Rig antes de assar keyframes IK.');
      return;
    }
    const dur = Math.max(animDuration || 1.2, 1.0);
    const sampleCount = 16;
    const times: number[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      times.push(Number(((i / sampleCount) * dur).toFixed(3)));
    }
    const tracks: THREE.KeyframeTrack[] = [];
    for (const b of bonesRef.current) {
      const vals: number[] = [];
      for (let i = 0; i <= sampleCount; i++) {
        vals.push(b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w);
      }
      tracks.push(new THREE.QuaternionKeyframeTrack(`${b.name}.quaternion`, times, vals));
    }
    const bakedClip = new THREE.AnimationClip(`Baked_${activeClipId || 'Pose'}`, dur, tracks);
    clipsRef.current = [bakedClip, ...clipsRef.current];
    clipPoolMapRef.current.set(bakedClip.name.toLowerCase(), bakedClip);
    setClipNames(clipsRef.current.map((c) => c.name));
    if (!mixerRef.current && modelRootRef.current) {
      mixerRef.current = new THREE.AnimationMixer(modelRootRef.current);
    }
    playClipInstance(bakedClip, 0, bakedClip.name, true);
    flashBanner(`IK & Física assados no clipe "${bakedClip.name}"!`);
  }, [activeClipId, animDuration, flashBanner, playClipInstance]);

  const handleCopyClipLink = useCallback(
    (clipId: string) => {
      const hash = `#clip=${clipId}`;
      try {
        window.history.replaceState(null, '', hash);
        navigator.clipboard?.writeText(window.location.href).catch(() => {});
        flashBanner(`Link de preview copiado (${hash})!`);
      } catch {
        flashBanner(`Preview pronto para: ${clipId}`);
      }
    },
    [flashBanner]
  );

  useEffect(() => {
    const applyHashScene = () => {
      const h = window.location.hash || '';
      if (/^#clip=/i.test(h)) {
        const clipName = decodeURIComponent(h.replace(/^#clip=/i, '')).trim();
        if (clipName) handleSelectClip(clipName, true);
      } else if (/^#scene=/i.test(h)) {
        try {
          const b64 = h.replace(/^#scene=/i, '');
          const json = decodeURIComponent(escape(atob(b64)));
          const payload = JSON.parse(json) as { clip?: string; toneMapping?: ToneMappingPreset };
          if (payload.toneMapping) setToneMapping(payload.toneMapping);
          if (payload.clip) handleSelectClip(payload.clip, true);
        } catch {
          // ignore malformed scene hash
        }
      }
    };
    window.addEventListener('hashchange', applyHashScene);
    return () => window.removeEventListener('hashchange', applyHashScene);
  }, [handleSelectClip]);

  const handleCopyPublicLink = useCallback(() => {
    try {
      const payload = {
        asset: activeAssetName,
        clip: activeClipId,
        hdri: activeHdri,
        toneMapping,
        emittersCount: emitters.length,
      };
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      window.history.replaceState(null, '', `#scene=${encoded}`);
      navigator.clipboard?.writeText(window.location.href).catch(() => {});
      flashBanner(`Link interativo público copiado (#scene=... · clip ${activeClipId})!`);
    } catch {
      handleCopyClipLink(activeClipId);
    }
  }, [activeAssetName, activeClipId, activeHdri, emitters.length, flashBanner, handleCopyClipLink, toneMapping]);

  const syncEmitterSceneGroup = useCallback((nextList: ParticleEmitterConfig[]) => {
    const grp = emittersGroupRef.current;
    if (!grp) return;
    const keepIds = new Set(nextList.map((e) => e.id));
    for (const [id, inst] of emitterInstancesRef.current.entries()) {
      if (!keepIds.has(id)) {
        grp.remove(inst.group);
        inst.dispose();
        emitterInstancesRef.current.delete(id);
      }
    }
    for (const cfg of nextList) {
      const existing = emitterInstancesRef.current.get(cfg.id);
      if (existing) {
        existing.updateConfig(cfg);
      } else {
        const created = new ParticleEmitterInstance(cfg);
        emitterInstancesRef.current.set(cfg.id, created);
        grp.add(created.group);
      }
    }
  }, []);

  const handleAddEmitter = useCallback(() => {
    const idx = emitters.length + 1;
    const cfg: ParticleEmitterConfig = {
      ...DEFAULT_PARTICLE_EMITTER,
      id: `emitter_${Date.now()}_${idx}`,
      name: `Emissor_${idx}`,
      position: [(idx - 1) * 0.45, 0.85, 0],
    };
    const next = [...emitters, cfg];
    setEmitters(next);
    setSelectedEmitterId(cfg.id);
    syncEmitterSceneGroup(next);
    flashBanner(`Emissor VFX criado: ${cfg.name}`);
  }, [emitters, flashBanner, syncEmitterSceneGroup]);

  const handleUpdateEmitter = useCallback(
    (id: string, patch: Partial<ParticleEmitterConfig>) => {
      setEmitters((prev) => {
        const next = prev.map((e) => (e.id === id ? { ...e, ...patch } : e));
        syncEmitterSceneGroup(next);
        return next;
      });
    },
    [syncEmitterSceneGroup]
  );

  const handleRemoveEmitter = useCallback(
    (id: string) => {
      setEmitters((prev) => {
        const next = prev.filter((e) => e.id !== id);
        syncEmitterSceneGroup(next);
        if (selectedEmitterId === id) {
          setSelectedEmitterId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [selectedEmitterId, syncEmitterSceneGroup]
  );

  const handleChangeMorphTarget = useCallback((meshId: string, index: number, value: number) => {
    const updateIn = (root: THREE.Object3D | null) => {
      root?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.uuid === meshId) {
          const m = o as THREE.Mesh;
          if (m.morphTargetInfluences) {
            m.morphTargetInfluences[index] = THREE.MathUtils.clamp(value, 0, 1);
          }
        }
      });
    };
    updateIn(modelRootRef.current);
    updateIn(splineGroupRef.current);
    refreshMorphTargets();
  }, [refreshMorphTargets]);

  const withRestoredPbrMaterials = useCallback(<T,>(fn: () => T): T => {
    const swapped: { mesh: THREE.Mesh; prevMat: THREE.Material | THREE.Material[] }[] = [];
    modelRootRef.current?.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        if (m.userData._preWeightMat) {
          swapped.push({ mesh: m, prevMat: m.material });
          m.material = m.userData._preWeightMat;
        } else if (m.userData._origMat) {
          swapped.push({ mesh: m, prevMat: m.material });
          m.material = m.userData._origMat;
        }
      }
    });
    try {
      return fn();
    } finally {
      swapped.forEach(({ mesh, prevMat }) => {
        mesh.material = prevMat;
      });
    }
  }, []);

  const handleExportModel = useCallback(
    (format: 'glb' | 'gltf', includeAnimations = true) => {
      const transformedClips = includeAnimations
        ? clipsRef.current.map((c) => {
            let out = c;
            if (mirrorClipRef.current) {
              out = mirrorClipLeftRight(out);
            }
            if (reverseClipRef.current) {
              out = reverseAnimationClip(out);
            }
            if (inPlaceClipRef.current) {
              out = lockClipInPlace(out, restBoneTransformsRef.current.get('pelvis')?.pos);
            }
            return out;
          })
        : [];
      const { exportGroup, animations } = withRestoredPbrMaterials(() =>
        prepareBlenderCompatibleExport({
          modelRoot: modelRootRef.current,
          splineGroup: splineGroupRef.current,
          clips: transformedClips,
          restBoneTransforms: restBoneTransformsRef.current,
          sceneVariables: {
            toneMapping,
            animSpeed,
            ikEnabled: ikEnabledRef.current,
            bindingsCount: variableBindingsRef.current.filter((b) => b.enabled).length,
          },
        })
      );
      const exporter = new GLTFExporter();
      exporter.parse(
        exportGroup,
        (res) => {
          const isBinary = format === 'glb' && res instanceof ArrayBuffer;
          const blob = isBinary
            ? new Blob([res], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(res, null, 2)], { type: 'model/gltf+json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = includeAnimations
            ? `${activeAssetName}.${format}`
            : `${activeAssetName}_RestPose.${format}`;
          a.click();
          URL.revokeObjectURL(url);
          flashBanner(
            includeAnimations
              ? `Exportado ${activeAssetName}.${format} (Blender 5.3 / glTF 2.0)`
              : `Exportado ${activeAssetName}_RestPose.${format} (Somente malha + esqueleto em Rest Pose)`
          );
        },
        (err) => {
          flashBanner(`Erro na exportação: ${err instanceof Error ? err.message : 'desconhecido'}`);
        },
        { binary: format === 'glb', animations }
      );
    },
    [activeAssetName, animSpeed, flashBanner, toneMapping, withRestoredPbrMaterials]
  );

  const handleExportFbx = useCallback(() => {
    const { exportGroup, animations } = withRestoredPbrMaterials(() =>
      prepareBlenderCompatibleExport({
        modelRoot: modelRootRef.current,
        splineGroup: splineGroupRef.current,
        clips: clipsRef.current,
        restBoneTransforms: restBoneTransformsRef.current,
      })
    );
    const fbxBlob = exportSceneToFbxBlob(exportGroup, animations, activeAssetName);
    const url = URL.createObjectURL(fbxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeAssetName}.fbx`;
    a.click();
    URL.revokeObjectURL(url);
    flashBanner(`Exportado ${activeAssetName}.fbx (FBX 7.4 ASCII com Bones, Skin e Animações)!`);
  }, [activeAssetName, flashBanner, withRestoredPbrMaterials]);

  const handleExportZip = useCallback(() => {
    const { exportGroup, animations } = withRestoredPbrMaterials(() =>
      prepareBlenderCompatibleExport({
        modelRoot: modelRootRef.current,
        splineGroup: splineGroupRef.current,
        clips: clipsRef.current,
        restBoneTransforms: restBoneTransformsRef.current,
        sceneVariables: {
          toneMapping,
          animSpeed,
          ikEnabled: ikEnabledRef.current,
        },
      })
    );
    const exporter = new GLTFExporter();
    exporter.parse(
      exportGroup,
      async (res) => {
        if (!(res instanceof ArrayBuffer)) return;
        const report = auditThreeSceneGroup(exportGroup, `${activeAssetName}.glb`, animations.length);
        const zipBlob = await exportProjectAssetZip({
          assetName: activeAssetName,
          glbBuffer: res,
          report,
        });
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeAssetName}_Blender_Pacote.zip`;
        a.click();
        URL.revokeObjectURL(url);
        flashBanner(`Pacote ZIP + Script Blender 5.3 (bpy) exportado!`);
      },
      () => flashBanner('Falha ao empacotar ZIP.'),
      { binary: true, animations }
    );
  }, [activeAssetName, animSpeed, flashBanner, toneMapping, withRestoredPbrMaterials]);

  const handleApplyProceduralMaterial = useCallback(
    (params: ProceduralPbrParams) => {
      lastPbrParamsRef.current = params;
      const maxAniso = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 4;
      const bundle = generateProceduralPbrBundle(params, Math.min(4, maxAniso));
      const target = selectedObjectRef.current;

      const applyToMat = (mat: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial) => {
        mat.map = bundle.albedoMap;
        mat.roughnessMap = bundle.roughnessMap;
        mat.normalMap = bundle.normalMap;
        mat.aoMap = bundle.aoMap;
        mat.metalnessMap = bundle.metalnessMap;
        mat.roughness = bundle.roughnessValue;
        mat.metalness = bundle.metalnessValue;
        mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
      };

      if (target) {
        target.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            if (m.material instanceof THREE.MeshStandardMaterial) {
              applyToMat(m.material);
            }
          }
        });
      } else if (modelRootRef.current) {
        modelRootRef.current.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            const m = o as THREE.Mesh;
            if (m.material instanceof THREE.MeshStandardMaterial) {
              applyToMat(m.material);
            }
          }
        });
      }
      flashBanner(`Material procedural aplicado (${params.kind}).`);
    },
    [flashBanner]
  );

  // Initialize Three.js WebGL Viewport
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch (err) {
      setWebglError(err instanceof Error ? err.message : 'Contexto WebGL indisponível.');
      return;
    }

    const wInit = Math.max(1, container.clientWidth);
    const hInit = Math.max(1, container.clientHeight);
    const isSwGl = isSoftwareWebGLContext(renderer.getContext());
    renderer.setPixelRatio(isSwGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(wInit, hInit);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.AgXToneMapping ?? THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !isSwGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1017');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, wInit / hInit, 0.05, 120);
    camera.position.set(2.1, 1.55, 2.6);
    cameraRef.current = camera;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const outlinePass = new OutlinePass(new THREE.Vector2(wInit, hInit), scene, camera);
    outlinePass.edgeStrength = 3.0;
    outlinePass.edgeGlow = 0.25;
    outlinePass.edgeThickness = 1.2;
    outlinePass.visibleEdgeColor.set('#f97316');
    outlinePass.hiddenEdgeColor.set('#f97316');
    outlinePass.enabled = false;

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(wInit, hInit), 0.45, 0.35, 0.78);
    bloomPass.enabled = postBloomEnabledRef.current;

    const bokehPass = new BokehPass(scene, camera, {
      focus: 2.8,
      aperture: 0.00025,
      maxblur: 0.008,
    });
    bokehPass.enabled = dofEnabledRef.current;

    const afterimagePass = new AfterimagePass(0.72);
    afterimagePass.enabled = motionBlurEnabledRef.current;

    const outputPass = new OutputPass();

    composer.addPass(renderPass);
    composer.addPass(outlinePass);
    composer.addPass(bloomPass);
    composer.addPass(bokehPass);
    composer.addPass(afterimagePass);
    composer.addPass(outputPass);

    composerRef.current = composer;
    outlinePassRef.current = outlinePass;
    bloomPassRef.current = bloomPass;
    bokehPassRef.current = bokehPass;
    afterimagePassRef.current = afterimagePass;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.target.set(0, 0.9, 0);
    controls.update();
    controlsRef.current = controls;

    const transformControls = new TransformControls(camera, renderer.domElement);
    let dragStartSnap: { obj: THREE.Object3D; pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 } | null = null;
    transformControls.addEventListener('objectChange', () => {
      const activeObj = selectedObjectRef.current;
      if (activeObj?.userData?.isIkTarget) {
        solveAllActiveIkRef.current();
      }
      if (
        activeObj?.userData?.isRigMarker &&
        markerSymmetryRef.current &&
        activeObj.userData.mirrorPartner &&
        rigMarkersGroupRef.current
      ) {
        const partnerId = activeObj.userData.mirrorPartner as RigMarkerId;
        const partnerObj = rigMarkersGroupRef.current.children.find(
          (c) => c.userData.markerId === partnerId
        );
        if (partnerObj) {
          partnerObj.position.set(
            2 * markerCenterXRef.current - activeObj.position.x,
            activeObj.position.y,
            activeObj.position.z
          );
        }
      }
    });
    transformControls.addEventListener('dragging-changed', (event) => {
      controls.enabled = !event.value;
      const activeObj = selectedObjectRef.current;
      if (event.value && activeObj) {
        dragStartSnap = {
          obj: activeObj,
          pos: activeObj.position.clone(),
          rot: activeObj.rotation.clone(),
          scale: activeObj.scale.clone(),
        };
      } else if (!event.value) {
        if (dragStartSnap) {
          undoStackRef.current.push(dragStartSnap);
          if (undoStackRef.current.length > 30) undoStackRef.current.shift();
          redoStackRef.current = [];
          dragStartSnap = null;
          setCanUndo(undoStackRef.current.length > 0);
          setCanRedo(false);
        }
        if (activeObj) {
          syncSelectedInspectorRef.current(activeObj);
          if (autoKeyRef.current && (activeObj as THREE.Bone).isBone) {
            addBoneKeyframeRef.current();
          }
        }
      }
    });
    scene.add(transformControls.getHelper());
    transformRef.current = transformControls;

    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    pmremRef.current = pmrem;

    const envTex = buildProceduralHdriTexture('room', pmrem);
    if (envTex) {
      scene.environment = envTex;
      envTexRef.current = envTex;
    }

    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'Studio_Lights';
    THREE_POINT_PRESET.forEach((l) => lightsGroup.add(buildThreeLightFromSpec(l, !isSwGl)));
    scene.add(lightsGroup);
    lightsGroupRef.current = lightsGroup;

    const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    scene.add(grid);
    gridRef.current = grid;

    const floorMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(5, 32), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.001;
    floor.receiveShadow = true;
    scene.add(floor);

    const modelRoot = createDefaultStudioCharacterGroup();
    modelRoot.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mt) => attachReactiveShaderToMaterial(mt, reactiveUniformsRef.current));
      }
    });
    scene.add(modelRoot);
    modelRootRef.current = modelRoot;

    const splineGroup = new THREE.Group();
    splineGroup.name = 'Spline_Objects';
    scene.add(splineGroup);
    splineGroupRef.current = splineGroup;

    const emittersGroup = new THREE.Group();
    emittersGroup.name = 'VFX_Emitters';
    scene.add(emittersGroup);
    emittersGroupRef.current = emittersGroup;

    const referenceGroup = new THREE.Group();
    referenceGroup.name = 'Reference_Guides';
    scene.add(referenceGroup);
    referenceGroupRef.current = referenceGroup;

    const skeletonViz = new SkeletonVisualizerRig();
    scene.add(skeletonViz.group);
    skeletonVisualizerRef.current = skeletonViz;

    const rigInit = autoRigAndAnimateGroup(
      modelRoot,
      'HUMANOIDE',
      computeDefaultRigMarkers(modelRoot)
    );
    skeletonRef.current = rigInit.skeleton;
    bonesRef.current = rigInit.bones;
    restBoneTransformsRef.current = new Map(
      rigInit.bones.map((b) => [b.name, { pos: b.position.clone(), quat: b.quaternion.clone() }])
    );
    setRiggedBoneNames(rigInit.bones.map((b) => b.name));
    setRiggedBoneTree(buildBoneHierarchy(rigInit.bones));
    skeletonViz.setBones(rigInit.bones, true);
    skeletonViz.setVisible(showSkeletonRef.current);

    const initMixer = new THREE.AnimationMixer(modelRoot);
    mixerRef.current = initMixer;
    clipsRef.current = rigInit.clips;
    const initPool = new Map<string, THREE.AnimationClip>();
    rigInit.clips.forEach((c) => initPool.set(c.name.toLowerCase(), c));
    clipPoolMapRef.current = initPool;
    setClipNames(rigInit.clips.map((c) => c.name));
    const idleIdx = Math.max(
      0,
      rigInit.clips.findIndex((c) => c.name.toLowerCase() === 'idle_loop')
    );
    const idleClip = rigInit.clips[idleIdx];
    if (idleClip) {
      const act = initMixer.clipAction(idleClip);
      act.setLoop(THREE.LoopRepeat, Infinity);
      act.play();
      initMixer.update(0);
      activeActionRef.current = act;
      setActiveClipIdx(idleIdx);
      setActiveClipId(idleClip.name);
      setAnimDuration(idleClip.duration);
      setAnimProgress(0);
      setActiveClipTracks(
        idleClip.tracks.map((tr) => ({
          name: tr.name,
          times: Array.from(tr.times),
          values: Array.from(tr.values),
          type: tr.ValueTypeName === 'quaternion' ? 'quaternion' : 'vector',
        }))
      );
    }
    setIsPlaying(false);
    skeletonViz.update();
    updateStatsRef.current({ bones: rigInit.boneCount });

    extractAndPushUvs(modelRoot, 'auto');
    syncSceneHierarchy();
    frameCameraToScene();
    syncSelectedInspectorRef.current(modelRoot);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let isPainting = false;

    const paintMeshAtHit = (hit: THREE.Intersection) => {
      const mesh = hit.object as THREE.Mesh;
      if (!mesh || !mesh.isMesh || !hit.uv) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      let paintCanvas = mesh.userData.paintCanvas as HTMLCanvasElement | undefined;
      if (!paintCanvas) {
        paintCanvas = document.createElement('canvas');
        paintCanvas.width = 512;
        paintCanvas.height = 512;
        const pCtx = paintCanvas.getContext('2d')!;
        pCtx.fillStyle = mat.color ? `#${mat.color.getHexString()}` : '#cbd5e1';
        pCtx.fillRect(0, 0, 512, 512);
        const tex = new THREE.CanvasTexture(paintCanvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
        mesh.userData.paintCanvas = paintCanvas;
        mesh.userData.paintTexture = tex;
      }

      const ctx = paintCanvas.getContext('2d');
      if (!ctx) return;
      const px = hit.uv.x * paintCanvas.width;
      const py = (1 - hit.uv.y) * paintCanvas.height;
      ctx.fillStyle = brushColorRef.current;
      ctx.beginPath();
      ctx.arc(px, py, brushSizeRef.current, 0, Math.PI * 2);
      ctx.fill();
      if (mesh.userData.paintTexture) {
        (mesh.userData.paintTexture as THREE.CanvasTexture).needsUpdate = true;
      }
    };

    const getRaycastHit = (e: PointerEvent, meshOnly = false) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      if (!meshOnly && ikTargetsGroupRef.current?.visible) {
        const ikHits = raycaster.intersectObjects(ikTargetsGroupRef.current.children, false);
        if (ikHits.length > 0) return ikHits[0];
      }
      if (!meshOnly && rigMarkersGroupRef.current?.visible) {
        const markerHits = raycaster.intersectObjects(rigMarkersGroupRef.current.children, false);
        if (markerHits.length > 0) return markerHits[0];
      }
      if (
        !meshOnly &&
        showSkeletonRef.current &&
        skeletonVisualizerRef.current &&
        skeletonVisualizerRef.current.jointProxies.length > 0
      ) {
        const boneHits = raycaster.intersectObjects(
          skeletonVisualizerRef.current.jointProxies,
          false
        );
        if (boneHits.length > 0) return boneHits[0];
      }

      const targets: THREE.Object3D[] = [];
      if (modelRootRef.current?.visible) targets.push(modelRootRef.current);
      if (!meshOnly && splineGroupRef.current) targets.push(splineGroupRef.current);
      const hits = raycaster.intersectObjects(targets, true);
      return hits[0] ?? null;
    };

    const applyWeightStrokeAtEvent = (e: PointerEvent) => {
      const hit = getRaycastHit(e, true);
      if (!hit) return false;
      const sm = hit.object as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return false;
      const boneIdx = Math.max(
        0,
        bonesRef.current.findIndex((b) => b.name === selectedBoneNameRef.current)
      );
      applyWeightPaintStroke({
        mesh: sm,
        hitWorldPoint: hit.point,
        boneIndex: boneIdx,
        mode: weightBrushModeRef.current,
        radiusWorld: weightBrushRadiusRef.current,
        strength: weightBrushStrengthRef.current,
      });
      return true;
    };

    const onPointerDown = (e: PointerEvent) => {
      clickBurstRef.current = 1.0;
      if (transformControls.dragging || transformControls.axis) return;

      if (toolModeRef.current === 'weight_paint') {
        isPainting = true;
        controls.enabled = false;
        applyWeightStrokeAtEvent(e);
        return;
      }

      const hit = getRaycastHit(e);
      if (!hit) {
        if (toolModeRef.current === 'orbit') {
          syncSelectedInspectorFromObject(null);
        }
        return;
      }

      if (hit.object.userData?.locked) {
        return;
      }

      if (hit.object.userData?.isBoneProxy && hit.object.userData?.boneName) {
        handleSelectBoneForPoseRef.current(hit.object.userData.boneName as string);
        return;
      }

      if (hit.object.userData?.isIkTarget) {
        toolModeRef.current = 'translate';
        setToolMode('translate');
        syncSelectedInspectorFromObject(hit.object);
        return;
      }

      if (hit.object.userData?.isRigMarker) {
        toolModeRef.current = 'translate';
        setToolMode('translate');
        syncSelectedInspectorFromObject(hit.object);
        return;
      }

      // Click-to-place active Rig Marker on mesh surface
      if (
        showRigMarkersRef.current &&
        selectedObjectRef.current?.userData?.isRigMarker &&
        rigMarkersGroupRef.current
      ) {
        const markerObj = selectedObjectRef.current;
        const localPos = rigMarkersGroupRef.current.worldToLocal(hit.point.clone());
        markerObj.position.copy(localPos);
        if (markerSymmetryRef.current && markerObj.userData.mirrorPartner) {
          const partnerObj = rigMarkersGroupRef.current.children.find(
            (c) => c.userData.markerId === markerObj.userData.mirrorPartner
          );
          if (partnerObj) {
            partnerObj.position.set(
              2 * markerCenterXRef.current - localPos.x,
              localPos.y,
              localPos.z
            );
          }
        }
        syncSelectedInspectorFromObject(markerObj);
        return;
      }

      if (toolModeRef.current === 'paint') {
        const mesh = hit.object as THREE.Mesh;
        if (mesh.userData.paintCanvas) {
          const ctx = (mesh.userData.paintCanvas as HTMLCanvasElement).getContext('2d');
          if (ctx) {
            const arr = paintSnapshotsRef.current.get(mesh.uuid) || [];
            arr.push(ctx.getImageData(0, 0, 512, 512));
            paintSnapshotsRef.current.set(mesh.uuid, arr.slice(-12));
          }
        }
        isPainting = true;
        controls.enabled = false;
        paintMeshAtHit(hit);
        return;
      }

      if (playModeRef.current && hit.object.userData.interaction === 'click_toggle') {
        const cur = hit.object.scale.x;
        const nextScale = cur > 1.15 ? 1.0 : 1.3;
        hit.object.scale.setScalar(nextScale);
        return;
      }

      if (toolModeRef.current === 'assign_mat') {
        const m = hit.object as THREE.Mesh;
        if (m.material instanceof THREE.MeshStandardMaterial) {
          m.material.color.set(brushColorRef.current);
          m.material.needsUpdate = true;
        }
      }

      const selectTarget = hit.object.parent?.userData?.isHtml3d
        ? hit.object.parent
        : hit.object;
      syncSelectedInspectorFromObject(selectTarget);
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        pointerNormRef.current = {
          x: THREE.MathUtils.clamp((e.clientX - rect.left) / rect.width, 0, 1),
          y: THREE.MathUtils.clamp((e.clientY - rect.top) / rect.height, 0, 1),
        };
      }
      if (!isPainting) return;
      if (toolModeRef.current === 'weight_paint') {
        applyWeightStrokeAtEvent(e);
        return;
      }
      if (toolModeRef.current === 'paint') {
        const hit = getRaycastHit(e);
        if (hit) paintMeshAtHit(hit);
      }
    };

    const onPointerUp = () => {
      if (isPainting) {
        isPainting = false;
        controls.enabled = true;
      }
    };

    const onWheel = (e: WheelEvent) => {
      scrollAccumRef.current = THREE.MathUtils.clamp(
        scrollAccumRef.current + (e.deltaY > 0 ? 0.08 : -0.08),
        0,
        1
      );
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      outlinePass.resolution.set(w, h);
      bloomPass.resolution.set(w, h);
    });
    ro.observe(container);

    const staticBoxes: THREE.Box3[] = [];
    const tmpDynBox = new THREE.Box3();
    let rafId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;

      cameraQuatRef.current.copy(camera.quaternion);
      reactiveUniformsRef.current.uTime.value = elapsed;
      clickBurstRef.current = Math.max(0, clickBurstRef.current - dt * 2.2);

      // Evaluate reactive Variable Bindings (Mouse X/Y, Scroll, Click)
      let animSpeedMult = 1;
      let particleRateMult = 1;
      let exposureDelta = 0;
      let boundShaderMode: number | null = null;
      let boundShaderVal = 0;

      const bindings = variableBindingsRef.current;
      for (const b of bindings) {
        if (!b.enabled) continue;
        const srcVal =
          b.source === 'mouse_x'
            ? pointerNormRef.current.x
            : b.source === 'mouse_y'
            ? pointerNormRef.current.y
            : b.source === 'scroll'
            ? scrollAccumRef.current
            : clickBurstRef.current;
        const v = THREE.MathUtils.clamp(srcVal * b.strength, 0, 2);
        if (b.target === 'animSpeed') animSpeedMult *= Math.max(0.15, 0.4 + v * 1.4);
        else if (b.target === 'particleRate') particleRateMult *= Math.max(0.2, 0.5 + v * 2.2);
        else if (b.target === 'exposure') exposureDelta += (v - 0.5) * 0.9;
        else if (b.target === 'fresnel') {
          boundShaderMode = 1;
          boundShaderVal = THREE.MathUtils.clamp(v, 0, 1);
        } else if (b.target === 'dissolve') {
          boundShaderMode = 2;
          boundShaderVal = THREE.MathUtils.clamp(v, 0, 1);
        } else if (b.target === 'distortion') {
          boundShaderMode = 4;
          boundShaderVal = THREE.MathUtils.clamp(v, 0, 1);
        }
      }

      if (boundShaderMode !== null) {
        reactiveUniformsRef.current.uEffectMode.value = boundShaderMode;
        reactiveUniformsRef.current.uEffectIntensity.value = boundShaderVal;
      } else if (selectedObjectRef.current?.userData?.shaderEffect) {
        const fx = selectedObjectRef.current.userData.shaderEffect;
        reactiveUniformsRef.current.uEffectMode.value = effectToModeInt(fx.effect);
        reactiveUniformsRef.current.uEffectIntensity.value = fx.intensity;
      }
      if (exposureDelta !== 0) {
        renderer.toneMappingExposure = THREE.MathUtils.clamp(exposure + exposureDelta, 0.25, 3.0);
      }

      // Step VFX particle emitters
      emitterInstancesRef.current.forEach((inst) => inst.step(dt, particleRateMult));

      if (mixerRef.current && isPlayingRef.current) {
        for (const b of bonesRef.current) {
          const rest = restBoneTransformsRef.current.get(b.name);
          if (rest) {
            b.position.copy(rest.pos);
            b.quaternion.copy(rest.quat);
          }
        }
        mixerRef.current.update(dt * animSpeedRef.current * animSpeedMult);
        applyPostureOffsetsRef.current();
        if (ikEnabledRef.current) {
          solveAllActiveIkRef.current();
        } else if (floorContactEnabledRef.current && bonesRef.current.length > 0) {
          const bMap = new Map<string, THREE.Bone>();
          bonesRef.current.forEach((b) => bMap.set(b.name, b));
          enforceFloorContactOnLegs(bMap, 0.05);
        }
        const act = activeActionRef.current;
        if (act && act.getClip().duration > 0) {
          const dur = act.getClip().duration;
          const inTime = animInPointRef.current * dur;
          const outTime = animOutPointRef.current * dur;
          if (outTime > inTime + 0.02) {
            if (act.time < inTime) {
              act.time = inTime;
            } else if (act.time >= outTime - 1e-4) {
              if (animLoopRef.current) {
                act.time = inTime;
              } else {
                act.time = outTime;
                setIsPlaying(false);
              }
            }
          }
          const pct = !animLoopRef.current
            ? Math.min(1, act.time / dur)
            : Math.round(((act.time % dur) / dur) * 100) / 100;
          const roundedPct = Math.round(pct * 100) / 100;
          if (roundedPct !== lastAnimPctRef.current) {
            lastAnimPctRef.current = roundedPct;
            setAnimProgress(roundedPct);
          }
          if (!animLoopRef.current && act.time >= dur - 1e-4) {
            setIsPlaying(false);
          }
        }
      }

      if (splineGroupRef.current) {
        staticBoxes.length = 0;
        if (physicsActiveRef.current) {
          for (const ch of splineGroupRef.current.children) {
            if (ch.userData.rigidBodyMode === 'static') {
              staticBoxes.push(new THREE.Box3().setFromObject(ch));
            }
          }
        }

        splineGroupRef.current.children.forEach((child) => {
          const inter = child.userData.interaction;
          if (inter === 'spin') {
            child.rotation.y += dt * 1.1;
          } else if (inter === 'float') {
            const baseY = child.userData.baseY ?? child.position.y;
            child.userData.baseY = baseY;
            child.position.y = baseY + Math.sin(elapsed * 2.1 + child.id) * 0.12;
          } else if (inter === 'hover_pulse' && playModeRef.current) {
            const s = 1 + Math.sin(elapsed * 4) * 0.06;
            child.scale.setScalar(s);
          }

          const isDynamic =
            child.userData.rigidBodyMode === 'dynamic' || Boolean(child.userData.physicsEnabled);
          if (physicsActiveRef.current && isDynamic && child.userData.rigidBodyMode !== 'static') {
            const vy = (child.userData.vy as number) ?? 0;
            const nextVy = vy - 9.8 * dt;
            child.position.y += nextVy * dt;
            const floorY = 0.35 * child.scale.y;

            let collidedTopY: number | null = null;
            if (staticBoxes.length > 0) {
              tmpDynBox.setFromObject(child);
              for (const sb of staticBoxes) {
                if (tmpDynBox.intersectsBox(sb)) {
                  collidedTopY = Math.max(collidedTopY ?? -Infinity, sb.max.y + 0.35 * child.scale.y);
                }
              }
            }

            const restY = collidedTopY !== null ? Math.max(floorY, collidedTopY) : floorY;
            if (child.position.y <= restY) {
              child.position.y = restY;
              child.userData.vy = Math.abs(nextVy) > 0.35 ? -nextVy * 0.52 : 0;
            } else {
              child.userData.vy = nextVy;
            }
          }
        });
      }

      skeletonVisualizerRef.current?.update();

      outlinePass.enabled = outlinePass.selectedObjects.length > 0;
      bloomPass.enabled = postBloomEnabledRef.current;
      bokehPass.enabled = dofEnabledRef.current;
      afterimagePass.enabled = motionBlurEnabledRef.current;

      controls.update();
      try {
        composer.render();
      } catch {
        renderer.render(scene, camera);
      }
    };
    animate();

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglError('Contexto WebGL pausado pelo navegador. Clique em Tentar Novamente para restaurar.');
    };
    const onContextRestored = () => {
      setWebglError(null);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('wheel', onWheel);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      emitterInstancesRef.current.forEach((inst) => inst.dispose());
      emitterInstancesRef.current.clear();
      scene.remove(skeletonViz.group);
      skeletonViz.dispose();
      skeletonVisualizerRef.current = null;
      disposeObject3D(referenceGroupRef.current);
      composer.dispose();
      transformControls.dispose();
      controls.dispose();
      pmrem.dispose();
      envTexRef.current?.dispose();
      renderer.dispose();
    };
  }, [retryWebglNonce]);

  // Sync Reference Image Overlay Plane (excluded from GLB/FBX exports)
  useEffect(() => {
    const grp = referenceGroupRef.current;
    if (!grp) return;
    while (grp.children.length > 0) {
      const ch = grp.children[0];
      grp.remove(ch);
      disposeObject3D(ch);
    }
    if (!refPlane.active || !refPlane.dataUrl) return;

    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(refPlane.dataUrl, (tex) => {
      if (cancelled || !referenceGroupRef.current) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(4, rendererRef.current?.capabilities.getMaxAnisotropy() ?? 2);
      const h = 1.9 * refPlane.scale;
      const w = h * Math.max(0.25, Math.min(4, refPlane.aspect));
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: refPlane.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `Referencia_${refPlane.axis}`;
      mesh.visible = refPlane.visible;
      mesh.scale.x = refPlane.flipX ? -1 : 1;
      if (refPlane.axis === 'front') {
        mesh.position.set(0, h * 0.5, -0.75);
      } else if (refPlane.axis === 'side') {
        mesh.rotation.y = Math.PI / 2;
        mesh.position.set(-0.75, h * 0.5, 0);
      } else {
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(0, 0.015, 0);
      }
      referenceGroupRef.current.add(mesh);
    });
    return () => {
      cancelled = true;
    };
  }, [refPlane]);

  // Apply wireframe / double-sided / grid / skeleton toggles
  useEffect(() => {
    const applyFlags = (root: THREE.Object3D | null) => {
      if (!root) return;
      root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          mats.forEach((mat) => {
            if (mat && 'wireframe' in mat) {
              (mat as THREE.MeshStandardMaterial).wireframe = wireframeMode;
              mat.side = doubleSided ? THREE.DoubleSide : THREE.FrontSide;
              mat.needsUpdate = true;
            }
          });
        }
      });
    };
    applyFlags(modelRootRef.current);
    applyFlags(splineGroupRef.current);
    onWireframeChangeRef.current(wireframeMode);
  }, [wireframeMode, doubleSided]);

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (skeletonVisualizerRef.current) {
      skeletonVisualizerRef.current.setVisible(showSkeleton);
      if (showSkeleton) skeletonVisualizerRef.current.update();
    }
  }, [showSkeleton]);

  useEffect(() => {
    const act = activeActionRef.current;
    if (!act) return;
    act.setLoop(animLoop ? THREE.LoopRepeat : THREE.LoopOnce, animLoop ? Infinity : 1);
    act.clampWhenFinished = !animLoop;
  }, [animLoop]);

  useEffect(() => {
    if (modelRootRef.current) modelRootRef.current.visible = !hideDefaultBase;
  }, [hideDefaultBase]);

  // Sync HDRI environment
  useEffect(() => {
    const scene = sceneRef.current;
    const pmrem = pmremRef.current;
    if (!scene || !pmrem) return;

    if (activeHdri === 'none') {
      scene.environment = null;
      scene.background = new THREE.Color('#0d1017');
      return;
    }

    if (activeHdri === 'custom') return;

    const meta = ['room', 'softbox_warm', 'sunset', 'daylight', 'neon', 'warehouse'].includes(activeHdri);
    if (meta) {
      const tex = buildProceduralHdriTexture(activeHdri, pmrem);
      if (tex) {
        envTexRef.current?.dispose();
        envTexRef.current = tex;
        scene.environment = tex;
        scene.background = bgAsEnvironment ? tex : new THREE.Color('#0d1017');
      }
      return;
    }

    let cancelled = false;
    setHdriLoading(true);
    new RGBELoader()
      .loadAsync(`${HDRI_CDN_BASE}${activeHdri}`)
      .then((hdrTex) => {
        if (cancelled) {
          hdrTex.dispose();
          return;
        }
        const rt = pmrem.fromEquirectangular(hdrTex);
        hdrTex.dispose();
        envTexRef.current?.dispose();
        envTexRef.current = rt.texture;
        scene.environment = rt.texture;
        scene.background = bgAsEnvironment ? rt.texture : new THREE.Color('#0d1017');
      })
      .catch(() => {
        if (cancelled) return;
        const fallback = buildProceduralHdriTexture('softbox_warm', pmrem);
        if (fallback) {
          scene.environment = fallback;
        }
      })
      .finally(() => {
        if (!cancelled) setHdriLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeHdri, bgAsEnvironment]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.environmentIntensity = envIntensity;
    scene.backgroundBlurriness = envBlur;
    scene.background = bgAsEnvironment && envTexRef.current ? envTexRef.current : new THREE.Color('#0d1017');
  }, [envIntensity, envBlur, bgAsEnvironment]);

  // Sync studio lights & renderer settings
  useEffect(() => {
    const renderer = rendererRef.current;
    const lightsGroup = lightsGroupRef.current;
    if (!renderer || !lightsGroup) return;

    renderer.toneMapping = TONE_MAPPING_MAP[toneMapping];
    renderer.toneMappingExposure = exposure;
    const swGl = isSoftwareWebGLContext(renderer.getContext());
    renderer.shadowMap.enabled = shadowsEnabled && !swGl;

    lightsGroup.clear();
    lights.forEach((spec) => lightsGroup.add(buildThreeLightFromSpec(spec, shadowsEnabled && !swGl)));
  }, [lights, toneMapping, exposure, shadowsEnabled]);

  // Sync Post-Processing Passes (Bloom, Depth of Field, Motion Blur)
  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = postBloomStrength;
      bloomPassRef.current.threshold = postBloomThreshold;
    }
    if (bokehPassRef.current) {
      const uniforms = bokehPassRef.current.uniforms as Record<string, { value: number }>;
      if (uniforms.focus) uniforms.focus.value = dofFocus;
      if (uniforms.aperture) uniforms.aperture.value = dofAperture;
    }
    if (afterimagePassRef.current) {
      const uniforms = afterimagePassRef.current.uniforms as Record<string, { value: number }>;
      if (uniforms.damp) uniforms.damp.value = motionBlurDamp;
    }
  }, [postBloomStrength, postBloomThreshold, dofFocus, dofAperture, motionBlurDamp]);

  useEffect(() => {
    if (modelRootRef.current) {
      modelRootRef.current.visible = !hideDefaultBase;
    }
  }, [hideDefaultBase]);

  // Sync TransformControls gizmo mode
  useEffect(() => {
    const tc = transformRef.current;
    if (!tc) return;
    if (toolMode === 'translate' || toolMode === 'rotate' || toolMode === 'scale') {
      tc.setMode(toolMode);
      if (selectedObjectRef.current) tc.attach(selectedObjectRef.current);
    } else {
      tc.detach();
    }
  }, [toolMode]);

  const handleApplyShadingMode = useCallback(
    (mode: ViewportShadingMode) => {
      setShadingMode(mode);
      if (mode === 'wireframe') {
        setWireframeMode(true);
        if (clayShading) handleToggleClayShading();
      } else if (mode === 'solid') {
        setWireframeMode(false);
        if (!clayShading) handleToggleClayShading();
      } else if (mode === 'material') {
        setWireframeMode(false);
        if (clayShading) handleToggleClayShading();
        setShadowsEnabled(false);
      } else {
        setWireframeMode(false);
        if (clayShading) handleToggleClayShading();
        setShadowsEnabled(true);
      }
    },
    [clayShading, handleToggleClayShading]
  );

  const handleApplyInteractionMode = useCallback(
    (mode: BlenderInteractionMode) => {
      setInteractionMode(mode);
      if (mode === 'object') {
        setWireframeMode(false);
        if (weightPaintActiveRef.current) setWeightPaintMode(false);
        if (toolModeRef.current === 'paint' || toolModeRef.current === 'weight_paint') {
          setToolMode('translate');
        }
      } else if (mode === 'edit') {
        setWireframeMode(true);
        if (weightPaintActiveRef.current) setWeightPaintMode(false);
      } else if (mode === 'pose') {
        setWireframeMode(false);
        if (weightPaintActiveRef.current) setWeightPaintMode(false);
        if (bonesRef.current.length === 0) {
          handleRunAutoRig();
        } else {
          setShowSkeleton(true);
          if (!selectedBoneNameRef.current && bonesRef.current[0]) {
            handleSelectBoneForPose(bonesRef.current[0].name);
          }
        }
        setToolMode('rotate');
      } else if (mode === 'weight_paint') {
        setWireframeMode(false);
        setWeightPaintMode(true);
      }
    },
    [handleRunAutoRig, handleSelectBoneForPose, setWeightPaintMode]
  );

  const cycleInteractionMode = useCallback(() => {
    const order: BlenderInteractionMode[] =
      bonesRef.current.length > 0 ? ['object', 'edit', 'pose', 'weight_paint'] : ['object', 'edit'];
    const idx = order.indexOf(interactionMode);
    const next = order[(idx + 1) % order.length];
    handleApplyInteractionMode(next);
  }, [handleApplyInteractionMode, interactionMode]);

  // Apply Substance textures sent from Hub
  useEffect(() => {
    if (!substanceTextureRequest || !modelRootRef.current) return;
    const loader = new THREE.TextureLoader();
    const loadMap = (url: string | undefined, isColor: boolean): THREE.Texture | null => {
      if (!url) return null;
      const tex = loader.load(url);
      tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      tex.flipY = false;
      tex.needsUpdate = true;
      return tex;
    };

    const { slots, normalStrength, emissiveIntensity, aoIntensity } = substanceTextureRequest;
    const baseMap = loadMap(slots.baseColor?.dataUrl, true);
    const normalMap = loadMap(slots.normal?.dataUrl, false);
    const roughMap = loadMap(slots.roughness?.dataUrl, false);
    const metalMap = loadMap(slots.metallic?.dataUrl, false);
    const aoMap = loadMap(slots.ao?.dataUrl, false);
    const emissiveMap = loadMap(slots.emissive?.dataUrl, true);

    modelRootRef.current.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        const mat = m.material as THREE.MeshStandardMaterial;
        if (!mat) return;
        if (baseMap) {
          mat.map = baseMap;
          mat.color.setHex(0xffffff);
        }
        if (normalMap) {
          mat.normalMap = normalMap;
          mat.normalScale.set(normalStrength, normalStrength);
        }
        if (roughMap) mat.roughnessMap = roughMap;
        if (metalMap) mat.metalnessMap = metalMap;
        if (aoMap) {
          mat.aoMap = aoMap;
          mat.aoMapIntensity = aoIntensity;
        }
        if (emissiveMap) {
          mat.emissiveMap = emissiveMap;
          mat.emissive.setHex(0xffffff);
          mat.emissiveIntensity = emissiveIntensity;
        }
        mat.needsUpdate = true;
      }
    });
    flashBanner(`Texturas aplicadas (${substanceTextureRequest.materialName}).`);
  }, [substanceTextureRequest, flashBanner]);

  const applyObjectInspectorPatch = useCallback(
    (patch: Partial<SelectedObjectInspector>) => {
      const obj = selectedObjectRef.current;
      if (!obj) return;

      if (patch.position || patch.rotationDeg || patch.scale) {
        undoStackRef.current.push({
          obj,
          pos: obj.position.clone(),
          rot: obj.rotation.clone(),
          scale: obj.scale.clone(),
        });
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        redoStackRef.current = [];
        syncUndoRedoFlags();
      }

      if (patch.name !== undefined) {
        obj.name = patch.name.trim() || obj.name || 'Objeto_3D';
      }
      if (patch.position) {
        obj.position.set(
          Number.isFinite(patch.position[0]) ? patch.position[0] : obj.position.x,
          Number.isFinite(patch.position[1]) ? patch.position[1] : obj.position.y,
          Number.isFinite(patch.position[2]) ? patch.position[2] : obj.position.z
        );
      }
      if (patch.rotationDeg) {
        obj.rotation.set(
          THREE.MathUtils.degToRad(Number.isFinite(patch.rotationDeg[0]) ? patch.rotationDeg[0] : 0),
          THREE.MathUtils.degToRad(Number.isFinite(patch.rotationDeg[1]) ? patch.rotationDeg[1] : 0),
          THREE.MathUtils.degToRad(Number.isFinite(patch.rotationDeg[2]) ? patch.rotationDeg[2] : 0)
        );
      }
      if (patch.scale) {
        obj.scale.set(
          Math.max(0.01, Number.isFinite(patch.scale[0]) ? patch.scale[0] : obj.scale.x),
          Math.max(0.01, Number.isFinite(patch.scale[1]) ? patch.scale[1] : obj.scale.y),
          Math.max(0.01, Number.isFinite(patch.scale[2]) ? patch.scale[2] : obj.scale.z)
        );
      }

      if (patch.materialStyle !== undefined) {
        obj.userData.materialStyle = patch.materialStyle;
      }
      if (patch.interaction !== undefined) {
        obj.userData.interaction = patch.interaction;
      }
      if (patch.physicsEnabled !== undefined) {
        obj.userData.physicsEnabled = patch.physicsEnabled;
      }
      if (patch.rigidBodyMode !== undefined) {
        obj.userData.rigidBodyMode = patch.rigidBodyMode;
        obj.userData.physicsEnabled = patch.rigidBodyMode === 'dynamic';
        obj.userData.vy = 0;
      }
      if (patch.shaderEffect !== undefined) {
        obj.userData.shaderEffect = patch.shaderEffect;
        reactiveUniformsRef.current.uEffectMode.value = effectToModeInt(patch.shaderEffect.effect);
        reactiveUniformsRef.current.uEffectIntensity.value = patch.shaderEffect.intensity;
        reactiveUniformsRef.current.uEffectColor.value.set(patch.shaderEffect.color);
        reactiveUniformsRef.current.uEffectSpeed.value = patch.shaderEffect.speed;
        obj.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh || !mesh.material) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mt) => {
            attachReactiveShaderToMaterial(mt, reactiveUniformsRef.current);
            if (patch.shaderEffect?.effect === 'hologram') {
              mt.transparent = true;
              mt.needsUpdate = true;
            }
          });
        });
      }

      const wantsMaterialUpdate =
        patch.materialStyle !== undefined ||
        patch.color !== undefined ||
        patch.roughness !== undefined ||
        patch.metalness !== undefined ||
        patch.transmission !== undefined ||
        patch.emissiveIntensity !== undefined;

      if (wantsMaterialUpdate) {
        obj.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh || !mesh.material) return;
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          const updatedMats = mats.map((rawMat) => {
            if (patch.materialStyle !== undefined) {
              const phys = upgradeToPhysicalMaterial(rawMat);
              const existingMap = phys.map;
              const hex = patch.color ?? (phys.color ? `#${phys.color.getHexString()}` : '#f97316');
              applySplineStyleToPhysicalMaterial(phys, patch.materialStyle, hex, {
                roughness: patch.roughness,
                metalness: patch.metalness,
                transmission: patch.transmission,
                emissiveIntensity: patch.emissiveIntensity,
              });
              if (existingMap && patch.materialStyle !== 'glass') {
                phys.map = existingMap;
                phys.needsUpdate = true;
              }
              attachReactiveShaderToMaterial(phys, reactiveUniformsRef.current);
              return phys;
            }
            const std = rawMat as THREE.MeshPhysicalMaterial;
            if (patch.color !== undefined && std.color) std.color.set(patch.color);
            if (patch.roughness !== undefined && 'roughness' in std) std.roughness = patch.roughness;
            if (patch.metalness !== undefined && 'metalness' in std) std.metalness = patch.metalness;
            if (patch.transmission !== undefined && 'transmission' in std) {
              std.transmission = patch.transmission;
              if (patch.transmission > 0.01) {
                std.transparent = true;
                std.opacity = Math.min(std.opacity, 0.92);
              }
            }
            if (patch.emissiveIntensity !== undefined && 'emissiveIntensity' in std) {
              std.emissiveIntensity = patch.emissiveIntensity;
              if (patch.emissiveIntensity > 0.01 && std.color) {
                std.emissive?.copy(std.color);
              }
            }
            std.needsUpdate = true;
            return std;
          });
          mesh.material = Array.isArray(mesh.material) ? updatedMats : updatedMats[0];
        });
      }

      syncSelectedInspectorFromObject(obj);
      if ((obj as THREE.Bone).isBone && autoKeyRef.current && (patch.position || patch.rotationDeg)) {
        addBoneKeyframeRef.current();
      }
      if (patch.name !== undefined || patch.materialStyle !== undefined || patch.color !== undefined) {
        syncSceneHierarchy();
      }
    },
    [syncSceneHierarchy, syncSelectedInspectorFromObject, syncUndoRedoFlags]
  );

  const handleDuplicateSelected = useCallback(() => {
    const obj = selectedObjectRef.current;
    if (!obj || obj === modelRootRef.current) return;
    const parent = obj.parent ?? splineGroupRef.current;
    if (!parent) return;
    const clone = obj.clone(true);
    clone.traverse((child) => {
      const m = child as THREE.Mesh;
      if (m.isMesh && m.material) {
        m.material = Array.isArray(m.material)
          ? m.material.map((mt) => mt.clone())
          : m.material.clone();
      }
    });
    clone.name = `${obj.name || 'Objeto'}_Copia`;
    clone.position.x += 0.35;
    parent.add(clone);
    syncSceneHierarchy();
    syncSelectedInspectorFromObject(clone);
    flashBanner(`Duplicado: ${clone.name}`);
  }, [flashBanner, syncSceneHierarchy, syncSelectedInspectorFromObject]);

  const handleDeleteSelected = useCallback(() => {
    const obj = selectedObjectRef.current;
    if (!obj || !obj.parent) return;
    if (obj === modelRootRef.current) {
      flashBanner('Use "Restaurar Cena Padrão" para limpar o modelo inteiro.');
      return;
    }
    const name = obj.name || 'Objeto';
    obj.parent.remove(obj);
    disposeObject3D(obj);
    syncSelectedInspectorFromObject(null);
    syncSceneHierarchy();
    flashBanner(`Removido: ${name}`);
  }, [flashBanner, syncSceneHierarchy, syncSelectedInspectorFromObject]);

  const handleUndoTransform = useCallback(() => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    redoStackRef.current.push({
      obj: entry.obj,
      pos: entry.obj.position.clone(),
      rot: entry.obj.rotation.clone(),
      scale: entry.obj.scale.clone(),
    });
    entry.obj.position.copy(entry.pos);
    entry.obj.rotation.copy(entry.rot);
    entry.obj.scale.copy(entry.scale);
    syncUndoRedoFlags();
    syncSelectedInspectorFromObject(entry.obj);
  }, [syncSelectedInspectorFromObject, syncUndoRedoFlags]);

  const handleRedoTransform = useCallback(() => {
    const entry = redoStackRef.current.pop();
    if (!entry) return;
    undoStackRef.current.push({
      obj: entry.obj,
      pos: entry.obj.position.clone(),
      rot: entry.obj.rotation.clone(),
      scale: entry.obj.scale.clone(),
    });
    entry.obj.position.copy(entry.pos);
    entry.obj.rotation.copy(entry.rot);
    entry.obj.scale.copy(entry.scale);
    syncUndoRedoFlags();
    syncSelectedInspectorFromObject(entry.obj);
  }, [syncSelectedInspectorFromObject, syncUndoRedoFlags]);

  const handleRestoreDefaultScene = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !modelRootRef.current) return;
    transformRef.current?.detach();
    syncSelectedInspectorFromObject(null);
    if (mixerRef.current) {
      mixerRef.current.stopAllAction();
      mixerRef.current = null;
    }
    activeActionRef.current = null;
    overlayActionRef.current = null;
    skeletonVisualizerRef.current?.setBones([], true);
    skeletonVisualizerRef.current?.setSelectedBone(null);
    if (rigMarkersGroupRef.current) {
      scene.remove(rigMarkersGroupRef.current);
      disposeObject3D(rigMarkersGroupRef.current);
      rigMarkersGroupRef.current = null;
      setShowRigMarkers(false);
    }
    if (ikTargetsGroupRef.current) {
      ikTargetsGroupRef.current.visible = false;
      ikTargetsGroupRef.current.clear();
    }
    setIkEnabled(false);
    ikEnabledRef.current = false;
    setWeightPaintActive(false);
    weightPaintActiveRef.current = false;
    skeletonRef.current = null;
    bonesRef.current = [];
    restBoneTransformsRef.current.clear();
    clipsRef.current = [];
    clipPoolMapRef.current.clear();
    setClipNames([]);
    setActiveClipTracks([]);
    setRiggedBoneNames([]);
    setRiggedBoneTree([]);
    setSelectedBoneName(null);
    setShowSkeleton(true);
    setClayShading(false);
    setReverseClip(false);
    setInPlaceClip(false);
    setAutoKey(false);
    setIsPlaying(false);
    setAnimProgress(0);
    setAnimDuration(0);
    undoStackRef.current = [];
    redoStackRef.current = [];
    syncUndoRedoFlags();
    paintSnapshotsRef.current.clear();
    if (splineGroupRef.current) {
      while (splineGroupRef.current.children.length > 0) {
        const ch = splineGroupRef.current.children[0];
        splineGroupRef.current.remove(ch);
        disposeObject3D(ch);
      }
    }
    setEmitters([]);
    setSelectedEmitterId(null);
    syncEmitterSceneGroup([]);
    setHideDefaultBase(false);
    scene.remove(modelRootRef.current);
    disposeObject3D(modelRootRef.current);
    const fresh = createDefaultStudioCharacterGroup();
    fresh.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mt) => attachReactiveShaderToMaterial(mt, reactiveUniformsRef.current));
      }
    });
    modelRootRef.current = fresh;
    scene.add(fresh);

    const rigRes = autoRigAndAnimateGroup(fresh, 'HUMANOIDE', computeDefaultRigMarkers(fresh));
    skeletonRef.current = rigRes.skeleton;
    bonesRef.current = rigRes.bones;
    restBoneTransformsRef.current = new Map(
      rigRes.bones.map((b) => [b.name, { pos: b.position.clone(), quat: b.quaternion.clone() }])
    );
    setRiggedBoneNames(rigRes.bones.map((b) => b.name));
    setRiggedBoneTree(buildBoneHierarchy(rigRes.bones));
    skeletonVisualizerRef.current?.setBones(rigRes.bones, true);
    skeletonVisualizerRef.current?.setVisible(true);

    const mixer = new THREE.AnimationMixer(fresh);
    mixerRef.current = mixer;
    clipsRef.current = rigRes.clips;
    const pool = new Map<string, THREE.AnimationClip>();
    rigRes.clips.forEach((c) => pool.set(c.name.toLowerCase(), c));
    clipPoolMapRef.current = pool;
    setClipNames(rigRes.clips.map((c) => c.name));
    const idleIdx = Math.max(
      0,
      rigRes.clips.findIndex((c) => c.name.toLowerCase() === 'idle_loop')
    );
    const idleClip = rigRes.clips[idleIdx];
    if (idleClip) {
      const act = mixer.clipAction(idleClip);
      act.setLoop(THREE.LoopRepeat, Infinity);
      act.play();
      mixer.update(0);
      activeActionRef.current = act;
      setActiveClipIdx(idleIdx);
      setActiveClipId(idleClip.name);
      setAnimDuration(idleClip.duration);
      setAnimProgress(0);
      setActiveClipTracks(
        idleClip.tracks.map((tr) => ({
          name: tr.name,
          times: Array.from(tr.times),
          values: Array.from(tr.values),
          type: tr.ValueTypeName === 'quaternion' ? 'quaternion' : 'vector',
        }))
      );
    }
    updateStatsRef.current({ bones: rigRes.boneCount });

    setActiveAssetName('Modelo_Studio_AlexDesign');
    activeAssetNameRef.current = 'Modelo_Studio_AlexDesign';
    onImportedModelFileRef.current(null);
    extractAndPushUvs(fresh, 'auto');
    syncSceneHierarchy('Modelo_Studio_AlexDesign');
    refreshMorphTargets();
    frameCameraToScene();
    syncSelectedInspectorFromObject(fresh);
    flashBanner('Cena restaurada: personagem padrão com Armature X-Ray & IK ativo.');
  }, [extractAndPushUvs, flashBanner, frameCameraToScene, refreshMorphTargets, syncEmitterSceneGroup, syncSceneHierarchy, syncSelectedInspectorFromObject, syncUndoRedoFlags]);

  const handleApplyGlobalScale = useCallback((scale: number) => {
    const clamped = Math.max(0.1, Math.min(5, scale));
    if (modelRootRef.current) {
      modelRootRef.current.scale.setScalar(clamped);
    }
  }, []);

  const handleApplyAccentColor = useCallback(
    (hex: string) => {
      if (!modelRootRef.current) return;
      modelRootRef.current.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          if (/accent|peitoral|bota|antebraco|crista/i.test(m.name)) {
            const mat = m.material as THREE.MeshStandardMaterial;
            if (mat?.color) {
              mat.color.set(hex);
              mat.needsUpdate = true;
            }
          }
        }
      });
      flashBanner(`Cor de destaque atualizada: ${hex}`);
    },
    [flashBanner]
  );

  const handleOpenHtmlTo3dModal = useCallback(() => {
    const sel = selectedObjectRef.current;
    const htmlGroup = sel?.userData?.isHtml3d
      ? (sel as THREE.Group)
      : sel?.parent?.userData?.isHtml3d
      ? (sel.parent as THREE.Group)
      : null;
    if (htmlGroup && htmlGroup.userData.html3dSpec) {
      editingHtml3dGroupRef.current = htmlGroup;
      setEditingHtml3dSpec({ ...(htmlGroup.userData.html3dSpec as HtmlTo3dSpec) });
    } else {
      editingHtml3dGroupRef.current = null;
      setEditingHtml3dSpec(null);
    }
    setHtml3dModalOpen(true);
  }, []);

  const handleApplyHtmlTo3d = useCallback(
    (spec: HtmlTo3dSpec) => {
      const maxAniso = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 4;
      const existing = editingHtml3dGroupRef.current;
      if (existing && existing.parent) {
        updateHtmlTo3dGroup(existing, spec, maxAniso);
        syncSceneHierarchy();
        syncSelectedInspectorFromObject(existing);
        editingHtml3dGroupRef.current = null;
        flashBanner(`Painel HTML → 3D atualizado: ${existing.name}`);
        return;
      }
      const grp = splineGroupRef.current;
      if (!grp) return;
      const created = createHtmlTo3dGroup(spec, maxAniso);
      const offset = (grp.children.length % 4) * 0.35 - 0.35;
      created.position.set(offset, 1.05, 0.35);
      grp.add(created);
      syncSceneHierarchy();
      syncSelectedInspectorFromObject(created);
      flashBanner(`Painel HTML → 3D criado: ${created.name}`);
    },
    [flashBanner, syncSceneHierarchy, syncSelectedInspectorFromObject]
  );

  const handleReferenceImageFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || '');
        if (!dataUrl) return;
        const img = new Image();
        img.onload = () => {
          const aspect =
            img.naturalWidth && img.naturalHeight
              ? img.naturalWidth / img.naturalHeight
              : 1;
          setRefPlane((prev) => ({
            ...prev,
            active: true,
            visible: true,
            name: file.name,
            dataUrl,
            aspect,
          }));
          setShowReferencePopover(true);
          flashBanner(`Referência carregada: ${file.name}`);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [flashBanner]
  );

  const applyTextureToTargetObject = useCallback(
    (channel: SubstanceChannelId, file: File): Promise<void> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || '');
          if (!dataUrl) {
            resolve();
            return;
          }
          const target = selectedObjectRef.current ?? modelRootRef.current;
          if (!target) {
            resolve();
            return;
          }
          const isColor = channel === 'baseColor' || channel === 'emissive';
          const maxAniso = rendererRef.current?.capabilities.getMaxAnisotropy() ?? 4;
          new THREE.TextureLoader().load(dataUrl, (tex) => {
            tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
            tex.flipY = false;
            tex.anisotropy = Math.min(8, maxAniso);
            tex.needsUpdate = true;

            target.traverse((o) => {
              if (!(o as THREE.Mesh).isMesh) return;
              const mesh = o as THREE.Mesh;
              const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
              mats.forEach((raw) => {
                const mat = raw as THREE.MeshStandardMaterial;
                if (!mat || !('roughness' in mat)) return;
                if (channel === 'baseColor') {
                  mat.map = tex;
                  mat.color.setHex(0xffffff);
                } else if (channel === 'normal') {
                  mat.normalMap = tex;
                } else if (channel === 'roughness') {
                  mat.roughnessMap = tex;
                } else if (channel === 'metallic') {
                  mat.metalnessMap = tex;
                } else if (channel === 'emissive') {
                  mat.emissiveMap = tex;
                  if (mat.emissiveIntensity < 0.05) {
                    mat.emissive.setHex(0xffffff);
                    mat.emissiveIntensity = 1.0;
                  }
                } else if (channel === 'ao') {
                  if (!mesh.geometry.attributes.uv2 && mesh.geometry.attributes.uv) {
                    mesh.geometry.setAttribute('uv2', mesh.geometry.attributes.uv);
                  }
                  mat.aoMap = tex;
                } else if (channel === 'opacity') {
                  mat.alphaMap = tex;
                  mat.transparent = true;
                }
                mat.needsUpdate = true;
              });
            });

            if (
              channel === 'baseColor' ||
              channel === 'normal' ||
              channel === 'roughness' ||
              channel === 'metallic' ||
              channel === 'emissive' ||
              channel === 'ao'
            ) {
              setActiveTextureMaps((prev) => ({ ...prev, [channel]: dataUrl }));
            }
            resolve();
          });
        };
        reader.readAsDataURL(file);
      });
    },
    []
  );

  const handleUploadTextureChannel = useCallback(
    async (channel: SubstanceChannelId, file: File) => {
      await applyTextureToTargetObject(channel, file);
      flashBanner(`Textura "${channel}" aplicada (${file.name}).`);
    },
    [applyTextureToTargetObject, flashBanner]
  );

  const handleClearTextureChannel = useCallback(
    (channel: SubstanceChannelId) => {
      const target = selectedObjectRef.current ?? modelRootRef.current;
      if (!target) return;
      target.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        const mesh = o as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((raw) => {
          const mat = raw as THREE.MeshStandardMaterial;
          if (!mat || !('roughness' in mat)) return;
          if (channel === 'baseColor') {
            mat.map?.dispose();
            mat.map = null;
          } else if (channel === 'normal') {
            mat.normalMap?.dispose();
            mat.normalMap = null;
          } else if (channel === 'roughness') {
            mat.roughnessMap?.dispose();
            mat.roughnessMap = null;
          } else if (channel === 'metallic') {
            mat.metalnessMap?.dispose();
            mat.metalnessMap = null;
          } else if (channel === 'emissive') {
            mat.emissiveMap?.dispose();
            mat.emissiveMap = null;
          } else if (channel === 'ao') {
            mat.aoMap?.dispose();
            mat.aoMap = null;
          }
          mat.needsUpdate = true;
        });
      });
      setActiveTextureMaps((prev) => {
        const next = { ...prev };
        delete next[channel];
        return next;
      });
      flashBanner(`Canal de textura "${channel}" removido.`);
    },
    [flashBanner]
  );

  const handleBatchUploadTextures = useCallback(
    async (files: File[]) => {
      let applied = 0;
      for (const f of files) {
        const detected = detectSubstanceChannel(f.name) ?? (files.length === 1 ? 'baseColor' : null);
        if (detected) {
          await applyTextureToTargetObject(detected, f);
          applied += 1;
        }
      }
      if (applied > 0) {
        flashBanner(`${applied} mapa(s) PBR mapeado(s) automaticamente!`);
      } else {
        flashBanner('Nenhum sufixo reconhecido (_albedo, _normal, _roughness, _metallic, _ao).');
      }
    },
    [applyTextureToTargetObject, flashBanner]
  );

  // Global status snapshot sync
  useEffect(() => {
    onStatusSnapshotRef.current?.({
      clipNames,
      activeClipIdx,
      activeClipId,
      isPlaying,
      animLoop,
      animSpeed,
      animProgress,
      animDuration,
      mirrorClip,
      reverseClip,
      inPlaceClip,
      clayShading,
      autoKey,
      interpolationMode,
      hasCopiedKeyframe,
      showSkeleton,
      showRigMarkers,
      markerSymmetry,
      ikEnabled,
      floorContactEnabled,
      weightPaintActive,
      weightBrushMode,
      weightBrushRadius,
      weightBrushStrength,
      morphTargets,
      riggedBoneNames,
      selectedBoneName,
      strips,
      overlayClipId,
      overlayMask,
      overlayWeight,
      postureOffsets,
      activeClipTracks,
      hdriLoading,
      customHdriName,
      isRendering,
      showGrid,
      canUndo,
      canRedo,
      emitters,
      selectedEmitterId,
      animInPoint,
      animOutPoint,
    });
  }, [
    clipNames,
    activeClipIdx,
    activeClipId,
    isPlaying,
    animLoop,
    animSpeed,
    animProgress,
    animDuration,
    mirrorClip,
    reverseClip,
    inPlaceClip,
    clayShading,
    autoKey,
    interpolationMode,
    hasCopiedKeyframe,
    showSkeleton,
    showRigMarkers,
    markerSymmetry,
    ikEnabled,
    floorContactEnabled,
    weightPaintActive,
    weightBrushMode,
    weightBrushRadius,
    weightBrushStrength,
    morphTargets,
    riggedBoneNames,
    selectedBoneName,
    strips,
    overlayClipId,
    overlayMask,
    overlayWeight,
    postureOffsets,
    activeClipTracks,
    hdriLoading,
    customHdriName,
    isRendering,
    showGrid,
    canUndo,
    canRedo,
    emitters,
    selectedEmitterId,
    animInPoint,
    animOutPoint,
  ]);

  // Register global header & contextual page actions
  useEffect(() => {
    onRegisterGlobalActionsRef.current({
      undo: handleUndoTransform,
      redo: handleRedoTransform,
      toggleWireframe: () => setWireframeMode((v) => !v),
      toggleClayShading: handleToggleClayShading,
      importModel: () => fileInputRef.current?.click(),
      importAnimationFile: () => animFileInputRef.current?.click(),
      frameScene: frameCameraToScene,
      runAutoRig: (preset) => handleRunAutoRig(preset),
      resetPose: handleResetPose,
      removeRig: handleRemoveRig,
      toggleRigMarkers: handleToggleRigMarkers,
      toggleMarkerSymmetry: () => setMarkerSymmetry((v) => !v),
      toggleSkeleton: () => setShowSkeleton((s) => !s),
      toggleIk: handleToggleIk,
      toggleFloorContact: () => {
        setFloorContactEnabled((v) => {
          const next = !v;
          floorContactEnabledRef.current = next;
          evaluateFrameNow();
          return next;
        });
      },
      setWeightPaintActive: setWeightPaintMode,
      setWeightBrushMode: (m) => setWeightBrushMode(m),
      setWeightBrushRadius: (r) => setWeightBrushRadius(r),
      setWeightBrushStrength: (s) => setWeightBrushStrength(s),
      setMorphTargetValue: handleChangeMorphTarget,
      selectBoneForPose: handleSelectBoneForPose,
      selectClip: handleSelectClip,
      togglePlay: () => setIsPlaying((p) => !p),
      stopAnimation: handleStopAnimation,
      stepFrame: handleStepFrame,
      seekNormalized: handleSeekNormalized,
      setPlayRange: handleSetPlayRange,
      resetPlayRange: handleResetPlayRange,
      toggleLoop: () => setAnimLoop((v) => !v),
      toggleMirrorClip: handleToggleMirrorClip,
      toggleReverseClip: handleToggleReverseClip,
      toggleInPlaceClip: handleToggleInPlaceClip,
      toggleAutoKey: () => setAutoKey((v) => !v),
      setInterpolationMode: handleChangeInterpolationMode,
      setAnimSpeed: (s) => setAnimSpeed(s),
      setStrips: handleUpdateStrips,
      setOverlayLayer: handleSetOverlayLayer,
      setPostureOffsets: handleUpdatePostureOffsets,
      addBoneKeyframe: handleAddBoneKeyframe,
      copyKeyframe: handleCopyKeyframe,
      pasteKeyframe: handlePasteKeyframe,
      deleteKeyframe: handleDeleteKeyframe,
      moveKeyframe: handleMoveKeyframe,
      copyClipLink: handleCopyClipLink,
      copyPublicLink: handleCopyPublicLink,
      bakeIkPhysics: handleBakeIkPhysics,
      setToolMode: selectToolModeWithTarget,
      setShowGrid: (show) => setShowGrid(show),
      applyGlobalScale: handleApplyGlobalScale,
      applyAccentColor: handleApplyAccentColor,
      getCodeExportObjects: () => codeExportObjects,
      auditCurrentScene: () =>
        modelRootRef.current
          ? auditThreeSceneGroup(
              modelRootRef.current,
              `${activeAssetName}.glb`,
              clipsRef.current.length
            )
          : null,
      exportModel: handleExportModel,
      exportFbx: handleExportFbx,
      exportZip: handleExportZip,
      uploadHdri: () => hdriFileInputRef.current?.click(),
      renderPng: () => handleRenderPng(false),
      renderTransparentPng: () => handleRenderPng(true),
      restoreDefaultScene: handleRestoreDefaultScene,
      openCodeExport: () => setShowCodeModal(true),
      openHtmlTo3d: handleOpenHtmlTo3dModal,
      openReferenceImport: () => refImageInputRef.current?.click(),
      setRightPropTab: (tab) => {
        suppressAutoPropTabRef.current = true;
        setDockExpanded(true);
        setActivePropTab(tab);
      },
      setTimelineDocked: (docked) => setTimelineDocked(docked),
      addEmitter: handleAddEmitter,
      selectEmitter: (id) => setSelectedEmitterId(id),
      updateEmitter: handleUpdateEmitter,
      removeEmitter: handleRemoveEmitter,
    });
  });

  // Global keyboard shortcuts (Q/W/E/R/B/F/Tab/Space, Ctrl+Z/Y, Del)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (html3dModalOpen || showCodeModal || verifyModalOpen || document.querySelector('[role="dialog"]')) {
        return;
      }

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

      const key = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedoTransform();
        else handleUndoTransform();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        handleRedoTransform();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.code === 'Space' || key === ' ') {
        e.preventDefault();
        if (clipsRef.current.length === 0) {
          handleRunAutoRig();
        } else {
          setIsPlaying((p) => !p);
        }
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        cycleInteractionMode();
        return;
      }

      if (key === 'q') selectToolModeWithTarget('orbit');
      else if (key === 'w') selectToolModeWithTarget('translate');
      else if (key === 'e') selectToolModeWithTarget('rotate');
      else if (key === 'r') selectToolModeWithTarget('scale');
      else if (key === 'b') selectToolModeWithTarget('paint');
      else if (key === 'f') frameCameraToScene();
      else if (key === 'k') {
        e.preventDefault();
        addBoneKeyframeRef.current();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObjectRef.current) {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    cycleInteractionMode,
    frameCameraToScene,
    handleDeleteSelected,
    handleRedoTransform,
    handleRunAutoRig,
    handleUndoTransform,
    html3dModalOpen,
    selectToolModeWithTarget,
    showCodeModal,
    verifyModalOpen,
  ]);

  const handleAddPrimitive = (kind: PrimitiveShapeKind) => {
    const group = splineGroupRef.current;
    if (!group) return;
    const item = PRIMITIVE_CATALOG.find((c) => c.kind === kind) ?? PRIMITIVE_CATALOG[0];
    const geo = createSplinePrimitiveGeometry(kind);
    const mat = new THREE.MeshPhysicalMaterial();
    applySplineStyleToPhysicalMaterial(mat, 'physical', item.defaultColor);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `${item.label}_${group.children.length + 1}`;
    const offset = (group.children.length % 5) * 0.36 - 0.72;
    mesh.position.set(offset, 0.9, 0.25);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.isSplinePrimitive = true;
    mesh.userData.primitiveKind = kind;
    mesh.userData.materialStyle = 'physical';
    mesh.userData.interaction = 'none';
    mesh.userData.physicsEnabled = false;
    group.add(mesh);
    syncSceneHierarchy();
    syncSelectedInspectorFromObject(mesh);
    flashBanner(`Adicionado: ${mesh.name}`);
  };

  const handleApplyTemplate = (tpl: SplineTemplateId) => {
    const group = splineGroupRef.current;
    if (!group) return;
    group.clear();

    if (tpl === 'character_rig') {
      setHideDefaultBase(false);
      handleRunAutoRig('HUMANOIDE');
      return;
    }

    setHideDefaultBase(true);
    if (tpl === 'glass_neon') {
      const knot = new THREE.Mesh(
        createSplinePrimitiveGeometry('torus_knot'),
        new THREE.MeshPhysicalMaterial()
      );
      applySplineStyleToPhysicalMaterial(knot.material, 'glass', '#e0f2fe');
      knot.position.set(0, 1.0, 0);
      knot.scale.setScalar(1.4);
      knot.userData = { isSplinePrimitive: true, primitiveKind: 'torus_knot', materialStyle: 'glass', interaction: 'spin' };

      const orb1 = new THREE.Mesh(createSplinePrimitiveGeometry('sphere'), new THREE.MeshPhysicalMaterial());
      applySplineStyleToPhysicalMaterial(orb1.material, 'neon', '#f97316');
      orb1.position.set(-0.75, 1.15, 0.2);
      orb1.scale.setScalar(0.55);
      orb1.userData = { isSplinePrimitive: true, primitiveKind: 'sphere', materialStyle: 'neon', interaction: 'float' };

      const orb2 = new THREE.Mesh(createSplinePrimitiveGeometry('sphere'), new THREE.MeshPhysicalMaterial());
      applySplineStyleToPhysicalMaterial(orb2.material, 'neon', '#06b6d4');
      orb2.position.set(0.75, 0.85, -0.2);
      orb2.scale.setScalar(0.5);
      orb2.userData = { isSplinePrimitive: true, primitiveKind: 'sphere', materialStyle: 'neon', interaction: 'float' };

      knot.name = 'No_Vidro_Refrativo';
      orb1.name = 'Esfera_Neon_Laranja';
      orb2.name = 'Esfera_Neon_Ciano';
      group.add(knot, orb1, orb2);
    } else if (tpl === 'product_showcase') {
      const base = new THREE.Mesh(createSplinePrimitiveGeometry('cylinder'), new THREE.MeshPhysicalMaterial());
      applySplineStyleToPhysicalMaterial(base.material, 'chrome', '#64748b');
      base.position.set(0, 0.25, 0);
      base.scale.set(2.2, 0.65, 2.2);
      base.name = 'Pedestal_Metalico';
      base.userData = { isSplinePrimitive: true, primitiveKind: 'cylinder', materialStyle: 'chrome', interaction: 'none' };

      const hero = new THREE.Mesh(createSplinePrimitiveGeometry('icosahedron'), new THREE.MeshPhysicalMaterial());
      applySplineStyleToPhysicalMaterial(hero.material, 'ceramic', '#f97316');
      hero.position.set(0, 1.05, 0);
      hero.scale.setScalar(1.2);
      hero.name = 'Escultura_Produto';
      hero.userData = { isSplinePrimitive: true, primitiveKind: 'icosahedron', materialStyle: 'ceramic', interaction: 'spin' };
      group.add(base, hero);
    } else {
      (['star', 'torus', 'capsule', 'heart'] as PrimitiveShapeKind[]).forEach((k, i) => {
        const m = new THREE.Mesh(createSplinePrimitiveGeometry(k), new THREE.MeshPhysicalMaterial());
        const colors = ['#f59e0b', '#a855f7', '#10b981', '#fb7185'];
        applySplineStyleToPhysicalMaterial(m.material, 'physical', colors[i]);
        m.position.set((i - 1.5) * 0.65, 0.95 + (i % 2) * 0.25, 0);
        m.name = `Forma_${i + 1}`;
        m.userData = { isSplinePrimitive: true, primitiveKind: k, materialStyle: 'physical', interaction: 'float' };
        group.add(m);
      });
    }
    syncSceneHierarchy();
    frameCameraToScene();
    flashBanner(`Template aplicado: ${tpl}`);
  };

  const handleRunBoolean = (op: BooleanOpKind) => {
    const group = splineGroupRef.current;
    if (!group || group.children.length < 2) return;
    const meshA = group.children[group.children.length - 2] as THREE.Mesh;
    const meshB = group.children[group.children.length - 1] as THREE.Mesh;
    if (!meshA.isMesh || !meshB.isMesh) return;

    const geo = performCsgBoolean(meshA, meshB, op);
    const outMesh = new THREE.Mesh(geo, (meshA.material as THREE.Material).clone());
    outMesh.name = `CSG_${op}_${group.children.length}`;
    outMesh.position.copy(meshA.position);
    outMesh.rotation.copy(meshA.rotation);
    outMesh.scale.copy(meshA.scale);
    outMesh.userData.isSplinePrimitive = true;
    outMesh.userData.interaction = 'none';
    group.remove(meshA, meshB);
    group.add(outMesh);
    syncSceneHierarchy();
    syncSelectedInspectorFromObject(outMesh);
    flashBanner(`Operação CSG (${op}) aplicada.`);
  };

  const handleRenderPng = async (forceTransparent?: boolean) => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const cam = cameraRef.current;
    const cont = mountRef.current;
    if (!renderer || !scene || !cam || !cont) return;

    const useTransparent = forceTransparent !== undefined ? forceTransparent : transparentBg;
    setIsRendering(true);
    try {
      const hideObjs: THREE.Object3D[] = [];
      if (gridRef.current) hideObjs.push(gridRef.current);
      if (transformRef.current) hideObjs.push(transformRef.current.getHelper());
      if (skeletonVisualizerRef.current) hideObjs.push(skeletonVisualizerRef.current.group);
      if (rigMarkersGroupRef.current) hideObjs.push(rigMarkersGroupRef.current);
      if (referenceGroupRef.current) hideObjs.push(referenceGroupRef.current);

      const blob = await renderSceneToPngBlob({
        renderer,
        scene,
        camera: cam,
        container: cont,
        resolution,
        transparentBg: useTransparent,
        hideObjects: hideObjs,
      });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = useTransparent
          ? `${activeAssetName}_Transparente.png`
          : `${activeAssetName}_Render.png`;
        a.click();
        URL.revokeObjectURL(url);
        flashBanner(
          useTransparent
            ? 'PNG com fundo transparente exportado!'
            : 'Render PNG exportado!'
        );
      }
    } finally {
      setIsRendering(false);
    }
  };

  const codeExportObjects: CodeExportObjectSpec[] = useMemo(() => {
    const specs: CodeExportObjectSpec[] = [];
    const scan = (root: THREE.Object3D | null) => {
      root?.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && specs.length < 12) {
          const m = o as THREE.Mesh;
          const mat = m.material as THREE.MeshPhysicalMaterial;
          specs.push({
            name: m.name || 'Objeto',
            kind: (m.userData.primitiveKind as PrimitiveShapeKind) || 'mesh',
            position: [m.position.x, m.position.y, m.position.z],
            rotationDeg: [
              THREE.MathUtils.radToDeg(m.rotation.x),
              THREE.MathUtils.radToDeg(m.rotation.y),
              THREE.MathUtils.radToDeg(m.rotation.z),
            ],
            scale: [m.scale.x, m.scale.y, m.scale.z],
            color: mat?.color ? `#${mat.color.getHexString()}` : '#f97316',
            roughness: mat?.roughness ?? 0.35,
            metalness: mat?.metalness ?? 0.2,
            transmission: mat?.transmission ?? 0,
            emissiveIntensity: mat?.emissiveIntensity ?? 0,
            interaction: (m.userData.interaction as CodeExportObjectSpec['interaction']) || 'none',
          });
        }
      });
    };
    scan(splineGroupRef.current);
    if (specs.length === 0) scan(modelRootRef.current);
    return specs;
  }, [sceneMeshes]);

  const currentStage: ViewportStageKey = focusedStage || 'stage2';

  return (
    <div
      className="relative flex-1 flex flex-col lg:flex-row min-h-0 bg-[#0D1017] overflow-hidden"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
          loadModelFromFiles(Array.from(e.dataTransfer.files));
        }
      }}
    >
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) loadModelFromFiles(Array.from(e.target.files));
          e.target.value = '';
        }}
      />
      <input
        ref={animFileInputRef}
        type="file"
        accept=".fbx,.glb,.gltf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportAnimationFile(f);
          e.target.value = '';
        }}
      />
      <input
        ref={particleSpriteInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const targetId = spriteUploadTargetEmitterRef.current;
          if (f && targetId) {
            const url = URL.createObjectURL(f);
            handleUpdateEmitter(targetId, { spritePreset: 'custom', customSpriteDataUrl: url });
            flashBanner(`Sprite VFX aplicado: ${f.name}`);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={textureFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const url = URL.createObjectURL(f);
          new THREE.TextureLoader().load(url, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
            const target = selectedObjectRef.current as THREE.Mesh | null;
            if (target?.isMesh && target.material instanceof THREE.MeshStandardMaterial) {
              target.material.map = tex;
              target.material.color.setHex(0xffffff);
              target.material.needsUpdate = true;
            }
            flashBanner(`Textura aplicada: ${f.name}`);
            URL.revokeObjectURL(url);
          });
          e.target.value = '';
        }}
      />
      <input
        ref={hdriFileInputRef}
        type="file"
        accept=".hdr"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f || !pmremRef.current || !sceneRef.current) return;
          const url = URL.createObjectURL(f);
          setHdriLoading(true);
          new RGBELoader()
            .loadAsync(url)
            .then((tex) => {
              const rt = pmremRef.current!.fromEquirectangular(tex);
              tex.dispose();
              envTexRef.current?.dispose();
              envTexRef.current = rt.texture;
              sceneRef.current!.environment = rt.texture;
              setActiveHdri('custom');
              setCustomHdriName(f.name);
              flashBanner(`HDRI carregado: ${f.name}`);
            })
            .catch(() => flashBanner('Falha ao carregar HDRI customizado.'))
            .finally(() => {
              setHdriLoading(false);
              URL.revokeObjectURL(url);
            });
          e.target.value = '';
        }}
      />
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          const target = selectedObjectRef.current as THREE.Mesh | null;
          if (!f || !target?.isMesh) return;
          const video = document.createElement('video');
          video.src = URL.createObjectURL(f);
          video.loop = true;
          video.muted = true;
          video.play().catch(() => {});
          const tex = new THREE.VideoTexture(video);
          tex.colorSpace = THREE.SRGBColorSpace;
          if (target.material instanceof THREE.MeshStandardMaterial) {
            target.material.map = tex;
            target.material.color.setHex(0xffffff);
            target.material.needsUpdate = true;
          }
          flashBanner(`Textura de vídeo aplicada: ${f.name}`);
          e.target.value = '';
        }}
      />
      <input
        ref={refImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleReferenceImageFile(f);
          e.target.value = '';
        }}
      />

      {/* Left Column — Explorer (Armature / Malhas / Referências) */}
      {!hideRightInspector && showMeshDrawer && (
        <ExplorerOutlinerDock
          onCollapse={() => setShowMeshDrawer(false)}
          meshes={sceneMeshes}
          selectedMeshId={selectedMeshId}
          riggedBoneNames={riggedBoneNames}
          riggedBoneTree={riggedBoneTree}
          selectedBoneName={selectedBoneName}
          onSelectMesh={(id) => {
            if (!id) {
              syncSelectedInspectorFromObject(null);
              return;
            }
            let found: THREE.Object3D | null = null;
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) found = o;
            });
            syncSelectedInspectorFromObject(found);
          }}
          onSelectBone={handleSelectBoneForPose}
          onSetMeshVisible={(id, visible) => {
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) o.visible = visible;
            });
            syncSceneHierarchy();
          }}
          onSetMeshRenderVisible={(id, renderVisible) => {
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) o.userData.renderVisible = renderVisible;
            });
            syncSceneHierarchy();
          }}
          onSetMeshLocked={(id, locked) => {
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) o.userData.locked = locked;
            });
            syncSceneHierarchy();
          }}
          onShowAllMeshes={() => {
            const showIn = (root: THREE.Object3D | null) => {
              root?.traverse((o) => {
                if ((o as THREE.Mesh).isMesh) o.visible = true;
              });
            };
            showIn(modelRootRef.current);
            showIn(splineGroupRef.current);
            syncSceneHierarchy();
          }}
          onRunAutoRig={() => handleRunAutoRig()}
          refPlane={{
            active: refPlane.active,
            visible: refPlane.visible,
            name: refPlane.name,
            axis: refPlane.axis,
            opacity: refPlane.opacity,
            scale: refPlane.scale,
            flipX: refPlane.flipX,
          }}
          onImportReferenceImage={() => refImageInputRef.current?.click()}
          onUpdateRefPlane={(patch) => setRefPlane((p) => ({ ...p, ...patch }))}
          onClearRefPlane={() => {
            setRefPlane((p) => ({ ...p, active: false, dataUrl: '', name: '' }));
            setShowReferencePopover(false);
          }}
          htmlReferences={htmlReferences}
          onOpenHtmlTo3d={handleOpenHtmlTo3dModal}
          onToggleHtmlReferenceVisible={(id) => {
            const ch = splineGroupRef.current?.children.find((c) => c.uuid === id);
            if (ch) {
              ch.visible = !ch.visible;
              syncSceneHierarchy();
            }
          }}
          onDeleteHtmlReference={(id) => {
            const ch = splineGroupRef.current?.children.find((c) => c.uuid === id);
            if (ch && splineGroupRef.current) {
              splineGroupRef.current.remove(ch);
              disposeObject3D(ch);
              if (selectedObjectRef.current === ch) {
                syncSelectedInspectorFromObject(null);
              }
              syncSceneHierarchy();
            }
          }}
        />
      )}

      {/* Primary WebGL Canvas Column */}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col bg-[#0D1017]">
        <div className="relative flex-1 min-h-[220px] bg-[#0D1017]">
          {webglError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="text-sm font-semibold text-red-300">Contexto WebGL indisponível</div>
              <div className="max-w-md text-xs text-slate-400">{webglError}</div>
              <button
                type="button"
                onClick={() => {
                  setWebglError(null);
                  setRetryWebglNonce((n) => n + 1);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>
            </div>
          ) : (
            <div ref={mountRef} className="w-full h-full" />
          )}

          {/* Top-Left Blender Mode Selector, Context Breadcrumb & Segmented Tools */}
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-[calc(100%-220px)]">
            <div className="flex flex-wrap items-center gap-1.5">
              <ShortcutTooltip label="Alternar Modo de Interação" shortcut="Tab">
                <select
                  aria-label="Modo de Interação Blender"
                  value={interactionMode}
                  onChange={(e) => handleApplyInteractionMode(e.target.value as BlenderInteractionMode)}
                  className="h-8 px-2 rounded-lg bg-[#141923] border border-slate-800 hover:border-slate-600 text-[11px] font-semibold text-slate-100 cursor-pointer focus:outline-none"
                >
                  <option value="object">Modo de Objeto</option>
                  <option value="edit">Modo de Edição (Wire)</option>
                  <option value="pose">Modo de Pose</option>
                  <option value="weight_paint">Pintura de Pesos</option>
                </select>
              </ShortcutTooltip>

              <button
                type="button"
                onClick={() => setShowMeshDrawer((v) => !v)}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                  showMeshDrawer
                    ? 'bg-orange-600 border-orange-500 text-white'
                    : 'bg-[#141923] border-slate-800 text-slate-200 hover:border-slate-600'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hierarquia</span>
                <span className="font-mono text-[10px]">({sceneMeshes.length})</span>
              </button>

              <div
                role="group"
                aria-label="Ferramentas de edição 3D"
                className="flex items-center rounded-lg border border-slate-800 bg-[#141923] p-0.5 divide-x divide-slate-800/80"
              >
                {(
                  [
                    { id: 'orbit', label: 'Órbita', keyHint: 'Q', icon: <MousePointer className="w-3 h-3" /> },
                    { id: 'translate', label: 'Mover', keyHint: 'W', icon: <Move className="w-3 h-3" /> },
                    { id: 'rotate', label: 'Girar', keyHint: 'E', icon: <RotateCw className="w-3 h-3" /> },
                    { id: 'scale', label: 'Escala', keyHint: 'R', icon: <Scaling className="w-3 h-3" /> },
                    { id: 'paint', label: 'Pintar', keyHint: 'B', icon: <Paintbrush className="w-3 h-3" /> },
                  ] as { id: SplineToolMode; label: string; keyHint: string; icon: React.ReactNode }[]
                ).map((tool) => {
                  const isActive =
                    toolMode === tool.id || (tool.id === 'paint' && toolMode === 'weight_paint');
                  return (
                    <ShortcutTooltip key={tool.id} label={tool.label} shortcut={tool.keyHint}>
                      <button
                        type="button"
                        onClick={() => selectToolModeWithTarget(tool.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'bg-orange-600 text-white'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {tool.icon}
                        <span className="hidden md:inline">{tool.label}</span>
                      </button>
                    </ShortcutTooltip>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowPrimitivesDrawer((v) => !v)}
                className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                  showPrimitivesDrawer
                    ? 'bg-orange-600 border-orange-500 text-white'
                    : 'bg-[#141923] border-slate-800 text-slate-200 hover:border-slate-600'
                }`}
                title="Adicionar primitivas, Templates, CSG Boolean e Materiais Procedurais"
              >
                <Shapes className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden lg:inline">Primitivas & CSG</span>
              </button>

              <button
                type="button"
                onClick={handleOpenHtmlTo3dModal}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-slate-800 bg-[#141923] hover:border-orange-500 text-[11px] font-medium text-slate-200 cursor-pointer"
                title="Converter HTML em painel 3D PBR ou editar painel HTML selecionado"
              >
                <Code2 className="w-3.5 h-3.5 text-orange-400" />
                <span className="hidden xl:inline">HTML → 3D</span>
              </button>

              {riggedBoneNames.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSkeleton((s) => !s)}
                  className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                    showSkeleton
                      ? 'bg-cyan-600/20 border-cyan-500 text-cyan-200'
                      : 'bg-[#141923] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                  title="Alternar visualização X-Ray dos ossos e guias IK"
                >
                  <Bone className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="hidden xl:inline">Ossos</span>
                </button>
              )}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!refPlane.active) {
                      refImageInputRef.current?.click();
                    } else {
                      setShowReferencePopover((v) => !v);
                    }
                  }}
                  className={`inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                    refPlane.active && refPlane.visible
                      ? 'bg-sky-600/20 border-sky-500 text-sky-200'
                      : 'bg-[#141923] border-slate-800 text-slate-200 hover:border-slate-600'
                  }`}
                  title="Importar ou ajustar imagem de referência (Frente / Lado / Topo)"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden xl:inline">Referência</span>
                </button>

                {showReferencePopover && refPlane.active && (
                  <div className="absolute left-0 top-10 z-30 w-64 rounded-xl bg-[#111622] border border-slate-700 shadow-2xl p-3 space-y-2.5 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate max-w-[160px]">
                        {refPlane.name || 'Imagem de Referência'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowReferencePopover(false)}
                        aria-label="Fechar ajustes de referência"
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-3 gap-1">
                      {(
                        [
                          { id: 'front', label: 'Frente XY' },
                          { id: 'side', label: 'Lado ZY' },
                          { id: 'top', label: 'Topo XZ' },
                        ] as const
                      ).map((ax) => (
                        <button
                          key={ax.id}
                          type="button"
                          onClick={() => setRefPlane((p) => ({ ...p, axis: ax.id }))}
                          className={`py-1 rounded border text-[10px] font-medium cursor-pointer ${
                            refPlane.axis === ax.id
                              ? 'bg-sky-600 border-sky-500 text-white'
                              : 'bg-[#090C12] border-slate-800 text-slate-300'
                          }`}
                        >
                          {ax.label}
                        </button>
                      ))}
                    </div>

                    <label className="flex flex-col gap-0.5 text-[10px] text-slate-300">
                      <span className="flex justify-between">
                        <span>Opacidade</span>
                        <span className="font-mono text-sky-300">{Math.round(refPlane.opacity * 100)}%</span>
                      </span>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={refPlane.opacity}
                        onChange={(e) => setRefPlane((p) => ({ ...p, opacity: Number(e.target.value) }))}
                        className="accent-sky-400"
                      />
                    </label>

                    <label className="flex flex-col gap-0.5 text-[10px] text-slate-300">
                      <span className="flex justify-between">
                        <span>Escala</span>
                        <span className="font-mono text-sky-300">{refPlane.scale.toFixed(2)}x</span>
                      </span>
                      <input
                        type="range"
                        min={0.25}
                        max={3.5}
                        step={0.05}
                        value={refPlane.scale}
                        onChange={(e) => setRefPlane((p) => ({ ...p, scale: Number(e.target.value) }))}
                        className="accent-sky-400"
                      />
                    </label>

                    <div className="flex items-center gap-1 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setRefPlane((p) => ({ ...p, visible: !p.visible }))}
                        className="flex-1 inline-flex items-center justify-center gap-1 py-1 rounded bg-[#090C12] border border-slate-800 hover:border-slate-600 text-[10px] text-slate-200 cursor-pointer"
                      >
                        {refPlane.visible ? <Eye className="w-3 h-3 text-emerald-400" /> : <EyeOff className="w-3 h-3" />}
                        <span>{refPlane.visible ? 'Visível' : 'Oculta'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRefPlane((p) => ({ ...p, flipX: !p.flipX }))}
                        title="Espelhar horizontalmente"
                        className={`px-2 py-1 rounded border text-[10px] cursor-pointer ${
                          refPlane.flipX
                            ? 'bg-sky-600/20 border-sky-500 text-sky-300'
                            : 'bg-[#090C12] border-slate-800 text-slate-300'
                        }`}
                      >
                        <FlipHorizontal2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => refImageInputRef.current?.click()}
                        className="px-2 py-1 rounded bg-[#090C12] border border-slate-800 hover:border-sky-500 text-[10px] text-sky-300 cursor-pointer"
                      >
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRefPlane((p) => ({ ...p, active: false, dataUrl: '', name: '' }));
                          setShowReferencePopover(false);
                        }}
                        title="Remover referência"
                        className="px-2 py-1 rounded bg-[#090C12] border border-slate-800 hover:border-red-500 text-[10px] text-red-300 cursor-pointer"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle Blender Context Breadcrumb */}
            <div className="pointer-events-none inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0D1017]/80 border border-slate-800/70 text-[10px] font-mono text-slate-400 w-fit">
              <span>Perspectiva</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-slate-300">Coleção</span>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-orange-300 truncate max-w-[200px]">
                {selectedBoneName || selectedInspector?.name || activeAssetName}
              </span>
            </div>
          </div>

          {/* Floating Weight Paint Brush Bar */}
          {weightPaintActive && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-[#141923] border border-orange-500/60 shadow-xl text-[11px]">
              <span className="font-semibold text-orange-300">Pintura de Pesos:</span>
              {(['add', 'smooth', 'subtract'] as WeightBrushMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setWeightBrushMode(m)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                    weightBrushMode === m
                      ? 'bg-orange-600 text-white'
                      : 'bg-[#0D1017] text-slate-300 hover:text-white'
                  }`}
                >
                  {m === 'add' ? 'Add' : m === 'smooth' ? 'Smooth' : 'Subtract'}
                </button>
              ))}
              <label className="flex items-center gap-1 text-[10px] text-slate-300">
                <span>Raio</span>
                <input
                  type="range"
                  min={0.08}
                  max={0.7}
                  step={0.02}
                  value={weightBrushRadius}
                  onChange={(e) => setWeightBrushRadius(Number(e.target.value))}
                  className="w-16"
                />
              </label>
              <label className="flex items-center gap-1 text-[10px] text-slate-300">
                <span>Força</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={weightBrushStrength}
                  onChange={(e) => setWeightBrushStrength(Number(e.target.value))}
                  className="w-16"
                />
              </label>
              <button
                type="button"
                onClick={() => setWeightPaintMode(false)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] cursor-pointer"
              >
                Concluir
              </button>
            </div>
          )}

          {/* Top-Right Blender Shading Modes, Axis Gizmo 3D & Camera Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              {/* 4 Round Shading Mode Icons */}
              <div
                role="group"
                aria-label="Modos de Sombreamento"
                className="flex items-center gap-1 rounded-full border border-slate-800 bg-[#141923] p-1"
              >
                {(
                  [
                    { id: 'wireframe', label: 'Wireframe', icon: <Grid3X3 className="w-3.5 h-3.5" /> },
                    { id: 'solid', label: 'Sólido (Clay)', icon: <CircleDot className="w-3.5 h-3.5" /> },
                    { id: 'material', label: 'Preview Material (PBR)', icon: <Palette className="w-3.5 h-3.5" /> },
                    { id: 'rendered', label: 'Renderizado (Luz & HDRI)', icon: <Sun className="w-3.5 h-3.5" /> },
                  ] as { id: ViewportShadingMode; label: string; icon: React.ReactNode }[]
                ).map((s) => (
                  <ShortcutTooltip key={s.id} label={s.label}>
                    <button
                      type="button"
                      onClick={() => handleApplyShadingMode(s.id)}
                      aria-label={s.label}
                      className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                        shadingMode === s.id
                          ? 'bg-orange-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {s.icon}
                    </button>
                  </ShortcutTooltip>
                ))}
              </div>

              {!hideRightInspector && !dockExpanded && (
                <button
                  type="button"
                  onClick={() => setDockExpanded(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-orange-600 hover:bg-orange-500 text-[11px] font-semibold text-white cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                  <span>Abrir Outliner</span>
                </button>
              )}
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <AxisGizmo3D quaternionRef={cameraQuatRef} onSnapView={setCameraPreset} />
              <div className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-[#141923]/90 p-1">
                <ShortcutTooltip label="Aproximar Zoom" placement="top">
                  <button
                    type="button"
                    onClick={() => dollyCamera(0.8)}
                    aria-label="Aproximar Zoom"
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </ShortcutTooltip>
                <ShortcutTooltip label="Afastar Zoom" placement="top">
                  <button
                    type="button"
                    onClick={() => dollyCamera(1.25)}
                    aria-label="Afastar Zoom"
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                </ShortcutTooltip>
                <ShortcutTooltip label="Enquadrar Cena" shortcut="F" placement="top">
                  <button
                    type="button"
                    onClick={frameCameraToScene}
                    aria-label="Enquadrar Cena"
                    className="w-6 h-6 rounded flex items-center justify-center text-sky-400 hover:bg-slate-800 cursor-pointer"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </ShortcutTooltip>
                <ShortcutTooltip label="Câmera 3/4" placement="top">
                  <button
                    type="button"
                    onClick={() => setCameraPreset('q34')}
                    aria-label="Câmera 3/4"
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                  >
                    <Camera className="w-3 h-3" />
                  </button>
                </ShortcutTooltip>
              </div>
            </div>
          </div>

          {/* Floating Primitives / CSG / Procedural PBR Drawer */}
          {showPrimitivesDrawer && (
            <div className="absolute top-16 left-3 z-20 w-[330px] max-h-[68vh] overflow-y-auto rounded-xl bg-[#111622] border border-slate-700 shadow-2xl p-3 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Primitivas, CSG & PBR Procedural</span>
                <button
                  type="button"
                  onClick={() => setShowPrimitivesDrawer(false)}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Fechar
                </button>
              </div>
              <SplineDesignPanel
                section="create"
                playMode={playMode}
                onTogglePlayMode={setPlayMode}
                activeTemplate={activeTemplate}
                onSelectTemplate={setActiveTemplate}
                onApplyTemplate={handleApplyTemplate}
                hideDefaultBase={hideDefaultBase}
                onToggleHideDefaultBase={() => setHideDefaultBase((v) => !v)}
                onAddPrimitive={handleAddPrimitive}
                onRunBoolean={handleRunBoolean}
                canRunBoolean={(splineGroupRef.current?.children.length ?? 0) >= 2}
                physicsActive={physicsActive}
                onTogglePhysicsActive={() => setPhysicsActive((v) => !v)}
                bloomEnabled={postBloomEnabled}
                onToggleBloom={() => setPostBloomEnabled((v) => !v)}
                selectedObject={selectedInspector}
                onUpdateSelectedObject={applyObjectInspectorPatch}
                onUploadVideoTexture={() => videoFileInputRef.current?.click()}
                emitters={emitters}
                selectedEmitterId={selectedEmitterId}
                onAddEmitter={handleAddEmitter}
                onSelectEmitter={setSelectedEmitterId}
                onUpdateEmitter={handleUpdateEmitter}
                onRemoveEmitter={handleRemoveEmitter}
                onUploadParticleSprite={(id) => {
                  spriteUploadTargetEmitterRef.current = id;
                  particleSpriteInputRef.current?.click();
                }}
              />
              <div className="rounded-xl bg-[#141923] border border-slate-800 p-2.5 space-y-2">
                <div className="text-[11px] font-semibold text-white">Materiais Procedurais PBR</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PROCEDURAL_MATERIAL_PRESETS.map((pr) => (
                    <button
                      key={pr.id}
                      type="button"
                      onClick={() => handleApplyProceduralMaterial(pr.defaultParams)}
                      className="p-2 rounded-lg bg-[#0D1017] border border-slate-800 hover:border-orange-500 text-left cursor-pointer"
                    >
                      <div className="font-semibold text-slate-100 truncate text-[11px]">{pr.label}</div>
                      <div className="text-[9px] text-slate-400 truncate">{pr.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Selected Bone HUD Badge */}
          {selectedBoneName && (
            <div
              className={`absolute top-20 left-3 z-10 pointer-events-none px-2 py-0.5 rounded bg-[#0D1017]/85 border border-slate-800 font-mono text-xs drop-shadow ${
                activeClipTracks.some(
                  (tr) =>
                    tr.name.startsWith(`${selectedBoneName}.`) &&
                    tr.times.some((t) => Math.abs(t - animProgress * animDuration) < 0.04)
                )
                  ? 'text-[#ffd633] border-amber-500/50'
                  : 'text-slate-100'
              }`}
            >
              Osso: {selectedBoneName}
            </div>
          )}

          {/* Smart Contextual Bottom Status Bar */}
          <div className="absolute bottom-2.5 left-3 right-3 z-10 pointer-events-none flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="px-2.5 py-1 rounded bg-[#141923] border border-slate-800/90 font-mono truncate max-w-[65%]">
              {isImporting
                ? 'Importando modelo 3D...'
                : statusBanner || `${activeAssetName} · ${sceneMeshes.length} malha(s)`}
            </span>
            <span className="hidden md:inline px-2.5 py-1 rounded bg-[#141923] border border-slate-800/90 font-mono">
              {toolMode === 'weight_paint'
                ? 'Arraste sobre a malha: Pintar Pesos · Azul=0 Vermelho=1'
                : toolMode === 'paint'
                ? 'Clique e arraste: Pintar Textura 3D · B: Pincel'
                : toolMode === 'translate' || toolMode === 'rotate' || toolMode === 'scale'
                ? 'Arraste eixos RGB · Tab: Modo · F: Enquadrar · Del: Excluir'
                : 'Arraste: Orbitar · Scroll: Zoom · Q/W/E/R/B · Arraste GLB/glTF'}
            </span>
          </div>
        </div>

        {/* Docked ActionForge Timeline / Dope Sheet Below 3D Scene */}
        {(currentStage === 'stage9' || currentStage === 'stage12' || currentStage === 'stage13') && (
          <div className="border-t border-slate-800 bg-[#0F131B] px-2.5 py-1.5 max-h-[42vh] overflow-y-auto shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-300">
                Timeline & Dope Sheet ActionForge (84 Clipes & NLA)
              </span>
              <button
                type="button"
                onClick={() => setTimelineDocked((v) => !v)}
                className="px-2.5 py-1 rounded-md bg-[#141923] border border-slate-700 hover:border-orange-500 text-[11px] font-medium text-slate-200 cursor-pointer"
              >
                {timelineDocked ? 'Recolher Timeline ActionForge' : 'Abrir Timeline ActionForge'}
              </button>
            </div>
            {timelineDocked && (
              <ActionForgeTimeline
                compact
                isRigged={riggedBoneNames.length > 0}
                clipNames={clipNames}
                activeClipIdx={activeClipIdx}
                activeClipId={activeClipId}
                isPlaying={isPlaying}
                animLoop={animLoop}
                animSpeed={animSpeed}
                animProgress={animProgress}
                animDuration={animDuration}
                mirrorClip={mirrorClip}
                reverseClip={reverseClip}
                inPlaceClip={inPlaceClip}
                autoKey={autoKey}
                interpolationMode={interpolationMode}
                hasCopiedKeyframe={hasCopiedKeyframe}
                strips={strips}
                overlayClipId={overlayClipId}
                overlayMask={overlayMask}
                overlayWeight={overlayWeight}
                selectedBoneName={selectedBoneName}
                riggedBoneNames={riggedBoneNames}
                activeClipTracks={activeClipTracks}
                onRunAutoRig={() => handleRunAutoRig()}
                onSelectClipById={(id) => handleSelectClip(id)}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onStopAnimation={handleStopAnimation}
                onStepFrame={handleStepFrame}
                onSeekNormalized={handleSeekNormalized}
                onToggleLoop={() => setAnimLoop((v) => !v)}
                onChangeSpeed={(s) => setAnimSpeed(s)}
                onToggleMirror={handleToggleMirrorClip}
                onToggleReverse={handleToggleReverseClip}
                onToggleInPlace={handleToggleInPlaceClip}
                onToggleAutoKey={() => setAutoKey((v) => !v)}
                onChangeInterpolationMode={handleChangeInterpolationMode}
                onUpdateStrips={handleUpdateStrips}
                onSetOverlayLayer={handleSetOverlayLayer}
                onSelectBone={handleSelectBoneForPose}
                onAddBoneKeyframe={handleAddBoneKeyframe}
                onCopyKeyframe={handleCopyKeyframe}
                onPasteKeyframe={handlePasteKeyframe}
                onDeleteKeyframe={handleDeleteKeyframe}
                onMoveKeyframe={handleMoveKeyframe}
                onCopyClipLink={handleCopyClipLink}
                animInPoint={animInPoint}
                animOutPoint={animOutPoint}
                onSetPlayRange={handleSetPlayRange}
                onResetPlayRange={handleResetPlayRange}
              />
            )}
          </div>
        )}
      </div>

      {/* Permanent Blender Split Right Column: Outliner (top) + Vertical Icon Properties (bottom) */}
      {!hideRightInspector && dockExpanded && (
        <OutlinerPropertiesDock
          activePropTab={activePropTab}
          onSelectPropTab={setActivePropTab}
          onCollapseDock={() => setDockExpanded(false)}
          meshes={sceneMeshes}
          selectedMeshId={selectedMeshId}
          riggedBoneNames={riggedBoneNames}
          selectedBoneName={selectedBoneName}
          hasSelection={Boolean(selectedInspector)}
          selectedInspector={selectedInspector}
          currentFrameHasKey={Boolean(
            selectedBoneName &&
              activeClipTracks.some(
                (tr) =>
                  tr.name.startsWith(`${selectedBoneName}.`) &&
                  tr.times.some((t) => Math.abs(t - animProgress * animDuration) < 0.04)
              )
          )}
          trackHasAnyKey={Boolean(
            selectedBoneName &&
              activeClipTracks.some((tr) => tr.name.startsWith(`${selectedBoneName}.`) && tr.times.length > 0)
          )}
          onSelectMesh={(id) => {
            if (!id) {
              syncSelectedInspectorFromObject(null);
              return;
            }
            let found: THREE.Object3D | null = null;
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) found = o;
            });
            syncSelectedInspectorFromObject(found);
          }}
          onSelectBone={handleSelectBoneForPose}
          onSetMeshVisible={(id, visible) => {
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) o.visible = visible;
            });
            syncSceneHierarchy();
          }}
          onSetMeshRenderVisible={(id, renderVisible) => {
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) o.userData.renderVisible = renderVisible;
            });
            syncSceneHierarchy();
          }}
          onSetMeshLocked={(id, locked) => {
            sceneRef.current?.traverse((o) => {
              if (o.uuid === id) o.userData.locked = locked;
            });
            syncSceneHierarchy();
          }}
          onShowAllMeshes={() => {
            const showIn = (root: THREE.Object3D | null) => {
              root?.traverse((o) => {
                if ((o as THREE.Mesh).isMesh) o.visible = true;
              });
            };
            showIn(modelRootRef.current);
            showIn(splineGroupRef.current);
            syncSceneHierarchy();
          }}
          onUpdateInspector={applyObjectInspectorPatch}
          onAddKeyframeAtCurrent={handleAddBoneKeyframe}
          onFrameSelected={frameCameraToScene}
          onDuplicateSelected={handleDuplicateSelected}
          onDeleteSelected={handleDeleteSelected}
          ikEnabled={ikEnabled}
          onToggleIk={handleToggleIk}
          floorContactEnabled={floorContactEnabled}
          onToggleFloorContact={() => {
            setFloorContactEnabled((v) => {
              const next = !v;
              floorContactEnabledRef.current = next;
              evaluateFrameNow();
              return next;
            });
          }}
          weightPaintActive={weightPaintActive}
          onToggleWeightPaint={() => setWeightPaintMode(!weightPaintActive)}
          onRunAutoRig={() => handleRunAutoRig()}
          morphTargets={morphTargets}
          onChangeMorphTarget={handleChangeMorphTarget}
          lighting={{
            activeHdri,
            envIntensity,
            bgAsEnvironment,
            envBlur,
            lights,
            toneMapping,
            exposure,
            shadowsEnabled,
            resolution,
            transparentBg,
            bloomEnabled: postBloomEnabled,
            bloomStrength: postBloomStrength,
            bloomThreshold: postBloomThreshold,
            dofEnabled,
            dofFocus,
            dofAperture,
            motionBlurEnabled,
            motionBlurDamp,
          }}
          onLightingChange={(patch) => {
            if (patch.activeHdri !== undefined) setActiveHdri(patch.activeHdri);
            if (patch.envIntensity !== undefined) setEnvIntensity(patch.envIntensity);
            if (patch.bgAsEnvironment !== undefined) setBgAsEnvironment(patch.bgAsEnvironment);
            if (patch.envBlur !== undefined) setEnvBlur(patch.envBlur);
            if (patch.lights !== undefined) setLights(patch.lights);
            if (patch.toneMapping !== undefined) setToneMapping(patch.toneMapping);
            if (patch.exposure !== undefined) setExposure(patch.exposure);
            if (patch.shadowsEnabled !== undefined) setShadowsEnabled(patch.shadowsEnabled);
            if (patch.resolution !== undefined) setResolution(patch.resolution);
            if (patch.transparentBg !== undefined) setTransparentBg(patch.transparentBg);
            if (patch.bloomEnabled !== undefined) setPostBloomEnabled(patch.bloomEnabled);
            if (patch.bloomStrength !== undefined) setPostBloomStrength(patch.bloomStrength);
            if (patch.bloomThreshold !== undefined) setPostBloomThreshold(patch.bloomThreshold);
            if (patch.dofEnabled !== undefined) setDofEnabled(patch.dofEnabled);
            if (patch.dofFocus !== undefined) setDofFocus(patch.dofFocus);
            if (patch.dofAperture !== undefined) setDofAperture(patch.dofAperture);
            if (patch.motionBlurEnabled !== undefined) setMotionBlurEnabled(patch.motionBlurEnabled);
            if (patch.motionBlurDamp !== undefined) setMotionBlurDamp(patch.motionBlurDamp);
            onLightingChangeRef.current?.(patch);
          }}
          onRenderPng={() => handleRenderPng(false)}
          emitters={emitters}
          selectedEmitterId={selectedEmitterId}
          onAddEmitter={handleAddEmitter}
          onSelectEmitter={(id) => setSelectedEmitterId(id)}
          onUpdateEmitter={handleUpdateEmitter}
          onRemoveEmitter={handleRemoveEmitter}
          activeTextureMaps={activeTextureMaps}
          onUploadTextureChannel={handleUploadTextureChannel}
          onClearTextureChannel={handleClearTextureChannel}
          onBatchUploadTextures={handleBatchUploadTextures}
          riggedBoneTree={riggedBoneTree}
          showSkeleton={showSkeleton}
          onToggleSkeleton={() => setShowSkeleton((s) => !s)}
          onResetBone={handleResetSelectedBone}
          onMirrorBonePose={handleMirrorSelectedBonePose}
          onExportAnimatedGlb={() => handleExportModel('glb', true)}
          refPlane={{
            active: refPlane.active,
            visible: refPlane.visible,
            name: refPlane.name,
            axis: refPlane.axis,
            opacity: refPlane.opacity,
            scale: refPlane.scale,
            flipX: refPlane.flipX,
          }}
          onImportReferenceImage={() => refImageInputRef.current?.click()}
          onUpdateRefPlane={(patch) => setRefPlane((p) => ({ ...p, ...patch }))}
          onClearRefPlane={() => {
            setRefPlane((p) => ({ ...p, active: false, dataUrl: '', name: '' }));
            setShowReferencePopover(false);
          }}
          htmlReferences={htmlReferences}
          onOpenHtmlTo3d={handleOpenHtmlTo3dModal}
          onToggleHtmlReferenceVisible={(id) => {
            const ch = splineGroupRef.current?.children.find((c) => c.uuid === id);
            if (ch) {
              ch.visible = !ch.visible;
              syncSceneHierarchy();
            }
          }}
          onDeleteHtmlReference={(id) => {
            const ch = splineGroupRef.current?.children.find((c) => c.uuid === id);
            if (ch && splineGroupRef.current) {
              splineGroupRef.current.remove(ch);
              disposeObject3D(ch);
              if (selectedObjectRef.current === ch) {
                syncSelectedInspectorFromObject(null);
              }
              syncSceneHierarchy();
            }
          }}
          playMode={playMode}
          onTogglePlayMode={setPlayMode}
          activeTemplate={activeTemplate}
          onSelectTemplate={setActiveTemplate}
          onApplyTemplate={handleApplyTemplate}
          hideDefaultBase={hideDefaultBase}
          onToggleHideDefaultBase={() => setHideDefaultBase((v) => !v)}
          toolMode={toolMode}
          onSelectToolMode={selectToolModeWithTarget}
          onAddPrimitive={handleAddPrimitive}
          onRunBoolean={handleRunBoolean}
          canRunBoolean={(splineGroupRef.current?.children.length ?? 0) >= 2}
          physicsActive={physicsActive}
          onTogglePhysicsActive={() => setPhysicsActive((v) => !v)}
          bloomEnabled={postBloomEnabled}
          onToggleBloom={() => setPostBloomEnabled((v) => !v)}
          hideOutliner
        />
      )}

      {/* Web Embed Code Modal */}
      <SplineCodeExportModal
        open={showCodeModal}
        onClose={() => setShowCodeModal(false)}
        objects={codeExportObjects}
        assetName={`${activeAssetName}.glb`}
        bgHex="#0d1017"
        onCopyPublicLink={handleCopyPublicLink}
      />

      {/* GLB/glTF Verification Modal */}
      <FileVerificationModal
        open={verifyModalOpen}
        report={auditReport}
        onReportChange={setAuditReport}
        onVerifyCurrentScene={() => {
          if (modelRootRef.current) {
            setAuditReport(
              auditThreeSceneGroup(
                modelRootRef.current,
                `${activeAssetName}.glb`,
                clipsRef.current.length
              )
            );
          }
        }}
        onClose={() => setVerifyModalOpen(false)}
      />

      {/* HTML -> 3D Converter Modal */}
      <HtmlTo3dModal
        open={html3dModalOpen}
        initialSpec={editingHtml3dSpec}
        isEditingExisting={Boolean(editingHtml3dSpec)}
        onClose={() => {
          setHtml3dModalOpen(false);
          editingHtml3dGroupRef.current = null;
          setEditingHtml3dSpec(null);
        }}
        onApply={handleApplyHtmlTo3d}
      />
    </div>
  );
};
