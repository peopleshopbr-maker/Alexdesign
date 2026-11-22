import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type ToneMappingPreset = 'aces' | 'agx' | 'neutral' | 'none';
export type StudioLightType = 'dir' | 'point' | 'spot' | 'amb';
export type HdriEnvironmentId =
  | 'room'
  | 'softbox_warm'
  | 'sunset'
  | 'daylight'
  | 'neon'
  | 'warehouse'
  | 'royal_esplanade_1k.hdr'
  | 'venice_sunset_1k.hdr'
  | 'quarry_01_1k.hdr'
  | 'pedestrian_overpass_1k.hdr'
  | 'none'
  | 'custom';

export type RenderResolutionPreset =
  | 'view'
  | '1920x1080'
  | '2560x1440'
  | '3840x2160'
  | '2048x2048';

export type VfxParticlePreset = 'none' | 'sparks' | 'aura' | 'ember' | 'dust';

export interface VfxStudioSettings {
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  particlePreset: VfxParticlePreset;
  particleDensity: number;
  particleColor: string;
  vignetteStrength: number;
  turntableSpeed: number;
}

export const DEFAULT_VFX_SETTINGS: VfxStudioSettings = {
  bloomEnabled: false,
  bloomStrength: 0.42,
  bloomRadius: 0.45,
  bloomThreshold: 0.78,
  particlePreset: 'none',
  particleDensity: 120,
  particleColor: '#fb923c',
  vignetteStrength: 0.25,
  turntableSpeed: 0,
};

export interface StudioLightSpec {
  id: string;
  name: string;
  type: StudioLightType;
  color: string;
  intensity: number;
  position: [number, number, number];
}

export interface HdriPresetMeta {
  id: HdriEnvironmentId;
  label: string;
  subtitle: string;
  kind: 'procedural' | 'cdn' | 'none';
  swatches: [string, string, string];
}

export const HDRI_ENVIRONMENT_OPTIONS: HdriPresetMeta[] = [
  {
    id: 'room',
    label: 'Estúdio Neutro',
    subtitle: 'Difusores balanceados',
    kind: 'procedural',
    swatches: ['#e2e8f0', '#94a3b8', '#1e293b'],
  },
  {
    id: 'softbox_warm',
    label: 'Softbox Comercial',
    subtitle: 'Chave quente + recorte frio',
    kind: 'procedural',
    swatches: ['#fef3c7', '#f59e0b', '#38bdf8'],
  },
  {
    id: 'sunset',
    label: 'Pôr do Sol',
    subtitle: 'Golden hour + horizonte âmbar',
    kind: 'procedural',
    swatches: ['#312e81', '#f97316', '#fde68a'],
  },
  {
    id: 'daylight',
    label: 'Céu Aberto',
    subtitle: 'Luz solar diurna intensa',
    kind: 'procedural',
    swatches: ['#38bdf8', '#e0f2fe', '#fef08a'],
  },
  {
    id: 'neon',
    label: 'Neon Contraste',
    subtitle: 'Ciano & magenta especular',
    kind: 'procedural',
    swatches: ['#090d16', '#06b6d4', '#ec4899'],
  },
  {
    id: 'warehouse',
    label: 'Galpão Industrial',
    subtitle: 'Painéis de teto + vapor sódio',
    kind: 'procedural',
    swatches: ['#334155', '#e2e8f0', '#fbbf24'],
  },
  {
    id: 'royal_esplanade_1k.hdr',
    label: 'Palácio (HDR Web)',
    subtitle: 'Interior claro equiretangular',
    kind: 'cdn',
    swatches: ['#f8fafc', '#cbd5e1', '#64748b'],
  },
  {
    id: 'venice_sunset_1k.hdr',
    label: 'Veneza (HDR Web)',
    subtitle: 'Entardecer equiretangular',
    kind: 'cdn',
    swatches: ['#4c1d95', '#fb923c', '#fde047'],
  },
  {
    id: 'quarry_01_1k.hdr',
    label: 'Pedreira (HDR Web)',
    subtitle: 'Exterior rochoso diurno',
    kind: 'cdn',
    swatches: ['#60a5fa', '#d6d3d1', '#78716c'],
  },
  {
    id: 'pedestrian_overpass_1k.hdr',
    label: 'Passarela (HDR Web)',
    subtitle: 'Ambiente urbano nublado',
    kind: 'cdn',
    swatches: ['#94a3b8', '#475569', '#0f172a'],
  },
  {
    id: 'none',
    label: 'Sem HDRI',
    subtitle: 'Apenas luzes diretas da cena',
    kind: 'none',
    swatches: ['#0f172a', '#1e293b', '#090d16'],
  },
];

const hdriThumbnailCache = new Map<HdriEnvironmentId, string>();

/**
 * Generates and caches a low-resolution (72x36) equirectangular preview thumbnail
 * on a 2D canvas so the HDRI selector never needs to download full .hdr files upfront.
 */
export function buildHdriThumbnailDataUrl(id: HdriEnvironmentId): string {
  const cached = hdriThumbnailCache.get(id);
  if (cached) return cached;
  if (typeof document === 'undefined') return '';

  const meta = HDRI_ENVIRONMENT_OPTIONS.find((o) => o.id === id);
  const [cTop, cMid, cBot] = meta?.swatches ?? ['#1e293b', '#475569', '#0f172a'];
  const canvas = document.createElement('canvas');
  canvas.width = 72;
  canvas.height = 36;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 0, 36);
  grad.addColorStop(0, cTop);
  grad.addColorStop(0.52, cMid);
  grad.addColorStop(1, cBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 72, 36);

  if (id !== 'none') {
    const sunGrad = ctx.createRadialGradient(50, 14, 1, 50, 14, 14);
    sunGrad.addColorStop(0, 'rgba(255,255,255,0.92)');
    sunGrad.addColorStop(0.45, 'rgba(255,235,190,0.45)');
    sunGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 72, 36);
  }

  const url = canvas.toDataURL('image/png');
  hdriThumbnailCache.set(id, url);
  return url;
}

export const HDRI_CDN_BASE =
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/textures/equirectangular/';

export const TONE_MAPPING_MAP: Record<ToneMappingPreset, THREE.ToneMapping> = {
  aces: THREE.ACESFilmicToneMapping,
  agx: THREE.AgXToneMapping,
  neutral: THREE.NeutralToneMapping ?? THREE.ReinhardToneMapping,
  none: THREE.NoToneMapping,
};

export function isSoftwareWebGLContext(gl: WebGLRenderingContext | WebGL2RenderingContext | null): boolean {
  if (!gl) return false;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
      : String(gl.getParameter(gl.RENDERER) || '');
    return /swiftshader|llvmpipe|software|mesa offscreen|angle.*swiftshader/i.test(rendererStr);
  } catch {
    return false;
  }
}

function createGradientDomeTexture(topHex: string, horizonHex: string, bottomHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, topHex);
  grad.addColorStop(0.5, horizonHex);
  grad.addColorStop(0.56, bottomHex);
  grad.addColorStop(1, bottomHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function buildProceduralHdriTexture(
  id: HdriEnvironmentId,
  pmremGenerator: THREE.PMREMGenerator
): THREE.Texture | null {
  if (id === 'room') {
    const room = new RoomEnvironment();
    const tex = pmremGenerator.fromScene(room, 0.04).texture;
    room.dispose();
    return tex;
  }

  const presets: Record<
    string,
    {
      top: string;
      horizon: string;
      bottom: string;
      panels: {
        color: number;
        intensity: number;
        pos: [number, number, number];
        scale: [number, number, number];
        rotY?: number;
        rotX?: number;
      }[];
    }
  > = {
    softbox_warm: {
      top: '#1e293b',
      horizon: '#334155',
      bottom: '#0f172a',
      panels: [
        { color: 0xfff3d6, intensity: 14, pos: [8, 6, 8], scale: [6, 5, 0.2], rotY: -Math.PI / 4 },
        { color: 0x7dd3fc, intensity: 9, pos: [-9, 4, -6], scale: [5, 6, 0.2], rotY: (Math.PI * 3) / 4 },
        { color: 0xffffff, intensity: 10, pos: [0, 12, 0], scale: [7, 7, 0.2], rotX: Math.PI / 2 },
        { color: 0x94a3b8, intensity: 2.5, pos: [0, -8, 0], scale: [14, 14, 0.2], rotX: Math.PI / 2 },
      ],
    },
    sunset: {
      top: '#1e1b4b',
      horizon: '#ea580c',
      bottom: '#29150b',
      panels: [
        { color: 0xfde68a, intensity: 28, pos: [12, 2.5, -6], scale: [3.2, 3.2, 0.2], rotY: -Math.PI / 3 },
        { color: 0xfb923c, intensity: 8, pos: [8, 1.5, 4], scale: [8, 3.5, 0.2], rotY: -Math.PI / 2 },
        { color: 0x818cf8, intensity: 4.5, pos: [-8, 6, 7], scale: [9, 6, 0.2], rotY: (Math.PI * 3) / 4 },
        { color: 0x7c2d12, intensity: 2.0, pos: [0, -8, 0], scale: [14, 14, 0.2], rotX: Math.PI / 2 },
      ],
    },
    daylight: {
      top: '#2563eb',
      horizon: '#bae6fd',
      bottom: '#334155',
      panels: [
        { color: 0xfffbeb, intensity: 32, pos: [7, 11, 6], scale: [3.4, 3.4, 0.2], rotX: Math.PI / 3 },
        { color: 0x93c5fd, intensity: 7, pos: [-8, 7, -7], scale: [10, 6, 0.2], rotY: (Math.PI * 3) / 4 },
        { color: 0xe0f2fe, intensity: 6, pos: [0, 12, -4], scale: [10, 8, 0.2], rotX: Math.PI / 2 },
        { color: 0x64748b, intensity: 3.0, pos: [0, -8, 0], scale: [16, 16, 0.2], rotX: Math.PI / 2 },
      ],
    },
    neon: {
      top: '#090d16',
      horizon: '#111827',
      bottom: '#05070c',
      panels: [
        { color: 0x06b6d4, intensity: 18, pos: [-8, 3, 6], scale: [1.8, 9, 0.2], rotY: Math.PI / 3 },
        { color: 0xec4899, intensity: 18, pos: [8, 3.5, -5], scale: [1.8, 9, 0.2], rotY: -Math.PI / 3 },
        { color: 0xa855f7, intensity: 10, pos: [0, 10, 0], scale: [8, 1.8, 0.2], rotX: Math.PI / 2 },
        { color: 0xe2e8f0, intensity: 6, pos: [0, 4, 10], scale: [6, 1.2, 0.2] },
      ],
    },
    warehouse: {
      top: '#1e293b',
      horizon: '#334155',
      bottom: '#1c1917',
      panels: [
        { color: 0xf1f5f9, intensity: 15, pos: [-5, 11, 0], scale: [1.5, 10, 0.2], rotX: Math.PI / 2 },
        { color: 0xf1f5f9, intensity: 15, pos: [5, 11, 0], scale: [1.5, 10, 0.2], rotX: Math.PI / 2 },
        { color: 0xfbbf24, intensity: 12, pos: [0, 6, -10], scale: [3.5, 3.5, 0.2] },
        { color: 0x94a3b8, intensity: 5, pos: [10, 4, 6], scale: [5, 5, 0.2], rotY: -Math.PI / 2 },
      ],
    },
  };

  const spec = presets[id];
  if (!spec) return null;

  const envScene = new THREE.Scene();
  const domeGeo = new THREE.SphereGeometry(28, 24, 16);
  const domeTex = createGradientDomeTexture(spec.top, spec.horizon, spec.bottom);
  const domeMat = new THREE.MeshBasicMaterial({ map: domeTex, side: THREE.BackSide });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const createdMats: THREE.Material[] = [domeMat];
  for (const p of spec.panels) {
    const mat = new THREE.MeshLambertMaterial({
      color: 0x000000,
      emissive: p.color,
      emissiveIntensity: p.intensity,
    });
    createdMats.push(mat);
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(...p.pos);
    mesh.scale.set(...p.scale);
    if (p.rotY) mesh.rotation.y = p.rotY;
    if (p.rotX) mesh.rotation.x = p.rotX;
    envScene.add(mesh);
  }

  const tex = pmremGenerator.fromScene(envScene, 0.04).texture;
  domeGeo.dispose();
  boxGeo.dispose();
  domeTex.dispose();
  createdMats.forEach((m) => m.dispose());
  return tex;
}

export function buildThreeLightFromSpec(
  spec: StudioLightSpec,
  castShadow: boolean
): THREE.Light {
  let light: THREE.Light;
  if (spec.type === 'dir') {
    light = new THREE.DirectionalLight(spec.color, spec.intensity);
  } else if (spec.type === 'point') {
    light = new THREE.PointLight(spec.color, spec.intensity);
  } else if (spec.type === 'spot') {
    light = new THREE.SpotLight(spec.color, spec.intensity, 0, 0.52, 0.4);
  } else {
    light = new THREE.AmbientLight(spec.color, spec.intensity);
  }

  light.name = spec.name;
  if (spec.type !== 'amb') {
    light.position.set(...spec.position);
    light.castShadow = castShadow;
    const shadowLight = light as THREE.DirectionalLight | THREE.PointLight | THREE.SpotLight;
    if (shadowLight.shadow) {
      shadowLight.shadow.mapSize.set(1024, 1024);
      shadowLight.shadow.bias = -0.0005;
    }
  }
  return light;
}

export function renderSceneToPngBlob(options: {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  container: HTMLElement;
  resolution: RenderResolutionPreset;
  transparentBg: boolean;
  hideObjects?: THREE.Object3D[];
}): Promise<Blob | null> {
  const {
    renderer,
    scene,
    camera,
    container,
    resolution,
    transparentBg,
    hideObjects = [],
  } = options;

  const cw = Math.max(1, container.clientWidth);
  const ch = Math.max(1, container.clientHeight);
  const [targetW, targetH] =
    resolution === 'view' ? [cw, ch] : resolution.split('x').map(Number);

  const prevPixelRatio = renderer.getPixelRatio();
  const prevAspect = camera.aspect;
  const prevBg = scene.background;
  const prevFog = scene.fog;
  const prevClearColor = renderer.getClearColor(new THREE.Color());
  const prevClearAlpha = renderer.getClearAlpha();
  const prevVis = hideObjects.map((o) => o.visible);

  hideObjects.forEach((o) => {
    o.visible = false;
  });

  if (transparentBg) {
    scene.background = null;
    scene.fog = null;
    renderer.setClearColor(0x000000, 0);
    renderer.setClearAlpha(0);
  }

  renderer.setPixelRatio(1);
  renderer.setSize(targetW, targetH, false);
  camera.aspect = targetW / targetH;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);

  return new Promise((resolve) => {
    renderer.domElement.toBlob((blob) => {
      renderer.setPixelRatio(prevPixelRatio);
      renderer.setSize(cw, ch, false);
      camera.aspect = prevAspect;
      camera.updateProjectionMatrix();
      scene.background = prevBg;
      scene.fog = prevFog;
      renderer.setClearColor(prevClearColor, prevClearAlpha);
      hideObjects.forEach((o, idx) => {
        o.visible = prevVis[idx];
      });
      renderer.render(scene, camera);
      resolve(blob);
    }, 'image/png');
  });
}
