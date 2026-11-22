import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

import { ParticleEmitterConfig } from './particleSystem';
import { ReactiveShaderConfig, VariableBindingRule } from './reactiveShaders';

export interface BlenderExportPreparation {
  exportGroup: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface BlenderExportMetadata {
  assetName: string;
  glbFileName: string;
  fps?: number;
  transparentBg?: boolean;
  toneMapping?: string;
  variables?: Record<string, string | number | boolean>;
  bindings?: VariableBindingRule[];
  emitters?: ParticleEmitterConfig[];
  ikEnabled?: boolean;
  shaderConfig?: ReactiveShaderConfig;
}

/**
 * Prepares a Three.js scene group and AnimationClips for glTF 2.0 export
 * aligned with current Blender 5.x Python API & glTF 2.0 importer (`IO_FH_gltf2`):
 * https://docs.blender.org/api/current/index.html
 * - Preserves Collections (Hierarquia), Mesh names, VertexGroups & Bind Rest Pose
 * - Writes glTF `extras` (imported by Blender into IDProperty custom properties)
 * - Normalizes quaternions & strips empty animation tracks
 */
export function prepareBlenderCompatibleExport(options: {
  modelRoot: THREE.Object3D | null;
  splineGroup: THREE.Object3D | null;
  clips: THREE.AnimationClip[];
  restBoneTransforms?: Map<string, { pos: THREE.Vector3; quat: THREE.Quaternion }>;
  sceneVariables?: Record<string, string | number | boolean>;
}): BlenderExportPreparation {
  const { modelRoot, splineGroup, clips, restBoneTransforms, sceneVariables } = options;
  const exportGroup = new THREE.Group();
  exportGroup.name = 'AlexDesign_Blender_Scene';
  if (sceneVariables) {
    exportGroup.userData = {
      ...exportGroup.userData,
      alexdesign_pipeline: 'blender_5_3_compatible',
      ...sceneVariables,
    };
  }

  const usedNames = new Set<string>();
  const ensureUniqueName = (raw: string, fallback: string) => {
    const base = (raw || fallback).trim() || fallback;
    let candidate = base;
    let idx = 2;
    while (usedNames.has(candidate)) {
      candidate = `${base}_${idx}`;
      idx += 1;
    }
    usedNames.add(candidate);
    return candidate;
  };

  if (modelRoot && modelRoot.visible) {
    const clonedModel = SkeletonUtils.clone(modelRoot);
    clonedModel.getObjectByName('ActionForge_RigMarkers')?.removeFromParent();
    clonedModel.getObjectByName('ActionForge_IKTargets')?.removeFromParent();

    // Restore exact Rest Pose on cloned armature bones so Blender imports clean Bind Pose
    if (restBoneTransforms && restBoneTransforms.size > 0) {
      clonedModel.traverse((obj) => {
        if ((obj as THREE.Bone).isBone) {
          const rest = restBoneTransforms.get(obj.name);
          if (rest) {
            obj.position.copy(rest.pos);
            obj.quaternion.copy(rest.quat);
            obj.scale.set(1, 1, 1);
          }
        }
      });
      clonedModel.updateMatrixWorld(true);
    }

    clonedModel.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.name = ensureUniqueName(m.name, 'Mesh');
        const geo = m.geometry;
        if (geo && !geo.attributes.normal) {
          geo.computeVertexNormals();
        }
        // Stamp glTF extras -> Blender IDProperty custom properties
        m.userData = {
          alexdesign_collection: 'Personagem_Rig',
          alexdesign_rigid_body: m.userData?.rigidBodyMode || (m.userData?.physicsEnabled ? 'dynamic' : 'none'),
          alexdesign_interaction: m.userData?.interaction || 'none',
          alexdesign_shader_fx: m.userData?.shaderEffect?.effect || 'none',
        };
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          if (mat && !mat.name) {
            mat.name = 'Principled_BSDF_PBR';
          }
        });
      }
    });

    exportGroup.add(clonedModel);
  }

  if (splineGroup && splineGroup.children.length > 0) {
    const clonedSplines = splineGroup.clone(true);
    clonedSplines.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.name = ensureUniqueName(m.name, 'Object_3D');
        if (m.geometry && !m.geometry.attributes.normal) {
          m.geometry.computeVertexNormals();
        }
        m.userData = {
          alexdesign_collection: 'Objetos_3D',
          alexdesign_rigid_body: m.userData?.rigidBodyMode || (m.userData?.physicsEnabled ? 'dynamic' : 'none'),
          alexdesign_interaction: m.userData?.interaction || 'none',
          alexdesign_shader_fx: m.userData?.shaderEffect?.effect || 'none',
        };
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat) => {
          if (mat && !mat.name) {
            mat.name = 'Principled_BSDF_PBR';
          }
        });
      }
    });
    exportGroup.add(clonedSplines);
  }

  const usedClipNames = new Set<string>();
  const qTmp = new THREE.Quaternion();
  const cleanClips = clips.map((clip, index) => {
    const c = clip.clone();
    let baseName = (c.name || `Action_${index + 1}`).trim();
    if (usedClipNames.has(baseName)) {
      baseName = `${baseName}_${index + 1}`;
    }
    usedClipNames.add(baseName);
    c.name = baseName;

    // Strip empty tracks so Blender's glTF importer only registers valid F-Curves
    c.tracks = c.tracks.filter((track) => track.times.length > 0 && track.values.length > 0);

    // Blender glTF importer requires positive clip duration & unit continuous quaternions
    if (!Number.isFinite(c.duration) || c.duration <= 0) {
      c.duration = 0.5;
    }

    for (const track of c.tracks) {
      if (track.ValueTypeName === 'quaternion') {
        const v = track.values;
        for (let i = 0; i + 3 < v.length; i += 4) {
          qTmp.set(v[i], v[i + 1], v[i + 2], v[i + 3]).normalize();
          v[i] = qTmp.x;
          v[i + 1] = qTmp.y;
          v[i + 2] = qTmp.z;
          v[i + 3] = qTmp.w;
          if (i >= 4) {
            const dot =
              v[i - 4] * v[i] +
              v[i - 3] * v[i + 1] +
              v[i - 2] * v[i + 2] +
              v[i - 1] * v[i + 3];
            if (dot < 0) {
              v[i] = -v[i];
              v[i + 1] = -v[i + 1];
              v[i + 2] = -v[i + 2];
              v[i + 3] = -v[i + 3];
            }
          }
        }
      }
    }
    return c;
  });

  exportGroup.updateMatrixWorld(true);
  return { exportGroup, animations: cleanClips };
}

/**
 * Generates a complete Blender 5.x Python API (`bpy`) import & reconstruction script:
 * - Organizes imported objects into `bpy.types.Collection` ("AlexDesign_Malhas", "AlexDesign_VFX")
 * - Registers Scene & Object `IDProperty` custom properties from the Variáveis tab
 * - Configures `IO_FH_gltf2` (`bpy.ops.import_scene.gltf`) with automatic Y-up <-> Z-up conversion
 * - Builds Layered/Slotted `Action` ChannelBags (`bpy_extras.anim_utils`) & NLA Tracks
 * - Adds `KinematicConstraint` IK targets on Armature PoseBones when rigged
 * - Configures `RigidBodyObject` (ACTIVE / PASSIVE) & `ParticleSettings` emitters
 * - Configures `ShaderNodeBsdfPrincipled` & `RenderSettings` (`BLENDER_EEVEE`, `AgX` / `ACES`)
 */
export function generateBlender53ImportScript(options: BlenderExportMetadata): string {
  const {
    assetName,
    glbFileName,
    fps = 30,
    transparentBg = false,
    toneMapping = 'agx',
    variables = {},
    emitters = [],
    ikEnabled = true,
  } = options;

  const viewTransform = toneMapping === 'aces' ? 'AgX' : toneMapping === 'none' ? 'Standard' : 'AgX';
  const varsJson = JSON.stringify(variables);
  const emittersJson = JSON.stringify(
    emitters.map((e) => ({
      name: e.name,
      // Convert WebGL Y-up [x, y, z] -> Blender Z-up [x, -z, y]
      location: [Number(e.position[0].toFixed(3)), Number((-e.position[2]).toFixed(3)), Number(e.position[1].toFixed(3))],
      count: Math.max(20, Math.round(e.rate * 4)),
      lifetime: Math.round(e.lifetime * fps),
      size: Number(e.startSize.toFixed(3)),
    }))
  );

  return `"""
AlexDesign -> Blender 5.3 Python API (bpy) Importer & Reconstructor
Compatível com: https://docs.blender.org/api/current/index.html

Módulos e Blocos ID utilizados:
- bpy.data.collections (Hierarquia como bpy.types.Collection)
- bpy.ops.import_scene.gltf (IO_FH_gltf2 com conversão automática Y-Up WebGL -> Z-Up Blender)
- IDProperty (Propriedades customizadas em scene[...] e obj[...])
- Armature / PoseBone / KinematicConstraint (IK) / VertexGroup / Key (Shape Keys)
- Action Layers / Strips / Action Slots / ChannelBags (bpy_extras.anim_utils)
- ShaderNodeBsdfPrincipled (Base Color, Metallic, Roughness, IOR, Emission Color)
- ParticleSettings / RigidBodyObject / RenderSettings (BLENDER_EEVEE + ${viewTransform})
"""
import os
import json
import bpy
from bpy_extras import anim_utils

SCENE_VARIABLES = ${varsJson}
VFX_EMITTERS = ${emittersJson}


def ensure_collection(name: str, parent_col=None):
    """Cria ou obtém uma bpy.types.Collection na hierarquia do Blender."""
    col = bpy.data.collections.get(name)
    if not col:
        col = bpy.data.collections.new(name)
        target_parent = parent_col or bpy.context.scene.collection
        target_parent.children.link(col)
    return col


def apply_custom_id_properties(scene, objs):
    """Salva variáveis do projeto AlexDesign como IDProperties nativos na cena e nos objetos."""
    for key, val in SCENE_VARIABLES.items():
        scene[f"alexdesign_{key}"] = val

    for obj in objs:
        rb_mode = obj.get("alexdesign_rigid_body", "none")
        if obj.type == "MESH" and rb_mode in ("static", "dynamic"):
            bpy.context.view_layer.objects.active = obj
            if not obj.rigid_body:
                bpy.ops.rigidbody.object_add(type="PASSIVE" if rb_mode == "static" else "ACTIVE")
            obj.rigid_body.type = "PASSIVE" if rb_mode == "static" else "ACTIVE"
            obj.rigid_body.friction = 0.6
            obj.rigid_body.restitution = 0.35


def setup_vfx_particle_emitters(vfx_collection):
    """Cria ParticleSettings nativos no Blender para cada emissor do Fluxo VFX."""
    for spec in VFX_EMITTERS:
        bpy.ops.mesh.primitive_plane_add(size=0.18, location=tuple(spec["location"]))
        em_obj = bpy.context.active_object
        em_obj.name = f"VFX_{spec['name']}"
        for c in list(em_obj.users_collection):
            c.objects.unlink(em_obj)
        vfx_collection.objects.link(em_obj)

        ps_mod = em_obj.modifiers.new(name="AlexDesignParticles", type="PARTICLE_SYSTEM")
        pset = ps_mod.particle_system.settings
        pset.count = spec["count"]
        pset.frame_start = 1
        pset.frame_end = 120
        pset.lifetime = spec["lifetime"]
        pset.particle_size = spec["size"]
        pset.normal_factor = 1.4


def setup_armature_ik_constraints(armature_obj, vfx_collection):
    """Configura PoseBones e KinematicConstraint (IK) nos membros principais."""
    if not armature_obj or armature_obj.type != "ARMATURE":
        return
    ik_pairs = [
        ("forearm_L", "IK_Hand_L"),
        ("forearm_R", "IK_Hand_R"),
        ("shin_L", "IK_Foot_L"),
        ("shin_R", "IK_Foot_R"),
    ]
    pose_bones = armature_obj.pose.bones
    for bone_name, target_name in ik_pairs:
        pb = pose_bones.get(bone_name)
        if not pb:
            continue
        target_empty = bpy.data.objects.new(target_name, None)
        target_empty.empty_display_type = "SPHERE"
        target_empty.empty_display_size = 0.08
        vfx_collection.objects.link(target_empty)
        target_empty.location = armature_obj.matrix_world @ pb.tail

        ik = next((c for c in pb.constraints if c.type == "IK"), None)
        if not ik:
            ik = pb.constraints.new(type="IK")
        ik.name = f"AlexDesign_IK_{bone_name}"
        ik.target = target_empty
        ik.chain_count = 2


def get_or_create_channelbag(action, slot):
    """Obtém ou cria a ChannelBag do Slot na API moderna de Layered/Slotted Actions."""
    if not action.layers:
        layer = action.layers.new(name="BaseLayer")
    else:
        layer = action.layers[0]
    if not layer.strips:
        layer.strips.new(type="KEYFRAME")
    return anim_utils.action_ensure_channelbag_for_slot(action, slot)


def configure_scene_render(scene, fps: int, transparent_bg: bool):
    """Configura RenderSettings e ColorManagedViewSettings conforme docs.blender.org/api/current."""
    scene.render.fps = fps
    engine_items = {
        item.identifier
        for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items
    }
    if "BLENDER_EEVEE" in engine_items:
        scene.render.engine = "BLENDER_EEVEE"
    elif "BLENDER_EEVEE_NEXT" in engine_items:
        scene.render.engine = "BLENDER_EEVEE_NEXT"

    view_transforms = {
        item.identifier
        for item in bpy.types.ColorManagedViewSettings.bl_rna.properties["view_transform"].enum_items
    }
    if "${viewTransform}" in view_transforms:
        scene.view_settings.view_transform = "${viewTransform}"
    elif "AgX" in view_transforms:
        scene.view_settings.view_transform = "AgX"

    scene.render.film_transparent = transparent_bg
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA" if transparent_bg else "RGB"


def ensure_principled_bsdf_inputs(objs):
    """Valida nós ShaderNodeBsdfPrincipled nos materiais importados (Base Color, Metallic, Roughness, IOR, Emission Color)."""
    visited = set()
    for obj in objs:
        if obj.type != "MESH" or not obj.data:
            continue
        for mat in obj.data.materials:
            if not mat or mat.name in visited:
                continue
            visited.add(mat.name)
            mat.use_nodes = True
            if not mat.node_tree:
                continue
            principled = next(
                (n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"),
                None,
            )
            if principled and "Specular IOR Level" in principled.inputs and principled.inputs["Specular IOR Level"].default_value == 0:
                principled.inputs["Specular IOR Level"].default_value = 0.5


def import_alexdesign_glb(glb_path: str):
    scene = bpy.context.scene
    configure_scene_render(scene, fps=${fps}, transparent_bg=${transparentBg ? 'True' : 'False'})

    existing_objects = set(bpy.data.objects)
    existing_actions = set(bpy.data.actions)

    # IO_FH_gltf2 converte automaticamente WebGL Y-Up para Blender Z-Up (-90° X)
    bpy.ops.import_scene.gltf(
        filepath=glb_path,
        import_shading="NORMALS",
        bone_heuristic="BLENDER",
        guess_original_bind_pose=True,
    )

    imported_objects = [obj for obj in bpy.data.objects if obj not in existing_objects]
    imported_actions = [act for act in bpy.data.actions if act not in existing_actions]

    root_col = ensure_collection("AlexDesign_Cena")
    mesh_col = ensure_collection("AlexDesign_Malhas", root_col)
    rig_col = ensure_collection("AlexDesign_Rig", root_col)
    vfx_col = ensure_collection("AlexDesign_VFX", root_col)

    for obj in imported_objects:
        target_col = rig_col if obj.type == "ARMATURE" else mesh_col
        for c in list(obj.users_collection):
            c.objects.unlink(obj)
        target_col.objects.link(obj)

    ensure_principled_bsdf_inputs(imported_objects)
    apply_custom_id_properties(scene, imported_objects)
    if VFX_EMITTERS:
        setup_vfx_particle_emitters(vfx_col)

    armature_obj = next(
        (obj for obj in imported_objects if obj.type == "ARMATURE"),
        None,
    )
    if armature_obj and ${ikEnabled ? 'True' : 'False'}:
        setup_armature_ik_constraints(armature_obj, vfx_col)

    target_obj = armature_obj or (imported_objects[0] if imported_objects else None)
    if not target_obj:
        print("[AlexDesign] Nenhum objeto importado encontrado.")
        return

    if not target_obj.animation_data:
        target_obj.animation_data_create()

    anim_data = target_obj.animation_data
    for action in imported_actions:
        slot = action.slots[0] if action.slots else action.slots.new(id_type="OBJECT", name=target_obj.name)
        channelbag = get_or_create_channelbag(action, slot)
        fcurve_count = len(channelbag.fcurves) if channelbag else 0

        track = anim_data.nla_tracks.new()
        track.name = action.name
        frame_start = int(action.frame_range[0]) if action.frame_range else 1
        strip = track.strips.new(action.name, frame_start, action)
        if hasattr(strip, "action_slot") and slot:
            strip.action_slot = slot
        strip.mute = True
        print(f"[AlexDesign] Action '{action.name}' | F-Curves: {fcurve_count}")

    if imported_actions:
        first_action = imported_actions[0]
        anim_data.action = first_action
        if first_action.slots and hasattr(anim_data, "action_slot"):
            anim_data.action_slot = first_action.slots[0]

    print("[AlexDesign] Importação Blender 5.3 concluída:", "${assetName}")


if __name__ == "__main__":
    script_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.getcwd()
    glb_file = os.path.join(script_dir, "${glbFileName}")
    if os.path.exists(glb_file):
        import_alexdesign_glb(glb_file)
    else:
        print("[AlexDesign] Coloque '${glbFileName}' na mesma pasta ou passe o caminho para import_alexdesign_glb(path).")
`;
}

export const generateBlenderCurrentImportScript = generateBlender53ImportScript;

