import * as THREE from 'three';

export interface ObjectTransformSnapshot {
  uuid: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  colorHex?: number;
  roughness?: number;
  metalness?: number;
}

export interface HistoryCommand {
  label: string;
  before: ObjectTransformSnapshot[];
  after: ObjectTransformSnapshot[];
}

export function captureObjectSnapshot(obj: THREE.Object3D): ObjectTransformSnapshot {
  const snap: ObjectTransformSnapshot = {
    uuid: obj.uuid,
    position: [obj.position.x, obj.position.y, obj.position.z],
    rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
    scale: [obj.scale.x, obj.scale.y, obj.scale.z],
    visible: obj.visible,
  };
  if ((obj as THREE.Mesh).isMesh) {
    const mat = (obj as THREE.Mesh).material;
    if (mat instanceof THREE.MeshStandardMaterial) {
      snap.colorHex = mat.color.getHex();
      snap.roughness = mat.roughness;
      snap.metalness = mat.metalness;
    }
  }
  return snap;
}

export function applyObjectSnapshot(scene: THREE.Scene, snap: ObjectTransformSnapshot): boolean {
  const obj = scene.getObjectByProperty('uuid', snap.uuid);
  if (!obj) return false;
  obj.position.set(...snap.position);
  obj.rotation.set(...snap.rotation);
  obj.scale.set(...snap.scale);
  obj.visible = snap.visible;
  obj.updateMatrixWorld(true);

  if ((obj as THREE.Mesh).isMesh) {
    const mat = (obj as THREE.Mesh).material;
    if (mat instanceof THREE.MeshStandardMaterial) {
      if (snap.colorHex !== undefined) mat.color.setHex(snap.colorHex);
      if (snap.roughness !== undefined) mat.roughness = snap.roughness;
      if (snap.metalness !== undefined) mat.metalness = snap.metalness;
      mat.needsUpdate = true;
    }
  }
  return true;
}

export class SceneHistoryManager {
  private undoStack: HistoryCommand[] = [];
  private redoStack: HistoryCommand[] = [];
  private readonly maxEntries: number;

  constructor(maxEntries = 40) {
    this.maxEntries = maxEntries;
  }

  push(cmd: HistoryCommand): void {
    this.undoStack.push(cmd);
    if (this.undoStack.length > this.maxEntries) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(scene: THREE.Scene): string | null {
    const cmd = this.undoStack.pop();
    if (!cmd) return null;
    for (const snap of cmd.before) {
      applyObjectSnapshot(scene, snap);
    }
    this.redoStack.push(cmd);
    return cmd.label;
  }

  redo(scene: THREE.Scene): string | null {
    const cmd = this.redoStack.pop();
    if (!cmd) return null;
    for (const snap of cmd.after) {
      applyObjectSnapshot(scene, snap);
    }
    this.undoStack.push(cmd);
    return cmd.label;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}
