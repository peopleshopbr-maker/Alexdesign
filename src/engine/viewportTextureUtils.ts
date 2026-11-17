import * as THREE from 'three';

export function createUvCheckerTexture(maxAniso: number): THREE.CanvasTexture {
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

export function createProceduralFabricNormalTexture(maxAniso: number): THREE.CanvasTexture {
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

export function createContactShadowTexture(): THREE.CanvasTexture {
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

export function createToonGradient(): THREE.DataTexture {
  const colors = new Uint8Array([70, 175, 255]);
  const grad = new THREE.DataTexture(colors, 3, 1, THREE.RedFormat);
  grad.minFilter = THREE.NearestFilter;
  grad.magFilter = THREE.NearestFilter;
  grad.needsUpdate = true;
  return grad;
}

export type MatcapPreset = 'clay' | 'chrome' | 'redwax';

export function createMatcapTexture(preset: MatcapPreset): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = size * 0.5;
    const cy = size * 0.5;
    const r = size * 0.5;

    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(0, 0, size, size);

    if (preset === 'clay') {
      const grad = ctx.createRadialGradient(size * 0.38, size * 0.32, size * 0.04, cx, cy, r);
      grad.addColorStop(0.0, '#f3ece4');
      grad.addColorStop(0.35, '#cfc3b6');
      grad.addColorStop(0.72, '#8b7e72');
      grad.addColorStop(0.92, '#4a423b');
      grad.addColorStop(1.0, '#2a2521');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (preset === 'redwax') {
      const grad = ctx.createRadialGradient(size * 0.36, size * 0.3, size * 0.03, cx, cy, r);
      grad.addColorStop(0.0, '#ff8e72');
      grad.addColorStop(0.22, '#c84630');
      grad.addColorStop(0.62, '#7d1f16');
      grad.addColorStop(0.88, '#3f0c0a');
      grad.addColorStop(1.0, '#1e0505');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Subtle rim highlight for silhouette inspection
      const rim = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
      rim.addColorStop(0.0, 'rgba(255,160,120,0)');
      rim.addColorStop(0.85, 'rgba(255,130,90,0.22)');
      rim.addColorStop(1.0, 'rgba(255,190,150,0.45)');
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Studio Chrome (high contrast reflection horizon + crisp specular)
      const base = ctx.createLinearGradient(0, 0, 0, size);
      base.addColorStop(0.0, '#f8fafc');
      base.addColorStop(0.38, '#cbd5e1');
      base.addColorStop(0.49, '#334155');
      base.addColorStop(0.54, '#0f172a');
      base.addColorStop(0.78, '#64748b');
      base.addColorStop(1.0, '#e2e8f0');
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      const spec = ctx.createRadialGradient(size * 0.35, size * 0.28, 2, size * 0.35, size * 0.28, size * 0.28);
      spec.addColorStop(0.0, 'rgba(255,255,255,0.98)');
      spec.addColorStop(0.45, 'rgba(255,255,255,0.45)');
      spec.addColorStop(1.0, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function disposeMaterialTree(mat: THREE.Material): void {
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

export type TextureExtractCache = WeakMap<
  THREE.Texture,
  Partial<Record<'rgba' | 'r' | 'g' | 'b', string | null>>
>;

export function extractTextureDataUrl(
  tex: THREE.Texture | null | undefined,
  cache: TextureExtractCache,
  rgbChannel?: 'r' | 'g' | 'b'
): string | null {
  if (!tex || !tex.image) return null;
  const cacheKey = rgbChannel ?? 'rgba';
  let entry = cache.get(tex);
  if (entry && cacheKey in entry) {
    return entry[cacheKey] ?? null;
  }
  if (!entry) {
    entry = {};
    cache.set(tex, entry);
  }
  try {
    const imgObj = tex.image as {
      width?: number;
      height?: number;
      naturalWidth?: number;
      naturalHeight?: number;
    };
    const rawW = imgObj.naturalWidth || imgObj.width || 512;
    const rawH = imgObj.naturalHeight || imgObj.height || 512;
    const targetMax = Math.min(1024, Math.max(256, rawW, rawH));
    const scale = Math.min(1, targetMax / Math.max(rawW, rawH, 1));
    const w = Math.max(128, Math.round(rawW * scale));
    const h = Math.max(128, Math.round(rawH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      entry[cacheKey] = null;
      return null;
    }
    ctx.save();
    if (!tex.flipY) {
      ctx.translate(0, h);
      ctx.scale(1, -1);
    }
    ctx.drawImage(tex.image as CanvasImageSource, 0, 0, w, h);
    ctx.restore();

    if (rgbChannel) {
      const offset = rgbChannel === 'r' ? 0 : rgbChannel === 'g' ? 1 : 2;
      const imgData = ctx.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const val = d[i + offset];
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
        d[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    const url = canvas.toDataURL('image/png');
    entry[cacheKey] = url;
    return url;
  } catch {
    entry[cacheKey] = null;
    return null;
  }
}
