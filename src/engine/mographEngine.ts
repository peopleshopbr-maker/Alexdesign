import * as THREE from 'three';

export type MoGraphClonerMode = 'radial' | 'grid' | 'helix';
export type MoGraphEffectorType = 'wave' | 'spiral' | 'fracture' | 'pulse';

export interface MoGraphConfig {
  active: boolean;
  clonerMode: MoGraphClonerMode;
  effector: MoGraphEffectorType;
  count: number;
  spacing: number;
  amplitude: number;
  speed: number;
}

export const DEFAULT_MOGRAPH_CONFIG: MoGraphConfig = {
  active: false,
  clonerMode: 'radial',
  effector: 'wave',
  count: 16,
  spacing: 1.6,
  amplitude: 0.45,
  speed: 1.6,
};

export interface MoGraphCloneEntry {
  mesh: THREE.Mesh;
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  index: number;
  total: number;
}

export function buildMoGraphClones(
  group: THREE.Group,
  sourceMesh: THREE.Mesh | null,
  cfg: MoGraphConfig
): MoGraphCloneEntry[] {
  // Dispose previous clones cleanly
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
  }

  const count = Math.max(3, Math.min(48, Math.round(cfg.count)));
  const entries: MoGraphCloneEntry[] = [];

  const baseGeo = sourceMesh
    ? sourceMesh.geometry
    : new THREE.BoxGeometry(0.28, 0.28, 0.28);

  const baseMat =
    sourceMesh && !Array.isArray(sourceMesh.material)
      ? sourceMesh.material
      : new THREE.MeshPhysicalMaterial({
          color: 0xf97316,
          roughness: 0.25,
          metalness: 0.72,
          clearcoat: 0.6,
        });

  // Compute normalize scale if cloning a large imported mesh
  let cloneScale = 1;
  if (sourceMesh) {
    sourceMesh.geometry.computeBoundingBox();
    const size = new THREE.Vector3();
    sourceMesh.geometry.boundingBox?.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.01);
    cloneScale = Math.min(0.45, 0.36 / maxDim);
  }

  const gridSide = Math.ceil(Math.sqrt(count));

  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(baseGeo, baseMat);
    mesh.name = `MoGraph_Clone_${String(i + 1).padStart(2, '0')}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.scale.setScalar(cloneScale);

    const basePos = new THREE.Vector3();
    const baseRot = new THREE.Euler();

    if (cfg.clonerMode === 'radial') {
      const angle = (i / count) * Math.PI * 2;
      basePos.set(Math.cos(angle) * cfg.spacing, 0.45, Math.sin(angle) * cfg.spacing);
      baseRot.set(0, -angle, 0);
    } else if (cfg.clonerMode === 'grid') {
      const gx = i % gridSide;
      const gz = Math.floor(i / gridSide);
      const step = Math.max(0.35, cfg.spacing * 0.42);
      const offset = ((gridSide - 1) * step) * 0.5;
      basePos.set(gx * step - offset, 0.45, gz * step - offset);
    } else {
      // Helix / Espiral
      const t = i / Math.max(1, count - 1);
      const angle = t * Math.PI * 4;
      const r = cfg.spacing * (0.45 + 0.55 * t);
      basePos.set(Math.cos(angle) * r, 0.2 + t * 1.9, Math.sin(angle) * r);
      baseRot.set(0, -angle, 0);
    }

    mesh.position.copy(basePos);
    mesh.rotation.copy(baseRot);
    mesh.userData.baseCloneScale = cloneScale;
    group.add(mesh);

    entries.push({ mesh, basePos, baseRot, index: i, total: count });
  }

  return entries;
}

export function updateMoGraphEffectorFrame(
  entries: MoGraphCloneEntry[],
  cfg: MoGraphConfig,
  timeSec: number
): void {
  if (!cfg.active || entries.length === 0) return;

  const t = timeSec * cfg.speed;
  const amp = cfg.amplitude;

  for (const e of entries) {
    const phase = (e.index / Math.max(1, e.total)) * Math.PI * 2;
    const baseScale = (e.mesh.userData.baseCloneScale as number) || 1;

    if (cfg.effector === 'wave') {
      const wave = Math.sin(t * 2.2 + phase);
      e.mesh.position.set(e.basePos.x, e.basePos.y + wave * amp, e.basePos.z);
      e.mesh.rotation.set(e.baseRot.x + wave * 0.35 * amp, e.baseRot.y, e.baseRot.z);
      const s = baseScale * (1 + wave * 0.22 * amp);
      e.mesh.scale.setScalar(Math.max(0.05, s));
    } else if (cfg.effector === 'spiral') {
      const spin = t * 1.4 + phase;
      e.mesh.position.set(
        e.basePos.x,
        e.basePos.y + Math.sin(spin) * amp * 0.65,
        e.basePos.z
      );
      e.mesh.rotation.set(e.baseRot.x + spin * 0.5, e.baseRot.y + spin, e.baseRot.z);
      e.mesh.scale.setScalar(baseScale);
    } else if (cfg.effector === 'fracture') {
      // Radial Voronoi-style fracture burst & reassemble
      const burst = (Math.sin(t * 1.6) * 0.5 + 0.5) * amp * 1.6;
      const dirX = e.basePos.x || Math.cos(phase);
      const dirZ = e.basePos.z || Math.sin(phase);
      const len = Math.hypot(dirX, dirZ) || 1;
      e.mesh.position.set(
        e.basePos.x + (dirX / len) * burst,
        e.basePos.y + Math.abs(Math.sin(phase * 3)) * burst * 0.9,
        e.basePos.z + (dirZ / len) * burst
      );
      e.mesh.rotation.set(
        e.baseRot.x + burst * 1.4 * Math.sin(phase),
        e.baseRot.y + burst * 1.8,
        e.baseRot.z + burst * 1.1 * Math.cos(phase)
      );
      e.mesh.scale.setScalar(baseScale * Math.max(0.25, 1 - burst * 0.18));
    } else {
      // Pulse
      const p = Math.sin(t * 3.0 - phase * 1.5);
      const s = baseScale * (0.72 + (p * 0.5 + 0.5) * (0.55 + amp * 0.6));
      e.mesh.position.copy(e.basePos);
      e.mesh.rotation.set(e.baseRot.x, e.baseRot.y + t * 0.8, e.baseRot.z);
      e.mesh.scale.setScalar(Math.max(0.05, s));
    }
  }
}
