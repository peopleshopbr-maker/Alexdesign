/**
 * rustCoreTypes.ts — Tipos espelhando as structs do rust-core/src/lib.rs.
 * Mantém contrato forte entre Rust/WASM e TypeScript estrito.
 */

export interface AssetIssue {
  severity: 'error' | 'warn' | 'info' | string;
  message: string;
  mesh_name?: string | null;
}

export interface GltfValidationReport {
  ok: boolean;
  file_name: string;
  file_size_bytes: number;
  container: 'glb' | 'gltf' | 'unknown' | string;
  generator: string;
  version_major: number;
  version_minor: number;
  meshes: number;
  primitives: number;
  vertices: number;
  triangles: number;
  materials: number;
  textures: number;
  skins: number;
  bones: number;
  animations: number;
  has_uvs: boolean;
  has_normals: boolean;
  has_draco: boolean;
  scale_mode: string;
  suggested_scale: number;
  issues: AssetIssue[];
}

export interface SceneSnapshot {
  has_model: boolean;
  has_skeleton: boolean;
  bone_count: number;
  clip_count: number;
  has_emitter_selected: boolean;
  is_playing: boolean;
  is_importing: boolean;
}

export interface CommandDecision {
  allowed: boolean;
  reason: string;
}
