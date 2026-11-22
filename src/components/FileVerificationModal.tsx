import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSearch, Upload, X } from 'lucide-react';
import { GltfAuditReport, auditGltfOrGlbFile } from '../utils/gltfVerifier';

interface FileVerificationModalProps {
  open: boolean;
  report: GltfAuditReport | null;
  onReportChange: (next: GltfAuditReport) => void;
  onVerifyCurrentScene: () => void;
  onClose: () => void;
}

export const FileVerificationModal: React.FC<FileVerificationModalProps> = ({
  open,
  report,
  onReportChange,
  onVerifyCurrentScene,
  onClose,
}) => {
  const verifyInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!open) return null;

  const handleVerifyExternalFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    try {
      const parsed = await auditGltfOrGlbFile(files[0]);
      onReportChange(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao auditar arquivo 3D.');
    }
  };

  const handleDownloadJsonReport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.fileName.replace(/\.[^.]+$/, '')}_audit.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-[#F5F1EA]/75 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-label="Auditoria e verificaÃ§Ã£o tÃ©cnica GLB/glTF"
    >
      <div
        className="w-full max-w-2xl rounded-xl bg-[#141923] border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[86vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-[#231F1D]/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-semibold text-[#231F1D]">VerificaÃ§Ã£o TÃ©cnica GLB / glTF</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              ref={verifyInputRef}
              type="file"
              accept=".glb,.gltf"
              className="hidden"
              onChange={(e) => {
                handleVerifyExternalFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => verifyInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F5] hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Auditar Arquivo</span>
            </button>
            <button
              type="button"
              onClick={onVerifyCurrentScene}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-600 hover:bg-orange-500 text-xs font-medium text-[#231F1D] cursor-pointer"
            >
              <span>Cena Atual</span>
            </button>
            {report && (
              <button
                type="button"
                onClick={handleDownloadJsonReport}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FAF8F5] hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>JSON</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              className="w-7 h-7 rounded-md hover:bg-[#FAF8F5] text-[#635B54] hover:text-[#231F1D] flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-700 text-red-200">
              {error}
            </div>
          )}

          {!report ? (
            <div className="py-10 text-center text-[#635B54]">
              Clique em &ldquo;Cena Atual&rdquo; ou envie um arquivo .glb/.gltf para auditar malhas, UVs, normais e animaÃ§Ãµes.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-[#0D1017] border border-[#231F1D]/15">
                <div>
                  <div className="text-sm font-semibold text-[#231F1D]">{report.fileName}</div>
                  <div className="text-[11px] text-[#635B54] font-mono">
                    Gerador: {report.generator} Â· {(report.fileSizeBytes / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 font-semibold">
                  {report.status === 'OK' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Aprovado</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-amber-400">AtenÃ§Ã£o ({report.warnings.length})</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Malhas', val: report.meshes },
                  { label: 'TriÃ¢ngulos', val: report.triangles.toLocaleString() },
                  { label: 'Materiais', val: report.materials },
                  { label: 'Texturas', val: report.textures },
                  { label: 'Ossos / Skins', val: `${report.bones} (${report.skins})` },
                  { label: 'AnimaÃ§Ãµes', val: report.animations },
                  { label: 'Canal UV0', val: report.hasUv0 ? 'Presente' : 'Ausente' },
                  { label: 'Normais', val: report.hasNormals ? 'Presentes' : 'Ausentes' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="p-2.5 rounded-lg bg-[#0D1017] border border-[#231F1D]/15"
                  >
                    <div className="text-[10px] text-[#635B54]">{stat.label}</div>
                    <div className="text-sm font-semibold font-mono text-[#231F1D] tabular-nums mt-0.5">
                      {stat.val}
                    </div>
                  </div>
                ))}
              </div>

              {report.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-700/60 space-y-1">
                  <div className="font-semibold text-amber-300">Alertas de Pipeline</div>
                  {report.warnings.map((w, i) => (
                    <div key={i} className="text-amber-200/90">
                      Â· {w}
                    </div>
                  ))}
                </div>
              )}

              {report.meshDetails.length > 0 && (
                <div className="rounded-lg border border-[#231F1D]/15 overflow-hidden">
                  <div className="px-3 py-2 bg-[#0F131B] text-[11px] font-semibold text-slate-300">
                    Detalhamento por Malha ({report.meshDetails.length})
                  </div>
                  <div className="divide-y divide-slate-800 max-h-52 overflow-y-auto">
                    {report.meshDetails.map((m, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 flex items-center justify-between gap-2 bg-[#0D1017]"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-slate-200 truncate">{m.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{m.materialName}</div>
                        </div>
                        <div className="text-[11px] font-mono text-slate-300 tabular-nums shrink-0">
                          {m.triangles.toLocaleString()} tris Â· {m.hasNormals ? 'Normais OK' : 'Sem normais'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

