import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowRight,
  BookOpen,
  Bone,
  Box,
  Code2,
  Eye,
  Image as ImageIcon,
  Paintbrush,
  Search,
  Shapes,
  Sliders,
  Sun,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { ViewportStageKey } from './Viewport3D';

export type SmartCommandTarget =
  | 'viewport'
  | 'rigging'
  | 'lighting'
  | 'studio_notes'
  | 'guide'
  | 'export'
  | 'html3d'
  | 'reference'
  | ViewportStageKey;

interface CommandItem {
  id: SmartCommandTarget;
  title: string;
  subtitle: string;
  keywords: string[];
  icon: React.ReactNode;
}

const COMMAND_ITEMS: CommandItem[] = [
  {
    id: 'stage1',
    title: 'Importar Modelo 3D (GLB / glTF / OBJ / STL / ZIP)',
    subtitle: 'Carregar malha ou cena externa no estúdio',
    keywords: ['importar', 'glb', 'gltf', 'obj', 'stl', 'zip', 'arquivo'],
    icon: <Upload className="w-4 h-4 text-sky-400" />,
  },
  {
    id: 'viewport',
    title: 'Estúdio 3D (Viewport Principal)',
    subtitle: 'Modelagem, gizmos Q/W/E/R, pintura e câmera ao vivo',
    keywords: ['viewport', 'estudio', '3d', 'camera'],
    icon: <Box className="w-4 h-4 text-orange-400" />,
  },
  {
    id: 'stage5',
    title: 'Adicionar Primitivas, Vetores 3D & Templates',
    subtitle: 'Cubo, esfera, nó 3D, estrela, coração, templates',
    keywords: ['primitiva', 'objeto', 'formas', 'vetor', 'cubo', 'esfera', 'template'],
    icon: <Shapes className="w-4 h-4 text-purple-400" />,
  },
  {
    id: 'html3d',
    title: 'HTML â†’ 3D (Criar Painel Web 3D PBR)',
    subtitle: 'Converter código HTML em placa 3D exportável no .GLB',
    keywords: ['html', '3d', 'ui', 'placa', 'painel', 'card', 'web', 'texto'],
    icon: <Code2 className="w-4 h-4 text-orange-400" />,
  },
  {
    id: 'reference',
    title: 'Importar Imagem de Referência (Frente / Lado / Topo)',
    subtitle: 'Plano guia semi-transparente para modelagem e rigging',
    keywords: ['referencia', 'imagem', 'blueprint', 'trace', 'guia', 'foto'],
    icon: <ImageIcon className="w-4 h-4 text-sky-400" />,
  },
  {
    id: 'stage6',
    title: 'Operações Booleanas CSG, Física & Eventos',
    subtitle: 'União, subtração, interseção, gravidade e interações web',
    keywords: ['csg', 'booleano', 'uniao', 'subtrair', 'fisica', 'gravidade', 'eventos'],
    icon: <Box className="w-4 h-4 text-cyan-400" />,
  },
  {
    id: 'stage3',
    title: 'Pintura 3D, Shaders Reativos & Weight Paint',
    subtitle: 'Pincel de textura, mapa de pesos e shaders Fresnel/Dissolve/Holograma',
    keywords: ['pintar', 'pintura', 'brush', 'cor', 'material', 'textura', 'shader', 'fresnel', 'weight'],
    icon: <Paintbrush className="w-4 h-4 text-pink-400" />,
  },
  {
    id: 'rigging',
    title: 'Rig & Anim (Auto-Rig, IK/FK, Timeline & Motion Lab)',
    subtitle: 'Marcadores Mixamo, IK mãos/pés, Dope Sheet, 84 clipes e blendshapes',
    keywords: ['rig', 'rigging', 'ossos', 'armature', 'skin', 'esqueleto', 'animacao', 'chest_open', 'actionforge', 'ik', 'motion'],
    icon: <Bone className="w-4 h-4 text-orange-400" />,
  },
  {
    id: 'lighting',
    title: 'Luz & HDRI, Pós-Processamento & Render PNG 4K',
    subtitle: 'Ambientes HDRI, Bloom, DOF, Motion Blur e Tone Mapping AgX / ACES',
    keywords: ['hdri', 'luz', 'render', 'png', 'aces', 'agx', 'sombra', '4k', 'bloom', 'dof'],
    icon: <Sun className="w-4 h-4 text-yellow-400" />,
  },
  {
    id: 'studio_notes',
    title: 'Variáveis, Vínculos Web & Custom Properties (IDProperty)',
    subtitle: 'Mouse/Scroll/Clique ligados a Shaders/VFX + notas de revisão',
    keywords: ['variaveis', 'dados', 'notas', 'comentarios', 'revisao', 'idproperty', 'vfx', 'particulas'],
    icon: <Sliders className="w-4 h-4 text-sky-400" />,
  },
  {
    id: 'guide',
    title: 'Fluxo de Trabalho 3D Unificado (Passo a Passo)',
    subtitle: 'Atalhos diretos para cada etapa de produção na cena',
    keywords: ['fluxo', 'guia', 'pipeline', 'etapas'],
    icon: <BookOpen className="w-4 h-4 text-emerald-400" />,
  },
  {
    id: 'export',
    title: 'Auditoria GLB, Blender 5.3 bpy & Exportação (.GLB / .FBX / .ZIP)',
    subtitle: 'Auditoria completa, script Blender 5.3, embed HTML/React/Next/Three e link público',
    keywords: ['exportar', 'publicar', 'codigo', 'html', 'react', 'next', 'three', 'glb', 'fbx', 'zip', 'blender', 'auditoria'],
    icon: <Archive className="w-4 h-4 text-teal-400" />,
  },
];

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

export const SmartCommandPalette: React.FC<SmartCommandPaletteProps> = ({
  open,
  onClose,
  onSelect,
  highContrast,
  onToggleHighContrast,
  largeText,
  onToggleLargeText,
  recentTargets,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      const recentSet = new Set(recentTargets);
      const recent = recentTargets
        .map((id) => COMMAND_ITEMS.find((c) => c.id === id))
        .filter((x): x is CommandItem => Boolean(x));
      const rest = COMMAND_ITEMS.filter((c) => !recentSet.has(c.id));
      return [...recent, ...rest];
    }
    return COMMAND_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [query, recentTargets]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F5F1EA]/70 flex items-start justify-center pt-16 px-4"
      onClick={onClose}
      role="dialog"
      aria-label="Busca de páginas, ferramentas e acessibilidade"
    >
      <div
        className="w-full max-w-xl rounded-xl bg-[#141923] border border-slate-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#231F1D]/15">
          <Search className="w-4 h-4 text-orange-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar página ou ferramenta (ex: Rig, chest_open, HDRI, Código, Exportar)..."
            className="flex-1 bg-transparent text-sm text-[#231F1D] placeholder-slate-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar busca"
            className="w-7 h-7 rounded-md hover:bg-[#FAF8F5] text-[#635B54] hover:text-[#231F1D] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/70">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-[#635B54]">
              Nenhuma ferramenta encontrada para &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-[#FAF8F5]/70 transition-colors cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 flex items-center justify-center shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-[#231F1D] truncate">{item.title}</div>
                  <div className="text-[11px] text-[#635B54] truncate">{item.subtitle}</div>
                </div>
                {recentTargets.includes(item.id) && !query && (
                  <span className="text-[10px] font-mono text-orange-400 shrink-0">Recente</span>
                )}
                <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 bg-[#0F131B] border-t border-[#231F1D]/15 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleHighContrast}
              aria-pressed={highContrast}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer ${
                highContrast
                  ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Alto Contraste</span>
            </button>
            <button
              type="button"
              onClick={onToggleLargeText}
              aria-pressed={largeText}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border cursor-pointer ${
                largeText
                  ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Texto Ampliado</span>
            </button>
          </div>
          <span className="text-slate-500 font-mono">Ctrl+K: Buscar Â· Esc: Fechar</span>
        </div>
      </div>
    </div>
  );
};

