import * as THREE from 'three';
import JSZip from 'jszip';
import {
  ProceduralPbrParams,
  ThreePbrTextureBundle,
  generateProceduralPbrCanvases,
} from './pbrTextureGenerator';

export type SubstanceChannelId =
  | 'baseColor'
  | 'roughness'
  | 'metallic'
  | 'normal'
  | 'height'
  | 'ao'
  | 'emissive'
  | 'opacity';

export interface SubstanceTextureSlot {
  channel: SubstanceChannelId;
  fileName: string;
  dataUrl: string;
  flipY?: boolean;
}

export interface SubstanceTextureSetRequest {
  materialName: string;
  targetMeshName?: string;
  slots: Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>;
  normalDirectXToOpenGL: boolean;
  useBumpConversion: boolean;
  uvScale: number;
  nonce: number;
}

export interface GlbExtractedTexturesInput {
  baseColor?: string | null;
  roughness?: string | null;
  metallic?: string | null;
  normal?: string | null;
  ao?: string | null;
  emissive?: string | null;
  opacity?: string | null;
}

export function buildSubstanceSlotsFromGlbTextures(
  materialName: string,
  textures?: GlbExtractedTexturesInput | null
): Partial<Record<SubstanceChannelId, SubstanceTextureSlot>> {
  if (!textures) return {};
  const safeName = materialName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'GLB_Material';
  const slots: Partial<Record<SubstanceChannelId, SubstanceTextureSlot>> = {};

  const mapping: [SubstanceChannelId, string | null | undefined, string][] = [
    ['baseColor', textures.baseColor, 'BaseColor'],
    ['roughness', textures.roughness, 'Roughness'],
    ['metallic', textures.metallic, 'Metallic'],
    ['normal', textures.normal, 'Normal'],
    ['ao', textures.ao, 'AO'],
    ['emissive', textures.emissive, 'Emissive'],
    ['opacity', textures.opacity, 'Opacity'],
  ];

  for (const [channel, dataUrl, suffix] of mapping) {
    if (dataUrl) {
      slots[channel] = {
        channel,
        fileName: `${safeName}_${suffix}.png`,
        dataUrl,
        flipY: true,
      };
    }
  }
  return slots;
}

export const SUBSTANCE_CHANNEL_META: {
  id: SubstanceChannelId;
  label: string;
  colorSpace: 'sRGB' | 'Non-Color';
  bsdfInput: string;
  suffixHint: string;
}[] = [
  { id: 'baseColor', label: 'Base Color', colorSpace: 'sRGB', bsdfInput: 'Base Color', suffixHint: '_BaseColor / _Albedo' },
  { id: 'roughness', label: 'Roughness', colorSpace: 'Non-Color', bsdfInput: 'Roughness', suffixHint: '_Roughness / _ORM(G)' },
  { id: 'metallic', label: 'Metallic', colorSpace: 'Non-Color', bsdfInput: 'Metallic', suffixHint: '_Metallic / _ORM(B)' },
  { id: 'normal', label: 'Normal Map', colorSpace: 'Non-Color', bsdfInput: 'Normal (NormalMap)', suffixHint: '_Normal / _Nrm' },
  { id: 'height', label: 'Height / Disp.', colorSpace: 'Non-Color', bsdfInput: 'Bump / Displacement', suffixHint: '_Height / _Disp' },
  { id: 'ao', label: 'Ambient Occlusion', colorSpace: 'Non-Color', bsdfInput: 'Mix Multiply -> Base', suffixHint: '_AO / _ORM(R)' },
  { id: 'emissive', label: 'Emissive', colorSpace: 'sRGB', bsdfInput: 'Emission Color', suffixHint: '_Emissive' },
  { id: 'opacity', label: 'Opacity / Alpha', colorSpace: 'Non-Color', bsdfInput: 'Alpha', suffixHint: '_Opacity / _Alpha' },
];

function stripExtensionAndUdim(fileName: string): string {
  // Remove image extension and optional UDIM tile suffix (.1001, _1001)
  return fileName
    .toLowerCase()
    .replace(/\.[^.]+$/, '')
    .replace(/[._-](1\d{3})$/, '');
}

function isPackedOrmFilename(fileName: string): boolean {
  const clean = stripExtensionAndUdim(fileName);
  return /(occlusionroughnessmetallic|[_-]orm$|[_-]arm$|[_-]rma$|[_-]mrao$)/i.test(clean);
}

function detectSubstanceChannel(fileName: string): SubstanceChannelId | null {
  const clean = stripExtensionAndUdim(fileName);
  if (/(base[_-]?color|basecolor|albedo|diffuse|[_-]col$|[_-]bc$)/i.test(clean)) return 'baseColor';
  if (/(roughness|[_-]rough$|[_-]rgh$)/i.test(clean)) return 'roughness';
  if (/(metallic|metalness|[_-]metal$|[_-]met$)/i.test(clean)) return 'metallic';
  if (/(normal|[_-]nrm$|[_-]norm$|[_-]nor$)/i.test(clean)) return 'normal';
  if (/(height|displacement|[_-]disp$|[_-]hgt$|bump)/i.test(clean)) return 'height';
  if (/(ambient[_-]?occlusion|mixed[_-]?ao|[_-]ao$|occlusion)/i.test(clean)) return 'ao';
  if (/(emissive|emission|[_-]emi$)/i.test(clean)) return 'emissive';
  if (/(opacity|alpha|transparency|[_-]opa$)/i.test(clean)) return 'opacity';
  return null;
}

function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Falha ao ler imagem de textura.'));
    reader.readAsDataURL(blob);
  });
}

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível decodificar a imagem de textura.'));
    img.src = url;
  });
}

async function unpackOrmBlobToChannels(
  blob: Blob,
  sourceName: string
): Promise<{
  ao: SubstanceTextureSlot;
  roughness: SubstanceTextureSlot;
  metallic: SubstanceTextureSlot;
}> {
  const url = await fileToDataUrl(blob);
  const img = await loadImageFromUrl(url);
  const w = Math.min(2048, img.naturalWidth || 1024);
  const h = Math.min(2048, img.naturalHeight || 1024);

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = w;
  srcCanvas.height = h;
  const sCtx = srcCanvas.getContext('2d')!;
  sCtx.drawImage(img, 0, 0, w, h);
  const srcData = sCtx.getImageData(0, 0, w, h).data;

  const extractGray = (offset: 0 | 1 | 2, suffix: string, channel: SubstanceChannelId): SubstanceTextureSlot => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    const out = ctx.createImageData(w, h);
    const d = out.data;
    for (let i = 0; i < srcData.length; i += 4) {
      const val = srcData[i + offset];
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
      d[i + 3] = 255;
    }
    ctx.putImageData(out, 0, 0);
    return {
      channel,
      fileName: `${sourceName} [${suffix}]`,
      dataUrl: c.toDataURL('image/png'),
    };
  };

  return {
    ao: extractGray(0, 'R:AO', 'ao'),
    roughness: extractGray(1, 'G:Rough', 'roughness'),
    metallic: extractGray(2, 'B:Metal', 'metallic'),
  };
}

export async function extractSubstanceFiles(
  fileList: FileList | File[]
): Promise<{
  slots: Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>;
  materialName: string;
  isDirectXNormal: boolean;
  unmatchedFiles: string[];
}> {
  const raw = Array.from(fileList);
  const imageEntries: { name: string; blob: Blob }[] = [];

  for (const f of raw) {
    if (/\.zip$/i.test(f.name)) {
      const zip = await JSZip.loadAsync(f);
      const entries = Object.values(zip.files).filter(
        (e) => !e.dir && !e.name.startsWith('__MACOSX') && /\.(png|jpe?g|webp)$/i.test(e.name)
      );
      for (const entry of entries) {
        const blob = await entry.async('blob');
        const baseName = entry.name.split('/').pop() || entry.name;
        imageEntries.push({ name: baseName, blob });
      }
    } else if (/\.(png|jpe?g|webp)$/i.test(f.name)) {
      imageEntries.push({ name: f.name, blob: f });
    }
  }

  const slots: Partial<Record<SubstanceChannelId, SubstanceTextureSlot>> = {};
  const unmatchedFiles: string[] = [];
  let isDirectXNormal = false;
  let derivedName = 'Substance_Material';

  for (const entry of imageEntries) {
    if (isPackedOrmFilename(entry.name)) {
      const unpacked = await unpackOrmBlobToChannels(entry.blob, entry.name);
      if (!slots.ao) slots.ao = unpacked.ao;
      if (!slots.roughness) slots.roughness = unpacked.roughness;
      if (!slots.metallic) slots.metallic = unpacked.metallic;
      continue;
    }

    const ch = detectSubstanceChannel(entry.name);
    if (!ch) {
      unmatchedFiles.push(entry.name);
      continue;
    }
    const dataUrl = await fileToDataUrl(entry.blob);
    slots[ch] = {
      channel: ch,
      fileName: entry.name,
      dataUrl,
    };
    if (ch === 'normal' && /directx|dx/i.test(entry.name)) {
      isDirectXNormal = true;
    }
    if (ch === 'baseColor') {
      derivedName =
        stripExtensionAndUdim(entry.name)
          .replace(/[_-]?(base[_-]?color|albedo|diffuse|col|bc)$/i, '') || 'Substance_Material';
    }
  }

  return { slots, materialName: derivedName, isDirectXNormal, unmatchedFiles };
}

function createNeutralCanvas(fillCss: string, size = 16): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = fillCss;
    ctx.fillRect(0, 0, size, size);
  }
  return c;
}

export async function loadSubstanceBundleToThree(
  req: SubstanceTextureSetRequest,
  flipY: boolean,
  maxAniso: number
): Promise<
  ThreePbrTextureBundle & {
    emissiveMap?: THREE.Texture | null;
    alphaMap?: THREE.Texture | null;
  }
> {
  const createdTextures: THREE.Texture[] = [];

  const buildTex = async (
    channel: SubstanceChannelId,
    isColor: boolean,
    fallbackCss: string,
    invertGreen = false
  ): Promise<THREE.CanvasTexture> => {
    const slot = req.slots[channel];
    let canvas: HTMLCanvasElement;
    if (slot) {
      const img = await loadImageFromUrl(slot.dataUrl);
      const w = Math.min(2048, img.naturalWidth || 1024);
      const h = Math.min(2048, img.naturalHeight || 1024);
      canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        if (invertGreen) {
          const imgData = ctx.getImageData(0, 0, w, h);
          const d = imgData.data;
          for (let i = 1; i < d.length; i += 4) {
            d[i] = 255 - d[i];
          }
          ctx.putImageData(imgData, 0, 0);
        }
      }
    } else {
      canvas = createNeutralCanvas(fallbackCss);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.flipY = slot?.flipY ?? flipY;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(req.uvScale, req.uvScale);
    tex.anisotropy = maxAniso;
    if (channel === 'ao') tex.channel = 0;
    tex.needsUpdate = true;
    createdTextures.push(tex);
    return tex;
  };

  const [map, roughnessMap, metalnessMap, normalMap, aoMap] = await Promise.all([
    buildTex('baseColor', true, '#d8dde6', false),
    buildTex('roughness', false, '#888888', false),
    buildTex('metallic', false, '#000000', false),
    buildTex('normal', false, '#8080ff', req.normalDirectXToOpenGL),
    buildTex('ao', false, '#ffffff', false),
  ]);

  let emissiveMap: THREE.CanvasTexture | null = null;
  if (req.slots.emissive) {
    emissiveMap = await buildTex('emissive', true, '#000000', false);
  }

  let alphaMap: THREE.CanvasTexture | null = null;
  if (req.slots.opacity) {
    alphaMap = await buildTex('opacity', false, '#ffffff', false);
  }

  return {
    map,
    roughnessMap,
    metalnessMap,
    normalMap,
    aoMap,
    emissiveMap,
    alphaMap,
    dispose: () => {
      createdTextures.forEach((t) => t.dispose());
    },
  };
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Falha ao codificar PNG.'));
    }, 'image/png');
  });
}

async function dataUrlToNormalizedPngBlob(
  dataUrl: string,
  invertGreen = false
): Promise<Blob> {
  const img = await loadImageFromUrl(dataUrl);
  const w = Math.min(2048, img.naturalWidth || 1024);
  const h = Math.min(2048, img.naturalHeight || 1024);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  if (invertGreen) {
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    for (let i = 1; i < d.length; i += 4) {
      d[i] = 255 - d[i];
    }
    ctx.putImageData(imgData, 0, 0);
  }
  return canvasToPngBlob(c);
}

function buildOrmPackedCanvas(
  aoCanvas: HTMLCanvasElement | null,
  roughCanvas: HTMLCanvasElement | null,
  metalCanvas: HTMLCanvasElement | null
): HTMLCanvasElement {
  const ref = aoCanvas || roughCanvas || metalCanvas;
  const w = ref ? ref.width : 512;
  const h = ref ? ref.height : 512;

  const sampleChannel = (src: HTMLCanvasElement | null): Uint8ClampedArray | null => {
    if (!src) return null;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d')!;
    tctx.drawImage(src, 0, 0, w, h);
    return tctx.getImageData(0, 0, w, h).data;
  };

  const aoData = sampleChannel(aoCanvas);
  const roughData = sampleChannel(roughCanvas);
  const metalData = sampleChannel(metalCanvas);

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = aoData ? aoData[i] : 255;
    d[i + 1] = roughData ? roughData[i] : 128;
    d[i + 2] = metalData ? metalData[i] : 0;
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return out;
}

function generateAutoLoadBlenderMaterialPy(
  materialName: string,
  uvScale: number,
  useBump: boolean
): string {
  const safeName = materialName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Substance_Material';
  return `import os
import bpy

# Compativel com Blender 3.5 ou superior (3.x / 4.x / 5.x)
def create_blender_substance_material():
    base_dir = os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.path.dirname(__file__)
    mat = bpy.data.materials.get("${safeName}") or bpy.data.materials.new(name="${safeName}")
    # Blender < 5.0 exige use_nodes; em 5.0+ o atributo e legado
    if bpy.app.version < (5, 0, 0):
        mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (560, 0)
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (220, 0)
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    tex_coord = nt.nodes.new("ShaderNodeTexCoord")
    tex_coord.location = (-860, 0)
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.location = (-660, 0)
    mapping.inputs["Scale"].default_value = (${uvScale.toFixed(2)}, ${uvScale.toFixed(2)}, 1.0)
    nt.links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])

    files = {
        "baseColor": ("${safeName}_BaseColor.png", "sRGB", 340),
        "ao": ("${safeName}_AO.png", "Non-Color", 140),
        "metallic": ("${safeName}_Metallic.png", "Non-Color", -60),
        "roughness": ("${safeName}_Roughness.png", "Non-Color", -260),
        "normal": ("${safeName}_Normal.png", "Non-Color", -480),
        "height": ("${safeName}_Height.png", "Non-Color", -700),
        "emissive": ("${safeName}_Emissive.png", "sRGB", -900),
        "opacity": ("${safeName}_Opacity.png", "Non-Color", -1100),
    }

    tex_nodes = {}
    for key, (fname, cs, y_pos) in files.items():
        path = os.path.join(base_dir, fname)
        if os.path.isfile(path):
            img = bpy.data.images.load(path, check_existing=True)
            img.colorspace_settings.name = cs
            node = nt.nodes.new("ShaderNodeTexImage")
            node.image = img
            node.location = (-380, y_pos)
            nt.links.new(mapping.outputs["Vector"], node.inputs["Vector"])
            tex_nodes[key] = node

    if "baseColor" in tex_nodes and "ao" in tex_nodes:
        mix = nt.nodes.new("ShaderNodeMix")
        mix.data_type = "RGBA"
        mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        mix.location = (-40, 260)
        nt.links.new(tex_nodes["baseColor"].outputs["Color"], mix.inputs[6])
        nt.links.new(tex_nodes["ao"].outputs["Color"], mix.inputs[7])
        nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
    elif "baseColor" in tex_nodes:
        nt.links.new(tex_nodes["baseColor"].outputs["Color"], bsdf.inputs["Base Color"])

    if "metallic" in tex_nodes:
        nt.links.new(tex_nodes["metallic"].outputs["Color"], bsdf.inputs["Metallic"])
    if "roughness" in tex_nodes:
        nt.links.new(tex_nodes["roughness"].outputs["Color"], bsdf.inputs["Roughness"])

    normal_out = None
    if "normal" in tex_nodes:
        nrm = nt.nodes.new("ShaderNodeNormalMap")
        nrm.location = (-20, -480)
        nt.links.new(tex_nodes["normal"].outputs["Color"], nrm.inputs["Color"])
        normal_out = nrm.outputs["Normal"]

    if "height" in tex_nodes and ${useBump ? 'True' : 'False'}:
        bump = nt.nodes.new("ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.25
        bump.location = (80, -640)
        nt.links.new(tex_nodes["height"].outputs["Color"], bump.inputs["Height"])
        if normal_out is not None:
            nt.links.new(normal_out, bump.inputs["Normal"])
        normal_out = bump.outputs["Normal"]

        disp = nt.nodes.new("ShaderNodeDisplacement")
        disp.inputs["Scale"].default_value = 0.08
        disp.location = (320, -480)
        nt.links.new(tex_nodes["height"].outputs["Color"], disp.inputs["Height"])
        nt.links.new(disp.outputs["Displacement"], out.inputs["Displacement"])

    if normal_out is not None:
        nt.links.new(normal_out, bsdf.inputs["Normal"])

    if "emissive" in tex_nodes:
        em_in = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
        nt.links.new(tex_nodes["emissive"].outputs["Color"], bsdf.inputs[em_in])
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = 1.0

    if "opacity" in tex_nodes:
        nt.links.new(tex_nodes["opacity"].outputs["Color"], bsdf.inputs["Alpha"])
        if hasattr(mat, "surface_render_method"):  # 4.2+
            mat.surface_render_method = "BLENDED"
        elif hasattr(mat, "blend_method"):  # 3.5 - 4.1
            mat.blend_method = "BLEND"

    obj = bpy.context.active_object
    if obj and obj.type == "MESH":
        if len(obj.data.materials) == 0:
            obj.data.materials.append(mat)
        else:
            obj.active_material = mat

if __name__ == "__main__":
    create_blender_substance_material()
`;
}

function generateBlenderExtensionManifestToml(): string {
  return `schema_version = "1.0.0"

id = "substance_textures_importer"
version = "1.4.0"
name = "Substance Textures Importer (STM)"
tagline = "Importa conjuntos PBR Substance (BaseColor, ORM, Normal, Height, AO, Emissive, Alpha) no Principled BSDF"
maintainer = "AlexDesign Studio"
type = "add-on"
blender_version_min = "4.2.0"  # Extensions Platform existe a partir do 4.2; em 3.5-4.1 instale como add-on (.zip)
license = ["SPDX:GPL-3.0-or-later"]
`;
}

export async function exportSubstanceBundleForBlenderZip(
  req: SubstanceTextureSetRequest
): Promise<Blob> {
  const safeName = req.materialName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Substance_Material';
  const zip = new JSZip();

  const suffixMap: Record<SubstanceChannelId, string> = {
    baseColor: 'BaseColor',
    roughness: 'Roughness',
    metallic: 'Metallic',
    normal: 'Normal',
    height: 'Height',
    ao: 'AO',
    emissive: 'Emissive',
    opacity: 'Opacity',
  };

  for (const ch of Object.keys(suffixMap) as SubstanceChannelId[]) {
    const slot = req.slots[ch];
    if (!slot) continue;
    const invertG = ch === 'normal' && req.normalDirectXToOpenGL;
    const pngBlob = await dataUrlToNormalizedPngBlob(slot.dataUrl, invertG);
    zip.file(`${safeName}_${suffixMap[ch]}.png`, pngBlob);
  }

  zip.file(
    `${safeName}_blender_material.py`,
    generateAutoLoadBlenderMaterialPy(safeName, req.uvScale, req.useBumpConversion)
  );
  zip.file('blender_extension/substance_textures_importer/__init__.py', generateBlenderSubstanceImporterAddonPy());
  zip.file('blender_extension/substance_textures_importer/blender_manifest.toml', generateBlenderExtensionManifestToml());

  return zip.generateAsync({ type: 'blob' });
}

export async function exportProceduralPbrForBlenderZip(
  params: ProceduralPbrParams,
  size = 1024
): Promise<Blob> {
  const safeName = `SBSAR_${params.preset}`;
  const maps = generateProceduralPbrCanvases(params, size);
  const ormCanvas = buildOrmPackedCanvas(maps.ao, maps.roughness, maps.metallic);

  const zip = new JSZip();
  const [bc, ro, me, no, he, ao, orm] = await Promise.all([
    canvasToPngBlob(maps.baseColor),
    canvasToPngBlob(maps.roughness),
    canvasToPngBlob(maps.metallic),
    canvasToPngBlob(maps.normal),
    canvasToPngBlob(maps.height),
    canvasToPngBlob(maps.ao),
    canvasToPngBlob(ormCanvas),
  ]);

  zip.file(`${safeName}_BaseColor.png`, bc);
  zip.file(`${safeName}_Roughness.png`, ro);
  zip.file(`${safeName}_Metallic.png`, me);
  zip.file(`${safeName}_Normal.png`, no);
  zip.file(`${safeName}_Height.png`, he);
  zip.file(`${safeName}_AO.png`, ao);
  zip.file(`${safeName}_ORM.png`, orm);
  zip.file(`${safeName}_blender_material.py`, generateAutoLoadBlenderMaterialPy(safeName, 1.0, true));
  zip.file('blender_extension/substance_textures_importer/__init__.py', generateBlenderSubstanceImporterAddonPy());
  zip.file('blender_extension/substance_textures_importer/blender_manifest.toml', generateBlenderExtensionManifestToml());

  return zip.generateAsync({ type: 'blob' });
}

export function generateBlenderSubstanceImporterAddonPy(): string {
  return `bl_info = {
    "name": "Substance Textures Importer (STM)",
    "author": "Kos-Design / AlexDesign Studio",
    "version": (1, 4, 0),
    "blender": (3, 5, 0),
    "location": "File > Import > Substance textures | Shader Editor (N) > STM | Properties > Material",
    "description": "Compativel com Blender 3.5 ou superior. Importa pacotes PBR Substance (BaseColor, Roughness, Metallic, ORM, Normal, Height, AO, Emissive, Opacity).",
    "category": "Import-Export",
}

import os
import re
import bpy
from bpy_extras.io_utils import ImportHelper
from bpy.props import CollectionProperty, BoolProperty, FloatProperty, StringProperty

CHANNEL_PATTERNS = {
    "orm": r"(occlusionroughnessmetallic|[_-]orm$|[_-]arm$|[_-]rma$|[_-]mrao$)",
    "base_color": r"(base[_-]?color|basecolor|albedo|diffuse|[_-]col$|[_-]bc$)",
    "roughness": r"(roughness|[_-]rough$|[_-]rgh$)",
    "metallic": r"(metallic|metalness|[_-]metal$|[_-]met$)",
    "normal": r"(normal|[_-]nrm$|[_-]norm$|[_-]nor$)",
    "height": r"(height|displacement|[_-]disp$|[_-]hgt$|bump)",
    "ao": r"(ambient[_-]?occlusion|mixed[_-]?ao|[_-]ao$|occlusion)",
    "emissive": r"(emissive|emission|[_-]emi$)",
    "opacity": r"(opacity|alpha|transparency|[_-]opa$)",
}

def detect_channel(filename: str):
    stem = os.path.splitext(filename)[0].lower()
    stem = re.sub(r"[._-](1\\d{3})$", "", stem)
    for ch, pat in CHANNEL_PATTERNS.items():
        if re.search(pat, stem):
            return ch
    return None

class STM_OT_import_substance_textures(bpy.types.Operator, ImportHelper):
    bl_idname = "import_scene.substance_textures_importer"
    bl_label = "Substance textures"
    bl_options = {"REGISTER", "UNDO"}

    files: CollectionProperty(type=bpy.types.OperatorFileListElement)
    filter_glob: StringProperty(default="*.png;*.jpg;*.jpeg;*.tif;*.tiff;*.exr;*.webp", options={"HIDDEN"})
    material_name: StringProperty(name="Material", default="Substance_Material")
    uv_scale: FloatProperty(name="Escala UV", default=1.0, min=0.1, max=20.0)
    invert_normal_g: BoolProperty(name="Normal DirectX -> OpenGL (Inverter G)", default=False)
    use_bump_conversion: BoolProperty(name="Converter Height/Bump automaticamente", default=True)

    def execute(self, context):
        folder = os.path.dirname(self.filepath)
        mat = context.material or bpy.data.materials.new(name=self.material_name)
        # Blender < 5.0 exige use_nodes; em 5.0+ o atributo e legado
        if bpy.app.version < (5, 0, 0):
            mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()

        out = nt.nodes.new("ShaderNodeOutputMaterial")
        out.location = (560, 0)
        bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
        bsdf.location = (220, 0)
        nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

        tex_coord = nt.nodes.new("ShaderNodeTexCoord")
        tex_coord.location = (-860, 0)
        mapping = nt.nodes.new("ShaderNodeMapping")
        mapping.location = (-660, 0)
        mapping.inputs["Scale"].default_value = (self.uv_scale, self.uv_scale, 1.0)
        nt.links.new(tex_coord.outputs["UV"], mapping.inputs["Vector"])

        loaded = {}
        for f in self.files:
            ch = detect_channel(f.name)
            if ch:
                img = bpy.data.images.load(os.path.join(folder, f.name), check_existing=True)
                img.colorspace_settings.name = "sRGB" if ch in ("base_color", "emissive") else "Non-Color"
                loaded[ch] = img

        y_offsets = {
            "base_color": 340,
            "ao": 140,
            "orm": -40,
            "metallic": -60,
            "roughness": -260,
            "normal": -480,
            "height": -700,
            "emissive": -900,
            "opacity": -1100,
        }
        tex_nodes = {}
        for ch, img in loaded.items():
            node = nt.nodes.new("ShaderNodeTexImage")
            node.image = img
            node.location = (-380, y_offsets.get(ch, 0))
            nt.links.new(mapping.outputs["Vector"], node.inputs["Vector"])
            tex_nodes[ch] = node

        orm_sep = None
        if "orm" in tex_nodes:
            orm_sep = nt.nodes.new("ShaderNodeSeparateColor")
            orm_sep.location = (-160, -40)
            nt.links.new(tex_nodes["orm"].outputs["Color"], orm_sep.inputs["Color"])

        ao_socket = tex_nodes["ao"].outputs["Color"] if "ao" in tex_nodes else (orm_sep.outputs["Red"] if orm_sep else None)
        rough_socket = tex_nodes["roughness"].outputs["Color"] if "roughness" in tex_nodes else (orm_sep.outputs["Green"] if orm_sep else None)
        metal_socket = tex_nodes["metallic"].outputs["Color"] if "metallic" in tex_nodes else (orm_sep.outputs["Blue"] if orm_sep else None)

        if "base_color" in tex_nodes and ao_socket is not None:
            mix = nt.nodes.new("ShaderNodeMix")
            mix.data_type = "RGBA"
            mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 1.0
            mix.location = (-40, 260)
            nt.links.new(tex_nodes["base_color"].outputs["Color"], mix.inputs[6])
            nt.links.new(ao_socket, mix.inputs[7])
            nt.links.new(mix.outputs[2], bsdf.inputs["Base Color"])
        elif "base_color" in tex_nodes:
            nt.links.new(tex_nodes["base_color"].outputs["Color"], bsdf.inputs["Base Color"])

        if metal_socket is not None:
            nt.links.new(metal_socket, bsdf.inputs["Metallic"])
        if rough_socket is not None:
            nt.links.new(rough_socket, bsdf.inputs["Roughness"])

        normal_output = None
        if "normal" in tex_nodes:
            nrm = nt.nodes.new("ShaderNodeNormalMap")
            nrm.location = (-20, -480)
            if self.invert_normal_g:
                sep = nt.nodes.new("ShaderNodeSeparateColor")
                sep.location = (-220, -480)
                inv = nt.nodes.new("ShaderNodeMath")
                inv.operation = "SUBTRACT"
                inv.inputs[0].default_value = 1.0
                inv.location = (-160, -560)
                comb = nt.nodes.new("ShaderNodeCombineColor")
                comb.location = (-100, -480)
                nt.links.new(tex_nodes["normal"].outputs["Color"], sep.inputs["Color"])
                nt.links.new(sep.outputs["Red"], comb.inputs["Red"])
                nt.links.new(sep.outputs["Green"], inv.inputs[1])
                nt.links.new(inv.outputs["Value"], comb.inputs["Green"])
                nt.links.new(sep.outputs["Blue"], comb.inputs["Blue"])
                nt.links.new(comb.outputs["Color"], nrm.inputs["Color"])
            else:
                nt.links.new(tex_nodes["normal"].outputs["Color"], nrm.inputs["Color"])
            normal_output = nrm.outputs["Normal"]

        if "height" in tex_nodes and self.use_bump_conversion:
            bump = nt.nodes.new("ShaderNodeBump")
            bump.inputs["Strength"].default_value = 0.25
            bump.location = (80, -640)
            nt.links.new(tex_nodes["height"].outputs["Color"], bump.inputs["Height"])
            if normal_output is not None:
                nt.links.new(normal_output, bump.inputs["Normal"])
            normal_output = bump.outputs["Normal"]

            disp = nt.nodes.new("ShaderNodeDisplacement")
            disp.inputs["Scale"].default_value = 0.08
            disp.location = (320, -480)
            nt.links.new(tex_nodes["height"].outputs["Color"], disp.inputs["Height"])
            nt.links.new(disp.outputs["Displacement"], out.inputs["Displacement"])

        if normal_output is not None:
            nt.links.new(normal_output, bsdf.inputs["Normal"])

        if "emissive" in tex_nodes:
            em_input = "Emission Color" if "Emission Color" in bsdf.inputs else "Emission"
            nt.links.new(tex_nodes["emissive"].outputs["Color"], bsdf.inputs[em_input])
            if "Emission Strength" in bsdf.inputs:
                bsdf.inputs["Emission Strength"].default_value = 1.0

        if "opacity" in tex_nodes:
            nt.links.new(tex_nodes["opacity"].outputs["Color"], bsdf.inputs["Alpha"])
            if hasattr(mat, "surface_render_method"):  # 4.2+
                mat.surface_render_method = "BLENDED"
            elif hasattr(mat, "blend_method"):  # 3.5 - 4.1
                mat.blend_method = "BLEND"

        if context.active_object and context.active_object.active_material is None:
            context.active_object.active_material = mat

        self.report({"INFO"}, f"Substance PBR importado: {len(tex_nodes)} canal(is).")
        return {"FINISHED"}

class STM_PT_shader_editor_panel(bpy.types.Panel):
    bl_label = "Substance Textures Importer"
    bl_space_type = "NODE_EDITOR"
    bl_region_type = "UI"
    bl_category = "STM"

    def draw(self, context):
        self.layout.operator(STM_OT_import_substance_textures.bl_idname, text="Import Substance Textures", icon="IMPORT")

class STM_PT_material_props_panel(bpy.types.Panel):
    bl_label = "Substance Textures Importer"
    bl_space_type = "PROPERTIES"
    bl_region_type = "WINDOW"
    bl_context = "material"

    def draw(self, context):
        self.layout.operator(STM_OT_import_substance_textures.bl_idname, text="Import Substance Textures", icon="IMPORT")

def menu_func_import(self, context):
    self.layout.operator(STM_OT_import_substance_textures.bl_idname, text="Substance textures")

classes = (
    STM_OT_import_substance_textures,
    STM_PT_shader_editor_panel,
    STM_PT_material_props_panel,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.TOPBAR_MT_file_import.append(menu_func_import)

def unregister():
    bpy.types.TOPBAR_MT_file_import.remove(menu_func_import)
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()
`;
}
