import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Check, Copy, RotateCcw, RotateCw, Upload } from 'lucide-react';

type InspectorViewMode = 'shaded' | 'textured' | 'wireframe' | 'normals';

interface ModelStats {
  fileName: string;
  fileSizeLabel: string;
  faces: number;
  vertices: number;
  edges: number;
  objects: number;
  materials: number;
  sizeStr: string;
  surfaceArea: number;
  hasNormals: boolean;
  hasVertexColors: boolean;
  isRigged: boolean;
  morphTargets: number;
  animations: number;
  textures: number;
}

function computeModelStats(
  root: THREE.Object3D,
  fileName: string,
  fileSizeLabel: string,
  animationsCount = 0
): ModelStats {
  let faces = 0;
  let vertices = 0;
  let objects = 0;
  let hasNormals = false;
  let hasVertexColors = false;
  let isRigged = false;
  let morphTargets = 0;
  let surfaceArea = 0;
  const matSet = new Set<THREE.Material>();
  const texSet = new Set<THREE.Texture>();

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  root.updateMatrixWorld(true);
  root.traverse((obj) => {
    if ((obj as THREE.SkinnedMesh).isSkinnedMesh) isRigged = true;
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      objects++;
      const geo = mesh.geometry;
      if (geo) {
        const pos = geo.attributes.position;
        if (pos) {
          vertices += pos.count;
          if (geo.index) {
            const idx = geo.index;
            faces += Math.floor(idx.count / 3);
            for (let i = 0; i < idx.count; i += 3) {
              vA.fromBufferAttribute(pos, idx.getX(i));
              vB.fromBufferAttribute(pos, idx.getX(i + 1));
              vC.fromBufferAttribute(pos, idx.getX(i + 2));
              ab.subVectors(vB, vA);
              ac.subVectors(vC, vA);
              surfaceArea += ab.cross(ac).length() * 0.5;
            }
          } else {
            faces += Math.floor(pos.count / 3);
            for (let i = 0; i < pos.count; i += 3) {
              vA.fromBufferAttribute(pos, i);
              vB.fromBufferAttribute(pos, i + 1);
              vC.fromBufferAttribute(pos, i + 2);
              ab.subVectors(vB, vA);
              ac.subVectors(vC, vA);
              surfaceArea += ab.cross(ac).length() * 0.5;
            }
          }
        }
        if (geo.attributes.normal) hasNormals = true;
        if (geo.attributes.color) hasVertexColors = true;
        if (mesh.morphTargetDictionary) {
          morphTargets += Object.keys(mesh.morphTargetDictionary).length;
        }
      }
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        if (!m) continue;
        matSet.add(m);
        const std = m as THREE.MeshStandardMaterial;
        for (const t of [std.map, std.normalMap, std.roughnessMap, std.metalnessMap, std.aoMap, std.emissiveMap]) {
          if (t) texSet.add(t);
        }
      }
    }
  });

  const box = new THREE.Box3().setFromObject(root);
  const sz = new THREE.Vector3();
  box.getSize(sz);

  return {
    fileName,
    fileSizeLabel,
    faces,
    vertices,
    edges: Math.round(faces * 1.5),
    objects,
    materials: matSet.size,
    sizeStr: `${sz.x.toFixed(3)} × ${sz.y.toFixed(3)} × ${sz.z.toFixed(3)}`,
    surfaceArea,
    hasNormals,
    hasVertexColors,
    isRigged,
    morphTargets,
    animations: animationsCount,
    textures: texSet.size,
  };
}

interface ToolboxModelViewerProps {
  syncedModelFile?: File | null;
  onModelFileLoaded?: (file: File) => void;
  liveExposure?: number;
  liveAlbedoHex?: string | null;
  liveDiffuseUrl?: string | null;
  liveNormalUrl?: string | null;
}

export const ToolboxModelViewer: React.FC<ToolboxModelViewerProps> = ({
  syncedModelFile,
  onModelFileLoaded,
  liveExposure,
  liveAlbedoHex,
  liveDiffuseUrl,
  liveNormalUrl,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<InspectorViewMode>('textured');
  const [upAxis, setUpAxis] = useState<'Y' | 'Z'>('Y');
  const [spin, setSpin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<ModelStats>({
    fileName: 'alexdesign_sculpture.glb',
    fileSizeLabel: 'Modelo Demo',
    faces: 0,
    vertices: 0,
    edges: 0,
    objects: 0,
    materials: 0,
    sizeStr: '0 × 0 × 0',
    surfaceArea: 0,
    hasNormals: true,
    hasVertexColors: false,
    isRigged: false,
    morphTargets: 0,
    animations: 0,
    textures: 0,
  });

  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelRootRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const origMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const spinRef = useRef(spin);
  spinRef.current = spin;

  const applyViewModeToModel = (mode: InspectorViewMode) => {
    const root = modelRootRef.current;
    if (!root) return;
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        if (!origMaterialsRef.current.has(m)) {
          origMaterialsRef.current.set(m, m.material);
        }
        const orig = origMaterialsRef.current.get(m)!;
        if (mode === 'textured') {
          m.material = orig;
        } else if (mode === 'shaded') {
          m.material = new THREE.MeshStandardMaterial({
            color: 0xb8bec8,
            roughness: 0.55,
            metalness: 0.08,
          });
        } else if (mode === 'wireframe') {
          m.material = new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            wireframe: true,
          });
        } else if (mode === 'normals') {
          m.material = new THREE.MeshNormalMaterial();
        }
      }
    });
  };

  const centerAndFitModel = (group: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 1.6 / maxDim;
    group.scale.setScalar(scale);
    group.position.sub(center.multiplyScalar(scale));
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(1.6, 1.15, 2.25);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x161b26);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      40,
      Math.max(1, container.clientWidth) / Math.max(1, container.clientHeight),
      0.01,
      200
    );
    camera.position.set(1.6, 1.15, 2.25);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = liveExposure ?? 1.15;
    rendererRef.current = renderer;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    // Studio 3-point lighting
    scene.add(new THREE.HemisphereLight(0xeef4ff, 0x2a3140, 1.25));
    const key = new THREE.DirectionalLight(0xfff5e8, 2.0);
    key.position.set(3, 4, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    rim.position.set(-3, 2, -3);
    scene.add(rim);

    // Default demo sculpture (TorusKnot + Pedestal)
    const root = new THREE.Group();
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.48, 0.16, 140, 24),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.35, metalness: 0.25 })
    );
    knot.position.y = 0.15;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.6, 0.16, 36),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5, metalness: 0.35 })
    );
    base.position.y = -0.62;
    root.add(knot, base);
    scene.add(root);
    modelRootRef.current = root;
    centerAndFitModel(root);
    setStats(computeModelStats(root, 'alexdesign_sculpture.glb', 'Modelo Demo', 0));

    let rafId = 0;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      controls.autoRotate = spinRef.current;
      controls.autoRotateSpeed = 2.2;
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      if (!container) return;
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    applyViewModeToModel(viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (modelRootRef.current) {
      modelRootRef.current.rotation.x = upAxis === 'Z' ? -Math.PI / 2 : 0;
    }
  }, [upAxis]);

  useEffect(() => {
    if (syncedModelFile) {
      handleLoadModelFile(syncedModelFile, false);
    }
  }, [syncedModelFile]);

  useEffect(() => {
    if (rendererRef.current && typeof liveExposure === 'number') {
      rendererRef.current.toneMappingExposure = liveExposure;
    }
  }, [liveExposure]);

  useEffect(() => {
    if (!modelRootRef.current || !liveAlbedoHex) return;
    const col = new THREE.Color(liveAlbedoHex);
    modelRootRef.current.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m && m.color) {
          m.color.copy(col);
          m.needsUpdate = true;
        }
      }
    });
  }, [liveAlbedoHex]);

  useEffect(() => {
    if (!modelRootRef.current || !liveDiffuseUrl) return;
    const tex = new THREE.TextureLoader().load(liveDiffuseUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    modelRootRef.current.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m && 'map' in m) {
          m.map = tex;
          m.needsUpdate = true;
        }
      }
    });
  }, [liveDiffuseUrl]);

  useEffect(() => {
    if (!modelRootRef.current || !liveNormalUrl) return;
    const tex = new THREE.TextureLoader().load(liveNormalUrl);
    modelRootRef.current.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (m && 'normalMap' in m) {
          m.normalMap = tex;
          m.needsUpdate = true;
        }
      }
    });
  }, [liveNormalUrl]);

  const handleLoadModelFile = (file: File, notifyParent = true) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (notifyParent) {
      onModelFileLoaded?.(file);
    }
    const url = URL.createObjectURL(file);
    const sizeLabel =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
        : `${Math.max(1, Math.round(file.size / 1024))} KB`;

    const swapRoot = (loaded: THREE.Object3D, animCount = 0) => {
      if (modelRootRef.current) {
        scene.remove(modelRootRef.current);
      }
      origMaterialsRef.current.clear();
      const wrapper = new THREE.Group();
      wrapper.add(loaded);
      scene.add(wrapper);
      modelRootRef.current = wrapper;
      centerAndFitModel(wrapper);
      setStats(computeModelStats(wrapper, file.name, sizeLabel, animCount));
      applyViewModeToModel(viewMode);
      URL.revokeObjectURL(url);
    };

    if (file.name.toLowerCase().endsWith('.obj')) {
      new OBJLoader().load(url, (obj) => swapRoot(obj, 0));
    } else {
      new GLTFLoader().load(url, (gltf) => swapRoot(gltf.scene, gltf.animations.length));
    }
  };

  const handleCopyStats = () => {
    const txt = [
      `Model: ${stats.fileName} (${stats.fileSizeLabel})`,
      `Faces: ${stats.faces.toLocaleString()} | Vertices: ${stats.vertices.toLocaleString()} | Edges: ${stats.edges.toLocaleString()}`,
      `Objects: ${stats.objects} | Materials: ${stats.materials} | Textures: ${stats.textures}`,
      `Size: ${stats.sizeStr} | Surface Area: ${stats.surfaceArea.toFixed(4)} units²`,
    ].join('\n');
    void navigator.clipboard?.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-4">
      {/* Left Interactive 3D Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#161b26] min-h-[420px] lg:min-h-[480px]">
        <div ref={mountRef} className="w-full h-full min-h-[420px] lg:min-h-[480px]" />

        {/* Top-left file pill + upload */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-full bg-[#0D1119]/90 border border-slate-700/80 text-[11px] font-medium text-slate-200 backdrop-blur-sm">
            {stats.fileName} · {stats.fileSizeLabel}
          </div>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-[11px] font-semibold text-white cursor-pointer shadow">
            <Upload className="w-3.5 h-3.5" />
            <span>Abrir GLB / OBJ</span>
            <input
              type="file"
              accept=".glb,.gltf,.obj"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleLoadModelFile(f);
              }}
            />
          </label>
        </div>

        {/* Top-right Shading Mode Bar */}
        <div className="absolute top-3 right-3 flex items-center rounded-lg overflow-hidden bg-[#0D1119]/90 border border-slate-700/80 text-[11px] backdrop-blur-sm">
          {(
            [
              { id: 'shaded', label: 'Shaded' },
              { id: 'textured', label: 'Textured' },
              { id: 'wireframe', label: 'Wireframe' },
              { id: 'normals', label: 'Normals' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className={`px-2.5 py-1.5 font-medium cursor-pointer transition-colors ${
                viewMode === m.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Bottom-right Camera Controls */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 text-[11px]">
          <div className="flex rounded-lg overflow-hidden bg-[#0D1119]/90 border border-slate-700/80">
            <button
              type="button"
              onClick={() => setUpAxis('Y')}
              className={`px-2 py-1 cursor-pointer ${upAxis === 'Y' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
            >
              Y up
            </button>
            <button
              type="button"
              onClick={() => setUpAxis('Z')}
              className={`px-2 py-1 cursor-pointer ${upAxis === 'Z' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}
            >
              Z up
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSpin((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border cursor-pointer ${
              spin
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-[#0D1119]/90 border-slate-700/80 text-slate-200 hover:border-slate-500'
            }`}
          >
            <RotateCw className="w-3 h-3" />
            <span>Spin</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (cameraRef.current && controlsRef.current) {
                cameraRef.current.position.set(1.6, 1.15, 2.25);
                controlsRef.current.target.set(0, 0, 0);
                controlsRef.current.update();
              }
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0D1119]/90 border border-slate-700/80 text-slate-200 hover:border-slate-500 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="absolute bottom-2.5 left-3 text-[10px] text-slate-400 pointer-events-none hidden sm:block">
          Arraste para girar · Botão direito para mover · Scroll para zoom
        </div>
      </div>

      {/* Right Stats Inspector Panel */}
      <div className="rounded-xl bg-[#111520] border border-slate-800 p-4 flex flex-col gap-3.5 text-xs">
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.faces.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">faces (triângulos)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-mono">
              {stats.vertices.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400">vertices</div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[11px] pb-3 border-b border-slate-800">
          <div className="flex justify-between">
            <span className="text-slate-400">Edges</span>
            <span className="font-mono font-semibold text-slate-200">{stats.edges.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Objects</span>
            <span className="font-mono font-semibold text-slate-200">{stats.objects}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Materials</span>
            <span className="font-mono font-semibold text-slate-200">{stats.materials}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-[11px]">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Model</span>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Size</span>
            <span className="font-mono text-slate-200">{stats.sizeStr}</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Surface area</span>
            <span className="font-mono text-slate-200">{stats.surfaceArea.toFixed(4)} units²</span>
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-slate-400">Up axis</span>
            <span className="font-mono text-slate-200">{upAxis} up</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-1">
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stats.hasNormals ? 'bg-blue-600/25 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
            {stats.hasNormals ? 'Normals' : 'No normals'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stats.hasVertexColors ? 'bg-blue-600/25 text-blue-300' : 'bg-slate-800 text-slate-400'}`}>
            {stats.hasVertexColors ? 'Vertex colors' : 'No vertex colors'}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stats.isRigged ? 'bg-emerald-600/25 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
            {stats.isRigged ? 'Rigged' : 'Not rigged'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
            {stats.morphTargets} morph targets
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
            {stats.animations} animations
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-600/25 text-blue-300">
            {stats.textures} textures
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyStats}
          className="mt-auto w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#171C2A] border border-slate-700 hover:border-blue-500 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copiado!' : 'Copy stats'}</span>
        </button>
      </div>
    </div>
  );
};
