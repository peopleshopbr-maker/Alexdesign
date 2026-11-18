import * as THREE from 'three';

export interface ProceduralIkConfig {
  enabled: boolean;
  headLookAtCamera: boolean;
  footGroundIk: boolean;
  unevenTerrain: boolean;
  ikWeight: number; // 0..1
}

export const DEFAULT_PROCEDURAL_IK: ProceduralIkConfig = {
  enabled: false,
  headLookAtCamera: true,
  footGroundIk: true,
  unevenTerrain: false,
  ikWeight: 0.9,
};

const _raycaster = new THREE.Raycaster();
const _downDir = new THREE.Vector3(0, -1, 0);
const _boneWorldPos = new THREE.Vector3();
const _targetDir = new THREE.Vector3();
const _parentInvQuat = new THREE.Quaternion();
const _localDir = new THREE.Vector3();
const _ikEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _ikQuat = new THREE.Quaternion();

const TERRAIN_NAME = '__alexdesign_ik_terrain__';

export function syncIkUnevenTerrain(scene: THREE.Scene, visible: boolean): THREE.Mesh | null {
  let terrain = scene.getObjectByName(TERRAIN_NAME) as THREE.Mesh | undefined;
  if (!visible) {
    if (terrain) terrain.visible = false;
    return null;
  }
  if (!terrain) {
    const geo = new THREE.PlaneGeometry(10, 10, 40, 40);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z);
      // Smooth hills, ramp & stepped mound for real foot IK testing
      const h =
        Math.sin(x * 0.9) * Math.cos(z * 0.8) * 0.24 +
        Math.max(0, 0.28 - dist * 0.08) * Math.sin(x * 1.6);
      pos.setY(i, Math.max(0, h + 0.08));
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.82,
      metalness: 0.12,
      wireframe: false,
    });
    terrain = new THREE.Mesh(geo, mat);
    terrain.name = TERRAIN_NAME;
    terrain.receiveShadow = true;
    scene.add(terrain);
  }
  terrain.visible = true;
  return terrain;
}

const _restQuatCache = new WeakMap<THREE.Bone, THREE.Quaternion>();

export function applyProceduralIkFrame(
  target: THREE.Object3D | null,
  camera: THREE.Camera,
  scene: THREE.Scene,
  cfg: ProceduralIkConfig,
  animActive = false
): void {
  const terrain = syncIkUnevenTerrain(scene, cfg.enabled && cfg.unevenTerrain);
  if (!target || !cfg.enabled || cfg.ikWeight <= 0.01) return;

  const w = Math.max(0, Math.min(1, cfg.ikWeight));
  target.updateWorldMatrix(true, true);

  let leftFootY = 0;
  let rightFootY = 0;
  let hasLeftHit = false;
  let hasRightHit = false;

  const isLeft = (n: string) =>
    /(^|[^a-z])(left|l_|_l|\.l|l$)/.test(n) || n.includes('left') || n.includes('_l_');
  const isRight = (n: string) =>
    /(^|[^a-z])(right|r_|_r|\.r|r$)/.test(n) || n.includes('right') || n.includes('_r_');

  // 1. Foot Placement IK: Raycast beneath left and right feet onto uneven terrain
  if (cfg.footGroundIk && terrain) {
    target.traverse((obj) => {
      if (!(obj as THREE.Bone).isBone) return;
      const n = obj.name.toLowerCase();
      if (!n.includes('foot') && !n.includes('ankle') && !n.includes('toe')) return;

      obj.getWorldPosition(_boneWorldPos);
      _raycaster.set(new THREE.Vector3(_boneWorldPos.x, _boneWorldPos.y + 1.5, _boneWorldPos.z), _downDir);
      const hits = _raycaster.intersectObject(terrain, false);
      if (hits.length > 0) {
        if (isLeft(n)) {
          leftFootY = hits[0].point.y;
          hasLeftHit = true;
        } else if (isRight(n)) {
          rightFootY = hits[0].point.y;
          hasRightHit = true;
        }
      }
    });

    // Adjust character root elevation to lowest planted foot so neither leg floats
    if (hasLeftHit || hasRightHit) {
      const groundY =
        hasLeftHit && hasRightHit
          ? Math.min(leftFootY, rightFootY)
          : hasLeftHit
            ? leftFootY
            : rightFootY;
      target.position.y = THREE.MathUtils.lerp(target.position.y, groundY, 0.35 * w);
    }
  }

  // 2. Apply Analytical 2-Bone Knee Bend for Foot Height Difference + Head/Eye Look-At IK
  const footDiff = hasLeftHit && hasRightHit ? leftFootY - rightFootY : 0;

  target.traverse((obj) => {
    if (!(obj as THREE.Bone).isBone) return;
    const bone = obj as THREE.Bone;
    if (!_restQuatCache.has(bone)) {
      _restQuatCache.set(bone, bone.quaternion.clone());
    }
    const baseQ = animActive ? bone.quaternion : _restQuatCache.get(bone)!;
    const n = bone.name.toLowerCase();

    // Head / Neck / Eye Look-At IK toward Camera
    if (cfg.headLookAtCamera && (n.includes('head') || n.includes('neck') || n.includes('eye'))) {
      bone.getWorldPosition(_boneWorldPos);
      _targetDir.subVectors(camera.position, _boneWorldPos).normalize();

      if (bone.parent) {
        bone.parent.getWorldQuaternion(_parentInvQuat).invert();
        _localDir.copy(_targetDir).applyQuaternion(_parentInvQuat).normalize();
      } else {
        _localDir.copy(_targetDir);
      }

      const yaw = Math.max(-0.85, Math.min(0.85, Math.atan2(_localDir.x, _localDir.z)));
      const pitch = Math.max(-0.45, Math.min(0.45, -Math.asin(Math.max(-1, Math.min(1, _localDir.y)))));
      const share = n.includes('neck') ? 0.35 : n.includes('eye') ? 0.65 : 0.75;

      _ikEuler.set(pitch * share * w, yaw * share * w, 0, 'YXZ');
      _ikQuat.setFromEuler(_ikEuler);
      const targetQ = baseQ.clone().multiply(_ikQuat);
      bone.quaternion.slerp(targetQ, 0.25);
      return;
    }

    // 2-Bone Foot Grounding IK on Thigh & Knee when standing on sloped/uneven ground
    if (cfg.footGroundIk && Math.abs(footDiff) > 0.015) {
      const raisedLeft = footDiff > 0;
      const isRaisedSide = (raisedLeft && isLeft(n)) || (!raisedLeft && isRight(n));
      if (!isRaisedSide) return;

      const lift = Math.min(0.45, Math.abs(footDiff)) * w;
      if (n.includes('thigh') || n.includes('upleg')) {
        _ikEuler.set(-lift * 1.65, 0, 0, 'XYZ');
        _ikQuat.setFromEuler(_ikEuler);
        const targetQ = baseQ.clone().multiply(_ikQuat);
        bone.quaternion.slerp(targetQ, 0.3);
      } else if (n.includes('shin') || n.includes('calf') || n.includes('lowerleg') || n.includes('knee')) {
        _ikEuler.set(lift * 2.1, 0, 0, 'XYZ');
        _ikQuat.setFromEuler(_ikEuler);
        const targetQ = baseQ.clone().multiply(_ikQuat);
        bone.quaternion.slerp(targetQ, 0.3);
      }
    }
  });
}
