import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSearch,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  CheckSeverity,
  FileVerificationReport,
  formatBytes,
  verifyStandaloneGltfFiles,
} from '../utils/gltfVerifier';

interface FileVerificationModalProps {
  report: FileVerificationReport;
  onClose: () => void;
  onReportChange: (next: FileVerificationReport) => void;
  onVerifyCurrentScene: () => void;
}

const STATUS_BADGE: Record<
  CheckSeverity,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  ok: {
    label: 'Aprovado',
    cls: 'bg-emerald-950/80 border-emerald-700/70 text-emerald-300',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
  },
  warn: {
    label: 'Com Avisos',
    cls: 'bg-amber-950/80 border-amber-700/70 text-amber-300',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
  },
  error: {
    label: 'Erro Crítico',
    cls: 'bg-red-950/80 border-red-700/70 text-red-300',
    icon: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
  },
};

export const FileVerificationModal: React.FC<FileVerificationModalProps> = ({
  report,
  onClose,
  onReportChange,
  onVerifyCurrentScene,
}) => {
  const verifyInputRef = useRef<HTMLInputElement>(null);
  const [isVerifyingExternal, setIsVerifyingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const badge = STATUS_BADGE[report.summaryStatus];

  const handleVerifyExternalFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsVerifyingExternal(true);
    setExternalError(null);
    try {
      const nextReport = await verifyStandaloneGltfFiles(files);
      onReportChange(nextReport);
    } catch (err) {
      setExternalError(
        err instanceof Error ? err.message : 'Não foi possível verificar o arquivo selecionado.'
      );
    } finally {
      setIsVerifyingExternal(false);
    }
  };

  const handleDownloadJsonReport = () => {
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = report.assetName.replace(/\.(glb|gltf)$/i, '');
    a.href = url;
    a.download = `${base}_verificacao.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Verificação de Arquivo GLB/glTF"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92dvh] sm:max-h-[88vh] rounded-t-2xl sm:rounded-xl bg-[#111622] border border-slate-700/90 shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-700 mx-auto mt-2.5 mb-0.5 shrink-0" />
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-[#141926]">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <FileSearch className="w-5 h-5 text-orange-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">Verificação de Arquivo 3D</h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-semibold ${badge.cls}`}
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Ativo inspecionado: <span className="text-slate-200 font-medium">{report.assetName}</span> ·{' '}
                <span className="tabular-nums">{report.checkedAt}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            <input
              ref={verifyInputRef}
              type="file"
              accept=".glb,.gltf,.bin,.png,.jpg,.jpeg,.webp"
              multiple
              className="hidden"
              onChange={(e) => {
                handleVerifyExternalFiles(e.target.files);
                e.target.value = '';
              }}
            />

            <button
              type="button"
              disabled={isVerifyingExternal}
              onClick={() => verifyInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>{isVerifyingExternal ? 'Analisando...' : 'Verificar Outro'}</span>
            </button>

            <button
              type="button"
              onClick={onVerifyCurrentScene}
              className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cena Atual
            </button>

            <button
              type="button"
              onClick={handleDownloadJsonReport}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-lg bg-[#0D1017] border border-slate-700 hover:border-slate-500 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>JSON</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar verificação"
              className="min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 pb-safe flex flex-col gap-5">
          {externalError && (
            <div className="rounded-lg bg-red-950/80 border border-red-700/70 px-3.5 py-2.5 text-xs text-red-200">
              {externalError}
            </div>
          )}

          {/* Top Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 px-3 py-2.5">
              <div className="text-[11px] text-slate-400">Formato</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {report.container ? `${report.container.format} v${report.container.gltfVersion}` : 'Cena WebGL'}
              </div>
            </div>
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 px-3 py-2.5">
              <div className="text-[11px] text-slate-400">Tamanho</div>
              <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                {report.container ? formatBytes(report.container.fileSizeBytes) : 'Em memória'}
              </div>
            </div>
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 px-3 py-2.5">
              <div className="text-[11px] text-slate-400">Malhas</div>
              <div className="text-sm font-semibold text-white tabular-nums mt-0.5">{report.totalMeshes}</div>
            </div>
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 px-3 py-2.5">
              <div className="text-[11px] text-slate-400">Triângulos</div>
              <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                {report.totalTriangles.toLocaleString('pt-BR')}
              </div>
            </div>
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 px-3 py-2.5">
              <div className="text-[11px] text-slate-400">Materiais PBR</div>
              <div className="text-sm font-semibold text-white tabular-nums mt-0.5">{report.totalMaterials}</div>
            </div>
            <div className="rounded-lg bg-[#0D1017] border border-slate-800 px-3 py-2.5">
              <div className="text-[11px] text-slate-400">Dimensões (m)</div>
              <div className="text-xs font-mono font-semibold text-slate-200 tabular-nums mt-1">
                {report.boundsMeters.x} × {report.boundsMeters.y} × {report.boundsMeters.z}
              </div>
            </div>
          </div>

          {/* Pipeline Checks */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Diagnóstico de Integridade & Pipeline PBR
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {report.checks.map((chk) => {
                const icon =
                  chk.severity === 'ok' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : chk.severity === 'warn' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  );
                return (
                  <div
                    key={chk.id}
                    className="rounded-lg bg-[#0D1017] border border-slate-800 px-3.5 py-2.5 flex items-start gap-2.5"
                  >
                    {icon}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-100">{chk.label}</div>
                      <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{chk.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Mesh Breakdown */}
          {report.meshes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Auditoria por Malha ({report.meshes.length})
              </h3>
              <div className="overflow-x-auto rounded-lg border border-slate-800 bg-[#0D1017]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141926] text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-3 py-2 font-medium">Malha</th>
                      <th className="px-3 py-2 font-medium text-right">Vértices</th>
                      <th className="px-3 py-2 font-medium text-right">Triângulos</th>
                      <th className="px-3 py-2 font-medium text-center">UV0</th>
                      <th className="px-3 py-2 font-medium text-center">UV2</th>
                      <th className="px-3 py-2 font-medium text-center">Normais</th>
                      <th className="px-3 py-2 font-medium text-right">Rig</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {report.meshes.map((m, idx) => (
                      <tr key={`${m.name}-${idx}`} className="hover:bg-slate-800/30">
                        <td className="px-3 py-2 font-mono text-slate-200">{m.name}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">
                          {m.vertices.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">
                          {m.triangles.toLocaleString('pt-BR')}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {!m.hasUv0 ? (
                            <span className="text-amber-400 font-medium">Ausente</span>
                          ) : m.uvOutOfBounds ? (
                            <span className="text-amber-300 font-medium">&gt;[0,1]</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">OK</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-400">
                          {m.hasUv2 ? 'OK' : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {m.hasNormals ? (
                            <span className="text-emerald-400">OK</span>
                          ) : (
                            <span className="text-amber-400">Ausente</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-slate-300">
                          {m.isSkinned ? `${m.boneCount} ossos` : 'Estática'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Materials & Animations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Materiais & Canais PBR ({report.materials.length})
              </h3>
              <div className="rounded-lg border border-slate-800 bg-[#0D1017] divide-y divide-slate-800/70">
                {report.materials.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-slate-500">Nenhum material detectado.</div>
                ) : (
                  report.materials.map((mat, idx) => (
                    <div key={`${mat.name}-${idx}`} className="px-3 py-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-semibold text-slate-200 truncate">{mat.name}</span>
                        <span className="text-[11px] text-slate-400 shrink-0">{mat.type}</span>
                      </div>
                      <div className="mt-1 text-slate-400 flex flex-wrap gap-x-3 gap-y-1">
                        {mat.roughness !== null && (
                          <span className="tabular-nums">Rugosidade: {mat.roughness}</span>
                        )}
                        {mat.metalness !== null && (
                          <span className="tabular-nums">Metálico: {mat.metalness}</span>
                        )}
                        <span>
                          Mapas: {mat.channels.length > 0 ? mat.channels.join(', ') : 'Apenas valores escalares'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Clipes de Animação ({report.animations.length})
              </h3>
              <div className="rounded-lg border border-slate-800 bg-[#0D1017] divide-y divide-slate-800/70">
                {report.animations.length === 0 ? (
                  <div className="px-3 py-2.5 text-xs text-slate-500">
                    Nenhum clipe glTF embutido neste arquivo.
                  </div>
                ) : (
                  report.animations.map((anim, idx) => (
                    <div key={`${anim.name}-${idx}`} className="px-3 py-2.5 text-xs flex items-center justify-between">
                      <span className="font-mono text-slate-200">{anim.name}</span>
                      <span className="text-slate-400 tabular-nums">
                        {anim.durationSec}s · {anim.tracksCount} trilhas
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
