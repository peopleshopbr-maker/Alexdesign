import { computeSmartBoxUvWithRust } from './rustBridge';
import * as THREE from 'three';
import { RIG_PRESET_DEFINITIONS, RigPreset } from '../types/studioConfig';
import { ImportedUvMesh } from '../components/Viewport3D';

function distToSegmentSq(
  p: THREE.Vector3,
  a: THREE.Vector3,
  b: THREE.Vector3,
  scratchAb: THREE.Vector3,
  scratchAp: THREE.Vector3
): number {
  scratchAb.subVectors(b, a);
  scratchAp.subVectors(p, a);
  const abLenSq = scratchAb.lengthSq();
  if (abLenSq < 1e-8) return scratchAp.lengthSq();
  const t = THREE.MathUtils.clamp(scratchAp.dot(scratchAb) / abLenSq, 0, 1);
  scratchAb.multiplyScalar(t).add(a);
  return p.distanceToSquared(scratchAb);
}

export interface AutoUvOptions {
  uvMargin?: number;
  seamAngleDeg?: number;
}

/**
 * Generates clean box-projected UV0 coordinates in [0, 1] for any meshes inside `group`
 * (or repairs missing UVs) and returns extracted UV edge arrays for the 2D UV Inspector.
 */
export function autoGenerateUvsForGroup(
  group: THREE.Object3D,
  options?: AutoUvOptions
): ImportedUvMesh[] {
  group.updateMatrixWorld(true);
  const results: ImportedUvMesh[] = [];
  const meshes: THREE.Mesh[] = [];

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      // Skip outline helper meshes
      if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
        return;
      }
      meshes.push(m);
    }
  });

  if (meshes.length === 0) return results;

  // Pack all meshes into an NxN grid of UV tiles inside [0, 1] respecting user uvMargin
  const gridCols = Math.ceil(Math.sqrt(meshes.length));
  const cellSpan = 1 / gridCols;
  const userMargin = THREE.MathUtils.clamp(options?.uvMargin ?? 0.02, 0.002, 0.25);
  const pad = cellSpan * (0.04 + userMargin);
  const innerSpan = Math.max(0.02, cellSpan - pad * 2);

  const pA = new THREE.Vector3();
  const pB = new THREE.Vector3();
  const pC = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const fn = new THREE.Vector3();

  meshes.forEach((mesh, meshIdx) => {
    const geo = mesh.geometry;
    if (!geo || !geo.attributes.position) return;

    // Convert to non-indexed if indexed so triplanar face projection has zero seam stretching
    const workingGeo = geo.index ? geo.toNonIndexed() : geo;
    if (workingGeo !== geo) {
      mesh.geometry = workingGeo;
      geo.dispose();
    }

    const pos = workingGeo.attributes.position;
    workingGeo.computeBoundingBox();
    const bbox = workingGeo.boundingBox!;
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 1e-4);

    const uvArray = new Float32Array(pos.count * 2);
    const col = meshIdx % gridCols;
    const row = Math.floor(meshIdx / gridCols);
    const tileX = col * cellSpan + pad;
    const tileY = row * cellSpan + pad;

    const triCount = Math.floor(pos.count / 3);
    workingGeo.computeVertexNormals();
    const normAttr = workingGeo.attributes.normal;

    // Tenta calcular a projecao Smart Box UV via Rust/WebAssembly
    let usedRust = false;
    if (pos.array instanceof Float32Array && normAttr && normAttr.array instanceof Float32Array) {
      try {
        const rustRawUvs = computeSmartBoxUvWithRust(pos.array, normAttr.array);
        if (rustRawUvs.length === pos.count * 2) {
          for (let i = 0; i < pos.count; i++) {
            uvArray[i * 2] = tileX + THREE.MathUtils.clamp(rustRawUvs[i * 2], 0, 1) * innerSpan;
            uvArray[i * 2 + 1] = tileY + THREE.MathUtils.clamp(rustRawUvs[i * 2 + 1], 0, 1) * innerSpan;
          }
          usedRust = true;
        }
      } catch {
        usedRust = false;
      }
    }

    if (!usedRust) for (let t = 0; t < triCount; t++) {
      const i0 = t * 3;
      const i1 = t * 3 + 1;
      const i2 = t * 3 + 2;

      pA.fromBufferAttribute(pos, i0);
      pB.fromBufferAttribute(pos, i1);
      pC.fromBufferAttribute(pos, i2);

      e1.subVectors(pB, pA);
      e2.subVectors(pC, pA);
      fn.crossVectors(e1, e2);

      const ax = Math.abs(fn.x);
      const ay = Math.abs(fn.y);
      const az = Math.abs(fn.z);

      const verts = [pA, pB, pC];
      for (let k = 0; k < 3; k++) {
        const v = verts[k];
        let uLocal = 0;
        let vLocal = 0;
        if (ax >= ay && ax >= az) {
          uLocal = (v.z - bbox.min.z) / maxDim;
          vLocal = (v.y - bbox.min.y) / maxDim;
        } else if (ay >= ax && ay >= az) {
          uLocal = (v.x - bbox.min.x) / maxDim;
          vLocal = (v.z - bbox.min.z) / maxDim;
        } else {
          uLocal = (v.x - bbox.min.x) / maxDim;
          vLocal = (v.y - bbox.min.y) / maxDim;
        }
        const vi = (t * 3 + k) * 2;
        uvArray[vi] = tileX + THREE.MathUtils.clamp(uLocal, 0, 1) * innerSpan;
        uvArray[vi + 1] = tileY + THREE.MathUtils.clamp(vLocal, 0, 1) * innerSpan;
      }
    }

    const uvAttr = new THREE.BufferAttribute(uvArray, 2);
    workingGeo.setAttribute('uv', uvAttr);
    workingGeo.setAttribute('uv1', uvAttr);
    workingGeo.setAttribute('uv2', uvAttr);
    workingGeo.computeVertexNormals();

    const maxEdgesTris = Math.min(triCount, 12000);
    const edges = new Float32Array(maxEdgesTris * 12);
    for (let t = 0; t < maxEdgesTris; t++) {
      const i0 = t * 3;
      const i1 = t * 3 + 1;
      const i2 = t * 3 + 2;
      const o = t * 12;
      edges[o] = uvAttr.getX(i0);
      edges[o + 1] = uvAttr.getY(i0);
      edges[o + 2] = uvAttr.getX(i1);
      edges[o + 3] = uvAttr.getY(i1);
      edges[o + 4] = uvAttr.getX(i1);
      edges[o + 5] = uvAttr.getY(i1);
      edges[o + 6] = uvAttr.getX(i2);
      edges[o + 7] = uvAttr.getY(i2);
      edges[o + 8] = uvAttr.getX(i2);
      edges[o + 9] = uvAttr.getY(i2);
      edges[o + 10] = uvAttr.getX(i0);
      edges[o + 11] = uvAttr.getY(i0);
    }

    results.push({
      name: mesh.name || `Malha_${meshIdx + 1}`,
      uvEdges: edges,
      triCount,
    });
  });

  return results;
}

function buildClipsForPreset(
  preset: RigPreset,
  bonesByName: Map<string, THREE.Bone>
): THREE.AnimationClip[] {
  const euler = new THREE.Euler();
  const q = new THREE.Quaternion();

  const quatTrack = (boneName: string, times: number[], eulers: [number, number, number][]) => {
    const bone = bonesByName.get(boneName);
    if (!bone) return null;
    const baseQ = bone.quaternion.clone();
    const values: number[] = [];
    for (const [rx, ry, rz] of eulers) {
      euler.set(rx, ry, rz, 'XYZ');
      q.setFromEuler(euler);
      const combined = baseQ.clone().multiply(q);
      values.push(combined.x, combined.y, combined.z, combined.w);
    }
    return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values);
  };

  const posTrack = (boneName: string, times: number[], offsets: [number, number, number][]) => {
    const bone = bonesByName.get(boneName);
    if (!bone) return null;
    const baseP = bone.position.clone();
    const values: number[] = [];
    for (const [dx, dy, dz] of offsets) {
      values.push(baseP.x + dx, baseP.y + dy, baseP.z + dz);
    }
    return new THREE.VectorKeyframeTrack(`${boneName}.position`, times, values);
  };

  const compact = (arr: (THREE.KeyframeTrack | null)[]) =>
    arr.filter((t): t is THREE.KeyframeTrack => t !== null);

  if (preset === 'OBJETO') {
    const t5 = [0, 0.625, 1.25, 1.875, 2.5];
    const idleTracks = compact([
      posTrack('root_pivot', t5, [[0, 0, 0], [0, 0.03, 0], [0, 0, 0], [0, 0.03, 0], [0, 0, 0]]),
      quatTrack('center_ctrl', t5, [[0, 0, 0], [0.04, 0.25, 0], [0, 0, 0], [-0.04, -0.25, 0], [0, 0, 0]]),
      quatTrack('top_ctrl', t5, [[0, 0, 0], [0, 0.15, 0.03], [0, 0, 0], [0, -0.15, -0.03], [0, 0, 0]]),
    ]);
    const spinTracks = compact([
      posTrack('root_pivot', t5, [[0, 0, 0], [0, 0.04, 0], [0, 0, 0], [0, 0.04, 0], [0, 0, 0]]),
      quatTrack('center_ctrl', t5, [[0, 0, 0], [0, Math.PI * 0.5, 0], [0, Math.PI, 0], [0, Math.PI * 1.5, 0], [0, Math.PI * 2, 0]]),
    ]);
    const tiltTracks = compact([
      posTrack('root_pivot', t5, [[0, 0, 0], [0, 0.05, 0], [0, -0.01, 0], [0, 0.03, 0], [0, 0, 0]]),
      quatTrack('center_ctrl', t5, [[0, 0, 0], [0.16, 0.35, 0.08], [0, 0, 0], [-0.14, -0.35, -0.08], [0, 0, 0]]),
      quatTrack('top_ctrl', t5, [[0, 0, 0], [0.08, -0.2, 0], [0, 0, 0], [-0.08, 0.2, 0], [0, 0, 0]]),
    ]);
    return [
      new THREE.AnimationClip('Idle_Float', 2.5, idleTracks),
      new THREE.AnimationClip('Turntable_Spin', 2.5, spinTracks),
      new THREE.AnimationClip('Test_Rig_Animation', 2.5, tiltTracks),
    ];
  }

  if (preset === 'QUADRUPEDE') {
    const t5 = [0, 0.625, 1.25, 1.875, 2.5];
    const idleTracks = compact([
      posTrack('pelvis', t5, [[0, 0, 0], [0, 0.015, 0], [0, 0, 0], [0, 0.015, 0], [0, 0, 0]]),
      quatTrack('neck', t5, [[0, 0, 0], [0.07, 0.08, 0], [0, 0, 0], [-0.05, -0.08, 0], [0, 0, 0]]),
      quatTrack('head', t5, [[0, 0, 0], [0.05, 0.14, 0], [0, 0, 0], [0.05, -0.14, 0], [0, 0, 0]]),
      quatTrack('tail_01', t5, [[0, -0.25, 0], [0, 0.25, 0], [0, -0.25, 0], [0, 0.25, 0], [0, -0.25, 0]]),
      quatTrack('tail_02', t5, [[0, -0.3, 0], [0, 0.3, 0], [0, -0.3, 0], [0, 0.3, 0], [0, -0.3, 0]]),
    ]);

    const walkTracks = compact([
      posTrack('pelvis', t5, [[0, 0, 0], [0, 0.03, 0], [0, 0, 0], [0, 0.03, 0], [0, 0, 0]]),
      quatTrack('spine_01', t5, [[0, -0.05, 0], [0, 0.05, 0], [0, -0.05, 0], [0, 0.05, 0], [0, -0.05, 0]]),
      quatTrack('front_upper_L', t5, [[0.32, 0, 0], [0, 0, 0], [-0.32, 0, 0], [0, 0, 0], [0.32, 0, 0]]),
      quatTrack('hind_upper_R', t5, [[0.32, 0, 0], [0, 0, 0], [-0.32, 0, 0], [0, 0, 0], [0.32, 0, 0]]),
      quatTrack('front_upper_R', t5, [[-0.32, 0, 0], [0, 0, 0], [0.32, 0, 0], [0, 0, 0], [-0.32, 0, 0]]),
      quatTrack('hind_upper_L', t5, [[-0.32, 0, 0], [0, 0, 0], [0.32, 0, 0], [0, 0, 0], [-0.32, 0, 0]]),
      quatTrack('tail_01', t5, [[0, -0.35, 0], [0, 0.35, 0], [0, -0.35, 0], [0, 0.35, 0], [0, -0.35, 0]]),
    ]);

    const testTracks = compact([
      posTrack('pelvis', t5, [[0, 0, 0], [0, 0.04, 0], [0, -0.01, 0], [0, 0.03, 0], [0, 0, 0]]),
      quatTrack('neck', t5, [[0, 0, 0], [0.18, 0.25, 0], [0, 0, 0], [-0.14, -0.25, 0], [0, 0, 0]]),
      quatTrack('front_upper_L', t5, [[0, 0, 0], [0.45, 0, 0], [-0.35, 0, 0], [0.2, 0, 0], [0, 0, 0]]),
      quatTrack('front_upper_R', t5, [[0, 0, 0], [-0.35, 0, 0], [0.45, 0, 0], [-0.2, 0, 0], [0, 0, 0]]),
      quatTrack('hind_upper_L', t5, [[0, 0, 0], [-0.3, 0, 0], [0.35, 0, 0], [-0.15, 0, 0], [0, 0, 0]]),
      quatTrack('hind_upper_R', t5, [[0, 0, 0], [0.35, 0, 0], [-0.3, 0, 0], [0.15, 0, 0], [0, 0, 0]]),
      quatTrack('tail_01', t5, [[0, 0, 0], [0.25, 0.4, 0], [0, 0, 0], [-0.2, -0.4, 0], [0, 0, 0]]),
    ]);

    return [
      new THREE.AnimationClip('Walk_Cycle', 2.5, walkTracks),
      new THREE.AnimationClip('Idle_Breathing', 2.5, idleTracks),
      new THREE.AnimationClip('Test_Rig_Animation', 2.5, testTracks),
    ];
  }

  const t5 = [0, 0.625, 1.25, 1.875, 2.5];
  const spineBone = bonesByName.has('spine_01') ? 'spine_01' : 'spine';

  const walkTracks = compact([
    posTrack('pelvis', t5, [[0, 0, 0], [0, 0.025, 0], [0, 0, 0], [0, 0.025, 0], [0, 0, 0]]),
    quatTrack(spineBone, t5, [[0, -0.07, 0], [0, 0, 0], [0, 0.07, 0], [0, 0, 0], [0, -0.07, 0]]),
    quatTrack('head', t5, [[0, 0.05, 0], [0.04, 0, 0], [0, -0.05, 0], [0.04, 0, 0], [0, 0.05, 0]]),
    quatTrack('upper_arm_L', t5, [[0.34, 0, -0.18], [0, 0, -0.18], [-0.34, 0, -0.18], [0, 0, -0.18], [0.34, 0, -0.18]]),
    quatTrack('forearm_L', t5, [[-0.25, 0, 0], [-0.45, 0, 0], [-0.2, 0, 0], [-0.45, 0, 0], [-0.25, 0, 0]]),
    quatTrack('upper_arm_R', t5, [[-0.34, 0, 0.18], [0, 0, 0.18], [0.34, 0, 0.18], [0, 0, 0.18], [-0.34, 0, 0.18]]),
    quatTrack('forearm_R', t5, [[-0.2, 0, 0], [-0.45, 0, 0], [-0.25, 0, 0], [-0.45, 0, 0], [-0.2, 0, 0]]),
    quatTrack('thigh_L', t5, [[-0.32, 0, 0], [0, 0, 0], [0.32, 0, 0], [0, 0, 0], [-0.32, 0, 0]]),
    quatTrack('shin_L', t5, [[0.15, 0, 0], [0.42, 0, 0], [0.05, 0, 0], [0.22, 0, 0], [0.15, 0, 0]]),
    quatTrack('thigh_R', t5, [[0.32, 0, 0], [0, 0, 0], [-0.32, 0, 0], [0, 0, 0], [0.32, 0, 0]]),
    quatTrack('shin_R', t5, [[0.05, 0, 0], [0.22, 0, 0], [0.15, 0, 0], [0.42, 0, 0], [0.05, 0, 0]]),
  ]);

  const idleTracks = compact([
    posTrack('pelvis', t5, [[0, 0, 0], [0, 0.014, 0], [0, 0, 0], [0, 0.014, 0], [0, 0, 0]]),
    quatTrack('chest', t5, [[0, 0, 0], [0.04, 0, 0], [0, 0, 0], [-0.03, 0, 0], [0, 0, 0]]),
    quatTrack('head', t5, [[0, 0, 0], [0.04, 0.14, 0], [0, 0, 0], [0.03, -0.14, 0], [0, 0, 0]]),
    quatTrack('upper_arm_L', t5, [[0.05, 0, -0.15], [0.08, 0, -0.12], [0.05, 0, -0.15], [0.02, 0, -0.17], [0.05, 0, -0.15]]),
    quatTrack('upper_arm_R', t5, [[0.05, 0, 0.15], [0.02, 0, 0.17], [0.05, 0, 0.15], [0.08, 0, 0.12], [0.05, 0, 0.15]]),
  ]);

  const testTracks = compact([
    posTrack('pelvis', t5, [[0, 0, 0], [0, 0.04, 0], [0, -0.02, 0], [0, 0.02, 0], [0, 0, 0]]),
    quatTrack(spineBone, t5, [[0, 0, 0], [0.08, 0.18, 0], [0, 0, 0], [-0.06, -0.18, 0], [0, 0, 0]]),
    quatTrack('head', t5, [[0, 0, 0], [0.12, 0.25, 0], [0, 0, 0], [-0.1, -0.25, 0], [0, 0, 0]]),
    quatTrack('upper_arm_L', t5, [[0, 0, -0.15], [0.45, 0, -0.45], [-0.35, 0, -0.15], [0.2, 0, -0.25], [0, 0, -0.15]]),
    quatTrack('upper_arm_R', t5, [[0, 0, 0.15], [-0.35, 0, 0.15], [0.45, 0, 0.45], [-0.2, 0, 0.25], [0, 0, 0.15]]),
    quatTrack('thigh_L', t5, [[0, 0, 0], [-0.35, 0, 0], [0.35, 0, 0], [-0.15, 0, 0], [0, 0, 0]]),
    quatTrack('thigh_R', t5, [[0, 0, 0], [0.35, 0, 0], [-0.35, 0, 0], [0.15, 0, 0], [0, 0, 0]]),
  ]);

  // Movimentos essenciais do bípede: Correr, Pular e Acenar
  const t5Fast = [0, 0.3125, 0.625, 0.9375, 1.25];
  const runTracks = compact([
    posTrack('pelvis', t5Fast, [[0, 0.05, 0], [0, -0.02, 0], [0, 0.05, 0], [0, -0.02, 0], [0, 0.05, 0]]),
    quatTrack(spineBone, t5Fast, [[0.18, -0.14, 0], [0.18, 0, 0], [0.18, 0.14, 0], [0.18, 0, 0], [0.18, -0.14, 0]]),
    quatTrack('head', t5Fast, [[-0.12, 0.06, 0], [-0.1, 0, 0], [-0.12, -0.06, 0], [-0.1, 0, 0], [-0.12, 0.06, 0]]),
    quatTrack('upper_arm_L', t5Fast, [[0.7, 0, -0.18], [0, 0, -0.18], [-0.7, 0, -0.18], [0, 0, -0.18], [0.7, 0, -0.18]]),
    quatTrack('forearm_L', t5Fast, [[-1.0, 0, 0], [-1.2, 0, 0], [-0.6, 0, 0], [-1.2, 0, 0], [-1.0, 0, 0]]),
    quatTrack('upper_arm_R', t5Fast, [[-0.7, 0, 0.18], [0, 0, 0.18], [0.7, 0, 0.18], [0, 0, 0.18], [-0.7, 0, 0.18]]),
    quatTrack('forearm_R', t5Fast, [[-0.6, 0, 0], [-1.2, 0, 0], [-1.0, 0, 0], [-1.2, 0, 0], [-0.6, 0, 0]]),
    quatTrack('thigh_L', t5Fast, [[-0.7, 0, 0], [0, 0, 0], [0.7, 0, 0], [0, 0, 0], [-0.7, 0, 0]]),
    quatTrack('shin_L', t5Fast, [[0.3, 0, 0], [1.0, 0, 0], [0.1, 0, 0], [0.5, 0, 0], [0.3, 0, 0]]),
    quatTrack('thigh_R', t5Fast, [[0.7, 0, 0], [0, 0, 0], [-0.7, 0, 0], [0, 0, 0], [0.7, 0, 0]]),
    quatTrack('shin_R', t5Fast, [[0.1, 0, 0], [0.5, 0, 0], [0.3, 0, 0], [1.0, 0, 0], [0.1, 0, 0]]),
  ]);

  // Pular: agachar -> impulso -> ar -> aterrissar -> recuperar
  const tJump = [0, 0.3, 0.6, 0.9, 1.2];
  const jumpTracks = compact([
    posTrack('pelvis', tJump, [[0, 0, 0], [0, -0.14, 0], [0, 0.4, 0], [0, -0.1, 0], [0, 0, 0]]),
    quatTrack(spineBone, tJump, [[0, 0, 0], [0.3, 0, 0], [-0.1, 0, 0], [0.25, 0, 0], [0, 0, 0]]),
    quatTrack('upper_arm_L', tJump, [[0, 0, -0.15], [-0.5, 0, -0.15], [0.3, 0, -1.2], [-0.3, 0, -0.3], [0, 0, -0.15]]),
    quatTrack('upper_arm_R', tJump, [[0, 0, 0.15], [-0.5, 0, 0.15], [0.3, 0, 1.2], [-0.3, 0, 0.3], [0, 0, 0.15]]),
    quatTrack('thigh_L', tJump, [[0, 0, 0], [-0.8, 0, 0], [-0.3, 0, 0], [-0.7, 0, 0], [0, 0, 0]]),
    quatTrack('shin_L', tJump, [[0, 0, 0], [1.3, 0, 0], [0.5, 0, 0], [1.1, 0, 0], [0, 0, 0]]),
    quatTrack('thigh_R', tJump, [[0, 0, 0], [-0.8, 0, 0], [-0.3, 0, 0], [-0.7, 0, 0], [0, 0, 0]]),
    quatTrack('shin_R', tJump, [[0, 0, 0], [1.3, 0, 0], [0.5, 0, 0], [1.1, 0, 0], [0, 0, 0]]),
  ]);

  // Acenar com o braço direito
  const waveTracks = compact([
    quatTrack('upper_arm_R', t5, [[0, 0, 0.15], [0, 0, 2.2], [0, 0, 2.2], [0, 0, 2.2], [0, 0, 0.15]]),
    quatTrack('forearm_R', t5, [[0, 0, 0], [0, 0, 0.5], [0, 0, -0.5], [0, 0, 0.5], [0, 0, 0]]),
    quatTrack('head', t5, [[0, 0, 0], [0, -0.15, 0.05], [0, -0.15, -0.05], [0, -0.15, 0.05], [0, 0, 0]]),
  ]);

  return [
    new THREE.AnimationClip('Idle_Breathing', 2.5, idleTracks),
    new THREE.AnimationClip('Walk_Cycle', 2.5, walkTracks),
    new THREE.AnimationClip('Run_Cycle', 1.25, runTracks),
    new THREE.AnimationClip('Jump', 1.2, jumpTracks),
    new THREE.AnimationClip('Wave', 2.5, waveTracks),
    new THREE.AnimationClip('Test_Rig_Animation', 2.5, testTracks),
  ];
}

export interface AutoRigResult {
  clips: THREE.AnimationClip[];
  boneCount: number;
  armatureRoot: THREE.Group;
  skinnedMeshes: THREE.SkinnedMesh[];
}

/**
 * Automatically builds a real Three.js Skeleton hierarchy matching `preset` fitted to `group`,
 * computes inverse-distance vertex weights, converts meshes to SkinnedMeshes, and generates
 * playable AnimationClips compatible with GLTFExporter.
 */
export function autoRigAndAnimateGroup(group: THREE.Group, preset: RigPreset): AutoRigResult {
  const prevArmature = group.getObjectByName('AutoRig_Armature');
  if (prevArmature) {
    group.remove(prevArmature);
  }

  group.updateMatrixWorld(true);
  const groupInvWorld = group.matrixWorld.clone().invert();

  // Compute bounding box in group-local space
  const box = new THREE.Box3();
  const vTmp = new THREE.Vector3();
  const targetMeshes: THREE.Mesh[] = [];

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
        return;
      }
      targetMeshes.push(m);
      const pos = m.geometry?.attributes?.position;
      if (pos) {
        const meshToGroup = new THREE.Matrix4().multiplyMatrices(groupInvWorld, m.matrixWorld);
        for (let i = 0; i < pos.count; i++) {
          vTmp.fromBufferAttribute(pos, i).applyMatrix4(meshToGroup);
          box.expandByPoint(vTmp);
        }
      }
    }
  });

  if (box.isEmpty()) {
    box.set(new THREE.Vector3(-0.4, 0, -0.4), new THREE.Vector3(0.4, 1.75, 0.4));
  }

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const def = RIG_PRESET_DEFINITIONS[preset] || RIG_PRESET_DEFINITIONS.OBJETO;

  // Determine normalized preset bounds in Three.js Y-up space
  const refBox = new THREE.Box3();
  const headPositions = new Map<string, THREE.Vector3>();
  const tailPositions = new Map<string, THREE.Vector3>();

  for (const [bName, , headB, tailB] of def.bones) {
    const h = new THREE.Vector3(headB[0], headB[2], -headB[1]);
    const t = new THREE.Vector3(tailB[0], tailB[2], -tailB[1]);
    refBox.expandByPoint(h);
    refBox.expandByPoint(t);
    headPositions.set(bName, h);
    tailPositions.set(bName, t);
  }

  const refSize = new THREE.Vector3();
  const refCenter = new THREE.Vector3();
  refBox.getSize(refSize);
  refBox.getCenter(refCenter);

  const scaleX = (size.x || 1) / Math.max(refSize.x, 0.15);
  const scaleY = (size.y || 1) / Math.max(refSize.y, 0.25);
  const scaleZ = (size.z || 1) / Math.max(refSize.z, 0.15);
  const uniformFootprintScale = Math.min(scaleX, scaleZ);

  const mapToGroupSpace = (p: THREE.Vector3) =>
    new THREE.Vector3(
      center.x + (p.x - refCenter.x) * uniformFootprintScale,
      box.min.y + (p.y - refBox.min.y) * scaleY,
      center.z + (p.z - refCenter.z) * uniformFootprintScale
    );

  // Build THREE.Bone hierarchy in group-local space
  const armatureRoot = new THREE.Group();
  armatureRoot.name = 'AutoRig_Armature';
  group.add(armatureRoot);

  const bones: THREE.Bone[] = [];
  const bonesByName = new Map<string, THREE.Bone>();
  const worldSegments: { index: number; head: THREE.Vector3; tail: THREE.Vector3 }[] = [];

  for (const [bName, parentName] of def.bones) {
    const hGroup = mapToGroupSpace(headPositions.get(bName)!);
    const tGroup = mapToGroupSpace(tailPositions.get(bName)!);

    const bone = new THREE.Bone();
    bone.name = bName;

    const parentBone = parentName ? bonesByName.get(parentName) : undefined;
    if (parentBone) {
      const parentHGroup = mapToGroupSpace(headPositions.get(parentName!)!);
      bone.position.copy(hGroup).sub(parentHGroup);
      parentBone.add(bone);
    } else {
      bone.position.copy(hGroup);
      armatureRoot.add(bone);
    }

    worldSegments.push({ index: bones.length, head: hGroup, tail: tGroup });
    bones.push(bone);
    bonesByName.set(bName, bone);
  }

  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();

  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const scratchAb = new THREE.Vector3();
  const scratchAp = new THREE.Vector3();

  for (const oldMesh of targetMeshes) {
    const geo = oldMesh.geometry;
    if (!geo || !geo.attributes.position) continue;

    // Remove any rigid outline helper child
    const outlineChildren = oldMesh.children.filter(
      (c) => (c as THREE.Mesh).isMesh && (c as THREE.Mesh).material instanceof THREE.MeshBasicMaterial
    );
    outlineChildren.forEach((c) => oldMesh.remove(c));

    const posAttr = geo.attributes.position;
    const vertCount = posAttr.count;
    const skinIndices = new Uint16Array(vertCount * 4);
    const skinWeights = new Float32Array(vertCount * 4);

    const meshToGroup = new THREE.Matrix4().multiplyMatrices(groupInvWorld, oldMesh.matrixWorld);
    const bestIdx = new Int32Array(4);
    const bestW = new Float32Array(4);

    for (let i = 0; i < vertCount; i++) {
      vTmp.fromBufferAttribute(posAttr, i).applyMatrix4(meshToGroup);
      bestIdx.fill(0);
      bestW.fill(0);

      for (let b = 0; b < worldSegments.length; b++) {
        const seg = worldSegments[b];
        const dSq = distToSegmentSq(vTmp, seg.head, seg.tail, scratchAb, scratchAp);
        const w = 1 / Math.pow(dSq + 0.0025, 2.0);

        // Insert into top 4
        if (w > bestW[3]) {
          let pos = 3;
          while (pos > 0 && w > bestW[pos - 1]) {
            bestW[pos] = bestW[pos - 1];
            bestIdx[pos] = bestIdx[pos - 1];
            pos--;
          }
          bestW[pos] = w;
          bestIdx[pos] = seg.index;
        }
      }

      const sum = bestW[0] + bestW[1] + bestW[2] + bestW[3] || 1;
      const o = i * 4;
      for (let k = 0; k < 4; k++) {
        skinIndices[o + k] = bestIdx[k];
        skinWeights[o + k] = bestW[k] / sum;
      }
    }

    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

    let skinned: THREE.SkinnedMesh;
    if ((oldMesh as THREE.SkinnedMesh).isSkinnedMesh) {
      skinned = oldMesh as THREE.SkinnedMesh;
    } else {
      skinned = new THREE.SkinnedMesh(geo, oldMesh.material);
      skinned.name = oldMesh.name;
      skinned.position.copy(oldMesh.position);
      skinned.quaternion.copy(oldMesh.quaternion);
      skinned.scale.copy(oldMesh.scale);
      skinned.castShadow = oldMesh.castShadow;
      skinned.receiveShadow = oldMesh.receiveShadow;

      const parent = oldMesh.parent;
      if (parent) {
        parent.add(skinned);
        parent.remove(oldMesh);
      }
    }

    skinned.updateMatrixWorld(true);
    skinned.bind(skeleton, skinned.matrixWorld.clone());
    skinnedMeshes.push(skinned);
  }

  const clips = buildClipsForPreset(preset, bonesByName);
  return {
    clips,
    boneCount: bones.length,
    armatureRoot,
    skinnedMeshes,
  };
}
