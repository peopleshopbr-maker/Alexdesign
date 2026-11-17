import * as THREE from 'three';

export type MeshModelingOp =
  | 'inflate'
  | 'deflate'
  | 'smooth'
  | 'twist'
  | 'bend'
  | 'taper'
  | 'mirror_x';

function collectTargetMeshes(root: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.geometry && m.geometry.attributes.position) {
        meshes.push(m);
      }
    }
  });
  return meshes;
}

export function applyMeshModelingOp(
  target: THREE.Object3D | null,
  op: MeshModelingOp,
  strength = 0.25
): boolean {
  if (!target) return false;
  const meshes = collectTargetMeshes(target);
  if (meshes.length === 0) return false;

  for (const mesh of meshes) {
    const geo = mesh.geometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    if (!pos) continue;

    if (!geo.attributes.normal) {
      geo.computeVertexNormals();
    }
    const norm = geo.attributes.normal as THREE.BufferAttribute | undefined;

    geo.computeBoundingBox();
    const bbox = geo.boundingBox ?? new THREE.Box3();
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    bbox.getSize(size);
    bbox.getCenter(center);
    const height = Math.max(size.y, 0.001);

    const count = pos.count;

    if (op === 'inflate' || op === 'deflate') {
      const dir = op === 'inflate' ? 1 : -1;
      const amt = Math.max(size.x, size.y, size.z) * 0.04 * strength * 2 * dir;
      for (let i = 0; i < count; i++) {
        const nx = norm ? norm.getX(i) : 0;
        const ny = norm ? norm.getY(i) : 0;
        const nz = norm ? norm.getZ(i) : 0;
        pos.setXYZ(
          i,
          pos.getX(i) + nx * amt,
          pos.getY(i) + ny * amt,
          pos.getZ(i) + nz * amt
        );
      }
    } else if (op === 'smooth') {
      // Fast local average smoothing toward centroid + neighbor blend
      const factor = Math.min(0.45, Math.max(0.05, strength * 0.35));
      for (let i = 0; i < count; i++) {
        const prev = i > 0 ? i - 1 : count - 1;
        const next = i < count - 1 ? i + 1 : 0;
        const ax = (pos.getX(prev) + pos.getX(next)) * 0.5;
        const ay = (pos.getY(prev) + pos.getY(next)) * 0.5;
        const az = (pos.getZ(prev) + pos.getZ(next)) * 0.5;
        pos.setXYZ(
          i,
          pos.getX(i) + (ax - pos.getX(i)) * factor,
          pos.getY(i) + (ay - pos.getY(i)) * factor,
          pos.getZ(i) + (az - pos.getZ(i)) * factor
        );
      }
    } else if (op === 'twist') {
      const maxAngle = Math.PI * 0.65 * strength;
      for (let i = 0; i < count; i++) {
        const x = pos.getX(i) - center.x;
        const y = pos.getY(i);
        const z = pos.getZ(i) - center.z;
        const t = (y - bbox.min.y) / height;
        const a = (t - 0.5) * maxAngle;
        const c = Math.cos(a);
        const s = Math.sin(a);
        pos.setXYZ(i, center.x + x * c - z * s, y, center.z + x * s + z * c);
      }
    } else if (op === 'bend') {
      const bendAmt = 0.75 * strength;
      for (let i = 0; i < count; i++) {
        const x = pos.getX(i) - center.x;
        const y = pos.getY(i) - bbox.min.y;
        const z = pos.getZ(i);
        const t = y / height;
        const angle = t * bendAmt;
        const nx = x + Math.sin(angle) * height * 0.35 * t;
        const ny = bbox.min.y + y * Math.cos(angle * 0.5);
        pos.setXYZ(i, center.x + nx, ny, z);
      }
    } else if (op === 'taper') {
      const taperAmt = Math.min(0.65, strength * 0.85);
      for (let i = 0; i < count; i++) {
        const x = pos.getX(i) - center.x;
        const y = pos.getY(i);
        const z = pos.getZ(i) - center.z;
        const t = (y - bbox.min.y) / height;
        const scale = Math.max(0.2, 1 - t * taperAmt);
        pos.setXYZ(i, center.x + x * scale, y, center.z + z * scale);
      }
    } else if (op === 'mirror_x') {
      for (let i = 0; i < count; i++) {
        pos.setX(i, -(pos.getX(i) - center.x) + center.x);
      }
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
  }

  return true;
}
