#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""AlexDesign CLI — Auditoria GLB/glTF, Verificação de Render PBR e Build Cloudflare.

Uso:
  python tools/python/alexdesign_pbr_tool.py audit-glb modelo.glb --json
  python tools/python/alexdesign_pbr_tool.py check-render renders/Studio_Render.png
  python tools/python/alexdesign_pbr_tool.py pack-zip modelo.glb ./textures -o ativo_pbr.zip
  python tools/python/alexdesign_pbr_tool.py verify-cloudflare
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import Any, Dict, List

GLB_MAGIC = b"glTF"
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942

# Critérios de qualidade de render (AlexDesign Studio)
LUM_MIN = 0.020
LUM_MAX = 0.965
DESVIO_MIN = 0.035
COBERTURA_MIN = 0.04


def parse_glb(glb_path: Path) -> Dict[str, Any]:
    data = glb_path.read_bytes()
    if len(data) < 20:
        raise ValueError("Arquivo GLB menor que o cabeçalho mínimo de 20 bytes.")

    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != GLB_MAGIC:
        raise ValueError(f"Magic inválido: {magic!r} (esperado b'glTF').")
    if version != 2:
        raise ValueError(f"Versão glTF não suportada: {version} (esperado 2).")

    offset = 12
    gltf_json: Dict[str, Any] | None = None
    bin_bytes = 0

    while offset + 8 <= len(data):
        chunk_len, chunk_type = struct.unpack_from("<II", data, offset)
        offset += 8
        chunk_payload = data[offset : offset + chunk_len]
        offset += chunk_len
        if chunk_type == CHUNK_JSON and gltf_json is None:
            gltf_json = json.loads(chunk_payload.decode("utf-8"))
        elif chunk_type == CHUNK_BIN:
            bin_bytes += chunk_len

    if gltf_json is None:
        raise ValueError("Chunk JSON não encontrado no container GLB.")

    return {
        "file": glb_path.name,
        "byte_length": total_length,
        "bin_chunk_bytes": bin_bytes,
        "gltf": gltf_json,
    }


def audit_gltf_dict(gltf: Dict[str, Any], file_name: str, byte_length: int) -> Dict[str, Any]:
    meshes = gltf.get("meshes", []) or []
    materials = gltf.get("materials", []) or []
    textures = gltf.get("textures", []) or []
    animations = gltf.get("animations", []) or []
    skins = gltf.get("skins", []) or []
    accessors = gltf.get("accessors", []) or []
    extensions_used = gltf.get("extensionsUsed", []) or []

    total_primitives = 0
    total_vertices = 0
    total_triangles = 0
    has_uv0 = False
    has_uv1 = False
    has_normals = False

    for mesh in meshes:
        for prim in mesh.get("primitives", []) or []:
            total_primitives += 1
            attrs = prim.get("attributes", {}) or {}
            if "TEXCOORD_0" in attrs:
                has_uv0 = True
            if "TEXCOORD_1" in attrs:
                has_uv1 = True
            if "NORMAL" in attrs:
                has_normals = True

            pos_idx = attrs.get("POSITION")
            if isinstance(pos_idx, int) and 0 <= pos_idx < len(accessors):
                v_count = int(accessors[pos_idx].get("count", 0))
                total_vertices += v_count
            else:
                v_count = 0

            idx_acc = prim.get("indices")
            if isinstance(idx_acc, int) and 0 <= idx_acc < len(accessors):
                total_triangles += int(accessors[idx_acc].get("count", 0)) // 3
            else:
                total_triangles += v_count // 3

    bone_count = sum(len(s.get("joints", []) or []) for s in skins)
    warnings: List[str] = []
    if not has_uv0:
        warnings.append("Malha sem canal UV0 (TEXCOORD_0).")
    if not has_normals:
        warnings.append("Malha sem atributos NORMAL explícitos.")
    if not materials:
        warnings.append("Nenhum material PBR definido.")

    return {
        "studio": "AlexDesign",
        "file": file_name,
        "size_bytes": byte_length,
        "generator": (gltf.get("asset", {}) or {}).get("generator", "desconhecido"),
        "meshes": len(meshes),
        "primitives": total_primitives,
        "vertices": total_vertices,
        "triangles": total_triangles,
        "materials": len(materials),
        "textures": len(textures),
        "skins": len(skins),
        "bones": bone_count,
        "animations": len(animations),
        "has_uv0": has_uv0,
        "has_uv1": has_uv1,
        "has_normals": has_normals,
        "extensions_used": extensions_used,
        "warnings": warnings,
        "status": "OK" if not warnings else "ATENCAO",
    }


def check_render_png(png_path: Path) -> Dict[str, Any]:
    try:
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError(
            "Pillow não instalado. Execute: pip install -r tools/python/requirements.txt"
        ) from exc

    with Image.open(png_path) as img:
        rgba = img.convert("RGBA")
        w, h = rgba.size
        pixels = list(rgba.getdata())

    total = max(1, len(pixels))
    opaque_lums: List[float] = []
    for r, g, b, a in pixels:
        if a > 12:
            lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
            opaque_lums.append(lum)

    coverage = len(opaque_lums) / total
    if not opaque_lums:
        return {
            "file": png_path.name,
            "width": w,
            "height": h,
            "coverage": 0.0,
            "mean_luminance": 0.0,
            "std_dev": 0.0,
            "passed": False,
            "reason": "Quadro totalmente transparente ou vazio.",
        }

    mean_lum = sum(opaque_lums) / len(opaque_lums)
    var = sum((x - mean_lum) ** 2 for x in opaque_lums) / len(opaque_lums)
    std_dev = math.sqrt(var)

    reasons: List[str] = []
    if coverage < COBERTURA_MIN:
        reasons.append(f"Cobertura baixa ({coverage:.3f} < {COBERTURA_MIN}).")
    if mean_lum < LUM_MIN:
        reasons.append(f"Quadro muito escuro ({mean_lum:.3f} < {LUM_MIN}).")
    if mean_lum > LUM_MAX:
        reasons.append(f"Quadro estourado ({mean_lum:.3f} > {LUM_MAX}).")
    if std_dev < DESVIO_MIN:
        reasons.append(f"Contraste insuficiente ({std_dev:.3f} < {DESVIO_MIN}).")

    return {
        "file": png_path.name,
        "width": w,
        "height": h,
        "coverage": round(coverage, 4),
        "mean_luminance": round(mean_lum, 4),
        "std_dev": round(std_dev, 4),
        "passed": len(reasons) == 0,
        "reasons": reasons,
    }


def pack_project_zip(glb_path: Path, textures_dir: Path | None, output_zip: Path) -> Path:
    parsed = parse_glb(glb_path)
    report = audit_gltf_dict(parsed["gltf"], glb_path.name, parsed["byte_length"])
    safe_base = glb_path.stem

    with zipfile.ZipFile(output_zip, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.write(glb_path, arcname=f"model/{glb_path.name}")
        if textures_dir and textures_dir.is_dir():
            for file_path in sorted(textures_dir.iterdir()):
                if file_path.is_file() and file_path.suffix.lower() in {".png", ".jpg", ".jpeg", ".webp"}:
                    zf.write(file_path, arcname=f"textures/{file_path.name}")
        zf.writestr("report/verification_report.json", json.dumps(report, indent=2, ensure_ascii=False))
        zf.writestr(
            "README.txt",
            (
                f"AlexDesign — Pacote PBR CLI (https://www.alexdesign.art.br/design)\n"
                f"Modelo: {glb_path.name}\n"
                f"Malhas: {report['meshes']} | Triangulos: {report['triangles']} | Materiais: {report['materials']}\n"
                f"Base de textura: {safe_base}\n"
            ),
        )
    return output_zip


def verify_cloudflare_dist(root_dir: Path) -> int:
    print("Executando build Vite (npm run build)...")
    res = subprocess.run(["npm", "run", "build"], cwd=str(root_dir), check=False)
    if res.returncode != 0:
        print("ERRO: npm run build falhou.", file=sys.stderr)
        return res.returncode

    dist_dir = root_dir / "dist"
    required = [dist_dir / "index.html", dist_dir / "_headers", dist_dir / "_redirects"]
    missing = [str(p.relative_to(root_dir)) for p in required if not p.exists()]
    if missing:
        print(f"ERRO: Arquivos ausentes em dist/: {', '.join(missing)}", file=sys.stderr)
        return 1

    print("Build Cloudflare verificado com sucesso! Pronto para:")
    print("  npx wrangler pages deploy dist --project-name=alexdesign-design")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="AlexDesign CLI — Pipeline PBR, GLB e Cloudflare")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_audit = sub.add_parser("audit-glb", help="Auditar arquivo binário .glb")
    p_audit.add_argument("glb", type=Path)
    p_audit.add_argument("--json", action="store_true", help="Saída JSON")

    p_render = sub.add_parser("check-render", help="Validar qualidade de exposição/contraste de PNG")
    p_render.add_argument("png", type=Path)

    p_pack = sub.add_parser("pack-zip", help="Empacotar GLB, texturas e relatório JSON em .zip")
    p_pack.add_argument("glb", type=Path)
    p_pack.add_argument("textures", type=Path, nargs="?", default=None)
    p_pack.add_argument("-o", "--output", type=Path, default=Path("AlexDesign_Asset.zip"))

    sub.add_parser("verify-cloudflare", help="Gerar dist/ e validar arquivos do Cloudflare Pages")

    args = parser.parse_args()

    if args.cmd == "audit-glb":
        parsed = parse_glb(args.glb)
        report = audit_gltf_dict(parsed["gltf"], args.glb.name, parsed["byte_length"])
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "check-render":
        result = check_render_png(args.png)
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0 if result["passed"] else 2

    if args.cmd == "pack-zip":
        out = pack_project_zip(args.glb, args.textures, args.output)
        print(f"ZIP gerado: {out}")
        return 0

    if args.cmd == "verify-cloudflare":
        project_root = Path(__file__).resolve().parents[2]
        return verify_cloudflare_dist(project_root)

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
