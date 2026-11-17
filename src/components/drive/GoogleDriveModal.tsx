import React, { useEffect, useState, useCallback } from 'react';
import type { User } from 'firebase/auth';
import {
  Cloud,
  Download,
  LogOut,
  RefreshCw,
  Trash2,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import {
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from '../../services/auth/googleAuthService';
import {
  DriveFileItem,
  deleteDriveFile,
  downloadDriveFileAsFile,
  list3dDriveFiles,
  uploadOrUpdateDriveFile,
} from '../../services/drive/googleDriveService';

interface GoogleDriveModalProps {
  open: boolean;
  onClose: () => void;
  defaultFileName: string;
  onImportFileFromDrive: (file: File) => void;
  onExportCurrentGlbBlob: () => Promise<Blob | null>;
}

interface PendingConfirmAction {
  type: 'upload_new' | 'overwrite' | 'delete';
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  targetFile?: DriveFileItem;
  uploadName?: string;
}

function formatFileSize(sizeStr?: string): string {
  if (!sizeStr) return '';
  const bytes = Number(sizeStr);
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  open,
  onClose,
  defaultFileName,
  onImportFileFromDrive,
  onExportCurrentGlbBlob,
}) => {
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState(defaultFileName);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);

  useEffect(() => {
    const clean = defaultFileName.replace(/\.(glb|gltf)$/i, '') + '.glb';
    setUploadFileName(clean);
  }, [defaultFileName]);

  const fetchFiles = useCallback(async (overrideToken?: string) => {
    const token = overrideToken ?? (await getAccessToken());
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      const list = await list3dDriveFiles(token);
      setFiles(list);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao listar arquivos do Google Drive.');
    } finally {
      setIsLoadingFiles(false);
    }
  }, []);

  useEffect(() => {
    const unsub = initAuth(
      (signedInUser, token) => {
        setUser(signedInUser);
        setNeedsAuth(false);
        if (open) {
          void fetchFiles(token);
        }
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
        setFiles([]);
      }
    );
    return () => unsub();
  }, [open, fetchFiles]);

  useEffect(() => {
    if (open && !needsAuth) {
      void fetchFiles();
    }
  }, [open, needsAuth, fetchFiles]);

  if (!open) return null;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setNeedsAuth(false);
      await fetchFiles(res.accessToken);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Não foi possível autenticar com o Google.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setFiles([]);
    setStatusMsg(null);
  };

  const handleImport = async (file: DriveFileItem) => {
    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setBusyAction(`download:${file.id}`);
    setErrorMsg(null);
    try {
      const downloaded = await downloadDriveFileAsFile(token, file);
      onImportFileFromDrive(downloaded);
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao importar arquivo do Drive.');
    } finally {
      setBusyAction(null);
    }
  };

  const requestUploadConfirmation = () => {
    const trimmed = uploadFileName.trim() || 'AlexDesign_Scene.glb';
    const finalName = trimmed.toLowerCase().endsWith('.glb') ? trimmed : `${trimmed}.glb`;
    const existing = files.find((f) => f.name.toLowerCase() === finalName.toLowerCase());

    if (existing) {
      setPendingConfirm({
        type: 'overwrite',
        title: 'Substituir arquivo no Google Drive?',
        description: `O arquivo "${existing.name}" já existe no seu Google Drive. Deseja sobrescrever o conteúdo dele com a cena 3D atual?`,
        confirmLabel: 'Sobrescrever no Drive',
        targetFile: existing,
        uploadName: finalName,
      });
    } else {
      setPendingConfirm({
        type: 'upload_new',
        title: 'Salvar cena 3D no Google Drive?',
        description: `Será enviado o arquivo "${finalName}" contendo o modelo 3D atual para o seu Google Drive.`,
        confirmLabel: 'Enviar para o Drive',
        uploadName: finalName,
      });
    }
  };

  const requestDeleteConfirmation = (file: DriveFileItem) => {
    setPendingConfirm({
      type: 'delete',
      title: 'Excluir arquivo do Google Drive?',
      description: `Tem certeza que deseja excluir permanentemente "${file.name}" do seu Google Drive? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir permanentemente',
      danger: true,
      targetFile: file,
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    const action = pendingConfirm;
    setPendingConfirm(null);

    const token = await getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }

    setErrorMsg(null);
    setStatusMsg(null);

    if (action.type === 'delete' && action.targetFile) {
      setBusyAction(`delete:${action.targetFile.id}`);
      try {
        await deleteDriveFile(token, action.targetFile.id);
        setStatusMsg(`Arquivo "${action.targetFile.name}" excluído do Google Drive.`);
        await fetchFiles(token);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao excluir arquivo.');
      } finally {
        setBusyAction(null);
      }
      return;
    }

    if ((action.type === 'upload_new' || action.type === 'overwrite') && action.uploadName) {
      setBusyAction('upload');
      try {
        const blob = await onExportCurrentGlbBlob();
        if (!blob) {
          throw new Error('Não foi possível gerar o arquivo .glb da cena atual.');
        }
        await uploadOrUpdateDriveFile(
          token,
          action.uploadName,
          blob,
          action.type === 'overwrite' ? action.targetFile?.id : undefined
        );
        setStatusMsg(`"${action.uploadName}" salvo com sucesso no Google Drive!`);
        await fetchFiles(token);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar arquivo para o Drive.');
      } finally {
        setBusyAction(null);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Google Drive — Projetos 3D"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-[#111622] border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Cloud className="w-5 h-5 text-sky-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">
                Google Drive — Projetos 3D
              </h2>
              <p className="text-[11px] text-slate-400 truncate">
                Importe modelos .glb/.gltf/.zip ou salve sua cena na nuvem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {needsAuth ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-sky-400" />
              </div>
              <div className="max-w-sm space-y-1">
                <h3 className="text-sm font-semibold text-white">Conecte sua conta Google</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Faça login com o Google para abrir seus arquivos 3D (.glb, .gltf, .zip) e salvar
                  backups diretamente no seu Google Drive.
                </p>
              </div>
              <button
                type="button"
                disabled={isLoggingIn}
                onClick={() => void handleLogin()}
                className="gsi-material-button"
              >
                <div className="gsi-material-button-state" />
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      />
                      <path fill="none" d="M0 0h48v48H0z" />
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">
                    {isLoggingIn ? 'Conectando...' : 'Sign in with Google'}
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <>
              {/* Account Bar */}
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0D1017] border border-slate-800 text-xs">
                <span className="text-slate-300 truncate">
                  Conectado como <strong className="text-white">{user?.email || user?.displayName}</strong>
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isLoadingFiles}
                    onClick={() => void fetchFiles()}
                    title="Atualizar lista"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-rose-600/80 text-slate-300 hover:text-white cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>

              {/* Save Current Scene to Drive */}
              <div className="p-3 rounded-xl bg-[#0D1017] border border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  Salvar cena 3D atual no Google Drive (.glb)
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    placeholder="NomeDoProjeto.glb"
                    className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-[#141923] border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    disabled={busyAction !== null}
                    onClick={requestUploadConfirmation}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold text-white cursor-pointer shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{busyAction === 'upload' ? 'Enviando...' : 'Salvar no Drive'}</span>
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg bg-red-950/90 border border-red-700/70 px-3 py-2 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              {statusMsg && (
                <div className="rounded-lg bg-emerald-950/90 border border-emerald-700/70 px-3 py-2 text-xs text-emerald-200">
                  {statusMsg}
                </div>
              )}

              {/* File List */}
              <div className="flex flex-col gap-1.5">
                <div className="text-[11px] font-medium text-slate-400">
                  Arquivos 3D no seu Google Drive ({files.length})
                </div>
                {isLoadingFiles ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Carregando arquivos do Google Drive...
                  </div>
                ) : files.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Nenhum arquivo .glb, .gltf ou .zip encontrado no seu Drive.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0D1017] border border-slate-800 hover:border-slate-700"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-slate-100 truncate">
                            {file.name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatFileSize(file.size)}
                            {file.modifiedTime
                              ? ` · ${new Date(file.modifiedTime).toLocaleDateString('pt-BR')}`
                              : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => void handleImport(file)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-orange-600/20 border border-orange-500/40 hover:bg-orange-600 text-orange-200 hover:text-white text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                          >
                            <Download className="w-3 h-3" />
                            <span>
                              {busyAction === `download:${file.id}` ? 'Baixando...' : 'Abrir'}
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={busyAction !== null}
                            onClick={() => requestDeleteConfirmation(file)}
                            title="Excluir do Google Drive"
                            className="p-1.5 rounded-md bg-rose-600/15 border border-rose-500/30 hover:bg-rose-600 text-rose-300 hover:text-white cursor-pointer disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Mandatory Explicit Confirmation Dialog for Mutating / Destructive Drive Actions */}
        {pendingConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-xl bg-[#161C2B] border border-slate-700 p-4 shadow-2xl flex flex-col gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className={`w-5 h-5 shrink-0 mt-0.5 ${
                    pendingConfirm.danger ? 'text-rose-400' : 'text-amber-400'
                  }`}
                />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">{pendingConfirm.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {pendingConfirm.description}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPendingConfirm(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void executeConfirmedAction()}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white cursor-pointer ${
                    pendingConfirm.danger
                      ? 'bg-rose-600 hover:bg-rose-500'
                      : 'bg-sky-600 hover:bg-sky-500'
                  }`}
                >
                  {pendingConfirm.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
