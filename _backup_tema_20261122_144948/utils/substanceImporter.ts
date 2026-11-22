import { ExtractedGlbTextures } from '../types/studioConfig';

export type SubstanceChannelId =
  | 'baseColor'
  | 'normal'
  | 'roughness'
  | 'metallic'
  | 'ao'
  | 'emissive'
  | 'opacity'
  | 'height';

export interface SubstanceChannelMeta {
  id: SubstanceChannelId;
  label: string;
  shortLabel: string;
  colorSpace: 'sRGB' | 'Linear';
  hint: string;
  blenderInput: string;
}

export const SUBSTANCE_CHANNELS: SubstanceChannelMeta[] = [
  {
    id: 'baseColor',
    label: 'Base Color / Albedo',
    shortLabel: 'BaseColor',
    colorSpace: 'sRGB',
    hint: 'Difuso / Cor base (sRGB)',
    blenderInput: 'Base Color',
  },
  {
    id: 'normal',
    label: 'Normal Map',
    shortLabel: 'Normal',
    colorSpace: 'Linear',
    hint: 'Normal Tangent Space (Non-Color)',
    blenderInput: 'Normal',
  },
  {
    id: 'roughness',
    label: 'Roughness',
    shortLabel: 'Roughness',
    colorSpace: 'Linear',
    hint: 'Aspereza microsuperfície (Linear)',
    blenderInput: 'Roughness',
  },
  {
    id: 'metallic',
    label: 'Metallic',
    shortLabel: 'Metallic',
    colorSpace: 'Linear',
    hint: 'Máscara dielétrico / metal (Linear)',
    blenderInput: 'Metallic',
  },
  {
    id: 'ao',
    label: 'Ambient Occlusion',
    shortLabel: 'AO',
    colorSpace: 'Linear',
    hint: 'Sombreamento de cavidade',
    blenderInput: 'AO Multiply',
  },
  {
    id: 'emissive',
    label: 'Emissive',
    shortLabel: 'Emissive',
    colorSpace: 'sRGB',
    hint: 'Emissão luminosa HDR (sRGB)',
    blenderInput: 'Emission Color',
  },
  {
    id: 'opacity',
    label: 'Opacity / Alpha',
    shortLabel: 'Opacity',
    colorSpace: 'Linear',
    hint: 'Máscara de transparência',
    blenderInput: 'Alpha',
  },
  {
    id: 'height',
    label: 'Height / Displacement',
    shortLabel: 'Height',
    colorSpace: 'Linear',
    hint: 'Mapa de altura / relevo',
    blenderInput: 'Bump / Displacement',
  },
];

export interface SubstanceTextureSlot {
  channel: SubstanceChannelId;
  fileName: string;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes?: number;
  source?: 'upload' | 'glb';
}

export interface SubstanceTextureSetRequest {
  requestId: number;
  materialName: string;
  slots: Partial<Record<SubstanceChannelId, SubstanceTextureSlot>>;
  normalStrength: number;
  emissiveIntensity: number;
  aoIntensity: number;
}

const CHANNEL_PATTERNS: { channel: SubstanceChannelId; regex: RegExp }[] = [
  { channel: 'baseColor', regex: /(base[_-]?color|albedo|diffuse|diff|col|color)(?=\.|_|-|$)/i },
  { channel: 'normal', regex: /(normal|nrm|norm|bump)(?=\.|_|-|$)/i },
  { channel: 'roughness', regex: /(roughness|rough|rgh)(?=\.|_|-|$)/i },
  { channel: 'metallic', regex: /(metallic|metalness|metal|met)(?=\.|_|-|$)/i },
  { channel: 'ao', regex: /(ambient[_-]?occlusion|occlusion|ao|cavity)(?=\.|_|-|$)/i },
  { channel: 'emissive', regex: /(emissive|emission|emit|glow)(?=\.|_|-|$)/i },
  { channel: 'opacity', regex: /(opacity|alpha|transp|cutout)(?=\.|_|-|$)/i },
  { channel: 'height', regex: /(height|displace|disp|depth)(?=\.|_|-|$)/i },
];

export function detectSubstanceChannel(filename: string): SubstanceChannelId | null {
  const clean = filename.split('/').pop() || filename;
  for (const item of CHANNEL_PATTERNS) {
    if (item.regex.test(clean)) return item.channel;
  }
  return null;
}

export function extractMaterialNameFromFile(filename: string): string {
  const clean = (filename.split('/').pop() || filename).replace(/\.(png|jpe?g|webp|tga|bmp)$/i, '');
  const stripped = clean
    .replace(/[_-]?(base[_-]?color|albedo|diffuse|diff|normal|nrm|norm|roughness|rough|rgh|metallic|metalness|metal|ambient[_-]?occlusion|occlusion|ao|emissive|emission|opacity|alpha|height|disp).*$/i, '')
    .replace(/[_-]+$/, '');
  return stripped || 'Substance_Material';
}

export function readImageFileAsSlot(
  file: File,
  channel: SubstanceChannelId
): Promise<SubstanceTextureSlot> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}`));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onload = () => {
        resolve({
          channel,
          fileName: file.name,
          dataUrl,
          width: img.naturalWidth || 1024,
          height: img.naturalHeight || 1024,
          sizeBytes: file.size,
          source: 'upload',
        });
      };
      img.onerror = () => {
        resolve({
          channel,
          fileName: file.name,
          dataUrl,
          width: 1024,
          height: 1024,
          sizeBytes: file.size,
          source: 'upload',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function buildSubstanceSlotsFromGlbTextures(
  materialName: string,
  textures?: ExtractedGlbTextures
): Partial<Record<SubstanceChannelId, SubstanceTextureSlot>> {
  if (!textures) return {};
  const result: Partial<Record<SubstanceChannelId, SubstanceTextureSlot>> = {};
  const keys: SubstanceChannelId[] = [
    'baseColor',
    'normal',
    'roughness',
    'metallic',
    'ao',
    'emissive',
    'opacity',
    'height',
  ];

  for (const ch of keys) {
    const url = textures[ch];
    if (!url) continue;
    result[ch] = {
      channel: ch,
      fileName: `${materialName}_${ch}.png`,
      dataUrl: url,
      width: 1024,
      height: 1024,
      source: 'glb',
    };
  }
  return result;
}
