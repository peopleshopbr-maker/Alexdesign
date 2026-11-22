/**
 * rustBridge.ts — Ponte única entre a UI React/Three.js e o núcleo Rust/WASM.
 *
 *Responsabilidades:
 *  1. Carregar o módulo WASM uma única vez (singleton, lazy).
 *  2. Validar arquivos GLB/glTF ANTES do Three.js tentar renderizar.
 *  3. Ser o único gate de execução de comandos (máquina de estados no Rust).
 *  4. Registrar módulos externos (plugins) sem acoplamento com Three.js.
 *
 * Compatível com TypeScript estrito e Vite (import de wasm com `?init`).
 */

import type {
  AssetIssue,
  GltfValidationReport,
  SceneSnapshot,
  CommandDecision,
} from './rustCoreTypes';

export type { AssetIssue, GltfValidationReport, SceneSnapshot, CommandDecision };

// ============================================================================
// ESTADO DO MÓDULO
// ============================================================================

type RustCoreModule = {
  WasmValidator: new () => {
    validate_bytes: (bytes: Uint8Array, fileName: string) => unknown;
    validate_bytes_json: (bytes: Uint8Array, fileName: string) => string;
  };
  CommandGate: new () => {
    can_execute: (command: string, snapshot: unknown) => unknown;
    can_execute_json: (command: string, snapshotJson: string) => string;
  };
  command_ids: () => unknown[];
};

interface RustBridgeState {
  module: RustCoreModule | null;
  loadPromise: Promise<RustCoreModule> | null;
  loadError: string | null;
  validator: InstanceType<RustCoreModule['WasmValidator']> | null;
  gate: InstanceType<RustCoreModule['CommandGate']> | null;
}

const state: RustBridgeState = {
  module: null,
  loadPromise: null,
  loadError: null,
  validator: null,
  gate: null,
};

export class RustCoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RustCoreUnavailableError';
  }
}

// ============================================================================
// CARREGAMENTO (lazy singleton, fallback seguro)
// ============================================================================

/**
 * Carrega o módulo WASM. Retorna `true` se o Rust está disponível.
 * Se falhar (build Rust ausente, navegador sem WASM, etc.), a ponte
 * entra em modo degradado e usa as regras TypeScript de fallback.
 */
export async function initRustCore(): Promise<boolean> {
  if (state.module) return true;
  if (state.loadPromise) return state.loadPromise.then(() => true).catch(() => false);

  state.loadPromise = (async () => {
    try {
      // Vite: importa o wasm-bindgen init. O pacote `alexdesign-rust-core`
      // deve ser construído com `wasm-pack build --target web` e o resultado
      // copiado para `rust-core/pkg/`. Enquanto o build Rust não existir,
      // a ponte opera em modo degradado com as regras de fallback TS.
      const pkgUrl = '../../rust-core/pkg/alexdesign_rust_core.js';
      const pkg = (await import(/* @vite-ignore */ pkgUrl)) as unknown as RustCoreModule;
      const mod = (await (pkg as unknown as { default: () => Promise<RustCoreModule> }).default()) as unknown as RustCoreModule;
      state.module = mod;
      state.validator = new mod.WasmValidator();
      state.gate = new mod.CommandGate();
      console.info('[rustBridge] rust-core WASM carregado com sucesso.');
      return mod;
    } catch (err) {
      state.loadError =
        err instanceof Error ? err.message : 'Falha desconhecida ao carregar rust-core WASM.';
      console.warn('[rustBridge] WASM indisponível, usando fallback TS:', state.loadError);
      throw err;
    }
  })();

  try {
    await state.loadPromise;
    return true;
  } catch {
    return false;
  }
}

export function isRustCoreReady(): boolean {
  return state.module !== null && state.validator !== null && state.gate !== null;
}

export function getRustCoreLoadError(): string | null {
  return state.loadError;
}

function requireValidator() {
  if (!state.validator) throw new RustCoreUnavailableError('rust-core WASM não carregado.');
  return state.validator;
}

function requireGate() {
  if (!state.gate) throw new RustCoreUnavailableError('rust-core WASM não carregado.');
  return state.gate;
}

// ============================================================================
// 1. VALIDAÇÃO DE GLB / glTF (com fallback TS)
// ============================================================================

export interface ValidationResult {
  /** true se o arquivo pode seguir para o Three.js */
  allowed: boolean;
  /** Relatório completo (do Rust quando disponível, senão fallback TS) */
  report: GltfValidationReport;
  /** 'rust' quando validado pelo núcleo Rust, 'ts-fallback' caso contrário */
  source: 'rust' | 'ts-fallback';
}

/**
 * Validação de fallback em TypeScript — usada apenas quando o WASM não
 * está disponível. Espelha a lógica do lib.rs.
 */
function validateFallback(bytes: Uint8Array, fileName: string): GltfValidationReport {
  const issues: AssetIssue[] = [];
  const isGlb =
    bytes.length >= 4 &&
    bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46;

  if (bytes.length === 0) {
    issues.push({ severity: 'error', message: 'Arquivo vazio (0 bytes).' });
  }
  if (!isGlb && (bytes[0] !== 0x7b)) {
    issues.push({
      severity: 'error',
      message: 'Cabeçalho desconhecido — não é GLB nem JSON glTF.',
    });
  }

  let meshes = 0;
  let animations = 0;
  let skins = 0;
  let materials = 0;

  if (isGlb) {
    if (bytes.length < 20) {
      issues.push({ severity: 'error', message: 'GLB menor que o cabeçalho mínimo de 20 bytes.' });
    } else {
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      const version = view.getUint32(4, true);
      if (version !== 2) {
        issues.push({ severity: 'error', message: `Versão GLB ${version} (esperado 2).` });
      }
      const totalLen = view.getUint32(8, true);
      if (totalLen > bytes.length) {
        issues.push({
          severity: 'error',
          message: `Tamanho declarado (${totalLen}) maior que o arquivo real (${bytes.length}).`,
        });
      }
      // tenta extrair JSON chunk
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const chunkLen = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);
        offset += 8;
        if (chunkType === 0x4e4f534a) {
          try {
            const jsonText = new TextDecoder('utf-8').decode(
              bytes.subarray(offset, Math.min(offset + chunkLen, bytes.length))
            );
            const doc = JSON.parse(jsonText);
            meshes = (doc.meshes ?? []).length;
            animations = (doc.animations ?? []).length;
            skins = (doc.skins ?? []).length;
            materials = (doc.materials ?? []).length;
            if (meshes === 0) {
              issues.push({ severity: 'error', message: 'Nenhuma malha definida no arquivo.' });
            }
            if (materials === 0) {
              issues.push({
                severity: 'warn',
                message: 'Nenhum material definido (Three.js aplicará material padrão).',
              });
            }
            if (skins === 0) {
              issues.push({
                severity: 'info',
                message: 'Sem esqueleto/skin — comandos de rigging bloqueados até Auto-Rig.',
              });
            }
            if (animations === 0) {
              issues.push({
                severity: 'info',
                message: 'Sem animações embutidas — timeline ficará vazia.',
              });
            }
          } catch (e) {
            issues.push({
              severity: 'error',
              message: `JSON glTF inválido: ${e instanceof Error ? e.message : String(e)}`,
            });
          }
          break;
        }
        offset += chunkLen;
      }
    }
  }

  const hasError = issues.some((i) => i.severity === 'error');
  return {
    ok: !hasError && (meshes > 0 || isGlb === false),
    file_name: fileName,
    file_size_bytes: bytes.length,
    container: isGlb ? 'glb' : bytes[0] === 0x7b ? 'gltf' : 'unknown',
    generator: 'fallback',
    version_major: 2,
    version_minor: 0,
    meshes,
    primitives: meshes,
    vertices: 0,
    triangles: 0,
    materials,
    textures: 0,
    skins,
    bones: 0,
    animations,
    has_uvs: true,
    has_normals: true,
    has_draco: false,
    scale_mode: 'auto_normalized',
    suggested_scale: 1,
    issues,
  };
}

/**
 * Valida bytes brutos antes do Three.js tocar no arquivo.
 * Nunca lança — falha vira `allowed: false` com issue de severidade error.
 */
export async function validateGltfBytes(
  bytes: Uint8Array,
  fileName: string
): Promise<ValidationResult> {
  try {
    await initRustCore();
    if (state.validator) {
      const raw = state.validator.validate_bytes(bytes, fileName) as GltfValidationReport;
      const ok = Boolean(raw?.ok);
      return { allowed: ok, report: raw, source: 'rust' };
    }
  } catch (err) {
    console.warn('[rustBridge] validação Rust falhou, usando fallback TS:', err);
  }
  const report = validateFallback(bytes, fileName);
  return { allowed: report.ok, report, source: 'ts-fallback' };
}

/**
 * Helper para validar um `File` direto antes do import.
 */
export async function validateGltfFile(file: File): Promise<ValidationResult> {
  const buf = await file.arrayBuffer();
  return validateGltfBytes(new Uint8Array(buf), file.name);
}

// ============================================================================
// 2. MÁQUINA DE ESTADOS — GATE DE COMANDOS
// ============================================================================

/**
 * Snapshot mínimo da cena que o Rust usa para decidir.
 * Construa a partir do estado do Viewport3D antes de cada comando.
 */
export function buildSceneSnapshot(input: {
  hasModel: boolean;
  hasSkeleton: boolean;
  boneCount: number;
  clipCount: number;
  hasEmitterSelected: boolean;
  isPlaying: boolean;
  isImporting: boolean;
}): SceneSnapshot {
  return {
    has_model: input.hasModel,
    has_skeleton: input.hasSkeleton,
    bone_count: input.boneCount,
    clip_count: input.clipCount,
    has_emitter_selected: input.hasEmitterSelected,
    is_playing: input.isPlaying,
    is_importing: input.isImporting,
  };
}

const FALLBACK_RULES: Record<string, 'always' | 'model' | 'skeleton' | 'clips'> = {
  import: 'always',
  restore_default_scene: 'always',
  set_show_grid: 'always',
  toggle_wireframe: 'always',
  frame_scene: 'always',
  open_html3d: 'always',
  open_reference: 'always',
  upload_hdri: 'always',
  apply_hdri: 'always',
  set_lighting: 'always',
  render_scene: 'always',
  undo: 'always',
  redo: 'always',

  export_glb: 'model',
  export_gltf: 'model',
  export_fbx: 'model',
  export_zip: 'model',
  render_png: 'model',
  render_png_transparent: 'model',
  copy_public_link: 'model',
  open_code_export: 'model',
  audit_scene: 'model',
  auto_rig: 'model',
  reset_pose: 'model',
  remove_rig: 'model',
  toggle_skeleton: 'model',
  toggle_rig_markers: 'model',
  toggle_marker_symmetry: 'model',
  toggle_ik: 'model',
  toggle_floor_contact: 'model',
  bake_ik_physics: 'model',
  apply_material: 'model',
  apply_accent_color: 'model',
  apply_global_scale: 'model',
  csg_boolean: 'model',
  add_emitter: 'model',
  update_emitter: 'model',
  remove_emitter: 'model',
  select_emitter: 'model',

  select_bone: 'skeleton',
  set_weight_paint: 'skeleton',
  set_weight_brush: 'skeleton',
  set_morph_target: 'skeleton',

  select_clip: 'clips',
  toggle_play: 'clips',
  stop_animation: 'clips',
  step_frame: 'clips',
  seek: 'clips',
  set_play_range: 'clips',
  reset_play_range: 'clips',
  toggle_loop: 'clips',
  set_anim_speed: 'clips',
  toggle_mirror: 'clips',
  toggle_reverse: 'clips',
  toggle_in_place: 'clips',
  set_interpolation: 'clips',
  set_strips: 'clips',
  set_overlay_layer: 'clips',
  set_posture_offsets: 'clips',
  add_keyframe: 'clips',
  copy_keyframe: 'clips',
  paste_keyframe: 'clips',
  delete_keyframe: 'clips',
  move_keyframe: 'clips',
  copy_clip_link: 'clips',
  import_animation: 'clips',
};

function decideFallback(command: string, snap: SceneSnapshot): CommandDecision {
  if (snap.is_importing) {
    return { allowed: false, reason: 'Importação em andamento — aguarde.' };
  }
  const rule = FALLBACK_RULES[command] ?? 'always';
  if (rule === 'model' && !snap.has_model) {
    return { allowed: false, reason: 'Nenhum modelo carregado — importe um .glb/.gltf primeiro.' };
  }
  if (rule === 'skeleton' && !snap.has_skeleton) {
    return { allowed: false, reason: 'Nenhum esqueleto detectado — rode Auto-Rig antes.' };
  }
  if (rule === 'clips' && snap.clip_count === 0) {
    return { allowed: false, reason: 'Nenhum clipe de animação disponível.' };
  }
  return { allowed: true, reason: 'ok' };
}

/**
 * Consulta o Rust se o comando pode executar dada a snapshot da cena.
 * Nunca lança — em caso de falha usa o fallback TS.
 */
export function canExecuteCommand(command: string, snapshot: SceneSnapshot): CommandDecision {
  try {
    const gate = requireGate();
    const raw = gate.can_execute(command, snapshot) as CommandDecision;
    if (raw && typeof raw.allowed === 'boolean') return raw;
  } catch {
    // fallback silencioso
  }
  return decideFallback(command, snapshot);
}

/**
 * Wrapper executável: só roda `action` se o Rust (ou fallback) permitir.
 * Protege contra duplo-clique e condições de corrida via `is_importing`.
 */
export async function runCommand(command: string, snapshot: SceneSnapshot, action: () => void | Promise<void>): Promise<boolean> {
  const decision = canExecuteCommand(command, snapshot);
  if (!decision.allowed) {
    console.warn(`[rustBridge] comando "${command}" bloqueado: ${decision.reason}`);
    return false;
  }
  await action();
  return true;
}

// ============================================================================
// 3. REGISTRO DE MÓDULOS EXTERNOS (PLUGINS)
// ============================================================================

export interface ExternalModuleContext {
  /** Executa um comando central passando pelo gate do Rust. */
  runCommand: typeof runCommand;
  /** Valida bytes GLB/glTF pelo núcleo Rust. */
  validateGltfBytes: typeof validateGltfBytes;
  /** Snapshot atual da cena (atualizado pelo host). */
  getSnapshot: () => SceneSnapshot | null;
  /** Three.js — injetado pelo host, se disponível. */
  three?: unknown;
}

export interface ExternalModule {
  id: string;
  version: string;
  /** Chamado no registro. Erro aqui não derruba o host. */
  setup?: (ctx: ExternalModuleContext) => void;
  /** Chamado no unregister / hot reload. */
  teardown?: () => void;
}

const registeredModules = new Map<string, ExternalModule>();

export function registerExternalModule(mod: ExternalModule): { ok: boolean; error?: string } {
  if (!mod || typeof mod.id !== 'string' || mod.id.trim() === '') {
    return { ok: false, error: 'Módulo externo sem `id` válido.' };
  }
  if (registeredModules.has(mod.id)) {
    return { ok: false, error: `Módulo "${mod.id}" já registrado.` };
  }
  try {
    mod.setup?.({
      runCommand,
      validateGltfBytes,
      getSnapshot: () => currentSnapshot,
      three: undefined,
    });
    registeredModules.set(mod.id, mod);
    console.info(`[rustBridge] módulo externo registrado: ${mod.id}@${mod.version}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[rustBridge] setup do módulo "${mod.id}" falhou:`, msg);
    return { ok: false, error: msg };
  }
}

export function unregisterExternalModule(id: string): boolean {
  const mod = registeredModules.get(id);
  if (!mod) return false;
  try {
    mod.teardown?.();
  } catch (err) {
    console.warn(`[rustBridge] teardown do módulo "${id}" falhou:`, err);
  }
  registeredModules.delete(id);
  return true;
}

export function listExternalModules(): { id: string; version: string }[] {
  return Array.from(registeredModules.values()).map((m) => ({
    id: m.id,
    version: m.version,
  }));
}

// ============================================================================
// SNAPSHOT ATUAL (atualizado pelo host)
// ============================================================================

let currentSnapshot: SceneSnapshot | null = null;

export function setCurrentSnapshot(snap: SceneSnapshot): void {
  currentSnapshot = snap;
}

export function getCurrentSnapshot(): SceneSnapshot | null {
  return currentSnapshot;
}
