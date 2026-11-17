#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""Gera a versão web do projeto RenderAlex Design, em ./public, pronta para o Cloudflare Pages.

    python build_site.py                                  compila o TypeScript e gera ./public
    python build_site.py --url https://renderalex.pages.dev   domínio usado no sitemap/OG
    python build_site.py --sem-ts                          não chama o tsc (só HTML e imagens)

O script lê o projeto de verdade (pastas 01..06, dist/ e LEIA-ME.txt), mede os pixels de cada
render para não publicar quadro preto, estourado ou sem assunto, converte o que presta para web
e escreve também o db/seed.sql do banco D1. Fontes editáveis ficam em web/src (site.ts,
_worker.ts, site.css); o que vai para o Cloudflare é só a pasta public/.
"""

import argparse
import datetime as dt
import json
import re
import shutil
import struct
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

if hasattr(sys.stdout, "reconfigure"):          # console do Windows com codepage antiga
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

WEB = Path(__file__).resolve().parent
PROJETO = WEB.parent
PUB = WEB / "public"
SRC = WEB / "src"
DB = WEB / "db"

# ------------------------------------------------------------------ EDITE AQUI
CONTATO = {
    "email": "alex.mkt@outlook.com",
    "whatsapp": "",                       # ex.: "5511999999999" (só dígitos)
    "instagram": "",                      # ex.: "renderalexdesign"
    "behance": "",
}
NOME_ESTUDIO = "RenderAlex Design"
TAGLINE = "Envie o arquivo. Receba o render."
DESCRICAO = ("Render de estúdio online: você sobe o .blend, escolhe resolução e motor, "
             "acompanha o progresso em tempo real e baixa o resultado. Cycles, AgX e GPU dedicada.")
TIPOS_DE_PROJETO = ["Produto", "Móvel / ambiente", "Joia ou vidro", "Cena publicitária", "Outro"]

# Opções reais da máquina do estúdio (Blender 5.2.2 + Cycles). Nada aqui promete o que o
# motor não expõe: a lista de motores é a que o render node sabe acionar.
RESOLUCOES = ["1280x720", "1920x1080", "2560x1440", "3840x2160"]
MOTORES = ["Cycles · GPU (OptiX)", "Cycles · CPU", "EEVEE"]

PAINEL_ENVIO = """  <div class="envio">
    <div class="campo"><label for="resolucao">Resolu&ccedil;&atilde;o</label>
      <select id="resolucao">
%(resolucoes)s
      </select></div>
    <div class="campo"><label for="motor">Motor</label>
      <select id="motor">
%(motores)s
      </select></div>
    <div class="campo"><label for="amostras">Amostras</label>
      <input id="amostras" type="number" min="16" max="2048" step="16" value="128"></div>
    <div class="campo"><label for="email-render">E-mail</label>
      <input id="email-render" type="email" autocomplete="email" placeholder="voce@dominio.com"></div>
    <div class="progresso" id="progresso" hidden><span></span></div>
    <p class="estado" id="upload-estado" role="status" aria-live="polite"></p>
    <p class="acoes">
      <button class="botao" type="button" id="enviar-render" disabled>Enviar para a fila</button>
    </p>
  </div>

  <table class="tabela-status">
    <thead><tr><th>Arquivo</th><th>Resolu&ccedil;&atilde;o</th><th>Estado</th><th>Progresso</th><th>Sa&iacute;da</th></tr></thead>
    <tbody id="fila">
      <tr><td colspan="5">Nenhum pedido nesta sess&atilde;o.</td></tr>
    </tbody>
  </table>
"""

PASTA_RENDERS = "04_Renders_Finais"

VISOR_3D = WEB / "vendor" / "Online3DViewer-master" / "build" / "engine" / "o3dv.min.js"
VISOR_LICENCA = WEB / "vendor" / "Online3DViewer-master" / "LICENSE.md"

# Critério de qualidade medido no pixel, não no nome do arquivo
LUM_MIN = 0.020
LUM_MAX = 0.965
DESVIO_MIN = 0.035
COBERTURA_MIN = 0.04     # fração mínima de pixel opaco (render quase vazio não vai ao ar)
LARGURA_FULL = 1800
LARGURA_THUMB = 720
# Fundo claro do card onde o quadro aparece (.capa img: gradiente #f4f2ff -> #e9edf6).
# Medir sobre preto escurecia tudo: o site hoje e claro, entao a composta usa o branco-acinzentado.
FUNDO_SITE = np.array([241.0, 243.0, 248.0], dtype=np.float32) / 255.0
PESO_LUM = np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


# ---------------------------------------------------------------- medição
def composta(img):
    """RGB de como o quadro REALMENTE aparece no site (alpha composto sobre o fundo) +
    a fração de pixels opacos. Medir o RGB puro de um RGBA enganava: o render de teste
    com 81% de área transparente dava outra luminância na tela."""
    a = np.asarray(img.convert("RGBA"), dtype=np.float32) / 255.0
    al = a[..., 3:]
    comp = a[..., :3] * al + FUNDO_SITE * (1.0 - al)
    return comp.astype(np.float32), float((a[..., 3] >= 0.99).mean())


def luminancia(comp):
    lum = comp @ PESO_LUM
    return (float(lum.mean()), float(lum.std()),
            float((comp.min(axis=2) >= 0.999).mean()), float((lum <= 0.002).mean()))


def dimensoes(png):
    with open(png, "rb") as f:
        cab = f.read(26)
    if cab[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", cab[16:24])


def titulo_de(arq):
    """'Cube_Plano_Inteiro_1920x1080.png' -> ('Cube', 'Plano Inteiro')."""
    base = re.sub(r"\.(png|jpg|jpeg|exr|hdr)$", "", arq.stem, flags=re.I)
    base = re.sub(r"_(\d{3,5}x\d{3,5})", "", base)
    base = re.sub(r"_escala\d+", "", base)
    partes = [p for p in base.split("_") if p]
    plano = " ".join(partes[1:]).title() if len(partes) > 1 else "Render"
    return (partes[0] if partes else base), plano


# ---------------------------------------------------------------- conversão
def salvar(img, base, qualidade):
    webp = base.with_suffix(".webp")
    try:
        img.save(webp, "WEBP", quality=qualidade, method=4)
        return webp
    except Exception:
        jpg = base.with_suffix(".jpg")
        if "A" in img.getbands():
            fundo = Image.new("RGB", img.size, tuple(int(c * 255) for c in FUNDO_SITE))
            fundo.paste(img, mask=img.getchannel("A"))
            img = fundo
        else:
            img = img.convert("RGB")
        img.save(jpg, "JPEG", quality=qualidade, optimize=True, progressive=True)
        return jpg


def reduzir(img, largura):
    if img.width <= largura:
        return img
    return img.resize((largura, round(img.height * largura / img.width)), Image.LANCZOS)


def preparar_imagem(png, pasta_img):
    img = Image.open(png)
    try:
        img = ImageOps.exif_transpose(img)
        comp, cobertura = composta(img)
        media, desvio, clip, preto = luminancia(comp)
        dim = dimensoes(png) or (0, 0)

        if cobertura < COBERTURA_MIN:
            return None, "QUADRO QUASE VAZIO (só %.1f%% do pixel opaco)" % (cobertura * 100)
        if media < LUM_MIN or preto > 0.85:
            return None, "QUADRO PRETO (luminância %.3f, %.0f%% de preto)" % (media, preto * 100)
        if media > LUM_MAX or clip > 0.55:
            return None, "QUADRO ESTOURADO (luminância %.3f, %.0f%% clipado)" % (media, clip * 100)
        if desvio < DESVIO_MIN:
            return None, "QUADRO LISO sem informação (desvio %.3f)" % desvio

        # Alpha preservado: achatava sobre preto e a imagem publicada ficava mais escura
        # que o render do artista (medido: 0.337 -> 0.277 no cubo com 42% de área alpha).
        quadro = img if "A" in img.getbands() else img.convert("RGB")
        nome = re.sub(r"[^\w-]+", "_", png.stem).strip("_").lower()
        arq_full = salvar(reduzir(quadro, LARGURA_FULL), pasta_img / (nome + "_full"), 82)
        arq_thumb = salvar(reduzir(quadro, LARGURA_THUMB), pasta_img / (nome + "_thumb"), 76)
    finally:
        img.close()

    dados = {
        "id": nome, "origem": png.name,
        "modelo": titulo_de(png)[0], "plano": titulo_de(png)[1],
        "full": "assets/img/" + arq_full.name, "thumb": "assets/img/" + arq_thumb.name,
        "largura": dim[0], "altura": dim[1], "bytes": arq_full.stat().st_size,
        "lum": round(media, 3), "desvio": round(desvio, 3),
        "clip": round(clip * 100, 2), "preto": round(preto * 100, 2),
        "opaco": round(cobertura * 100, 1),
    }
    return dados, "OK  %dx%d  lum %.3f  desvio %.3f  clip %.1f%%  opaco %.0f%%  -> %s (%.0f kB)" % (
        dim[0], dim[1], media, desvio, clip * 100, cobertura * 100, arq_full.name,
        dados["bytes"] / 1000)


# ---------------------------------------------------------------- coleta


def coletar_addon():
    bl = PROJETO / "pipeline_studio_pro.py"
    versao = ""
    if bl.exists():
        m = re.search(r'"version":\s*\((\d+),\s*(\d+),\s*(\d+)\)',
                      bl.read_text(encoding="utf-8", errors="replace"))
        if m:
            versao = ".".join(m.groups())
    dist = PROJETO / "dist"
    zips = sorted(dist.glob("RenderAlex_Pipeline_Pro_v*.zip"), key=lambda p: p.stat().st_mtime) \
        if dist.is_dir() else []
    return versao, (zips[-1] if zips else None)


def parse_leia_me():
    txt = PROJETO / "LEIA-ME.txt"
    if not txt.exists():
        return [], ""
    linhas = txt.read_text(encoding="utf-8", errors="replace").splitlines()
    blocos, atual, cabecalho = [], [], None
    intro = []
    for ln in linhas:
        m = re.match(r"^---\s*(.+?)\s*---\s*$", ln)
        if m:
            if cabecalho and atual:
                blocos.append({"titulo": cabecalho, "texto": "\n".join(atual).rstrip()})
            cabecalho, atual = m.group(1), []
            continue
        (intro if cabecalho is None else atual).append(ln)
    if cabecalho and atual:
        blocos.append({"titulo": cabecalho, "texto": "\n".join(atual).rstrip()})
    return blocos, "\n".join(intro).strip()


# ---------------------------------------------------------------- typescript
def copiar_visor_3d(log):
    """Leva o bundle do Online3DViewer (MIT) para dentro do site. Servido do proprio dominio:
    nenhum modelo do cliente passa por servidor de terceiros, e o site nao quebra se o
    3dviewer.net mudar de plano.
    Refazer o bundle:  cd web/vendor/Online3DViewer-master && npx esbuild \
        source/engine/main.js --bundle --minify --global-name=OV \
        --outfile=build/engine/o3dv.min.js
    """
    destino_dir = PUB / "assets" / "vendor" / "o3dv"
    if not VISOR_3D.is_file():
        # O bundle de origem nao esta nesta maquina, mas o que ja foi copiado continua
        # servindo. Desligar o visor aqui tirava do ar um preview que estava funcionando.
        if (destino_dir / "o3dv.min.js").is_file():
            log.append("%-44s preservado do proprio dominio (%.0f kB, bundle de origem ausente)"
                       % ("o3dv.min.js", (destino_dir / "o3dv.min.js").stat().st_size / 1000))
            return True
        log.append("%-44s AUSENTE — o preview 3D fica desligado (veja o docstring de "
                   "copiar_visor_3d)" % "o3dv.min.js")
        return False
    destino_dir.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(VISOR_3D, destino_dir / "o3dv.min.js")
    if VISOR_LICENCA.is_file():
        shutil.copyfile(VISOR_LICENCA, destino_dir / "LICENSE.txt")
    log.append("%-44s servido do proprio dominio (%.0f kB, MIT)"
               % ("o3dv.min.js", VISOR_3D.stat().st_size / 1000))
    return True


def compilar_typescript(log):
    tsc = SRC.parent / "node_modules" / "typescript" / "bin" / "tsc"
    node = shutil.which("node")
    if not (node and tsc.exists()):
        log.append("TypeScript ausente: rode `npm install` dentro de %s para recompilar. "
                   % WEB)
        return False
    ok = True
    alvos = {"tsconfig.site.json": PUB / "assets/js/site.js",
             "tsconfig.visor.json": PUB / "assets/js/visor3d.js",
             "tsconfig.worker.json": PUB / "_worker.js"}
    for cfg, alvo in alvos.items():
        r = subprocess.run([node, str(tsc), "-p", str(WEB / cfg)],
                           capture_output=True, text=True, cwd=str(WEB))
        if r.returncode != 0:
            ok = False
            log.append("tsc %s -> ERRO\n%s" % (cfg, (r.stdout + r.stderr).strip()[:1200]))
        elif alvo.exists():
            log.append("tsc %s -> %s (%.1f kB)" % (cfg, alvo.relative_to(PUB),
                                                   alvo.stat().st_size / 1000))
        else:
            ok = False
            log.append("tsc %s rodou mas não escreveu %s" % (cfg, alvo))
    return ok


# ---------------------------------------------------------------- sql
def sqltxt(v):
    return "'" + str(v).replace("'", "''") + "'"


def escrever_seed(galeria):
    linhas = ["-- gerado por build_site.py em %s" % dt.datetime.now().isoformat(timespec="seconds"),
              "-- aplicar:  wrangler d1 execute renderalex-site --remote --file=./db/seed.sql", ""]
    for i, g in enumerate(galeria):
        linhas.append(
            "INSERT OR REPLACE INTO renders (id, modelo, plano, full, thumb, largura, altura, "
            "bytes, luminancia, desvio, clip_pct, preto_pct, origem, destaque, publicado, atualizado) "
            "VALUES (%s, %s, %s, %s, %s, %d, %d, %d, %.4f, %.4f, %.4f, %.4f, %s, %d, 1, datetime('now'));"
            % (sqltxt(g["id"]), sqltxt(g["modelo"]), sqltxt(g["plano"]), sqltxt(g["full"]),
               sqltxt(g["thumb"]), g["largura"], g["altura"], g["bytes"], g["lum"], g["desvio"],
               g["clip"], g["preto"], sqltxt(g["origem"]), len(galeria) - i))
    ids = ", ".join(sqltxt(g["id"]) for g in galeria)
    linhas.append("UPDATE renders SET publicado = 0 WHERE id NOT IN (%s);"
                  % (ids or "'__vazio__'"))
    linhas.append("")
    return escrever(DB, "seed.sql", "\n".join(linhas))


# ---------------------------------------------------------------- html
def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;"))


def link_contato(kind):
    v = CONTATO.get(kind, "")
    if not v:
        return ""
    if kind == "email":
        return '<a class="canal" href="mailto:%s">%s</a>' % (esc(v), esc(v))
    if kind == "whatsapp":
        return '<a class="canal" href="https://wa.me/%s">WhatsApp</a>' % esc(v)
    return '<a class="canal" href="https://%s.com/%s">%s</a>' % (
        esc(kind), esc(v), kind.title())


CABECALHO = """<header class="topo">
  <a class="marca" href="index.html">%(marca)s</a>
  <nav>
    <a href="#visor">Visor</a>
    <a href="#trabalho">Renders</a>
    <a href="#biblioteca">Materiais</a>
    <a href="ferramentas.html">Ferramentas</a>
    <a href="#contato">Contato</a>
  </nav>
</header>"""


def marca_html():
    m = re.match(r"^(Render)(Alex)(.*)$", NOME_ESTUDIO)
    if m:
        return "%s<b>%s</b>%s" % (esc(m.group(1)), esc(m.group(2)), esc(m.group(3)))
    return "<b>%s</b>" % esc(NOME_ESTUDIO)


def html_index(galeria, url_base, tem_visor=True):
    hero = galeria[0] if galeria else None
    cards = "\n".join(
        """      <figure class="peca" data-modelo="%(modelo)s">
        <button class="capa" type="button" data-full="%(full)s" data-legenda="%(titulo)s">
          <img src="%(thumb)s" alt="%(titulo)s" loading="lazy" width="%(l)s" height="%(a)s">
        </button>
        <figcaption><strong>%(modelo)s</strong><span>%(plano)s</span></figcaption>
      </figure>""" % {
            "modelo": esc(g["modelo"]), "full": esc(g["full"]), "thumb": esc(g["thumb"]),
            "titulo": esc("%s — %s" % (g["modelo"], g["plano"])),
            "plano": esc(g["plano"]), "l": g["largura"], "a": g["altura"]}
        for g in galeria) or ('      <p class="aviso">Nenhum render qualificado em <code>%s</code> ainda.</p>'
                              % esc(PASTA_RENDERS))

    filtros = sorted({g["modelo"] for g in galeria})
    botoes = "\n".join('    <button class="filtro" type="button" data-filtro="%s">%s</button>'
                       % (esc(m), esc(m)) for m in filtros)

    canais = " ".join(filter(None, [link_contato(k) for k in ("email", "whatsapp", "instagram", "behance")]))
    canais = canais or ('<span class="aviso">Edite <code>CONTATO</code> em <code>build_site.py</code> '
                        'para publicar seus canais.</span>')
    opcoes = "\n".join('        <option value="%s">%s</option>' % (esc(t), esc(t))
                       for t in TIPOS_DE_PROJETO)
    painel_envio = PAINEL_ENVIO % {
        "resolucoes": "\n".join('        <option value="%s"%s>%s</option>'
                                % (esc(r), ' selected' if r == "1920x1080" else "", esc(r))
                                for r in RESOLUCOES),
        "motores": "\n".join('        <option>%s</option>' % esc(m) for m in MOTORES),
    }
    ogimg = ('<meta property="og:image" content="%s/%s">' % (esc(url_base.rstrip("/")), esc(hero["full"]))
             if hero else "")

    return """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%(nome)s · %(tag)s</title>
<meta name="description" content="%(desc)s">
<meta property="og:title" content="%(nome)s">
<meta property="og:description" content="%(desc)s">
<meta property="og:type" content="website">
<meta property="og:url" content="%(url)s/">
%(ogimg)s
<link rel="canonical" href="%(url)s/">
<meta name="theme-color" content="#f4f4fa">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body class="app">
<a class="pular" href="#conteudo">Pular para o conte&uacute;do</a>
%(cabecalho)s
<main class="app" id="conteudo">
<h1 class="so-leitor">Envie o arquivo. Receba o render.</h1>

<section id="visor" class="painel">
  <div class="barra-visor">
    <label class="ib" for="arquivo" title="Abrir arquivo" aria-label="Abrir arquivo" role="button" tabindex="0">&#8593;</label>
    <input id="arquivo" type="file" accept=".glb,.gltf,.obj,.mtl,.fbx,.stl,.ply,.3mf,.dae,.zip,.blend"
           multiple hidden>
    <span class="div"></span>
    <button type="button" class="ib" data-vis="esq" title="Girar &agrave; esquerda" aria-label="Girar &agrave; esquerda">&#8592;</button>
    <button type="button" class="ib" data-vis="dir" title="Girar &agrave; direita" aria-label="Girar &agrave; direita">&#8594;</button>
    <button type="button" class="ib" data-vis="fit" title="Enquadrar" aria-label="Enquadrar">&#8862;</button>
    <button type="button" class="ib" data-vis="aresta" title="Arestas" aria-label="Arestas">&#9634;</button>
    <button type="button" class="ib" data-vis="foto" title="Salvar PNG" aria-label="Salvar PNG">&#9670;</button>
    <button type="button" class="ib" data-vis="tela" title="Tela cheia" aria-label="Tela cheia">&#10530;</button>
    <span class="cresce"></span>
    <span class="arquivo" id="arquivo-nome">nenhum arquivo</span>
  </div>
  <div class="visor" id="visor-3d" tabindex="0" role="region" aria-label="Visor 3D"></div>
  <p class="nota" id="visor-aviso" role="status" aria-live="polite">Arraste um .glb, .obj, .fbx, .stl ou .zip de modelos para o
  visor: gira aqui no navegador, sem subir nada.</p>
%(painel_envio)s
</section>

<section id="trabalho" class="painel">
  <p class="estado aviso" id="api-estado"></p>
  <div class="filtros">
    <button class="filtro ativo" type="button" data-filtro="*">Todos</button>
%(filtros)s
  </div>
  <div class="grade" id="galeria">
%(cards)s
  </div>
  <p class="aviso" id="vazio" hidden>Nenhuma pe&ccedil;a nesse filtro.</p>
</section>

<section id="biblioteca" class="painel">
  <div class="barra-visor">
    <label class="ib" for="material" title="Adicionar material ou luz" aria-label="Adicionar material ou luz" role="button" tabindex="0">+</label>
    <input id="material" type="file"
           accept=".sbsar,.exr,.hdr,.hdri,.ies,.json,.zip" multiple hidden>
    <button type="button" class="ib" id="limpar-materiais" title="Limpar a lista" aria-label="Limpar a lista">&#10005;</button>
    <span class="cresce"></span>
    <span class="arquivo" id="material-total">nenhum arquivo</span>
  </div>
  <ul class="materiais" id="materiais"></ul>
  <p class="nota">A lista come&ccedil;a vazia: material (<code>.sbsar</code>) e
  ilumina&ccedil;&atilde;o (<code>.exr</code>, <code>.hdr</code>, <code>.ies</code>) entram aqui,
  por quem pede. Eles viajam com a cena at&eacute; a GPU do est&uacute;dio.</p>
</section>

<section id="contato" class="painel">
  <form id="form-contato" novalidate>
    <div class="campo"><label for="nome">Nome</label>
      <input id="nome" name="nome" type="text" autocomplete="name" required></div>
    <div class="campo"><label for="email">E-mail</label>
      <input id="email" name="email" type="email" autocomplete="email" required></div>
    <div class="campo"><label for="projeto">Tipo de projeto</label>
      <select id="projeto" name="projeto">
%(opcoes)s
      </select></div>
    <div class="campo"><label for="mensagem">O que precisa renderizar</label>
      <textarea id="mensagem" name="mensagem" required></textarea></div>
    <div class="armadilha"><label for="empresa">N&atilde;o preencha</label>
      <input id="empresa" name="empresa" type="text" tabindex="-1" autocomplete="off"></div>
    <p class="estado" id="form-estado" role="status" aria-live="polite"></p>
    <p><button class="botao" type="submit">Enviar</button>
       <a class="canal" id="fallback-email" hidden data-para="%(email)s">Enviar por e-mail</a></p>
  </form>
  <p class="canais">%(canais)s</p>
</section>
</main>

<footer>
  <p>%(nome)s · build %(build)s · <a href="pipeline.html">documenta&ccedil;&atilde;o</a>
     · <a href="ferramentas.html">ferramentas de textura</a></p>
</footer>

<div class="luzbox" id="luzbox" hidden>
  <button class="fechar" type="button" aria-label="Fechar">&times;</button>
  <button class="navegar" type="button" data-passos="-1" aria-label="Anterior">&lsaquo;</button>
  <figure class="palco">
    <img alt="" id="luzimg">
    <figcaption><span id="luzlegenda"></span><span class="contagem" id="luzcontagem"></span></figcaption>
  </figure>
  <button class="navegar" type="button" data-passos="1" aria-label="Próxima">&rsaquo;</button>
</div>
<script src="assets/js/site.js" defer></script>
%(scripts)s
</body>
</html>
""" % {
        "nome": esc(NOME_ESTUDIO), "tag": esc(TAGLINE), "desc": esc(DESCRICAO),
        "url": esc(url_base.rstrip("/")), "ogimg": ogimg,
        "cabecalho": CABECALHO % {"marca": marca_html()},
        "painel_envio": painel_envio,
        "scripts": ('<script src="assets/js/visor3d.js" defer></script>' if tem_visor else ""),
        "filtros": botoes, "cards": cards,
        "canais": canais, "opcoes": opcoes,
        "email": esc(CONTATO["email"]), "build": dt.date.today().isoformat(),
    }


def html_404():
    return """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Página não encontrada · %(nome)s</title>
<link rel="stylesheet" href="/assets/css/site.css"></head>
<body><main class="conteudo">
<p class="eyebrow">erro 404</p>
<h1>Essa página não está no projeto.</h1>
<p class="lead">Os renders ficam em <a href="/index.html#trabalho">Trabalho</a>, a documenta&ccedil;&atilde;o do
pipeline em <a href="/pipeline.html">Pipeline</a> e as ferramentas de textura em
<a href="ferramentas.html">Ferramentas</a>.</p>
</main></body></html>""" % {"nome": esc(NOME_ESTUDIO)}


def html_pipeline(blocos, intro, versao):
    secoes = "\n".join(
        """    <article class="bloco-doc">
      <h2>%s</h2>
      <pre>%s</pre>
    </article>""" % (esc(b["titulo"]), esc(b["texto"]))
        for b in blocos) or "    <p>Sem LEIA-ME.txt no projeto.</p>"
    return """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pipeline · %(nome)s</title>
<meta name="description" content="Como o pipeline de render do %(nome)s funciona: câmera, luz, material, motor e verificação.">
<link rel="canonical" href="%(url)s/">
<meta name="theme-color" content="#f4f4fa">
<link rel="stylesheet" href="assets/css/site.css">
</head>
<body class="doc">
<header class="topo">
  <a class="marca" href="index.html">%(nome)s</a>
  <nav><a href="index.html">Início</a><a href="index.html#trabalho">Trabalho</a><a href="ferramentas.html">Ferramentas</a><a href="index.html#contato">Contato</a></nav>
</header>
<main class="conteudo">
  <h1>Pipeline RenderAlex%(versao)s</h1>
  <p class="lead">%(intro)s</p>
%(secoes)s
</main>
<footer><p><a href="index.html">Voltar para o site</a></p></footer>
</body>
</html>
""" % {"nome": esc(NOME_ESTUDIO), "intro": esc(intro[:400]), "secoes": secoes,
        "versao": (" v" + esc(versao)) if versao else ""}


HEADERS = """/*
  Cache-Control: public, max-age=0, must-revalidate
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Content-Security-Policy: default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' blob:; worker-src 'self' blob:; connect-src 'self' data: blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'self'

/assets/img/*
  Cache-Control: public, max-age=2592000, immutable

/assets/vendor/*
  Cache-Control: public, max-age=2592000, immutable

/api/*
  Cache-Control: no-store
"""


def escrever(pasta, nome, texto):
    d = Path(pasta) / nome
    d.parent.mkdir(parents=True, exist_ok=True)
    d.write_text(texto, encoding="utf-8", newline="\n")
    return d


# ---------------------------------------------------------------- montagem
def montar(url_base, sem_ts):
    for sub in ("assets/img", "assets/css", "assets/js"):
        (PUB / sub).mkdir(parents=True, exist_ok=True)

    log = []
    galeria = []
    origem = PROJETO / PASTA_RENDERS
    if origem.is_dir():
        for png in sorted(origem.glob("*.png")) + sorted(origem.glob("*.jpg")):
            dados, msg = preparar_imagem(png, PUB / "assets" / "img")
            log.append("%-44s %s" % (png.name, msg))
            if dados:
                galeria.append(dados)
        galeria.sort(key=lambda g: g["desvio"], reverse=True)   # o quadro mais rico vira o hero
    else:
        # Rodar o build sem a pasta dos quadros ja esvaziou o site inteiro: index sem
        # galeria, dados.json sem renders, seed.sql sem INSERT. Se o public/ atual
        # ainda tem a galeria, ela e carregada de volta em vez de apagada.
        anteriores = []
        try:
            anteriores = json.loads((PUB / "dados.json").read_text(encoding="utf-8")).get("renders", [])
        except Exception:
            anteriores = []
        if anteriores:
            galeria = anteriores
            log.append("PASTA %s NAO EXISTE: galeria anterior preservada do dados.json "
                       "(%d render(es)). NAO publique este build achando que ele atualizou "
                       "os quadros." % (PASTA_RENDERS, len(galeria)))
        else:
            log.append("PASTA %s NÃO EXISTE — sem galeria" % PASTA_RENDERS)

    versao, _ = coletar_addon()          # só o número da versão, para a página de documentação
    if not versao:
        # o .py do addon nao esta nesta maquina: sem isto o site perdia o numero da
        # versao que ele mesmo tinha publicado da ultima vez.
        try:
            anteriora = json.loads((PUB / "dados.json").read_text(encoding="utf-8")).get("addon", "")
        except Exception:
            anteriora = ""
        if anteriora:
            versao = anteriora
            log.append("%-44s preservado v%s — pipeline_studio_pro.py de origem ausente"
                       % ("versao do addon", anteriora))
    blocos, intro = parse_leia_me()

    css = escrever(PUB, "assets/css/site.css", (SRC / "site.css").read_text(encoding="utf-8"))
    tem_visor = copiar_visor_3d(log)
    compilou = compilar_typescript(log) if not sem_ts else False

    escrever(PUB, "index.html", html_index(galeria, url_base, tem_visor))
    doc = html_pipeline(blocos, intro, versao)
    existente = PUB / "pipeline.html"
    if not blocos and existente.is_file() and existente.stat().st_size > len(doc.encode("utf-8")):
        # Sem o LEIA-ME.txt de origem nao ha o que documentar: reescrever deixava a
        # pagina de pipeline com duas linhas no lugar de dez blocos medida a medida.
        log.append("%-44s preservado (%d kB) — LEIA-ME.txt de origem ausente"
                   % ("pipeline.html", existente.stat().st_size / 1000))
    else:
        escrever(existente.parent, existente.name, doc)
    escrever(PUB, "404.html", html_404())
    escrever(PUB, "_headers", HEADERS)
    escrever(PUB, "robots.txt", "User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n"
             % url_base.rstrip("/"))
    urls = [url_base.rstrip("/") + p for p in ("/", "/pipeline.html", "/ferramentas.html")]
    escrever(PUB, "sitemap.xml",
             '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/'
             'schemas/sitemap/0.9">\n%s\n</urlset>\n'
             % "\n".join('  <url><loc>%s</loc><lastmod>%s</lastmod></url>'
                         % (u, dt.date.today().isoformat()) for u in urls))
    escrever(PUB, "dados.json", json.dumps(
        {"estudio": NOME_ESTUDIO, "build": dt.datetime.now().isoformat(timespec="seconds"),
         "addon": versao, "renders": galeria},
        ensure_ascii=False, indent=2))
    seed = escrever_seed(galeria)
    log.append("%-44s %d inserções" % (seed.name, len(galeria)))

    if not (PUB / "assets/js/site.js").exists():
        log.append("FALTA public/assets/js/site.js — rode `npm install` e `npm run build` em %s" % WEB)
    if not (PUB / "_worker.js").exists():
        log.append("FALTA public/_worker.js — sem ele o formulário não fala com o D1")

    return galeria, log, compilou


def main():
    ap = argparse.ArgumentParser(description="Gera a versão web do projeto para o Cloudflare Pages.")
    ap.add_argument("--url", default="https://www.alexdesign.art.br/render/",
                    help="domínio publicado (sitemap, robots e open graph)")
    ap.add_argument("--sem-ts", action="store_true", help="não chama o compilador TypeScript")
    args = ap.parse_args()

    print("PROJETO  %s" % PROJETO)
    print("SAÍDA    %s" % PUB)
    galeria, log, compilou = montar(args.url, args.sem_ts)

    print("\nCONFERÊNCIA DOS QUADROS (%s):" % PASTA_RENDERS)
    for l in log:
        print("  " + l)

    total = sum(f.stat().st_size for f in PUB.rglob("*") if f.is_file())
    print("\nSITE: %s" % PUB)
    print("  %d renders publicados · %.2f MB na pasta · typescript %s"
          % (len(galeria), total / 1e6, "compilado" if compilou else "não compilado agora"))
    print("  subir: dashboard > Workers & Pages > Pages > Create > Upload assets > arraste a pasta "
          "public/ (sem build command).")
    return 0 if (galeria and (PUB / "assets/js/site.js").exists()) else 1


if __name__ == "__main__":
    sys.exit(main())
