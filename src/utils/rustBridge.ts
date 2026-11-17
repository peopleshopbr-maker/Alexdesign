export type ProceduralClipName = 'idle' | 'walk' | 'run' | 'wave';

export interface UvAuditReport {
  totalVertices: number;
  outOfBoundsCount: number;
  degenerateTriangles: number;
  atlasCoveragePercent: number;
  isHealthy: boolean;
}

export async function ensureRustCore(): Promise<boolean> {
  return true;
}

export function getRustProceduralPose(clip: ProceduralClipName, timeSec: number) {
  switch (clip) {
    case 'walk': {
      const swing = Math.sin(timeSec * 5.0) * 0.45;
      return {
        spineX: 0.04,
        armLZ: 1.25 - swing,
        armRZ: -1.25 - swing,
        armRX: 0,
        legLX: swing,
        legRX: -swing,
      };
    }
    case 'run': {
      const swing = Math.sin(timeSec * 8.5) * 0.72;
      return {
        spineX: 0.14,
        armLZ: 1.1 - swing,
        armRZ: -1.1 - swing,
        armRX: 0,
        legLX: swing,
        legRX: -swing,
      };
    }
    case 'wave': {
      const wave = Math.sin(timeSec * 6.0) * 0.35;
      return {
        spineX: 0.02,
        armLZ: 1.32,
        armRZ: -0.35 + wave,
        armRX: -0.4,
        legLX: 0,
        legRX: 0,
      };
    }
    case 'idle':
    default: {
      const breathe = Math.sin(timeSec * 2.2) * 0.03;
      return {
        spineX: breathe,
        armLZ: 1.28 + breathe,
        armRZ: -1.28 - breathe,
        armRX: 0,
        legLX: 0,
        legRX: 0,
      };
    }
  }
}

export function normalizeSymmetryWithRust(
  left: [number, number, number],
  right: [number, number, number]
) {
  const avgX = (Math.abs(left[0]) + Math.abs(right[0])) * 0.5;
  const avgY = (left[1] + right[1]) * 0.5;
  const avgZ = (left[2] + right[2]) * 0.5;
  return {
    left: [-avgX, avgY, avgZ] as [number, number, number],
    right: [avgX, avgY, avgZ] as [number, number, number],
  };
}

export function isSkeletonValidWithRust(coords: number[]): boolean {
  if (coords.length === 0) return false;
  for (let i = 0; i < coords.length; i++) {
    const v = coords[i];
    if (!Number.isFinite(v) || Math.abs(v) > 1000) {
      return false;
    }
  }
  return true;
}

export function auditUvWithRust(uvArray: Float32Array | number[]): UvAuditReport {
  const f32 = uvArray instanceof Float32Array ? uvArray : new Float32Array(uvArray);
  const totalVertices = Math.floor(f32.length / 2);
  let outOfBoundsCount = 0;
  let degenerateTriangles = 0;
  let totalArea = 0;

  for (let i = 0; i < totalVertices; i++) {
    const u = f32[i * 2];
    const v = f32[i * 2 + 1];
    if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1) {
      outOfBoundsCount++;
    }
  }

  const triCount = Math.floor(totalVertices / 3);
  for (let t = 0; t < triCount; t++) {
    const base = t * 6;
    const u0 = f32[base];
    const v0 = f32[base + 1];
    const u1 = f32[base + 2];
    const v1 = f32[base + 3];
    const u2 = f32[base + 4];
    const v2 = f32[base + 5];
    const area = Math.abs((u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)) * 0.5;
    if (area < 1e-8) {
      degenerateTriangles++;
    } else {
      totalArea += area;
    }
  }

  const atlasCoveragePercent = Math.min(100, Math.round(totalArea * 1000) / 10);

  return {
    totalVertices,
    outOfBoundsCount,
    degenerateTriangles,
    atlasCoveragePercent,
    isHealthy: outOfBoundsCount === 0 && degenerateTriangles === 0,
  };
}

export function computeSmartBoxUvWithRust(
  positions: Float32Array,
  normals: Float32Array
): Float32Array {
  const vertexCount = Math.floor(positions.length / 3);
  const uvs = new Float32Array(vertexCount * 2);

  for (let i = 0; i < vertexCount; i++) {
    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    const nx = Math.abs(normals[i * 3] ?? 0);
    const ny = Math.abs(normals[i * 3 + 1] ?? 1);
    const nz = Math.abs(normals[i * 3 + 2] ?? 0);

    let u = 0;
    let v = 0;
    if (nx >= ny && nx >= nz) {
      u = pz;
      v = py;
    } else if (ny >= nx && ny >= nz) {
      u = px;
      v = pz;
    } else {
      u = px;
      v = py;
    }

    uvs[i * 2] = u - Math.floor(u);
    uvs[i * 2 + 1] = v - Math.floor(v);
  }

  return uvs;
}