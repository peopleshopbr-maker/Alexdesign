import { RIG_PRESET_DEFINITIONS, StudioConfig } from '../types/studioConfig';
import { CodeExportObjectSpec } from './splineSceneObjects';

export interface BlenderPipelineParams {
  config: StudioConfig;
  assetName: string | null;
  targetTriangles: number;
  currentFrame: number;
  cameraLensMm: number;
  rotationMode: 'XYZ' | 'QUATERNION';
  objects: CodeExportObjectSpec[];
}

export function generateBlender53PipelinePy(params: BlenderPipelineParams): string {
  const {
    config,
    assetName,
    targetTriangles,
    currentFrame,
    cameraLensMm,
    rotationMode,
    objects,
  } = params;

  const rigDef = RIG_PRESET_DEFINITIONS[config.rigPreset];
  const safeAsset = (assetName || 'AlexDesign_Asset').replace(/[^a-zA-Z0-9_-]/g, '_');
  const boneLines = rigDef.bones
    .map(
      ([bName, parent, head, tail]) =>
        `    ("${bName}", ${parent ? `"${parent}"` : 'None'}, (${head[0]}, ${head[1]}, ${head[2]}), (${tail[0]}, ${tail[1]}, ${tail[2]})),`
    )
    .join('\n');

  const primLines =
    objects.length > 0
      ? objects
          .map(
            (o) =>
              `    spawn_objeto("${o.name}", "${o.kind}", (${o.position.map((v) => v.toFixed(3)).join(', ')}), (${o.scale.map((v) => v.toFixed(3)).join(', ')}))`
          )
          .join('\n')
      : `    pass  # Nenhum objeto extra; operando sobre a malha principal`;

  const angleRad = ((config.seamAngleDeg * Math.PI) / 180).toFixed(4);
  const effectiveTris = targetTriangles > 0 ? targetTriangles : 13744;

  return `# ============================================================================
# AlexDesign — Pipeline Completo Blender 5.3+ (Etapas 1 a 13)
# API compatível com Blender 5.0 / 5.3+ (sem propriedades descontinuadas)
# Ativo: ${safeAsset} | Rig: ${rigDef.label} | Lente: ${cameraLensMm.toFixed(1)}mm
# ============================================================================

import os
import math
import bpy
import bmesh
from mathutils import Vector, Matrix

# Nota Blender 5.3: modulos OpenEXR e opentimelineio nativos no ambiente Python
try:
    import OpenEXR  # type: ignore
    import opentimelineio as otio  # type: ignore
except ImportError:
    OpenEXR = None
    otio = None


# ----------------------------------------------------------------------------
# 1. IMPORTAR GLB / glTF (Edição livre em todo o pipeline)
# ----------------------------------------------------------------------------
def etapa_01_importar_glb_gltf(model_path: str | None = None):
    scene = bpy.context.scene
    col = bpy.data.collections.get("AlexDesign_Cena") or bpy.data.collections.new("AlexDesign_Cena")
    if col.name not in scene.collection.children:
        scene.collection.children.link(col)

    if model_path and os.path.isfile(model_path):
        bpy.ops.import_scene.gltf(filepath=model_path)
        imported = [o for o in bpy.context.selected_objects if o.type == "MESH"]
        for o in imported:
            if o.name not in col.objects:
                col.objects.link(o)
        if imported:
            bpy.context.view_layer.objects.active = imported[0]
            return imported[0]

    # Fallback procedural caso seja executado sem arquivo .glb/.gltf local
    mesh = bpy.data.meshes.new("${safeAsset}_Mesh")
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=3, radius=0.45)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("${safeAsset}", mesh)
    col.objects.link(obj)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    return obj


# ----------------------------------------------------------------------------
# 2. CENA E MODELAGEM (Blender 5.0+ get_transform / set_transform & Colecoes)
# ----------------------------------------------------------------------------
def etapa_02_cena_modelagem(obj: bpy.types.Object | None = None):
    scene = bpy.context.scene
    col = bpy.data.collections.get("AlexDesign_Cena") or bpy.data.collections.new("AlexDesign_Cena")
    if col.name not in scene.collection.children:
        scene.collection.children.link(col)

    if obj is None:
        obj = bpy.context.view_layer.objects.active

    # Blender 5.0+: leitura/escrita rapida de transformacoes via get_transform / set_transform
    if obj and hasattr(obj, "get_transform") and hasattr(obj, "set_transform"):
        loc, rot, scl = obj.get_transform()
        obj.set_transform(Vector((loc.x, loc.y, max(loc.z, 0.0))), rot, scl)
    elif obj:
        obj.location.z = max(obj.location.z, 0.0)

    if obj:
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

    def spawn_objeto(nome: str, tipo: str, pos, scl):
        m = bpy.data.meshes.new(f"{nome}_Mesh")
        bm_i = bmesh.new()
        if tipo == "sphere":
            bmesh.ops.create_uvsphere(bm_i, u_segments=24, v_segments=16, radius=0.38)
        elif tipo == "cone":
            bmesh.ops.create_cone(bm_i, cap_ends=True, cap_tris=False, segments=24, radius1=0.34, radius2=0.0, depth=0.74)
        else:
            bmesh.ops.create_cube(bm_i, size=0.65)
        bm_i.to_mesh(m)
        bm_i.free()
        o = bpy.data.objects.new(nome, m)
        col.objects.link(o)
        o.location = pos
        o.scale = scl

${primLines}
    return obj


# ----------------------------------------------------------------------------
# 3. ESCULTURA / DETALHAMENTO (Multires + API Unificada de Pinceis 5.0+)
# ----------------------------------------------------------------------------
def etapa_03_escultura(obj: bpy.types.Object):
    bpy.context.view_layer.objects.active = obj
    multires = obj.modifiers.new(name="Multires_Detalhe", type="MULTIRES")
    bpy.ops.object.mode_set(mode="SCULPT")

    # Blender 5.0+: estrutura unificada de pinceis e simetria radial
    ups = bpy.context.tool_settings.unified_paint_settings
    if hasattr(ups, "use_locked_size"):
        ups.use_locked_size = "SCENE"
    sculpt = bpy.context.tool_settings.sculpt
    sculpt.use_symmetry_x = True
    if hasattr(sculpt, "radial_symmetry"):
        sculpt.radial_symmetry = (1, 1, 1)

    bpy.ops.object.mode_set(mode="OBJECT")
    return multires


# ----------------------------------------------------------------------------
# 4. RETOPOLOGY (${effectiveTris.toLocaleString('pt-BR')} tris)
# ----------------------------------------------------------------------------
def etapa_04_retopology(obj: bpy.types.Object):
    # Limpeza direta com bmesh.new() + modificador REMESH / Voxel Remesh
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0001)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()

    remesh = obj.modifiers.new(name="Retopo_Voxel", type="REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.035
    remesh.use_smooth_shade = True

    bpy.context.view_layer.objects.active = obj
    # Operador nativo de remalhagem (alternativa: bpy.ops.object.quadriflow_remesh(target_faces=${Math.round(effectiveTris / 2)}))
    obj.data.remesh_voxel_size = 0.035
    bpy.ops.object.voxel_remesh()


# ----------------------------------------------------------------------------
# 5. UV UNWRAPPING
# ----------------------------------------------------------------------------
def etapa_05_uv_unwrapping(obj: bpy.types.Object):
    mesh = obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new(name="UVMap")
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(
        angle_limit=${angleRad},
        island_margin=${config.uvMargin.toFixed(3)},
    )
    bpy.ops.object.mode_set(mode="OBJECT")


# ----------------------------------------------------------------------------
# 6. MATERIAL & TEXTURING (Blender 5.0+: sem material.use_nodes, com interop_id 5.3)
# ----------------------------------------------------------------------------
def etapa_06_material_texturing(obj: bpy.types.Object):
    mat = bpy.data.materials.get("${safeAsset}_PBR") or bpy.data.materials.new(name="${safeAsset}_PBR")
    # Blender 5.0+: todos os materiais ja utilizam nos nativamente (use_nodes descontinuado)
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (420, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (120, 0)
    bsdf.inputs["Base Color"].default_value = (0.23, 0.29, 0.37, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Metallic"].default_value = 0.15
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_node = nt.nodes.new("ShaderNodeTexImage")
    tex_node.location = (-260, 120)
    if obj.data.materials:
        obj.data.materials[0] = mat
    else:
        obj.data.materials.append(mat)
    return mat


# ----------------------------------------------------------------------------
# 7. RIGGING (${rigDef.boneCount} ossos — Blender 5.3 constraints.new(..., name=...))
# ----------------------------------------------------------------------------
BONE_DEFINITIONS = [
${boneLines}
]

def etapa_07_rigging(target_obj: bpy.types.Object):
    arm_data = bpy.data.armatures.new("${safeAsset}_ArmatureData")
    arm_obj = bpy.data.objects.new("${safeAsset}_Armature", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.object.mode_set(mode="EDIT")
    created_bones = {}
    for b_name, parent_name, head, tail in BONE_DEFINITIONS:
        eb = arm_data.edit_bones.new(b_name)
        eb.head = head
        eb.tail = tail
        if parent_name and parent_name in created_bones:
            eb.parent = created_bones[parent_name]
        created_bones[b_name] = eb
    bpy.ops.object.mode_set(mode="OBJECT")

    # Restricoes em Blender 5.3 com argumento nomeado diretamente na criacao
    if "head" in arm_obj.pose.bones and "neck" in arm_obj.pose.bones:
        con = arm_obj.pose.bones["head"].constraints.new("COPY_ROTATION", name="Ctrl_Head_Follow")
        con.target = arm_obj
        con.subtarget = "neck"
        con.influence = 0.25

    arm_mod = target_obj.modifiers.new(name="Armature", type="ARMATURE")
    arm_mod.object = arm_obj
    for b_name, _, _, _ in BONE_DEFINITIONS:
        if b_name not in target_obj.vertex_groups:
            target_obj.vertex_groups.new(name=b_name)
    return arm_obj


# ----------------------------------------------------------------------------
# 8. ANIMATION (${currentFrame}f — Channelbags/Slots 5.0+ & convert_rotation_mode 5.3)
# ----------------------------------------------------------------------------
def etapa_08_animation(arm_obj: bpy.types.Object):
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = ${config.animEndFrame}
    scene.frame_set(${currentFrame})

    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="POSE")
    pelvis = arm_obj.pose.bones.get("pelvis")
    if pelvis:
        # Blender 5.3: metodo nativo convert_rotation_mode() em Object e PoseBone
        if hasattr(pelvis, "convert_rotation_mode"):
            pelvis.convert_rotation_mode("${rotationMode}")
        pelvis.location.z = 0.02
        pelvis.keyframe_insert(data_path="location", frame=${currentFrame})

    # Blender 5.3: acesso simplificado a marcadores via context.markers
    if hasattr(bpy.context, "markers") and bpy.context.markers is not None:
        bpy.context.markers.new("Pose_Principal", frame=${currentFrame})
    bpy.ops.object.mode_set(mode="OBJECT")


# ----------------------------------------------------------------------------
# 10. LIGHTS (Blender 5.0+: BLENDER_EEVEE estrito e world sem use_nodes)
# ----------------------------------------------------------------------------
def etapa_10_lights():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.image_settings.file_format = "PNG"

    if scene.world and scene.world.node_tree:
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (0.04, 0.05, 0.08, 1.0)
            bg.inputs[1].default_value = 1.0

    key_data = bpy.data.lights.new(name="Studio_Key_Area", type="AREA")
    key_data.energy = 180.0
    key_obj = bpy.data.objects.new(name="Studio_Key_Area", object_data=key_data)
    key_obj.location = (2.6, -2.8, 3.8)
    scene.collection.objects.link(key_obj)


# ----------------------------------------------------------------------------
# 12. GEOMETRY NODES (Grafo Procedural + Float32 mathutils)
# ----------------------------------------------------------------------------
def etapa_12_geometry_nodes(obj: bpy.types.Object):
    mod = obj.modifiers.new(name="GeometryNodes", type="NODES")
    ng = bpy.data.node_groups.new("AlexDesign_GeoNodes", "GeometryNodeTree")
    mod.node_group = ng
    ng.interface.new_socket(name="Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    ng.interface.new_socket(name="Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")

    in_node = ng.nodes.new("NodeGroupInput")
    in_node.location = (-260, 0)
    out_node = ng.nodes.new("NodeGroupOutput")
    out_node.location = (260, 0)
    set_shade = ng.nodes.new("GeometryNodeSetShadeSmooth")
    set_shade.location = (0, 0)
    ng.links.new(in_node.outputs["Geometry"], set_shade.inputs["Geometry"])
    ng.links.new(set_shade.outputs["Geometry"], out_node.inputs["Geometry"])


# ----------------------------------------------------------------------------
# 13. CAMERA SETUP (3/4 — cam.data.lens = ${cameraLensMm.toFixed(1)}mm)
# ----------------------------------------------------------------------------
def etapa_13_camera_setup():
    scene = bpy.context.scene
    cam_data = bpy.data.cameras.new(name="Studio_Camera")
    cam_data.lens = ${cameraLensMm.toFixed(1)}
    cam_obj = bpy.data.objects.new("Studio_Camera", cam_data)
    cam_obj.location = (1.85, -2.35, 1.45)
    direction = Vector((0.0, 0.0, 0.92)) - cam_obj.location
    cam_obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj
    return cam_obj


# ----------------------------------------------------------------------------
# 14. EXPORTAR (GLB / glTF + Render PNG Blender 5.3+)
# ----------------------------------------------------------------------------
def etapa_14_exportar(filepath: str = "${safeAsset}_final.glb", export_format: str = "GLB"):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format=export_format,
        use_selection=False,
        export_apply=True,
        export_animations=True,
    )
    return filepath


def run_full_pipeline():
    hero = etapa_01_importar_glb_gltf("${assetName || `${safeAsset}.glb`}")
    etapa_02_cena_modelagem(hero)
    etapa_03_escultura(hero)
    etapa_04_retopology(hero)
    etapa_05_uv_unwrapping(hero)
    etapa_06_material_texturing(hero)
    arm = etapa_07_rigging(hero)
    etapa_08_animation(arm)
    etapa_10_lights()
    etapa_12_geometry_nodes(hero)
    etapa_13_camera_setup()
    etapa_14_exportar("${safeAsset}_final.glb")


if __name__ == "__main__":
    run_full_pipeline()
`;
}
