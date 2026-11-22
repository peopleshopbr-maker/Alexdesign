import * as THREE from 'three';

/**
 * Generates a valid ASCII FBX 7.4 (.fbx) file containing scene meshes (vertices, polygon indices,
 * normals, UVs), PBR materials, Skeleton bones (LimbNode), Skin Deformers (Cluster weights),
 * and AnimationStack/AnimationLayer keyframes compatible with Unreal Engine, Unity, and Blender.
 */
export function exportSceneToFbxBlob(
  root: THREE.Object3D,
  clips: THREE.AnimationClip[],
  assetName: string
): Blob {
  let nextId = 100000;
  const allocId = () => {
    nextId += 13;
    return nextId;
  };

  const objectBlocks: string[] = [];
  const connectionBlocks: string[] = [];

  const rootBoneIds = new Map<string, number>();
  const boneObjects: THREE.Bone[] = [];
  const meshes: THREE.Mesh[] = [];

  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) {
      const b = obj as THREE.Bone;
      boneObjects.push(b);
      rootBoneIds.set(b.uuid, allocId());
    } else if ((obj as THREE.Mesh).isMesh) {
      const m = obj as THREE.Mesh;
      if (m.visible && m.geometry?.attributes?.position) {
        meshes.push(m);
      }
    }
  });

  // Export Bones (LimbNode + NodeAttribute Limb)
  const boneByName = new Map<string, { id: number; bone: THREE.Bone }>();
  for (const bone of boneObjects) {
    const modelId = rootBoneIds.get(bone.uuid)!;
    const attrId = allocId();
    const euler = new THREE.Euler().setFromQuaternion(bone.quaternion, 'XYZ');
    const rx = THREE.MathUtils.radToDeg(euler.x).toFixed(4);
    const ry = THREE.MathUtils.radToDeg(euler.y).toFixed(4);
    const rz = THREE.MathUtils.radToDeg(euler.z).toFixed(4);
    boneByName.set(bone.name, { id: modelId, bone });

    objectBlocks.push(`\tNodeAttribute: ${attrId}, "NodeAttribute::${bone.name}", "LimbNode" {
\t\tTypeFlags: "Skeleton"
\t}
\tModel: ${modelId}, "Model::${bone.name}", "LimbNode" {
\t\tVersion: 232
\t\tProperties70:  {
\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",${bone.position.x.toFixed(5)},${bone.position.y.toFixed(5)},${bone.position.z.toFixed(5)}
\t\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A",${rx},${ry},${rz}
\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",1,1,1
\t\t}
\t\tShading: Y
\t\tCulling: "CullingOff"
\t}`);
    connectionBlocks.push(`\tC: "OO",${attrId},${modelId}`);
    if (bone.parent && (bone.parent as THREE.Bone).isBone) {
      const parentId = rootBoneIds.get(bone.parent.uuid) ?? 0;
      connectionBlocks.push(`\tC: "OO",${modelId},${parentId}`);
    } else {
      connectionBlocks.push(`\tC: "OO",${modelId},0`);
    }
  }

  // Export Meshes + Geometry + Materials + Skin Weights
  meshes.forEach((mesh, meshIdx) => {
    const geo = mesh.geometry;
    const posAttr = geo.attributes.position;
    const normAttr = geo.attributes.normal;
    const uvAttr = geo.attributes.uv;
    const idxAttr = geo.index;

    const verts: string[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      verts.push(
        posAttr.getX(i).toFixed(5),
        posAttr.getY(i).toFixed(5),
        posAttr.getZ(i).toFixed(5)
      );
    }

    const polyIndices: string[] = [];
    const triCount = idxAttr ? Math.floor(idxAttr.count / 3) : Math.floor(posAttr.count / 3);
    for (let t = 0; t < triCount; t++) {
      const a = idxAttr ? idxAttr.getX(t * 3) : t * 3;
      const b = idxAttr ? idxAttr.getX(t * 3 + 1) : t * 3 + 1;
      const c = idxAttr ? idxAttr.getX(t * 3 + 2) : t * 3 + 2;
      polyIndices.push(`${a}`, `${b}`, `${-(c + 1)}`);
    }

    let normalsBlock = '';
    if (normAttr) {
      const nVals: string[] = [];
      for (let i = 0; i < normAttr.count; i++) {
        nVals.push(
          normAttr.getX(i).toFixed(5),
          normAttr.getY(i).toFixed(5),
          normAttr.getZ(i).toFixed(5)
        );
      }
      normalsBlock = `\t\tLayerElementNormal: 0 {
\t\t\tVersion: 101
\t\t\tName: ""
\t\t\tMappingInformationType: "ByVertice"
\t\t\tReferenceInformationType: "Direct"
\t\t\tNormals: *${nVals.length} {
\t\t\t\ta: ${nVals.join(',')}
\t\t\t}
\t\t}`;
    }

    let uvsBlock = '';
    if (uvAttr) {
      const uvVals: string[] = [];
      for (let i = 0; i < uvAttr.count; i++) {
        uvVals.push(uvAttr.getX(i).toFixed(5), uvAttr.getY(i).toFixed(5));
      }
      uvsBlock = `\t\tLayerElementUV: 0 {
\t\t\tVersion: 101
\t\t\tName: "UVMap"
\t\t\tMappingInformationType: "ByVertice"
\t\t\tReferenceInformationType: "Direct"
\t\t\tUV: *${uvVals.length} {
\t\t\t\ta: ${uvVals.join(',')}
\t\t\t}
\t\t}`;
    }

    const safeName = (mesh.name || `Malha_${meshIdx + 1}`).replace(/"/g, '_');
    const geoId = allocId();
    const modelId = allocId();
    const matId = allocId();

    const rawMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const stdMat = rawMat as THREE.MeshStandardMaterial | undefined;
    const col = stdMat?.color ?? new THREE.Color('#cbd5e1');
    const matName = (stdMat?.name || `Mat_${safeName}`).replace(/"/g, '_');

    const euler = new THREE.Euler().setFromQuaternion(mesh.quaternion, 'XYZ');
    objectBlocks.push(`\tGeometry: ${geoId}, "Geometry::${safeName}", "Mesh" {
\t\tVertices: *${verts.length} {
\t\t\ta: ${verts.join(',')}
\t\t}
\t\tPolygonVertexIndex: *${polyIndices.length} {
\t\t\ta: ${polyIndices.join(',')}
\t\t}
${normalsBlock}
${uvsBlock}
\t\tLayer: 0 {
\t\t\tVersion: 100
\t\t\tLayerElement:  {
\t\t\t\tType: "LayerElementNormal"
\t\t\t\tTypedIndex: 0
\t\t\t}
\t\t\tLayerElement:  {
\t\t\t\tType: "LayerElementUV"
\t\t\t\tTypedIndex: 0
\t\t\t}
\t\t}
\t}
\tMaterial: ${matId}, "Material::${matName}", "" {
\t\tVersion: 102
\t\tShadingModel: "phong"
\t\tProperties70:  {
\t\t\tP: "DiffuseColor", "Color", "", "A",${col.r.toFixed(4)},${col.g.toFixed(4)},${col.b.toFixed(4)}
\t\t\tP: "Shininess", "Number", "", "A",${Math.round((1 - (stdMat?.roughness ?? 0.4)) * 90)}
\t\t}
\t}
\tModel: ${modelId}, "Model::${safeName}", "Mesh" {
\t\tVersion: 232
\t\tProperties70:  {
\t\t\tP: "Lcl Translation", "Lcl Translation", "", "A",${mesh.position.x.toFixed(5)},${mesh.position.y.toFixed(5)},${mesh.position.z.toFixed(5)}
\t\t\tP: "Lcl Rotation", "Lcl Rotation", "", "A",${THREE.MathUtils.radToDeg(euler.x).toFixed(4)},${THREE.MathUtils.radToDeg(euler.y).toFixed(4)},${THREE.MathUtils.radToDeg(euler.z).toFixed(4)}
\t\t\tP: "Lcl Scaling", "Lcl Scaling", "", "A",${mesh.scale.x.toFixed(5)},${mesh.scale.y.toFixed(5)},${mesh.scale.z.toFixed(5)}
\t\t}
\t\tShading: T
\t\tCulling: "CullingOff"
\t}`);

    connectionBlocks.push(`\tC: "OO",${geoId},${modelId}`);
    connectionBlocks.push(`\tC: "OO",${matId},${modelId}`);
    connectionBlocks.push(`\tC: "OO",${modelId},0`);

    // Skin Deformer + Bone Clusters if SkinnedMesh
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      const skMesh = mesh as THREE.SkinnedMesh;
      const skinIdx = geo.attributes.skinIndex;
      const skinW = geo.attributes.skinWeight;
      const bones = skMesh.skeleton?.bones ?? [];
      if (skinIdx && skinW && bones.length > 0) {
        const skinId = allocId();
        objectBlocks.push(`\tDeformer: ${skinId}, "Deformer::Skin_${safeName}", "Skin" {
\t\tVersion: 101
\t\tLink_DeformAcuracy: 50
\t}`);
        connectionBlocks.push(`\tC: "OO",${skinId},${geoId}`);

        const boneVertIndices: number[][] = Array.from({ length: bones.length }, () => []);
        const boneVertWeights: number[][] = Array.from({ length: bones.length }, () => []);
        for (let vi = 0; vi < posAttr.count; vi++) {
          for (let k = 0; k < 4; k++) {
            const bIdx = Math.round(skinIdx.getComponent(vi, k));
            const w = skinW.getComponent(vi, k);
            if (w > 0.001 && bIdx >= 0 && bIdx < bones.length) {
              boneVertIndices[bIdx].push(vi);
              boneVertWeights[bIdx].push(w);
            }
          }
        }

        bones.forEach((b, bIdx) => {
          const vIdxs = boneVertIndices[bIdx];
          if (vIdxs.length === 0) return;
          const vWs = boneVertWeights[bIdx];
          const clusterId = allocId();
          const boneModelId = rootBoneIds.get(b.uuid);
          objectBlocks.push(`\tDeformer: ${clusterId}, "SubDeformer::Cluster_${b.name}", "Cluster" {
\t\tVersion: 100
\t\tIndexes: *${vIdxs.length} {
\t\t\ta: ${vIdxs.join(',')}
\t\t}
\t\tWeights: *${vWs.length} {
\t\t\ta: ${vWs.map((x) => x.toFixed(4)).join(',')}
\t\t}
\t}`);
          connectionBlocks.push(`\tC: "OO",${clusterId},${skinId}`);
          if (boneModelId) {
            connectionBlocks.push(`\tC: "OO",${boneModelId},${clusterId}`);
          }
        });
      }
    }
  });

  // Export AnimationStacks & AnimationCurves (FBX ticks = 46186158000 / sec)
  const FBX_TICKS_PER_SEC = 46186158000;
  clips.slice(0, 6).forEach((clip) => {
    const stackId = allocId();
    const layerId = allocId();
    const durTicks = Math.round(Math.max(clip.duration, 0.1) * FBX_TICKS_PER_SEC);
    const safeClipName = (clip.name || 'Action').replace(/"/g, '_');

    objectBlocks.push(`\tAnimationStack: ${stackId}, "AnimStack::${safeClipName}", "" {
\t\tProperties70:  {
\t\t\tP: "LocalStop", "KTime", "Time", "",${durTicks}
\t\t}
\t}
\tAnimationLayer: ${layerId}, "AnimLayer::BaseLayer", "" {
\t}`);
    connectionBlocks.push(`\tC: "OO",${layerId},${stackId}`);

    for (const track of clip.tracks) {
      const dot = track.name.indexOf('.');
      const targetName = dot >= 0 ? track.name.slice(0, dot) : track.name;
      const prop = dot >= 0 ? track.name.slice(dot + 1) : '';
      const boneEntry = boneByName.get(targetName);
      if (!boneEntry) continue;

      if (prop === 'quaternion' && track.times.length > 0) {
        const cnId = allocId();
        const cxId = allocId();
        const cyId = allocId();
        const czId = allocId();
        const timesStr = Array.from(track.times)
          .map((t) => Math.round(t * FBX_TICKS_PER_SEC))
          .join(',');

        const q = new THREE.Quaternion();
        const e = new THREE.Euler();
        const xs: string[] = [];
        const ys: string[] = [];
        const zs: string[] = [];
        for (let i = 0; i < track.times.length; i++) {
          const o = i * 4;
          q.set(track.values[o], track.values[o + 1], track.values[o + 2], track.values[o + 3]);
          e.setFromQuaternion(q, 'XYZ');
          xs.push(THREE.MathUtils.radToDeg(e.x).toFixed(3));
          ys.push(THREE.MathUtils.radToDeg(e.y).toFixed(3));
          zs.push(THREE.MathUtils.radToDeg(e.z).toFixed(3));
        }

        objectBlocks.push(`\tAnimationCurveNode: ${cnId}, "AnimCurveNode::R", "" {
\t\tProperties70:  {
\t\t\tP: "d|X", "Number", "", "A",0
\t\t\tP: "d|Y", "Number", "", "A",0
\t\t\tP: "d|Z", "Number", "", "A",0
\t\t}
\t}
\tAnimationCurve: ${cxId}, "AnimCurve::", "" {
\t\tDefault: 0
\t\tKeyTime: *${track.times.length} {\n\t\t\ta: ${timesStr}\n\t\t}
\t\tKeyValueFloat: *${xs.length} {\n\t\t\ta: ${xs.join(',')}\n\t\t}
\t}
\tAnimationCurve: ${cyId}, "AnimCurve::", "" {
\t\tDefault: 0
\t\tKeyTime: *${track.times.length} {\n\t\t\ta: ${timesStr}\n\t\t}
\t\tKeyValueFloat: *${ys.length} {\n\t\t\ta: ${ys.join(',')}\n\t\t}
\t}
\tAnimationCurve: ${czId}, "AnimCurve::", "" {
\t\tDefault: 0
\t\tKeyTime: *${track.times.length} {\n\t\t\ta: ${timesStr}\n\t\t}
\t\tKeyValueFloat: *${zs.length} {\n\t\t\ta: ${zs.join(',')}\n\t\t}
\t}`);
        connectionBlocks.push(`\tC: "OO",${cnId},${layerId}`);
        connectionBlocks.push(`\tC: "OP",${cnId},${boneEntry.id},"Lcl Rotation"`);
        connectionBlocks.push(`\tC: "OP",${cxId},${cnId},"d|X"`);
        connectionBlocks.push(`\tC: "OP",${cyId},${cnId},"d|Y"`);
        connectionBlocks.push(`\tC: "OP",${czId},${cnId},"d|Z"`);
      }
    }
  });

  const fbxAscii = `; FBX 7.4.0 project file
; Exported by AlexDesign 3D Studio
FBXHeaderExtension:  {
\tFBXHeaderVersion: 1003
\tFBXVersion: 7400
\tCreator: "AlexDesign Studio WebGL FBX 7.4"
\tSceneInfo: "SceneInfo::GlobalInfo", "UserData" {
\t\tType: "UserData"
\t\tVersion: 100
\t\tMetaData:  {
\t\t\tVersion: 100
\t\t\tTitle: "${assetName}"
\t\t}
\t}
}
GlobalSettings:  {
\tVersion: 1000
\tProperties70:  {
\t\tP: "UpAxis", "int", "Integer", "",1
\t\tP: "UpAxisSign", "int", "Integer", "",1
\t\tP: "FrontAxis", "int", "Integer", "",2
\t\tP: "FrontAxisSign", "int", "Integer", "",1
\t\tP: "CoordAxis", "int", "Integer", "",0
\t\tP: "CoordAxisSign", "int", "Integer", "",1
\t\tP: "UnitScaleFactor", "double", "Number", "",100
\t}
}
Objects:  {
${objectBlocks.join('\n')}
}
Connections:  {
${connectionBlocks.join('\n')}
}
`;

  return new Blob([fbxAscii], { type: 'application/octet-stream' });
}
