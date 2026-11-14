import JSZip from 'jszip';
import { AddonConfig, generateAddonFiles } from './blenderAddonTemplates';

export async function downloadAddonZip(config: AddonConfig): Promise<string> {
  const safeId = config.addonId.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'pbr_autopipeline';
  const files = generateAddonFiles(config);

  const zip = new JSZip();
  const rootFolder = zip.folder(safeId);
  if (!rootFolder) {
    throw new Error('Falha ao inicializar estrutura do pacote ZIP.');
  }

  for (const file of files) {
    rootFolder.file(file.filename, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const zipName = `${safeId}_blender_${config.blenderTarget === '5.3_EXT' ? '5_3' : '3_5_to_5_3'}.zip`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = zipName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  return zipName;
}
