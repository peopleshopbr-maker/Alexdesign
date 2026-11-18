import {
  Bone,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Download,
  Film,
  Layers,
  Play,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  SHADER_PRESETS,
  WGSL_PARTICLE_COMPUTE,
  WGSL_PARTICLE_RENDER,
} from '../graphics/shaders';
import type {
  BenchmarkReport,
  GpuHardwareReport,
  RenderSettings,
  ShaderCompileResult,
} from '../types/graphics';

interface StudioDrawerProps {
  open: boolean;
  activeTab: 'glsl' | 'wgsl' | 'benchmark' | 'hardware';
  onTabChange: (tab: 'glsl' | 'wgsl' | 'benchmark' | 'hardware') => void;
  onClose: () => void;
  settings: RenderSettings;
  onUpdateSettings: (patch: Partial<RenderSettings>) => void;
  loadedModelName?: string | null;
  liveRenderActive: boolean;
  transparentPng: boolean;
  exportingFramesLabel: string | null;
  onToggleLiveRender: () => void;
  onToggleTransparentPng: () => void;
  onCaptureFrame: (transparentOverride?: boolean) => void;
  onExportFramesZip: (step?: number, transparentOverride?: boolean) => void;
  onInsertRiggedHumanoid: () => void;
  onResetToPbrFromShader: () => void;
  vertexCode: string;
  fragmentCode: string;
  onVertexChange: (code: string) => void;
  onFragmentChange: (code: string) => void;
  onCompileGlsl: (vs: string, fs: string) => ShaderCompileResult;
  compileResult: ShaderCompileResult | null;
  hardwareReport: GpuHardwareReport | null;
  onRefreshHardware: () => void;
  benchmarkRunning: boolean;
  benchmarkStageLabel: string;
  benchmarkReport: BenchmarkReport | null;
  onRunBenchmark: () => void;
}

const PRESET_SWATCHES: Record<string, { badge: string; desc: string }> = {
  harmonic: {
    badge: 'from-blue-500 to-amber-400',
    desc: 'Energia líquida pulsante com reflexo azul e âmbar.',
  },
  hologram: {
    badge: 'from-cyan-400 to-sky-600',
    desc: 'Contorno neon ciano com linhas de varredura holográfica.',
  },
  topo: {
    badge: 'from-teal-400 to-orange-500',
    desc: 'Mapa de calor em relevo com linhas de contorno luminosas.',
  },
  grid: {
    badge: 'from-sky-400 to-indigo-500',
    desc: 'Grade tecnológica luminosa acompanhando a malha 3D.',
  },
};

export function StudioDrawer({
  open,
  activeTab,
  onTabChange,
  onClose,
  settings,
  onUpdateSettings,
  loadedModelName,
  liveRenderActive,
  transparentPng,
  exportingFramesLabel,
  onToggleLiveRender,
  onToggleTransparentPng,
  onCaptureFrame,
  onExportFramesZip,
  onInsertRiggedHumanoid,
  onResetToPbrFromShader,
  vertexCode,
  fragmentCode,
  onVertexChange,
  onFragmentChange,
  onCompileGlsl,
  compileResult,
  hardwareReport,
  onRefreshHardware,
  benchmarkRunning,
  benchmarkStageLabel,
  benchmarkReport,
  onRunBenchmark,
}: StudioDrawerProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAdvancedCode, setShowAdvancedCode] = useState(false);
  const [frameStep, setFrameStep] = useState<1 | 2 | 4>(1);
  const glslFileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleLoadGlslFile = async (file: File) => {
    const content = await file.text();
    if (content.includes('gl_Position')) {
      onVertexChange(content);
    } else {
      onFragmentChange(content);
    }
  };

  const handleExportGlsl = () => {
    const bundle = `// === VERTEX SHADER ===\n${vertexCode}\n\n// === FRAGMENT SHADER ===\n${fragmentCode}\n`;
    const blob = new Blob([bundle], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vertice_custom_shader.glsl';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBenchmarkJson = () => {
    if (!benchmarkReport) return;
    const blob = new Blob([JSON.stringify(benchmarkReport, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vertice_benchmark_gpu.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isWidePanel =
    (activeTab === 'glsl' && showAdvancedCode) ||
    activeTab === 'wgsl' ||
    activeTab === 'benchmark';

  return (
    <aside
      aria-label="Painel visual de efeitos, render e GPU"
      className={`fixed top-16 right-4 bottom-20 z-30 max-w-[calc(100vw-2rem)] bg-[#0e131e]/96 border border-white/14 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
        isWidePanel ? 'w-[620px]' : 'w-[412px]'
      }`}
    >
      {/* Cabeçalho compacto sem bloquear o personagem */}
      <div className="px-3.5 py-3 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div
          role="tablist"
          aria-label="Abas visuais e de hardware"
          className="grid grid-cols-4 gap-1 p-1 bg-[#080b11] rounded-xl border border-white/8 flex-1 min-w-0"
        >
          {(
            [
              { id: 'glsl', label: 'Efeitos' },
              { id: 'wgsl', label: 'WebGPU' },
              { id: 'benchmark', label: 'Desempenho' },
              { id: 'hardware', label: 'Placa GPU' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => onTabChange(t.id)}
              className={`h-7 px-1.5 text-[11px] font-medium rounded-lg whitespace-nowrap cursor-pointer flex items-center justify-center truncate ${
                activeTab === t.id
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/45 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Conteúdo */}
      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3.5">
        {activeTab === 'glsl' && (
          <>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">
                  Efeitos Visuais ao Vivo no Personagem
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  O personagem continua visível e interativo à esquerda enquanto você testa os visuais.
                </p>
              </div>
            </div>

            {/* Ações rápidas: Render ao Vivo & Inserir Personagem */}
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                aria-pressed={liveRenderActive}
                onClick={onToggleLiveRender}
                className={`h-9 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-2 cursor-pointer ${
                  liveRenderActive
                    ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 border-emerald-300'
                    : 'bg-sky-400 hover:bg-sky-300 text-slate-950 border-transparent'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {liveRenderActive
                    ? 'Render ao Vivo Ativo (Luz + Bloom + Sombra)'
                    : 'Ativar Render ao Vivo na Tela'}
                </span>
              </button>

              {!loadedModelName && (
                <button
                  type="button"
                  onClick={onInsertRiggedHumanoid}
                  className="h-8 px-3 text-xs font-medium rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bone className="w-3.5 h-3.5" />
                  <span>Inserir Personagem 3D para Visualizar</span>
                </button>
              )}
            </div>

            {/* Cartões Visuais Simples */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">
                  Escolha o Estilo Visual
                </span>
                {loadedModelName && (
                  <span className="text-[10px] text-emerald-300 truncate max-w-[160px]">
                    Em: {loadedModelName}
                  </span>
                )}
              </div>

              <button
                type="button"
                aria-pressed={settings.sceneMode !== 'shader'}
                onClick={onResetToPbrFromShader}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer ${
                  settings.sceneMode !== 'shader'
                    ? 'bg-sky-500/15 border-sky-400/50 text-white'
                    : 'bg-[#090c13] border-white/10 text-slate-300 hover:bg-[#121826]'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-500 to-slate-200 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white">Normal (PBR Realista)</div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Materiais originais do personagem com luz e sombra reais.
                  </div>
                </div>
              </button>

              {SHADER_PRESETS.map((preset) => {
                const isActive =
                  settings.sceneMode === 'shader' &&
                  vertexCode === preset.vertexShader &&
                  fragmentCode === preset.fragmentShader;
                const meta = PRESET_SWATCHES[preset.id] ?? {
                  badge: 'from-sky-400 to-blue-600',
                  desc: preset.description,
                };
                return (
                  <button
                    key={preset.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      onVertexChange(preset.vertexShader);
                      onFragmentChange(preset.fragmentShader);
                      onCompileGlsl(preset.vertexShader, preset.fragmentShader);
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center gap-3 cursor-pointer ${
                      isActive
                        ? 'bg-sky-500/20 border-sky-400/55 text-white shadow-sm'
                        : 'bg-[#090c13] border-white/10 text-slate-300 hover:bg-[#121826]'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${meta.badge} shrink-0`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-white truncate">
                          {preset.name}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-semibold text-sky-300 shrink-0">
                            Ativo
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{meta.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Ajustes Visuais Diretos */}
            <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-3">
              <span className="text-[11px] font-semibold text-slate-200">
                Ajuste Visual em Tempo Real
              </span>

              <label className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Pulso / Ondulação (0 = forma intacta)</span>
                  <span className="font-mono tabular-nums text-sky-300">
                    {settings.turbulence.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.5}
                  step={0.05}
                  value={settings.turbulence}
                  onChange={(e) => onUpdateSettings({ turbulence: Number(e.target.value) })}
                  className="studio-slider w-full"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Escala do Padrão</span>
                  <span className="font-mono tabular-nums text-sky-300">
                    {settings.frequency.toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={4}
                  step={0.1}
                  value={settings.frequency}
                  onChange={(e) => onUpdateSettings({ frequency: Number(e.target.value) })}
                  className="studio-slider w-full"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Velocidade do Efeito</span>
                  <span className="font-mono tabular-nums text-sky-300">
                    {settings.speed.toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={2.5}
                  step={0.1}
                  value={settings.speed}
                  onChange={(e) => onUpdateSettings({ speed: Number(e.target.value) })}
                  className="studio-slider w-full"
                />
              </label>

              <label className="flex flex-col gap-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Brilho (Bloom)</span>
                  <span className="font-mono tabular-nums text-sky-300">
                    {settings.postProcessing.enabled
                      ? settings.postProcessing.bloomStrength.toFixed(2)
                      : 'OFF'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1.4}
                  step={0.05}
                  value={settings.postProcessing.enabled ? settings.postProcessing.bloomStrength : 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    onUpdateSettings({
                      postProcessing: {
                        ...settings.postProcessing,
                        enabled: val > 0.01,
                        bloomStrength: val,
                      },
                    });
                  }}
                  className="studio-slider w-full"
                />
              </label>
            </div>

            {/* Exportar PNG & Quadro a Quadro com Fundo Transparente */}
            <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>Exportar PNG &amp; Quadro a Quadro</span>
                </span>
                <button
                  type="button"
                  aria-pressed={transparentPng}
                  onClick={onToggleTransparentPng}
                  className={`h-6 px-2 text-[10px] font-medium rounded-md border flex items-center gap-1 cursor-pointer ${
                    transparentPng
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                      : 'bg-[#121826] text-slate-300 border-white/10'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>Fundo Transp.: {transparentPng ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onCaptureFrame(true)}
                  className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-sky-200 border border-sky-400/35 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Criar PNG Transp.</span>
                </button>
                <button
                  type="button"
                  onClick={() => onCaptureFrame(false)}
                  className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  <span>PNG com Fundo</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    { step: 1 as const, label: '60 quadros' },
                    { step: 2 as const, label: '30 quadros' },
                    { step: 4 as const, label: '15 quadros' },
                  ]
                ).map((opt) => (
                  <button
                    key={opt.step}
                    type="button"
                    onClick={() => setFrameStep(opt.step)}
                    className={`h-7 px-1.5 text-[10px] font-medium rounded-md border cursor-pointer ${
                      frameStep === opt.step
                        ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                        : 'bg-[#121826] text-slate-400 border-white/10 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={Boolean(exportingFramesLabel)}
                onClick={() => onExportFramesZip(frameStep, true)}
                className="h-9 w-full px-3 text-xs font-semibold rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Film className="w-3.5 h-3.5" />
                <span>
                  {exportingFramesLabel ?? 'Exportar Quadro a Quadro (.ZIP PNG Transp.)'}
                </span>
              </button>
            </div>

            {/* Modo Avançado Colapsável (Código GLSL) */}
            <div className="rounded-xl bg-[#090c13] border border-white/10 overflow-hidden">
              <button
                type="button"
                aria-expanded={showAdvancedCode}
                onClick={() => setShowAdvancedCode((p) => !p)}
                className="w-full h-9 px-3 text-[11px] font-medium text-slate-300 hover:text-white flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Modo Avançado (Editar Código GLSL)</span>
                </span>
                {showAdvancedCode ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {showAdvancedCode && (
                <div className="p-3 pt-2 border-t border-white/10 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <input
                      ref={glslFileInputRef}
                      type="file"
                      accept=".glsl,.vert,.frag,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleLoadGlslFile(f);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => glslFileInputRef.current?.click()}
                      className="h-7 px-2.5 text-[11px] font-medium rounded-lg bg-[#171e2e] hover:bg-[#1f283d] text-slate-200 border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Carregar .glsl</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportGlsl}
                      className="h-7 px-2.5 text-[11px] font-medium rounded-lg bg-[#171e2e] hover:bg-[#1f283d] text-slate-200 border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>Exportar .glsl</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onCompileGlsl(vertexCode, fragmentCode)}
                      className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center gap-1 cursor-pointer ml-auto"
                    >
                      <Play className="w-3 h-3" />
                      <span>Aplicar</span>
                    </button>
                  </div>

                  {compileResult && (
                    <div
                      className={`px-3 py-2 rounded-lg border text-[11px] font-mono ${
                        compileResult.ok
                          ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-200'
                          : 'bg-rose-500/10 border-rose-400/30 text-rose-200'
                      }`}
                    >
                      {compileResult.ok
                        ? `Sucesso: ${compileResult.message}`
                        : `Erro (${compileResult.stage}): ${compileResult.message}`}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="vs-editor" className="text-[11px] font-medium text-slate-300">
                        Vertex Shader
                      </label>
                      <textarea
                        id="vs-editor"
                        value={vertexCode}
                        onChange={(e) => onVertexChange(e.target.value)}
                        spellCheck={false}
                        className="h-48 w-full p-2.5 rounded-lg bg-[#070a10] border border-white/12 font-mono text-[11px] leading-relaxed text-sky-100 outline-none focus:border-sky-400 resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="fs-editor" className="text-[11px] font-medium text-slate-300">
                        Fragment Shader
                      </label>
                      <textarea
                        id="fs-editor"
                        value={fragmentCode}
                        onChange={(e) => onFragmentChange(e.target.value)}
                        spellCheck={false}
                        className="h-48 w-full p-2.5 rounded-lg bg-[#070a10] border border-white/12 font-mono text-[11px] leading-relaxed text-emerald-100 outline-none focus:border-sky-400 resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'wgsl' && (
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="font-display text-sm font-semibold text-white">
                Pipeline Compute &amp; Render WebGPU (WGSL)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Shaders WGSL nativos executados em Storage Buffers quando o backend WebGPU é ativado.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Compute Shader (@workgroup_size(64))
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('wgsl-c', WGSL_PARTICLE_COMPUTE)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'wgsl-c' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'wgsl-c' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="h-64 overflow-auto p-3 rounded-xl bg-[#070a10] border border-white/12 font-mono text-[11px] leading-relaxed text-sky-100">
                  {WGSL_PARTICLE_COMPUTE.trim()}
                </pre>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-300">
                    Render Shader (Instanced Billboards)
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText('wgsl-r', WGSL_PARTICLE_RENDER)}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'wgsl-r' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'wgsl-r' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="h-64 overflow-auto p-3 rounded-xl bg-[#070a10] border border-white/12 font-mono text-[11px] leading-relaxed text-amber-100">
                  {WGSL_PARTICLE_RENDER.trim()}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'benchmark' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">
                  Teste de Desempenho Automático
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Avalia PBR complexo, instâncias GPU e shaders ao vivo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {benchmarkReport && (
                  <button
                    type="button"
                    onClick={handleExportBenchmarkJson}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[#171e2e] hover:bg-[#1f283d] text-slate-200 border border-white/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exportar JSON</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={benchmarkRunning}
                  onClick={onRunBenchmark}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-50 text-slate-950 flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{benchmarkRunning ? benchmarkStageLabel : 'Executar Teste'}</span>
                </button>
              </div>
            </div>

            {benchmarkReport ? (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-[#080b11] border border-white/10">
                    <div className="text-xs text-slate-400">Média Global</div>
                    <div className="text-xl font-display font-bold text-white font-mono tabular-nums mt-1">
                      {benchmarkReport.overallScoreFps} FPS
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#080b11] border border-white/10">
                    <div className="text-xs text-slate-400">Pipeline</div>
                    <div className="text-xs font-semibold text-sky-300 mt-1.5 truncate">
                      {benchmarkReport.backendLabel}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#080b11] border border-white/10">
                    <div className="text-xs text-slate-400">Concluído</div>
                    <div className="text-xs font-mono tabular-nums text-slate-200 mt-1.5">
                      {benchmarkReport.completedAt}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-white/10">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#080b11] text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-2 px-3 font-medium">Estágio</th>
                        <th className="py-2 px-3 font-medium text-right">FPS Médio</th>
                        <th className="py-2 px-3 font-medium text-right">Frame Time</th>
                        <th className="py-2 px-3 font-medium text-right">Triângulos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8 font-mono tabular-nums">
                      {benchmarkReport.stages.map((st) => (
                        <tr key={st.stageName} className="bg-[#0b0f18]">
                          <td className="py-2 px-3 font-sans text-slate-200">{st.stageName}</td>
                          <td className="py-2 px-3 text-right text-sky-300">{st.avgFps}</td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {st.avgFrameMs} ms
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300">
                            {st.triangles.toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#080b11] border border-white/10 text-center text-xs text-slate-400">
                Clique em &quot;Executar Teste&quot; para medir o desempenho real da sua GPU.
              </div>
            )}
          </div>
        )}

        {activeTab === 'hardware' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-sm font-semibold text-white">
                  Placa de Vídeo (WebGPU &amp; WebGL2)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Diagnóstico direto do adaptador gráfico.
                </p>
              </div>
              <button
                type="button"
                onClick={onRefreshHardware}
                className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg bg-[#171e2e] hover:bg-[#1f283d] text-slate-200 border border-white/10 flex items-center gap-1 cursor-pointer shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Atualizar</span>
              </button>
            </div>

            {hardwareReport && (
              <div className="flex flex-col gap-3">
                <div className="p-3 rounded-xl bg-[#080b11] border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">WebGPU</span>
                    <span
                      className={`text-[11px] font-medium ${
                        hardwareReport.webgpu.adapterAvailable
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}
                    >
                      {hardwareReport.webgpu.adapterAvailable
                        ? 'Adaptador Ativo'
                        : 'Fallback WebGL2'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <dt className="text-slate-400">Descrição</dt>
                    <dd className="text-slate-200 text-right truncate">
                      {hardwareReport.webgpu.description}
                    </dd>
                    <dt className="text-slate-400">Storage Binding</dt>
                    <dd className="font-mono tabular-nums text-slate-200 text-right">
                      {hardwareReport.webgpu.maxStorageBufferBindingSize
                        ? `${Math.round(hardwareReport.webgpu.maxStorageBufferBindingSize / (1024 * 1024))} MB`
                        : 'N/A'}
                    </dd>
                  </dl>
                </div>

                <div className="p-3 rounded-xl bg-[#080b11] border border-white/10 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">WebGL2</span>
                    <span
                      className={`text-[11px] font-medium ${
                        hardwareReport.webgl2.isSoftware ? 'text-amber-300' : 'text-emerald-400'
                      }`}
                    >
                      {hardwareReport.webgl2.isSoftware
                        ? 'Rasterizador Software'
                        : 'Aceleração GPU'}
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-y-1.5 text-[11px]">
                    <dt className="text-slate-400">Renderer</dt>
                    <dd className="text-slate-200 text-right truncate" title={hardwareReport.webgl2.renderer}>
                      {hardwareReport.webgl2.renderer}
                    </dd>
                    <dt className="text-slate-400">Textura Máxima</dt>
                    <dd className="font-mono tabular-nums text-slate-200 text-right">
                      {hardwareReport.webgl2.maxTextureSize} px
                    </dd>
                    <dt className="text-slate-400">Anisotropia Máx</dt>
                    <dd className="font-mono tabular-nums text-slate-200 text-right">
                      {hardwareReport.webgl2.maxAnisotropy}x
                    </dd>
                  </dl>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
