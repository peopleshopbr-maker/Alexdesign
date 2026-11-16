import JSZip from 'jszip';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { auditThreeScene } from './gltfVerifier';
import { RigPreset, RIG_PRESET_DEFINITIONS } from '../types/studioConfig';

export interface CompleteBundleInput {
  targetRoot: THREE.Object3D;
  clips: THREE.AnimationClip[];
  assetName: string;
  rigPreset: RigPreset;
  shadingLabel: string;
  roughnessVal: number;
  metalnessVal: number;
  resolution?: number;
  userLights?: THREE.Object3D | null;
  studioRenderBlob?: Blob | null;
  blenderPipelinePy?: string | null;
}

function textureToPngBlob(tex: THREE.Texture | null | undefined, size = 512): Promise<Blob | null> {
  if (!tex || !tex.image) return Promise.resolve(null);
  const img = tex.image as HTMLCanvasElement | HTMLImageElement | ImageBitmap;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  try {
    if (!tex.flipY) {
      ctx.save();
      ctx.translate(0, size);
      ctx.scale(1, -1);
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, size, size);
    }
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
  } catch {
    return Promise.resolve(null);
  }
}

function solidGrayOrColorPngBlob(fillStyle: string, size = 512): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = fillStyle;
  ctx.fillRect(0, 0, size, size);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function renderUvLayoutPngBlob(root: THREE.Object3D, size = 1024): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = '#0B0E14';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 8; i++) {
    const p = (i / 8) * size;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(249, 115, 22, 0.72)';
  ctx.lineWidth = 1;
  ctx.beginPath();

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshBasicMaterial && mesh.material.side === THREE.BackSide && !mesh.name) {
        return;
      }
      const geo = mesh.geometry;
      const uv = geo?.attributes?.uv;
      const pos = geo?.attributes?.position;
      if (!uv || !pos) return;

      const idx = geo.index;
      const triCount = Math.min(idx ? Math.floor(idx.count / 3) : Math.floor(pos.count / 3), 24000);
      for (let t = 0; t < triCount; t++) {
        const i0 = idx ? idx.getX(t * 3) : t * 3;
        const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
        const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
        const x0 = uv.getX(i0) * size;
        const y0 = (1 - uv.getY(i0)) * size;
        const x1 = uv.getX(i1) * size;
        const y1 = (1 - uv.getY(i1)) * size;
        const x2 = uv.getX(i2) * size;
        const y2 = (1 - uv.getY(i2)) * size;
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x0, y0);
      }
    }
  });
  ctx.stroke();

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

function exportGltfPromise(
  targets: THREE.Object3D | THREE.Object3D[],
  binary: boolean,
  animations: THREE.AnimationClip[]
): Promise<ArrayBuffer | Record<string, unknown>> {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(
      targets,
      (res) => resolve(res as ArrayBuffer | Record<string, unknown>),
      (err) => reject(err),
      {
        binary,
        onlyVisible: true,
        animations,
      }
    );
  });
}

export async function exportCompleteProjectZip(input: CompleteBundleInput): Promise<string> {
  const zip = new JSZip();
  const safeBase = input.assetName.replace(/\.(glb|gltf)$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'PBR_Asset';
  const texSize = Math.min(1024, input.resolution || 512);

  const exportInputs: THREE.Object3D[] = [input.targetRoot];
  if (input.userLights && input.userLights.children.length > 0) {
    exportInputs.push(input.userLights);
  }

  // 1. Export GLB and glTF JSON
  const glbBuffer = (await exportGltfPromise(exportInputs, true, input.clips)) as ArrayBuffer;
  const gltfJson = (await exportGltfPromise(exportInputs, false, input.clips)) as Record<string, unknown>;
  zip.file(`model/${safeBase}.glb`, glbBuffer);
  zip.file(`model/${safeBase}.gltf`, JSON.stringify(gltfJson, null, 2));

  // 2. Gather primary PBR maps present in scene meshes
  let foundMap: THREE.Texture | null = null;
  let foundRough: THREE.Texture | null = null;
  let foundMetal: THREE.Texture | null = null;
  let foundNormal: THREE.Texture | null = null;
  let foundAo: THREE.Texture | null = null;
  let foundEmissive: THREE.Texture | null = null;
  let fallbackColorHex = '#3B4A5E';

  input.targetRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = (obj as THREE.Mesh).material;
      const list = Array.isArray(m) ? m : [m];
      for (const mat of list) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (!foundMap && mat.map) foundMap = mat.map;
          if (!foundRough && mat.roughnessMap) foundRough = mat.roughnessMap;
          if (!foundMetal && mat.metalnessMap) foundMetal = mat.metalnessMap;
          if (!foundNormal && mat.normalMap) foundNormal = mat.normalMap;
          if (!foundAo && mat.aoMap) foundAo = mat.aoMap;
          if (!foundEmissive && mat.emissiveMap) foundEmissive = mat.emissiveMap;
          if (mat.color) fallbackColorHex = `#${mat.color.getHexString()}`;
        }
      }
    }
  });

  const roughGray = Math.round(THREE.MathUtils.clamp(input.roughnessVal, 0, 1) * 255);
  const metalGray = Math.round(THREE.MathUtils.clamp(input.metalnessVal, 0, 1) * 255);

  const [baseBlob, roughBlob, metalBlob, normalBlob, aoBlob, emissiveBlob, uvBlob] = await Promise.all([
    textureToPngBlob(foundMap, texSize).then((b) => b || solidGrayOrColorPngBlob(fallbackColorHex, texSize)),
    textureToPngBlob(foundRough, texSize).then((b) =>
      b || solidGrayOrColorPngBlob(`rgb(${roughGray},${roughGray},${roughGray})`, texSize)
    ),
    textureToPngBlob(foundMetal, texSize).then((b) =>
      b || solidGrayOrColorPngBlob(`rgb(${metalGray},${metalGray},${metalGray})`, texSize)
    ),
    textureToPngBlob(foundNormal, texSize).then((b) => b || solidGrayOrColorPngBlob('#8080FF', texSize)),
    textureToPngBlob(foundAo, texSize).then((b) => b || solidGrayOrColorPngBlob('#FFFFFF', texSize)),
    textureToPngBlob(foundEmissive, texSize),
    renderUvLayoutPngBlob(input.targetRoot, 1024),
  ]);

  if (baseBlob) zip.file(`textures/${safeBase}_BaseColor.png`, baseBlob);
  if (roughBlob) zip.file(`textures/${safeBase}_Roughness.png`, roughBlob);
  if (metalBlob) zip.file(`textures/${safeBase}_Metallic.png`, metalBlob);
  if (normalBlob) zip.file(`textures/${safeBase}_Normal.png`, normalBlob);
  if (aoBlob) zip.file(`textures/${safeBase}_AmbientOcclusion.png`, aoBlob);
  if (emissiveBlob) zip.file(`textures/${safeBase}_Emissive.png`, emissiveBlob);
  if (uvBlob) zip.file(`uv_layouts/${safeBase}_UV_Layout.png`, uvBlob);
  if (input.studioRenderBlob) {
    zip.file(`renders/${safeBase}_Studio_Render.png`, input.studioRenderBlob);
  }
  if (input.blenderPipelinePy) {
    zip.file('blender/pipeline_blender_5_3.py', input.blenderPipelinePy);
  }

  // 3. Technical Verification Report JSON
  const report = auditThreeScene(input.targetRoot, input.clips, input.assetName, null);
  zip.file('report/verification_report.json', JSON.stringify(report, null, 2));

  // 4. Package Manifest README
  const rigMeta = RIG_PRESET_DEFINITIONS[input.rigPreset];
  const readme = [
    `AlexDesign — Pacote Completo de Ativo 3D (https://www.alexdesign.art.br/design)`,
    `========================================`,
    `Ativo: ${input.assetName}`,
    `Predefinição de Rig: ${rigMeta.label} (${rigMeta.boneCount} ossos)`,
    `Modo de Shading ativo: ${input.shadingLabel}`,
    `Malhas: ${report.totalMeshes} | Vértices: ${report.totalVertices} | Triângulos: ${report.totalTriangles}`,
    `Ossos vinculados (Skinned): ${report.totalBones}`,
    `Animações incluídas (${input.clips.length}): ${input.clips.map((c) => c.name).join(', ') || 'Nenhuma'}`,
    ``,
    `Estrutura do ZIP:`,
    `- model/${safeBase}.glb              (Modelo binário pronto para Unity/Unreal/Godot/Web)`,
    `- model/${safeBase}.gltf             (Cena JSON glTF 2.0)`,
    `- textures/${safeBase}_BaseColor.png (Mapa Albedo / Pintura 3D sRGB)`,
    `- textures/${safeBase}_Roughness.png (Mapa de Rugosidade)`,
    `- textures/${safeBase}_Metallic.png  (Mapa Metálico)`,
    `- textures/${safeBase}_Normal.png    (Mapa Normal Tangent-Space)`,
    `- textures/${safeBase}_AmbientOcclusion.png (Mapa AO)`,
    ...(emissiveBlob ? [`- textures/${safeBase}_Emissive.png  (Mapa Emissivo)`] : []),
    `- uv_layouts/${safeBase}_UV_Layout.png (Layout UV 1024x1024)`,
    ...(input.studioRenderBlob ? [`- renders/${safeBase}_Studio_Render.png (Render de Estúdio PNG)`] : []),
    ...(input.blenderPipelinePy ? [`- blender/pipeline_blender_5_3.py   (Script Python bpy Etapas 1-13 Blender 5.3+)`] : []),
    `- report/verification_report.json    (Auditoria técnica PBR/UV/Rig)`,
  ].join('\n');

  zip.file('README.txt', readme);

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipFileName = `${safeBase}_PBR_Completo.zip`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);

  return zipFileName;
}
