import * as THREE from 'three';

export interface HtmlTo3dSpec {
  id?: string;
  name: string;
  html: string;
  widthM: number;
  heightM: number;
  depthM: number;
  bgHex: string;
  accentHex: string;
  textHex: string;
  emissiveGlow: number;
}

export interface HtmlTo3dPreset {
  id: string;
  label: string;
  spec: HtmlTo3dSpec;
}

export const HTML_TO_3D_PRESETS: HtmlTo3dPreset[] = [
  {
    id: 'product_card',
    label: 'Card Produto 3D',
    spec: {
      name: 'Card_HTML_Produto',
      html: `<span class="badge">ALEXDESIGN 3D</span>
<h1>Armadura Modular Mk.IV</h1>
<p>Malha PBR otimizada com Rig Humanoide, 84 animações ActionForge e exportação direta para Blender 5.3.</p>
<button>Inspecionar Modelo</button>`,
      widthM: 1.25,
      heightM: 0.78,
      depthM: 0.05,
      bgHex: '#0f172a',
      accentHex: '#f97316',
      textHex: '#f8fafc',
      emissiveGlow: 0.35,
    },
  },
  {
    id: 'hud_telemetry',
    label: 'Painel HUD / Specs',
    spec: {
      name: 'Painel_HTML_HUD',
      html: `<span class="badge">ESPECIFICAÇÕES</span>
<h2>Especificações PBR</h2>
<li>Shader: Principled BSDF (AgX)</li>
<li>Texturas: Albedo + Normal + ORM</li>
<li>Pipeline: glTF 2.0 / FBX 7.4</li>
<button>Validado 60 FPS</button>`,
      widthM: 1.1,
      heightM: 0.78,
      depthM: 0.04,
      bgHex: '#09111e',
      accentHex: '#38bdf8',
      textHex: '#e2e8f0',
      emissiveGlow: 0.55,
    },
  },
  {
    id: 'neon_banner',
    label: 'Placa Neon Estúdio',
    spec: {
      name: 'Placa_HTML_Neon',
      html: `<span class="badge">AO VIVO</span>
<h1>ALEXDESIGN STUDIO</h1>
<p>Renderização WebGL2 em tempo real · Iluminação HDRI & Pós-Processamento.</p>
<button>Exportar GLB</button>`,
      widthM: 1.45,
      heightM: 0.72,
      depthM: 0.06,
      bgHex: '#181024',
      accentHex: '#a855f7',
      textHex: '#ffffff',
      emissiveGlow: 0.85,
    },
  },
];

interface ParsedHtmlBlock {
  kind: 'badge' | 'h1' | 'h2' | 'p' | 'li' | 'button' | 'code';
  text: string;
}

export function parseHtmlBlocks(html: string): ParsedHtmlBlock[] {
  const trimmed = html.trim();
  if (!trimmed) {
    return [{ kind: 'h1', text: 'AlexDesign HTML → 3D' }];
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(trimmed, 'text/html');
    const blocks: ParsedHtmlBlock[] = [];

    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;

        if (tag === 'h1') {
          blocks.push({ kind: 'h1', text });
          return;
        }
        if (tag === 'h2' || tag === 'h3' || tag === 'h4') {
          blocks.push({ kind: 'h2', text });
          return;
        }
        if (tag === 'button' || tag === 'a') {
          blocks.push({ kind: 'button', text });
          return;
        }
        if (tag === 'li') {
          blocks.push({ kind: 'li', text });
          return;
        }
        if (tag === 'code' || tag === 'pre') {
          blocks.push({ kind: 'code', text });
          return;
        }
        if (tag === 'span' || tag === 'strong' || el.classList.contains('badge')) {
          if (el.parentElement?.tagName.toLowerCase() === 'body') {
            blocks.push({ kind: 'badge', text });
            return;
          }
        }
        if (tag === 'p') {
          blocks.push({ kind: 'p', text });
          return;
        }
      } else if (node.nodeType === Node.TEXT_NODE && node.parentElement?.tagName.toLowerCase() === 'body') {
        const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) blocks.push({ kind: 'p', text: txt });
        return;
      }

      node.childNodes.forEach((child) => walk(child));
    };

    walk(doc.body);
    if (blocks.length > 0) return blocks;
  } catch {
    // fallback below
  }

  return trimmed
    .split(/\r?\n/)
    .map((line) => line.replace(/<[^>]+>/g, '').trim())
    .filter(Boolean)
    .map((line, i) => ({ kind: i === 0 ? 'h1' : 'p', text: line }));
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function renderHtmlSpecToCanvas(
  spec: HtmlTo3dSpec,
  canvasWidth = 1024
): HTMLCanvasElement {
  const aspect = Math.max(0.35, Math.min(2.2, spec.heightM / Math.max(0.2, spec.widthM)));
  const w = canvasWidth;
  const h = Math.max(320, Math.round(canvasWidth * aspect));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Base background with subtle gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, spec.bgHex);
  grad.addColorStop(1, '#070a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Accent radial glow
  const glow = ctx.createRadialGradient(w * 0.85, h * 0.15, 10, w * 0.85, h * 0.15, w * 0.65);
  glow.addColorStop(0, `${spec.accentHex}38`);
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Crisp subtle grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let gx = 48; gx < w; gx += 48) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 48; gy < h; gy += 48) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Outer card frame border
  const pad = 28;
  drawRoundedRectPath(ctx, pad, pad, w - pad * 2, h - pad * 2, 28);
  ctx.strokeStyle = `${spec.accentHex}88`;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Top accent bar
  ctx.fillStyle = spec.accentHex;
  drawRoundedRectPath(ctx, pad + 32, pad + 28, 96, 8, 4);
  ctx.fill();

  const blocks = parseHtmlBlocks(spec.html);
  const contentX = pad + 44;
  const maxTextW = w - (pad + 44) * 2;
  let cursorY = pad + 64;

  for (const block of blocks) {
    if (cursorY > h - pad - 40) break;

    if (block.kind === 'badge') {
      ctx.font = '700 22px "JetBrains Mono", monospace';
      const tw = ctx.measureText(block.text.toUpperCase()).width;
      const bw = Math.min(maxTextW, tw + 34);
      ctx.fillStyle = `${spec.accentHex}26`;
      drawRoundedRectPath(ctx, contentX, cursorY, bw, 38, 10);
      ctx.fill();
      ctx.strokeStyle = `${spec.accentHex}99`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = spec.accentHex;
      ctx.textBaseline = 'middle';
      ctx.fillText(block.text.toUpperCase(), contentX + 17, cursorY + 20);
      cursorY += 56;
    } else if (block.kind === 'h1' || block.kind === 'h2') {
      const fontSize = block.kind === 'h1' ? 52 : 40;
      ctx.font = `700 ${fontSize}px "Outfit", "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = spec.textHex;
      ctx.textBaseline = 'top';
      const lines = wrapCanvasText(ctx, block.text, maxTextW);
      for (const line of lines.slice(0, 3)) {
        ctx.fillText(line, contentX, cursorY);
        cursorY += fontSize * 1.18;
      }
      cursorY += 12;
    } else if (block.kind === 'li') {
      ctx.font = '500 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = spec.accentHex;
      ctx.textBaseline = 'top';
      ctx.fillText('▸', contentX, cursorY);
      ctx.fillStyle = `${spec.textHex}dd`;
      const lines = wrapCanvasText(ctx, block.text, maxTextW - 32);
      for (const line of lines.slice(0, 2)) {
        ctx.fillText(line, contentX + 30, cursorY);
        cursorY += 34;
      }
      cursorY += 8;
    } else if (block.kind === 'code') {
      ctx.font = '500 23px "JetBrains Mono", monospace';
      const lines = wrapCanvasText(ctx, block.text, maxTextW - 28).slice(0, 2);
      const boxH = lines.length * 32 + 20;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      drawRoundedRectPath(ctx, contentX, cursorY, maxTextW, boxH, 12);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.textBaseline = 'top';
      lines.forEach((line, li) => {
        ctx.fillText(line, contentX + 14, cursorY + 12 + li * 32);
      });
      cursorY += boxH + 14;
    } else if (block.kind === 'button') {
      ctx.font = '700 25px "Plus Jakarta Sans", sans-serif';
      const tw = ctx.measureText(block.text).width;
      const bw = Math.min(maxTextW, tw + 56);
      cursorY = Math.max(cursorY + 6, Math.min(cursorY + 12, h - pad - 80));
      ctx.fillStyle = spec.accentHex;
      drawRoundedRectPath(ctx, contentX, cursorY, bw, 56, 14);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'middle';
      ctx.fillText(block.text, contentX + 28, cursorY + 29);
      cursorY += 74;
    } else {
      ctx.font = '400 26px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = `${spec.textHex}cc`;
      ctx.textBaseline = 'top';
      const lines = wrapCanvasText(ctx, block.text, maxTextW);
      for (const line of lines.slice(0, 4)) {
        ctx.fillText(line, contentX, cursorY);
        cursorY += 35;
      }
      cursorY += 12;
    }
  }

  return canvas;
}

export function renderHtmlSpecToCanvasTexture(
  spec: HtmlTo3dSpec,
  maxAnisotropy = 4
): THREE.CanvasTexture {
  const canvas = renderHtmlSpecToCanvas(spec, 1024);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, Math.max(1, maxAnisotropy));
  tex.needsUpdate = true;
  return tex;
}

export function createHtmlTo3dGroup(
  spec: HtmlTo3dSpec,
  maxAnisotropy = 4
): THREE.Group {
  const group = new THREE.Group();
  group.name = spec.name.trim() || 'Painel_HTML_3D';

  const w = Math.max(0.25, spec.widthM);
  const h = Math.max(0.2, spec.heightM);
  const d = Math.max(0.02, spec.depthM);

  // 1. Metallic Chassis Backing
  const chassisMat = new THREE.MeshPhysicalMaterial({
    name: `${group.name}_Chassis`,
    color: '#1e293b',
    metalness: 0.72,
    roughness: 0.28,
    clearcoat: 0.4,
  });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), chassisMat);
  chassis.name = `${group.name}_Moldura`;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // 2. Accent Edge Trim
  const trimMat = new THREE.MeshPhysicalMaterial({
    name: `${group.name}_Borda`,
    color: spec.accentHex,
    emissive: new THREE.Color(spec.accentHex),
    emissiveIntensity: Math.max(0, spec.emissiveGlow * 0.45),
    roughness: 0.22,
    metalness: 0.45,
  });
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.024, h + 0.024, Math.max(0.012, d * 0.52)),
    trimMat
  );
  trim.name = `${group.name}_Aro`;
  trim.position.z = -d * 0.08;
  group.add(trim);

  // 3. Rendered HTML Canvas Screen
  const tex = renderHtmlSpecToCanvasTexture(spec, maxAnisotropy);
  const screenMat = new THREE.MeshPhysicalMaterial({
    name: `${group.name}_TelaHTML`,
    color: '#ffffff',
    map: tex,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: tex,
    emissiveIntensity: Math.max(0.05, spec.emissiveGlow),
    roughness: 0.18,
    metalness: 0.04,
    clearcoat: 0.65,
    side: THREE.FrontSide,
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.94), screenMat);
  screen.name = `${group.name}_Conteudo`;
  screen.position.z = d * 0.5 + 0.004;
  group.add(screen);

  group.userData.isSplinePrimitive = true;
  group.userData.isHtml3d = true;
  group.userData.html3dSpec = { ...spec };
  group.userData.materialStyle = 'physical';
  group.userData.interaction = 'none';
  group.userData.collectionName = 'HTML_3D';

  return group;
}

export function updateHtmlTo3dGroup(
  group: THREE.Group,
  spec: HtmlTo3dSpec,
  maxAnisotropy = 4
) {
  const w = Math.max(0.25, spec.widthM);
  const h = Math.max(0.2, spec.heightM);
  const d = Math.max(0.02, spec.depthM);

  group.name = spec.name.trim() || group.name;
  group.userData.html3dSpec = { ...spec };

  const chassis = group.children[0] as THREE.Mesh | undefined;
  const trim = group.children[1] as THREE.Mesh | undefined;
  const screen = group.children[2] as THREE.Mesh | undefined;

  if (chassis?.isMesh) {
    chassis.geometry.dispose();
    chassis.geometry = new THREE.BoxGeometry(w, h, d);
  }
  if (trim?.isMesh) {
    trim.geometry.dispose();
    trim.geometry = new THREE.BoxGeometry(w + 0.024, h + 0.024, Math.max(0.012, d * 0.52));
    trim.position.z = -d * 0.08;
    const tMat = trim.material as THREE.MeshPhysicalMaterial;
    tMat.color.set(spec.accentHex);
    tMat.emissive.set(spec.accentHex);
    tMat.emissiveIntensity = Math.max(0, spec.emissiveGlow * 0.45);
    tMat.needsUpdate = true;
  }
  if (screen?.isMesh) {
    screen.geometry.dispose();
    screen.geometry = new THREE.PlaneGeometry(w * 0.96, h * 0.94);
    screen.position.z = d * 0.5 + 0.004;
    const sMat = screen.material as THREE.MeshPhysicalMaterial;
    sMat.map?.dispose();
    const tex = renderHtmlSpecToCanvasTexture(spec, maxAnisotropy);
    sMat.map = tex;
    sMat.emissiveMap = tex;
    sMat.emissive.setHex(0xffffff);
    sMat.emissiveIntensity = Math.max(0.05, spec.emissiveGlow);
    sMat.needsUpdate = true;
  }
}
