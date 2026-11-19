import * as THREE from 'three';

/**
 * Ponte AlexDesign -> Blender (3.5 LTS e superior, incluindo 4.x e 5.x).
 *
 * - `prepareSceneForBlender` normaliza a cena Three.js antes do export glTF 2.0
 *   (sem renomear ossos/nós que são alvo de animação, para não quebrar tracks).
 * - `generateBlenderPythonScript` gera um script bpy que detecta a versão do
 *   Blender em execução e adapta engine de render, sockets do Principled BSDF
 *   e API de materiais (3.5 -> 5.x).
 */

export const BLENDER_MIN_VERSION = '3.5';

export interface BlenderValidationIssue {
  severity: 'critical' | 'medium' | 'info';
  code: string;
  message: string;
}

export interface BlenderValidationReport {
  compatible: boolean;
  meshCount: number;
  boneCount: number;
  triangleCount: number;
  issues: BlenderValidationIssue[];
}

export interface PrepareOptions {
  /** Clips que serão exportados; nós citados nas tracks nunca são renomeados. */
  clips?: THREE.AnimationClip[];
}

const MIN_SCALE = 1e-4;

function collectAnimatedNodeNames(clips: THREE.AnimationClip[] | undefined): Set<string> {
  const names = new Set<string>();
  for (const clip of clips ?? []) {
    for (const track of clip.tracks) {
      try {
        names.add(THREE.PropertyBinding.parseTrackName(track.name).nodeName);
      } catch {
        /* track com nome inesperado: ignora */
      }
    }
  }
  return names;
}

export function prepareSceneForBlender(
  root: THREE.Object3D | null,
  options: PrepareOptions = {}
): BlenderValidationReport {
  const issues: BlenderValidationIssue[] = [];
  if (!root) {
    return {
      compatible: false,
      meshCount: 0,
      boneCount: 0,
      triangleCount: 0,
      issues: [
        {
          severity: 'critical',
          code: 'NO_ROOT_OBJECT',
          message: 'Nenhum personagem ou malha 3D carregado na cena para exportar.',
        },
      ],
    };
  }

  root.updateMatrixWorld(true);

  const animated = collectAnimatedNodeNames(options.clips);
  let meshCount = 0;
  let boneCount = 0;
  let triangleCount = 0;
  let colorSpaceFixes = 0;
  let renamedCount = 0;

  // Duplicatas de nome viram ".001" no Blender; só renomeamos nós NÃO animados.
  const seenObjects = new Set<string>();
  const seenMaterials = new Set<string>();
  const uniquify = (raw: string, fallback: string, seen: Set<string>, canRename: boolean): string => {
    const base = raw && raw.trim() ? raw : fallback;
    if (!seen.has(base)) {
      seen.add(base);
      return base;
    }
    if (!canRename) return base;
    let i = 1;
    while (seen.has(`${base}_${i}`)) i++;
    const next = `${base}_${i}`;
    seen.add(next);
    return next;
  };

  root.userData.alexdesign_pipeline = `Blender_${BLENDER_MIN_VERSION}+_glTF2`;
  root.userData.coordinate_space = 'Y_UP_METERS (importer glTF converte para Z_UP)';

  const linearMapKeys = ['roughnessMap', 'metalnessMap', 'normalMap', 'aoMap'] as const;
  const srgbMapKeys = ['map', 'emissiveMap'] as const;

  root.traverse((obj) => {
    const isBone = (obj as THREE.Bone).isBone === true;
    const isMesh = (obj as THREE.Mesh).isMesh === true;
    const fallback = isBone ? 'Bone' : isMesh ? 'Mesh' : 'Node';
    const next = uniquify(obj.name, fallback, seenObjects, !isBone && !animated.has(obj.name));
    if (next !== obj.name) {
      obj.name = next;
      renamedCount++;
    }

    if (isBone) boneCount++;
    if (!isMesh) return;

    meshCount++;
    const mesh = obj as THREE.Mesh;
    const geom = mesh.geometry;
    if (geom) {
      if (geom.index) triangleCount += Math.floor(geom.index.count / 3);
      else if (geom.attributes.position) triangleCount += Math.floor(geom.attributes.position.count / 3);
      if (!geom.attributes.normal) {
        geom.computeVertexNormals();
        issues.push({
          severity: 'info',
          code: 'NORMALS_GENERATED',
          message: `Normais recalculadas automaticamente em "${mesh.name}".`,
        });
      }
      if (!geom.attributes.uv) {
        issues.push({
          severity: 'medium',
          code: 'NO_UV',
          message: `"${mesh.name}" não possui UV; texturas não aparecerão no Blender.`,
        });
      }
    }

    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (!m) continue;
      const nextMat = uniquify(m.name, 'PBR_Material', seenMaterials, true);
      if (nextMat !== m.name) {
        m.name = nextMat;
        renamedCount++;
      }
      if (!(m instanceof THREE.MeshStandardMaterial)) continue;
      // glTF: BaseColor/Emissive = sRGB; Roughness/Metal/Normal/AO = linear.
      for (const k of srgbMapKeys) {
        const t = m[k];
        if (t && t.colorSpace !== THREE.SRGBColorSpace) {
          t.colorSpace = THREE.SRGBColorSpace;
          t.needsUpdate = true;
          colorSpaceFixes++;
        }
      }
      for (const k of linearMapKeys) {
        const t = m[k];
        if (t && t.colorSpace !== THREE.NoColorSpace) {
          t.colorSpace = THREE.NoColorSpace;
          t.needsUpdate = true;
          colorSpaceFixes++;
        }
      }
    }

    // Escala ~0 quebra skinning/normais no Blender; sinais negativos são preservados.
    const s = mesh.scale;
    const fix = (v: number) => (Math.abs(v) < MIN_SCALE ? 1 : v);
    if (Math.abs(s.x) < MIN_SCALE || Math.abs(s.y) < MIN_SCALE || Math.abs(s.z) < MIN_SCALE) {
      s.set(fix(s.x), fix(s.y), fix(s.z));
      issues.push({
        severity: 'medium',
        code: 'ZERO_SCALE_FIXED',
        message: `Escala zerada corrigida em "${mesh.name}".`,
      });
    }
  });

  if (colorSpaceFixes > 0) {
    issues.push({
      severity: 'info',
      code: 'COLORSPACE_NORMALIZED',
      message: `${colorSpaceFixes} mapa(s) PBR normalizados (sRGB para cor / Linear para Roughness, Metallic, Normal e AO).`,
    });
  }
  if (renamedCount > 0) {
    issues.push({
      severity: 'info',
      code: 'UNIQUE_NAMES_ENFORCED',
      message: `${renamedCount} nó(s)/material(is) duplicados renomeados para evitar sufixos .001 no Blender.`,
    });
  }
  if (triangleCount > 150000) {
    issues.push({
      severity: 'medium',
      code: 'HIGH_POLY',
      message: `Malha com ${triangleCount.toLocaleString('pt-BR')} triângulos — recomenda-se < 150k para viewport fluido.`,
    });
  }
  if (boneCount === 0) {
    issues.push({
      severity: 'info',
      code: 'STATIC_MESH',
      message: 'Nenhum osso detectado (malha estática). Use Auto-Rig antes de exportar para ter armature no Blender.',
    });
  }

  return {
    compatible: !issues.some((i) => i.severity === 'critical'),
    meshCount,
    boneCount,
    triangleCount,
    issues,
  };
}

/**
 * Script bpy compatível com Blender 3.5 → 5.x. Todas as diferenças de API são
 * resolvidas em tempo de execução por `bpy.app.version`/`hasattr`.
 */
export function generateBlenderPythonScript(glbFileName = 'AlexDesign_Character.glb'): string {
  const safeName = glbFileName.replace(/\\/g, '/').replace(/"/g, '');
  return `# AlexDesign -> Blender ${BLENDER_MIN_VERSION}+ (testado na API 3.5 / 4.x / 5.x por deteccao de versao)
import bpy
import os

GLB_FILE = "${safeName}"
V = bpy.app.version


def ensure_object_mode():
    """Volta ao Object Mode sem falhar quando nao ha objeto ativo."""
    try:
        if bpy.context.object is not None and bpy.context.mode != 'OBJECT':
            bpy.ops.object.mode_set(mode='OBJECT')
    except Exception:
        pass


def pick_render_engine(scene):
    """3.5-4.1: BLENDER_EEVEE | 4.2-4.5: BLENDER_EEVEE_NEXT | 5.0+: BLENDER_EEVEE."""
    items = [i.identifier for i in scene.render.bl_rna.properties['engine'].enum_items]
    for ident in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        if ident in items:
            scene.render.engine = ident
            return ident
    return scene.render.engine


def setup_render(scene):
    pick_render_engine(scene)
    eevee = scene.eevee
    if hasattr(eevee, 'taa_render_samples'):
        eevee.taa_render_samples = 32
    if V >= (4, 2, 0) and hasattr(eevee, 'use_raytracing'):
        eevee.use_raytracing = True
    # Cycles com GPU NVIDIA (OptiX) se disponivel; ignora silenciosamente caso contrario
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'OPTIX'
        if hasattr(prefs, 'refresh_devices'):
            prefs.refresh_devices()
        else:
            prefs.get_devices()
        if any(d.type == 'OPTIX' for d in prefs.devices):
            for d in prefs.devices:
                d.use = d.type == 'OPTIX'
            scene.cycles.device = 'GPU'
        scene.cycles.use_denoising = True
    except Exception:
        pass


def set_input(node, names, value):
    """Define o primeiro socket existente entre nomes alternativos (3.x vs 4.x)."""
    for n in names:
        sock = node.inputs.get(n)
        if sock is not None:
            sock.default_value = value
            return True
    return False


def normalize_materials():
    """Ajustes minimos em Principled BSDF: 'Specular' (3.x) -> 'Specular IOR Level' (4.0+)."""
    for mat in bpy.data.materials:
        if mat.node_tree is None:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                set_input(node, ('Specular IOR Level', 'Specular'), 0.5)


def import_glb(filepath):
    ensure_object_mode()
    filepath = bpy.path.abspath(filepath)
    if not os.path.exists(filepath):
        base = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.path.dirname(os.path.abspath(__file__))
        filepath = os.path.join(base, os.path.basename(filepath))
    if not os.path.exists(filepath):
        raise FileNotFoundError("GLB nao encontrado: " + filepath)

    col = bpy.data.collections.get("AlexDesign_Import")
    if col is None:
        col = bpy.data.collections.new("AlexDesign_Import")
        bpy.context.scene.collection.children.link(col)

    before = set(bpy.data.objects.keys())
    bpy.ops.import_scene.gltf(filepath=filepath)
    imported = [o for o in bpy.data.objects if o.name not in before]

    setup_render(bpy.context.scene)
    normalize_materials()

    for obj in imported:
        for old in list(obj.users_collection):
            old.objects.unlink(obj)
        col.objects.link(obj)
        if obj.type == 'ARMATURE':
            obj.show_in_front = True
    print("[AlexDesign] Importacao concluida (Blender %d.%d.%d): %d objetos" % (V[0], V[1], V[2], len(imported)))


if __name__ == "__main__":
    try:
        import_glb(GLB_FILE)
    except Exception as err:
        print("[AlexDesign][ERRO]", err)
`;
}
