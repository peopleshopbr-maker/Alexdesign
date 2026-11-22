import JSZip from 'jszip';
import { GltfAuditReport } from './gltfVerifier';
import { generateBlender53ImportScript } from './blenderExport';

export async function exportProjectAssetZip(options: {
  assetName: string;
  glbBuffer: ArrayBuffer;
  report: GltfAuditReport;
  transparentPngBlob?: Blob | null;
}): Promise<Blob> {
  const { assetName, glbBuffer, report, transparentPngBlob } = options;
  const safeBase = assetName.replace(/[^a-zA-Z0-9_-]+/g, '_') || 'AlexDesign_Model';
  const zip = new JSZip();

  zip.file(`model/${safeBase}.glb`, glbBuffer);
  zip.file(`report/verification_report.json`, JSON.stringify(report, null, 2));
  zip.file(
    'scripts/import_blender_current.py',
    generateBlender53ImportScript({
      assetName: safeBase,
      glbFileName: `../model/${safeBase}.glb`,
      fps: 30,
      transparentBg: Boolean(transparentPngBlob),
    })
  );

  if (transparentPngBlob) {
    zip.file(`renders/${safeBase}_transparent.png`, transparentPngBlob);
  }

  zip.file(
    'README.txt',
    [
      'AlexDesign — Pacote de Ativo 3D, Rigging & Blender API Atual',
      `Modelo: ${safeBase}.glb`,
      `Malhas: ${report.meshes} | Triângulos: ${report.triangles} | Materiais: ${report.materials}`,
      `Normais: ${report.hasNormals ? 'Sim' : 'Não'} | Ossos: ${report.bones} | Animações: ${report.animations}`,
      `Status: ${report.status}`,
      '',
      'Documentação alvo: https://docs.blender.org/api/current/index.html',
      'Estrutura:',
      `  model/${safeBase}.glb`,
      '  scripts/import_blender_current.py (Slotted Actions, ChannelBags & Principled BSDF)',
      transparentPngBlob ? `  renders/${safeBase}_transparent.png` : '',
      '  report/verification_report.json',
    ]
      .filter(Boolean)
      .join('\n')
  );

  return zip.generateAsync({ type: 'blob' });
}
