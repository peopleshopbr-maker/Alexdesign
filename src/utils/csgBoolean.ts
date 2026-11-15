import * as THREE from 'three';

export type BooleanOperation = 'union' | 'subtract' | 'intersect';

const EPSILON = 1e-5;
const COPLANAR = 0;
const FRONT = 1;
const BACK = 2;
const SPANNING = 3;

interface CsgVertex {
  pos: THREE.Vector3;
  normal: THREE.Vector3;
  uv: THREE.Vector2;
}

function cloneVertex(v: CsgVertex): CsgVertex {
  return { pos: v.pos.clone(), normal: v.normal.clone(), uv: v.uv.clone() };
}

function flipVertex(v: CsgVertex): CsgVertex {
  return { pos: v.pos.clone(), normal: v.normal.clone().negate(), uv: v.uv.clone() };
}

function lerpVertex(a: CsgVertex, b: CsgVertex, t: number): CsgVertex {
  return {
    pos: a.pos.clone().lerp(b.pos, t),
    normal: a.normal.clone().lerp(b.normal, t).normalize(),
    uv: a.uv.clone().lerp(b.uv, t),
  };
}

class CsgPlane {
  normal: THREE.Vector3;
  w: number;

  constructor(normal: THREE.Vector3, w: number) {
    this.normal = normal;
    this.w = w;
  }

  static fromPoints(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): CsgPlane | null {
    const ab = new THREE.Vector3().subVectors(b, a);
    const ac = new THREE.Vector3().subVectors(c, a);
    const n = new THREE.Vector3().crossVectors(ab, ac);
    if (n.lengthSq() < 1e-12) return null;
    n.normalize();
    return new CsgPlane(n, n.dot(a));
  }

  clone(): CsgPlane {
    return new CsgPlane(this.normal.clone(), this.w);
  }

  flip(): void {
    this.normal.negate();
    this.w = -this.w;
  }

  splitPolygon(
    polygon: CsgPolygon,
    coplanarFront: CsgPolygon[],
    coplanarBack: CsgPolygon[],
    front: CsgPolygon[],
    back: CsgPolygon[]
  ): void {
    let polygonType = 0;
    const types: number[] = [];

    for (let i = 0; i < polygon.vertices.length; i++) {
      const t = this.normal.dot(polygon.vertices[i].pos) - this.w;
      const type = t < -EPSILON ? BACK : t > EPSILON ? FRONT : COPLANAR;
      polygonType |= type;
      types.push(type);
    }

    switch (polygonType) {
      case COPLANAR:
        if (this.normal.dot(polygon.plane.normal) > 0) coplanarFront.push(polygon);
        else coplanarBack.push(polygon);
        break;
      case FRONT:
        front.push(polygon);
        break;
      case BACK:
        back.push(polygon);
        break;
      case SPANNING: {
        const f: CsgVertex[] = [];
        const b: CsgVertex[] = [];
        const len = polygon.vertices.length;
        for (let i = 0; i < len; i++) {
          const j = (i + 1) % len;
          const ti = types[i];
          const tj = types[j];
          const vi = polygon.vertices[i];
          const vj = polygon.vertices[j];
          if (ti !== BACK) f.push(vi);
          if (ti !== FRONT) b.push(ti !== BACK ? cloneVertex(vi) : vi);
          if ((ti | tj) === SPANNING) {
            const denom = this.normal.dot(new THREE.Vector3().subVectors(vj.pos, vi.pos));
            const t = Math.abs(denom) > 1e-10 ? (this.w - this.normal.dot(vi.pos)) / denom : 0.5;
            const v = lerpVertex(vi, vj, THREE.MathUtils.clamp(t, 0, 1));
            f.push(v);
            b.push(cloneVertex(v));
          }
        }
        if (f.length >= 3) front.push(new CsgPolygon(f));
        if (b.length >= 3) back.push(new CsgPolygon(b));
        break;
      }
    }
  }
}

class CsgPolygon {
  vertices: CsgVertex[];
  plane: CsgPlane;

  constructor(vertices: CsgVertex[], plane?: CsgPlane) {
    this.vertices = vertices;
    this.plane =
      plane ||
      CsgPlane.fromPoints(vertices[0].pos, vertices[1].pos, vertices[2].pos) ||
      new CsgPlane(new THREE.Vector3(0, 1, 0), 0);
  }

  clone(): CsgPolygon {
    return new CsgPolygon(this.vertices.map(cloneVertex), this.plane.clone());
  }

  flip(): void {
    this.vertices.reverse();
    this.vertices = this.vertices.map(flipVertex);
    this.plane.flip();
  }
}

class BspNode {
  plane: CsgPlane | null = null;
  front: BspNode | null = null;
  back: BspNode | null = null;
  polygons: CsgPolygon[] = [];

  constructor(polygons?: CsgPolygon[]) {
    if (polygons && polygons.length > 0) this.build(polygons);
  }

  clone(): BspNode {
    const node = new BspNode();
    node.plane = this.plane ? this.plane.clone() : null;
    node.front = this.front ? this.front.clone() : null;
    node.back = this.back ? this.back.clone() : null;
    node.polygons = this.polygons.map((p) => p.clone());
    return node;
  }

  invert(): void {
    for (const p of this.polygons) p.flip();
    if (this.plane) this.plane.flip();
    if (this.front) this.front.invert();
    if (this.back) this.back.invert();
    const tmp = this.front;
    this.front = this.back;
    this.back = tmp;
  }

  clipPolygons(polygons: CsgPolygon[]): CsgPolygon[] {
    if (!this.plane) return polygons.slice();
    let front: CsgPolygon[] = [];
    let back: CsgPolygon[] = [];
    for (const p of polygons) {
      this.plane.splitPolygon(p, front, back, front, back);
    }
    if (this.front) front = this.front.clipPolygons(front);
    back = this.back ? this.back.clipPolygons(back) : [];
    return front.concat(back);
  }

  clipTo(bsp: BspNode): void {
    this.polygons = bsp.clipPolygons(this.polygons);
    if (this.front) this.front.clipTo(bsp);
    if (this.back) this.back.clipTo(bsp);
  }

  allPolygons(): CsgPolygon[] {
    let polys = this.polygons.slice();
    if (this.front) polys = polys.concat(this.front.allPolygons());
    if (this.back) polys = polys.concat(this.back.allPolygons());
    return polys;
  }

  build(polygons: CsgPolygon[], depth = 0): void {
    if (polygons.length === 0 || depth > 48) {
      this.polygons.push(...polygons);
      return;
    }
    if (!this.plane) this.plane = polygons[0].plane.clone();
    const front: CsgPolygon[] = [];
    const back: CsgPolygon[] = [];
    for (const p of polygons) {
      this.plane.splitPolygon(p, this.polygons, this.polygons, front, back);
    }
    if (front.length > 0) {
      if (!this.front) this.front = new BspNode();
      this.front.build(front, depth + 1);
    }
    if (back.length > 0) {
      if (!this.back) this.back = new BspNode();
      this.back.build(back, depth + 1);
    }
  }
}

function extractPolygonsFromMesh(mesh: THREE.Mesh): CsgPolygon[] {
  mesh.updateMatrixWorld(true);
  const geo = mesh.geometry;
  const posAttr = geo.attributes.position;
  if (!posAttr) return [];

  const nonIndexed = geo.index ? geo.toNonIndexed() : geo;
  const pAttr = nonIndexed.attributes.position;
  const nAttr = nonIndexed.attributes.normal;
  const uvAttr = nonIndexed.attributes.uv;

  const normalMat = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const polys: CsgPolygon[] = [];
  const triCount = Math.floor(pAttr.count / 3);

  for (let t = 0; t < triCount; t++) {
    const verts: CsgVertex[] = [];
    for (let k = 0; k < 3; k++) {
      const idx = t * 3 + k;
      const pos = new THREE.Vector3(pAttr.getX(idx), pAttr.getY(idx), pAttr.getZ(idx)).applyMatrix4(
        mesh.matrixWorld
      );
      const normal = nAttr
        ? new THREE.Vector3(nAttr.getX(idx), nAttr.getY(idx), nAttr.getZ(idx))
            .applyMatrix3(normalMat)
            .normalize()
        : new THREE.Vector3(0, 1, 0);
      const uv = uvAttr ? new THREE.Vector2(uvAttr.getX(idx), uvAttr.getY(idx)) : new THREE.Vector2(0, 0);
      verts.push({ pos, normal, uv });
    }
    const plane = CsgPlane.fromPoints(verts[0].pos, verts[1].pos, verts[2].pos);
    if (plane) {
      polys.push(new CsgPolygon(verts, plane));
    }
  }

  if (nonIndexed !== geo) nonIndexed.dispose();
  return polys;
}

export function performMeshBoolean(
  meshA: THREE.Mesh,
  meshB: THREE.Mesh,
  operation: BooleanOperation
): { geometry: THREE.BufferGeometry; center: THREE.Vector3 } | null {
  const polysA = extractPolygonsFromMesh(meshA);
  const polysB = extractPolygonsFromMesh(meshB);
  if (polysA.length === 0 || polysB.length === 0) return null;
  if (polysA.length + polysB.length > 18000) {
    return null;
  }

  const a = new BspNode(polysA);
  const b = new BspNode(polysB);

  if (operation === 'union') {
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
  } else if (operation === 'subtract') {
    a.invert();
    a.clipTo(b);
    b.clipTo(a);
    b.invert();
    b.clipTo(a);
    b.invert();
    a.build(b.allPolygons());
    a.invert();
  } else {
    a.invert();
    b.clipTo(a);
    b.invert();
    a.clipTo(b);
    b.clipTo(a);
    a.build(b.allPolygons());
    a.invert();
  }

  const resultPolys = a.allPolygons();
  if (resultPolys.length === 0) return null;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];

  for (const poly of resultPolys) {
    for (let i = 2; i < poly.vertices.length; i++) {
      const tri = [poly.vertices[0], poly.vertices[i - 1], poly.vertices[i]];
      for (const v of tri) {
        positions.push(v.pos.x, v.pos.y, v.pos.z);
        normals.push(v.normal.x, v.normal.y, v.normal.z);
        uvs.push(v.uv.x, v.uv.y);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();

  const center = new THREE.Vector3();
  if (geometry.boundingBox) {
    geometry.boundingBox.getCenter(center);
    geometry.translate(-center.x, -center.y, -center.z);
  }
  geometry.computeVertexNormals();
  return { geometry, center };
}
