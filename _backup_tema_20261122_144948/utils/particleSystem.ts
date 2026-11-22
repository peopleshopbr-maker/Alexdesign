import * as THREE from 'three';

export type ParticleSpritePreset = 'glow' | 'spark' | 'smoke' | 'star' | 'ring' | 'custom';

export interface ParticleEmitterConfig {
  id: string;
  name: string;
  enabled: boolean;
  position: [number, number, number];
  rate: number; // particles per second
  speed: number;
  gravity: number;
  lifetime: number; // seconds
  startSize: number;
  endSize: number;
  startColor: string;
  endColor: string;
  spritePreset: ParticleSpritePreset;
  customSpriteDataUrl?: string;
}

export const DEFAULT_PARTICLE_EMITTER: Omit<ParticleEmitterConfig, 'id' | 'name'> = {
  enabled: true,
  position: [0, 0.85, 0],
  rate: 45,
  speed: 1.4,
  gravity: -2.2,
  lifetime: 1.8,
  startSize: 0.14,
  endSize: 0.02,
  startColor: '#f97316',
  endColor: '#38bdf8',
  spritePreset: 'glow',
};

const spriteCache = new Map<string, THREE.Texture>();

export function buildParticleSpriteTexture(
  preset: ParticleSpritePreset,
  customDataUrl?: string
): THREE.Texture {
  if (customDataUrl) {
    const cached = spriteCache.get(customDataUrl);
    if (cached) return cached;
    const tex = new THREE.TextureLoader().load(customDataUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    spriteCache.set(customDataUrl, tex);
    return tex;
  }

  const key = `preset_${preset}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);

  if (preset === 'glow' || preset === 'smoke' || preset === 'custom') {
    const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, preset === 'smoke' ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,1)');
    grad.addColorStop(0.45, preset === 'smoke' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.55)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  } else if (preset === 'spark') {
    ctx.translate(32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (preset === 'ring') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(32, 32, 22, 0, Math.PI * 2);
    ctx.stroke();
  } else if (preset === 'star') {
    ctx.translate(32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? 28 : 8;
      const a = (i / 8) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  spriteCache.set(key, tex);
  return tex;
}

const MAX_PARTICLES_PER_EMITTER = 600;

export class ParticleEmitterInstance {
  public config: ParticleEmitterConfig;
  public readonly group: THREE.Group;
  public readonly points: THREE.Points;
  private readonly anchorMesh: THREE.Mesh;
  private readonly geometry: THREE.BufferGeometry;
  private readonly material: THREE.ShaderMaterial;

  private readonly positions = new Float32Array(MAX_PARTICLES_PER_EMITTER * 3);
  private readonly colors = new Float32Array(MAX_PARTICLES_PER_EMITTER * 3);
  private readonly sizes = new Float32Array(MAX_PARTICLES_PER_EMITTER);
  private readonly velocities = new Float32Array(MAX_PARTICLES_PER_EMITTER * 3);
  private readonly ages = new Float32Array(MAX_PARTICLES_PER_EMITTER);
  private readonly maxAges = new Float32Array(MAX_PARTICLES_PER_EMITTER);
  private spawnAccum = 0;
  private cursor = 0;

  private readonly cStart = new THREE.Color();
  private readonly cEnd = new THREE.Color();
  private readonly cMix = new THREE.Color();

  constructor(config: ParticleEmitterConfig) {
    this.config = { ...config };
    this.group = new THREE.Group();
    this.group.name = `Emissor_${config.name}`;
    this.group.position.set(...config.position);
    this.group.userData = {
      isParticleEmitter: true,
      emitterId: config.id,
    };

    // Subtle selectable gizmo sphere at emitter origin
    this.anchorMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.06, 0),
      new THREE.MeshBasicMaterial({
        color: '#fb923c',
        wireframe: true,
        transparent: true,
        opacity: 0.75,
      })
    );
    this.anchorMesh.name = `Emissor_${config.name}`;
    this.anchorMesh.userData = {
      isParticleEmitter: true,
      emitterId: config.id,
    };
    this.group.add(this.anchorMesh);

    this.geometry = new THREE.BufferGeometry();
    this.ages.fill(-1);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('pColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('pSize', new THREE.BufferAttribute(this.sizes, 1));

    const tex = buildParticleSpriteTexture(config.spritePreset, config.customSpriteDataUrl);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: tex },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        attribute vec3 pColor;
        attribute float pSize;
        varying vec3 vColor;
        uniform float uPixelRatio;
        void main() {
          vColor = pColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = max(0.0, pSize * uPixelRatio * (380.0 / max(0.2, -mvPosition.z)));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        varying vec3 vColor;
        void main() {
          vec4 texColor = texture2D(uMap, gl_PointCoord);
          if (texColor.a < 0.02) discard;
          gl_FragColor = vec4(vColor * texColor.rgb, texColor.a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: config.spritePreset === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.group.add(this.points);
  }

  public updateConfig(next: ParticleEmitterConfig): void {
    const texChanged =
      next.spritePreset !== this.config.spritePreset ||
      next.customSpriteDataUrl !== this.config.customSpriteDataUrl;
    this.config = { ...next };
    this.group.name = `Emissor_${next.name}`;
    this.anchorMesh.name = `Emissor_${next.name}`;
    this.group.position.set(...next.position);
    this.group.visible = next.enabled;
    if (texChanged) {
      this.material.uniforms.uMap.value = buildParticleSpriteTexture(
        next.spritePreset,
        next.customSpriteDataUrl
      );
      this.material.blending =
        next.spritePreset === 'smoke' ? THREE.NormalBlending : THREE.AdditiveBlending;
      this.material.needsUpdate = true;
    }
  }

  public step(dt: number, rateMultiplier = 1): void {
    if (!this.config.enabled) return;

    this.cStart.set(this.config.startColor);
    this.cEnd.set(this.config.endColor);

    // Sync group position back to config in case user dragged emitter via gizmo
    this.config.position = [
      this.group.position.x,
      this.group.position.y,
      this.group.position.z,
    ];

    const effectiveRate = Math.max(0, this.config.rate * rateMultiplier);
    this.spawnAccum += dt * effectiveRate;
    const toSpawn = Math.min(24, Math.floor(this.spawnAccum));
    this.spawnAccum -= toSpawn;

    for (let s = 0; s < toSpawn; s++) {
      const idx = this.cursor;
      this.cursor = (this.cursor + 1) % MAX_PARTICLES_PER_EMITTER;

      const o = idx * 3;
      const angle = Math.random() * Math.PI * 2;
      const spread = 0.25 + Math.random() * 0.75;
      this.positions[o] = (Math.random() - 0.5) * 0.08;
      this.positions[o + 1] = 0;
      this.positions[o + 2] = (Math.random() - 0.5) * 0.08;

      const spd = this.config.speed * (0.65 + Math.random() * 0.7);
      this.velocities[o] = Math.cos(angle) * spread * spd * 0.55;
      this.velocities[o + 1] = (0.55 + Math.random() * 0.65) * spd;
      this.velocities[o + 2] = Math.sin(angle) * spread * spd * 0.55;

      this.ages[idx] = 0;
      this.maxAges[idx] = Math.max(0.15, this.config.lifetime * (0.8 + Math.random() * 0.4));
    }

    const grav = this.config.gravity;
    for (let i = 0; i < MAX_PARTICLES_PER_EMITTER; i++) {
      if (this.ages[i] < 0) {
        this.sizes[i] = 0;
        continue;
      }
      this.ages[i] += dt;
      const life = this.maxAges[i];
      if (this.ages[i] >= life) {
        this.ages[i] = -1;
        this.sizes[i] = 0;
        continue;
      }

      const o = i * 3;
      this.velocities[o + 1] += grav * dt;
      this.positions[o] += this.velocities[o] * dt;
      this.positions[o + 1] += this.velocities[o + 1] * dt;
      this.positions[o + 2] += this.velocities[o + 2] * dt;

      // Ground bounce at relative floor y = -group.position.y
      const localFloorY = -this.group.position.y + 0.02;
      if (this.positions[o + 1] < localFloorY) {
        this.positions[o + 1] = localFloorY;
        this.velocities[o + 1] = Math.abs(this.velocities[o + 1]) * 0.35;
      }

      const t = this.ages[i] / life;
      this.sizes[i] = THREE.MathUtils.lerp(this.config.startSize, this.config.endSize, t);
      this.cMix.copy(this.cStart).lerp(this.cEnd, t);
      this.colors[o] = this.cMix.r;
      this.colors[o + 1] = this.cMix.g;
      this.colors[o + 2] = this.cMix.b;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.pColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.pSize as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.anchorMesh.geometry.dispose();
    (this.anchorMesh.material as THREE.Material).dispose();
  }
}
