import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Archive,
  Bone,
  Box,
  Camera,
  Contrast,
  Grid,
  Palette,
  Play,
  Search,
  Sparkles,
  Type,
  Upload,
  Workflow,
  X,
} from 'lucide-react';
import { ViewportStageKey } from './Viewport3D';

export type SmartCommandTarget = 'viewport' | ViewportStageKey;

interface SmartCommandItem {
  id: SmartCommandTarget;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: typeof Box;
}

const SMART_COMMANDS: SmartCommandItem[] = [
  {
    id: 'stage1',
    title: '1. Importar & Exemplos 3D',
    subtitle: 'Carregar GLB/glTF/OBJ, gerar exemplos prontos e UV automático',
    keywords: ['importar', 'abrir', 'glb', 'gltf', 'obj', 'zip', 'exemplo', 'carregar', 'upload', 'uv', 'automatizar'],
    icon: Upload,
  },
  {
    id: 'stage2',
    title: '2. Editar Cena & Objetos',
    subtitle: 'Mover, girar, escalar, hierarquia e booleanas no modelo',
    keywords: ['editar', 'mover', 'girar', 'rotacionar', 'escala', 'tamanho', 'objeto', 'cena', 'transformar'],
    icon: Box,
  },
  {
    id: 'stage4',
    title: '3. Retopology & Otimização',
    subtitle: 'Reduzir polígonos, LOD e otimizar peso da malha 3D',
    keywords: ['retopo', 'retopology', 'poligono', 'triangulo', 'otimizar', 'leve', 'comprimir', 'lod', 'malha'],
    icon: Grid,
  },
  {
    id: 'stage5',
    title: '4. PBR, UV & HDRI (Ao Vivo)',
    subtitle: 'Materiais separados, texturas PBR, iluminação HDRI e exposição',
    keywords: ['pbr', 'material', 'textura', 'cor', 'hdri', 'luz', 'iluminacao', 'brilho', 'metal', 'uv', 'mapa'],
    icon: Palette,
  },
  {
    id: 'stage7',
    title: '5. Rigging & Animação (ActionForge)',
    subtitle: 'Auto-Rig, esqueleto, ciclos de ação (Caminhar, Correr, Pular, Soco), 12 princípios e timeline',
    keywords: ['rig', 'rigging', 'osso', 'esqueleto', 'personagem', 'pose', 'animacao', 'animar', 'caminhar', 'correr', 'pular', 'soco', 'acenar', 'timeline', 'loop'],
    icon: Bone,
  },
  {
    id: 'stage9',
    title: '7. Simulação, FX & Pós-FX',
    subtitle: 'Bloom, física, partículas e pós-processamento visual',
    keywords: ['simulacao', 'fisica', 'bloom', 'efeito', 'fx', 'pos', 'particula'],
    icon: Sparkles,
  },
  {
    id: 'stage12',
    title: '8. Geometry Nodes & MoGraph',
    subtitle: 'Instâncias procedurais, clonadores e efetores',
    keywords: ['nodes', 'geometry', 'mograph', 'procedural', 'clonar', 'instancia'],
    icon: Workflow,
  },
  {
    id: 'stage13',
    title: '9. Câmera & Enquadramento',
    subtitle: 'Lentes, FOV, presets de câmera e enquadramento cinematográfico',
    keywords: ['camera', 'lente', 'fov', 'enquadramento', 'foto', 'frente', 'topo', 'lateral'],
    icon: Camera,
  },
  {
    id: 'stage14',
    title: '10. Exportar & Publicar',
    subtitle: 'Baixar GLB, PNG, vídeo ou pacote completo do projeto',
    keywords: ['exportar', 'baixar', 'download', 'salvar', 'publicar', 'png', 'video', 'glb'],
    icon: Archive,
  },
];

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

interface SmartCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelect: (target: SmartCommandTarget) => void;
  highContrast: boolean;
  onToggleHighContrast: () => void;
  largeText: boolean;
  onToggleLargeText: () => void;
  recentTargets: SmartCommandTarget[];
}

export function SmartCommandPalette({
  open,
  onClose,
  onSelect,
  highContrast,
  onToggleHighContrast,
  largeText,
  onToggleLargeText,
  recentTargets,
}: SmartCommandPaletteProps) {
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    window.setTimeout(() => inputRef.current?.focus(), 20);
    if (!panelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: -14, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 0.24, ease: 'power3.out' }
      );
    }, panelRef);
    return () => ctx.revert();
  }, [open]);

  const filtered = useMemo(() => {
    const q = normalizeText(query);
    if (!q) {
      // Personalização: prioriza etapas mais usadas recentemente pelo usuário
      const recentSet = new Set(recentTargets);
      return [...SMART_COMMANDS].sort((a, b) => {
        const aIdx = recentSet.has(a.id) ? recentTargets.indexOf(a.id) : 99;
        const bIdx = recentSet.has(b.id) ? recentTargets.indexOf(b.id) : 99;
        return aIdx - bIdx;
      });
    }
    const tokens = q.split(/\s+/).filter(Boolean);
    return SMART_COMMANDS.filter((item) => {
      const haystack = normalizeText(`${item.title} ${item.subtitle} ${item.keywords.join(' ')}`);
      return tokens.every((tok) => haystack.includes(tok));
    });
  }, [query, recentTargets]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Busca Semântica e Acessibilidade"
        className="w-full max-w-lg rounded-2xl bg-[#10141D] border border-slate-700/90 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Semantic Search Input */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-800">
          <Search className="w-4 h-4 text-orange-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered[0]) {
                onSelect(filtered[0].id);
                onClose();
              }
            }}
            placeholder="Busque por intenção: ex. 'luz hdri', 'uv', 'osso', 'baixar glb'..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Adaptive Accessibility Quick Controls */}
        <div className="px-4 py-2 bg-[#0D1017] border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <span className="text-slate-400 font-medium">Acessibilidade &amp; Interface Adaptativa</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleHighContrast}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                highContrast
                  ? 'bg-orange-500/20 border-orange-500 text-orange-200'
                  : 'bg-[#141923] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Contrast className="w-3 h-3" />
              <span>Alto Contraste</span>
            </button>
            <button
              type="button"
              onClick={onToggleLargeText}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-medium transition-colors cursor-pointer ${
                largeText
                  ? 'bg-orange-500/20 border-orange-500 text-orange-200'
                  : 'bg-[#141923] border-slate-800 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Type className="w-3 h-3" />
              <span>Fonte Ampliada</span>
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[52vh] overflow-y-auto p-2 flex flex-col gap-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma ferramenta encontrada para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              const isRecent = recentTargets.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-800/70 flex items-center gap-3 transition-colors cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#161B26] border border-slate-800 group-hover:border-orange-500/50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-100 truncate">{item.title}</span>
                      {isRecent && !query && (
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300">
                          Recente
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">{item.subtitle}</div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
