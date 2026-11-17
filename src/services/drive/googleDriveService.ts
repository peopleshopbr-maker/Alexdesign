export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
}

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

async function ensureOk(res: Response, fallbackMessage: string): Promise<void> {
  if (!res.ok) {
    let detail = '';
    try {
      const errJson = (await res.json()) as { error?: { message?: string } };
      detail = errJson.error?.message ? ` (${errJson.error.message})` : '';
    } catch {
      // Ignore JSON parse error
    }
    throw new Error(`${fallbackMessage}${detail}`);
  }
}

export async function list3dDriveFiles(accessToken: string): Promise<DriveFileItem[]> {
  const q = encodeURIComponent(
    "trashed = false and (name contains '.glb' or name contains '.gltf' or name contains '.zip')"
  );
  const fields = encodeURIComponent('files(id,name,mimeType,size,modifiedTime)');
  const url = `${DRIVE_API_BASE}/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc&pageSize=40`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await ensureOk(res, 'Falha ao listar arquivos do Google Drive');

  const data = (await res.json()) as { files?: DriveFileItem[] };
  return data.files ?? [];
}

export async function downloadDriveFileAsFile(
  accessToken: string,
  file: DriveFileItem
): Promise<File> {
  const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(file.id)}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await ensureOk(res, `Falha ao baixar "${file.name}" do Google Drive`);

  const blob = await res.blob();
  const mime =
    file.name.toLowerCase().endsWith('.glb')
      ? 'model/gltf-binary'
      : file.name.toLowerCase().endsWith('.gltf')
      ? 'model/gltf+json'
      : file.name.toLowerCase().endsWith('.zip')
      ? 'application/zip'
      : file.mimeType || 'application/octet-stream';

  return new File([blob], file.name, { type: mime });
}

export async function uploadOrUpdateDriveFile(
  accessToken: string,
  fileName: string,
  blob: Blob,
  existingFileId?: string
): Promise<DriveFileItem> {
  const boundary = 'alexdesign_drive_boundary_' + Math.random().toString(36).slice(2);
  const metadata = {
    name: fileName,
    mimeType: blob.type || 'model/gltf-binary',
  };

  const multipartBody = new Blob(
    [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify(metadata),
      `\r\n--${boundary}\r\nContent-Type: ${metadata.mimeType}\r\n\r\n`,
      blob,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const isUpdate = Boolean(existingFileId);
  const endpoint = isUpdate
    ? `${DRIVE_UPLOAD_BASE}/files/${encodeURIComponent(existingFileId!)}?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime`
    : `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime`;

  const res = await fetch(endpoint, {
    method: isUpdate ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  await ensureOk(
    res,
    isUpdate
      ? `Falha ao atualizar "${fileName}" no Google Drive`
      : `Falha ao enviar "${fileName}" para o Google Drive`
  );

  return (await res.json()) as DriveFileItem;
}

export async function deleteDriveFile(accessToken: string, fileId: string): Promise<void> {
  const url = `${DRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  await ensureOk(res, 'Falha ao excluir arquivo no Google Drive');
}
