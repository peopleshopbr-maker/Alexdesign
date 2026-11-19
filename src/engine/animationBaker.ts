import * as THREE from 'three';

export interface BakeClipOptions {
  clipName: string;
  durationSec?: number;
  fps?: number;
  stepPose: (timeSec: number) => void;
}

/**
 * Samples a Three.js Object3D hierarchy (root + bones) over time using `stepPose(t)`
 * and produces a native `THREE.AnimationClip` compatible with `GLTFExporter` -> Blender 3.5+ Actions.
 */
export function bakeProceduralActionClip(
  root: THREE.Object3D,
  options: BakeClipOptions
): THREE.AnimationClip {
  const fps = Math.max(12, Math.min(60, options.fps ?? 24));
  const duration = Math.max(0.5, options.durationSec ?? 2.0);
  const frameCount = Math.max(2, Math.round(duration * fps));

  // Collect root + all named bones so Blender 3.5+ receives both Root Motion & Armature keyframes
  const targets: THREE.Object3D[] = [root];
  const seen = new Set<string>();
  if (!root.name) root.name = 'CharacterRoot';
  seen.add(root.name);

  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) {
      if (!obj.name) obj.name = `Bone_${targets.length}`;
      if (!seen.has(obj.name)) {
        seen.add(obj.name);
        targets.push(obj);
      }
    }
  });

  // Save initial transforms to restore cleanly after baking
  const saved = targets.map((obj) => ({
    obj,
    pos: obj.position.clone(),
    quat: obj.quaternion.clone(),
  }));

  const times: number[] = [];
  const posBuffers: number[][] = targets.map(() => []);
  const quatBuffers: number[][] = targets.map(() => []);

  for (let i = 0; i <= frameCount; i++) {
    const t = (i / frameCount) * duration;
    times.push(t);
    options.stepPose(t);
    root.updateMatrixWorld(true);

    for (let j = 0; j < targets.length; j++) {
      const obj = targets[j];
      posBuffers[j].push(obj.position.x, obj.position.y, obj.position.z);
      quatBuffers[j].push(obj.quaternion.x, obj.quaternion.y, obj.quaternion.z, obj.quaternion.w);
    }
  }

  // Restore original pose
  for (const s of saved) {
    s.obj.position.copy(s.pos);
    s.obj.quaternion.copy(s.quat);
  }
  root.updateMatrixWorld(true);

  const tracks: THREE.KeyframeTrack[] = [];
  for (let j = 0; j < targets.length; j++) {
    const name = targets[j].name;
    // Root gets both position (Root Motion) and rotation; bones get rotation keyframes
    if (j === 0) {
      tracks.push(new THREE.VectorKeyframeTrack(`${name}.position`, times, posBuffers[j]));
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, quatBuffers[j]));
  }

  const safeName = (options.clipName || 'ActionForge_Baked').replace(/[^\w\-]/g, '_');
  return new THREE.AnimationClip(safeName, duration, tracks);
}
