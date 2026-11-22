export type TargetEngine = 'BLENDER' | 'UNITY' | 'UNREAL' | 'GODOT';
export type ShaderPreset = 'PBR_PRINCIPLED' | 'PBR_CEL_OUTLINE' | 'ANIME_TOON';
export type RigPreset = 'HUMANOIDE' | 'BIPEDE' | 'QUADRUPEDE';

export type BoneTuple = readonly [
  name: string,
  parent: string | null,
  head: readonly [number, number, number],
  tail: readonly [number, number, number],
];

export interface RigPresetDefinition {
  id: RigPreset;
  label: string;
  shortLabel: string;
  boneCount: number;
  description: string;
  bones: readonly BoneTuple[];
}

export const RIG_PRESET_DEFINITIONS: Record<RigPreset, RigPresetDefinition> = {
  HUMANOIDE: {
    id: 'HUMANOIDE',
    label: 'Humanoide (21 Ossos)',
    shortLabel: 'Humanoide',
    boneCount: 21,
    description: 'Esqueleto completo com clavículas, coluna em 3 segmentos e osso dinâmico de cabelo.',
    bones: [
      ['pelvis', null, [0.0, 0.0, 0.92], [0.0, 0.0, 1.04]],
      ['spine_01', 'pelvis', [0.0, 0.0, 1.04], [0.0, 0.0, 1.18]],
      ['spine_02', 'spine_01', [0.0, 0.0, 1.18], [0.0, 0.0, 1.32]],
      ['chest', 'spine_02', [0.0, 0.0, 1.32], [0.0, 0.0, 1.46]],
      ['neck', 'chest', [0.0, 0.0, 1.46], [0.0, 0.0, 1.54]],
      ['head', 'neck', [0.0, 0.0, 1.54], [0.0, 0.0, 1.74]],
      ['hair_dyn', 'head', [0.0, 0.07, 1.66], [0.0, 0.16, 1.46]],
      ['clavicle_L', 'chest', [0.03, 0.0, 1.42], [0.14, 0.0, 1.42]],
      ['upper_arm_L', 'clavicle_L', [0.14, 0.0, 1.42], [0.36, 0.0, 1.42]],
      ['forearm_L', 'upper_arm_L', [0.36, 0.0, 1.42], [0.58, 0.0, 1.42]],
      ['hand_L', 'forearm_L', [0.58, 0.0, 1.42], [0.68, 0.0, 1.42]],
      ['clavicle_R', 'chest', [-0.03, 0.0, 1.42], [-0.14, 0.0, 1.42]],
      ['upper_arm_R', 'clavicle_R', [-0.14, 0.0, 1.42], [-0.36, 0.0, 1.42]],
      ['forearm_R', 'upper_arm_R', [-0.36, 0.0, 1.42], [-0.58, 0.0, 1.42]],
      ['hand_R', 'forearm_R', [-0.58, 0.0, 1.42], [-0.68, 0.0, 1.42]],
      ['thigh_L', 'pelvis', [0.09, 0.0, 0.9], [0.09, 0.0, 0.48]],
      ['shin_L', 'thigh_L', [0.09, 0.0, 0.48], [0.09, 0.0, 0.08]],
      ['foot_L', 'shin_L', [0.09, 0.0, 0.08], [0.09, -0.14, 0.0]],
      ['thigh_R', 'pelvis', [-0.09, 0.0, 0.9], [-0.09, 0.0, 0.48]],
      ['shin_R', 'thigh_R', [-0.09, 0.0, 0.48], [-0.09, 0.0, 0.08]],
      ['foot_R', 'shin_R', [-0.09, 0.0, 0.08], [-0.09, -0.14, 0.0]],
    ],
  },
  BIPEDE: {
    id: 'BIPEDE',
    label: 'Bípede (16 Ossos)',
    shortLabel: 'Bípede',
    boneCount: 16,
    description: 'Esqueleto bípede simplificado sem clavículas, ideal para personagens estilizados e mobile.',
    bones: [
      ['pelvis', null, [0.0, 0.0, 0.9], [0.0, 0.0, 1.06]],
      ['spine', 'pelvis', [0.0, 0.0, 1.06], [0.0, 0.0, 1.38]],
      ['neck', 'spine', [0.0, 0.0, 1.38], [0.0, 0.0, 1.48]],
      ['head', 'neck', [0.0, 0.0, 1.48], [0.0, 0.0, 1.72]],
      ['upper_arm_L', 'spine', [0.15, 0.0, 1.36], [0.36, 0.0, 1.36]],
      ['forearm_L', 'upper_arm_L', [0.36, 0.0, 1.36], [0.58, 0.0, 1.36]],
      ['hand_L', 'forearm_L', [0.58, 0.0, 1.36], [0.68, 0.0, 1.36]],
      ['upper_arm_R', 'spine', [-0.15, 0.0, 1.36], [-0.36, 0.0, 1.36]],
      ['forearm_R', 'upper_arm_R', [-0.36, 0.0, 1.36], [-0.58, 0.0, 1.36]],
      ['hand_R', 'forearm_R', [-0.58, 0.0, 1.36], [-0.68, 0.0, 1.36]],
      ['thigh_L', 'pelvis', [0.09, 0.0, 0.88], [0.09, 0.0, 0.48]],
      ['shin_L', 'thigh_L', [0.09, 0.0, 0.48], [0.09, 0.0, 0.08]],
      ['foot_L', 'shin_L', [0.09, 0.0, 0.08], [0.09, -0.14, 0.0]],
      ['thigh_R', 'pelvis', [-0.09, 0.0, 0.88], [-0.09, 0.0, 0.48]],
      ['shin_R', 'thigh_R', [-0.09, 0.0, 0.48], [-0.09, 0.0, 0.08]],
      ['foot_R', 'shin_R', [-0.09, 0.0, 0.08], [-0.09, -0.14, 0.0]],
    ],
  },
  QUADRUPEDE: {
    id: 'QUADRUPEDE',
    label: 'Quadrúpede (20 Ossos)',
    shortLabel: 'Quadrúpede',
    boneCount: 20,
    description: 'Esqueleto quadrúpede horizontal com coluna articulada, cauda e quatro membros completos.',
    bones: [
      ['pelvis', null, [0.0, 0.42, 0.78], [0.0, 0.24, 0.8]],
      ['spine_01', 'pelvis', [0.0, 0.24, 0.8], [0.0, 0.0, 0.82]],
      ['spine_02', 'spine_01', [0.0, 0.0, 0.82], [0.0, -0.24, 0.84]],
      ['chest', 'spine_02', [0.0, -0.24, 0.84], [0.0, -0.44, 0.86]],
      ['neck', 'chest', [0.0, -0.44, 0.86], [0.0, -0.62, 1.08]],
      ['head', 'neck', [0.0, -0.62, 1.08], [0.0, -0.84, 1.04]],
      ['tail_01', 'pelvis', [0.0, 0.44, 0.8], [0.0, 0.68, 0.86]],
      ['tail_02', 'tail_01', [0.0, 0.68, 0.86], [0.0, 0.92, 0.78]],
      ['front_thigh_L', 'chest', [0.15, -0.38, 0.74], [0.15, -0.38, 0.42]],
      ['front_shin_L', 'front_thigh_L', [0.15, -0.38, 0.42], [0.15, -0.38, 0.08]],
      ['front_paw_L', 'front_shin_L', [0.15, -0.38, 0.08], [0.15, -0.5, 0.0]],
      ['front_thigh_R', 'chest', [-0.15, -0.38, 0.74], [-0.15, -0.38, 0.42]],
      ['front_shin_R', 'front_thigh_R', [-0.15, -0.38, 0.42], [-0.15, -0.38, 0.08]],
      ['front_paw_R', 'front_shin_R', [-0.15, -0.38, 0.08], [-0.15, -0.5, 0.0]],
      ['hind_thigh_L', 'pelvis', [0.15, 0.38, 0.74], [0.15, 0.42, 0.42]],
      ['hind_shin_L', 'hind_thigh_L', [0.15, 0.42, 0.42], [0.15, 0.38, 0.08]],
      ['hind_paw_L', 'hind_shin_L', [0.15, 0.38, 0.08], [0.15, 0.24, 0.0]],
      ['hind_thigh_R', 'pelvis', [-0.15, 0.38, 0.74], [-0.15, 0.42, 0.42]],
      ['hind_shin_R', 'hind_thigh_R', [-0.15, 0.42, 0.42], [-0.15, 0.38, 0.08]],
      ['hind_paw_R', 'hind_shin_R', [-0.15, 0.38, 0.08], [-0.15, 0.24, 0.0]],
    ],
  },
};

export interface StudioConfig {
  targetEngine: TargetEngine;
  rigPreset: RigPreset;
  textureResolution: 1024 | 2048 | 4096;
  uvMargin: number;
  seamAngleDeg: number;
  texelDensity: number;
  shaderPreset: ShaderPreset;
  outlineThickness: number;
  normalStrength: number;
  animEndFrame: number;
}

export interface ExtractedGlbTextures {
  baseColor?: string;
  normal?: string;
  roughness?: string;
  metallic?: string;
  ao?: string;
  emissive?: string;
  opacity?: string;
  height?: string;
}

export interface ImportedUvMesh {
  name: string;
  uvEdges: Float32Array;
  triCount: number;
  sourceType?: 'glb' | 'obj' | 'stl' | 'auto';
  importSerial?: number;
  materialName?: string;
  textures?: ExtractedGlbTextures;
}

export const DEFAULT_STUDIO_CONFIG: StudioConfig = {
  targetEngine: 'UNITY',
  rigPreset: 'HUMANOIDE',
  textureResolution: 2048,
  uvMargin: 0.02,
  seamAngleDeg: 66.0,
  texelDensity: 10.24,
  shaderPreset: 'PBR_PRINCIPLED',
  outlineThickness: 0.008,
  normalStrength: 1.0,
  animEndFrame: 60,
};
