import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export type CheckSeverity = 'ok' | 'warn' | 'error';

export interface VerificationCheckItem {
  id: string;
  label: string;
  detail: string;
  severity: CheckSeverity;
}

export interface ContainerCheckResult {
  fileName: string;
  fileSizeBytes: number;
  format: 'GLB' | 'GLTF' | 'SCENE';
  validHeader: boolean;
  gltfVersion: string;
  generator: string;
  extensionsUsed: string[];
  extensionsRequired: string[];
  hasDraco: boolean;
  externalMissingFiles: string[];
  jsonChunkBytes?: number;
  binChunkBytes?: number;
  parseError?: string;
}

export interface MeshAuditItem {
  name: string;
  vertices: number;
  triangles: number;
  hasNormals: boolean;
  hasUv0: boolean;
  hasUv2: boolean;
  uvOutOfBounds: boolean;
  isSkinned: boolean;
  boneCount: number;
}

export interface MaterialAuditItem {
  name: string;
  type: string;
  roughness: number | null;
  metalness: number | null;
  channels: string[];
}

export interface AnimationAuditItem {
  name: string;
  durationSec: number;
  tracksCount: number;
}

export interface FileVerificationReport {
  checkedAt: string;
  assetName: string;
  summaryStatus: CheckSeverity;
  container: ContainerCheckResult | null;
  totalMeshes: number;
  totalVertices: number;
  totalTriangles: number;
  totalMaterials: number;
  totalBones: number;
  boundsMeters: { x: number; y: number; z: number };
  checks: VerificationCheckItem[];
  meshes: MeshAuditItem[];
  materials: MaterialAuditItem[];
  animations: AnimationAuditItem[];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export async function inspectGltfBinaryOrJson(
  file: File,
  companionFiles: File[] = []
): Promise<ContainerCheckResult> {
  const isGlb = /\.glb$/i.test(file.name);
  const baseResult: ContainerCheckResult = {
    fileName: file.name,
    fileSizeBytes: file.size,
    format: isGlb ? 'GLB' : 'GLTF',
    validHeader: false,
    gltfVersion: 'Desconhecida',
    generator: 'Não informado',
    extensionsUsed: [],
    extensionsRequired: [],
    hasDraco: false,
    externalMissingFiles: [],
  };

  try {
    if (isGlb) {
      const buffer = await file.arrayBuffer();
      if (buffer.byteLength < 20) {
        return {
          ...baseResult,
          parseError: 'Arquivo .glb muito pequeno para conter cabeçalho glTF válido.',
        };
      }

      const view = new DataView(buffer);
      const magic = view.getUint32(0, true);
      const version = view.getUint32(4, true);
      const declaredLength = view.getUint32(8, true);

      if (magic !== 0x46546c67) {
        return {
          ...baseResult,
          parseError: 'Assinatura mágica inválida (esperado cabeçalho binário "glTF").',
        };
      }

      const chunk0Len = view.getUint32(12, true);
      const chunk0Type = view.getUint32(16, true);
      if (chunk0Type !== 0x4e4f534a || 20 + chunk0Len > buffer.byteLength) {
        return {
          ...baseResult,
          parseError: 'Chunk JSON inicial do arquivo .glb está corrompido ou truncado.',
        };
      }

      const jsonBytes = new Uint8Array(buffer, 20, chunk0Len);
      const jsonText = new TextDecoder().decode(jsonBytes).replace(/\0+$/, '').trim();
      const json = JSON.parse(jsonText) as Record<string, unknown>;

      let binChunkBytes = 0;
      const binOffset = 20 + chunk0Len;
      if (binOffset + 8 <= buffer.byteLength) {
        const chunk1Len = view.getUint32(binOffset, true);
        const chunk1Type = view.getUint32(binOffset + 4, true);
        if (chunk1Type === 0x004e4942) {
          binChunkBytes = chunk1Len;
        }
      }

      const asset = (json.asset as Record<string, unknown>) || {};
      const extUsed = Array.isArray(json.extensionsUsed) ? (json.extensionsUsed as string[]) : [];
      const extReq = Array.isArray(json.extensionsRequired) ? (json.extensionsRequired as string[]) : [];

      return {
        ...baseResult,
        validHeader: version === 2 && declaredLength === buffer.byteLength,
        gltfVersion: String(asset.version || version),
        generator: String(asset.generator || 'Não informado'),
        extensionsUsed: extUsed,
        extensionsRequired: extReq,
        hasDraco:
          extUsed.includes('KHR_draco_mesh_compression') ||
          extReq.includes('KHR_draco_mesh_compression'),
        jsonChunkBytes: chunk0Len,
        binChunkBytes,
      };
    } else {
      const text = await file.text();
      const json = JSON.parse(text) as Record<string, unknown>;
      const asset = (json.asset as Record<string, unknown>) || {};
      const extUsed = Array.isArray(json.extensionsUsed) ? (json.extensionsUsed as string[]) : [];
      const extReq = Array.isArray(json.extensionsRequired) ? (json.extensionsRequired as string[]) : [];

      const availableNames = new Set(companionFiles.map((f) => f.name.toLowerCase()));
      const missing: string[] = [];

      const checkUriList = (arr: unknown) => {
        if (!Array.isArray(arr)) return;
        for (const entry of arr) {
          const uri = (entry as Record<string, unknown>)?.uri;
          if (typeof uri === 'string' && !uri.startsWith('data:') && !uri.startsWith('blob:')) {
            const base = decodeURIComponent(uri.split('/').pop()?.split('?')[0] || '');
            if (base && !availableNames.has(base.toLowerCase())) {
              missing.push(base);
            }
          }
        }
      };

      checkUriList(json.buffers);
      checkUriList(json.images);

      return {
        ...baseResult,
        validHeader: Boolean(asset.version),
        gltfVersion: String(asset.version || 'Desconhecida'),
        generator: String(asset.generator || 'Não informado'),
        extensionsUsed: extUsed,
        extensionsRequired: extReq,
        hasDraco:
          extUsed.includes('KHR_draco_mesh_compression') ||
          extReq.includes('KHR_draco_mesh_compression'),
        externalMissingFiles: Array.from(new Set(missing)),
      };
    }
  } catch (err) {
    return {
      ...baseResult,
      parseError: err instanceof Error ? err.message : 'Erro ao interpretar estrutura glTF/GLB.',
    };
  }
}

export function auditThreeScene(
  root: THREE.Object3D,
  clips: THREE.AnimationClip[],
  assetName: string,
  container: ContainerCheckResult | null
): FileVerificationReport {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  if (!box.isEmpty()) {
    box.getSize(size);
  }

  const meshes: MeshAuditItem[] = [];
  const matMap = new Map<THREE.Material, MaterialAuditItem>();
  const boneSet = new Set<THREE.Bone>();

  let totalVertices = 0;
  let totalTriangles = 0;
  let meshIdx = 0;

  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      // Ignore internal outline helper meshes created by Cel + Borde preview
      if (mesh.material instanceof THREE.MeshBasicMaterial && mesh.material.side === THREE.BackSide && !mesh.name) {
        return;
      }
      meshIdx += 1;
      const geo = mesh.geometry;
      const posAttr = geo?.attributes?.position;
      const uvAttr = geo?.attributes?.uv;
      const uv2Attr = geo?.attributes?.uv2;
      const normAttr = geo?.attributes?.normal;

      const vertices = posAttr ? posAttr.count : 0;
      const triangles = geo?.index
        ? Math.round(geo.index.count / 3)
        : Math.round(vertices / 3);

      totalVertices += vertices;
      totalTriangles += triangles;

      let uvOutOfBounds = false;
      if (uvAttr) {
        const sampleLimit = Math.min(uvAttr.count, 5000);
        for (let i = 0; i < sampleLimit; i++) {
          const u = uvAttr.getX(i);
          const v = uvAttr.getY(i);
          if (u < -0.02 || u > 1.02 || v < -0.02 || v > 1.02) {
            uvOutOfBounds = true;
            break;
          }
        }
      }

      const isSkinned = Boolean((mesh as THREE.SkinnedMesh).isSkinnedMesh);
      let boneCount = 0;
      if (isSkinned) {
        const skeleton = (mesh as THREE.SkinnedMesh).skeleton;
        if (skeleton) {
          boneCount = skeleton.bones.length;
          skeleton.bones.forEach((b) => boneSet.add(b));
        }
      }

      meshes.push({
        name: mesh.name || `Malha_${meshIdx}`,
        vertices,
        triangles,
        hasNormals: Boolean(normAttr),
        hasUv0: Boolean(uvAttr),
        hasUv2: Boolean(uv2Attr),
        uvOutOfBounds,
        isSkinned,
        boneCount,
      });

      const matList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of matList) {
        if (!m || matMap.has(m)) continue;
        const channels: string[] = [];
        let roughness: number | null = null;
        let metalness: number | null = null;

        if (m instanceof THREE.MeshStandardMaterial) {
          roughness = Number(m.roughness.toFixed(2));
          metalness = Number(m.metalness.toFixed(2));
          if (m.map) channels.push('Base Color');
          if (m.normalMap) channels.push('Normal');
          if (m.roughnessMap) channels.push('Roughness');
          if (m.metalnessMap) channels.push('Metallic');
          if (m.aoMap) channels.push('AO');
          if (m.emissiveMap) channels.push('Emissive');
        }

        matMap.set(m, {
          name: m.name || `Material_${matMap.size + 1}`,
          type: m.type,
          roughness,
          metalness,
          channels,
        });
      }
    }
  });

  const materials = Array.from(matMap.values());
  const animations: AnimationAuditItem[] = clips.map((c, idx) => ({
    name: c.name || `Clip_${idx + 1}`,
    durationSec: Number((c.duration || 0).toFixed(2)),
    tracksCount: c.tracks.length,
  }));

  const checks: VerificationCheckItem[] = [];

  if (container) {
    if (container.parseError) {
      checks.push({
        id: 'container',
        label: `Estrutura ${container.format}`,
        detail: container.parseError,
        severity: 'error',
      });
    } else if (container.validHeader) {
      checks.push({
        id: 'container',
        label: `Cabeçalho ${container.format} v${container.gltfVersion}`,
        detail: `Arquivo íntegro (${formatBytes(container.fileSizeBytes)}) · Gerador: ${container.generator}`,
        severity: 'ok',
      });
    } else {
      checks.push({
        id: 'container',
        label: `Cabeçalho ${container.format}`,
        detail: 'Cabeçalho fora do padrão glTF 2.0.',
        severity: 'warn',
      });
    }

    if (container.hasDraco) {
      checks.push({
        id: 'draco',
        label: 'Compressão Draco (KHR_draco_mesh_compression)',
        detail: 'Compressão Draco detectada. Recomendado exportar sem Draco para compatibilidade direta.',
        severity: 'warn',
      });
    }

    if (container.externalMissingFiles.length > 0) {
      checks.push({
        id: 'external_deps',
        label: 'Referências Externas (.bin / Texturas)',
        detail: `Arquivos referenciados não incluídos na seleção: ${container.externalMissingFiles.join(', ')}`,
        severity: 'warn',
      });
    }
  }

  if (meshes.length === 0) {
    checks.push({
      id: 'meshes',
      label: 'Geometria 3D',
      detail: 'Nenhuma malha poligonal encontrada na cena.',
      severity: 'error',
    });
  } else {
    checks.push({
      id: 'meshes',
      label: 'Geometria Poligonal',
      detail: `${meshes.length} malha(s), ${totalVertices.toLocaleString('pt-BR')} vértices e ${totalTriangles.toLocaleString('pt-BR')} triângulos.`,
      severity: 'ok',
    });
  }

  const missingUv = meshes.filter((m) => !m.hasUv0);
  const outOfBoundsUv = meshes.filter((m) => m.uvOutOfBounds);
  if (missingUv.length > 0) {
    checks.push({
      id: 'uvs',
      label: 'Mapeamento UV (UV0)',
      detail: `${missingUv.length} malha(s) sem canal UV (${missingUv.map((m) => m.name).slice(0, 3).join(', ')}). Execute Smart UV Unwrap antes de assar texturas.`,
      severity: 'warn',
    });
  } else if (outOfBoundsUv.length > 0) {
    checks.push({
      id: 'uvs',
      label: 'Mapeamento UV (UV0)',
      detail: `Todas as malhas têm UV0, mas ${outOfBoundsUv.length} ultrapassa [0, 1] (tiling/UDIM).`,
      severity: 'warn',
    });
  } else if (meshes.length > 0) {
    checks.push({
      id: 'uvs',
      label: 'Mapeamento UV (UV0)',
      detail: '100% das malhas possuem coordenadas UV normalizadas no espaço [0, 1].',
      severity: 'ok',
    });
  }

  const missingNormals = meshes.filter((m) => !m.hasNormals);
  if (missingNormals.length > 0) {
    checks.push({
      id: 'normals',
      label: 'Vetores Normais',
      detail: `${missingNormals.length} malha(s) sem normais explícitas.`,
      severity: 'warn',
    });
  } else if (meshes.length > 0) {
    checks.push({
      id: 'normals',
      label: 'Vetores Normais',
      detail: 'Todas as malhas possuem normais de vértice válidas para shading PBR.',
      severity: 'ok',
    });
  }

  const pbrMats = materials.filter((m) => m.type === 'MeshStandardMaterial' || m.type === 'MeshPhysicalMaterial');
  if (materials.length === 0) {
    checks.push({
      id: 'pbr',
      label: 'Materiais PBR',
      detail: 'Nenhum material atribuído às malhas.',
      severity: 'warn',
    });
  } else if (pbrMats.length === materials.length) {
    const texCount = materials.reduce((acc, m) => acc + m.channels.length, 0);
    checks.push({
      id: 'pbr',
      label: 'Materiais PBR (Principled / Standard)',
      detail: `${materials.length} material(is) PBR compatível(is) · ${texCount} mapa(s) de textura conectado(s).`,
      severity: 'ok',
    });
  } else {
    checks.push({
      id: 'pbr',
      label: 'Materiais PBR',
      detail: `${pbrMats.length}/${materials.length} material(is) usam modelo PBR padrão.`,
      severity: 'warn',
    });
  }

  if (animations.length > 0 || boneSet.size > 0) {
    checks.push({
      id: 'rig_anim',
      label: 'Armature & Animações',
      detail: `${boneSet.size} osso(s) vinculado(s) · ${animations.length} clipe(s) de animação detectado(s).`,
      severity: 'ok',
    });
  } else {
    checks.push({
      id: 'rig_anim',
      label: 'Armature & Animações',
      detail: 'Modelo estático (sem Skeleton/AnimationClips vinculados).',
      severity: 'ok',
    });
  }

  let summaryStatus: CheckSeverity = 'ok';
  if (checks.some((c) => c.severity === 'error')) {
    summaryStatus = 'error';
  } else if (checks.some((c) => c.severity === 'warn')) {
    summaryStatus = 'warn';
  }

  return {
    checkedAt: new Date().toLocaleTimeString('pt-BR'),
    assetName,
    summaryStatus,
    container,
    totalMeshes: meshes.length,
    totalVertices,
    totalTriangles,
    totalMaterials: materials.length,
    totalBones: boneSet.size,
    boundsMeters: {
      x: Number(size.x.toFixed(2)),
      y: Number(size.y.toFixed(2)),
      z: Number(size.z.toFixed(2)),
    },
    checks,
    meshes,
    materials,
    animations,
  };
}

export async function verifyStandaloneGltfFiles(fileList: FileList | File[]): Promise<FileVerificationReport> {
  const files = Array.from(fileList);
  const mainFile = files.find((f) => /\.(glb|gltf)$/i.test(f.name));
  if (!mainFile) {
    throw new Error('Selecione um arquivo .glb ou .gltf para verificar.');
  }

  const container = await inspectGltfBinaryOrJson(mainFile, files);
  if (container.parseError) {
    return {
      checkedAt: new Date().toLocaleTimeString('pt-BR'),
      assetName: mainFile.name,
      summaryStatus: 'error',
      container,
      totalMeshes: 0,
      totalVertices: 0,
      totalTriangles: 0,
      totalMaterials: 0,
      totalBones: 0,
      boundsMeters: { x: 0, y: 0, z: 0 },
      checks: [
        {
          id: 'container',
          label: `Estrutura ${container.format}`,
          detail: container.parseError,
          severity: 'error',
        },
      ],
      meshes: [],
      materials: [],
      animations: [],
    };
  }

  const urlMap = new Map<string, string>();
  const createdUrls: string[] = [];
  for (const f of files) {
    const url = URL.createObjectURL(f);
    createdUrls.push(url);
    urlMap.set(f.name.toLowerCase(), url);
  }

  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) return url;
    const clean = decodeURIComponent(url.split('/').pop()?.split('?')[0] || '').toLowerCase();
    return urlMap.get(clean) || url;
  });

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('./libs/draco/');
  const loader = new GLTFLoader(manager);
  loader.setDRACOLoader(dracoLoader);
  loader.setMeshoptDecoder(MeshoptDecoder);

  try {
    if (MeshoptDecoder?.ready) {
      await MeshoptDecoder.ready.catch(() => undefined);
    }
    const payload = /\.glb$/i.test(mainFile.name) ? await mainFile.arrayBuffer() : await mainFile.text();
    const gltf = await loader.parseAsync(payload, '');
    const report = auditThreeScene(gltf.scene, gltf.animations || [], mainFile.name, container);

    gltf.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => m?.dispose());
      }
    });

    return report;
  } finally {
    dracoLoader.dispose();
    createdUrls.forEach((u) => URL.revokeObjectURL(u));
  }
}
