import React from 'react';
import { ArrowRight, Bone, Code2, Paintbrush, Sun, Upload } from 'lucide-react';

export type GuideActionTarget = 'import' | 'stage3' | 'lighting' | 'rigging' | 'export';

interface StepDef {
  step: string;
  title: string;
  description: string;
  actionLabel: string;
  target: GuideActionTarget;
  icon: React.ReactNode;
}

const STEPS: StepDef[] = [
  {
    step: '01',
    title: 'Importe seu Modelo 3D ou Crie na Web',
    description:
      'Carregue arquivos .glb, .gltf, .obj, .stl ou .zip, ou comece com primitivas vetoriais 3D e booleanas CSG direto no Viewport.',
    actionLabel: 'Importar Modelo 3D',
    target: 'import',
    icon: <Upload className="w-4 h-4 text-sky-400" />,
  },
  {
    step: '02',
    title: 'Pintura 3D & AparÃªncia na Malha',
    description:
      'Pinte diretamente na superfÃ­cie 3D e ajuste cor, roughness, metalness e emissÃ£o em tempo real no inspetor do EstÃºdio 3D.',
    actionLabel: 'Abrir Pintura & Cor',
    target: 'stage3',
    icon: <Paintbrush className="w-4 h-4 text-pink-400" />,
  },
  {
    step: '03',
    title: 'IluminaÃ§Ã£o HDRI & Render PNG 4K',
    description:
      'Configure ambientes HDRI, estÃºdio de 3 pontos, Tone Mapping ACES/AgX e gere capturas PNG transparentes atÃ© 4K.',
    actionLabel: 'Abrir Luz & Render',
    target: 'lighting',
    icon: <Sun className="w-4 h-4 text-amber-400" />,
  },
  {
    step: '04',
    title: 'Auto-Rigging por Marcadores & AnimaÃ§Ã£o WebGL',
    description:
      'Ajuste marcadores anatÃ´micos com simetria, misture clipes por mÃ¡scara de ossos (como chest_open) e edite a postura em tempo real.',
    actionLabel: 'Abrir Rig & AnimaÃ§Ã£o',
    target: 'rigging',
    icon: <Bone className="w-4 h-4 text-orange-400" />,
  },
  {
    step: '05',
    title: 'Incorpore no Seu Site ou Exporte GLB / Blender bpy',
    description:
      'Audite o ativo 3D, baixe .glb/.gltf/.zip com script Blender (API atual), PNG transparente ou copie cÃ³digo para HTML, React, Next.js e Three.js.',
    actionLabel: 'Publicar & Exportar',
    target: 'export',
    icon: <Code2 className="w-4 h-4 text-teal-400" />,
  },
];

interface PipelineGuideProps {
  onOpenViewport: () => void;
  onNavigateTarget?: (target: GuideActionTarget) => void;
}

export const PipelineGuide: React.FC<PipelineGuideProps> = ({
  onOpenViewport,
  onNavigateTarget,
}) => {
  return (
    <div className="max-w-[1440px] mx-auto p-3.5 sm:p-4 space-y-4">
      <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-[#231F1D]">
            Fluxo de Trabalho Web 3D â€” Do Modelo Ã  PublicaÃ§Ã£o
          </h1>
          <p className="text-xs text-[#635B54] mt-1">
            Todas as etapas permanecem sincronizadas ao vivo com o Viewport 3D acima.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenViewport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap shrink-0"
        >
          <span>Inspetor EstÃºdio 3D</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {STEPS.map((item) => (
          <div
            key={item.step}
            className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 flex flex-col justify-between gap-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 flex items-center justify-center">
                  {item.icon}
                </div>
                <span className="text-xs font-mono text-slate-500 tabular-nums">{item.step}</span>
              </div>
              <h2 className="text-sm font-semibold text-[#231F1D]">{item.title}</h2>
              <p className="text-xs text-[#635B54] leading-relaxed">{item.description}</p>
            </div>

            {onNavigateTarget && (
              <button
                type="button"
                onClick={() => onNavigateTarget(item.target)}
                className="inline-flex items-center justify-between px-3 py-2 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 hover:border-orange-500/70 text-xs font-medium text-slate-200 hover:text-[#231F1D] cursor-pointer transition-colors"
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 text-orange-400" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

