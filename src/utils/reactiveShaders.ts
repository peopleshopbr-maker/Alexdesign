import * as THREE from 'three';

export type ReactiveShaderEffect = 'none' | 'fresnel' | 'dissolve' | 'hologram' | 'distortion';

export interface ReactiveShaderConfig {
  effect: ReactiveShaderEffect;
  intensity: number; // 0..1
  color: string;
  speed: number; // 0.2..3
}

export const DEFAULT_REACTIVE_SHADER: ReactiveShaderConfig = {
  effect: 'none',
  intensity: 0.55,
  color: '#38bdf8',
  speed: 1.0,
};

export type VariableBindingSource = 'mouse_x' | 'mouse_y' | 'scroll' | 'click';
export type VariableBindingTarget =
  | 'animSpeed'
  | 'dissolve'
  | 'fresnel'
  | 'distortion'
  | 'particleRate'
  | 'exposure';

export interface VariableBindingRule {
  id: string;
  enabled: boolean;
  source: VariableBindingSource;
  target: VariableBindingTarget;
  strength: number; // 0..2
}

export const DEFAULT_VARIABLE_BINDINGS: VariableBindingRule[] = [
  {
    id: 'bind_mouse_fresnel',
    enabled: false,
    source: 'mouse_x',
    target: 'fresnel',
    strength: 1.0,
  },
  {
    id: 'bind_scroll_dissolve',
    enabled: false,
    source: 'scroll',
    target: 'dissolve',
    strength: 1.0,
  },
  {
    id: 'bind_click_particles',
    enabled: false,
    source: 'click',
    target: 'particleRate',
    strength: 1.2,
  },
];

export interface ReactiveShaderSharedUniforms {
  uTime: { value: number };
  uEffectMode: { value: number }; // 0=none, 1=fresnel, 2=dissolve, 3=hologram, 4=distortion
  uEffectIntensity: { value: number };
  uEffectColor: { value: THREE.Color };
  uEffectSpeed: { value: number };
}

export function effectToModeInt(effect: ReactiveShaderEffect): number {
  switch (effect) {
    case 'fresnel':
      return 1;
    case 'dissolve':
      return 2;
    case 'hologram':
      return 3;
    case 'distortion':
      return 4;
    default:
      return 0;
  }
}

/**
 * Injects real-time Fresnel rim glow, Noise Dissolve, Scanline Hologram, and Vertex Wave Distortion
 * into any MeshStandardMaterial / MeshPhysicalMaterial while preserving PBR Principled BSDF properties
 * cleanly for Blender & glTF 2.0 export.
 */
export function attachReactiveShaderToMaterial(
  mat: THREE.Material,
  sharedUniforms: ReactiveShaderSharedUniforms
): void {
  if (!(mat instanceof THREE.MeshStandardMaterial)) return;
  if (mat.userData._reactiveShaderAttached) {
    mat.userData._reactiveUniforms = sharedUniforms;
    return;
  }

  mat.userData._reactiveShaderAttached = true;
  mat.userData._reactiveUniforms = sharedUniforms;

  mat.customProgramCacheKey = () => 'alexdesign_reactive_vfx_v1';
  mat.onBeforeCompile = (shader) => {
    const u = mat.userData._reactiveUniforms as ReactiveShaderSharedUniforms;
    shader.uniforms.uFxTime = u.uTime;
    shader.uniforms.uFxMode = u.uEffectMode;
    shader.uniforms.uFxIntensity = u.uEffectIntensity;
    shader.uniforms.uFxColor = u.uEffectColor;
    shader.uniforms.uFxSpeed = u.uEffectSpeed;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uFxTime;
        uniform float uFxMode;
        uniform float uFxIntensity;
        uniform float uFxSpeed;
        varying vec3 vFxLocalPos;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFxLocalPos = position;
        if (uFxMode > 3.5 && uFxMode < 4.5) {
          float wave = sin(position.y * 8.0 + uFxTime * uFxSpeed * 3.5) * cos(position.x * 6.0 + uFxTime * 2.0);
          transformed += normal * wave * (0.045 * uFxIntensity);
        }`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uFxTime;
        uniform float uFxMode;
        uniform float uFxIntensity;
        uniform vec3 uFxColor;
        uniform float uFxSpeed;
        varying vec3 vFxLocalPos;

        float fxHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float fxNoise(vec3 x) {
          vec3 i = floor(x);
          vec3 f = fract(x);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(fxHash(i + vec3(0,0,0)), fxHash(i + vec3(1,0,0)), f.x),
                mix(fxHash(i + vec3(0,1,0)), fxHash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(fxHash(i + vec3(0,0,1)), fxHash(i + vec3(1,0,1)), f.x),
                mix(fxHash(i + vec3(0,1,1)), fxHash(i + vec3(1,1,1)), f.x), f.y),
            f.z
          );
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        vec3 fxViewDir = normalize(vViewPosition);
        float fxFresnel = pow(1.0 - clamp(abs(dot(normal, fxViewDir)), 0.0, 1.0), 2.6);

        if (uFxMode > 0.5 && uFxMode < 1.5) {
          // Fresnel glow
          totalEmissiveRadiance += uFxColor * fxFresnel * (uFxIntensity * 2.8);
        } else if (uFxMode > 1.5 && uFxMode < 2.5) {
          // Dissolve noise
          float n = fxNoise(vFxLocalPos * 5.5 + vec3(0.0, uFxTime * uFxSpeed * 0.35, 0.0));
          float cutoff = uFxIntensity * 0.92;
          if (n < cutoff) discard;
          float edge = smoothstep(cutoff, cutoff + 0.08, n);
          totalEmissiveRadiance += uFxColor * (1.0 - edge) * 3.5;
        } else if (uFxMode > 2.5 && uFxMode < 3.5) {
          // Hologram scanlines + rim
          float scan = 0.5 + 0.5 * sin(vFxLocalPos.y * 38.0 - uFxTime * uFxSpeed * 8.0);
          totalEmissiveRadiance += uFxColor * (fxFresnel * 1.9 + scan * 0.55) * max(0.2, uFxIntensity);
          diffuseColor.a *= clamp(0.35 + fxFresnel * 0.6 + scan * 0.25, 0.2, 1.0);
        }`
      );
  };
  mat.needsUpdate = true;
}
