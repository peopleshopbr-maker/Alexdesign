import * as THREE from 'three';
import {
  ImportedUvMesh,
  RIG_PRESET_DEFINITIONS,
  RigPreset,
} from '../types/studioConfig';
import { buildActionForgeClipLibrary } from './actionForgeClips';

export {
  ACTIONFORGE_CATEGORY_TABS,
  ACTIONFORGE_CLIPS,
  buildActionForgeClipLibrary,
  compileTimelineStripsToClip,
  lockClipInPlace,
  reverseAnimationClip,
} from './actionForgeClips';
export type {
  ActionForgeCategory,
  ActionForgeClipDef,
  TimelineStripItem,
} from './actionForgeClips';

export type AnimationCategory = 'all' | 'interaction' | 'locomotion' | 'combat' | 'social';
export type BoneMaskRegion = 'full' | 'upper' | 'lower' | 'right_arm' | 'left_arm' | 'head';
export type RigMarkerId =
  | 'chin'
  | 'chest'
  | 'pelvis'
  | 'elbow_L'
  | 'elbow_R'
  | 'wrist_L'
  | 'wrist_R'
  | 'knee_L'
  | 'knee_R'
  | 'ankle_L'
  | 'ankle_R';

export interface RigMarkerDef {
  id: RigMarkerId;
  label: string;
  color: string;
  mirrorPartner?: RigMarkerId;
}

export const RIG_MARKER_DEFS: RigMarkerDef[] = [
  { id: 'chin', label: 'Queixo / Pescoço', color: '#38bdf8' },
  { id: 'chest', label: 'Peito / Clavícula', color: '#f59e0b' },
  { id: 'pelvis', label: 'Pelve / Quadril', color: '#f97316' },
  { id: 'elbow_L', label: 'Cotovelo L', color: '#10b981', mirrorPartner: 'elbow_R' },
  { id: 'elbow_R', label: 'Cotovelo R', color: '#fb7185', mirrorPartner: 'elbow_L' },
  { id: 'wrist_L', label: 'Pulso L', color: '#34d399', mirrorPartner: 'wrist_R' },
  { id: 'wrist_R', label: 'Pulso R', color: '#f43f5e', mirrorPartner: 'wrist_L' },
  { id: 'knee_L', label: 'Joelho L', color: '#60a5fa', mirrorPartner: 'knee_R' },
  { id: 'knee_R', label: 'Joelho R', color: '#c084fc', mirrorPartner: 'knee_L' },
  { id: 'ankle_L', label: 'Tornozelo L', color: '#93c5fd', mirrorPartner: 'ankle_R' },
  { id: 'ankle_R', label: 'Tornozelo R', color: '#d8b4fe', mirrorPartner: 'ankle_L' },
];

export interface ActionForgeClipMeta {
  id: string;
  label: string;
  category: Exclude<AnimationCategory, 'all'>;
  duration: number;
  loop: boolean;
  description: string;
}

export const ACTIONFORGE_CLIP_LIBRARY: ActionForgeClipMeta[] = [
  {
    id: 'chest_open',
    label: 'Abrir Baú',
    category: 'interaction',
    duration: 2.8,
    loop: false,
    description: 'Agacha, estende as mãos à frente, ergue a tampa do baú e observa o conteúdo.',
  },
  {
    id: 'chest_close',
    label: 'Fechar Baú',
    category: 'interaction',
    duration: 2.2,
    loop: false,
    description: 'Pressiona a tampa do baú para baixo com ambas as mãos e retorna à postura ereta.',
  },
  {
    id: 'interact_pickup',
    label: 'Pegar Item',
    category: 'interaction',
    duration: 2.2,
    loop: false,
    description: 'Flexiona os joelhos e recolhe um objeto do chão com a mão direita.',
  },
  {
    id: 'push_heavy',
    label: 'Empurrar Caixa',
    category: 'interaction',
    duration: 2.0,
    loop: true,
    description: 'Ciclo de força inclinando o tronco para frente com braços estendidos.',
  },
  {
    id: 'idle',
    label: 'Idle / Respiração',
    category: 'locomotion',
    duration: 2.5,
    loop: true,
    description: 'Respiração sutil, giro leve de cabeça e balanço relaxado dos braços.',
  },
  {
    id: 'walk',
    label: 'Caminhada',
    category: 'locomotion',
    duration: 2.4,
    loop: true,
    description: 'Ciclo contínuo de marcha bípede com torção pélvica e contrabalanço de braços.',
  },
  {
    id: 'run',
    label: 'Corrida',
    category: 'locomotion',
    duration: 1.3,
    loop: true,
    description: 'Passada atlética inclinada à frente com joelhos altos e cotovelos flexionados.',
  },
  {
    id: 'jump',
    label: 'Salto',
    category: 'locomotion',
    duration: 1.6,
    loop: false,
    description: 'Impulso com agachamento de antecipação, voo estendido e aterrissagem amortecida.',
  },
  {
    id: 'dodge_roll',
    label: 'Esquiva',
    category: 'locomotion',
    duration: 1.5,
    loop: false,
    description: 'Inclinação rápida e rolamento defensivo para desviar de impactos.',
  },
  {
    id: 'slash_attack',
    label: 'Ataque Espada',
    category: 'combat',
    duration: 1.5,
    loop: false,
    description: 'Preparação com torção de tronco e corte diagonal rápido com o braço direito.',
  },
  {
    id: 'block_shield',
    label: 'Defesa Escudo',
    category: 'combat',
    duration: 1.8,
    loop: true,
    description: 'Postura baixa defensiva com antebraço esquerdo erguido à frente do peito.',
  },
  {
    id: 'victory_cheer',
    label: 'Vitória',
    category: 'combat',
    duration: 2.2,
    loop: false,
    description: 'Ergue ambos os braços em comemoração com pequeno salto triunfante.',
  },
  {
    id: 'wave',
    label: 'Acenar',
    category: 'social',
    duration: 2.4,
    loop: true,
    description: 'Levanta o braço direito e acena amigavelmente inclinando a cabeça.',
  },
  {
    id: 'sit_chair',
    label: 'Sentar',
    category: 'social',
    duration: 2.0,
    loop: false,
    description: 'Flexiona quadris e joelhos em 90 graus para pose sentada.',
  },
];

export const BONE_MASK_OPTIONS: { id: BoneMaskRegion; label: string }[] = [
  { id: 'full', label: 'Corpo Inteiro' },
  { id: 'upper', label: 'Parte Superior (Torso + Braços)' },
  { id: 'lower', label: 'Parte Inferior (Pelve + Pernas)' },
  { id: 'right_arm', label: 'Somente Braço Direito' },
  { id: 'left_arm', label: 'Somente Braço Esquerdo' },
  { id: 'head', label: 'Somente Cabeça & Pescoço' },
];

export interface RigPostureOffsets {
  spineBendDeg: number;
  pelvisHeight: number;
  armSpreadDeg: number;
}

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

/**
 * Generates clean box-projected UV0 coordinates in [0, 1] silently on import if missing.
 */
export function autoGenerateUvsForGroup(group: THREE.Object3D): ImportedUvMesh[] {
  group.updateMatrixWorld(true);
  const results: ImportedUvMesh[] = [];
  const meshes: THREE.Mesh[] = [];

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
        return;
      }
      meshes.push(m);
    }
  });

  if (meshes.length === 0) return results;

  const gridCols = Math.ceil(Math.sqrt(meshes.length));
  const cellSpan = 1 / gridCols;
  const pad = cellSpan * 0.06;
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
    for (let t = 0; t < triCount; t++) {
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

    results.push({
      name: mesh.name || `Malha_${meshIdx + 1}`,
      uvEdges: new Float32Array(0),
      triCount,
      sourceType: 'auto',
    });
  });

  return results;
}

function measureGroupBox(group: THREE.Group): THREE.Box3 {
  group.updateMatrixWorld(true);
  const groupInvWorld = group.matrixWorld.clone().invert();
  const box = new THREE.Box3();
  const vTmp = new THREE.Vector3();

  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
        return;
      }
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
  return box;
}

/**
 * Computes anatomical marker positions in group-local space fitted to `group`.
 */
export function computeDefaultRigMarkers(group: THREE.Group): Record<RigMarkerId, THREE.Vector3> {
  const box = measureGroupBox(group);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  // If this is the AlexDesign composite mannequin (named parts), fit markers directly to limb centers
  const bracoL = group.getObjectByName('Braco_L');
  const anteL = group.getObjectByName('Antebraco_L');
  const maoL = group.getObjectByName('Mao_L');
  const bracoR = group.getObjectByName('Braco_R');
  const anteR = group.getObjectByName('Antebraco_R');
  const maoR = group.getObjectByName('Mao_R');
  const pernaL = group.getObjectByName('Perna_L');
  const botaL = group.getObjectByName('Bota_L');
  const pernaR = group.getObjectByName('Perna_R');
  const botaR = group.getObjectByName('Bota_R');
  const pelve = group.getObjectByName('Pelve');
  const torso = group.getObjectByName('Torso');
  const cabeca = group.getObjectByName('Cabeca');

  if (bracoL && anteL && maoL && bracoR && anteR && maoR && pernaL && pernaR) {
    const midPt = (a: THREE.Object3D, b: THREE.Object3D) =>
      a.position.clone().lerp(b.position, 0.5);
    const pelvisY = pelve ? pelve.position.y : box.min.y + size.y * 0.51;
    const chestY = torso ? torso.position.y + 0.14 : box.min.y + size.y * 0.72;
    const chinY = cabeca ? cabeca.position.y - 0.14 : box.min.y + size.y * 0.83;

    return {
      chin: new THREE.Vector3(center.x, chinY, center.z),
      chest: new THREE.Vector3(center.x, chestY, center.z),
      pelvis: new THREE.Vector3(center.x, pelvisY, center.z),
      elbow_L: midPt(bracoL, anteL),
      elbow_R: midPt(bracoR, anteR),
      wrist_L: maoL.position.clone(),
      wrist_R: maoR.position.clone(),
      knee_L: new THREE.Vector3(pernaL.position.x, pernaL.position.y, pernaL.position.z + 0.015),
      knee_R: new THREE.Vector3(pernaR.position.x, pernaR.position.y, pernaR.position.z + 0.015),
      ankle_L: new THREE.Vector3(
        botaL ? botaL.position.x : pernaL.position.x,
        botaL ? botaL.position.y + 0.06 : box.min.y + 0.11,
        0
      ),
      ankle_R: new THREE.Vector3(
        botaR ? botaR.position.x : pernaR.position.x,
        botaR ? botaR.position.y + 0.06 : box.min.y + 0.11,
        0
      ),
    };
  }

  const minY = box.min.y;
  const h = Math.max(size.y, 0.5);
  const halfW = Math.max(size.x * 0.34, 0.22);
  const hipW = Math.max(size.x * 0.14, 0.09);

  return {
    chin: new THREE.Vector3(center.x, minY + h * 0.83, center.z + 0.02),
    chest: new THREE.Vector3(center.x, minY + h * 0.72, center.z),
    pelvis: new THREE.Vector3(center.x, minY + h * 0.51, center.z),
    elbow_L: new THREE.Vector3(center.x + halfW * 0.78, minY + h * 0.69, center.z),
    elbow_R: new THREE.Vector3(center.x - halfW * 0.78, minY + h * 0.69, center.z),
    wrist_L: new THREE.Vector3(center.x + halfW * 1.15, minY + h * 0.54, center.z + 0.03),
    wrist_R: new THREE.Vector3(center.x - halfW * 1.15, minY + h * 0.54, center.z + 0.03),
    knee_L: new THREE.Vector3(center.x + hipW, minY + h * 0.28, center.z + 0.02),
    knee_R: new THREE.Vector3(center.x - hipW, minY + h * 0.28, center.z + 0.02),
    ankle_L: new THREE.Vector3(center.x + hipW, minY + h * 0.05, center.z),
    ankle_R: new THREE.Vector3(center.x - hipW, minY + h * 0.05, center.z),
  };
}

/**
 * Filters an AnimationClip so only tracks belonging to `mask` remain (ActionForge Layering).
 */
export function filterClipByBoneMask(
  clip: THREE.AnimationClip,
  mask: BoneMaskRegion
): THREE.AnimationClip {
  if (mask === 'full') return clip.clone();

  const matchesBone = (trackName: string): boolean => {
    const boneName = trackName.split('.')[0];
    if (mask === 'upper') {
      return (
        boneName.startsWith('spine') ||
        boneName === 'chest' ||
        boneName === 'neck' ||
        boneName === 'head' ||
        boneName === 'hair_dyn' ||
        boneName.includes('clavicle') ||
        boneName.includes('upper_arm') ||
        boneName.includes('forearm') ||
        boneName.includes('hand')
      );
    }
    if (mask === 'lower') {
      return (
        boneName === 'pelvis' ||
        boneName.includes('thigh') ||
        boneName.includes('shin') ||
        boneName.includes('foot') ||
        boneName.includes('hind') ||
        boneName.includes('paw') ||
        boneName.includes('tail')
      );
    }
    if (mask === 'right_arm') {
      return (
        boneName === 'clavicle_R' ||
        boneName === 'upper_arm_R' ||
        boneName === 'forearm_R' ||
        boneName === 'hand_R'
      );
    }
    if (mask === 'left_arm') {
      return (
        boneName === 'clavicle_L' ||
        boneName === 'upper_arm_L' ||
        boneName === 'forearm_L' ||
        boneName === 'hand_L'
      );
    }
    if (mask === 'head') {
      return boneName === 'neck' || boneName === 'head' || boneName === 'hair_dyn';
    }
    return true;
  };

  const filteredTracks = clip.tracks.filter((t) => matchesBone(t.name)).map((t) => t.clone());
  return new THREE.AnimationClip(`${clip.name}_${mask}`, clip.duration, filteredTracks);
}

/**
 * Mirrors L/R tracks on an AnimationClip (ActionForge Symmetry Mirror).
 */
export function mirrorClipLeftRight(clip: THREE.AnimationClip): THREE.AnimationClip {
  const mirroredTracks = clip.tracks.map((track) => {
    const cloned = track.clone();
    const dotIdx = cloned.name.indexOf('.');
    const boneName = dotIdx >= 0 ? cloned.name.slice(0, dotIdx) : cloned.name;
    const prop = dotIdx >= 0 ? cloned.name.slice(dotIdx) : '';

    let swappedBone = boneName;
    if (boneName.endsWith('_L')) swappedBone = `${boneName.slice(0, -2)}_R`;
    else if (boneName.endsWith('_R')) swappedBone = `${boneName.slice(0, -2)}_L`;
    cloned.name = `${swappedBone}${prop}`;

    if (prop === '.quaternion') {
      const vals = cloned.values;
      for (let i = 0; i < vals.length; i += 4) {
        vals[i + 1] = -vals[i + 1];
        vals[i + 2] = -vals[i + 2];
      }
    } else if (prop === '.position') {
      const vals = cloned.values;
      for (let i = 0; i < vals.length; i += 3) {
        vals[i] = -vals[i];
      }
    }
    return cloned;
  });
  return new THREE.AnimationClip(`${clip.name}_Mirror`, clip.duration, mirroredTracks);
}

export interface AutoRigResult {
  clips: THREE.AnimationClip[];
  boneCount: number;
  armatureRoot: THREE.Group;
  skeleton: THREE.Skeleton;
  bones: THREE.Bone[];
  skinnedMeshes: THREE.SkinnedMesh[];
}

export function removeAutoRigFromGroup(group: THREE.Group): number {
  const prevArmature = group.getObjectByName('AutoRig_Armature');
  if (prevArmature) {
    group.remove(prevArmature);
  }
  let reverted = 0;
  const skinnedList: THREE.SkinnedMesh[] = [];
  group.traverse((obj) => {
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      skinnedList.push(obj as THREE.SkinnedMesh);
    }
  });
  for (const sm of skinnedList) {
    sm.skeleton?.pose();
    const mesh = new THREE.Mesh(sm.geometry, sm.material);
    mesh.name = sm.name;
    mesh.position.copy(sm.position);
    mesh.quaternion.copy(sm.quaternion);
    mesh.scale.copy(sm.scale);
    mesh.castShadow = sm.castShadow;
    mesh.receiveShadow = sm.receiveShadow;
    mesh.userData = { ...sm.userData };
    mesh.geometry.deleteAttribute('skinIndex');
    mesh.geometry.deleteAttribute('skinWeight');
    if (sm.parent) {
      sm.parent.add(mesh);
      sm.parent.remove(sm);
      reverted += 1;
    }
  }
  return reverted;
}

/**
 * Automatically builds a Three.js Skeleton fitted to `group` (and optional custom 3D markers),
 * computes side-aware vertex weights, converts meshes to SkinnedMeshes,
 * and generates the full ActionForge AnimationClip library (`chest_open`, `walk`, `run`, etc.).
 */
export function autoRigAndAnimateGroup(
  group: THREE.Group,
  preset: RigPreset,
  customMarkers?: Partial<Record<RigMarkerId, THREE.Vector3>>
): AutoRigResult {
  group.traverse((obj) => {
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
      (obj as THREE.SkinnedMesh).skeleton?.pose();
    }
  });

  const prevArmature = group.getObjectByName('AutoRig_Armature');
  if (prevArmature) {
    group.remove(prevArmature);
  }

  group.updateMatrixWorld(true);
  const groupInvWorld = group.matrixWorld.clone().invert();
  const box = measureGroupBox(group);
  const targetMeshes: THREE.Mesh[] = [];
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.material instanceof THREE.MeshBasicMaterial && m.material.side === THREE.BackSide && !m.name) {
        return;
      }
      targetMeshes.push(m);
    }
  });

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const def = RIG_PRESET_DEFINITIONS[preset] || RIG_PRESET_DEFINITIONS.HUMANOIDE;

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

  // Compute bone head/tail in group space, overridden by custom ActionForge markers when present
  const resolvedHead = new Map<string, THREE.Vector3>();
  const resolvedTail = new Map<string, THREE.Vector3>();
  for (const [bName] of def.bones) {
    resolvedHead.set(bName, mapToGroupSpace(headPositions.get(bName)!));
    resolvedTail.set(bName, mapToGroupSpace(tailPositions.get(bName)!));
  }

  const effectiveMarkers =
    customMarkers ??
    (preset !== 'QUADRUPEDE' && group.getObjectByName('Braco_L') && group.getObjectByName('Perna_L')
      ? computeDefaultRigMarkers(group)
      : undefined);

  if (effectiveMarkers && preset !== 'QUADRUPEDE') {
    const m = effectiveMarkers;
    const setPair = (name: string, h?: THREE.Vector3, t?: THREE.Vector3) => {
      if (h) resolvedHead.set(name, h.clone());
      if (t) resolvedTail.set(name, t.clone());
    };
    const pelvisP = m.pelvis;
    const chestP = m.chest;
    const chinP = m.chin;

    if (pelvisP) {
      resolvedHead.set('pelvis', pelvisP.clone());
    }
    if (pelvisP && chestP) {
      resolvedTail.set('pelvis', pelvisP.clone().lerp(chestP, 0.32));
      setPair('spine_01', pelvisP.clone().lerp(chestP, 0.32), pelvisP.clone().lerp(chestP, 0.65));
      setPair('spine_02', pelvisP.clone().lerp(chestP, 0.65), chestP.clone());
      setPair('spine', pelvisP.clone().lerp(chestP, 0.35), chestP.clone());
      setPair('chest', chestP.clone(), chinP ?? chestP.clone().add(new THREE.Vector3(0, 0.14, 0)));
    }
    if (chinP) {
      setPair('neck', chestP ? chestP.clone().lerp(chinP, 0.55) : chinP.clone(), chinP.clone());
      setPair('head', chinP.clone(), new THREE.Vector3(chinP.x, box.max.y, chinP.z));
      setPair(
        'hair_dyn',
        new THREE.Vector3(chinP.x, Math.min(box.max.y - 0.04, chinP.y + 0.22), chinP.z - 0.07),
        new THREE.Vector3(chinP.x, chinP.y + 0.04, chinP.z - 0.15)
      );
    }

    const bindArmSide = (side: 'L' | 'R') => {
      const shoulderOrigin = chestP
        ? chestP.clone().add(new THREE.Vector3(side === 'L' ? 0.18 : -0.18, 0.04, 0))
        : resolvedHead.get(`upper_arm_${side}`);
      const elbowP = m[`elbow_${side}`];
      const wristP = m[`wrist_${side}`];
      if (chestP && elbowP) {
        const clavEnd = shoulderOrigin ?? chestP.clone().lerp(elbowP, 0.35);
        setPair(`clavicle_${side}`, chestP.clone(), clavEnd);
        setPair(`upper_arm_${side}`, clavEnd, elbowP);
      } else if (elbowP) {
        resolvedTail.set(`upper_arm_${side}`, elbowP.clone());
      }
      if (elbowP && wristP) {
        setPair(`forearm_${side}`, elbowP, wristP);
        const dir = wristP.clone().sub(elbowP).normalize().multiplyScalar(0.11);
        setPair(`hand_${side}`, wristP, wristP.clone().add(dir));
      }
    };

    const bindLegSide = (side: 'L' | 'R') => {
      const kneeP = m[`knee_${side}`];
      const ankleP = m[`ankle_${side}`];
      const hipAnchor =
        pelvisP && kneeP
          ? new THREE.Vector3(kneeP.x, pelvisP.y - 0.02, pelvisP.z)
          : resolvedHead.get(`thigh_${side}`);
      if (hipAnchor && kneeP) {
        setPair(`thigh_${side}`, hipAnchor, kneeP);
      }
      if (kneeP && ankleP) {
        setPair(`shin_${side}`, kneeP, ankleP);
        setPair(`foot_${side}`, ankleP, new THREE.Vector3(ankleP.x, box.min.y, ankleP.z + 0.14));
      }
    };

    bindArmSide('L');
    bindArmSide('R');
    bindLegSide('L');
    bindLegSide('R');
  }

  const armatureRoot = new THREE.Group();
  armatureRoot.name = 'AutoRig_Armature';
  group.add(armatureRoot);

  const bones: THREE.Bone[] = [];
  const bonesByName = new Map<string, THREE.Bone>();
  const worldSegments: { index: number; name: string; head: THREE.Vector3; tail: THREE.Vector3 }[] = [];

  for (const [bName, parentName] of def.bones) {
    const hGroup = resolvedHead.get(bName)!;
    const tGroup = resolvedTail.get(bName)!;

    const bone = new THREE.Bone();
    bone.name = bName;

    const parentBone = parentName ? bonesByName.get(parentName) : undefined;
    if (parentBone) {
      const parentHGroup = resolvedHead.get(parentName!)!;
      bone.position.copy(hGroup).sub(parentHGroup);
      parentBone.add(bone);
    } else {
      bone.position.copy(hGroup);
      armatureRoot.add(bone);
    }

    worldSegments.push({ index: bones.length, name: bName, head: hGroup, tail: tGroup });
    bones.push(bone);
    bonesByName.set(bName, bone);
  }

  group.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();

  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const vTmp = new THREE.Vector3();
  const scratchAb = new THREE.Vector3();
  const scratchAp = new THREE.Vector3();

  for (const oldMesh of targetMeshes) {
    const geo = oldMesh.geometry;
    if (!geo || !geo.attributes.position) continue;

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
      const sideOffset = vTmp.x - center.x;
      bestIdx.fill(0);
      bestW.fill(0);

      for (let b = 0; b < worldSegments.length; b++) {
        const seg = worldSegments[b];
        const dSq = distToSegmentSq(vTmp, seg.head, seg.tail, scratchAb, scratchAp);
        let sidePenalty = 1;
        if (seg.name.endsWith('_L') && sideOffset < -0.025) sidePenalty = 0.04;
        else if (seg.name.endsWith('_R') && sideOffset > 0.025) sidePenalty = 0.04;

        const w = sidePenalty / Math.pow(dSq + 0.0009, 2.4);

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
      skinned.userData = { ...oldMesh.userData };

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

  const clips = buildActionForgeClipLibrary(preset, bonesByName);
  return {
    clips,
    boneCount: bones.length,
    armatureRoot,
    skeleton,
    bones,
    skinnedMeshes,
  };
}
