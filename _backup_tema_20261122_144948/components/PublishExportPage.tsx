import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Box,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileSearch,
  ImageDown,
  Link2,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import {
  CodeExportObjectSpec,
  generateHtmlEmbedCode,
  generateNextJsSceneCode,
  generateReactThreeFiberCode,
  generateThreeJsSceneCode,
  generateVanillaJsEmbedCode,
} from '../utils/splineSceneObjects';
import { GltfAuditReport, auditGltfOrGlbFile } from '../utils/gltfVerifier';
import { generateBlender53ImportScript } from '../utils/blenderExport';
import { ParticleEmitterConfig } from '../utils/particleSystem';

type EmbedTab = 'blender53' | 'html' | 'vanilla' | 'react' | 'nextjs' | 'three';

const EMBED_TABS: { id: EmbedTab; label: string; filename: string }[] = [
  { id: 'blender53', label: 'Blender 5.3 bpy', filename: 'import_blender_5_3.py' },
  { id: 'html', label: 'Tag HTML', filename: 'embed.html' },
  { id: 'vanilla', label: 'Vanilla JS', filename: 'cena-vanilla.html' },
  { id: 'react', label: 'React', filename: 'CenaAlexDesign.tsx' },
  { id: 'nextjs', label: 'Next.js', filename: 'page.tsx' },
  { id: 'three', label: 'Three.js', filename: 'cena-three.js' },
];

interface PublishExportPageProps {
  assetName: string;
  objects: CodeExportObjectSpec[];
  auditReport: GltfAuditReport | null;
  toneMapping?: string;
  variables?: Record<string, string | number | boolean>;
  emitters?: ParticleEmitterConfig[];
  ikEnabled?: boolean;
  onRunSceneAudit: () => void;
  onExternalAuditReport: (report: GltfAuditReport) => void;
  onBakeIkPhysics: () => void;
  onExportGlb: () => void;
  onExportGltf: () => void;
  onExportFbx: () => void;
  onExportZip: () => void;
  onRenderTransparentPng: () => void;
  onCopyPublicLink: () => void;
  onRestoreDefaultScene: () => void;
  onOpenViewport: () => void;
}

export const PublishExportPage: React.FC<PublishExportPageProps> = ({
  assetName,
  objects,
  auditReport,
  toneMapping = 'agx',
  variables = {},
  emitters = [],
  ikEnabled = true,
  onRunSceneAudit,
  onExternalAuditReport,
  onBakeIkPhysics,
  onExportGlb,
  onExportGltf,
  onExportFbx,
  onExportZip,
  onRenderTransparentPng,
  onCopyPublicLink,
  onRestoreDefaultScene,
  onOpenViewport,
}) => {
  const [embedTab, setEmbedTab] = useState<EmbedTab>('blender53');
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const auditFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onRunSceneAudit();
  }, [onRunSceneAudit]);

  const glbName = `${assetName}.glb`;
  const blenderScript = generateBlender53ImportScript({
    assetName,
    glbFileName: glbName,
    fps: 30,
    toneMapping,
    variables,
    emitters,
    ikEnabled,
  });
  const code =
    embedTab === 'blender53'
      ? blenderScript
      : embedTab === 'html'
      ? generateHtmlEmbedCode(glbName, '#0d1017')
      : embedTab === 'vanilla'
      ? generateVanillaJsEmbedCode(objects, glbName, '#0d1017')
      : embedTab === 'react'
      ? generateReactThreeFiberCode(objects, '#0d1017')
      : embedTab === 'nextjs'
      ? generateNextJsSceneCode(objects, glbName, '#0d1017')
      : generateThreeJsSceneCode(objects, glbName, '#0d1017');

  const activeMeta = EMBED_TABS.find((t) => t.id === embedTab) ?? EMBED_TABS[0];

  const handleDownloadBlenderScript = () => {
    const blob = new Blob([blenderScript], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assetName}_blender_5_3.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore clipboard fallback
    }
  };

  const handleCopyShareLink = () => {
    onCopyPublicLink();
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  };

  const handleDownloadCode = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeMeta.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAuditJson = () => {
    if (!auditReport) return;
    const blob = new Blob([JSON.stringify(auditReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${assetName}_audit.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[1440px] mx-auto p-3.5 sm:p-4 space-y-4">
      {/* Header Summary */}
      <div className="rounded-xl bg-[#141923] border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-base font-bold text-white">
            Exportar Blender 5.3 (bpy), .FBX, .GLB, PNG Transparente & Link Interativo
          </h1>
          <p className="text-xs text-slate-400">
            Exporte criações 100% compatíveis com docs.blender.org/api/current (Collections, KinematicConstraint, Principled BSDF, IDProperty, ParticleSettings e RigidBodyObject).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBakeIkPhysics}
            title="Assar poses IK e física em keyframes puros antes de exportar"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 border border-amber-500/50 hover:bg-amber-600/30 text-xs font-semibold text-amber-200 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bake Animação & Física</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600/20 border border-sky-500/50 hover:bg-sky-600/30 text-xs font-semibold text-sky-200 cursor-pointer whitespace-nowrap"
          >
            {linkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
            <span>{linkCopied ? 'Link Copiado!' : 'Copiar Link Público'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenViewport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
          >
            <Box className="w-3.5 h-3.5 text-orange-400" />
            <span>Estúdio 3D</span>
          </button>
        </div>
      </div>

      {/* Downloads & Scene Restore Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <button
          type="button"
          onClick={onExportZip}
          className="p-4 rounded-xl bg-[#141923] border border-orange-500/40 hover:border-orange-500 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-orange-500/40 flex items-center justify-center shrink-0">
            <Archive className="w-4 h-4 text-orange-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Pacote Blender (.ZIP)</div>
            <div className="text-[11px] text-slate-400 truncate">GLB + Script bpy 5.3 + Auditoria</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onExportGlb}
          className="p-4 rounded-xl bg-[#141923] border border-slate-800 hover:border-emerald-500/70 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-slate-800 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Exportar .GLB</div>
            <div className="text-[11px] text-slate-400 truncate">Binário glTF 2.0 + Extras bpy</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onExportFbx}
          className="p-4 rounded-xl bg-[#141923] border border-slate-800 hover:border-violet-500/70 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-slate-800 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-violet-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Exportar .FBX (7.4)</div>
            <div className="text-[11px] text-slate-400 truncate">Malhas, Skin & Animações</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onExportGltf}
          className="p-4 rounded-xl bg-[#141923] border border-slate-800 hover:border-sky-500/70 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-slate-800 flex items-center justify-center shrink-0">
            <Download className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Exportar .glTF</div>
            <div className="text-[11px] text-slate-400 truncate">JSON legível glTF 2.0</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onRenderTransparentPng}
          className="p-4 rounded-xl bg-[#141923] border border-emerald-500/40 hover:border-emerald-500 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-emerald-500/40 flex items-center justify-center shrink-0">
            <ImageDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">PNG Transparente</div>
            <div className="text-[11px] text-slate-400 truncate">Render WebGL RGBA Alpha</div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleDownloadBlenderScript}
          className="p-4 rounded-xl bg-[#141923] border border-slate-800 hover:border-amber-500/70 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-slate-800 flex items-center justify-center shrink-0">
            <FileCode2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Script Blender 5.3 (.py)</div>
            <div className="text-[11px] text-slate-400 truncate">Collections, IK, VFX & FCurves</div>
          </div>
        </button>

        <button
          type="button"
          onClick={handleCopyShareLink}
          className="p-4 rounded-xl bg-[#141923] border border-slate-800 hover:border-sky-500/70 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-slate-800 flex items-center justify-center shrink-0">
            <Link2 className="w-4 h-4 text-sky-400" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Link Interativo 3D</div>
            <div className="text-[11px] text-slate-400 truncate">Compartilhar cena via URL</div>
          </div>
        </button>

        <button
          type="button"
          onClick={onRestoreDefaultScene}
          className="p-4 rounded-xl bg-[#141923] border border-slate-800 hover:border-slate-600 text-left flex items-center gap-3 cursor-pointer transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-[#0D1017] border border-slate-800 flex items-center justify-center shrink-0">
            <RotateCcw className="w-4 h-4 text-slate-300" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white">Restaurar Cena Padrão</div>
            <div className="text-[11px] text-slate-400 truncate">Reiniciar modelo AlexDesign</div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: Interactive Blender Current API + Web Embed Code Studio */}
        <section className="lg:col-span-7 rounded-xl bg-[#141923] border border-slate-800 overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-orange-400" />
              <h2 className="text-sm font-semibold text-white">Blender API 5.3 (bpy) & Embed Web / iframe</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-100 cursor-pointer whitespace-nowrap"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado' : 'Copiar Código'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCode}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar {activeMeta.filename}</span>
              </button>
            </div>
          </div>

          <div className="px-4 py-2 bg-[#0F131B] border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {EMBED_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setEmbedTab(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  embedTab === t.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4 bg-[#0B0E14] max-h-[440px] overflow-auto">
            <pre className="text-xs font-mono text-slate-200 leading-relaxed whitespace-pre">
              <code>{code}</code>
            </pre>
          </div>
        </section>

        {/* Right: Technical GLB/glTF Audit */}
        <section className="lg:col-span-5 rounded-xl bg-[#141923] border border-slate-800 p-4 space-y-4 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileSearch className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">Auditoria Técnica GLB / glTF</h2>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                ref={auditFileRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setAuditError(null);
                  try {
                    const rep = await auditGltfOrGlbFile(f);
                    onExternalAuditReport(rep);
                  } catch (err) {
                    setAuditError(err instanceof Error ? err.message : 'Erro ao auditar arquivo.');
                  }
                }}
              />
              <button
                type="button"
                onClick={() => auditFileRef.current?.click()}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>Auditar Arquivo</span>
              </button>
              <button
                type="button"
                onClick={onRunSceneAudit}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 text-white font-semibold cursor-pointer whitespace-nowrap"
              >
                <span>Atualizar Cena</span>
              </button>
            </div>
          </div>

          {auditError && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-700 text-red-200">
              {auditError}
            </div>
          )}

          {!auditReport ? (
            <div className="py-8 text-center text-slate-400">
              Clique em &ldquo;Atualizar Cena&rdquo; para auditar as malhas, normais, ossos e materiais atuais.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#0D1017] border border-slate-800 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">{auditReport.fileName}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">
                    {auditReport.generator} · {(auditReport.fileSizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 font-semibold shrink-0">
                  {auditReport.status === 'OK' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Aprovado</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400">Atenção ({auditReport.warnings.length})</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Malhas', val: auditReport.meshes },
                  { label: 'Triângulos', val: auditReport.triangles.toLocaleString() },
                  { label: 'Materiais', val: auditReport.materials },
                  { label: 'Ossos / Skins', val: `${auditReport.bones} (${auditReport.skins})` },
                  { label: 'Canal UV0', val: auditReport.hasUv0 ? 'Presente' : 'Ausente' },
                  { label: 'Normais', val: auditReport.hasNormals ? 'Presentes' : 'Ausentes' },
                ].map((s) => (
                  <div key={s.label} className="p-2.5 rounded-lg bg-[#0D1017] border border-slate-800">
                    <div className="text-[10px] text-slate-400">{s.label}</div>
                    <div className="text-xs font-semibold font-mono text-slate-100 tabular-nums mt-0.5">
                      {s.val}
                    </div>
                  </div>
                ))}
              </div>

              {auditReport.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-700/60 space-y-1">
                  <div className="font-semibold text-amber-300">Alertas de Pipeline</div>
                  {auditReport.warnings.map((w, i) => (
                    <div key={i} className="text-amber-200/90">
                      · {w}
                    </div>
                  ))}
                </div>
              )}

              {auditReport.meshDetails.length > 0 && (
                <div className="rounded-lg border border-slate-800 overflow-hidden">
                  <div className="px-3 py-2 bg-[#0F131B] flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-300">
                      Malhas ({auditReport.meshDetails.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadAuditJson}
                      className="text-[11px] text-emerald-400 hover:underline cursor-pointer"
                    >
                      Baixar JSON
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto">
                    {auditReport.meshDetails.map((m, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 flex items-center justify-between gap-2 bg-[#0D1017]"
                      >
                        <span className="text-slate-200 truncate">{m.name}</span>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums shrink-0">
                          {m.triangles.toLocaleString()} tris · {m.hasNormals ? 'Normais OK' : 'Sem normais'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
