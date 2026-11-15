import * as THREE from 'three';

export type ProceduralPresetId =
  | 'concreto_rachado'
  | 'aco_oxidado'
  | 'armadura_pintada'
  | 'madeira_envelhecida';

export interface ProceduralPbrParams {
  preset: ProceduralPresetId;
  baseColor: string;
  wear: number;
  density: number;
  cracks: number;
  edgeDust: number;
  cavityRust: number;
}

export interface ProceduralPresetMeta {
  id: ProceduralPresetId;
  label: string;
  subtitle: string;
  defaultParams: ProceduralPbrParams;
  baseMetallic: number;
  baseRoughness: number;
}

export const PROCEDURAL_PBR_PRESETS: ProceduralPresetMeta[] = [
  {
    id: 'concreto_rachado',
    label: 'Concreto & Rachaduras',
    subtitle: 'Mineral poroso com fissuras estruturais e acúmulo de borda',
    baseMetallic: 0.0,
    baseRoughness: 0.82,
    defaultParams: {
      preset: 'concreto_rachado',
      baseColor: '#7C8490',
      wear: 0.45,
      density: 2.5,
      cracks: 0.65,
      edgeDust: 0.35,
      cavityRust: 0.25,
    },
  },
  {
    id: 'aco_oxidado',
    label: 'Aço Escovado Oxidado',
    subtitle: 'Metal condutor com micro-riscos e oxidação em cavidades',
    baseMetallic: 0.92,
    baseRoughness: 0.28,
    defaultParams: {
      preset: 'aco_oxidado',
      baseColor: '#B8C2CE',
      wear: 0.55,
      density: 3.0,
      cracks: 0.2,
      edgeDust: 0.25,
      cavityRust: 0.6,
    },
  },
  {
    id: 'armadura_pintada',
    label: 'Pintura Tática Desgastada',
    subtitle: 'Smart Material com tinta fosca, lascas metálicas e poeira',
    baseMetallic: 0.18,
    baseRoughness: 0.52,
    defaultParams: {
      preset: 'armadura_pintada',
      baseColor: '#3B556E',
      wear: 0.65,
      density: 2.0,
      cracks: 0.35,
      edgeDust: 0.55,
      cavityRust: 0.4,
    },
  },
  {
    id: 'madeira_envelhecida',
    label: 'Madeira Envelhecida',
    subtitle: 'Fibras orgânicas direcionais com veios profundos e desgaste',
    baseMetallic: 0.0,
    baseRoughness: 0.74,
    defaultParams: {
      preset: 'madeira_envelhecida',
      baseColor: '#7B5336',
      wear: 0.5,
      density: 3.5,
      cracks: 0.45,
      edgeDust: 0.3,
      cavityRust: 0.35,
    },
  },
];

export interface GeneratedPbrCanvases {
  baseColor: HTMLCanvasElement;
  roughness: HTMLCanvasElement;
  metallic: HTMLCanvasElement;
  normal: HTMLCanvasElement;
  height: HTMLCanvasElement;
  ao: HTMLCanvasElement;
}

export interface ThreePbrTextureBundle {
  map: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
  metalnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  aoMap: THREE.CanvasTexture;
  dispose: () => void;
}

function hash2i(ix: number, iy: number, period: number, seed: number): number {
  const px = ((ix % period) + period) % period;
  const py = ((iy % period) + period) % period;
  let n = (px * 374761393 + py * 668265263 + seed * 1442695041) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n = n ^ (n >>> 16);
  return (n >>> 0) / 4294967295;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function tileableNoise(u: number, v: number, period: number, seed: number): number {
  const x = u * period;
  const y = v * period;
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smoothstep(x - ix);
  const fy = smoothstep(y - iy);

  const v00 = hash2i(ix, iy, period, seed);
  const v10 = hash2i(ix + 1, iy, period, seed);
  const v01 = hash2i(ix, iy + 1, period, seed);
  const v11 = hash2i(ix + 1, iy + 1, period, seed);

  const vx0 = v00 + (v10 - v00) * fx;
  const vx1 = v01 + (v11 - v01) * fx;
  return vx0 + (vx1 - vx0) * fy;
}

function tileableFbm(u: number, v: number, basePeriod: number, seed: number): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let p = Math.max(2, Math.round(basePeriod));
  for (let o = 0; o < 4; o++) {
    sum += tileableNoise(u, v, p, seed + o * 31) * amp;
    norm += amp;
    amp *= 0.5;
    p *= 2;
  }
  return sum / norm;
}

function voronoiCrackEdge(u: number, v: number, cells: number, seed: number): number {
  const p = Math.max(2, Math.round(cells));
  const x = u * p;
  const y = v * p;
  const ix = Math.floor(x);
  const iy = Math.floor(y);

  let d1 = 99;
  let d2 = 99;

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx;
      const cy = iy + dy;
      const jx = cx + 0.15 + 0.7 * hash2i(cx, cy, p, seed);
      const jy = cy + 0.15 + 0.7 * hash2i(cx, cy, p, seed + 97);
      const dist = Math.hypot(jx - x, jy - y);
      if (dist < d1) {
        d2 = d1;
        d1 = dist;
      } else if (dist < d2) {
        d2 = dist;
      }
    }
  }
  return d2 - d1;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  if (Number.isNaN(num)) return [128, 134, 144];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function clamp255(n: number): number {
  return n < 0 ? 0 : n > 255 ? 255 : Math.round(n);
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function makeCanvas(size: number): [HTMLCanvasElement, ImageData, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  return [canvas, img, ctx];
}

export function generateProceduralPbrCanvases(
  params: ProceduralPbrParams,
  size = 256
): GeneratedPbrCanvases {
  const meta =
    PROCEDURAL_PBR_PRESETS.find((p) => p.id === params.preset) || PROCEDURAL_PBR_PRESETS[0];
  const [baseR, baseG, baseB] = hexToRgb(params.baseColor);

  const [cColor, imgColor, ctxColor] = makeCanvas(size);
  const [cRough, imgRough, ctxRough] = makeCanvas(size);
  const [cMetal, imgMetal, ctxMetal] = makeCanvas(size);
  const [cNormal, imgNormal, ctxNormal] = makeCanvas(size);
  const [cHeight, imgHeight, ctxHeight] = makeCanvas(size);
  const [cAo, imgAo, ctxAo] = makeCanvas(size);

  const heightBuf = new Float32Array(size * size);
  const crackMaskBuf = new Float32Array(size * size);
  const fbmBuf = new Float32Array(size * size);

  const density = Math.max(1, params.density);
  const freq = Math.max(2, Math.round(density * 3));
  const crackFreq = Math.max(2, Math.round(density * 2.2));

  // Pass 1: Synthesize height, FBM grain, and crack crevices
  for (let y = 0; y < size; y++) {
    const v = y / size;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const i = y * size + x;

      let macro = tileableFbm(u, v, freq, 11);
      if (params.preset === 'aco_oxidado') {
        const brushed = tileableFbm(u * 0.25, v, freq * 2, 43);
        macro = macro * 0.35 + brushed * 0.65;
      } else if (params.preset === 'madeira_envelhecida') {
        const warp = tileableFbm(u, v, freq, 77) * 0.14;
        const ring = Math.sin((u * density * 4 + warp * 12) * Math.PI * 2) * 0.5 + 0.5;
        macro = macro * 0.3 + ring * 0.7;
      }

      const detail = tileableFbm(u, v, freq * 3, 19);
      const edgeDist = voronoiCrackEdge(u + (macro - 0.5) * 0.08, v + (detail - 0.5) * 0.08, crackFreq, 53);
      const crackWidth = 0.015 + params.cracks * 0.085;
      const crackFactor =
        params.cracks > 0.02
          ? clamp01(1 - edgeDist / Math.max(0.001, crackWidth))
          : 0;

      const h = clamp01(macro * 0.65 + detail * 0.35 - crackFactor * (0.45 + params.cracks * 0.4));
      heightBuf[i] = h;
      crackMaskBuf[i] = crackFactor;
      fbmBuf[i] = macro;
    }
  }

  // Pass 2: Derive Base Color, Roughness, Metallic, Normal, Height & AO
  const normalStrength = 2.6 + params.wear * 2.2 + params.cracks * 2.0;

  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;
      const i = y * size + x;
      const p4 = i * 4;

      const h = heightBuf[i];
      const hL = heightBuf[y * size + xm];
      const hR = heightBuf[y * size + xp];
      const hU = heightBuf[ym * size + x];
      const hD = heightBuf[yp * size + x];

      // Curvature / ridge proxy for Smart Material masks
      const avgNeighbor = (hL + hR + hU + hD) * 0.25;
      const ridge = clamp01((h - avgNeighbor) * 14 + (h - 0.55) * 1.1);
      const cavity = clamp01((avgNeighbor - h) * 16 + crackMaskBuf[i] * 0.9);

      const dustMask = clamp01(ridge * params.edgeDust * 1.25 + params.edgeDust * (fbmBuf[i] > 0.68 ? 0.3 : 0));
      const rustMask = clamp01(cavity * params.cavityRust * 1.35 + crackMaskBuf[i] * params.cavityRust * 0.7);
      const wearChipMask = clamp01((fbmBuf[i] - 0.58) * 2.4 * params.wear + ridge * params.wear * 0.65);

      // Base Color / Albedo
      const shade = 0.78 + h * 0.38;
      let r = baseR * shade;
      let g = baseG * shade;
      let b = baseB * shade;

      // Wear exposes bright bare core / scratches
      if (params.preset === 'armadura_pintada') {
        r = r * (1 - wearChipMask) + 205 * wearChipMask;
        g = g * (1 - wearChipMask) + 212 * wearChipMask;
        b = b * (1 - wearChipMask) + 220 * wearChipMask;
      } else {
        r += wearChipMask * 28;
        g += wearChipMask * 26;
        b += wearChipMask * 22;
      }

      // Edge Dust (Smart Material)
      r = r * (1 - dustMask * 0.55) + 218 * (dustMask * 0.55);
      g = g * (1 - dustMask * 0.55) + 208 * (dustMask * 0.55);
      b = b * (1 - dustMask * 0.55) + 190 * (dustMask * 0.55);

      // Cavity Rust / Grime (Smart Material)
      const rustR = params.preset === 'aco_oxidado' || params.preset === 'armadura_pintada' ? 142 : 48;
      const rustG = params.preset === 'aco_oxidado' || params.preset === 'armadura_pintada' ? 58 : 44;
      const rustB = params.preset === 'aco_oxidado' || params.preset === 'armadura_pintada' ? 28 : 38;
      r = r * (1 - rustMask * 0.78) + rustR * (rustMask * 0.78);
      g = g * (1 - rustMask * 0.78) + rustG * (rustMask * 0.78);
      b = b * (1 - rustMask * 0.78) + rustB * (rustMask * 0.78);

      // Deep cracks darken albedo
      const crackDark = crackMaskBuf[i] * 0.65;
      r *= 1 - crackDark;
      g *= 1 - crackDark;
      b *= 1 - crackDark;

      imgColor.data[p4] = clamp255(r);
      imgColor.data[p4 + 1] = clamp255(g);
      imgColor.data[p4 + 2] = clamp255(b);
      imgColor.data[p4 + 3] = 255;

      // Roughness
      let rough = meta.baseRoughness + (0.5 - fbmBuf[i]) * 0.25 + params.wear * 0.14;
      rough = rough * (1 - wearChipMask * 0.4) + (params.preset === 'armadura_pintada' ? 0.24 : 0.65) * (wearChipMask * 0.4);
      rough = Math.max(rough, dustMask * 0.88);
      rough = Math.max(rough, rustMask * 0.92);
      const roughVal = clamp255(clamp01(rough) * 255);
      imgRough.data[p4] = roughVal;
      imgRough.data[p4 + 1] = roughVal;
      imgRough.data[p4 + 2] = roughVal;
      imgRough.data[p4 + 3] = 255;

      // Metallic
      let metal = meta.baseMetallic;
      if (params.preset === 'armadura_pintada') {
        metal = clamp01(meta.baseMetallic * 0.4 + wearChipMask * 0.85);
      }
      metal *= 1 - dustMask * 0.85;
      metal *= 1 - rustMask * 0.9;
      const metalVal = clamp255(clamp01(metal) * 255);
      imgMetal.data[p4] = metalVal;
      imgMetal.data[p4 + 1] = metalVal;
      imgMetal.data[p4 + 2] = metalVal;
      imgMetal.data[p4 + 3] = 255;

      // Height
      const hVal = clamp255(h * 255);
      imgHeight.data[p4] = hVal;
      imgHeight.data[p4 + 1] = hVal;
      imgHeight.data[p4 + 2] = hVal;
      imgHeight.data[p4 + 3] = 255;

      // Normal Map (Tangent space OpenGL Y+ for Blender / Three.js / glTF)
      const dx = (hL - hR) * normalStrength;
      const dy = (hD - hU) * normalStrength;
      const invLen = 1 / Math.hypot(dx, dy, 1);
      const nx = dx * invLen;
      const ny = dy * invLen;
      const nz = invLen;
      imgNormal.data[p4] = clamp255((nx * 0.5 + 0.5) * 255);
      imgNormal.data[p4 + 1] = clamp255((ny * 0.5 + 0.5) * 255);
      imgNormal.data[p4 + 2] = clamp255((nz * 0.5 + 0.5) * 255);
      imgNormal.data[p4 + 3] = 255;

      // Ambient Occlusion
      const ao = clamp01(1 - crackMaskBuf[i] * 0.72 - cavity * 0.45 - (1 - h) * 0.16);
      const aoVal = clamp255(ao * 255);
      imgAo.data[p4] = aoVal;
      imgAo.data[p4 + 1] = aoVal;
      imgAo.data[p4 + 2] = aoVal;
      imgAo.data[p4 + 3] = 255;
    }
  }

  ctxColor.putImageData(imgColor, 0, 0);
  ctxRough.putImageData(imgRough, 0, 0);
  ctxMetal.putImageData(imgMetal, 0, 0);
  ctxNormal.putImageData(imgNormal, 0, 0);
  ctxHeight.putImageData(imgHeight, 0, 0);
  ctxAo.putImageData(imgAo, 0, 0);

  return {
    baseColor: cColor,
    roughness: cRough,
    metallic: cMetal,
    normal: cNormal,
    height: cHeight,
    ao: cAo,
  };
}

export function createThreePbrTextureBundle(
  params: ProceduralPbrParams,
  maxAniso: number,
  size = 512,
  flipY = true
): ThreePbrTextureBundle {
  const canvases = generateProceduralPbrCanvases(params, size);

  const prep = (canvas: HTMLCanvasElement, isSrgb: boolean) => {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = isSrgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.flipY = flipY;
    tex.anisotropy = maxAniso;
    tex.needsUpdate = true;
    return tex;
  };

  const map = prep(canvases.baseColor, true);
  const roughnessMap = prep(canvases.roughness, false);
  const metalnessMap = prep(canvases.metallic, false);
  const normalMap = prep(canvases.normal, false);
  const aoMap = prep(canvases.ao, false);
  aoMap.channel = 0;

  return {
    map,
    roughnessMap,
    metalnessMap,
    normalMap,
    aoMap,
    dispose: () => {
      map.dispose();
      roughnessMap.dispose();
      metalnessMap.dispose();
      normalMap.dispose();
      aoMap.dispose();
    },
  };
}
