use std::env;
use std::fs;
use std::path::Path;
use std::process;

const GLB_MAGIC: u32 = 0x4654_6C67; // "glTF" little-endian
const CHUNK_JSON: u32 = 0x4E4F_534A; // "JSON"
const CHUNK_BIN: u32 = 0x004E_4942; // "BIN\0"

#[derive(Debug, PartialEq)]
struct GlbAuditReport {
    file_name: String,
    byte_length: u32,
    version: u32,
    json_chunk_bytes: usize,
    bin_chunk_bytes: usize,
    has_uv0: bool,
    has_uv1: bool,
    has_normals: bool,
    has_pbr_metallic_roughness: bool,
    has_draco: bool,
    has_ktx2: bool,
    has_meshopt: bool,
    has_punctual_lights: bool,
    meshes_count: usize,
    materials_count: usize,
    textures_count: usize,
    animations_count: usize,
    skins_count: usize,
}

fn read_u32_le(bytes: &[u8], offset: usize) -> Option<u32> {
    let slice = bytes.get(offset..offset + 4)?;
    Some(u32::from_le_bytes([slice[0], slice[1], slice[2], slice[3]]))
}

/// Conta objetos diretos em um array top-level do JSON glTF (`"meshes": [ ... ]`).
fn count_top_level_array_items(json: &str, key: &str) -> usize {
    let pattern = format!("\"{}\"", key);
    let Some(key_pos) = json.find(&pattern) else {
        return 0;
    };
    let rest = &json[key_pos + pattern.len()..];
    let Some(bracket_rel) = rest.find('[') else {
        return 0;
    };
    let bytes = rest[bracket_rel..].as_bytes();

    let mut depth_sq = 0i32;
    let mut depth_brace = 0i32;
    let mut in_string = false;
    let mut escaped = false;
    let mut items = 0usize;

    for &b in bytes {
        if in_string {
            if escaped {
                escaped = false;
            } else if b == b'\\' {
                escaped = true;
            } else if b == b'"' {
                in_string = false;
            }
            continue;
        }

        match b {
            b'"' => in_string = true,
            b'[' => depth_sq += 1,
            b']' => {
                depth_sq -= 1;
                if depth_sq == 0 {
                    break;
                }
            }
            b'{' => {
                if depth_sq == 1 && depth_brace == 0 {
                    items += 1;
                }
                depth_brace += 1;
            }
            b'}' => {
                depth_brace -= 1;
            }
            _ => {}
        }
    }

    items
}

fn audit_glb_bytes(file_name: &str, data: &[u8]) -> Result<GlbAuditReport, String> {
    if data.len() < 20 {
        return Err("Arquivo menor que o cabeçalho GLB mínimo (20 bytes).".to_string());
    }

    let magic = read_u32_le(data, 0).ok_or("Falha ao ler magic GLB")?;
    if magic != GLB_MAGIC {
        return Err(format!("Cabeçalho inválido: 0x{:08X} (esperado glTF).", magic));
    }

    let version = read_u32_le(data, 4).ok_or("Falha ao ler versão GLB")?;
    if version != 2 {
        return Err(format!("Versão glTF não suportada: {} (esperado 2).", version));
    }

    let byte_length = read_u32_le(data, 8).ok_or("Falha ao ler tamanho GLB")?;

    let mut offset = 12usize;
    let mut json_payload: Option<&str> = None;
    let mut json_chunk_bytes = 0usize;
    let mut bin_chunk_bytes = 0usize;

    while offset + 8 <= data.len() {
        let chunk_len = read_u32_le(data, offset).ok_or("Chunk truncado")? as usize;
        let chunk_type = read_u32_le(data, offset + 4).ok_or("Tipo de chunk truncado")?;
        offset += 8;

        let end = offset
            .checked_add(chunk_len)
            .ok_or("Overflow no tamanho do chunk")?;
        if end > data.len() {
            return Err("Chunk ultrapassa o tamanho do arquivo.".to_string());
        }

        if chunk_type == CHUNK_JSON && json_payload.is_none() {
            json_chunk_bytes = chunk_len;
            json_payload = std::str::from_utf8(&data[offset..end]).ok();
        } else if chunk_type == CHUNK_BIN {
            bin_chunk_bytes += chunk_len;
        }

        offset = end;
    }

    let json = json_payload.ok_or("Chunk JSON ausente ou UTF-8 inválido no GLB.")?;

    Ok(GlbAuditReport {
        file_name: file_name.to_string(),
        byte_length,
        version,
        json_chunk_bytes,
        bin_chunk_bytes,
        has_uv0: json.contains("\"TEXCOORD_0\""),
        has_uv1: json.contains("\"TEXCOORD_1\""),
        has_normals: json.contains("\"NORMAL\""),
        has_pbr_metallic_roughness: json.contains("\"pbrMetallicRoughness\""),
        has_draco: json.contains("KHR_draco_mesh_compression"),
        has_ktx2: json.contains("KHR_texture_basisu"),
        has_meshopt: json.contains("EXT_meshopt_compression"),
        has_punctual_lights: json.contains("KHR_lights_punctual"),
        meshes_count: count_top_level_array_items(json, "meshes"),
        materials_count: count_top_level_array_items(json, "materials"),
        textures_count: count_top_level_array_items(json, "textures"),
        animations_count: count_top_level_array_items(json, "animations"),
        skins_count: count_top_level_array_items(json, "skins"),
    })
}

fn print_json_report(r: &GlbAuditReport) {
    println!(
        "{{\n  \"studio\": \"AlexDesign\",\n  \"file\": \"{}\",\n  \"version\": {},\n  \"byte_length\": {},\n  \"json_chunk_bytes\": {},\n  \"bin_chunk_bytes\": {},\n  \"meshes\": {},\n  \"materials\": {},\n  \"textures\": {},\n  \"skins\": {},\n  \"animations\": {},\n  \"has_uv0\": {},\n  \"has_uv1\": {},\n  \"has_normals\": {},\n  \"has_pbr\": {},\n  \"extensions\": {{\n    \"draco\": {},\n    \"ktx2\": {},\n    \"meshopt\": {},\n    \"lights_punctual\": {}\n  }}\n}}",
        r.file_name,
        r.version,
        r.byte_length,
        r.json_chunk_bytes,
        r.bin_chunk_bytes,
        r.meshes_count,
        r.materials_count,
        r.textures_count,
        r.skins_count,
        r.animations_count,
        r.has_uv0,
        r.has_uv1,
        r.has_normals,
        r.has_pbr_metallic_roughness,
        r.has_draco,
        r.has_ktx2,
        r.has_meshopt,
        r.has_punctual_lights
    );
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Uso: alexdesign-glb-cli <arquivo.glb> [--json]");
        process::exit(1);
    }

    let path = Path::new(&args[1]);
    let as_json = args.iter().any(|a| a == "--json");

    let bytes = match fs::read(path) {
        Ok(b) => b,
        Err(err) => {
            eprintln!("Erro ao abrir '{}': {}", path.display(), err);
            process::exit(1);
        }
    };

    let name = path
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("modelo.glb");

    match audit_glb_bytes(name, &bytes) {
        Ok(report) => {
            if as_json {
                print_json_report(&report);
            } else {
                println!("=== AlexDesign Rust GLB Auditor ===");
                println!("Arquivo:     {} ({} bytes)", report.file_name, report.byte_length);
                println!("glTF:        v{} (JSON: {} B | BIN: {} B)", report.version, report.json_chunk_bytes, report.bin_chunk_bytes);
                println!("Contagens:   {} malha(s), {} material(is), {} textura(s), {} skin(s), {} animação(ões)", report.meshes_count, report.materials_count, report.textures_count, report.skins_count, report.animations_count);
                println!("Atributos:   UV0={} | UV1={} | NORMAL={} | PBR={}", report.has_uv0, report.has_uv1, report.has_normals, report.has_pbr_metallic_roughness);
                println!("Extensões:   Draco={} | KTX2={} | Meshopt={} | Luzes={}", report.has_draco, report.has_ktx2, report.has_meshopt, report.has_punctual_lights);
            }
        }
        Err(err) => {
            eprintln!("Falha na auditoria GLB: {}", err);
            process::exit(2);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_minimal_glb_container() {
        let json_str = r#"{"asset":{"version":"2.0"},"meshes":[{"primitives":[{"attributes":{"POSITION":0,"NORMAL":1,"TEXCOORD_0":2}}]}],"materials":[{"pbrMetallicRoughness":{}}]}"#;
        let mut json_bytes = json_str.as_bytes().to_vec();
        while json_bytes.len() % 4 != 0 {
            json_bytes.push(b' ');
        }

        let total_len = 12 + 8 + json_bytes.len();
        let mut glb = Vec::with_capacity(total_len);
        glb.extend_from_slice(&GLB_MAGIC.to_le_bytes());
        glb.extend_from_slice(&2u32.to_le_bytes());
        glb.extend_from_slice(&(total_len as u32).to_le_bytes());
        glb.extend_from_slice(&(json_bytes.len() as u32).to_le_bytes());
        glb.extend_from_slice(&CHUNK_JSON.to_le_bytes());
        glb.extend_from_slice(&json_bytes);

        let report = audit_glb_bytes("teste.glb", &glb).expect("GLB válido");
        assert_eq!(report.version, 2);
        assert_eq!(report.meshes_count, 1);
        assert_eq!(report.materials_count, 1);
        assert!(report.has_uv0);
        assert!(report.has_normals);
        assert!(report.has_pbr_metallic_roughness);
    }
}
