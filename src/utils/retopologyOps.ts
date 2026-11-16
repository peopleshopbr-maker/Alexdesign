import * as THREE from 'three';

/**
 * Welds coincident vertices by spatial quantization (equivalent to Blender bmesh.ops.remove_doubles)
 * and removes degenerate triangles, returning a clean indexed BufferGeometry.
 */
export function weldCleanTopology(
  source: THREE.BufferGeometry,
  tolerance = 1e-4
): THREE.BufferGeometry {
  const posAttr = source.attributes.position;
  if (!posAttr) return source.clone();

  const nonIndexed = source.index ? source.toNonIndexed() : source;
  const p = nonIndexed.attributes.position;
  const uv = nonIndexed.attributes.uv;
  const norm = nonIndexed.attributes.normal;

  const invTol = 1 / Math.max(tolerance, 1e-6);
  const vertMap = new Map<string, number>();
  const outPos: number[] = [];
  const outUv: number[] = [];
  const outIndices: number[] = [];

  const getVertKey = (idx: number) => {
    const qx = Math.round(p.getX(idx) * invTol);
    const qy = Math.round(p.getY(idx) * invTol);
    const qz = Math.round(p.getZ(idx) * invTol);
    // Preserve UV seams only when UV differs noticeably
    const qu = uv ? Math.round(uv.getX(idx) * 200) : 0;
    const qv = uv ? Math.round(uv.getY(idx) * 200) : 0;
    return `${qx},${qy},${qz}|${qu},${qv}`;
  };

  const triCount = Math.floor(p.count / 3);
  for (let t = 0; t < triCount; t++) {
    const triIdx: number[] = [];
    for (let k = 0; k < 3; k++) {
      const i = t * 3 + k;
      const key = getVertKey(i);
      let mapped = vertMap.get(key);
      if (mapped === undefined) {
        mapped = outPos.length / 3;
        vertMap.set(key, mapped);
        outPos.push(p.getX(i), p.getY(i), p.getZ(i));
        if (uv) {
          outUv.push(uv.getX(i), uv.getY(i));
        }
      }
      triIdx.push(mapped);
    }

    // Drop collapsed / degenerate triangles
    if (triIdx[0] !== triIdx[1] && triIdx[1] !== triIdx[2] && triIdx[0] !== triIdx[2]) {
      outIndices.push(triIdx[0], triIdx[1], triIdx[2]);
    }
  }

  if (nonIndexed !== source) nonIndexed.dispose();

  if (outIndices.length < 3) {
    return source.clone();
  }

  const next = new THREE.BufferGeometry();
  next.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  if (uv && outUv.length === (outPos.length / 3) * 2) {
    const uvAttr = new THREE.Float32BufferAttribute(outUv, 2);
    next.setAttribute('uv', uvAttr);
    next.setAttribute('uv1', uvAttr);
  }
  next.setIndex(outIndices);
  if (norm && outIndices.length === 0) {
    // Unreachable, normals recomputed cleanly below
  }
  next.computeVertexNormals();
  next.computeBoundingBox();
  next.computeBoundingSphere();
  return next;
}

/**
 * 1-to-4 midpoint triangle subdivision (Multires / Subsurf style)
 * so low-poly meshes have sufficient vertex density for Stage 3 sculpting.
 */
export function subdivideMeshGeometry(source: THREE.BufferGeometry): THREE.BufferGeometry {
  const posAttr = source.attributes.position;
  if (!posAttr) return source.clone();

  // Safety guard so overly dense meshes don't freeze the browser tab
  const currentTris = source.index
    ? Math.floor(source.index.count / 3)
    : Math.floor(posAttr.count / 3);
  if (currentTris > 45000) {
    return source.clone();
  }

  const nonIndexed = source.index ? source.toNonIndexed() : source;
  const p = nonIndexed.attributes.position;
  const uv = nonIndexed.attributes.uv;

  const outPos: number[] = [];
  const outUv: number[] = [];

  const pushVert = (x: number, y: number, z: number, u: number, v: number) => {
    outPos.push(x, y, z);
    if (uv) outUv.push(u, v);
  };

  const triCount = Math.floor(p.count / 3);
  for (let t = 0; t < triCount; t++) {
    const i0 = t * 3;
    const i1 = t * 3 + 1;
    const i2 = t * 3 + 2;

    const x0 = p.getX(i0), y0 = p.getY(i0), z0 = p.getZ(i0);
    const x1 = p.getX(i1), y1 = p.getY(i1), z1 = p.getZ(i1);
    const x2 = p.getX(i2), y2 = p.getY(i2), z2 = p.getZ(i2);

    const mx01 = (x0 + x1) * 0.5, my01 = (y0 + y1) * 0.5, mz01 = (z0 + z1) * 0.5;
    const mx12 = (x1 + x2) * 0.5, my12 = (y1 + y2) * 0.5, mz12 = (z1 + z2) * 0.5;
    const mx20 = (x2 + x0) * 0.5, my20 = (y2 + y0) * 0.5, mz20 = (z2 + z0) * 0.5;

    const u0 = uv ? uv.getX(i0) : 0, v0 = uv ? uv.getY(i0) : 0;
    const u1 = uv ? uv.getX(i1) : 0, v1 = uv ? uv.getY(i1) : 0;
    const u2 = uv ? uv.getX(i2) : 0, v2 = uv ? uv.getY(i2) : 0;

    const mu01 = (u0 + u1) * 0.5, mv01 = (v0 + v1) * 0.5;
    const mu12 = (u1 + u2) * 0.5, mv12 = (v1 + v2) * 0.5;
    const mu20 = (u2 + u0) * 0.5, mv20 = (v2 + v0) * 0.5;

    // Tri 0: v0, m01, m20
    pushVert(x0, y0, z0, u0, v0);
    pushVert(mx01, my01, mz01, mu01, mv01);
    pushVert(mx20, my20, mz20, mu20, mv20);
    // Tri 1: m01, v1, m12
    pushVert(mx01, my01, mz01, mu01, mv01);
    pushVert(x1, y1, z1, u1, v1);
    pushVert(mx12, my12, mz12, mu12, mv12);
    // Tri 2: m20, m12, v2
    pushVert(mx20, my20, mz20, mu20, mv20);
    pushVert(mx12, my12, mz12, mu12, mv12);
    pushVert(x2, y2, z2, u2, v2);
    // Tri 3: m01, m12, m20
    pushVert(mx01, my01, mz01, mu01, mv01);
    pushVert(mx12, my12, mz12, mu12, mv12);
    pushVert(mx20, my20, mz20, mu20, mv20);
  }

  if (nonIndexed !== source) nonIndexed.dispose();

  const tempGeo = new THREE.BufferGeometry();
  tempGeo.setAttribute('position', new THREE.Float32BufferAttribute(outPos, 3));
  if (uv && outUv.length > 0) {
    tempGeo.setAttribute('uv', new THREE.Float32BufferAttribute(outUv, 2));
  }
  const welded = weldCleanTopology(tempGeo, 1e-5);
  tempGeo.dispose();
  return welded;
}

/**
 * Adaptive vertex-cluster Remesh / Retopology decimation.
 * Reduces triangle count toward `targetRatio` (e.g. 0.5 = 50% of triangles) while
 * preserving silhouette volume, UV coordinates, and clean indexed topology.
 */
export function retopologizeMeshGeometry(
  source: THREE.BufferGeometry,
  targetRatio = 0.5
): THREE.BufferGeometry {
  const posAttr = source.attributes.position;
  if (!posAttr) return source.clone();

  const origTriCount = source.index
    ? Math.floor(source.index.count / 3)
    : Math.floor(posAttr.count / 3);
  if (origTriCount <= 24) {
    return weldCleanTopology(source, 1e-4);
  }

  const clampedRatio = THREE.MathUtils.clamp(targetRatio, 0.15, 0.92);
  const targetTris = Math.max(12, Math.round(origTriCount * clampedRatio));

  const nonIndexed = source.index ? source.toNonIndexed() : source;
  const p = nonIndexed.attributes.position;
  const uv = nonIndexed.attributes.uv;

  nonIndexed.computeBoundingBox();
  const bbox = nonIndexed.boundingBox!;
  const size = new THREE.Vector3();
  bbox.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z, 1e-4);

  const runClusterPass = (gridRes: number) => {
    const cellSize = maxDim / Math.max(3, gridRes);
    const invCell = 1 / cellSize;

    const clusterAccum = new Map<
      string,
      { idx: number; x: number; y: number; z: number; u: number; v: number; count: number }
    >();
    const clusterList: { x: number; y: number; z: number; u: number; v: number; count: number }[] = [];

    const vertToCluster = new Int32Array(p.count);
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i);
      const vy = p.getY(i);
      const vz = p.getZ(i);
      const gx = Math.floor((vx - bbox.min.x) * invCell);
      const gy = Math.floor((vy - bbox.min.y) * invCell);
      const gz = Math.floor((vz - bbox.min.z) * invCell);
      const key = `${gx},${gy},${gz}`;
      let rec = clusterAccum.get(key);
      if (!rec) {
        rec = {
          idx: clusterList.length,
          x: 0,
          y: 0,
          z: 0,
          u: 0,
          v: 0,
          count: 0,
        };
        clusterAccum.set(key, rec);
        clusterList.push(rec);
      }
      rec.x += vx;
      rec.y += vy;
      rec.z += vz;
      if (uv) {
        rec.u += uv.getX(i);
        rec.v += uv.getY(i);
      }
      rec.count++;
      vertToCluster[i] = rec.idx;
    }

    const outIndices: number[] = [];
    const seenTris = new Set<string>();
    const triCount = Math.floor(p.count / 3);

    for (let t = 0; t < triCount; t++) {
      const a = vertToCluster[t * 3];
      const b = vertToCluster[t * 3 + 1];
      const c = vertToCluster[t * 3 + 2];
      if (a === b || b === c || a === c) continue;

      // Deduplicate identical triangles after clustering
      const minV = Math.min(a, b, c);
      const maxV = Math.max(a, b, c);
      const midV = a + b + c - minV - maxV;
      const triKey = `${minV}-${midV}-${maxV}`;
      if (seenTris.has(triKey)) continue;
      seenTris.add(triKey);

      outIndices.push(a, b, c);
    }

    return { clusterList, outIndices };
  };

  // Binary search grid resolution for closest match to targetTris
  let lo = 4;
  let hi = Math.max(12, Math.min(180, Math.round(Math.sqrt(origTriCount) * 2.2)));
  let bestResult = runClusterPass(Math.round((lo + hi) * 0.5));
  let bestDiff = Math.abs(bestResult.outIndices.length / 3 - targetTris);

  for (let iter = 0; iter < 7 && lo <= hi; iter++) {
    const mid = Math.floor((lo + hi) * 0.5);
    const candidate = runClusterPass(mid);
    const candTris = candidate.outIndices.length / 3;
    const diff = Math.abs(candTris - targetTris);
    if (candTris >= 12 && diff < bestDiff) {
      bestDiff = diff;
      bestResult = candidate;
    }
    if (candTris > targetTris) {
      hi = mid - 1;
    } else {
      lo = mid + 1;
    }
  }

  if (nonIndexed !== source) nonIndexed.dispose();

  if (bestResult.outIndices.length < 12) {
    return weldCleanTopology(source, 1e-4);
  }

  const outPos = new Float32Array(bestResult.clusterList.length * 3);
  const outUv = uv ? new Float32Array(bestResult.clusterList.length * 2) : null;

  for (let i = 0; i < bestResult.clusterList.length; i++) {
    const c = bestResult.clusterList[i];
    const inv = 1 / Math.max(1, c.count);
    outPos[i * 3] = c.x * inv;
    outPos[i * 3 + 1] = c.y * inv;
    outPos[i * 3 + 2] = c.z * inv;
    if (outUv) {
      outUv[i * 2] = c.u * inv;
      outUv[i * 2 + 1] = c.v * inv;
    }
  }

  const next = new THREE.BufferGeometry();
  next.setAttribute('position', new THREE.BufferAttribute(outPos, 3));
  if (outUv) {
    const uvAttr = new THREE.BufferAttribute(outUv, 2);
    next.setAttribute('uv', uvAttr);
    next.setAttribute('uv1', uvAttr);
  }
  next.setIndex(bestResult.outIndices);
  next.computeVertexNormals();
  next.computeBoundingBox();
  next.computeBoundingSphere();
  return next;
}
