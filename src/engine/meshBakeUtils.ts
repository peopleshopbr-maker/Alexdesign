import * as THREE from 'three';

export interface BakeAoCurvatureOptions {
  textureSize?: number;
  cavityDarkness?: number;
  edgeWearIntensity?: number;
  applyWearToAlbedo?: boolean;
}

export interface BakeResultSummary {
  meshesBaked: number;
  verticesProcessed: number;
  textureSize: number;
}

/**
 * Computes per-vertex curvature (convex edge wear vs concave cavity) and local AO,
 * then bakes a UV-space Ambient Occlusion + Curvature map directly in the browser.
 */
export function bakeAoAndCurvatureForGroup(
  root: THREE.Object3D,
  options: BakeAoCurvatureOptions = {}
): BakeResultSummary {
  const texSize = options.textureSize ?? 512;
  const cavityDarkness = options.cavityDarkness ?? 0.55;
  const edgeWearIntensity = options.edgeWearIntensity ?? 0.45;
  const applyWearToAlbedo = options.applyWearToAlbedo ?? true;

  let meshesBaked = 0;
  let verticesProcessed = 0;

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const geo = mesh.geometry;
    const pos = geo?.attributes?.position;
    if (!pos || pos.count < 3) return;

    if (!geo.attributes.normal) {
      geo.computeVertexNormals();
    }
    const norm = geo.attributes.normal;
    const uv = geo.attributes.uv;
    const idx = geo.index;
    const vCount = pos.count;
    verticesProcessed += vCount;

    // 1. Accumulate neighbor positions to estimate discrete mean curvature & concavity
    const neighborSumX = new Float32Array(vCount);
    const neighborSumY = new Float32Array(vCount);
    const neighborSumZ = new Float32Array(vCount);
    const neighborCount = new Uint32Array(vCount);

    const triCount = idx ? Math.floor(idx.count / 3) : Math.floor(vCount / 3);
    const addEdge = (a: number, b: number) => {
      neighborSumX[a] += pos.getX(b);
      neighborSumY[a] += pos.getY(b);
      neighborSumZ[a] += pos.getZ(b);
      neighborCount[a] += 1;
    };

    for (let t = 0; t < triCount; t++) {
      const i0 = idx ? idx.getX(t * 3) : t * 3;
      const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
      const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
      addEdge(i0, i1);
      addEdge(i1, i0);
      addEdge(i1, i2);
      addEdge(i2, i1);
      addEdge(i2, i0);
      addEdge(i0, i2);
    }

    geo.computeBoundingBox();
    const bbox = geo.boundingBox;
    const minY = bbox ? bbox.min.y : 0;
    const height = bbox ? Math.max(0.001, bbox.max.y - bbox.min.y) : 1;

    const aoValues = new Float32Array(vCount);
    const curvValues = new Float32Array(vCount);

    for (let i = 0; i < vCount; i++) {
      const cnt = neighborCount[i];
      let curv = 0;
      if (cnt > 0) {
        const lx = neighborSumX[i] / cnt - pos.getX(i);
        const ly = neighborSumY[i] / cnt - pos.getY(i);
        const lz = neighborSumZ[i] / cnt - pos.getZ(i);
        const len = Math.sqrt(lx * lx + ly * ly + lz * lz);
        if (len > 1e-6) {
          // Dot product of Laplacian vector with vertex normal:
          // negative => convex (edge wear), positive => concave (cavity/AO)
          const dot = (lx * norm.getX(i) + ly * norm.getY(i) + lz * norm.getZ(i)) / len;
          curv = THREE.MathUtils.clamp(-dot * 1.8, -1, 1);
        }
      }

      // Ground hemisphere AO + cavity darkening
      const normY = (pos.getY(i) - minY) / height;
      const hemisphereAo = THREE.MathUtils.clamp(0.62 + normY * 0.38, 0.45, 1.0);
      const cavity = Math.max(0, -curv);
      const ao = THREE.MathUtils.clamp(hemisphereAo * (1 - cavity * cavityDarkness), 0.18, 1.0);

      aoValues[i] = ao;
      curvValues[i] = curv;
    }

    // 2. Rasterize AO + Curvature into a UV-space CanvasTexture if UVs exist
    if (uv) {
      const aoCanvas = document.createElement('canvas');
      aoCanvas.width = texSize;
      aoCanvas.height = texSize;
      const aoCtx = aoCanvas.getContext('2d');

      if (aoCtx) {
        aoCtx.fillStyle = '#E6E6E6';
        aoCtx.fillRect(0, 0, texSize, texSize);

        const maxBakeTris = Math.min(triCount, 45000);
        for (let t = 0; t < maxBakeTris; t++) {
          const i0 = idx ? idx.getX(t * 3) : t * 3;
          const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
          const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;

          const avgAo = (aoValues[i0] + aoValues[i1] + aoValues[i2]) / 3;
          const avgCurv = (curvValues[i0] + curvValues[i1] + curvValues[i2]) / 3;

          // Combine AO with subtle edge-wear highlight
          const edgeBoost = Math.max(0, avgCurv) * edgeWearIntensity * 0.35;
          const shade = Math.round(THREE.MathUtils.clamp(avgAo + edgeBoost, 0.15, 1.0) * 255);

          const x0 = uv.getX(i0) * texSize;
          const y0 = (1 - uv.getY(i0)) * texSize;
          const x1 = uv.getX(i1) * texSize;
          const y1 = (1 - uv.getY(i1)) * texSize;
          const x2 = uv.getX(i2) * texSize;
          const y2 = (1 - uv.getY(i2)) * texSize;

          aoCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
          aoCtx.beginPath();
          aoCtx.moveTo(x0, y0);
          aoCtx.lineTo(x1, y1);
          aoCtx.lineTo(x2, y2);
          aoCtx.closePath();
          aoCtx.fill();
        }

        const aoTex = new THREE.CanvasTexture(aoCanvas);
        aoTex.flipY = false;
        aoTex.needsUpdate = true;

        // Ensure uv1 exists for Three.js aoMap
        if (!geo.attributes.uv1) {
          geo.setAttribute('uv1', uv);
        }

        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m instanceof THREE.MeshStandardMaterial) {
            if (m.aoMap) m.aoMap.dispose();
            m.aoMap = aoTex;
            m.aoMapIntensity = 1.0;
            if (applyWearToAlbedo) {
              // Subtle roughness variation for realistic edge wear feel
              m.roughness = THREE.MathUtils.clamp(m.roughness * 0.92 + 0.04, 0.08, 0.96);
            }
            m.needsUpdate = true;
          }
        }
        meshesBaked += 1;
      }
    }
  });

  return {
    meshesBaked,
    verticesProcessed,
    textureSize: texSize,
  };
}
