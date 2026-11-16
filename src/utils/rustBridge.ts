import init, {
  enforce_tpose_symmetry,
  compute_procedural_pose,
  validate_skeleton_bounds,
  audit_uv_islands,
  generate_smart_box_uv,
} from '../wasm/rust_core';

let wasmReady = false;

export type ProceduralClipName = 'idle' | 'walk' | 'run' | 'wave';

const CLIP_MAP: Record<ProceduralClipName, number> = {
  idle: 0,
  walk: 1,
  run: 2,
  wave: 3,
};

export async function ensureRustCore(): Promise<boolean> {
  if (wasmReady) return true;
  try {
    await init();
    wasmReady = true;
    return true;
  } catch (err) {
    console.warn('[RustCore] Fallback para JS ativo:', err);
    return false;
  }
}

export function getRustProceduralPose(clip: ProceduralClipName, timeSec: number) {
  const [spineX, armLZ, armRZ, armRX, legLX, legRX] = compute_procedural_pose(
    CLIP_MAP[clip] ?? 0,
    timeSec
  );
  return { spineX, armLZ, armRZ, armRX, legLX, legRX };
}

export function normalizeSymmetryWithRust(
  left: [number, number, number],
  right: [number, number, number]
) {
  const res = enforce_tpose_symmetry(new Float32Array(left), new Float32Array(right));
  return {
    left: [res[0], res[1], res[2]] as [number, number, number],
    right: [res[3], res[4], res[5]] as [number, number, number],
  };
}

export function isSkeletonValidWithRust(coords: number[]): boolean {
  return validate_skeleton_bounds(new Float32Array(coords));
}

export interface UvAuditReport {
  totalVertices: number;
  outOfBoundsCount: number;
  degenerateTriangles: number;
  atlasCoveragePercent: number;
  isHealthy: boolean;
}

export function auditUvWithRust(uvArray: Float32Array | number[]): UvAuditReport {
  const f32 = uvArray instanceof Float32Array ? uvArray : new Float32Array(uvArray);
  const [totalVertices, outOfBoundsCount, degenerateTriangles, atlasCoveragePercent] =
    audit_uv_islands(f32);

  return {
    totalVertices,
    outOfBoundsCount,
    degenerateTriangles,
    atlasCoveragePercent: Math.round(atlasCoveragePercent * 10) / 10,
    isHealthy: outOfBoundsCount === 0 && degenerateTriangles === 0,
  };
}

export function computeSmartBoxUvWithRust(
  positions: Float32Array,
  normals: Float32Array
): Float32Array {
  return generate_smart_box_uv(positions, normals);
}