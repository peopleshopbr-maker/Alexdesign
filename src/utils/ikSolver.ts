import * as THREE from 'three';

export type KeyframeInterpolationMode = 'ease' | 'linear' | 'step';
export type WeightBrushMode = 'add' | 'smooth' | 'subtract';

/**
 * Analytical Two-Bone IK Solver (Shoulder -> Elbow -> Wrist / Hip -> Knee -> Ankle)
 * Operates cleanly in world space and converts local quaternions back onto the bone chain.
 */
export function solveTwoBoneIK(
  rootBone: THREE.Bone,
  midBone: THREE.Bone,
  endBone: THREE.Bone,
  targetWorldPos: THREE.Vector3,
  poleHintLocalDir = new THREE.Vector3(0, 0, 1)
): void {
  rootBone.parent?.updateMatrixWorld(true);
  rootBone.updateMatrixWorld(true);

  const rootPos = new THREE.Vector3();
  const midPos = new THREE.Vector3();
  const endPos = new THREE.Vector3();
  rootBone.getWorldPosition(rootPos);
  midBone.getWorldPosition(midPos);
  endBone.getWorldPosition(endPos);

  const lenA = Math.max(0.02, rootPos.distanceTo(midPos));
  const lenB = Math.max(0.02, midPos.distanceTo(endPos));
  const maxReach = (lenA + lenB) * 0.992;
  const minReach = Math.abs(lenA - lenB) + 0.02;

  const toTarget = new THREE.Vector3().subVectors(targetWorldPos, rootPos);
  const rawDist = toTarget.length();
  if (rawDist < 1e-5) return;

  const dist = THREE.MathUtils.clamp(rawDist, minReach, maxReach);
  const targetDir = toTarget.clone().normalize();

  // Compute bend plane normal using current pose + pole hint
  const parentQuat = new THREE.Quaternion();
  rootBone.parent?.getWorldQuaternion(parentQuat);
  const worldPole = poleHintLocalDir.clone().applyQuaternion(parentQuat).normalize();

  const curUpper = new THREE.Vector3().subVectors(midPos, rootPos).normalize();
  const curLower = new THREE.Vector3().subVectors(endPos, midPos).normalize();
  let bendAxis = new THREE.Vector3().crossVectors(curUpper, curLower);
  if (bendAxis.lengthSq() < 1e-5) {
    bendAxis.crossVectors(targetDir, worldPole);
  }
  if (bendAxis.lengthSq() < 1e-5) {
    bendAxis.set(1, 0, 0);
  }
  bendAxis.normalize();

  // Law of cosines for root & mid angles
  const cosRoot = THREE.MathUtils.clamp(
    (lenA * lenA + dist * dist - lenB * lenB) / (2 * lenA * dist),
    -1,
    1
  );
  const angleRoot = Math.acos(cosRoot);

  // Align rootBone so its child (midBone) aims at the desired IK elbow/knee position
  const desiredMidDir = targetDir.clone().applyAxisAngle(bendAxis, angleRoot).normalize();
  const curMidDirWorld = new THREE.Vector3().subVectors(midPos, rootPos).normalize();
  const deltaRootQ = new THREE.Quaternion().setFromUnitVectors(curMidDirWorld, desiredMidDir);

  const rootWorldQ = new THREE.Quaternion();
  rootBone.getWorldQuaternion(rootWorldQ);
  const nextRootWorldQ = deltaRootQ.multiply(rootWorldQ);
  const invParentQ = parentQuat.clone().invert();
  rootBone.quaternion.copy(invParentQ.multiply(nextRootWorldQ)).normalize();
  rootBone.updateMatrixWorld(true);

  // Now align midBone so endBone aims directly toward clamped target point
  rootBone.getWorldPosition(rootPos);
  midBone.getWorldPosition(midPos);
  endBone.getWorldPosition(endPos);

  const clampedTargetWorld = rootPos.clone().addScaledVector(targetDir, dist);
  const curLowerWorld = new THREE.Vector3().subVectors(endPos, midPos).normalize();
  const desiredLowerWorld = new THREE.Vector3().subVectors(clampedTargetWorld, midPos).normalize();

  if (curLowerWorld.lengthSq() > 1e-5 && desiredLowerWorld.lengthSq() > 1e-5) {
    const deltaMidQ = new THREE.Quaternion().setFromUnitVectors(curLowerWorld, desiredLowerWorld);
    const midWorldQ = new THREE.Quaternion();
    midBone.getWorldQuaternion(midWorldQ);
    const nextMidWorldQ = deltaMidQ.multiply(midWorldQ);
    const rootWorldNow = new THREE.Quaternion();
    rootBone.getWorldQuaternion(rootWorldNow);
    midBone.quaternion.copy(rootWorldNow.invert().multiply(nextMidWorldQ)).normalize();
    midBone.updateMatrixWorld(true);
  }
}

/**
 * Enforces ground contact lock on leg chains when Foot-Lock is enabled so pelvis drops don't sink feet below y=0.
 */
export function enforceFloorContactOnLegs(bonesByName: Map<string, THREE.Bone>, minFloorY = 0.05): void {
  const pelvis = bonesByName.get('pelvis');
  if (!pelvis) return;
  const footL = bonesByName.get('foot_L');
  const footR = bonesByName.get('foot_R');
  if (!footL && !footR) return;

  const pL = new THREE.Vector3();
  const pR = new THREE.Vector3();
  let lowestY = Infinity;
  if (footL) {
    footL.getWorldPosition(pL);
    lowestY = Math.min(lowestY, pL.y);
  }
  if (footR) {
    footR.getWorldPosition(pR);
    lowestY = Math.min(lowestY, pR.y);
  }
  if (Number.isFinite(lowestY) && lowestY < minFloorY) {
    const lift = minFloorY - lowestY;
    pelvis.position.y += lift;
    pelvis.updateMatrixWorld(true);
  }
}

/**
 * Retargets an external FBX/GLB AnimationClip (Mixamo, Unity Humanoid, Unreal, Rigify)
 * to the AlexDesign bone names currently active in `targetBoneNames`.
 */
const RETARGET_SYNONYMS: Record<string, string[]> = {
  pelvis: ['hips', 'pelvis', 'root', 'mixamorig:hips', 'mixamorighips', 'bip01_pelvis'],
  spine: ['spine', 'mixamorig:spine', 'mixamorigspine', 'spine_01'],
  spine_01: ['spine', 'spine_01', 'spine1', 'mixamorig:spine', 'mixamorigspine'],
  spine_02: ['spine1', 'spine2', 'spine_02', 'mixamorig:spine1', 'mixamorigspine1'],
  chest: ['spine2', 'chest', 'upperchest', 'mixamorig:spine2', 'mixamorigspine2', 'spine_03'],
  neck: ['neck', 'mixamorig:neck', 'mixamorigneck', 'neck_01'],
  head: ['head', 'mixamorig:head', 'mixamorighead'],
  clavicle_L: ['leftshoulder', 'clavicle_l', 'mixamorig:leftshoulder', 'mixamorigleftshoulder', 'shoulder.l'],
  upper_arm_L: ['leftarm', 'leftupperarm', 'upperarm_l', 'upper_arm_l', 'mixamorig:leftarm', 'mixamorigleftarm', 'upper_arm.l'],
  forearm_L: ['leftforearm', 'leftlowerarm', 'lowerarm_l', 'forearm_l', 'mixamorig:leftforearm', 'mixamorigleftforearm', 'forearm.l'],
  hand_L: ['lefthand', 'hand_l', 'mixamorig:lefthand', 'mixamoriglefthand', 'hand.l'],
  clavicle_R: ['rightshoulder', 'clavicle_r', 'mixamorig:rightshoulder', 'mixamorigrightshoulder', 'shoulder.r'],
  upper_arm_R: ['rightarm', 'rightupperarm', 'upperarm_r', 'upper_arm_r', 'mixamorig:rightarm', 'mixamorigrightarm', 'upper_arm.r'],
  forearm_R: ['rightforearm', 'rightlowerarm', 'lowerarm_r', 'forearm_r', 'mixamorig:rightforearm', 'mixamorigrightforearm', 'forearm.r'],
  hand_R: ['righthand', 'hand_r', 'mixamorig:righthand', 'mixamorigrighthand', 'hand.r'],
  thigh_L: ['leftupleg', 'leftthigh', 'thigh_l', 'mixamorig:leftupleg', 'mixamorigleftupleg', 'thigh.l'],
  shin_L: ['leftleg', 'leftshin', 'leftlowerleg', 'calf_l', 'shin_l', 'mixamorig:leftleg', 'mixamorigleftleg', 'shin.l'],
  foot_L: ['leftfoot', 'foot_l', 'mixamorig:leftfoot', 'mixamorigleftfoot', 'foot.l'],
  thigh_R: ['rightupleg', 'rightthigh', 'thigh_r', 'mixamorig:rightupleg', 'mixamorigrightupleg', 'thigh.r'],
  shin_R: ['rightleg', 'rightshin', 'rightlowerleg', 'calf_r', 'shin_r', 'mixamorig:rightleg', 'mixamorigrightleg', 'shin.r'],
  foot_R: ['rightfoot', 'foot_r', 'mixamorig:rightfoot', 'mixamorigrightfoot', 'foot.r'],
};

export function retargetClipToRig(
  clip: THREE.AnimationClip,
  targetBoneNames: string[]
): THREE.AnimationClip {
  if (targetBoneNames.length === 0) return clip.clone();

  const exactSet = new Set(targetBoneNames);
  const lowerMap = new Map<string, string>();
  targetBoneNames.forEach((b) => lowerMap.set(b.toLowerCase(), b));

  // Reverse synonym lookup: canonical source keyword -> actual rig bone name
  const keywordToTarget = new Map<string, string>();
  for (const targetBone of targetBoneNames) {
    const tLow = targetBone.toLowerCase();
    keywordToTarget.set(tLow, targetBone);
    const syns = RETARGET_SYNONYMS[targetBone];
    if (syns) {
      syns.forEach((s) => keywordToTarget.set(s.toLowerCase(), targetBone));
    }
  }
  // Also fill generic synonym matches for target rigs whose bones follow Mixamo naming
  for (const [, syns] of Object.entries(RETARGET_SYNONYMS)) {
    const matchedTarget = targetBoneNames.find((b) => syns.includes(b.toLowerCase()));
    if (matchedTarget) {
      syns.forEach((s) => {
        if (!keywordToTarget.has(s.toLowerCase())) {
          keywordToTarget.set(s.toLowerCase(), matchedTarget);
        }
      });
    }
  }

  const newTracks: THREE.KeyframeTrack[] = [];
  const usedTrackNames = new Set<string>();

  for (const track of clip.tracks) {
    const dotIdx = track.name.indexOf('.');
    const rawBone = dotIdx >= 0 ? track.name.slice(0, dotIdx) : track.name;
    const prop = dotIdx >= 0 ? track.name.slice(dotIdx) : '';

    let resolvedBone: string | undefined;
    if (exactSet.has(rawBone)) {
      resolvedBone = rawBone;
    } else {
      const stripped = rawBone
        .replace(/^.*\|/, '')
        .replace(/^.*:/, '')
        .toLowerCase();
      resolvedBone =
        lowerMap.get(rawBone.toLowerCase()) ||
        lowerMap.get(stripped) ||
        keywordToTarget.get(rawBone.toLowerCase()) ||
        keywordToTarget.get(stripped);
    }

    if (!resolvedBone) continue;
    const nextName = `${resolvedBone}${prop}`;
    if (usedTrackNames.has(nextName)) continue;
    usedTrackNames.add(nextName);

    const cloned = track.clone();
    cloned.name = nextName;
    newTracks.push(cloned);
  }

  if (newTracks.length === 0) {
    return clip.clone();
  }
  const out = new THREE.AnimationClip(clip.name || 'Imported_Anim', clip.duration, newTracks);
  return out;
}

/**
 * Sets F-Curve interpolation mode across all tracks in an AnimationClip.
 * Maps to Blender Action F-Curve modes:
 * - ease -> BEZIER (THREE.InterpolateSmooth)
 * - linear -> LINEAR (THREE.InterpolateLinear)
 * - step -> CONSTANT (THREE.InterpolateDiscrete)
 */
export function setClipInterpolationMode(
  clip: THREE.AnimationClip,
  mode: KeyframeInterpolationMode
): THREE.AnimationClip {
  const cloned = clip.clone();
  const threeMode =
    mode === 'step'
      ? THREE.InterpolateDiscrete
      : mode === 'linear'
      ? THREE.InterpolateLinear
      : THREE.InterpolateSmooth;

  cloned.tracks.forEach((tr) => {
    tr.setInterpolation(threeMode);
  });
  return cloned;
}

/**
 * Maps a normalized bone weight [0..1] to an industry-standard heatmap color (Blue -> Cyan -> Green -> Yellow -> Red).
 */
export function weightToHeatColor(weight: number, targetColor: THREE.Color): void {
  const w = THREE.MathUtils.clamp(weight, 0, 1);
  if (w < 0.25) {
    const t = w / 0.25;
    targetColor.setRGB(0.05, 0.15 + t * 0.7, 0.95);
  } else if (w < 0.5) {
    const t = (w - 0.25) / 0.25;
    targetColor.setRGB(0.05, 0.85, 0.95 * (1 - t));
  } else if (w < 0.75) {
    const t = (w - 0.5) / 0.25;
    targetColor.setRGB(0.05 + t * 0.92, 0.9, 0.05);
  } else {
    const t = (w - 0.75) / 0.25;
    targetColor.setRGB(0.97, 0.9 - t * 0.82, 0.05);
  }
}

/**
 * Builds or updates vertex `color` attribute heatmap on a SkinnedMesh for the given `boneIndex`.
 */
export function updateMeshWeightHeatmapColors(mesh: THREE.SkinnedMesh, boneIndex: number): void {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const skinIndex = geo.attributes.skinIndex;
  const skinWeight = geo.attributes.skinWeight;
  if (!pos || !skinIndex || !skinWeight) return;

  let colorAttr = geo.attributes.color as THREE.BufferAttribute | undefined;
  if (!colorAttr || colorAttr.count !== pos.count) {
    colorAttr = new THREE.BufferAttribute(new Float32Array(pos.count * 3), 3);
    geo.setAttribute('color', colorAttr);
  }

  const tmpCol = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    let w = 0;
    for (let k = 0; k < 4; k++) {
      const idx =
        k === 0
          ? skinIndex.getX(i)
          : k === 1
          ? skinIndex.getY(i)
          : k === 2
          ? skinIndex.getZ(i)
          : skinIndex.getW(i);
      if (Math.round(idx) === boneIndex) {
        w +=
          k === 0
            ? skinWeight.getX(i)
            : k === 1
            ? skinWeight.getY(i)
            : k === 2
            ? skinWeight.getZ(i)
            : skinWeight.getW(i);
      }
    }
    weightToHeatColor(w, tmpCol);
    colorAttr.setXYZ(i, tmpCol.r, tmpCol.g, tmpCol.b);
  }
  colorAttr.needsUpdate = true;
}

/**
 * Applies a 3D brush stroke ('add' | 'smooth' | 'subtract') to `skinIndex` / `skinWeight`
 * on vertices within `radiusWorld` of `hitWorldPoint` and refreshes vertex heatmap colors.
 */
export function applyWeightPaintStroke(options: {
  mesh: THREE.SkinnedMesh;
  hitWorldPoint: THREE.Vector3;
  boneIndex: number;
  mode: WeightBrushMode;
  radiusWorld: number;
  strength: number;
}): number {
  const { mesh, hitWorldPoint, boneIndex, mode, radiusWorld, strength } = options;
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const skinIndex = geo.attributes.skinIndex as THREE.BufferAttribute | undefined;
  const skinWeight = geo.attributes.skinWeight as THREE.BufferAttribute | undefined;
  if (!pos || !skinIndex || !skinWeight || boneIndex < 0) return 0;

  mesh.updateMatrixWorld(true);
  const invWorld = mesh.matrixWorld.clone().invert();
  const localHit = hitWorldPoint.clone().applyMatrix4(invWorld);

  const scaleFactor = new THREE.Vector3();
  mesh.matrixWorld.decompose(new THREE.Vector3(), new THREE.Quaternion(), scaleFactor);
  const avgScale = Math.max(0.01, (scaleFactor.x + scaleFactor.y + scaleFactor.z) / 3);
  const localRadius = radiusWorld / avgScale;
  const radiusSq = localRadius * localRadius;

  const vPos = new THREE.Vector3();
  const affectedIndices: number[] = [];
  const prevBoneWeights: number[] = new Array(pos.count);

  // First pass: capture weights and find vertices inside brush radius
  for (let i = 0; i < pos.count; i++) {
    let bw = 0;
    for (let k = 0; k < 4; k++) {
      const idx = Math.round(skinIndex.getComponent(i, k));
      if (idx === boneIndex) {
        bw += skinWeight.getComponent(i, k);
      }
    }
    prevBoneWeights[i] = bw;

    vPos.fromBufferAttribute(pos, i);
    if (vPos.distanceToSquared(localHit) <= radiusSq) {
      affectedIndices.push(i);
    }
  }

  if (affectedIndices.length === 0) return 0;

  let smoothAvg = 0;
  if (mode === 'smooth') {
    for (const i of affectedIndices) smoothAvg += prevBoneWeights[i];
    smoothAvg /= affectedIndices.length;
  }

  for (const i of affectedIndices) {
    vPos.fromBufferAttribute(pos, i);
    const dist = vPos.distanceTo(localHit);
    const falloff = 1 - THREE.MathUtils.clamp(dist / Math.max(1e-4, localRadius), 0, 1);
    const alpha = THREE.MathUtils.clamp(strength * falloff, 0.01, 1);

    const curW = prevBoneWeights[i];
    let targetW = curW;
    if (mode === 'add') targetW = Math.min(1, curW + alpha * 0.45);
    else if (mode === 'subtract') targetW = Math.max(0, curW - alpha * 0.45);
    else targetW = THREE.MathUtils.lerp(curW, smoothAvg, alpha * 0.65);

    // Gather the 4 slots
    const slots: { idx: number; w: number }[] = [];
    let boneSlot = -1;
    for (let k = 0; k < 4; k++) {
      const idx = Math.round(skinIndex.getComponent(i, k));
      const w = skinWeight.getComponent(i, k);
      if (idx === boneIndex && boneSlot < 0) {
        boneSlot = k;
      }
      slots.push({ idx, w });
    }

    if (boneSlot < 0) {
      // Replace lowest-weight slot with target boneIndex
      let minSlot = 0;
      for (let k = 1; k < 4; k++) {
        if (slots[k].w < slots[minSlot].w) minSlot = k;
      }
      boneSlot = minSlot;
      slots[boneSlot].idx = boneIndex;
    }

    const otherSum = slots.reduce((acc, s, k) => (k === boneSlot ? acc : acc + s.w), 0);
    const remaining = Math.max(0, 1 - targetW);
    slots[boneSlot].w = targetW;

    if (otherSum > 1e-5) {
      for (let k = 0; k < 4; k++) {
        if (k !== boneSlot) {
          slots[k].w = (slots[k].w / otherSum) * remaining;
        }
      }
    } else if (remaining > 1e-5) {
      // Fall back to pelvis bone 0 for remaining weight
      const fallbackSlot = boneSlot === 0 ? 1 : 0;
      slots[fallbackSlot].idx = 0;
      slots[fallbackSlot].w += remaining;
    }

    // Write back normalized weights
    const normSum = slots[0].w + slots[1].w + slots[2].w + slots[3].w || 1;
    for (let k = 0; k < 4; k++) {
      skinIndex.setComponent(i, k, slots[k].idx);
      skinWeight.setComponent(i, k, slots[k].w / normSum);
    }
  }

  skinIndex.needsUpdate = true;
  skinWeight.needsUpdate = true;
  updateMeshWeightHeatmapColors(mesh, boneIndex);
  return affectedIndices.length;
}
