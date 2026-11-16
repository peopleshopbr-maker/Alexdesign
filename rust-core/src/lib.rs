use wasm_bindgen::prelude::*;

/// Normaliza a T-Pose humanoide garantindo simetria perfeita no eixo X
/// Recebe um slice achatado [x, y, z, x, y, z...] das juntas esquerda/direita e retorna corrigido
#[wasm_bindgen]
pub fn enforce_tpose_symmetry(left_joint: &[f32], right_joint: &[f32]) -> Vec<f32> {
    if left_joint.len() < 3 || right_joint.len() < 3 {
        return vec![0.0; 6];
    }

    // Media da altura (Y) e profundidade (Z) para alinhar os dois lados
    let avg_y = (left_joint[1] + right_joint[1]) * 0.5;
    let avg_z = (left_joint[2] + right_joint[2]) * 0.5;
    // Distancia lateral simetrica no eixo X
    let sym_x = (left_joint[0].abs() + right_joint[0].abs()) * 0.5;

    vec![
        sym_x, avg_y, avg_z,   // Lado Esquerdo (+X)
        -sym_x, avg_y, avg_z,  // Lado Direito (-X)
    ]
}

/// Calcula rotacoes procedurais (Euler XYZ em radianos) para cada clipe de animacao
/// clip_type: 0 = idle, 1 = walk, 2 = run, 3 = wave
/// Retorna [spine_x, arm_l_z, arm_r_z, arm_r_x, leg_l_x, leg_r_x]
#[wasm_bindgen]
pub fn compute_procedural_pose(clip_type: u8, time_sec: f32) -> Vec<f32> {
    match clip_type {
        // 0: IDLE (Respiracao suave e balanco natural dos bracos)
        0 => {
            let breath = (time_sec * 2.2).sin() * 0.04;
            let arm_relax = 1.25 + (time_sec * 2.2).cos() * 0.03; // Abaixa os bracos da T-Pose para pose natural
            vec![breath, arm_relax, -arm_relax, 0.0, 0.0, 0.0]
        }
        // 1: WALK (Caminhada ciclica com balanco oposto de bracos e pernas)
        1 => {
            let cycle = time_sec * 4.5;
            let stride = cycle.sin() * 0.45;
            let arm_swing = cycle.sin() * 0.35;
            let bounce = (cycle * 2.0).cos().abs() * 0.05;
            vec![bounce, 1.25 - arm_swing, -1.25 - arm_swing, 0.0, stride, -stride]
        }
        // 2: RUN (Corrida rapida com inclinacao do tronco e amplitude maior)
        2 => {
            let cycle = time_sec * 8.5;
            let stride = cycle.sin() * 0.85;
            let arm_swing = cycle.sin() * 0.75;
            let lean = 0.18 + (cycle * 2.0).sin() * 0.05;
            vec![lean, 1.15 - arm_swing, -1.15 - arm_swing, -0.4, stride, -stride]
        }
        // 3: WAVE (Aceno com o braco direito levantado)
        3 => {
            let wave = (time_sec * 6.0).sin() * 0.45;
            vec![0.03, 1.25, 2.5 + wave, 0.25, 0.0, 0.0]
        }
        _ => vec![0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
    }
}

/// Valida se todas as coordenadas de uma malha ou esqueleto sao finitas e livres de NaN
#[wasm_bindgen]
pub fn validate_skeleton_bounds(coords: &[f32]) -> bool {
    if coords.is_empty() || !coords.len().is_multiple_of(3) {
        return false;
    }
    coords.iter().all(|v| v.is_finite() && v.abs() < 10000.0)
}

/// Audita coordenadas UV de uma malha 3D
/// Retorna [total_uvs, out_of_bounds_count, degenerate_tris, coverage_score]
#[wasm_bindgen]
pub fn audit_uv_islands(uvs: &[f32]) -> Vec<f32> {
    let total_verts = uvs.len() / 2;
    if total_verts == 0 {
        return vec![0.0, 0.0, 0.0, 0.0];
    }

    let mut out_of_bounds = 0usize;
    let mut min_u = f32::MAX;
    let mut max_u = f32::MIN;
    let mut min_v = f32::MAX;
    let mut max_v = f32::MIN;

    for i in 0..total_verts {
        let u = uvs[i * 2];
        let v = uvs[i * 2 + 1];

        if !u.is_finite() || !v.is_finite() || u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0 {
            out_of_bounds += 1;
        }
        if u < min_u { min_u = u; }
        if u > max_u { max_u = u; }
        if v < min_v { min_v = v; }
        if v > max_v { max_v = v; }
    }

    // Verifica triangulos UV com area zero (esticamento extremo / colapsados)
    let mut degenerate_tris = 0usize;
    let total_tris = total_verts / 3;
    for t in 0..total_tris {
        let idx = t * 6;
        let (u0, v0) = (uvs[idx], uvs[idx + 1]);
        let (u1, v1) = (uvs[idx + 2], uvs[idx + 3]);
        let (u2, v2) = (uvs[idx + 4], uvs[idx + 5]);

        let area = ((u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0)).abs() * 0.5;
        if area < 1e-7 {
            degenerate_tris += 1;
        }
    }

    let span_u = (max_u - min_u).clamp(0.0, 1.0);
    let span_v = (max_v - min_v).clamp(0.0, 1.0);
    let coverage = (span_u * span_v * 100.0).clamp(0.0, 100.0);

    vec![
        total_verts as f32,
        out_of_bounds as f32,
        degenerate_tris as f32,
        coverage,
    ]
}

/// Gera mapeamento Smart Box UV automatico baseado nas normais e bounding box da malha
#[wasm_bindgen]
pub fn generate_smart_box_uv(positions: &[f32], normals: &[f32]) -> Vec<f32> {
    let vert_count = positions.len() / 3;
    if vert_count == 0 || normals.len() < positions.len() {
        return vec![];
    }

    // 1. Calcular Bounding Box para normalizar escala sem distorcao
    let mut min_p = [f32::MAX; 3];
    let mut max_p = [f32::MIN; 3];
    for i in 0..vert_count {
        for axis in 0..3 {
            let val = positions[i * 3 + axis];
            if val < min_p[axis] { min_p[axis] = val; }
            if val > max_p[axis] { max_p[axis] = val; }
        }
    }

    let max_extent = (max_p[0] - min_p[0])
        .max(max_p[1] - min_p[1])
        .max(max_p[2] - min_p[2])
        .max(1e-5);

    let mut out_uvs = Vec::with_capacity(vert_count * 2);

    // 2. Projetar cada vertice no plano dominante da sua normal (Triplanar / Box)
    for i in 0..vert_count {
        let px = (positions[i * 3] - min_p[0]) / max_extent;
        let py = (positions[i * 3 + 1] - min_p[1]) / max_extent;
        let pz = (positions[i * 3 + 2] - min_p[2]) / max_extent;

        let nx = normals[i * 3].abs();
        let ny = normals[i * 3 + 1].abs();
        let nz = normals[i * 3 + 2].abs();

        let (u, v) = if nx >= ny && nx >= nz {
            (pz, py) // Projecao lateral (eixo X)
        } else if ny >= nx && ny >= nz {
            (px, pz) // Projecao topo/base (eixo Y)
        } else {
            (px, py) // Projecao frontal/traseira (eixo Z)
        };

        out_uvs.push(u.clamp(0.001, 0.999));
        out_uvs.push(v.clamp(0.001, 0.999));
    }

    out_uvs
}

// --- INICIO AUTO-LAYOUT INTELIGENTE ---


#[wasm_bindgen]
pub fn calcular_prioridade_botoes(ocupacao_uv: f32, degenerados: u32) -> String {
    if degenerados > 1000 {
        return "btn-gerar-uv,btn-importar-textura,btn-exportar-png,btn-exportar-zip".to_string();
    }
    if ocupacao_uv >= 75.0 && degenerados == 0 {
        return "btn-exportar-zip,btn-exportar-png,btn-importar-textura,btn-gerar-uv".to_string();
    }
    "btn-importar-textura,btn-gerar-uv,btn-exportar-png,btn-exportar-zip".to_string()
}
// --- FIM AUTO-LAYOUT INTELIGENTE ---
