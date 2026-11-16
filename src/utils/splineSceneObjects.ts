import * as THREE from 'three';

export type PrimitiveShapeKind =
  | 'cube'
  | 'sphere'
  | 'torus'
  | 'cylinder'
  | 'cone'
  | 'capsule'
  | 'icosahedron'
  | 'torus_knot'
  | 'star'
  | 'hex'
  | 'ring_bevel'
  | 'heart';

export type SplineMaterialStyle = 'physical' | 'glass' | 'chrome' | 'clay' | 'neon' | 'ceramic';

export type SplineInteractionType = 'none' | 'spin' | 'float' | 'hover_pulse' | 'click_toggle';

export type SplineTemplateId = 'glass_neon' | 'product_showcase' | 'floating_shapes' | 'character_rig';

export type SplineToolMode =
  | 'orbit'
  | 'translate'
  | 'rotate'
  | 'scale'
  | 'paint'
  | 'assign_mat';

export interface SelectedObjectInspector {
  id: string;
  name: string;
  isPrimitive: boolean;
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  materialStyle: SplineMaterialStyle;
  color: string;
  roughness: number;
  metalness: number;
  transmission: number;
  emissiveIntensity: number;
  interaction: SplineInteractionType;
  physicsEnabled: boolean;
}

export interface PrimitiveCatalogItem {
  kind: PrimitiveShapeKind;
  label: string;
  defaultColor: string;
  category: 'primitive' | 'vector';
}

export const PRIMITIVE_CATALOG: PrimitiveCatalogItem[] = [
  { kind: 'cube', label: 'Cubo', defaultColor: '#38BDF8', category: 'primitive' },
  { kind: 'sphere', label: 'Esfera', defaultColor: '#F97316', category: 'primitive' },
  { kind: 'torus', label: 'Toro', defaultColor: '#A855F7', category: 'primitive' },
  { kind: 'cylinder', label: 'Cilindro', defaultColor: '#10B981', category: 'primitive' },
  { kind: 'cone', label: 'Cone', defaultColor: '#F43F5E', category: 'primitive' },
  { kind: 'capsule', label: 'Cápsula', defaultColor: '#FACC15', category: 'primitive' },
  { kind: 'icosahedron', label: 'Cristal', defaultColor: '#06B6D4', category: 'primitive' },
  { kind: 'torus_knot', label: 'Nó 3D', defaultColor: '#EC4899', category: 'primitive' },
  { kind: 'star', label: 'Estrela 3D', defaultColor: '#F59E0B', category: 'vector' },
  { kind: 'hex', label: 'Hexágono', defaultColor: '#6366F1', category: 'vector' },
  { kind: 'ring_bevel', label: 'Anel Vetor', defaultColor: '#14B8A6', category: 'vector' },
  { kind: 'heart', label: 'Coração 3D', defaultColor: '#FB7185', category: 'vector' },
];

export const SPLINE_TEMPLATES: { id: SplineTemplateId; label: string; subtitle: string }[] = [
  { id: 'glass_neon', label: 'Vidro & Neon', subtitle: 'Nó de vidro refrativo + esferas luminosas' },
  { id: 'product_showcase', label: 'Vitrine Produto', subtitle: 'Pedestal metálico + forma escultural' },
  { id: 'floating_shapes', label: 'Formas Flutuantes', subtitle: 'Composição interativa com levitação' },
  { id: 'character_rig', label: 'Estúdio Personagem', subtitle: 'Ativo articulado com rig e animações' },
];

export const SPLINE_MATERIAL_STYLES: { id: SplineMaterialStyle; label: string }[] = [
  { id: 'physical', label: 'Padrão PBR' },
  { id: 'glass', label: 'Vidro (Glass)' },
  { id: 'chrome', label: 'Cromado' },
  { id: 'clay', label: 'Argila Fosca' },
  { id: 'ceramic', label: 'Cerâmica' },
  { id: 'neon', label: 'Neon Glow' },
];

export const SPLINE_INTERACTION_OPTIONS: { id: SplineInteractionType; label: string }[] = [
  { id: 'none', label: 'Estático' },
  { id: 'spin', label: 'Girar Contínuo' },
  { id: 'float', label: 'Flutuar Suave' },
  { id: 'hover_pulse', label: 'Pulso no Hover' },
  { id: 'click_toggle', label: 'Alternar no Clique' },
];

function createStarShape(points = 5, outerR = 0.42, innerR = 0.19): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createPolygonShape(sides: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function createRingBevelShape(outerR = 0.4, innerR = 0.2): THREE.Shape {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, innerR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return shape;
}

function createHeartShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const s = 0.022;
  shape.moveTo(0, 5 * s);
  shape.bezierCurveTo(0, 5 * s, -2 * s, 12 * s, -10 * s, 12 * s);
  shape.bezierCurveTo(-18 * s, 12 * s, -18 * s, 1 * s, -18 * s, 1 * s);
  shape.bezierCurveTo(-18 * s, -7 * s, -10 * s, -13 * s, 0, -19 * s);
  shape.bezierCurveTo(10 * s, -13 * s, 18 * s, -7 * s, 18 * s, 1 * s);
  shape.bezierCurveTo(18 * s, 1 * s, 18 * s, 12 * s, 10 * s, 12 * s);
  shape.bezierCurveTo(2 * s, 12 * s, 0, 5 * s, 0, 5 * s);
  return shape;
}

export function createSplinePrimitiveGeometry(kind: PrimitiveShapeKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cube':
      return new THREE.BoxGeometry(0.65, 0.65, 0.65, 2, 2, 2);
    case 'sphere':
      return new THREE.SphereGeometry(0.38, 32, 22);
    case 'torus':
      return new THREE.TorusGeometry(0.34, 0.13, 20, 44);
    case 'cylinder':
      return new THREE.CylinderGeometry(0.28, 0.28, 0.72, 28);
    case 'cone':
      return new THREE.ConeGeometry(0.34, 0.74, 28);
    case 'capsule':
      return new THREE.CapsuleGeometry(0.22, 0.42, 12, 24);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(0.4, 0);
    case 'torus_knot':
      return new THREE.TorusKnotGeometry(0.28, 0.095, 96, 16);
    case 'star': {
      const geo = new THREE.ExtrudeGeometry(createStarShape(), {
        depth: 0.16,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 3,
      });
      geo.center();
      return geo;
    }
    case 'hex': {
      const geo = new THREE.ExtrudeGeometry(createPolygonShape(6, 0.38), {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.035,
        bevelSegments: 3,
      });
      geo.center();
      return geo;
    }
    case 'ring_bevel': {
      const geo = new THREE.ExtrudeGeometry(createRingBevelShape(), {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.04,
        bevelSize: 0.03,
        bevelSegments: 3,
        curveSegments: 32,
      });
      geo.center();
      return geo;
    }
    case 'heart': {
      const geo = new THREE.ExtrudeGeometry(createHeartShape(), {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.04,
        bevelSegments: 4,
      });
      geo.center();
      return geo;
    }
  }
}

function getStyleDefaults(style: SplineMaterialStyle): {
  roughness: number;
  metalness: number;
  transmission: number;
  emissiveIntensity: number;
  clearcoat: number;
  ior: number;
} {
  switch (style) {
    case 'glass':
      return { roughness: 0.08, metalness: 0.0, transmission: 0.9, emissiveIntensity: 0, clearcoat: 0.85, ior: 1.5 };
    case 'chrome':
      return { roughness: 0.08, metalness: 1.0, transmission: 0, emissiveIntensity: 0, clearcoat: 0.5, ior: 1.5 };
    case 'clay':
      return { roughness: 0.9, metalness: 0.0, transmission: 0, emissiveIntensity: 0, clearcoat: 0, ior: 1.4 };
    case 'ceramic':
      return { roughness: 0.16, metalness: 0.02, transmission: 0, emissiveIntensity: 0, clearcoat: 1.0, ior: 1.5 };
    case 'neon':
      return { roughness: 0.25, metalness: 0.1, transmission: 0, emissiveIntensity: 1.6, clearcoat: 0.2, ior: 1.45 };
    case 'physical':
    default:
      return { roughness: 0.35, metalness: 0.12, transmission: 0, emissiveIntensity: 0, clearcoat: 0.25, ior: 1.45 };
  }
}

export function applySplineStyleToPhysicalMaterial(
  mat: THREE.MeshPhysicalMaterial,
  style: SplineMaterialStyle,
  hexColor: string,
  overrides?: Partial<{
    roughness: number;
    metalness: number;
    transmission: number;
    emissiveIntensity: number;
  }>
) {
  const defs = getStyleDefaults(style);
  const color = new THREE.Color(hexColor);
  mat.color.copy(color);
  mat.roughness = overrides?.roughness ?? defs.roughness;
  mat.metalness = overrides?.metalness ?? defs.metalness;
  mat.transmission = overrides?.transmission ?? defs.transmission;
  mat.clearcoat = defs.clearcoat;
  mat.ior = defs.ior;
  mat.thickness = mat.transmission > 0.02 ? 0.85 : 0;
  mat.transparent = mat.transmission > 0.02;
  mat.opacity = 1;
  const emissiveVal = overrides?.emissiveIntensity ?? defs.emissiveIntensity;
  if (emissiveVal > 0.01) {
    mat.emissive.copy(color);
    mat.emissiveIntensity = emissiveVal;
  } else {
    mat.emissive.setHex(0x000000);
    mat.emissiveIntensity = 0;
  }
  mat.needsUpdate = true;
}

export interface CodeExportObjectSpec {
  name: string;
  kind: PrimitiveShapeKind | 'mesh';
  position: [number, number, number];
  rotationDeg: [number, number, number];
  scale: [number, number, number];
  color: string;
  roughness: number;
  metalness: number;
  transmission: number;
  emissiveIntensity: number;
  interaction: SplineInteractionType;
}

function geometryExprThree(kind: PrimitiveShapeKind | 'mesh'): string {
  switch (kind) {
    case 'cube':
      return 'new THREE.BoxGeometry(0.65, 0.65, 0.65)';
    case 'sphere':
      return 'new THREE.SphereGeometry(0.38, 32, 22)';
    case 'torus':
      return 'new THREE.TorusGeometry(0.34, 0.13, 20, 44)';
    case 'cylinder':
      return 'new THREE.CylinderGeometry(0.28, 0.28, 0.72, 28)';
    case 'cone':
      return 'new THREE.ConeGeometry(0.34, 0.74, 28)';
    case 'capsule':
      return 'new THREE.CapsuleGeometry(0.22, 0.42, 12, 24)';
    case 'icosahedron':
      return 'new THREE.IcosahedronGeometry(0.4, 0)';
    case 'torus_knot':
      return 'new THREE.TorusKnotGeometry(0.28, 0.095, 96, 16)';
    case 'star':
    case 'hex':
    case 'ring_bevel':
    case 'heart':
      return 'new THREE.OctahedronGeometry(0.42, 0)';
    default:
      return 'new THREE.BoxGeometry(0.65, 0.65, 0.65)';
  }
}

export function generateThreeJsSceneCode(
  objects: CodeExportObjectSpec[],
  assetName: string | null,
  bgHex: string
): string {
  const safeObjects =
    objects.length > 0
      ? objects
      : [
          {
            name: 'Objeto_Principal',
            kind: 'torus_knot' as const,
            position: [0, 0.9, 0] as [number, number, number],
            rotationDeg: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            color: '#F97316',
            roughness: 0.25,
            metalness: 0.2,
            transmission: 0,
            emissiveIntensity: 0,
            interaction: 'spin' as const,
          },
        ];

  const objectBlocks = safeObjects
    .map((o, idx) => {
      const varName = `mesh${idx + 1}`;
      const r = o.rotationDeg.map((d) => ((d * Math.PI) / 180).toFixed(3));
      const emissiveLine =
        o.emissiveIntensity > 0.01
          ? `\n  emissive: '${o.color}',\n  emissiveIntensity: ${o.emissiveIntensity.toFixed(2)},`
          : '';
      const transLine =
        o.transmission > 0.02
          ? `\n  transmission: ${o.transmission.toFixed(2)},\n  ior: 1.5,\n  thickness: 0.85,`
          : '';
      return `// ${o.name} (${o.interaction})
const ${varName} = new THREE.Mesh(
  ${geometryExprThree(o.kind)},
  new THREE.MeshPhysicalMaterial({
    color: '${o.color}',
    roughness: ${o.roughness.toFixed(2)},
    metalness: ${o.metalness.toFixed(2)},${transLine}${emissiveLine}
  })
);
${varName}.position.set(${o.position.map((v) => v.toFixed(3)).join(', ')});
${varName}.rotation.set(${r.join(', ')});
${varName}.scale.set(${o.scale.map((v) => v.toFixed(3)).join(', ')});
${varName}.userData.interaction = '${o.interaction}';
${varName}.userData.baseY = ${o.position[1].toFixed(3)};
scene.add(${varName});
interactiveMeshes.push(${varName});`;
    })
    .join('\n\n');

  const glbHint = assetName
    ? `\n// Para carregar o modelo GLB exportado (${assetName}):\n// new GLTFLoader().load('./${assetName}', (gltf) => scene.add(gltf.scene));\n`
    : '';

  return `import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color('${bgHex}');

const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(1.85, 1.45, 2.35);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.9, 0);

const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.3);
keyLight.position.set(2.6, 4.2, 2.8);
scene.add(keyLight, new THREE.AmbientLight(0xdbeafe, 0.8));

const interactiveMeshes = [];
${glbHint}
${objectBlocks}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  for (const m of interactiveMeshes) {
    if (m.userData.interaction === 'spin') m.rotation.y += 0.012;
    if (m.userData.interaction === 'float') m.position.y = m.userData.baseY + Math.sin(t * 2) * 0.12;
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();`;
}

export function generateReactThreeFiberCode(objects: CodeExportObjectSpec[], bgHex: string): string {
  const safeObjects =
    objects.length > 0
      ? objects
      : [
          {
            name: 'Objeto_Principal',
            kind: 'torus_knot' as const,
            position: [0, 0.9, 0] as [number, number, number],
            rotationDeg: [0, 0, 0] as [number, number, number],
            scale: [1, 1, 1] as [number, number, number],
            color: '#F97316',
            roughness: 0.25,
            metalness: 0.2,
            transmission: 0,
            emissiveIntensity: 0,
            interaction: 'spin' as const,
          },
        ];

  const meshesJsx = safeObjects
    .map((o) => {
      const geoTag =
        o.kind === 'sphere'
          ? '<sphereGeometry args={[0.38, 32, 22]} />'
          : o.kind === 'torus'
          ? '<torusGeometry args={[0.34, 0.13, 20, 44]} />'
          : o.kind === 'cylinder'
          ? '<cylinderGeometry args={[0.28, 0.28, 0.72, 28]} />'
          : o.kind === 'cone'
          ? '<coneGeometry args={[0.34, 0.74, 28]} />'
          : o.kind === 'torus_knot'
          ? '<torusKnotGeometry args={[0.28, 0.095, 96, 16]} />'
          : '<boxGeometry args={[0.65, 0.65, 0.65]} />';
      const rot = o.rotationDeg.map((d) => ((d * Math.PI) / 180).toFixed(3)).join(', ');
      return `      <mesh position={[${o.position.map((v) => v.toFixed(2)).join(', ')}]} rotation={[${rot}]} scale={[${o.scale.map((v) => v.toFixed(2)).join(', ')}]}>
        ${geoTag}
        <meshPhysicalMaterial color="${o.color}" roughness={${o.roughness.toFixed(2)}} metalness={${o.metalness.toFixed(2)}} transmission={${o.transmission.toFixed(2)}} />
      </mesh>`;
    })
    .join('\n');

  return `import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

export function CenaAlexDesign() {
  return (
    <Canvas camera={{ position: [1.85, 1.45, 2.35], fov: 40 }} style={{ background: '${bgHex}' }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[2.6, 4.2, 2.8]} intensity={2.3} />
      <Environment preset="studio" />
${meshesJsx}
      <OrbitControls target={[0, 0.9, 0]} />
    </Canvas>
  );
}`;
}
