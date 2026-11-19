import * as THREE from 'three';
import JSZip from 'jszip';

export interface PngSequencePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  note: string;
}

export const PNG_SEQUENCE_PRESETS: PngSequencePreset[] = [
  { id: '512', label: '512 × 512 px', width: 512, height: 512, note: 'Elemento médio (Full HD)' },
  { id: '1080_sq', label: '1080 × 1080 px', width: 1080, height: 1080, note: 'Personagem quadrado (Full HD)' },
  { id: '1920_1080', label: '1920 × 1080 px (Full HD)', width: 1920, height: 1080, note: 'Cena inteira Full HD 16:9' },
  { id: '2048_sq', label: '2048 × 2048 px (4K)', width: 2048, height: 2048, note: 'Elemento 4K alta nitidez' },
  { id: '3840_2160', label: '3840 × 2160 px (4K UHD)', width: 3840, height: 2160, note: 'Cena inteira 4K 16:9' },
];

export interface PngSequenceExportOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  width: number;
  height: number;
  frameCount: number;
  fps: number;
  transparentBg: boolean;
  fileNamePrefix?: string;
  onStepFrame: (deltaSec: number, frameIndex: number) => void;
  onProgress?: (current: number, total: number) => void;
}

export async function exportTransparentPngSequenceZip(
  opts: PngSequenceExportOptions
): Promise<void> {
  const {
    renderer,
    scene,
    camera,
    width,
    height,
    frameCount,
    fps,
    transparentBg,
    fileNamePrefix = 'AlexDesign_Anim',
    onStepFrame,
    onProgress,
  } = opts;

  const zip = new JSZip();
  const folder = zip.folder(`${fileNamePrefix}_${width}x${height}_${fps}fps`) || zip;

  // Save current renderer & scene state
  const prevSize = new THREE.Vector2();
  renderer.getSize(prevSize);
  const prevPixelRatio = renderer.getPixelRatio();
  const prevClearColor = new THREE.Color();
  renderer.getClearColor(prevClearColor);
  const prevClearAlpha = renderer.getClearAlpha();
  const prevBg = scene.background;
  const prevAspect = camera.aspect;

  // Hide floor grid / helpers during transparent PNG capture so alpha edges are clean
  const hiddenHelpers: { obj: THREE.Object3D; prevVisible: boolean }[] = [];
  if (transparentBg) {
    scene.traverse((o) => {
      const n = o.name.toLowerCase();
      if (
        o.type === 'GridHelper' ||
        n.includes('grid') ||
        n.includes('floor') ||
        n.includes('ground') ||
        n.includes('__alexdesign_auto_uv_floor__') ||
        n.includes('__actionforge_rig_rings__')
      ) {
        hiddenHelpers.push({ obj: o, prevVisible: o.visible });
        o.visible = false;
      }
    });
    scene.background = null;
    renderer.setClearColor(0x000000, 0);
  }

  try {
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    const deltaSec = 1 / Math.max(12, fps);
    const total = Math.max(1, Math.min(240, Math.round(frameCount)));

    for (let i = 0; i < total; i++) {
      onStepFrame(deltaSec, i);
      renderer.render(scene, camera);

      const blob = await new Promise<Blob | null>((resolve) =>
        renderer.domElement.toBlob((b) => resolve(b), 'image/png')
      );
      if (blob) {
        const padded = String(i + 1).padStart(4, '0');
        folder.file(`frame_${padded}.png`, blob);
      }
      onProgress?.(i + 1, total);
      // Yield to browser UI thread so progress updates smoothly
      await new Promise((r) => setTimeout(r, 0));
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix}_${width}x${height}_${total}f_alpha.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } finally {
    // Restore renderer, camera, background & helpers
    hiddenHelpers.forEach(({ obj, prevVisible }) => {
      obj.visible = prevVisible;
    });
    scene.background = prevBg;
    renderer.setClearColor(prevClearColor, prevClearAlpha);
    renderer.setPixelRatio(prevPixelRatio);
    renderer.setSize(prevSize.x, prevSize.y, false);
    camera.aspect = prevAspect;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
}
