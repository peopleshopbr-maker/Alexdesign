import {
  type TargetEngine,
  type ShaderPreset,
  type RigPreset,
  type BoneTuple,
  type RigPresetDefinition,
  RIG_PRESET_DEFINITIONS,
} from '../types/studioConfig';

export type {
  TargetEngine,
  ShaderPreset,
  RigPreset,
  BoneTuple,
  RigPresetDefinition,
};
export { RIG_PRESET_DEFINITIONS };
export type BlenderCompatTarget = '3.5_TO_5.3' | '5.3_EXT';

export interface AddonConfig {
  addonId: string;
  displayName: string;
  author: string;
  version: string;
  blenderTarget: BlenderCompatTarget;
  targetEngine: TargetEngine;
  rigPreset: RigPreset;
  textureResolution: 1024 | 2048 | 4096;
  uvMargin: number;
  seamAngleDeg: number;
  texelDensity: number;
  shaderPreset: ShaderPreset;
  outlineThickness: number;
  aoIntensity: number;
  normalStrength: number;
  bakeBaseColor: boolean;
  bakeRoughness: boolean;
  bakeMetallic: boolean;
  bakeNormal: boolean;
  bakeAO: boolean;
  generate21Bones: boolean;
  animStartFrame: number;
  animEndFrame: number;
  exportUvLayouts: boolean;
  exportPreviews: boolean;
}

export const DEFAULT_ADDON_CONFIG: AddonConfig = {
  addonId: 'pbr_autopipeline',
  displayName: 'PBR AutoPipeline (UV · Shading · Rig)',
  author: 'Technical Art Studio',
  version: '1.3.0',
  blenderTarget: '3.5_TO_5.3',
  targetEngine: 'UNITY',
  rigPreset: 'HUMANOIDE',
  textureResolution: 2048,
  uvMargin: 0.02,
  seamAngleDeg: 66.0,
  texelDensity: 10.24,
  shaderPreset: 'PBR_PRINCIPLED',
  outlineThickness: 0.008,
  aoIntensity: 0.85,
  normalStrength: 1.0,
  bakeBaseColor: true,
  bakeRoughness: true,
  bakeMetallic: true,
  bakeNormal: true,
  bakeAO: true,
  generate21Bones: true,
  animStartFrame: 1,
  animEndFrame: 60,
  exportUvLayouts: true,
  exportPreviews: true,
};

export interface GeneratedAddonFile {
  filename: string;
  language: 'python' | 'toml' | 'markdown';
  summary: string;
  content: string;
}

function pyBool(val: boolean): string {
  return val ? 'True' : 'False';
}

export function generateAddonFiles(config: AddonConfig): GeneratedAddonFile[] {
  const safeId = config.addonId.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'pbr_autopipeline';
  const minBlender = config.blenderTarget === '5.3_EXT' ? '5.3.0' : '3.5.0';
  const minTuple = config.blenderTarget === '5.3_EXT' ? '(5, 3, 0)' : '(3, 5, 0)';
  const versionTuple = config.version
    .split('.')
    .slice(0, 3)
    .map((n) => parseInt(n, 10) || 0);
  while (versionTuple.length < 3) versionTuple.push(0);

  const manifestToml = `# SPDX-License-Identifier: GPL-2.0-or-later
schema_version = "1.0.0"

id = "${safeId}"
version = "${config.version}"
name = "${config.displayName}"
tagline = "Automacao de Mapeamento UV, Shading PBR/Toon, Atlas de Texturas e Rigging 21 Ossos"
maintainer = "${config.author}"
type = "add-on"

blender_version_min = "${minBlender}"
license = ["SPDX:GPL-2.0-or-later"]

tags = ["UV", "Material", "Bake", "Rigging", "Animation"]

[permissions]
files = "Importar texturas PBR e exportar UV layouts, atlas PNG, previews e FBX/GLB"
`;

  const formatBoneTuples = (bones: readonly BoneTuple[]) =>
    bones
      .map(
        ([name, parent, head, tail]) =>
          `        ("${name}", ${parent ? `"${parent}"` : 'None'}, (${head.join(', ')}), (${tail.join(', ')})),`
      )
      .join('\n');

  const presetsPy = `# SPDX-License-Identifier: GPL-2.0-or-later
"""Configuracoes padrao e constantes de pipeline para Blender 3.5 a 5.3."""

DEFAULT_TEXTURE_RES = ${config.textureResolution}
DEFAULT_UV_MARGIN = ${config.uvMargin.toFixed(4)}
DEFAULT_SEAM_ANGLE_DEG = ${config.seamAngleDeg.toFixed(2)}
DEFAULT_TEXEL_DENSITY = ${config.texelDensity.toFixed(2)}
DEFAULT_SHADER_PRESET = "${config.shaderPreset}"
DEFAULT_OUTLINE_THICKNESS = ${config.outlineThickness.toFixed(4)}
DEFAULT_AO_INTENSITY = ${config.aoIntensity.toFixed(2)}
DEFAULT_NORMAL_STRENGTH = ${config.normalStrength.toFixed(2)}
DEFAULT_TARGET_ENGINE = "${config.targetEngine}"
DEFAULT_RIG_PRESET = "${config.rigPreset}"
DEFAULT_ANIM_START = ${config.animStartFrame}
DEFAULT_ANIM_END = ${config.animEndFrame}

BAKE_CHANNELS = {
    "BASE_COLOR": ${pyBool(config.bakeBaseColor)},
    "ROUGHNESS": ${pyBool(config.bakeRoughness)},
    "METALLIC": ${pyBool(config.bakeMetallic)},
    "NORMAL": ${pyBool(config.bakeNormal)},
    "AO": ${pyBool(config.bakeAO)},
}

# Predefinições estruturais de esqueleto compatíveis com Blender, Unity, UE5 e Godot
RIG_PRESETS = {
    "HUMANOIDE": [
${formatBoneTuples(RIG_PRESET_DEFINITIONS.HUMANOIDE.bones)}
    ],
    "BIPEDE": [
${formatBoneTuples(RIG_PRESET_DEFINITIONS.BIPEDE.bones)}
    ],
    "QUADRUPEDE": [
${formatBoneTuples(RIG_PRESET_DEFINITIONS.QUADRUPEDE.bones)}
    ],
}

STANDARD_21_BONES = RIG_PRESETS["HUMANOIDE"]
`;

  const operatorsUvPy = `# SPDX-License-Identifier: GPL-2.0-or-later
"""Modulo de mapeamento UV inteligente, empacotamento e exportacao de layouts."""

import math
import os
import bmesh
import bpy
from bpy.types import Operator


def analyze_geometry_and_mark_seams(obj, seam_angle_deg=66.0, clear_existing=True):
    """Analisa a geometria via BMesh e marca seams ideais por angulo diedro e arestas sharp."""
    if obj is None or obj.type != 'MESH':
        return {"seams_marked": 0, "total_edges": 0, "non_manifold": 0}

    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bm.edges.ensure_lookup_table()
    bm.faces.ensure_lookup_table()

    angle_threshold = math.radians(max(1.0, min(179.0, seam_angle_deg)))
    seams_marked = 0
    non_manifold_count = 0

    for edge in bm.edges:
        if clear_existing:
            edge.seam = False

        if not edge.is_manifold:
            non_manifold_count += 1
            edge.seam = True
            seams_marked += 1
            continue

        if len(edge.link_faces) == 2:
            face_angle = edge.calc_face_angle(0.0)
            is_sharp = not edge.smooth
            if face_angle >= angle_threshold or is_sharp:
                edge.seam = True
                seams_marked += 1

    bm.to_mesh(mesh)
    mesh.update()
    total_edges = len(mesh.edges)
    bm.free()

    return {
        "seams_marked": seams_marked,
        "total_edges": total_edges,
        "non_manifold": non_manifold_count,
    }


def smart_uv_map_object(
    context,
    obj,
    seam_angle_deg=66.0,
    uv_margin=0.02,
    use_texel_density=True,
    clear_existing_seams=True,
):
    """Executa mapeamento UV inteligente otimizando espaco de textura e minimizando sobreposicao.

    Compativel com Blender 3.5 ate Blender 5.3.
    """
    if obj is None or obj.type != 'MESH':
        raise ValueError("Selecione um objeto de malha (MESH) valido.")

    # Garante modo Object antes de manipular dados
    if context.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    context.view_layer.objects.active = obj

    # Garante existencia de UVMap ativo
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name="UVMap")
    obj.data.uv_layers.active_index = 0

    # 1. Analise geometrica e marcacao automatica de seams
    stats = analyze_geometry_and_mark_seams(
        obj,
        seam_angle_deg=seam_angle_deg,
        clear_existing=clear_existing_seams,
    )

    # 2. Unwrap em Edit Mode
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')

    if stats["seams_marked"] > 0:
        bpy.ops.uv.unwrap(
            method='ANGLE_BASED',
            fill_holes=True,
            correct_aspect=True,
            use_subsurf_data=False,
            margin=uv_margin,
        )
    else:
        # Fallback para malhas fechadas suaves sem quinas acentuadas
        bpy.ops.uv.smart_project(
            angle_limit=math.radians(seam_angle_deg),
            island_margin=uv_margin,
            area_weight=0.0,
            correct_aspect=True,
            scale_to_bounds=True,
        )

    # 3. Normalizacao de escala entre ilhas e empacotamento sem sobreposicao
    if use_texel_density:
        bpy.ops.uv.average_islands_scale()

    pack_kwargs = {
        "rotate": True,
        "margin": uv_margin,
    }
    if bpy.app.version >= (3, 6, 0):
        pack_kwargs["shape_method"] = 'CONCAVE'
        pack_kwargs["margin_method"] = 'SCALED'

    try:
        bpy.ops.uv.pack_islands(**pack_kwargs)
    except TypeError:
        bpy.ops.uv.pack_islands(rotate=True, margin=uv_margin)

    bpy.ops.object.mode_set(mode='OBJECT')
    return stats


def export_uv_layouts_for_objects(context, objects, output_dir, resolution=2048):
    """Exporta UV_all_parts.png, UV_all_parts_dark.png e layouts individuais por parte/material."""
    os.makedirs(output_dir, exist_ok=True)
    mesh_objects = [o for o in objects if o.type == 'MESH' and o.data.uv_layers]
    if not mesh_objects:
        return []

    exported = []
    if context.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objects:
        o.select_set(True)
    context.view_layer.objects.active = mesh_objects[0]

    # Layout unificado (transparente)
    all_path = os.path.join(output_dir, "UV_all_parts.png")
    bpy.ops.uv.export_layout(
        filepath=all_path,
        export_all=True,
        modified=False,
        mode='PNG',
        size=(resolution, resolution),
        opacity=0.25,
    )
    exported.append(all_path)

    # Layout por objeto individual
    for o in mesh_objects:
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        context.view_layer.objects.active = o
        safe_name = "".join(c if c.isalnum() or c in "_-" else "_" for c in o.name)
        part_path = os.path.join(output_dir, f"UV_{safe_name}.png")
        bpy.ops.uv.export_layout(
            filepath=part_path,
            export_all=True,
            modified=False,
            mode='PNG',
            size=(resolution, resolution),
            opacity=0.25,
        )
        exported.append(part_path)

    return exported


class PBR_OT_SmartUVMap(Operator):
    """Analisa geometria selecionada, marca seams por angulo e empacota UVs sem sobreposicao"""

    bl_idname = "pbr_pipeline.smart_uv_map"
    bl_label = "Mapeamento UV Inteligente"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        props = context.scene.pbr_autopipeline
        selected_meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not selected_meshes and context.active_object and context.active_object.type == 'MESH':
            selected_meshes = [context.active_object]

        if not selected_meshes:
            self.report({'WARNING'}, "Selecione ao menos um objeto Mesh para mapear UVs.")
            return {'CANCELLED'}

        total_seams = 0
        for obj in selected_meshes:
            stats = smart_uv_map_object(
                context,
                obj,
                seam_angle_deg=props.seam_angle,
                uv_margin=props.uv_margin,
                use_texel_density=props.normalize_texel_density,
                clear_existing_seams=props.clear_existing_seams,
            )
            total_seams += stats["seams_marked"]

        # Empacotamento multi-objeto conjunto quando ha mais de 1 parte (atlas unico)
        if len(selected_meshes) > 1 and props.pack_multi_object_atlas:
            bpy.ops.object.select_all(action='DESELECT')
            for obj in selected_meshes:
                obj.select_set(True)
            context.view_layer.objects.active = selected_meshes[0]
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.average_islands_scale()
            bpy.ops.uv.pack_islands(rotate=True, margin=props.uv_margin)
            bpy.ops.object.mode_set(mode='OBJECT')

        if props.export_uv_layouts:
            base_dir = bpy.path.abspath("//uv_layouts") if bpy.data.filepath else os.path.join(
                bpy.app.tempdir, "uv_layouts"
            )
            export_uv_layouts_for_objects(context, selected_meshes, base_dir, resolution=int(props.texture_res))

        self.report(
            {'INFO'},
            f"UVs otimizadas em {len(selected_meshes)} objeto(s) | Seams marcados: {total_seams}",
        )
        return {'FINISHED'}


class PBR_OT_ExportUVLayouts(Operator):
    """Exporta mapas PNG de referencia dos layouts UV"""

    bl_idname = "pbr_pipeline.export_uv_layouts"
    bl_label = "Exportar Layouts UV (.png)"
    bl_options = {'REGISTER'}

    def execute(self, context):
        props = context.scene.pbr_autopipeline
        meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not meshes:
            self.report({'WARNING'}, "Selecione objetos Mesh com UVMap para exportar.")
            return {'CANCELLED'}

        base_dir = bpy.path.abspath("//uv_layouts") if bpy.data.filepath else os.path.join(
            bpy.app.tempdir, "uv_layouts"
        )
        files = export_uv_layouts_for_objects(context, meshes, base_dir, resolution=int(props.texture_res))
        self.report({'INFO'}, f"{len(files)} layout(s) UV exportado(s) em: {base_dir}")
        return {'FINISHED'}
`;

  const operatorsPbrPy = `# SPDX-License-Identifier: GPL-2.0-or-later
"""Modulo de Shading PBR modular (Blender 3.5 a 5.3), Cel-Shading Borde e Atlas Baking."""

import os
import bpy
from bpy.types import Operator


TEXTURE_ROLE_SUFFIXES = {
    "base_color": ("_basecolor", "_albedo", "_diffuse", "_color", "_col", "_d"),
    "roughness": ("_roughness", "_rough", "_r"),
    "metallic": ("_metallic", "_metalness", "_metal", "_m"),
    "normal": ("_normal", "_norm", "_nrm", "_n"),
    "ao": ("_ao", "_ambient_occlusion", "_occlusion"),
}


def _add_group_socket(node_tree, name, in_out, socket_type, default_value=None, min_val=None, max_val=None):
    """Cria sockets de Group compativel com Blender 3.5 (inputs/outputs) e 4.0+/5.3 (interface)."""
    if hasattr(node_tree, "interface"):
        sock = node_tree.interface.new_socket(name=name, in_out=in_out, socket_type=socket_type)
        if default_value is not None and hasattr(sock, "default_value"):
            sock.default_value = default_value
        if min_val is not None and hasattr(sock, "min_value"):
            sock.min_value = min_val
        if max_val is not None and hasattr(sock, "max_value"):
            sock.max_value = max_val
        return sock

    collection = node_tree.inputs if in_out == 'INPUT' else node_tree.outputs
    sock = collection.new(socket_type, name)
    if default_value is not None and hasattr(sock, "default_value"):
        sock.default_value = default_value
    if min_val is not None and hasattr(sock, "min_value"):
        sock.min_value = min_val
    if max_val is not None and hasattr(sock, "max_value"):
        sock.max_value = max_val
    return sock


def get_or_create_pbr_node_group(group_name="PBR_Master_Shader"):
    """Gera um No de Shader PBR reutilizavel com entradas para Base Color, Roughness, Metallic, Normal e AO."""
    if group_name in bpy.data.node_groups:
        return bpy.data.node_groups[group_name]

    ng = bpy.data.node_groups.new(group_name, 'ShaderNodeTree')

    # Entradas e Saidas do No PBR
    _add_group_socket(ng, "Base Color", 'INPUT', 'NodeSocketColor', (0.8, 0.8, 0.8, 1.0))
    _add_group_socket(ng, "Ambient Occlusion", 'INPUT', 'NodeSocketColor', (1.0, 1.0, 1.0, 1.0))
    _add_group_socket(ng, "AO Intensity", 'INPUT', 'NodeSocketFloat', 0.85, 0.0, 1.0)
    _add_group_socket(ng, "Roughness", 'INPUT', 'NodeSocketFloat', 0.5, 0.0, 1.0)
    _add_group_socket(ng, "Metallic", 'INPUT', 'NodeSocketFloat', 0.0, 0.0, 1.0)
    _add_group_socket(ng, "Normal Map", 'INPUT', 'NodeSocketColor', (0.5, 0.5, 1.0, 1.0))
    _add_group_socket(ng, "Normal Strength", 'INPUT', 'NodeSocketFloat', 1.0, 0.0, 4.0)
    _add_group_socket(ng, "BSDF", 'OUTPUT', 'NodeSocketShader')

    nodes = ng.nodes
    links = ng.links

    group_in = nodes.new('NodeGroupInput')
    group_in.location = (-680, 0)

    group_out = nodes.new('NodeGroupOutput')
    group_out.location = (420, 0)

    # Multiplicador de Oclusao de Ambiente (AO) sobre a Cor Base
    ao_mix = None
    if bpy.app.version >= (3, 4, 0) and 'ShaderNodeMix' in dir(bpy.types):
        ao_mix = nodes.new('ShaderNodeMix')
        ao_mix.data_type = 'RGBA'
        ao_mix.blend_type = 'MULTIPLY'
        ao_mix.location = (-340, 220)
        links.new(group_in.outputs["AO Intensity"], ao_mix.inputs[0])
        links.new(group_in.outputs["Base Color"], ao_mix.inputs[6])
        links.new(group_in.outputs["Ambient Occlusion"], ao_mix.inputs[7])
        ao_out_socket = ao_mix.outputs[2]
    else:
        ao_mix = nodes.new('ShaderNodeMixRGB')
        ao_mix.blend_type = 'MULTIPLY'
        ao_mix.location = (-340, 220)
        links.new(group_in.outputs["AO Intensity"], ao_mix.inputs["Fac"])
        links.new(group_in.outputs["Base Color"], ao_mix.inputs["Color1"])
        links.new(group_in.outputs["Ambient Occlusion"], ao_mix.inputs["Color2"])
        ao_out_socket = ao_mix.outputs["Color"]

    # Normal Map Node
    normal_node = nodes.new('ShaderNodeNormalMap')
    normal_node.space = 'TANGENT'
    normal_node.location = (-340, -180)
    links.new(group_in.outputs["Normal Strength"], normal_node.inputs["Strength"])
    links.new(group_in.outputs["Normal Map"], normal_node.inputs["Color"])

    # Principled BSDF (compativel com Blender 3.5 e 4.0+/5.3)
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.location = (40, 60)

    links.new(ao_out_socket, bsdf.inputs["Base Color"])
    links.new(group_in.outputs["Roughness"], bsdf.inputs["Roughness"])
    links.new(group_in.outputs["Metallic"], bsdf.inputs["Metallic"])
    links.new(normal_node.outputs["Normal"], bsdf.inputs["Normal"])

    # Ajuste Specular compativel entre versoes
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.5
    elif "Specular" in bsdf.inputs:
        bsdf.inputs["Specular"].default_value = 0.5

    links.new(bsdf.outputs["BSDF"], group_out.inputs["BSDF"])
    return ng


def create_pbr_material(
    material_name="PBR_AutoPipeline_Mat",
    texture_paths=None,
    ao_intensity=0.85,
    normal_strength=1.0,
    shader_preset="PBR_PRINCIPLED",
):
    """Cria material PBR completo usando o ShaderNodeGroup com nos Image Texture pre-conectados."""
    mat = bpy.data.materials.get(material_name) or bpy.data.materials.new(name=material_name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    nodes = nt.nodes
    links = nt.links

    tex_coord = nodes.new('ShaderNodeTexCoord')
    tex_coord.location = (-1080, 0)

    mapping = nodes.new('ShaderNodeMapping')
    mapping.location = (-880, 0)
    links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])

    pbr_group_tree = get_or_create_pbr_node_group("PBR_Master_Shader")
    pbr_group = nodes.new('ShaderNodeGroup')
    pbr_group.node_tree = pbr_group_tree
    pbr_group.location = (-120, 80)
    pbr_group.inputs["AO Intensity"].default_value = ao_intensity
    pbr_group.inputs["Normal Strength"].default_value = normal_strength

    mat_out = nodes.new('ShaderNodeOutputMaterial')
    mat_out.location = (480, 80)

    # Configuracao dos 5 Image Texture Nodes para conexao imediata
    slots = [
        ("Base Color", "Tex_BaseColor", "sRGB", 360),
        ("Ambient Occlusion", "Tex_AO", "Non-Color", 140),
        ("Roughness", "Tex_Roughness", "Non-Color", -80),
        ("Metallic", "Tex_Metallic", "Non-Color", -300),
        ("Normal Map", "Tex_Normal", "Non-Color", -520),
    ]

    texture_paths = texture_paths or {}
    role_key_map = {
        "Base Color": "base_color",
        "Ambient Occlusion": "ao",
        "Roughness": "roughness",
        "Metallic": "metallic",
        "Normal Map": "normal",
    }

    for socket_name, node_label, colorspace, y_pos in slots:
        tex_node = nodes.new('ShaderNodeTexImage')
        tex_node.name = node_label
        tex_node.label = node_label
        tex_node.location = (-560, y_pos)
        links.new(mapping.outputs["Vector"], tex_node.inputs["Vector"])

        role_key = role_key_map[socket_name]
        img_path = texture_paths.get(role_key)
        if img_path and os.path.isfile(img_path):
            img = bpy.data.images.load(img_path, check_existing=True)
            img.colorspace_settings.name = colorspace
            tex_node.image = img
            links.new(tex_node.outputs["Color"], pbr_group.inputs[socket_name])
        else:
            # Cria ligacao pronta caso usuario associe imagem manualmente depois;
            # usa valor padrao seguro se nenhuma imagem estiver carregada.
            tex_node.image = None

    if shader_preset in ("PBR_CEL_OUTLINE", "ANIME_TOON"):
        # Cel-Shading hibrido: converte iluminacao PBR em degraus estilizados mantendo textura Base Color
        s2rgb = nodes.new('ShaderNodeShaderToRGB')
        s2rgb.location = (100, 80)
        ramp = nodes.new('ShaderNodeValToRGB')
        ramp.location = (270, 80)
        ramp.color_ramp.interpolation = 'CONSTANT'
        ramp.color_ramp.elements[0].position = 0.0
        ramp.color_ramp.elements[0].color = (0.35, 0.35, 0.42, 1.0)
        ramp.color_ramp.elements[1].position = 0.42
        ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
        links.new(pbr_group.outputs["BSDF"], s2rgb.inputs["Shader"])
        links.new(s2rgb.outputs["Color"], ramp.inputs["Fac"])
        links.new(ramp.outputs["Color"], mat_out.inputs["Surface"])
    else:
        links.new(pbr_group.outputs["BSDF"], mat_out.inputs["Surface"])

    return mat


def apply_borde_outline(obj, thickness=0.008):
    """Adiciona material Borde (backface culling) e modificador Solidify para contorno Anime/NPR."""
    if obj is None or obj.type != 'MESH':
        return

    borde_mat = bpy.data.materials.get("Borde") or bpy.data.materials.new(name="Borde")
    borde_mat.use_nodes = True
    borde_mat.use_backface_culling = True
    borde_mat.node_tree.nodes.clear()
    out = borde_mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    emit = borde_mat.node_tree.nodes.new('ShaderNodeEmission')
    emit.inputs["Color"].default_value = (0.04, 0.04, 0.06, 1.0)
    borde_mat.node_tree.links.new(emit.outputs["Emission"], out.inputs["Surface"])

    if "Borde" not in [m.name for m in obj.data.materials if m]:
        obj.data.materials.append(borde_mat)
    borde_idx = list(obj.data.materials).index(borde_mat)

    mod = obj.modifiers.get("AutoPipeline_Borde") or obj.modifiers.new("AutoPipeline_Borde", 'SOLIDIFY')
    mod.thickness = -abs(thickness)
    mod.offset = 1.0
    mod.use_flip_normals = True
    mod.material_offset = borde_idx


def scan_pbr_textures_in_folder(folder_path):
    """Mapeia arquivos de textura PBR por sufixo padrao."""
    found = {}
    if not folder_path or not os.path.isdir(folder_path):
        return found

    valid_exts = (".png", ".jpg", ".jpeg", ".tga", ".exr", ".tif", ".tiff")
    for fname in os.listdir(folder_path):
        lower = fname.lower()
        if not lower.endswith(valid_exts):
            continue
        stem = os.path.splitext(lower)[0]
        for role, suffixes in TEXTURE_ROLE_SUFFIXES.items():
            if role not in found and any(stem.endswith(sfx) for sfx in suffixes):
                found[role] = os.path.join(folder_path, fname)
    return found


def bake_pbr_atlas(context, objects, output_dir, resolution=2048, channels=None):
    """Realiza bake Cycles para um Atlas unico (Base Color, Roughness, Normal, AO)."""
    os.makedirs(output_dir, exist_ok=True)
    channels = channels or {"BASE_COLOR": True, "ROUGHNESS": True, "NORMAL": True, "AO": True}

    mesh_objects = [o for o in objects if o.type == 'MESH' and o.data.uv_layers]
    if not mesh_objects:
        return []

    scene = context.scene
    prev_engine = scene.render.engine
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 16

    bpy.ops.object.select_all(action='DESELECT')
    for o in mesh_objects:
        o.select_set(True)
    context.view_layer.objects.active = mesh_objects[0]

    baked_files = []
    bake_map_cfg = [
        ("BASE_COLOR", 'DIFFUSE', "atlas_basecolor.png", "sRGB"),
        ("ROUGHNESS", 'ROUGHNESS', "atlas_roughness.png", "Non-Color"),
        ("NORMAL", 'NORMAL', "atlas_normal.png", "Non-Color"),
        ("AO", 'AO', "atlas_ao.png", "Non-Color"),
    ]

    for key, bake_type, filename, colorspace in bake_map_cfg:
        if not channels.get(key):
            continue
        img = bpy.data.images.new(filename, width=resolution, height=resolution, alpha=True)
        img.colorspace_settings.name = colorspace

        # Anexa imagem alvo temporaria em cada material para receber o bake
        temp_nodes = []
        for obj in mesh_objects:
            for mat in obj.data.materials:
                if mat and mat.use_nodes:
                    nt = mat.node_tree
                    t_node = nt.nodes.new('ShaderNodeTexImage')
                    t_node.image = img
                    nt.nodes.active = t_node
                    temp_nodes.append((nt, t_node))

        if bake_type == 'DIFFUSE':
            scene.render.bake.use_pass_direct = False
            scene.render.bake.use_pass_indirect = False
            scene.render.bake.use_pass_color = True
        bpy.ops.object.bake(type=bake_type, margin=8)

        out_path = os.path.join(output_dir, filename)
        img.filepath_raw = out_path
        img.file_format = 'PNG'
        img.save()
        baked_files.append(out_path)

        for nt, t_node in temp_nodes:
            nt.nodes.remove(t_node)

    scene.render.engine = prev_engine
    return baked_files


class PBR_OT_BuildPBRShader(Operator):
    """Cria e aplica o shader PBR modular (Base Color, Roughness, Metallic, Normal, AO)"""

    bl_idname = "pbr_pipeline.build_pbr_shader"
    bl_label = "Gerar Shader PBR Modular"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        props = context.scene.pbr_autopipeline
        meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not meshes and context.active_object and context.active_object.type == 'MESH':
            meshes = [context.active_object]

        if not meshes:
            self.report({'WARNING'}, "Selecione ao menos um objeto Mesh para aplicar o shader PBR.")
            return {'CANCELLED'}

        tex_folder = bpy.path.abspath(props.textures_dir) if props.textures_dir else ""
        tex_paths = scan_pbr_textures_in_folder(tex_folder)

        for obj in meshes:
            mat_name = f"{obj.name}_PBR"
            mat = create_pbr_material(
                material_name=mat_name,
                texture_paths=tex_paths,
                ao_intensity=props.ao_intensity,
                normal_strength=props.normal_strength,
                shader_preset=props.shader_preset,
            )
            if not obj.data.materials:
                obj.data.materials.append(mat)
            else:
                obj.data.materials[0] = mat

            if props.shader_preset == 'PBR_CEL_OUTLINE':
                apply_borde_outline(obj, thickness=props.outline_thickness)

        self.report({'INFO'}, f"Shader PBR aplicado em {len(meshes)} objeto(s) | Mapas detectados: {len(tex_paths)}")
        return {'FINISHED'}


class PBR_OT_BakeAtlasTextures(Operator):
    """Executa bake Cycles dos canais PBR para Atlas 2D unificado"""

    bl_idname = "pbr_pipeline.bake_atlas"
    bl_label = "Bake Atlas PBR"
    bl_options = {'REGISTER'}

    def execute(self, context):
        props = context.scene.pbr_autopipeline
        meshes = [o for o in context.selected_objects if o.type == 'MESH']
        if not meshes:
            self.report({'WARNING'}, "Selecione objetos Mesh com UVMap para gerar Atlas.")
            return {'CANCELLED'}

        out_dir = bpy.path.abspath("//textures") if bpy.data.filepath else os.path.join(bpy.app.tempdir, "textures")
        channels = {
            "BASE_COLOR": props.bake_base_color,
            "ROUGHNESS": props.bake_roughness,
            "NORMAL": props.bake_normal,
            "AO": props.bake_ao,
        }
        files = bake_pbr_atlas(context, meshes, out_dir, resolution=int(props.texture_res), channels=channels)
        self.report({'INFO'}, f"Bake concluido: {len(files)} mapa(s) salvo(s) em {out_dir}")
        return {'FINISHED'}
`;

  const operatorsAnimPy = `# SPDX-License-Identifier: GPL-2.0-or-later
"""Modulo de Rigging 21 Ossos, Test_Rig_Animation (frames 1-60), Previews e Exportacao."""

import math
import os
import bpy
from bpy.props import StringProperty
from bpy.types import Operator
from bpy_extras.io_utils import ImportHelper
from mathutils import Vector

from .presets import RIG_PRESETS, DEFAULT_RIG_PRESET


def create_preset_armature(context, rig_preset=DEFAULT_RIG_PRESET, name=None):
    """Cria Armature estrutural conforme a predefinicao escolhida (HUMANOIDE, BIPEDE ou QUADRUPEDE)."""
    if context.mode != 'OBJECT':
        bpy.ops.object.mode_set(mode='OBJECT')

    bones_def = RIG_PRESETS.get(rig_preset, RIG_PRESETS["HUMANOIDE"])
    arm_name = name or f"Armature_{rig_preset.title()}"

    arm_data = bpy.data.armatures.new(arm_name)
    arm_obj = bpy.data.objects.new(arm_name, arm_data)
    context.collection.objects.link(arm_obj)

    bpy.ops.object.select_all(action='DESELECT')
    arm_obj.select_set(True)
    context.view_layer.objects.active = arm_obj

    bpy.ops.object.mode_set(mode='EDIT')
    edit_bones = arm_data.edit_bones
    created = {}

    for bone_name, parent_name, head, tail in bones_def:
        eb = edit_bones.new(bone_name)
        eb.head = Vector(head)
        eb.tail = Vector(tail)
        if parent_name and parent_name in created:
            eb.parent = created[parent_name]
        created[bone_name] = eb

    bpy.ops.object.mode_set(mode='OBJECT')
    return arm_obj


def create_standardized_21_bone_armature(context, name="Armature_21Bones"):
    """Wrapper retrocompativel para criar a Armature Humanoide de 21 ossos."""
    return create_preset_armature(context, rig_preset="HUMANOIDE", name=name)


def generate_test_rig_animation(arm_obj, start_frame=1, end_frame=60):
    """Gera acao Test_Rig_Animation (frames 1 a 60) adaptada aos ossos do preset ativo."""
    if arm_obj is None or arm_obj.type != 'ARMATURE':
        return None

    action = bpy.data.actions.get("Test_Rig_Animation") or bpy.data.actions.new("Test_Rig_Animation")
    arm_obj.animation_data_create()
    arm_obj.animation_data.action = action

    mid_a = start_frame + (end_frame - start_frame) // 3
    mid_b = start_frame + 2 * (end_frame - start_frame) // 3

    pose_bones = arm_obj.pose.bones
    keyframes = [
        ("spine_01", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (0.06, 0.0, 0.08)), (mid_b, (-0.04, 0.0, -0.08)), (end_frame, (0.0, 0.0, 0.0))]),
        ("spine", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (0.06, 0.0, 0.08)), (mid_b, (-0.04, 0.0, -0.08)), (end_frame, (0.0, 0.0, 0.0))]),
        ("head", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (0.08, 0.0, 0.18)), (mid_b, (-0.05, 0.0, -0.18)), (end_frame, (0.0, 0.0, 0.0))]),
        ("upper_arm_L", [(start_frame, (0.0, 0.0, -0.85)), (mid_a, (0.25, 0.0, -0.55)), (mid_b, (-0.20, 0.0, -0.95)), (end_frame, (0.0, 0.0, -0.85))]),
        ("upper_arm_R", [(start_frame, (0.0, 0.0, 0.85)), (mid_a, (-0.20, 0.0, 0.95)), (mid_b, (0.25, 0.0, 0.55)), (end_frame, (0.0, 0.0, 0.85))]),
        ("thigh_L", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (0.32, 0.0, 0.0)), (mid_b, (-0.22, 0.0, 0.0)), (end_frame, (0.0, 0.0, 0.0))]),
        ("thigh_R", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (-0.22, 0.0, 0.0)), (mid_b, (0.32, 0.0, 0.0)), (end_frame, (0.0, 0.0, 0.0))]),
        ("front_thigh_L", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (0.28, 0.0, 0.0)), (mid_b, (-0.24, 0.0, 0.0)), (end_frame, (0.0, 0.0, 0.0))]),
        ("front_thigh_R", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (-0.24, 0.0, 0.0)), (mid_b, (0.28, 0.0, 0.0)), (end_frame, (0.0, 0.0, 0.0))]),
        ("hind_thigh_L", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (-0.24, 0.0, 0.0)), (mid_b, (0.28, 0.0, 0.0)), (end_frame, (0.0, 0.0, 0.0))]),
        ("hind_thigh_R", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (0.28, 0.0, 0.0)), (mid_b, (-0.24, 0.0, 0.0)), (end_frame, (0.0, 0.0, 0.0))]),
        ("tail_01", [(start_frame, (0.0, 0.0, 0.0)), (mid_a, (0.08, 0.0, 0.25)), (mid_b, (0.08, 0.0, -0.25)), (end_frame, (0.0, 0.0, 0.0))]),
    ]

    for b_name, frames in keyframes:
        pb = pose_bones.get(b_name)
        if not pb:
            continue
        pb.rotation_mode = 'XYZ'
        for frame, rot in frames:
            pb.rotation_euler = rot
            pb.keyframe_insert(data_path="rotation_euler", frame=frame)

    return action


def render_four_angle_previews(context, output_dir):
    """Renderiza preview_front.png, preview_side.png, preview_back.png e preview_q34.png."""
    os.makedirs(output_dir, exist_ok=True)
    scene = context.scene
    cam = scene.camera
    created_cam = False
    if cam is None:
        cam_data = bpy.data.cameras.new("AutoPipeline_PreviewCam")
        cam = bpy.data.objects.new("AutoPipeline_PreviewCam", cam_data)
        context.collection.objects.link(cam)
        scene.camera = cam
        created_cam = True

    target = Vector((0.0, 0.0, 0.9))
    views = [
        ("preview_front.png", Vector((0.0, -3.2, 1.05))),
        ("preview_side.png", Vector((3.2, 0.0, 1.05))),
        ("preview_back.png", Vector((0.0, 3.2, 1.05))),
        ("preview_q34.png", Vector((2.2, -2.4, 1.45))),
    ]

    prev_res_x = scene.render.resolution_x
    prev_res_y = scene.render.resolution_y
    prev_path = scene.render.filepath
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024

    rendered = []
    for fname, pos in views:
        cam.location = pos
        direction = target - cam.location
        cam.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        out_path = os.path.join(output_dir, fname)
        scene.render.filepath = out_path
        bpy.ops.render.render(write_still=True)
        rendered.append(out_path)

    scene.render.resolution_x = prev_res_x
    scene.render.resolution_y = prev_res_y
    scene.render.filepath = prev_path
    if created_cam:
        bpy.data.objects.remove(cam, do_unlink=True)
    return rendered


class PBR_OT_SetupRigAndAnimation(Operator):
    """Cria Armature conforme predefinicao (Humanoide/Bipede/Quadrupede) e gera Test_Rig_Animation"""

    bl_idname = "pbr_pipeline.setup_rig_anim"
    bl_label = "Gerar Rig + Animacao Teste"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        props = context.scene.pbr_autopipeline
        meshes = [o for o in context.selected_objects if o.type == 'MESH']
        arm = create_preset_armature(context, rig_preset=props.rig_preset)

        if meshes:
            bpy.ops.object.select_all(action='DESELECT')
            for m in meshes:
                m.select_set(True)
            arm.select_set(True)
            context.view_layer.objects.active = arm
            bpy.ops.object.parent_set(type='ARMATURE_AUTO')

        generate_test_rig_animation(arm, start_frame=props.anim_start, end_frame=props.anim_end)
        context.scene.frame_start = props.anim_start
        context.scene.frame_end = props.anim_end

        bone_count = len(RIG_PRESETS.get(props.rig_preset, []))
        self.report(
            {'INFO'},
            f"Armature {props.rig_preset} ({bone_count} ossos) criada e Test_Rig_Animation ({props.anim_start}-{props.anim_end}) gerada.",
        )
        return {'FINISHED'}


class PBR_OT_ImportGLTF(Operator, ImportHelper):
    """Importa arquivo GLB ou glTF para a cena do Blender pronto para mapeamento UV e shading PBR"""

    bl_idname = "pbr_pipeline.import_gltf"
    bl_label = "Importar GLB / glTF"
    bl_options = {'REGISTER', 'UNDO'}

    filename_ext = ".glb"
    filter_glob: StringProperty(
        default="*.glb;*.gltf",
        options={'HIDDEN'},
    )

    def execute(self, context):
        if not self.filepath or not os.path.isfile(self.filepath):
            self.report({'ERROR'}, "Arquivo GLB/glTF nao encontrado.")
            return {'CANCELLED'}

        try:
            bpy.ops.import_scene.gltf(filepath=self.filepath)
        except Exception as exc:
            self.report({'ERROR'}, f"Falha ao importar GLB/glTF: {exc}")
            return {'CANCELLED'}

        imported_meshes = [o for o in context.selected_objects if o.type == 'MESH']
        self.report(
            {'INFO'},
            f"GLB/glTF importado com sucesso: {len(imported_meshes)} malha(s) selecionada(s).",
        )
        return {'FINISHED'}


class PBR_OT_ExportEngineAsset(Operator):
    """Exporta ativo pronto em FBX e GLB/glTF para Unity, UE5 e Godot"""

    bl_idname = "pbr_pipeline.export_asset"
    bl_label = "Exportar FBX / GLB / glTF"
    bl_options = {'REGISTER'}

    def execute(self, context):
        props = context.scene.pbr_autopipeline
        out_dir = bpy.path.abspath("//exports") if bpy.data.filepath else os.path.join(bpy.app.tempdir, "exports")
        os.makedirs(out_dir, exist_ok=True)

        fbx_path = os.path.join(out_dir, f"Asset_{props.target_engine}.fbx")
        gltf_ext = "glb" if props.gltf_format == 'GLB' else "gltf"
        gltf_path = os.path.join(out_dir, f"Asset_{props.target_engine}.{gltf_ext}")

        axis_forward = '-Z' if props.target_engine in ('UNITY', 'GODOT') else '-Y'
        bpy.ops.export_scene.fbx(
            filepath=fbx_path,
            use_selection=bool(context.selected_objects),
            path_mode='COPY',
            embed_textures=True,
            axis_forward=axis_forward,
            axis_up='Y',
            bake_anim=True,
        )
        bpy.ops.export_scene.gltf(
            filepath=gltf_path,
            use_selection=bool(context.selected_objects),
            export_format=props.gltf_format,
            export_texcoords=True,
            export_normals=True,
            export_materials='EXPORT',
            export_animations=True,
        )

        if props.export_previews:
            prev_dir = bpy.path.abspath("//previews") if bpy.data.filepath else os.path.join(
                bpy.app.tempdir, "previews"
            )
            render_four_angle_previews(context, prev_dir)

        self.report({'INFO'}, f"Exportado FBX e {gltf_ext.upper()} para {props.target_engine} em: {out_dir}")
        return {'FINISHED'}


class PBR_OT_RunFullPipeline(Operator):
    """Executa pipeline completo: UV Smart -> Shader PBR -> Bake Atlas -> Rig 21 Ossos"""

    bl_idname = "pbr_pipeline.run_full_pipeline"
    bl_label = "Executar Pipeline Completo"
    bl_options = {'REGISTER', 'UNDO'}

    def execute(self, context):
        bpy.ops.pbr_pipeline.smart_uv_map()
        bpy.ops.pbr_pipeline.build_pbr_shader()
        bpy.ops.pbr_pipeline.setup_rig_anim()
        self.report({'INFO'}, "Pipeline UV + Shader PBR + Rig 21 Ossos concluido com sucesso.")
        return {'FINISHED'}
`;

  const uiPanelsPy = `# SPDX-License-Identifier: GPL-2.0-or-later
"""Paineis de interface no Sidebar (N-Panel) do 3D Viewport."""

from bpy.types import Panel


class VIEW3D_PT_pbr_autopipeline_main(Panel):
    bl_label = "PBR AutoPipeline 5.3"
    bl_idname = "VIEW3D_PT_pbr_autopipeline_main"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "PBR Pipeline"

    def draw(self, context):
        layout = self.layout
        props = context.scene.pbr_autopipeline

        col = layout.column(align=True)
        col.scale_y = 1.25
        col.operator("pbr_pipeline.run_full_pipeline", icon='PLAY')
        layout.operator("pbr_pipeline.import_gltf", text="Importar GLB / glTF", icon='IMPORT')

        layout.separator()
        box_uv = layout.box()
        box_uv.label(text="1. Mapeamento UV Inteligente", icon='UV')
        box_uv.prop(props, "seam_angle")
        box_uv.prop(props, "uv_margin")
        box_uv.prop(props, "normalize_texel_density")
        box_uv.prop(props, "pack_multi_object_atlas")
        box_uv.prop(props, "export_uv_layouts")
        row_uv = box_uv.row(align=True)
        row_uv.operator("pbr_pipeline.smart_uv_map", text="Auto UV & Pack")
        row_uv.operator("pbr_pipeline.export_uv_layouts", text="Export PNG")

        box_sh = layout.box()
        box_sh.label(text="2. Shading PBR & Texturas", icon='SHADING_RENDERED')
        box_sh.prop(props, "shader_preset")
        box_sh.prop(props, "textures_dir")
        box_sh.prop(props, "ao_intensity")
        box_sh.prop(props, "normal_strength")
        if props.shader_preset == 'PBR_CEL_OUTLINE':
            box_sh.prop(props, "outline_thickness")
        box_sh.prop(props, "texture_res")
        row_sh = box_sh.row(align=True)
        row_sh.operator("pbr_pipeline.build_pbr_shader", text="Aplicar Shader PBR")
        row_sh.operator("pbr_pipeline.bake_atlas", text="Bake Atlas")

        box_an = layout.box()
        box_an.label(text="3. Rigging & Exportacao GLB/glTF", icon='ARMATURE_DATA')
        box_an.prop(props, "rig_preset")
        row_fr = box_an.row(align=True)
        row_fr.prop(props, "anim_start")
        row_fr.prop(props, "anim_end")
        box_an.prop(props, "target_engine")
        box_an.prop(props, "gltf_format")
        box_an.prop(props, "export_previews")
        row_an = box_an.row(align=True)
        row_an.operator("pbr_pipeline.setup_rig_anim", text="Gerar Rig")
        row_an.operator("pbr_pipeline.export_asset", text="Exportar FBX/GLB")
`;

  const initPy = `# SPDX-License-Identifier: GPL-2.0-or-later
"""PBR AutoPipeline: Addon para Blender 3.5 a 5.3.

Automatiza mapeamento UV inteligente, shader PBR modular, bake de atlas 2D,
contorno Toon/Borde e rigging padronizado com 21 ossos + Test_Rig_Animation.
"""

import bpy
from bpy.props import (
    BoolProperty,
    EnumProperty,
    FloatProperty,
    IntProperty,
    PointerProperty,
    StringProperty,
)
from bpy.types import PropertyGroup

from . import presets
from .operators_uv import PBR_OT_SmartUVMap, PBR_OT_ExportUVLayouts
from .operators_pbr import PBR_OT_BuildPBRShader, PBR_OT_BakeAtlasTextures
from .operators_anim import (
    PBR_OT_SetupRigAndAnimation,
    PBR_OT_ImportGLTF,
    PBR_OT_ExportEngineAsset,
    PBR_OT_RunFullPipeline,
)
from .ui_panels import VIEW3D_PT_pbr_autopipeline_main

bl_info = {
    "name": "${config.displayName}",
    "author": "${config.author}",
    "version": (${versionTuple.join(', ')}),
    "blender": ${minTuple},
    "location": "View3D > Sidebar (N) > PBR Pipeline",
    "description": "Automacao de UV Mapping, Shader PBR modular, Bake Atlas e Rigging 21 Ossos",
    "category": "Material",
}


class PBRAutoPipelineProperties(PropertyGroup):
    seam_angle: FloatProperty(
        name="Seam Angle",
        description="Angulo diedro minimo (graus) para marcacao automatica de seams",
        default=presets.DEFAULT_SEAM_ANGLE_DEG,
        min=10.0,
        max=170.0,
        subtype='ANGLE',
    )
    uv_margin: FloatProperty(
        name="Margin",
        description="Espacamento entre ilhas UV para evitar bleeding no mipmap",
        default=presets.DEFAULT_UV_MARGIN,
        min=0.001,
        max=0.1,
        precision=4,
    )
    normalize_texel_density: BoolProperty(
        name="Equalizar Densidade de Texel",
        default=True,
    )
    clear_existing_seams: BoolProperty(
        name="Limpar Seams Anteriores",
        default=True,
    )
    pack_multi_object_atlas: BoolProperty(
        name="Empacotar em Atlas Unico",
        default=True,
    )
    export_uv_layouts: BoolProperty(
        name="Exportar UV Layouts (.png)",
        default=${pyBool(config.exportUvLayouts)},
    )
    shader_preset: EnumProperty(
        name="Preset Shader",
        items=[
            ('PBR_PRINCIPLED', "PBR Principled BSDF", "Material PBR fisico padrao"),
            ('PBR_CEL_OUTLINE', "PBR + Cel & Borde", "Cel-Shading estilizado com contorno Borde"),
            ('ANIME_TOON', "Anime Toon Shader", "Toon Shading estilo NPR"),
        ],
        default=presets.DEFAULT_SHADER_PRESET,
    )
    textures_dir: StringProperty(
        name="Pasta de Texturas",
        description="Diretorio contendo mapas _BaseColor, _Roughness, _Metallic, _Normal, _AO",
        subtype='DIR_PATH',
        default="//textures",
    )
    ao_intensity: FloatProperty(
        name="Intensidade AO",
        default=presets.DEFAULT_AO_INTENSITY,
        min=0.0,
        max=1.0,
    )
    normal_strength: FloatProperty(
        name="Forca Normal Map",
        default=presets.DEFAULT_NORMAL_STRENGTH,
        min=0.0,
        max=4.0,
    )
    outline_thickness: FloatProperty(
        name="Espessura Borde",
        default=presets.DEFAULT_OUTLINE_THICKNESS,
        min=0.001,
        max=0.05,
        precision=4,
    )
    texture_res: EnumProperty(
        name="Resolucao Atlas",
        items=[
            ('1024', "1024 x 1024", "Resolucao 1K"),
            ('2048', "2048 x 2048", "Resolucao 2K padrao"),
            ('4096', "4096 x 4096", "Resolucao 4K"),
        ],
        default=str(presets.DEFAULT_TEXTURE_RES),
    )
    bake_base_color: BoolProperty(name="Bake Base Color", default=${pyBool(config.bakeBaseColor)})
    bake_roughness: BoolProperty(name="Bake Roughness", default=${pyBool(config.bakeRoughness)})
    bake_normal: BoolProperty(name="Bake Normal", default=${pyBool(config.bakeNormal)})
    bake_ao: BoolProperty(name="Bake AO", default=${pyBool(config.bakeAO)})
    rig_preset: EnumProperty(
        name="Predefinicao de Rig",
        items=[
            ('HUMANOIDE', "Humanoide (21 Ossos)", "Esqueleto completo com claviculas e cabelo"),
            ('BIPEDE', "Bipede (16 Ossos)", "Esqueleto bipede simplificado para jogos"),
            ('QUADRUPEDE', "Quadrupede (20 Ossos)", "Esqueleto quadrupede com cauda e 4 patas"),
        ],
        default=presets.DEFAULT_RIG_PRESET,
    )
    anim_start: IntProperty(name="Frame Inicial", default=presets.DEFAULT_ANIM_START, min=0)
    anim_end: IntProperty(name="Frame Final", default=presets.DEFAULT_ANIM_END, min=1)
    target_engine: EnumProperty(
        name="Engine Destino",
        items=[
            ('BLENDER', "Blender 5.3", "Padrao nativo Blender"),
            ('UNITY', "Unity", "Eixos e escala compativeis com Unity"),
            ('UNREAL', "Unreal Engine 5", "Eixos e escala compativeis com UE5"),
            ('GODOT', "Godot Engine", "Exportacao GLB/FBX para Godot 4"),
        ],
        default=presets.DEFAULT_TARGET_ENGINE,
    )
    gltf_format: EnumProperty(
        name="Formato glTF",
        items=[
            ('GLB', "GLB (Binario)", "Arquivo unico .glb com texturas embutidas"),
            ('GLTF_EMBEDDED', "glTF Embedded (.gltf)", "JSON .gltf com buffers em base64"),
            ('GLTF_SEPARATE', "glTF Separado (.gltf + .bin)", "JSON .gltf com .bin e texturas externas"),
        ],
        default='GLB',
    )
    export_previews: BoolProperty(
        name="Renderizar 4 Previews",
        default=${pyBool(config.exportPreviews)},
    )


CLASSES = (
    PBRAutoPipelineProperties,
    PBR_OT_SmartUVMap,
    PBR_OT_ExportUVLayouts,
    PBR_OT_BuildPBRShader,
    PBR_OT_BakeAtlasTextures,
    PBR_OT_SetupRigAndAnimation,
    PBR_OT_ImportGLTF,
    PBR_OT_ExportEngineAsset,
    PBR_OT_RunFullPipeline,
    VIEW3D_PT_pbr_autopipeline_main,
)


def register():
    for cls in CLASSES:
        bpy.utils.register_class(cls)
    bpy.types.Scene.pbr_autopipeline = PointerProperty(type=PBRAutoPipelineProperties)


def unregister():
    if hasattr(bpy.types.Scene, "pbr_autopipeline"):
        del bpy.types.Scene.pbr_autopipeline
    for cls in reversed(CLASSES):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
`;

  const readmeMd = `# ${config.displayName}

Addon para **Blender 3.5 a 5.3** que automatiza todo o fluxo de preparacao de ativos 3D baseados em materiais PBR e estilizados:

1. **Mapeamento UV Inteligente (\`operators_uv.py\`)**:
   - Analise geometrica via \`bmesh\` para deteccao de quinas por \`seam_angle\` (${config.seamAngleDeg}°) e arestas sharp/nao-manifold.
   - Unwrap com \`margin\` (${config.uvMargin}), normalizacao de densidade de texel e \`pack_islands\` sem sobreposicao.
   - Exportacao automatica de layouts PNG (\`UV_all_parts.png\` e \`UV_<Parte>.png\`).

2. **Shader PBR Modular & Atlas Baking (\`operators_pbr.py\`)**:
   - Gera o Node Group \`PBR_Master_Shader\` com entradas dedicadas para **Base Color**, **Roughness**, **Metallic**, **Normal Map** e **Ambient Occlusion**.
   - Pre-conecta 5 nos \`Image Texture\` (\`sRGB\` para Base Color, \`Non-Color\` para dados PBR).
   - Suporte opcional a **Cel-Shading + Contorno Borde** (Solidify backface culling) e Bake Cycles para Atlas ${config.textureResolution}x${config.textureResolution}.

3. **Rigging 21 Ossos & Animacao de Teste (\`operators_anim.py\`)**:
   - Cria Armature estrutural padronizada com **21 ossos** e vinculo automatico.
   - Gera a acao \`Test_Rig_Animation\` (frames ${config.animStartFrame} a ${config.animEndFrame}).
   - Renderiza 4 previews ortograficos/perspectiva (\`front\`, \`side\`, \`back\`, \`q34\`) e exporta FBX/GLB para **${config.targetEngine}**.

## Instalacao no Blender
1. Abra **Edit > Preferences > Add-ons** (ou **Get Extensions > Install from Disk** no Blender 4.2+/5.3).
2. Selecione o arquivo \`.zip\` baixado.
3. Ative \`${config.displayName}\` e pressione \`N\` no 3D Viewport na aba **PBR Pipeline**.
`;

  return [
    {
      filename: 'operators_uv.py',
      language: 'python',
      summary: 'Função smart_uv_map_object com análise BMesh, margin, seam angle, empacotamento e exportação PNG.',
      content: operatorsUvPy,
    },
    {
      filename: 'operators_pbr.py',
      language: 'python',
      summary: 'Gerador de ShaderNodeGroup PBR (Base Color, Roughness, Metallic, Normal, AO), Cel/Borde e Bake Atlas.',
      content: operatorsPbrPy,
    },
    {
      filename: 'operators_anim.py',
      language: 'python',
      summary: 'Armature 21 ossos padronizados, Test_Rig_Animation (1–60), 4 previews e exportação FBX/GLB.',
      content: operatorsAnimPy,
    },
    {
      filename: '__init__.py',
      language: 'python',
      summary: 'Registro principal do addon, PropertyGroup e bl_info compatível com Blender 3.5 a 5.3.',
      content: initPy,
    },
    {
      filename: 'ui_panels.py',
      language: 'python',
      summary: 'Painel lateral N-Panel no 3D Viewport com controles completos do pipeline.',
      content: uiPanelsPy,
    },
    {
      filename: 'presets.py',
      language: 'python',
      summary: 'Constantes configuradas e hierarquia dos 21 ossos estruturais.',
      content: presetsPy,
    },
    {
      filename: 'blender_manifest.toml',
      language: 'toml',
      summary: 'Manifesto oficial de extensão para Blender 4.2+ / 5.3.',
      content: manifestToml,
    },
    {
      filename: 'README.md',
      language: 'markdown',
      summary: 'Guia rápido de instalação e uso dentro do Blender.',
      content: readmeMd,
    },
  ];
}
