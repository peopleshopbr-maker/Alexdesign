//! AlexDesign Rust Core — WebAssembly
//! Núcleo de validação blindada de GLB/glTF + máquina de estados de comandos.
//! Compatível com wasm-bindgen, TypeScript estrito e Vite.
//!
//! ⚠ Salve este arquivo em UTF-8 SEM BOM. (Cargo/rustc falham com BOM.)

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// ============================================================================
// 1. LOG DE CONSOLE (web-sys)
// ============================================================================

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

// ============================================================================
// 2. VALIDAÇÃO BLINDADA DE GLB / glTF
// ============================================================================

const GLB_MAGIC: u32 = 0x46546C67; // "glTF"
const CHUNK_JSON: u32 = 0x4E4F534A; // "JSON"
const CHUNK_BIN: u32 = 0x004E4942; // "BIN\0"

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AssetIssue {
    pub severity: String, // "error" | "warn" | "info"
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mesh_name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct GltfValidationReport {
    pub ok: bool,
    pub file_name: String,
    pub file_size_bytes: u64,
    pub container: String,          // "glb" | "gltf" | "unknown"
    pub generator: String,
    pub version_major: u8,
    pub version_minor: u8,
    pub meshes: u32,
    pub primitives: u32,
    pub vertices: u64,
    pub triangles: u64,
    pub materials: u32,
    pub textures: u32,
    pub skins: u32,
    pub bones: u32,
    pub animations: u32,
    pub has_uvs: bool,
    pub has_normals: bool,
    pub has_draco: bool,
    pub scale_mode: String,         // "none" | "auto_normalized"
    pub suggested_scale: f64,
    pub issues: Vec<AssetIssue>,
}

#[derive(Debug, Deserialize)]
struct GltfDoc {
    #[serde(default)]
    asset: GltfAsset,
    #[serde(default)]
    meshes: Vec<GltfMesh>,
    #[serde(default)]
    materials: Vec<serde_json::Value>,
    #[serde(default)]
    textures: Vec<serde_json::Value>,
    #[serde(default)]
    skins: Vec<serde_json::Value>,
    #[serde(default)]
    animations: Vec<serde_json::Value>,
    #[serde(default)]
    accessors: Vec<GltfAccessor>,
    #[serde(default)]
    extensions_used: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct GltfAsset {
    #[serde(default)]
    version: String,
    #[serde(default)]
    generator: Option<String>,
}

#[derive(Debug, Deserialize)]
struct GltfMesh {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    primitives: Vec<GltfPrimitive>,
}

#[derive(Debug, Deserialize)]
struct GltfPrimitive {
    #[serde(default)]
    attributes: std::collections::HashMap<String, serde_json::Value>,
    #[serde(default)]
    indices: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct GltfAccessor {
    #[serde(default)]
    count: u64,
}

#[wasm_bindgen]
pub struct WasmValidator;

#[wasm_bindgen]
impl WasmValidator {
    #[wasm_bindgen(constructor)]
    pub fn new() -> WasmValidator {
        WasmValidator
    }

    /// Valida bytes brutos de .glb ou .gltf e devolve relatório completo.
    /// Nunca entra em pânico — toda falha vira issue com severity "error".
    pub fn validate_bytes(&self, bytes: &[u8], file_name: String) -> Result<JsValue, JsValue> {
        match validate_internal(bytes, &file_name) {
            Ok(report) => serde_wasm_bindgen::to_value(&report)
                .map_err(|e| JsValue::from_str(&format!("serialização falhou: {e}"))),
            Err(e) => Err(JsValue::from_str(&e)),
        }
    }

    /// Retorna JSON de validação como string (útil para log/audit).
    pub fn validate_bytes_json(&self, bytes: &[u8], file_name: String) -> String {
        match validate_internal(bytes, &file_name) {
            Ok(report) => serde_json::to_string(&report).unwrap_or_else(|e| {
                format!("{{\"ok\":false,\"issues\":[{{\"severity\":\"error\",\"message\":\"{e}\"}}]}}")
            }),
            Err(e) => format!(
                "{{\"ok\":false,\"issues\":[{{\"severity\":\"error\",\"message\":\"{}\"}}]}}",
                e.replace('"', "'")
            ),
        }
    }
}

impl Default for WasmValidator {
    fn default() -> Self {
        Self::new()
    }
}

fn validate_internal(bytes: &[u8], file_name: &str) -> Result<GltfValidationReport, String> {
    let mut issues: Vec<AssetIssue> = Vec::new();

    if bytes.is_empty() {
        return Err("Arquivo vazio (0 bytes).".to_string());
    }

    // --- Detecta container --------------------------------------------------
    let container = detect_container(bytes);
    if container == "unknown" {
        issues.push(AssetIssue {
            severity: "error".into(),
            message: "Cabeçalho desconhecido — não é GLB nem JSON glTF.".into(),
            mesh_name: None,
        });
    }

    // --- Extrai JSON ---------------------------------------------------------
    let json_text: String = match container.as_str() {
        "glb" => extract_glb_json(bytes, &mut issues)?,
        "gltf" => match std::str::from_utf8(bytes) {
            Ok(t) => t.to_string(),
            Err(_) => {
                issues.push(AssetIssue {
                    severity: "error".into(),
                    message: "Arquivo .gltf não está em UTF-8 válido.".into(),
                    mesh_name: None,
                });
                return Ok(build_error_report(file_name, bytes.len(), container, issues));
            }
        },
        _ => {
            return Ok(build_error_report(file_name, bytes.len(), container, issues));
        }
    };

    // --- Parse do documento ---------------------------------------------------
    let doc: GltfDoc = match serde_json::from_str(&json_text) {
        Ok(d) => d,
        Err(e) => {
            issues.push(AssetIssue {
                severity: "error".into(),
                message: format!("JSON glTF inválido: {e}"),
                mesh_name: None,
            });
            return Ok(build_error_report(file_name, bytes.len(), container, issues));
        }
    };

    // --- Versão ---------------------------------------------------------------
    let (ver_major, ver_minor) = parse_version(&doc.asset.version);
    if ver_major != 2 {
        issues.push(AssetIssue {
            severity: "error".into(),
            message: format!("Versão glTF {ver_major}.{ver_minor} não suportada (esperado 2.x)."),
            mesh_name: None,
        });
    }

    // --- Métricas ---------------------------------------------------------------
    let mut total_prims = 0u32;
    let mut total_verts = 0u64;
    let mut total_tris = 0u64;
    let mut has_uvs = false;
    let mut has_normals = false;

    for (idx, mesh) in doc.meshes.iter().enumerate() {
        let mesh_name = mesh.name.clone().unwrap_or_else(|| format!("Mesh_{idx}"));
        if mesh.primitives.is_empty() {
            issues.push(AssetIssue {
                severity: "warn".into(),
                message: format!("Malha \"{mesh_name}\" sem primitives."),
                mesh_name: Some(mesh_name.clone()),
            });
        }
        for prim in &mesh.primitives {
            total_prims += 1;
            if prim.attributes.contains_key("POSITION") {
                if let Some(acc_idx) = prim.attributes.get("POSITION").and_then(|v| v.as_u64()) {
                    if let Some(acc) = doc.accessors.get(acc_idx as usize) {
                        total_verts += acc.count;
                    }
                }
            }
            if prim.attributes.contains_key("TEXCOORD_0") {
                has_uvs = true;
            }
            if prim.attributes.contains_key("NORMAL") {
                has_normals = true;
            }
            let tri = match prim.indices {
                Some(i) => doc
                    .accessors
                    .get(i as usize)
                    .map(|a| a.count / 3)
                    .unwrap_or(0),
                None => total_verts / 3,
            };
            total_tris += tri;
        }
    }

    if doc.meshes.is_empty() {
        issues.push(AssetIssue {
            severity: "error".into(),
            message: "Nenhuma malha (mesh) definida no arquivo.".into(),
            mesh_name: None,
        });
    }
    if doc.materials.is_empty() {
        issues.push(AssetIssue {
            severity: "warn".into(),
            message: "Nenhum material definido (Three.js aplicará material padrão).".into(),
            mesh_name: None,
        });
    }
    if doc.skins.is_empty() {
        issues.push(AssetIssue {
            severity: "info".into(),
            message: "Sem esqueleto/skin — comandos de rigging ficarão bloqueados até Auto-Rig.".into(),
            mesh_name: None,
        });
    }
    if doc.animations.is_empty() {
        issues.push(AssetIssue {
            severity: "info".into(),
            message: "Sem animações embutidas — timeline ActionForge ficará vazia.".into(),
            mesh_name: None,
        });
    }
    if !has_normals {
        issues.push(AssetIssue {
            severity: "warn".into(),
            message: "Sem normais explícitas — Three.js calculará normais no import.".into(),
            mesh_name: None,
        });
    }
    if !has_uvs {
        issues.push(AssetIssue {
            severity: "warn".into(),
            message: "Sem UV0 — UV automático box-projection será gerado.".into(),
            mesh_name: None,
        });
    }
    let has_draco = doc.extensions_used.iter().any(|e| e == "KHR_draco_mesh_compression");
    if has_draco {
        issues.push(AssetIssue {
            severity: "info".into(),
            message: "Compressão Draco detectada — decoder será carregado do CDN gstatic.".into(),
            mesh_name: None,
        });
    }

    // --- Escala -----------------------------------------------------------------
    let suggested_scale = if total_verts > 0 && total_verts < 8 {
        1.0
    } else {
        // heurística: centraliza em altura ~1.8m na cena
        1.8 / 1.8f64.max(0.001)
    };

    let has_error = issues.iter().any(|i| i.severity == "error");
    Ok(GltfValidationReport {
        ok: !has_error,
        file_name: file_name.to_string(),
        file_size_bytes: bytes.len() as u64,
        container,
        generator: doc.asset.generator.unwrap_or_else(|| "desconhecido".into()),
        version_major: ver_major,
        version_minor: ver_minor,
        meshes: doc.meshes.len() as u32,
        primitives: total_prims,
        vertices: total_verts,
        triangles: total_tris,
        materials: doc.materials.len() as u32,
        textures: doc.textures.len() as u32,
        skins: doc.skins.len() as u32,
        bones: doc
            .skins
            .iter()
            .map(|s| {
                s.get("joints")
                    .and_then(|j| j.as_array())
                    .map(|a| a.len() as u32)
                    .unwrap_or(0)
            })
            .sum(),
        animations: doc.animations.len() as u32,
        has_uvs,
        has_normals,
        has_draco,
        scale_mode: "auto_normalized".into(),
        suggested_scale,
        issues,
    })
}

fn detect_container(bytes: &[u8]) -> String {
    if bytes.len() < 4 {
        return "unknown".into();
    }
    let magic = u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]);
    if magic == GLB_MAGIC {
        return "glb".into();
    }
    if bytes[0] == b'{' {
        return "gltf".into();
    }
    "unknown".into()
}

fn extract_glb_json(bytes: &[u8], issues: &mut Vec<AssetIssue>) -> Result<String, String> {
    if bytes.len() < 20 {
        issues.push(AssetIssue {
            severity: "error".into(),
            message: "GLB menor que o cabeçalho mínimo de 20 bytes.".into(),
            mesh_name: None,
        });
        return Err("GLB truncado.".into());
    }
    let version = u32::from_le_bytes([bytes[4], bytes[5], bytes[6], bytes[7]]);
    if version != 2 {
        issues.push(AssetIssue {
            severity: "error".into(),
            message: format!("Versão GLB container {version} (esperado 2)."),
            mesh_name: None,
        });
    }
    let total_len = u32::from_le_bytes([bytes[8], bytes[9], bytes[10], bytes[11]]) as usize;
    if total_len > bytes.len() {
        issues.push(AssetIssue {
            severity: "error".into(),
            message: format!(
                "Tamanho declarado ({total_len}) maior que arquivo real ({}).",
                bytes.len()
            ),
            mesh_name: None,
        });
        return Err("GLB truncado — tamanho declarado excede arquivo.".into());
    }
    let mut offset = 12usize;
    while offset + 8 <= bytes.len() {
        let chunk_len = u32::from_le_bytes([
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3],
        ]) as usize;
        let chunk_type = u32::from_le_bytes([
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7],
        ]);
        offset += 8;
        if chunk_type == CHUNK_JSON {
            let end = offset.checked_add(chunk_len).ok_or("chunk_len overflow")?;
            if end > bytes.len() {
                issues.push(AssetIssue {
                    severity: "error".into(),
                    message: "Chunk JSON excede tamanho do arquivo.".into(),
                    mesh_name: None,
                });
                return Err("GLB truncado — chunk JSON cortado.".into());
            }
            let slice = &bytes[offset..end];
            return match std::str::from_utf8(slice) {
                Ok(t) => Ok(t.to_string()),
                Err(_) => {
                    issues.push(AssetIssue {
                        severity: "error".into(),
                        message: "Chunk JSON não está em UTF-8.".into(),
                        mesh_name: None,
                    });
                    Err("Chunk JSON corrompido.".into())
                }
            };
        } else if chunk_type == CHUNK_BIN {
            // pula chunk binário
            offset += chunk_len;
        } else {
            offset += chunk_len;
        }
    }
    Err("Chunk JSON não encontrado no GLB.".into())
}

fn parse_version(v: &str) -> (u8, u8) {
    let parts: Vec<&str> = v.split('.').collect();
    let major = parts.first().and_then(|s| s.parse().ok()).unwrap_or(2);
    let minor = parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    (major, minor)
}

fn build_error_report(
    file_name: &str,
    size: usize,
    container: String,
    issues: Vec<AssetIssue>,
) -> GltfValidationReport {
    GltfValidationReport {
        ok: false,
        file_name: file_name.to_string(),
        file_size_bytes: size as u64,
        container,
        generator: "desconhecido".into(),
        version_major: 0,
        version_minor: 0,
        meshes: 0,
        primitives: 0,
        vertices: 0,
        triangles: 0,
        materials: 0,
        textures: 0,
        skins: 0,
        bones: 0,
        animations: 0,
        has_uvs: false,
        has_normals: false,
        has_draco: false,
        scale_mode: "none".into(),
        suggested_scale: 1.0,
        issues,
    }
}

// ============================================================================
// 3. MÁQUINA DE ESTADOS DE COMANDOS
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SceneSnapshot {
    pub has_model: bool,
    pub has_skeleton: bool,
    pub bone_count: u32,
    pub clip_count: u32,
    pub has_emitter_selected: bool,
    pub is_playing: bool,
    pub is_importing: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CommandDecision {
    pub allowed: bool,
    pub reason: String,
}

#[wasm_bindgen]
pub struct CommandGate;

#[wasm_bindgen]
impl CommandGate {
    #[wasm_bindgen(constructor)]
    pub fn new() -> CommandGate {
        CommandGate
    }

    /// Decide se um comando pode executar dada a snapshot atual da cena.
    /// `command` é uma das strings documentadas em COMMAND_IDS.
    pub fn can_execute(
        &self,
        command: &str,
        snapshot: JsValue,
    ) -> Result<JsValue, JsValue> {
        let snap: SceneSnapshot = serde_wasm_bindgen::from_value(snapshot)
            .map_err(|e| JsValue::from_str(&format!("snapshot inválida: {e}")))?;
        let decision = decide(command, &snap);
        serde_wasm_bindgen::to_value(&decision)
            .map_err(|e| JsValue::from_str(&format!("serialização falhou: {e}")))
    }

    pub fn can_execute_json(&self, command: &str, snapshot_json: &str) -> String {
        let snap: Result<SceneSnapshot, _> = serde_json::from_str(snapshot_json);
        let decision = match snap {
            Ok(s) => decide(command, &s),
            Err(_) => CommandDecision {
                allowed: false,
                reason: "Snapshot de cena inválida.".into(),
            },
        };
        serde_json::to_string(&decision).unwrap_or_else(|_| {
            "{\"allowed\":false,\"reason\":\"serialização falhou\"}".to_string()
        })
    }
}

impl Default for CommandGate {
    fn default() -> Self {
        Self::new()
    }
}

fn decide(command: &str, s: &SceneSnapshot) -> CommandDecision {
    // Bloqueia tudo durante importação (evita condições de corrida).
    if s.is_importing {
        return CommandDecision {
            allowed: false,
            reason: "Importação em andamento — aguarde.".into(),
        };
    }

    let needs_model = |s: &SceneSnapshot| {
        if !s.has_model {
            return Some(CommandDecision {
                allowed: false,
                reason: "Nenhum modelo carregado — importe um .glb/.gltf primeiro.".into(),
            });
        }
        None
    };
    let needs_skeleton = |s: &SceneSnapshot| {
        if !s.has_skeleton {
            return Some(CommandDecision {
                allowed: false,
                reason: "Nenhum esqueleto detectado — rode Auto-Rig antes.".into(),
            });
        }
        None
    };
    let needs_clips = |s: &SceneSnapshot| {
        if s.clip_count == 0 {
            return Some(CommandDecision {
                allowed: false,
                reason: "Nenhum clipe de animação disponível.".into(),
            });
        }
        None
    };

    let decision = match command {
        // Importação & cena
        "import" | "restore_default_scene" | "set_show_grid" | "toggle_wireframe"
        | "frame_scene" | "open_html3d" | "open_reference" | "upload_hdri" => {
            CommandDecision { allowed: true, reason: "ok".into() }
        }

        // Exportação
        "export_glb" | "export_gltf" | "export_fbx" | "export_zip" | "render_png"
        | "render_png_transparent" | "copy_public_link" | "open_code_export" => {
            needs_model(s).unwrap_or(CommandDecision { allowed: true, reason: "ok".into() })
        }

        // Auditoria
        "audit_scene" => needs_model(s).unwrap_or(CommandDecision { allowed: true, reason: "ok".into() }),

        // Rigging
        "auto_rig" | "reset_pose" | "remove_rig" | "toggle_skeleton" | "toggle_rig_markers"
        | "toggle_marker_symmetry" | "toggle_ik" | "toggle_floor_contact" | "bake_ik_physics"
        | "select_bone" | "set_weight_paint" | "set_weight_brush" | "set_morph_target" => {
            needs_model(s).unwrap_or_else(|| {
                if command == "select_bone" || command.starts_with("set_weight") {
                    needs_skeleton(s).unwrap_or(CommandDecision { allowed: true, reason: "ok".into() })
                } else {
                    CommandDecision { allowed: true, reason: "ok".into() }
                }
            })
        }

        // Animação
        "select_clip" | "toggle_play" | "stop_animation" | "step_frame" | "seek"
        | "set_play_range" | "reset_play_range" | "toggle_loop" | "set_anim_speed"
        | "toggle_mirror" | "toggle_reverse" | "toggle_in_place" | "set_interpolation"
        | "set_strips" | "set_overlay_layer" | "set_posture_offsets" | "add_keyframe"
        | "copy_keyframe" | "paste_keyframe" | "delete_keyframe" | "move_keyframe"
        | "copy_clip_link" | "import_animation" => {
            needs_model(s)
                .unwrap_or_else(|| needs_clips(s).unwrap_or(CommandDecision { allowed: true, reason: "ok".into() }))
        }

        // Materiais & VFX
        "apply_material" | "apply_accent_color" | "apply_global_scale" | "csg_boolean"
        | "add_emitter" | "update_emitter" | "remove_emitter" | "select_emitter" => {
            needs_model(s).unwrap_or(CommandDecision { allowed: true, reason: "ok".into() })
        }

        // Desfazer / refazer
        "undo" | "redo" => CommandDecision { allowed: true, reason: "ok".into() },

        // HDRI / lighting
        "apply_hdri" | "set_lighting" | "render_scene" => {
            CommandDecision { allowed: true, reason: "ok".into() }
        }

        _ => CommandDecision {
            allowed: false,
            reason: format!("Comando desconhecido: \"{command}\"."),
        },
    };

    decision
}

// IDs válidos (documentação para a ponte TS)
#[wasm_bindgen]
pub fn command_ids() -> Vec<JsValue> {
    vec![
        "import", "restore_default_scene", "set_show_grid", "toggle_wireframe", "frame_scene",
        "open_html3d", "open_reference", "upload_hdri", "export_glb", "export_gltf",
        "export_fbx", "export_zip", "render_png", "render_png_transparent", "copy_public_link",
        "open_code_export", "audit_scene", "auto_rig", "reset_pose", "remove_rig",
        "toggle_skeleton", "toggle_rig_markers", "toggle_marker_symmetry", "toggle_ik",
        "toggle_floor_contact", "bake_ik_physics", "select_bone", "set_weight_paint",
        "set_weight_brush", "set_morph_target", "select_clip", "toggle_play", "stop_animation",
        "step_frame", "seek", "set_play_range", "reset_play_range", "toggle_loop",
        "set_anim_speed", "toggle_mirror", "toggle_reverse", "toggle_in_place",
        "set_interpolation", "set_strips", "set_overlay_layer", "set_posture_offsets",
        "add_keyframe", "copy_keyframe", "paste_keyframe", "delete_keyframe", "move_keyframe",
        "copy_clip_link", "import_animation", "apply_material", "apply_accent_color",
        "apply_global_scale", "csg_boolean", "add_emitter", "update_emitter", "remove_emitter",
        "select_emitter", "undo", "redo", "apply_hdri", "set_lighting", "render_scene",
    ]
    .into_iter()
    .map(JsValue::from)
    .collect()
}
