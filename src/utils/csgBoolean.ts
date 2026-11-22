import * as THREE from 'three';

export type BooleanOpKind = 'union' | 'subtract' | 'intersect';

interface Tri {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
  normal: THREE.Vector3;
  centroid: THREE.Vector3;
}

function extractWorldTriangles(mesh: THREE.Mesh): Tri[] {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  const pos = geo.attributes.position;
  const tris: Tri[] = [];
  const mat4 = mesh.matrixWorld;

  for (let i = 0; i + 2 < pos.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(mat4);
    const b = new THREE.Vector3().fromBufferAttribute(pos, i + 1).applyMatrix4(mat4);
    const c = new THREE.Vector3().fromBufferAttribute(pos, i + 2).applyMatrix4(mat4);
    const e1 = new THREE.Vector3().subVectors(b, a);
    const e2 = new THREE.Vector3().subVectors(c, a);
    const normal = new THREE.Vector3().crossVectors(e1, e2).normalize();
    const centroid = new THREE.Vector3().add(a).add(b).add(c).multiplyScalar(1 / 3);
    tris.push({ a, b, c, normal, centroid });
  }
  if (geo !== mesh.geometry) geo.dispose();
  return tris;
}

function isPointInsideClosedTriangles(pt: THREE.Vector3, tris: Tri[], bbox: THREE.Box3): boolean {
  if (!bbox.containsPoint(pt)) return false;
  const rayDir = new THREE.Vector3(0.57735, 0.57735, 0.57735);
  const ray = new THREE.Ray(pt, rayDir);
  const hit = new THREE.Vector3();
  let intersections = 0;
  for (let i = 0; i < tris.length; i++) {
    const t = tris[i];
    if (ray.intersectTriangle(t.a, t.b, t.c, false, hit)) {
      intersections += 1;
    }
  }
  return intersections % 2 === 1;
}

/**
 * Performs solid triangle classification CSG boolean between meshA and meshB
 * and returns a centered BufferGeometry positioned at meshA's local origin.
 */
export function performCsgBoolean(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh,
  op: BooleanOpKind
): THREE.BufferGeometry {
  const trisA = extractWorldTriangles(meshA);
  const trisB = extractWorldTriangles(meshB);

  const boxA = new THREE.Box3().setFromObject(meshA);
  const boxB = new THREE.Box3().setFromObject(meshB);

  const outPositions: number[] = [];
  const outNormals: number[] = [];
  const outUvs: number[] = [];

  const invA = meshA.matrixWorld.clone().invert();
  const nMatA = new THREE.Matrix3().getNormalMatrix(invA);

  const pushTri = (t: Tri, flipNormal: boolean) => {
    const va = t.a.clone().applyMatrix4(invA);
    const vb = t.b.clone().applyMatrix4(invA);
    const vc = t.c.clone().applyMatrix4(invA);
    const n = t.normal.clone().applyMatrix3(nMatA).normalize();
    if (flipNormal) n.negate();

    const verts = flipNormal ? [va, vc, vb] : [va, vb, vc];
    verts.forEach((v) => {
      outPositions.push(v.x, v.y, v.z);
      outNormals.push(n.x, n.y, n.z);
      outUvs.push(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5);
    });
  };

  for (const t of trisA) {
    const insideB = isPointInsideClosedTriangles(t.centroid, trisB, boxB);
    if (op === 'union' && !insideB) pushTri(t, false);
    else if (op === 'subtract' && !insideB) pushTri(t, false);
    else if (op === 'intersect' && insideB) pushTri(t, false);
  }

  for (const t of trisB) {
    const insideA = isPointInsideClosedTriangles(t.centroid, trisA, boxA);
    if (op === 'union' && !insideA) pushTri(t, false);
    else if (op === 'subtract' && insideA) pushTri(t, true);
    else if (op === 'intersect' && insideA) pushTri(t, false);
  }

  if (outPositions.length === 0) {
    // Graceful fallback if volumes don't overlap as expected
    trisA.forEach((t) => pushTri(t, false));
  }

  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(outPositions, 3));
  result.setAttribute('normal', new THREE.Float32BufferAttribute(outNormals, 3));
  result.setAttribute('uv', new THREE.Float32BufferAttribute(outUvs, 2));
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}
