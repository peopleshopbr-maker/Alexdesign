import * as THREE from 'three';

export type StagingMode = 'none' | 'silhouette' | 'rim_focus';
export type WorkflowMode = 'pose_to_pose' | 'straight_ahead';
export type EasingCurve = 'linear' | 'ease_in_out' | 'snap_out' | 'elastic';
export type SecondaryActionType = 'none' | 'breathing' | 'head_look' | 'sway_gesture';
export type AppealPreset = 'neutral' | 'hero' | 'cartoon' | 'villain';
export type ActionCycleType =
  | 'walk'
  | 'run'
  | 'jump'
  | 'punch'
  | 'wave'
  | 'idle'
  | 'bounce'
  | 'crouch'
  | 'slide'
  | 'climb'
  | 'roll'
  | 'dance'
  | 'sword'
  | 'pistol'
  | 'swim'
  | 'sit'
  | 'zombie'
  | 'death'
  | 'carry';

export interface AnimationPrinciplesConfig {
  enabled: boolean;
  actionCycle: ActionCycleType;
  // 1. Squash & Stretch (volume-preserving)
  squashStretch: number; // 0..1
  // 2. Anticipation (wind-up before main action)
  anticipation: number; // 0..1
  // 3. Staging (silhouette / focus check)
  stagingMode: StagingMode;
  // 4. Straight Ahead vs Pose to Pose
  workflowMode: WorkflowMode;
  // 5. Follow Through & Overlapping Action (inertial spring lag)
  followThrough: number; // 0..1
  // 6. Slow In & Slow Out (Graph Editor spline easing)
  easingCurve: EasingCurve;
  // 7. Arcs & 3D Motion Trail
  arcsStrength: number; // 0..1
  motionTrail: boolean;
  // 8. Secondary Action
  secondaryAction: SecondaryActionType;
  // 9. Timing (speed & stepped FPS)
  timingSpeed: number; // 0.25..2.5
  timingFps: 12 | 24 | 60;
  // 10. Exaggeration
  exaggeration: number; // 0.5..2.5
  // 11. Solid Drawing (weight shift / contrapposto asymmetry)
  solidAsymmetry: number; // 0..1
  // 12. Appeal (charisma preset)
  appealPreset: AppealPreset;
  // Real Root Motion locomotion across the 3D scene floor
  rootMotion?: boolean;
  // Physical inertia, spring-damper ground impact & centrifugal banking
  physicsEnabled?: boolean;
  physicsStrength?: number; // 0..1.5
}

export const DEFAULT_ANIMATION_PRINCIPLES: AnimationPrinciplesConfig = {
  enabled: false,
  actionCycle: 'walk',
  rootMotion: true,
  physicsEnabled: true,
  physicsStrength: 0.85,
  squashStretch: 0.35,
  anticipation: 0.3,
  stagingMode: 'none',
  workflowMode: 'pose_to_pose',
  followThrough: 0.35,
  easingCurve: 'ease_in_out',
  arcsStrength: 0.4,
  motionTrail: false,
  secondaryAction: 'breathing',
  timingSpeed: 1.0,
  timingFps: 24,
  exaggeration: 1.0,
  solidAsymmetry: 0.25,
  appealPreset: 'neutral',
};

export function getAppealPresetPatch(preset: AppealPreset): Partial<AnimationPrinciplesConfig> {
  switch (preset) {
    case 'hero':
      return {
        enabled: true,
        appealPreset: 'hero',
        squashStretch: 0.2,
        anticipation: 0.45,
        followThrough: 0.4,
        easingCurve: 'snap_out',
        arcsStrength: 0.45,
        secondaryAction: 'breathing',
        timingSpeed: 0.9,
        exaggeration: 1.25,
        solidAsymmetry: 0.45,
      };
    case 'cartoon':
      return {
        enabled: true,
        appealPreset: 'cartoon',
        squashStretch: 0.85,
        anticipation: 0.75,
        followThrough: 0.7,
        easingCurve: 'elastic',
        arcsStrength: 0.8,
        motionTrail: true,
        secondaryAction: 'sway_gesture',
        timingSpeed: 1.45,
        exaggeration: 2.0,
        solidAsymmetry: 0.5,
      };
    case 'villain':
      return {
        enabled: true,
        appealPreset: 'villain',
        squashStretch: 0.1,
        anticipation: 0.6,
        followThrough: 0.55,
        easingCurve: 'ease_in_out',
        arcsStrength: 0.3,
        secondaryAction: 'head_look',
        timingSpeed: 0.65,
        exaggeration: 1.4,
        solidAsymmetry: 0.65,
      };
    default:
      return {
        ...DEFAULT_ANIMATION_PRINCIPLES,
        enabled: true,
        appealPreset: 'neutral',
      };
  }
}

export function evaluateEasingCurve(t: number, curve: EasingCurve): number {
  const x = Math.max(0, Math.min(1, t));
  switch (curve) {
    case 'linear':
      return x;
    case 'ease_in_out':
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    case 'snap_out':
      return 1 - Math.pow(1 - x, 4);
    case 'elastic': {
      if (x === 0 || x === 1) return x;
      const c4 = (2 * Math.PI) / 3;
      return Math.pow(2, -8 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    }
  }
}

export interface PrinciplesRuntimeState {
  phase: number;
  followLagRotZ: number;
  followLagRotX: number;
  baseCaptured: boolean;
  basePos: THREE.Vector3;
  baseRot: THREE.Euler;
  baseScale: THREE.Vector3;
  lastTargetUuid: string | null;
  boneRestQuaternions: Map<string, THREE.Quaternion>;
  trailPoints: Float32Array;
  trailHead: number;
  trailFilled: number;
  locomotionPos: THREE.Vector3;
  locomotionYaw: number;
  // Physics spring-damper & inertia state
  physVelX: number;
  physVelZ: number;
  physBankZ: number;
  physPitchX: number;
  physImpactY: number;
  physImpactVelY: number;
  prevActionY: number;
}

const TRAIL_CAPACITY = 64;
const _tmpEuler = new THREE.Euler(0, 0, 0, 'XYZ');
const _deltaQuat = new THREE.Quaternion();

export function createPrinciplesRuntimeState(): PrinciplesRuntimeState {
  return {
    phase: 0,
    followLagRotZ: 0,
    followLagRotX: 0,
    baseCaptured: false,
    basePos: new THREE.Vector3(),
    baseRot: new THREE.Euler(),
    baseScale: new THREE.Vector3(1, 1, 1),
    lastTargetUuid: null,
    boneRestQuaternions: new Map<string, THREE.Quaternion>(),
    trailPoints: new Float32Array(TRAIL_CAPACITY * 3),
    trailHead: 0,
    trailFilled: 0,
    locomotionPos: new THREE.Vector3(),
    locomotionYaw: 0,
    physVelX: 0,
    physVelZ: 0,
    physBankZ: 0,
    physPitchX: 0,
    physImpactY: 0,
    physImpactVelY: 0,
    prevActionY: 0,
  };
}

export function createMotionTrailLine(): THREE.Line {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(TRAIL_CAPACITY * 3);
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
  });
  const line = new THREE.Line(geo, mat);
  line.name = '__anim_motion_trail__';
  line.frustumCulled = false;
  line.visible = false;
  return line;
}

export function resetTargetFromPrinciples(
  target: THREE.Object3D | null,
  runtime: PrinciplesRuntimeState,
  trailLine: THREE.Line
): void {
  if (target && runtime.baseCaptured && runtime.lastTargetUuid === target.uuid) {
    target.position.copy(runtime.basePos);
    target.rotation.copy(runtime.baseRot);
    target.scale.copy(runtime.baseScale);
    target.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        const restQ = runtime.boneRestQuaternions.get(o.uuid);
        if (restQ) o.quaternion.copy(restQ);
      }
    });
  }
  runtime.baseCaptured = false;
  runtime.lastTargetUuid = null;
  runtime.boneRestQuaternions.clear();
  runtime.trailFilled = 0;
  runtime.trailHead = 0;
  runtime.locomotionPos.set(0, 0, 0);
  runtime.locomotionYaw = 0;
  runtime.physVelX = 0;
  runtime.physVelZ = 0;
  runtime.physBankZ = 0;
  runtime.physPitchX = 0;
  runtime.physImpactY = 0;
  runtime.physImpactVelY = 0;
  runtime.prevActionY = 0;
  trailLine.visible = false;
}

export function applyAnimationPrinciplesFrame(
  target: THREE.Object3D | null,
  cfg: AnimationPrinciplesConfig,
  runtime: PrinciplesRuntimeState,
  trailLine: THREE.Line,
  delta: number
): void {
  if (!target || !cfg.enabled) {
    if (runtime.baseCaptured) {
      resetTargetFromPrinciples(target, runtime, trailLine);
    } else {
      trailLine.visible = false;
    }
    return;
  }

  // Capture base transform & bone bind-pose rest quaternions when first enabled or when target changes
  if (!runtime.baseCaptured || runtime.lastTargetUuid !== target.uuid) {
    runtime.basePos.copy(target.position);
    runtime.baseRot.copy(target.rotation);
    runtime.baseScale.copy(target.scale);
    runtime.boneRestQuaternions.clear();
    target.traverse((o) => {
      if ((o as THREE.Bone).isBone) {
        runtime.boneRestQuaternions.set(o.uuid, o.quaternion.clone());
      }
    });
    runtime.baseCaptured = true;
    runtime.lastTargetUuid = target.uuid;
    runtime.trailFilled = 0;
    runtime.trailHead = 0;
    runtime.locomotionPos.set(0, 0, 0);
    runtime.locomotionYaw = 0;
  }

  // 9. Timing: speed & stepped FPS quantization
  const speed = Math.max(0.25, Math.min(2.5, cfg.timingSpeed));
  runtime.phase = (runtime.phase + delta * speed * 0.65) % 1;
  const quantizedPhase =
    cfg.timingFps < 60
      ? Math.floor(runtime.phase * cfg.timingFps) / cfg.timingFps
      : runtime.phase;

  // 4. Workflow Mode: Pose-to-Pose (keyframe blocking holds) vs Straight Ahead (organic continuous)
  let t = quantizedPhase;
  if (cfg.workflowMode === 'pose_to_pose') {
    // 4-pose blocking cycle with eased transitions
    const segment = Math.floor(t * 4);
    const localT = (t * 4) % 1;
    const easedLocal = evaluateEasingCurve(localT, cfg.easingCurve);
    t = (segment + easedLocal) / 4;
  } else {
    // Straight Ahead: organic multi-harmonic flow
    t = evaluateEasingCurve(t, cfg.easingCurve);
  }

  const angle = t * Math.PI * 2;
  const exag = Math.max(0.5, Math.min(2.5, cfg.exaggeration));

  // Action-specific base kinematics (Walk, Run, Jump, Punch, Wave, Idle, Bounce)
  let actionY = 0;
  let actionX = 0;
  let actionZ = 0;
  let actionRotX = 0;
  let actionRotY = 0;
  let actionRotZ = 0;
  let verticalVel = Math.cos(angle);

  switch (cfg.actionCycle) {
    case 'walk': {
      // Double-frequency vertical bob + hip sway + slight forward lean
      actionY = Math.abs(Math.sin(angle)) * 0.1 * exag;
      actionX = Math.sin(angle) * 0.06 * exag;
      actionRotZ = -Math.sin(angle) * 0.07 * exag;
      actionRotY = Math.cos(angle) * 0.12 * exag;
      actionRotX = 0.06 * exag;
      verticalVel = Math.cos(angle * 2);
      break;
    }
    case 'run': {
      // Energetic forward lean, higher double-bob, stronger stride twist
      actionY = Math.abs(Math.sin(angle)) * 0.22 * exag;
      actionZ = Math.sin(angle * 2) * 0.08 * exag;
      actionRotX = 0.24 * exag + Math.sin(angle * 2) * 0.06 * exag;
      actionRotY = Math.cos(angle) * 0.22 * exag;
      actionRotZ = -Math.sin(angle) * 0.12 * exag;
      verticalVel = Math.cos(angle * 2) * 1.3;
      break;
    }
    case 'jump': {
      // Anticipation crouch (0..0.25), launch & airborne arc (0.25..0.75), landing settle (0.75..1)
      if (t < 0.25) {
        const k = Math.sin((t / 0.25) * Math.PI);
        actionY = -0.14 * k * (0.4 + cfg.anticipation) * exag;
        actionRotX = 0.22 * k * exag;
        verticalVel = -1.2 * k;
      } else if (t < 0.78) {
        const airT = (t - 0.25) / 0.53;
        const parabola = Math.sin(airT * Math.PI);
        actionY = parabola * 0.68 * exag;
        actionRotX = (0.5 - airT) * 0.35 * exag;
        verticalVel = Math.cos(airT * Math.PI) * 1.4;
      } else {
        const landT = (t - 0.78) / 0.22;
        const dip = Math.sin(landT * Math.PI);
        actionY = -0.12 * dip * exag;
        actionRotX = 0.18 * dip * exag;
        verticalVel = -dip;
      }
      break;
    }
    case 'punch': {
      // Wind-up pullback (anticipation), explosive forward thrust, follow-through settle
      if (t < 0.35) {
        const k = Math.sin((t / 0.35) * Math.PI * 0.5);
        actionZ = -0.18 * k * (0.5 + cfg.anticipation) * exag;
        actionRotY = -0.45 * k * exag;
        verticalVel = -0.5 * k;
      } else if (t < 0.55) {
        const k = (t - 0.35) / 0.2;
        actionZ = (-0.18 + k * 0.56) * exag;
        actionRotY = (-0.45 + k * 0.95) * exag;
        actionRotX = 0.14 * k * exag;
        verticalVel = 1.1;
      } else {
        const k = 1 - (t - 0.55) / 0.45;
        actionZ = 0.38 * k * exag;
        actionRotY = 0.5 * k * exag;
        actionRotX = 0.14 * k * exag;
        verticalVel = -0.3 * k;
      }
      break;
    }
    case 'wave': {
      actionY = Math.sin(angle * 2) * 0.05 * exag;
      actionRotZ = Math.sin(angle * 2) * 0.14 * exag;
      actionRotY = Math.sin(angle) * 0.2 * exag;
      verticalVel = Math.cos(angle * 2) * 0.4;
      break;
    }
    case 'idle': {
      actionY = Math.sin(angle) * 0.03 * exag;
      actionRotX = Math.sin(angle) * 0.03 * exag;
      verticalVel = Math.cos(angle) * 0.25;
      break;
    }
    case 'crouch': {
      // Low stealth crouch walk
      actionY = -0.32 + Math.abs(Math.sin(angle)) * 0.06 * exag;
      actionX = Math.sin(angle) * 0.05 * exag;
      actionRotX = 0.28 * exag;
      actionRotY = Math.cos(angle) * 0.1 * exag;
      verticalVel = Math.cos(angle * 2) * 0.4;
      break;
    }
    case 'slide': {
      // Fast low ground slide leaning backward
      actionY = -0.45 + Math.sin(angle) * 0.03;
      actionRotX = -0.58 * exag;
      actionRotZ = 0.14 * exag;
      verticalVel = 0;
      break;
    }
    case 'climb': {
      // Climbing upward with alternating reach
      actionY = (t * 0.85) * exag;
      actionX = Math.sin(angle) * 0.08 * exag;
      actionRotZ = -Math.sin(angle) * 0.12 * exag;
      actionRotX = -0.08 * exag;
      verticalVel = 0.8;
      break;
    }
    case 'roll': {
      // Full 360-degree forward somersault roll
      actionY = -0.22 + Math.sin(t * Math.PI) * 0.35 * exag;
      actionRotX = t * Math.PI * 2;
      verticalVel = Math.cos(t * Math.PI);
      break;
    }
    case 'dance': {
      // Energetic rhythmic groove & hip sway
      actionY = Math.abs(Math.sin(angle * 2)) * 0.14 * exag;
      actionX = Math.sin(angle) * 0.16 * exag;
      actionRotZ = Math.sin(angle) * 0.18 * exag;
      actionRotY = Math.sin(angle * 2) * 0.35 * exag;
      verticalVel = Math.cos(angle * 4);
      break;
    }
    case 'sword': {
      // Wide diagonal sword slash with torso wind-up and follow-through
      if (t < 0.3) {
        const k = t / 0.3;
        actionRotY = -0.75 * k * exag;
        actionRotZ = -0.18 * k * exag;
        actionZ = -0.12 * k * exag;
      } else if (t < 0.6) {
        const k = (t - 0.3) / 0.3;
        actionRotY = (-0.75 + k * 1.65) * exag;
        actionRotZ = (-0.18 + k * 0.4) * exag;
        actionZ = (-0.12 + k * 0.45) * exag;
        actionRotX = 0.2 * k * exag;
      } else {
        const k = 1 - (t - 0.6) / 0.4;
        actionRotY = 0.9 * k * exag;
        actionRotZ = 0.22 * k * exag;
        actionZ = 0.33 * k * exag;
      }
      verticalVel = Math.cos(angle * 2) * 0.6;
      break;
    }
    case 'pistol': {
      // Tactical aiming stance + sharp recoil kick
      const recoil = t > 0.45 && t < 0.6 ? Math.sin(((t - 0.45) / 0.15) * Math.PI) : 0;
      actionY = -0.06 + Math.sin(angle) * 0.02;
      actionZ = -recoil * 0.12 * exag;
      actionRotX = -recoil * 0.18 * exag;
      actionRotY = 0.28;
      verticalVel = 0;
      break;
    }
    case 'swim': {
      // Horizontal swimming stroke
      actionY = 0.32 + Math.sin(angle * 2) * 0.08 * exag;
      actionRotX = 1.15;
      actionRotZ = Math.sin(angle) * 0.22 * exag;
      verticalVel = Math.cos(angle * 2) * 0.3;
      break;
    }
    case 'sit': {
      // Seated pose with subtle breathing
      actionY = -0.38 + Math.sin(angle) * 0.015;
      actionRotX = -0.05;
      actionRotY = Math.sin(angle) * 0.08;
      verticalVel = 0;
      break;
    }
    case 'zombie': {
      // Limping dragging zombie walk
      actionY = Math.abs(Math.sin(angle)) * 0.07 * exag;
      actionX = Math.sin(angle) * 0.1 * exag;
      actionRotZ = 0.18 + Math.sin(angle) * 0.14 * exag;
      actionRotX = 0.2 * exag;
      actionRotY = Math.cos(angle) * 0.16 * exag;
      verticalVel = Math.cos(angle * 2) * 0.3;
      break;
    }
    case 'death': {
      // Dramatic fall backward to the floor
      const fall = Math.min(1, t * 1.45);
      const eased = fall * fall;
      actionY = -0.58 * eased;
      actionZ = -0.45 * eased;
      actionRotX = -1.48 * eased;
      actionRotZ = 0.15 * eased;
      verticalVel = -eased;
      break;
    }
    case 'carry': {
      // Heavy box-carrying walk leaning slightly back
      actionY = Math.abs(Math.sin(angle)) * 0.08 * exag;
      actionX = Math.sin(angle) * 0.08 * exag;
      actionRotX = -0.1 * exag;
      actionRotZ = -Math.sin(angle) * 0.09 * exag;
      verticalVel = Math.cos(angle * 2) * 0.5;
      break;
    }
    case 'bounce':
    default: {
      actionY = Math.max(0, Math.sin(angle)) * 0.34 * exag;
      verticalVel = Math.cos(angle);
      break;
    }
  }

  // 2. Anticipation: extra counter-motion dip before peak
  const anticipationWave =
    cfg.anticipation > 0 && cfg.actionCycle !== 'jump' && cfg.actionCycle !== 'punch'
      ? -Math.sin(angle * 2) * 0.1 * cfg.anticipation * exag
      : 0;

  const straightAheadNoise =
    cfg.workflowMode === 'straight_ahead'
      ? Math.sin(angle * 3.1) * 0.04 * exag + Math.cos(angle * 5.3) * 0.025 * exag
      : 0;

  // 7. Arcs: elliptical curved path in X/Z/Y
  const arcX = Math.sin(angle) * 0.22 * cfg.arcsStrength * exag;
  const arcZ = (1 - Math.cos(angle)) * 0.1 * cfg.arcsStrength * exag;

  // 1. Squash & Stretch (volume-preserving: sx * sy * sz ≈ 1)
  const squashFactor =
    1 + (verticalVel * 0.2 + anticipationWave * 0.7) * cfg.squashStretch * exag;
  const clampedSy = Math.max(0.55, Math.min(1.65, squashFactor));
  const invRoot = 1 / Math.sqrt(clampedSy);

  // 5. Follow Through & Overlapping Action (spring-damped inertial rotation)
  const targetRotZ = actionRotZ - arcX * 0.9;
  const targetRotX = actionRotX + anticipationWave * 1.1;
  const lagFactor = 1 - Math.exp(-(12 - cfg.followThrough * 9) * Math.max(delta, 0.008));
  runtime.followLagRotZ += (targetRotZ - runtime.followLagRotZ) * lagFactor;
  runtime.followLagRotX += (targetRotX - runtime.followLagRotX) * lagFactor;

  // 8. Secondary Action
  let secRotY = 0;
  let secScaleBreath = 1;
  let secRotZ = 0;
  if (cfg.secondaryAction === 'breathing') {
    secScaleBreath = 1 + Math.sin(angle * 2) * 0.035 * exag;
  } else if (cfg.secondaryAction === 'head_look') {
    secRotY = Math.sin(angle * 1.5) * 0.35 * exag;
  } else if (cfg.secondaryAction === 'sway_gesture') {
    secRotZ = Math.sin(angle * 2) * 0.16 * exag;
    secRotY = Math.cos(angle) * 0.18 * exag;
  }

  // 11. Solid Drawing (contrapposto asymmetry & grounded weight shift)
  const asymTiltZ = cfg.solidAsymmetry * 0.12;
  const asymTurnY = cfg.solidAsymmetry * 0.2;
  const asymShiftX = cfg.solidAsymmetry * 0.05;

  // Real Root Motion locomotion across the 3D scene floor + Spring-Damper Physics
  const dt = Math.min(delta, 0.05);
  const physOn = cfg.physicsEnabled !== false;
  const physStr = Math.max(0, Math.min(1.5, cfg.physicsStrength ?? 0.85));
  const isLocomotionCycle =
    cfg.actionCycle === 'walk' ||
    cfg.actionCycle === 'run' ||
    cfg.actionCycle === 'crouch' ||
    cfg.actionCycle === 'slide' ||
    cfg.actionCycle === 'roll' ||
    cfg.actionCycle === 'swim' ||
    cfg.actionCycle === 'zombie' ||
    cfg.actionCycle === 'carry';
  const useRootMotion = cfg.rootMotion !== false && isLocomotionCycle;

  let yawRate = 0;
  if (useRootMotion) {
    const baseMoveSpeed =
      cfg.actionCycle === 'run' || cfg.actionCycle === 'slide'
        ? 2.75
        : cfg.actionCycle === 'roll'
          ? 2.1
          : cfg.actionCycle === 'crouch' || cfg.actionCycle === 'zombie'
            ? 0.72
            : 1.25;
    const targetSpeed = baseMoveSpeed * speed;
    const heading = runtime.baseRot.y + runtime.locomotionYaw;
    const desiredVx = Math.sin(heading) * targetSpeed;
    const desiredVz = Math.cos(heading) * targetSpeed;

    if (physOn) {
      // Inertial acceleration/deceleration (mass & friction)
      const accel = 1 - Math.exp(-6.5 * dt);
      runtime.physVelX += (desiredVx - runtime.physVelX) * accel;
      runtime.physVelZ += (desiredVz - runtime.physVelZ) * accel;
      runtime.locomotionPos.x += runtime.physVelX * dt;
      runtime.locomotionPos.z += runtime.physVelZ * dt;
    } else {
      runtime.locomotionPos.x += desiredVx * dt;
      runtime.locomotionPos.z += desiredVz * dt;
    }

    // Smoothly steer along a studio loop so the character stays on the stage floor
    const distFromOrigin = Math.hypot(runtime.locomotionPos.x, runtime.locomotionPos.z);
    if (distFromOrigin > 3.6) {
      const targetAngle = Math.atan2(-runtime.locomotionPos.x, -runtime.locomotionPos.z);
      let diff = targetAngle - heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const turnStep = diff * Math.min(1, dt * 3.2);
      runtime.locomotionYaw += turnStep;
      yawRate = turnStep / Math.max(dt, 0.008);
    }
  } else if (physOn) {
    // Friction decay when stopping
    const decay = Math.exp(-8 * dt);
    runtime.physVelX *= decay;
    runtime.physVelZ *= decay;
  }

  // Physical banking (centrifugal lean on turns), acceleration pitch, and ground impact spring
  if (physOn) {
    const horizSpeed = Math.hypot(runtime.physVelX, runtime.physVelZ);
    const targetBank = Math.max(-0.28, Math.min(0.28, -yawRate * horizSpeed * 0.045 * physStr));
    const targetPitch = Math.max(-0.18, Math.min(0.22, horizSpeed * 0.045 * physStr));
    const springRot = 1 - Math.exp(-8 * dt);
    runtime.physBankZ += (targetBank - runtime.physBankZ) * springRot;
    runtime.physPitchX += (targetPitch - runtime.physPitchX) * springRot;

    // Detect downward landing impulse and compress knees/hips via damped harmonic spring
    const verticalDelta = actionY - runtime.prevActionY;
    if (runtime.prevActionY > 0.05 && actionY <= 0.05 && verticalDelta < -0.01) {
      runtime.physImpactVelY -= Math.min(1.8, Math.abs(verticalDelta) * 14) * physStr;
    }
    runtime.prevActionY = actionY;

    const kSpring = 95;
    const cDamp = 14;
    const accY = -kSpring * runtime.physImpactY - cDamp * runtime.physImpactVelY;
    runtime.physImpactVelY += accY * dt;
    runtime.physImpactY += runtime.physImpactVelY * dt;
    runtime.physImpactY = Math.max(-0.18, Math.min(0.08, runtime.physImpactY));
  } else {
    runtime.physBankZ = 0;
    runtime.physPitchX = 0;
    runtime.physImpactY = 0;
    runtime.physImpactVelY = 0;
  }

  // Apply composed transform relative to captured base + real floor locomotion + physics
  target.position.set(
    runtime.basePos.x + runtime.locomotionPos.x + actionX + arcX + asymShiftX,
    runtime.basePos.y + Math.max(-0.18 * exag, actionY + anticipationWave + straightAheadNoise + runtime.physImpactY),
    runtime.basePos.z + runtime.locomotionPos.z + actionZ + arcZ
  );

  target.rotation.set(
    runtime.baseRot.x + runtime.followLagRotX * (0.55 + cfg.followThrough * 0.65) + runtime.physPitchX,
    runtime.baseRot.y + runtime.locomotionYaw + actionRotY + secRotY + asymTurnY,
    runtime.baseRot.z + runtime.followLagRotZ * (0.55 + cfg.followThrough * 0.65) + secRotZ + asymTiltZ + runtime.physBankZ
  );

  target.scale.set(
    runtime.baseScale.x * invRoot * secScaleBreath,
    runtime.baseScale.y * clampedSy,
    runtime.baseScale.z * invRoot * secScaleBreath
  );

  // ActionForge-style full articulated humanoid bone solver (Mixamo / Rigify / Unity / VRM / GLB)
  const limbAmp =
    cfg.actionCycle === 'run'
      ? 0.92 * exag
      : cfg.actionCycle === 'walk'
        ? 0.52 * exag
        : cfg.actionCycle === 'jump'
          ? 0.6 * exag
          : cfg.actionCycle === 'punch'
            ? 0.95 * exag
            : cfg.actionCycle === 'wave'
              ? 0.72 * exag
              : 0.08 * exag;

  const isLeft = (n: string) =>
    /(^|[^a-z])(left|l_|_l|\.l|l$)/.test(n) || n.includes('left') || n.includes('_l_') || n.includes('l_');
  const isRight = (n: string) =>
    /(^|[^a-z])(right|r_|_r|\.r|r$)/.test(n) || n.includes('right') || n.includes('_r_') || n.includes('r_');

  const applyBoneDelta = (bone: THREE.Bone, restQ: THREE.Quaternion, dx: number, dy: number, dz: number) => {
    _tmpEuler.set(dx, dy, dz, 'XYZ');
    _deltaQuat.setFromEuler(_tmpEuler);
    bone.quaternion.copy(restQ).multiply(_deltaQuat);
  };

  target.traverse((obj) => {
    if (!(obj as THREE.Bone).isBone) return;
    const bone = obj as THREE.Bone;
    const restQ = runtime.boneRestQuaternions.get(bone.uuid);
    if (!restQ) return;
    const n = bone.name.toLowerCase();

    // Spine / Chest torso counter-twist & breathing (conflict-free quaternion delta)
    if (n.includes('spine') || n.includes('chest') || n.includes('torso')) {
      const dY =
        cfg.actionCycle === 'punch'
          ? Math.sin(angle) * 0.32 * exag
          : -Math.cos(angle) * 0.1 * exag;
      const dX =
        cfg.actionCycle === 'run'
          ? 0.12 * exag
          : cfg.actionCycle === 'idle'
            ? Math.sin(angle * 2) * 0.03 * exag
            : 0.03 * exag;
      applyBoneDelta(bone, restQ, dX, dY, 0);
      return;
    }

    // Neck / Head stabilization & secondary look
    if (n.includes('head') || n.includes('neck')) {
      const dY =
        cfg.secondaryAction === 'head_look'
          ? Math.sin(angle * 1.5) * 0.28 * exag
          : Math.cos(angle) * 0.05 * exag;
      const dX = cfg.actionCycle === 'run' ? -0.06 * exag : Math.sin(angle * 2) * 0.025 * exag;
      applyBoneDelta(bone, restQ, dX, dY, 0);
      return;
    }

    // Thighs / Upper Legs
    if (n.includes('upleg') || n.includes('thigh') || (n.includes('leg') && !n.includes('lower') && !n.includes('shin') && !n.includes('calf'))) {
      const sign = isLeft(n) ? 1 : isRight(n) ? -1 : 0;
      if (sign !== 0) {
        let dX = sign * Math.sin(angle) * limbAmp * 0.6;
        if (cfg.actionCycle === 'jump') {
          dX = -Math.max(0, Math.sin(angle)) * 0.4 * exag;
        } else if (cfg.actionCycle === 'crouch') {
          dX = -0.55 + sign * Math.sin(angle) * 0.32 * exag;
        } else if (cfg.actionCycle === 'sit') {
          dX = -1.25;
        } else if (cfg.actionCycle === 'slide') {
          dX = sign > 0 ? -0.85 : -0.15;
        } else if (cfg.actionCycle === 'climb') {
          dX = -0.45 + sign * Math.sin(angle) * 0.55 * exag;
        } else if (cfg.actionCycle === 'swim') {
          dX = sign * Math.sin(angle * 2) * 0.45 * exag;
        } else if (cfg.actionCycle === 'dance') {
          dX = -0.15 + sign * Math.sin(angle * 2) * 0.25 * exag;
        } else if (cfg.actionCycle === 'zombie') {
          dX = sign * Math.sin(angle) * 0.35 * exag;
        } else if (cfg.actionCycle === 'carry') {
          dX = sign * Math.sin(angle) * 0.42 * exag;
        } else if (cfg.actionCycle === 'punch' || cfg.actionCycle === 'sword') {
          dX = sign * 0.22 * exag;
        }
        applyBoneDelta(bone, restQ, dX, 0, 0);
      }
      return;
    }

    // Knees / Lower Legs / Shins / Calves
    if (n.includes('shin') || n.includes('calf') || n.includes('lowerleg') || n.includes('knee') || n.includes('leftleg') || n.includes('rightleg')) {
      const sign = isLeft(n) ? 1 : isRight(n) ? -1 : 0;
      if (sign !== 0) {
        const kneeBend =
          cfg.actionCycle === 'run'
            ? Math.max(0, -sign * Math.sin(angle)) * 0.72 * exag
            : cfg.actionCycle === 'walk' || cfg.actionCycle === 'carry'
              ? Math.max(0, -sign * Math.sin(angle)) * 0.38 * exag
              : cfg.actionCycle === 'crouch'
                ? 0.85 + Math.max(0, -sign * Math.sin(angle)) * 0.25
                : cfg.actionCycle === 'sit'
                  ? 1.25
                  : cfg.actionCycle === 'slide'
                    ? (sign > 0 ? 0.12 : 1.05)
                    : cfg.actionCycle === 'climb'
                      ? 0.45 + Math.max(0, sign * Math.sin(angle)) * 0.65
                      : cfg.actionCycle === 'jump'
                        ? Math.max(0, Math.sin(angle)) * 0.55 * exag
                        : 0.04 * exag;
        applyBoneDelta(bone, restQ, kneeBend, 0, 0);
      }
      return;
    }

    // Forearms / Elbows
    if (n.includes('forearm') || n.includes('lowerarm') || n.includes('elbow')) {
      const sign = isLeft(n) ? 1 : isRight(n) ? -1 : 0;
      if (sign !== 0) {
        let dX = 0;
        let dZ = 0;
        if (cfg.actionCycle === 'run') {
          dX = -0.55 * exag;
        } else if (cfg.actionCycle === 'walk') {
          dX = -0.2 * exag + Math.max(0, -sign * Math.sin(angle)) * 0.2;
        } else if (cfg.actionCycle === 'wave' && sign === 1) {
          dZ = Math.sin(angle * 3) * 0.38 * exag;
        } else if (cfg.actionCycle === 'punch' && sign === -1) {
          dX = -0.55 * (1 - Math.max(0, Math.sin(angle))) * exag;
        }
        applyBoneDelta(bone, restQ, dX, 0, dZ);
      }
      return;
    }

    // Upper Arms / Shoulders
    if (n.includes('arm') || n.includes('upperarm')) {
      const sign = isLeft(n) ? 1 : isRight(n) ? -1 : 0;
      if (sign !== 0) {
        let dX = -sign * Math.sin(angle) * limbAmp * 0.55;
        let dZ = 0;
        if (cfg.actionCycle === 'wave' && sign === 1) {
          dX = -0.95 + Math.sin(angle * 2) * 0.24;
          dZ = 0.28 + Math.sin(angle * 3) * 0.16;
        } else if (cfg.actionCycle === 'punch' && sign === -1) {
          dX = -0.85 * Math.max(0, Math.sin(angle)) * exag;
        } else if (cfg.actionCycle === 'jump') {
          dX = -0.65 * Math.max(0, Math.sin(angle)) * exag;
        }
        applyBoneDelta(bone, restQ, dX, 0, dZ);
      }
    }
  });

  // 7. Motion Trail 3D update (zero-allocation ring buffer)
  if (cfg.motionTrail) {
    trailLine.visible = true;
    const posAttr = trailLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const trailY = target.position.y + 0.9;

    // Shift points left for clean ordered line strip
    if (runtime.trailFilled < TRAIL_CAPACITY) {
      const idx = runtime.trailFilled * 3;
      arr[idx] = target.position.x;
      arr[idx + 1] = trailY;
      arr[idx + 2] = target.position.z;
      runtime.trailFilled++;
    } else {
      arr.copyWithin(0, 3);
      const last = (TRAIL_CAPACITY - 1) * 3;
      arr[last] = target.position.x;
      arr[last + 1] = trailY;
      arr[last + 2] = target.position.z;
    }
    posAttr.needsUpdate = true;
    trailLine.geometry.setDrawRange(0, runtime.trailFilled);
  } else {
    trailLine.visible = false;
  }
}

const RIG_RINGS_GROUP_NAME = '__alexdesign_actionforge_rig_rings__';

export function syncActionForgeRigRings(
  scene: THREE.Scene,
  target: THREE.Object3D | null,
  visible: boolean
): void {
  let group = scene.getObjectByName(RIG_RINGS_GROUP_NAME) as THREE.Group | undefined;
  if (!visible || !target) {
    if (group) group.visible = false;
    return;
  }

  if (!group) {
    group = new THREE.Group();
    group.name = RIG_RINGS_GROUP_NAME;
    scene.add(group);
  }

  // Rebuild rings only when target changes
  if (group.userData.targetUuid !== target.uuid) {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }
    group.userData.targetUuid = target.uuid;

    target.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(target);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const radius = Math.max(0.38, Math.max(size.x, size.z) * 0.65);

    const makeRing = (r: number, color: number, rotX = Math.PI / 2) => {
      const pts: THREE.Vector3[] = [];
      const segs = 40;
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.92, depthTest: false });
      const loop = new THREE.Line(geo, mat);
      loop.rotation.x = rotX;
      loop.renderOrder = 999;
      return loop;
    };

    // 1. Yellow Root Ring + 4 Directional Arrows at floor
    const rootRing = makeRing(radius, 0xfacc15);
    rootRing.position.set(center.x, Math.max(0.01, box.min.y + 0.01), center.z);
    group.add(rootRing);

    const arrowDirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    for (const [dx, dz] of arrowDirs) {
      const arrowPts = [
        new THREE.Vector3(center.x + dx * radius, box.min.y + 0.012, center.z + dz * radius),
        new THREE.Vector3(center.x + dx * (radius + 0.16), box.min.y + 0.012, center.z + dz * (radius + 0.16)),
      ];
      const arrowGeo = new THREE.BufferGeometry().setFromPoints(arrowPts);
      const arrowMat = new THREE.LineBasicMaterial({ color: 0xfacc15, depthTest: false });
      const arrow = new THREE.Line(arrowGeo, arrowMat);
      arrow.renderOrder = 999;
      group.add(arrow);
    }

    // 2. Bone-tracked or proportional joint rings (Yellow center, Blue left, Red right)
    const bones: THREE.Bone[] = [];
    target.traverse((o) => {
      if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone);
    });

    if (bones.length > 0) {
      const worldPos = new THREE.Vector3();
      for (const bone of bones) {
        const n = bone.name.toLowerCase();
        const isL = /(^|[^a-z])(left|l_|_l|\.l)/.test(n) || n.includes('left');
        const isR = /(^|[^a-z])(right|r_|_r|\.r)/.test(n) || n.includes('right');
        const isCore = n.includes('hip') || n.includes('spine') || n.includes('chest') || n.includes('neck') || n.includes('head');
        const isLimb = n.includes('arm') || n.includes('elbow') || n.includes('hand') || n.includes('leg') || n.includes('thigh') || n.includes('knee') || n.includes('foot');
        if (!isCore && !isLimb) continue;

        bone.getWorldPosition(worldPos);
        const color = isL ? 0x38bdf8 : isR ? 0xf43f5e : 0xfacc15;
        const r = isCore ? radius * 0.42 : radius * 0.2;
        const ring = makeRing(r, color);
        ring.position.copy(worldPos);
        ring.userData.trackBone = bone;
        group.add(ring);
      }
    } else {
      // Fallback proportional torso rings for unrigged models
      const heights = [0.35, 0.55, 0.72];
      for (const h of heights) {
        const ring = makeRing(radius * 0.45, 0xfacc15);
        ring.position.set(center.x, box.min.y + size.y * h, center.z);
        group.add(ring);
      }
    }
  }

  // Live update bone-tracked ring positions every frame
  const tmpPos = new THREE.Vector3();
  for (const child of group.children) {
    const bone = child.userData.trackBone as THREE.Bone | undefined;
    if (bone) {
      bone.getWorldPosition(tmpPos);
      child.position.copy(tmpPos);
    }
  }
  group.visible = true;
}
