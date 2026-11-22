import * as THREE from 'three';

export interface AuditIssueItem {
  id: string;
  severity: 'warn' | 'info';
  message: string;
  meshName?: string;
}

export interface GltfAuditReport {
  studio: 'AlexDesign';
  fileName: string;
  fileSizeBytes: number;
  generator: string;
  meshes: number;
  primitives: number;
  vertices: number;
  triangles: number;
  materials: number;
  textures: number;
  skins: number;
  bones: number;
  animations: number;
  hasUv0: boolean;
  hasUv1: boolean;
  hasNormals: boolean;
  extensionsUsed: string[];
  warnings: string[];
  issues: AuditIssueItem[];
  status: 'OK' | 'ATENCAO';
  meshDetails: {
    name: string;
    vertices: number;
    triangles: number;
    hasNormals: boolean;
    materialName: string;
  }[];
}

function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

export async function auditGltfOrGlbFile(file: File): Promise<GltfAuditReport> {
  const buf = await file.arrayBuffer();
  const ext = file.name.toLowerCase().split('.').pop() || '';

  let gltfJson: Record<string, unknown> | null = null;
  if (ext === 'glb') {
    if (buf.byteLength < 20) {
      throw new Error('Arquivo GLB menor que o cabeçalho mínimo de 20 bytes.');
    }
    const view = new DataView(buf);
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546c67) {
      throw new Error('Cabeçalho GLB inválido (magic diferente de "glTF").');
    }
    const version = view.getUint32(4, true);
    if (version !== 2) {
      throw new Error(`Versão glTF não suportada: ${version} (esperado 2).`);
    }
    let offset = 12;
    while (offset + 8 <= buf.byteLength) {
      const chunkLen = view.getUint32(offset, true);
      const chunkType = view.getUint32(offset + 4, true);
      offset += 8;
      if (chunkType === 0x4e4f534a && gltfJson === null) {
        const jsonBytes = new Uint8Array(buf, offset, chunkLen);
        const text = new TextDecoder('utf-8').decode(jsonBytes);
        gltfJson = JSON.parse(text);
        break;
      }
      offset += chunkLen;
    }
    if (!gltfJson) {
      throw new Error('Chunk JSON ausente no container GLB.');
    }
  } else if (ext === 'gltf') {
    const text = new TextDecoder('utf-8').decode(new Uint8Array(buf));
    gltfJson = JSON.parse(text);
  } else {
    throw new Error('Formato não suportado para auditoria binária direta (use .glb ou .gltf).');
  }

  if (!gltfJson) {
    throw new Error('JSON glTF inválido ou vazio.');
  }

  return auditGltfDict(gltfJson, file.name, file.size);
}

export function auditGltfDict(
  gltf: Record<string, unknown>,
  fileName: string,
  fileSizeBytes: number
): GltfAuditReport {
  const meshes = (gltf.meshes as Array<Record<string, unknown>>) || [];
  const materials = (gltf.materials as Array<Record<string, unknown>>) || [];
  const textures = (gltf.textures as Array<Record<string, unknown>>) || [];
  const animations = (gltf.animations as Array<Record<string, unknown>>) || [];
  const skins = (gltf.skins as Array<Record<string, unknown>>) || [];
  const accessors = (gltf.accessors as Array<Record<string, unknown>>) || [];
  const extensionsUsed = (gltf.extensionsUsed as string[]) || [];
  const asset = (gltf.asset as Record<string, unknown>) || {};

  let totalPrimitives = 0;
  let totalVertices = 0;
  let totalTriangles = 0;
  let hasUv0 = false;
  let hasUv1 = false;
  let hasNormals = false;

  const meshDetails: GltfAuditReport['meshDetails'] = [];
  const issues: AuditIssueItem[] = [];
  const seenNames = new Set<string>();

  meshes.forEach((mesh, idx) => {
    const prims = (mesh.primitives as Array<Record<string, unknown>>) || [];
    let mVerts = 0;
    let mTris = 0;
    let mNorm = false;
    let hasAssignedMat = false;
    let matName = 'Material_Padrao';
    const meshName = String(mesh.name || `Malha_${idx + 1}`);

    if (seenNames.has(meshName)) {
      issues.push({
        id: `dup_${idx}`,
        severity: 'warn',
        message: `Nome duplicado detectado: "${meshName}" (pode conflitar no Blender).`,
        meshName,
      });
    }
    seenNames.add(meshName);

    prims.forEach((prim) => {
      totalPrimitives += 1;
      const attrs = (prim.attributes as Record<string, number>) || {};
      if ('TEXCOORD_0' in attrs) hasUv0 = true;
      if ('TEXCOORD_1' in attrs) hasUv1 = true;
      if ('NORMAL' in attrs) {
        hasNormals = true;
        mNorm = true;
      }

      const posIdx = attrs.POSITION;
      let vCount = 0;
      if (typeof posIdx === 'number' && accessors[posIdx]) {
        vCount = Number(accessors[posIdx].count || 0);
        totalVertices += vCount;
        mVerts += vCount;
      }

      const idxAcc = prim.indices;
      if (typeof idxAcc === 'number' && accessors[idxAcc]) {
        const tris = Math.floor(Number(accessors[idxAcc].count || 0) / 3);
        totalTriangles += tris;
        mTris += tris;
      } else {
        const tris = Math.floor(vCount / 3);
        totalTriangles += tris;
        mTris += tris;
      }

      if (typeof prim.material === 'number' && materials[prim.material]) {
        hasAssignedMat = true;
        matName = String(materials[prim.material].name || `Material_${prim.material + 1}`);
      }
    });

    if (!hasAssignedMat) {
      issues.push({
        id: `nomat_${idx}`,
        severity: 'warn',
        message: `Malha "${meshName}" sem material atribuído.`,
        meshName,
      });
    }
    if (!mNorm) {
      issues.push({
        id: `nonorm_${idx}`,
        severity: 'warn',
        message: `Malha "${meshName}" sem normais explícitas.`,
        meshName,
      });
    }

    meshDetails.push({
      name: meshName,
      vertices: mVerts,
      triangles: mTris,
      hasNormals: mNorm,
      materialName: matName,
    });
  });

  const boneCount = skins.reduce(
    (acc, s) => acc + (((s.joints as unknown[]) || []).length || 0),
    0
  );

  if (materials.length === 0) {
    issues.push({ id: 'global_nomat', severity: 'warn', message: 'Nenhum material definido no arquivo.' });
  }
  if (totalTriangles > 150000) {
    issues.push({
      id: 'poly_budget',
      severity: 'warn',
      message: `Contagem poligonal alta (${totalTriangles.toLocaleString()} triângulos) para web/mobile.`,
    });
  }

  const warnings = issues.map((i) => i.message);

  return {
    studio: 'AlexDesign',
    fileName,
    fileSizeBytes,
    generator: String(asset.generator || 'desconhecido'),
    meshes: meshes.length,
    primitives: totalPrimitives,
    vertices: totalVertices,
    triangles: totalTriangles,
    materials: materials.length,
    textures: textures.length,
    skins: skins.length,
    bones: boneCount,
    animations: animations.length,
    hasUv0,
    hasUv1,
    hasNormals,
    extensionsUsed,
    warnings,
    issues,
    status: warnings.length === 0 ? 'OK' : 'ATENCAO',
    meshDetails,
  };
}

export function auditThreeSceneGroup(
  group: THREE.Object3D,
  sceneName: string,
  clipsCount = 0
): GltfAuditReport {
  let meshes = 0;
  let vertices = 0;
  let triangles = 0;
  let hasUv0 = false;
  let hasUv1 = false;
  let hasNormals = false;
  const matSet = new Set<THREE.Material>();
  const texSet = new Set<THREE.Texture>();
  let bones = 0;
  let skins = 0;
  const meshDetails: GltfAuditReport['meshDetails'] = [];
  const issues: AuditIssueItem[] = [];
  const seenNames = new Set<string>();

  group.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) {
      bones += 1;
    }
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      skins += 1;
    }
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
        return;
      }
      meshes += 1;
      const meshName = m.name || `Malha_${meshes}`;
      if (seenNames.has(meshName)) {
        issues.push({
          id: `dup_${meshes}`,
          severity: 'warn',
          message: `Nome de malha duplicado: "${meshName}". Será renomeado automaticamente na exportação para o Blender.`,
          meshName,
        });
      }
      seenNames.add(meshName);

      const geo = m.geometry;
      const vCount = geo?.attributes?.position?.count || 0;
      const tCount = geo?.index
        ? Math.floor(geo.index.count / 3)
        : Math.floor(vCount / 3);
      vertices += vCount;
      triangles += tCount;

      if (tCount === 0) {
        issues.push({
          id: `empty_${meshes}`,
          severity: 'warn',
          message: `Malha "${meshName}" não possui triângulos visíveis.`,
          meshName,
        });
      }

      const mUv = Boolean(geo?.attributes?.uv);
      const mUv1 = Boolean(geo?.attributes?.uv1);
      const mNorm = Boolean(geo?.attributes?.normal);
      if (mUv) hasUv0 = true;
      if (mUv1) hasUv1 = true;
      if (mNorm) hasNormals = true;
      if (!mNorm) {
        issues.push({
          id: `norm_${meshes}`,
          severity: 'warn',
          message: `Malha "${meshName}" sem normais calculadas.`,
          meshName,
        });
      }

      const mats = (Array.isArray(m.material) ? m.material : [m.material]).filter(Boolean);
      if (mats.length === 0) {
        issues.push({
          id: `mat_${meshes}`,
          severity: 'warn',
          message: `Malha "${meshName}" está sem material atribuído.`,
          meshName,
        });
      }

      let firstMatName = 'Standard';
      mats.forEach((mat) => {
        matSet.add(mat);
        if (mat.name) firstMatName = mat.name;
        const std = mat as THREE.MeshStandardMaterial;
        [std.map, std.normalMap, std.roughnessMap, std.metalnessMap, std.aoMap, std.emissiveMap].forEach(
          (t) => {
            if (!t) return;
            texSet.add(t);
            const img = t.image as { width?: number; height?: number } | undefined;
            if (img && img.width && img.height && (!isPowerOfTwo(img.width) || !isPowerOfTwo(img.height))) {
              issues.push({
                id: `npot_${meshes}_${texSet.size}`,
                severity: 'info',
                message: `Textura em "${meshName}" (${img.width}x${img.height}) fora de potência de 2 (recomendado para mipmaps).`,
                meshName,
              });
            }
          }
        );
      });

      meshDetails.push({
        name: meshName,
        vertices: vCount,
        triangles: tCount,
        hasNormals: mNorm,
        materialName: firstMatName,
      });
    }
  });

  if (meshes === 0) {
    issues.push({ id: 'no_meshes', severity: 'warn', message: 'Nenhuma malha ativa encontrada na cena.' });
  }

  const warnings = issues.filter((i) => i.severity === 'warn').map((i) => i.message);

  return {
    studio: 'AlexDesign',
    fileName: sceneName,
    fileSizeBytes: vertices * 32,
    generator: 'AlexDesign Web Studio 3D (Three.js)',
    meshes,
    primitives: meshes,
    vertices,
    triangles,
    materials: matSet.size,
    textures: texSet.size,
    skins,
    bones,
    animations: clipsCount,
    hasUv0,
    hasUv1,
    hasNormals,
    extensionsUsed: [],
    warnings,
    issues,
    status: warnings.length === 0 ? 'OK' : 'ATENCAO',
    meshDetails,
  };
}
