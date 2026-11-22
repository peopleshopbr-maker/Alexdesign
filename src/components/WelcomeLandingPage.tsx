import React, { useRef, useState } from 'react';
import {
  ArrowRight,
  Code2,
  FileUp,
  Layers,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface WelcomeLandingPageProps {
  onImportFiles: (files: File[]) => void;
  onLoadSampleRig: () => void;
  onOpenHtmlTo3d: () => void;
  onOpenFullStudio: () => void;
}

const SUPPORTED_FORMATS = ['.glb', '.gltf'];

export const WelcomeLandingPage: React.FC<WelcomeLandingPageProps> = ({
  onImportFiles,
  onLoadSampleRig,
  onOpenHtmlTo3d,
  onOpenFullStudio,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    onImportFiles(Array.from(fileList));
  };

  return (
    <section
      aria-label="PÃ¡gina Inicial AlexDesign"
      className="flex-1 min-h-0 overflow-y-auto bg-[#0B0E14] relative flex items-center justify-center p-4 sm:p-8"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(30,41,59,0.22) 1px, transparent 1px), linear-gradient(to bottom, rgba(30,41,59,0.22) 1px, transparent 1px)',
        backgroundSize: '36px 36px',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="w-full max-w-4xl mx-auto space-y-6 my-auto">
        {/* Hero Title & Identity Badge */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-[#141923] border border-[#231F1D]/15 shadow-lg mb-1">
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" aria-hidden="true">
              <path
                d="M12 3L4.5 20h3.2l1.6-3.8h5.4L16.3 20h3.2L12 3zm-1.4 10.2L12 9.6l1.4 3.6h-2.8z"
                fill="#f97316"
              />
            </svg>
          </div>
          <div>
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-orange-400/90">
              ALEXDESIGN 3D STUDIO UNIFICADO
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#231F1D]">
            Importar Modelo ou Rig
          </h1>
          <p className="max-w-xl mx-auto text-xs sm:text-sm text-[#635B54]">
            Solte um arquivo <span className="font-mono text-slate-200">.glb</span> ou{' '}
            <span className="font-mono text-slate-200">.gltf</span> com ou sem esqueleto para
            explorar a armature, ajustar materiais PBR, criar animaÃ§Ãµes com keyframes e exportar.
          </p>
        </div>

        {/* Main 2-Column Interactive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-[1.08fr_1fr] gap-4 items-stretch">
          {/* Left Drag & Drop Import Card */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center gap-4 transition-colors min-h-[280px] ${
              dragActive
                ? 'border-orange-500 bg-orange-500/10'
                : 'border-slate-700/80 bg-[#111622]/90 hover:border-slate-600'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-[#182030] border border-slate-700 flex items-center justify-center text-slate-200">
              <FileUp className="w-6 h-6 text-orange-400" />
            </div>

            <div className="space-y-1">
              <h2 className="text-sm sm:text-base font-semibold text-[#231F1D]">
                Arraste e solte seu modelo 3D
              </h2>
              <p className="text-xs text-[#635B54]">ou selecione arquivos do seu computador</p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {SUPPORTED_FORMATS.map((fmt) => (
                <span
                  key={fmt}
                  className="px-2 py-0.5 rounded bg-[#0B0E14] border border-[#231F1D]/15 font-mono text-[10px] text-slate-300"
                >
                  {fmt}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs shadow cursor-pointer transition-colors"
            >
              <FileUp className="w-4 h-4" />
              <span>Procurar arquivos</span>
            </button>
          </div>

          {/* Right Quick Action Cards */}
          <div className="flex flex-col gap-3">
            {/* Card 1: Sample Rig */}
            <button
              type="button"
              onClick={onLoadSampleRig}
              className="group text-left rounded-2xl bg-[#111622]/95 border border-[#231F1D]/15 hover:border-cyan-500/60 p-4 space-y-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#635B54]">
                  Sem arquivo
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#231F1D]">
                  Testar Rig de Exemplo
                </h3>
                <p className="text-[11px] text-[#635B54] mt-0.5 leading-relaxed">
                  Explore o humanoide procedural jÃ¡ rigado com esqueleto X-Ray, guias IK e
                  biblioteca de animaÃ§Ãµes.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 group-hover:translate-x-0.5 transition-transform">
                <span>Carregar Rig de Exemplo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Card 2: Create from HTML */}
            <button
              type="button"
              onClick={onOpenHtmlTo3d}
              className="group text-left rounded-2xl bg-[#111622]/95 border border-[#231F1D]/15 hover:border-orange-500/60 p-4 space-y-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-orange-300/80">
                  HTML â†’ 3D
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#231F1D]">
                  Criar painel de HTML â†’ 3D
                </h3>
                <p className="text-[11px] text-[#635B54] mt-0.5 leading-relaxed">
                  Converta interfaces e layouts HTML em painÃ©is 3D PBR para referenciar e posicionar
                  na cena.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300 group-hover:translate-x-0.5 transition-transform">
                <span>Abrir Conversor HTML</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Card 3: Full Unified Studio */}
            <button
              type="button"
              onClick={onOpenFullStudio}
              className="group text-left rounded-2xl bg-[#14172b]/95 border border-indigo-500/45 hover:border-indigo-400 p-4 space-y-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-300">
                  AlexDesign Suite
                </span>
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-[#231F1D] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Abrir EstÃºdio 3D Completo</span>
                </h3>
                <p className="text-[11px] text-slate-300/80 mt-0.5 leading-relaxed">
                  Entre direto no Viewport 3D com Blender 5.3, PBR Atlas, Motion Lab, MoGraph e
                  Spline 3D.
                </p>
              </div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-300 group-hover:translate-x-0.5 transition-transform">
                <span>Abrir workspace unificado</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

