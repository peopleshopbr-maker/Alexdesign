import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

export interface GltfExportOptions {
  /** true = .glb (ArrayBuffer), false = .gltf (objeto JSON). */
  binary: boolean;
  onlyVisible?: boolean;
  animations?: THREE.AnimationClip[];
}

export type GltfExportInput = THREE.Object3D | THREE.Object3D[];

/** Promessa única sobre GLTFExporter.parse, usada por todos os caminhos de export. */
export function exportGltf(
  input: GltfExportInput,
  { binary, onlyVisible = true, animations = [] }: GltfExportOptions
): Promise<ArrayBuffer | Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    try {
      new GLTFExporter().parse(
        input,
        (res) => resolve(res as ArrayBuffer | Record<string, unknown>),
        (err) => reject(err instanceof Error ? err : new Error(String(err))),
        { binary, onlyVisible, animations }
      );
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

export async function exportGlb(input: GltfExportInput, opts: Omit<GltfExportOptions, 'binary'> = {}): Promise<ArrayBuffer> {
  return (await exportGltf(input, { ...opts, binary: true })) as ArrayBuffer;
}

/** Aceita um único nó, vários, ou nenhum (grupo vazio) e devolve o formato esperado pelo exporter. */
export function toExportInput(targets: THREE.Object3D[], fallback: THREE.Object3D = new THREE.Group()): GltfExportInput {
  return targets.length === 1 ? targets[0] : targets.length > 1 ? targets : fallback;
}

export function resultToBlob(result: ArrayBuffer | Record<string, unknown>): Blob {
  return result instanceof ArrayBuffer
    ? new Blob([result], { type: 'model/gltf-binary' })
    : new Blob([JSON.stringify(result, null, 2)], { type: 'model/gltf+json' });
}
