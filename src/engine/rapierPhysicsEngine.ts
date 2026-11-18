import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

export interface RapierPhysicsConfig {
  enabled: boolean;
  gravityY: number; // e.g. -9.81
  mass: number; // kg (0.2 .. 50)
  restitution: number; // bounciness / elasticity (0 .. 1)
  friction: number; // 0 .. 1.5
}

export const DEFAULT_RAPIER_PHYSICS: RapierPhysicsConfig = {
  enabled: false,
  gravityY: -9.81,
  mass: 5.0,
  restitution: 0.45,
  friction: 0.6,
};

interface TrackedBody {
  object: THREE.Object3D;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  initialPos: THREE.Vector3;
  initialQuat: THREE.Quaternion;
  isProp: boolean;
  halfHeight: number;
}

let rapierInitPromise: Promise<void> | null = null;

export function initRapierPhysics(): Promise<void> {
  if (!rapierInitPromise) {
    rapierInitPromise = RAPIER.init();
  }
  return rapierInitPromise;
}

export class RapierSceneWorld {
  private world: RAPIER.World | null = null;
  private tracked: TrackedBody[] = [];
  private ready = false;
  private config: RapierPhysicsConfig = { ...DEFAULT_RAPIER_PHYSICS };

  async ensureReady(cfg: RapierPhysicsConfig): Promise<void> {
    this.config = { ...cfg };
    if (this.ready && this.world) {
      this.world.gravity = new RAPIER.Vector3(0, cfg.gravityY, 0);
      return;
    }
    await initRapierPhysics();
    this.world = new RAPIER.World(new RAPIER.Vector3(0, cfg.gravityY, 0));

    // Static ground plane collider at Y = 0
    const groundDesc = RAPIER.ColliderDesc.cuboid(40, 0.25, 40)
      .setTranslation(0, -0.25, 0)
      .setFriction(0.8)
      .setRestitution(0.2);
    this.world.createCollider(groundDesc);
    this.ready = true;
  }

  updateConfig(cfg: RapierPhysicsConfig): void {
    this.config = { ...cfg };
    if (!this.world) return;
    this.world.gravity = new RAPIER.Vector3(0, cfg.gravityY, 0);
    for (const item of this.tracked) {
      item.collider.setRestitution(cfg.restitution);
      item.collider.setFriction(cfg.friction);
      item.collider.setMass(cfg.mass);
    }
  }

  attachPrimaryObject(obj: THREE.Object3D, dropHeight = 0): void {
    if (!this.world) return;
    // Remove previous primary body if any
    this.detachPrimaryObject(false);

    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3(1, 1.6, 1);
    if (!box.isEmpty()) {
      box.getSize(size);
    }
    const hx = Math.max(0.18, Math.min(2.5, size.x * 0.45));
    const hy = Math.max(0.25, Math.min(3.0, size.y * 0.5));
    const hz = Math.max(0.18, Math.min(2.5, size.z * 0.45));

    const startY = Math.max(hy, obj.position.y + hy + dropHeight);
    const rbDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(obj.position.x, startY, obj.position.z)
      .setRotation({
        x: obj.quaternion.x,
        y: obj.quaternion.y,
        z: obj.quaternion.z,
        w: obj.quaternion.w,
      })
      .setLinearDamping(0.25)
      .setAngularDamping(0.4);

    const body = this.world.createRigidBody(rbDesc);
    const colDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
      .setMass(Math.max(0.1, this.config.mass))
      .setRestitution(Math.max(0, Math.min(1, this.config.restitution)))
      .setFriction(Math.max(0, this.config.friction));

    const collider = this.world.createCollider(colDesc, body);

    this.tracked.push({
      object: obj,
      body,
      collider,
      initialPos: obj.position.clone(),
      initialQuat: obj.quaternion.clone(),
      isProp: false,
      halfHeight: hy,
    });
  }

  detachPrimaryObject(restoreTransform = true): void {
    if (!this.world) return;
    const idx = this.tracked.findIndex((t) => !t.isProp);
    if (idx === -1) return;
    const item = this.tracked[idx];
    if (restoreTransform) {
      item.object.position.copy(item.initialPos);
      item.object.quaternion.copy(item.initialQuat);
    }
    this.world.removeRigidBody(item.body);
    this.tracked.splice(idx, 1);
  }

  dropPrimary(height = 2.6): void {
    const primary = this.tracked.find((t) => !t.isProp);
    if (!primary) return;
    primary.body.setTranslation(
      new RAPIER.Vector3(primary.initialPos.x, primary.halfHeight + height, primary.initialPos.z),
      true
    );
    primary.body.setLinvel(new RAPIER.Vector3(0, 0, 0), true);
    primary.body.setAngvel(
      new RAPIER.Vector3((Math.random() - 0.5) * 2.2, 0.4, (Math.random() - 0.5) * 2.2),
      true
    );
  }

  impulsePrimary(ix = 0, iy = 18, iz = 0): void {
    const primary = this.tracked.find((t) => !t.isProp);
    if (!primary) return;
    primary.body.applyImpulse(new RAPIER.Vector3(ix, iy, iz), true);
  }

  spawnCollidingProp(scene: THREE.Scene, kind: 'sphere' | 'box' = 'sphere'): void {
    if (!this.world) return;
    const isSphere = kind === 'sphere';
    const radius = 0.28 + Math.random() * 0.14;
    const geom = isSphere
      ? new THREE.SphereGeometry(radius, 24, 24)
      : new THREE.BoxGeometry(radius * 1.8, radius * 1.8, radius * 1.8);
    const mat = new THREE.MeshStandardMaterial({
      color: isSphere ? 0x22d3ee : 0xf59e0b,
      roughness: 0.28,
      metalness: 0.35,
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `__rapier_prop_${Date.now()}`;

    const px = (Math.random() - 0.5) * 2.2;
    const py = 2.6 + Math.random() * 1.8;
    const pz = (Math.random() - 0.5) * 2.2;
    mesh.position.set(px, py, pz);
    scene.add(mesh);

    const rbDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(px, py, pz)
      .setLinearDamping(0.12)
      .setAngularDamping(0.2);
    const body = this.world.createRigidBody(rbDesc);

    const colDesc = (
      isSphere
        ? RAPIER.ColliderDesc.ball(radius)
        : RAPIER.ColliderDesc.cuboid(radius * 0.9, radius * 0.9, radius * 0.9)
    )
      .setMass(Math.max(0.5, this.config.mass * 0.4))
      .setRestitution(Math.max(0.2, Math.min(0.95, this.config.restitution + 0.15)))
      .setFriction(this.config.friction);

    const collider = this.world.createCollider(colDesc, body);

    this.tracked.push({
      object: mesh,
      body,
      collider,
      initialPos: mesh.position.clone(),
      initialQuat: mesh.quaternion.clone(),
      isProp: true,
      halfHeight: radius,
    });
  }

  step(delta: number): void {
    if (!this.ready || !this.world || !this.config.enabled) return;
    this.world.timestep = Math.min(1 / 30, Math.max(1 / 120, delta));
    this.world.step();

    for (const item of this.tracked) {
      const t = item.body.translation();
      const r = item.body.rotation();
      if (item.isProp) {
        item.object.position.set(t.x, t.y, t.z);
      } else {
        item.object.position.set(t.x, Math.max(0, t.y - item.halfHeight), t.z);
      }
      item.object.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  clearProps(scene: THREE.Scene): void {
    if (!this.world) return;
    const remaining: TrackedBody[] = [];
    for (const item of this.tracked) {
      if (item.isProp) {
        this.world.removeRigidBody(item.body);
        scene.remove(item.object);
        const mesh = item.object as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      } else {
        remaining.push(item);
      }
    }
    this.tracked = remaining;
  }

  resetAll(scene: THREE.Scene): void {
    this.clearProps(scene);
    this.detachPrimaryObject(true);
  }
}
