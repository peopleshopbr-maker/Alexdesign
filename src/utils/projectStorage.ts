import { StudioConfig } from '../types/studioConfig';
import { HdriEnvironmentId, StudioLightSpec, ToneMappingPreset } from './studioLighting';

export interface SavedStudioProject {
  version: 1;
  savedAt: number;
  assetName: string;
  sceneGlb: ArrayBuffer;
  config: StudioConfig;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  cameraLensMm: number;
  hdriId: HdriEnvironmentId;
  envIntensity: number;
  envRotationDeg: number;
  exposure: number;
  toneMapping: ToneMappingPreset;
  studioLights: StudioLightSpec[];
}

const DB_NAME = 'alexdesign_studio_db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';
const ACTIVE_KEY = 'active_project';

function openProjectDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível neste navegador'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Erro ao abrir IndexedDB'));
  });
}

export async function saveStudioProject(snapshot: SavedStudioProject): Promise<void> {
  const db = await openProjectDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(snapshot, ACTIVE_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Falha ao salvar projeto no navegador'));
    };
  });
}

export async function loadSavedStudioProject(): Promise<SavedStudioProject | null> {
  try {
    const db = await openProjectDb();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(ACTIVE_KEY);
      req.onsuccess = () => {
        db.close();
        const res = req.result as SavedStudioProject | undefined;
        if (res && res.sceneGlb && res.sceneGlb.byteLength >= 12) {
          resolve(res);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });
  } catch {
    return null;
  }
}

export async function clearSavedStudioProject(): Promise<void> {
  try {
    const db = await openProjectDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(ACTIVE_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    });
  } catch {
    // Ignore storage cleanup errors
  }
}
