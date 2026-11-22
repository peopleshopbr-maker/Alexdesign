import * as THREE from 'three';

export type ProceduralMaterialKind =
  | 'brushed_metal'
  | 'carbon_fiber'
  | 'ceramic_tile'
  | 'fabric_weave'
  | 'wood_grain'
  | 'concrete_studio';

export interface ProceduralPbrParams {
  kind: ProceduralMaterialKind;
  primaryHex: string;
  secondaryHex: string;
  roughnessBase: number;
  metalnessBase: number;
  repeat: number;
  resolution?: number;
}

export interface ProceduralMaterialPreset {
  id: ProceduralMaterialKind;
  label: string;
  subtitle: string;
  defaultParams: ProceduralPbrParams;
}

export const PROCEDURAL_MATERIAL_PRESETS: ProceduralMaterialPreset[] = [
  {
    id: 'brushed_metal',
    label: 'Aço Escovado',
    subtitle: 'Micro-sulcos anisotrópicos + brilho metálico',
    defaultParams: {
      kind: 'brushed_metal',
      primaryHex: '#94a3b8',
      secondaryHex: '#475569',
      roughnessBase: 0.28,
      metalnessBase: 0.92,
      repeat: 2,
    },
  },
  {
    id: 'carbon_fiber',
    label: 'Fibra de Carbono',
    subtitle: 'Trama diagonal com verniz especular',
    defaultParams: {
      kind: 'carbon_fiber',
      primaryHex: '#18181b',
      secondaryHex: '#3f3f46',
      roughnessBase: 0.24,
      metalnessBase: 0.35,
      repeat: 4,
    },
  },
  {
    id: 'ceramic_tile',
    label: 'Cerâmica Satin',
    subtitle: 'Esmalte limpo com microvariação orgânica',
    defaultParams: {
      kind: 'ceramic_tile',
      primaryHex: '#e2e8f0',
      secondaryHex: '#cbd5e1',
      roughnessBase: 0.16,
      metalnessBase: 0.05,
      repeat: 2,
    },
  },
  {
    id: 'fabric_weave',
    label: 'Tecido Técnico',
    subtitle: 'Trama têxtil de alta aderência fosca',
    defaultParams: {
      kind: 'fabric_weave',
      primaryHex: '#1e3a5f',
      secondaryHex: '#3b82f6',
      roughnessBase: 0.86,
      metalnessBase: 0.0,
      repeat: 5,
    },
  },
  {
    id: 'wood_grain',
    label: 'Madeira Nobre',
    subtitle: 'Veios orgânicos e verniz acetinado',
    defaultParams: {
      kind: 'wood_grain',
      primaryHex: '#7c4a2d',
      secondaryHex: '#4a2a18',
      roughnessBase: 0.52,
      metalnessBase: 0.0,
      repeat: 2,
    },
  },
  {
    id: 'concrete_studio',
    label: 'Concreto Arquitetônico',
    subtitle: 'Micro-poros minerais e oclusão sutil',
    defaultParams: {
      kind: 'concrete_studio',
      primaryHex: '#64748b',
      secondaryHex: '#334155',
      roughnessBase: 0.82,
      metalnessBase: 0.02,
      repeat: 3,
    },
  },
];

export interface GeneratedPbrBundle {
  albedoCanvas: HTMLCanvasElement;
  roughnessCanvas: HTMLCanvasElement;
  normalCanvas: HTMLCanvasElement;
  aoCanvas: HTMLCanvasElement;
  metalnessCanvas: HTMLCanvasElement;
  albedoMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  roughnessValue: number;
  metalnessValue: number;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function wrapTexture(
  canvas: HTMLCanvasElement,
  repeat: number,
  isColor: boolean,
  maxAniso = 4
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export function generateProceduralPbrBundle(
  params: ProceduralPbrParams,
  maxAnisotropy = 4
): GeneratedPbrBundle {
  const size = params.resolution ?? 256;
  const [albedoCanvas, aCtx] = makeCanvas(size);
  const [roughnessCanvas, rCtx] = makeCanvas(size);
  const [normalCanvas, nCtx] = makeCanvas(size);
  const [aoCanvas, aoCtx] = makeCanvas(size);
  const [metalnessCanvas, mCtx] = makeCanvas(size);

  const c1 = new THREE.Color(params.primaryHex);
  const c2 = new THREE.Color(params.secondaryHex);

  const heightBuf = new Float32Array(size * size);
  const aImg = aCtx.createImageData(size, size);
  const rImg = rCtx.createImageData(size, size);
  const aoImg = aoCtx.createImageData(size, size);
  const mImg = mCtx.createImageData(size, size);

  const roughByteBase = Math.round(THREE.MathUtils.clamp(params.roughnessBase, 0.04, 1) * 255);
  const metalByteBase = Math.round(THREE.MathUtils.clamp(params.metalnessBase, 0, 1) * 255);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;
      const u = x / size;
      const v = y / size;
      let t = 0.5;
      let h = 0.5;

      const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const noise = hash - Math.floor(hash);

      if (params.kind === 'brushed_metal') {
        const streak = Math.sin(y * 1.4 + Math.sin(x * 0.05) * 2.0) * 0.5 + 0.5;
        t = streak * 0.55 + noise * 0.25;
        h = streak * 0.4 + noise * 0.2;
      } else if (params.kind === 'carbon_fiber') {
        const cell = 16;
        const cx = Math.floor((x + y) / cell) % 2;
        const pattern = Math.sin(((x + y) / cell) * Math.PI) * 0.5 + 0.5;
        t = cx === 0 ? pattern * 0.85 : (1 - pattern) * 0.65;
        h = t * 0.75;
      } else if (params.kind === 'ceramic_tile') {
        const grout = x % 64 < 2 || y % 64 < 2 ? 1 : 0;
        t = grout ? 0.9 : 0.1 + noise * 0.08;
        h = grout ? 0.12 : 0.85 - noise * 0.05;
      } else if (params.kind === 'fabric_weave') {
        const wx = Math.sin(u * Math.PI * 32) * 0.5 + 0.5;
        const wy = Math.sin(v * Math.PI * 32) * 0.5 + 0.5;
        const checker = ((Math.floor(u * 16) + Math.floor(v * 16)) % 2) === 0;
        t = checker ? wx * 0.8 : wy * 0.8;
        h = (wx + wy) * 0.45 + noise * 0.1;
      } else if (params.kind === 'wood_grain') {
        const ring = Math.sin((u * 8 + Math.sin(v * Math.PI * 2) * 0.45) * Math.PI * 2) * 0.5 + 0.5;
        t = ring * 0.75 + noise * 0.15;
        h = ring * 0.55 + noise * 0.12;
      } else {
        const blotch =
          (Math.sin(u * Math.PI * 4) * Math.cos(v * Math.PI * 4) * 0.5 + 0.5) * 0.5 +
          noise * 0.5;
        t = blotch;
        h = blotch * 0.7;
      }

      heightBuf[idx] = h;
      const o = idx * 4;

      const cr = Math.round(THREE.MathUtils.lerp(c1.r, c2.r, t) * 255);
      const cg = Math.round(THREE.MathUtils.lerp(c1.g, c2.g, t) * 255);
      const cb = Math.round(THREE.MathUtils.lerp(c1.b, c2.b, t) * 255);

      aImg.data[o] = cr;
      aImg.data[o + 1] = cg;
      aImg.data[o + 2] = cb;
      aImg.data[o + 3] = 255;

      const rVal = THREE.MathUtils.clamp(Math.round(roughByteBase + (0.5 - h) * 60), 10, 255);
      rImg.data[o] = rVal;
      rImg.data[o + 1] = rVal;
      rImg.data[o + 2] = rVal;
      rImg.data[o + 3] = 255;

      const aoVal = THREE.MathUtils.clamp(Math.round(180 + h * 75), 110, 255);
      aoImg.data[o] = aoVal;
      aoImg.data[o + 1] = aoVal;
      aoImg.data[o + 2] = aoVal;
      aoImg.data[o + 3] = 255;

      const mVal = THREE.MathUtils.clamp(Math.round(metalByteBase - (1 - h) * 20), 0, 255);
      mImg.data[o] = mVal;
      mImg.data[o + 1] = mVal;
      mImg.data[o + 2] = mVal;
      mImg.data[o + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  rCtx.putImageData(rImg, 0, 0);
  aoCtx.putImageData(aoImg, 0, 0);
  mCtx.putImageData(mImg, 0, 0);

  // Sobel height-to-normal
  const nImg = nCtx.createImageData(size, size);
  const strength = 2.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const ym = (y - 1 + size) % size;
      const yp = (y + 1) % size;
      const dx = (heightBuf[y * size + xp] - heightBuf[y * size + xm]) * strength;
      const dy = (heightBuf[yp * size + x] - heightBuf[ym * size + x]) * strength;
      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const nx = -dx * invLen;
      const ny = -dy * invLen;
      const nz = invLen;
      const o = (y * size + x) * 4;
      nImg.data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      nImg.data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      nImg.data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      nImg.data[o + 3] = 255;
    }
  }
  nCtx.putImageData(nImg, 0, 0);

  const albedoMap = wrapTexture(albedoCanvas, params.repeat, true, maxAnisotropy);
  const roughnessMap = wrapTexture(roughnessCanvas, params.repeat, false, maxAnisotropy);
  const normalMap = wrapTexture(normalCanvas, params.repeat, false, maxAnisotropy);
  const aoMap = wrapTexture(aoCanvas, params.repeat, false, maxAnisotropy);
  const metalnessMap = wrapTexture(metalnessCanvas, params.repeat, false, maxAnisotropy);

  return {
    albedoCanvas,
    roughnessCanvas,
    normalCanvas,
    aoCanvas,
    metalnessCanvas,
    albedoMap,
    roughnessMap,
    normalMap,
    aoMap,
    metalnessMap,
    roughnessValue: params.roughnessBase,
    metalnessValue: params.metalnessBase,
    dispose: () => {
      albedoMap.dispose();
      roughnessMap.dispose();
      normalMap.dispose();
      aoMap.dispose();
      metalnessMap.dispose();
    },
  };
}
