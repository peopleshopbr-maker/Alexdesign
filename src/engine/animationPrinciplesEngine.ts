import * as THREE from 'three';

export type StagingMode = 'none' | 'silhouette' | 'rim_focus';
export type WorkflowMode = 'pose_to_pose' | 'straight_ahead';
export type EasingCurve = 'linear' | 'ease_in_out' | 'snap_out' | 'elastic';
export type SecondaryActionType = 'none' | 'breathing' | 'head_look' | 'sway_gesture';
export type AppealPreset = 'neutral' | 'hero' | 'cartoon' | 'villain';
export type ActionCycleType = 'walk' | 'run' | 'jump' | 'punch' | 'wave' | 'idle' | 'bounce';

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
}

export const DEFAULT_ANIMATION_PRINCIPLES: AnimationPrinciplesConfig = {
  enabled: false,
  actionCycle: 'walk',
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
  trailPoints: Float32Array;
  trailHead: number;
  trailFilled: number;
}

const TRAIL_CAPACITY = 64;

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
    trailPoints: new Float32Array(TRAIL_CAPACITY * 3),
    trailHead: 0,
    trailFilled: 0,
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
  }
  runtime.baseCaptured = false;
  runtime.lastTargetUuid = null;
  runtime.trailFilled = 0;
  runtime.trailHead = 0;
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

  // Capture base transform when first enabled or when target changes
  if (!runtime.baseCaptured || runtime.lastTargetUuid !== target.uuid) {
    runtime.basePos.copy(target.position);
    runtime.baseRot.copy(target.rotation);
    runtime.baseScale.copy(target.scale);
    runtime.baseCaptured = true;
    runtime.lastTargetUuid = target.uuid;
    runtime.trailFilled = 0;
    runtime.trailHead = 0;
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

  // Apply composed transform relative to captured base
  target.position.set(
    runtime.basePos.x + actionX + arcX + asymShiftX,
    runtime.basePos.y + Math.max(-0.16 * exag, actionY + anticipationWave + straightAheadNoise),
    runtime.basePos.z + actionZ + arcZ
  );

  target.rotation.set(
    runtime.baseRot.x + runtime.followLagRotX * (0.55 + cfg.followThrough * 0.65),
    runtime.baseRot.y + actionRotY + secRotY + asymTurnY,
    runtime.baseRot.z + runtime.followLagRotZ * (0.55 + cfg.followThrough * 0.65) + secRotZ + asymTiltZ
  );

  target.scale.set(
    runtime.baseScale.x * invRoot * secScaleBreath,
    runtime.baseScale.y * clampedSy,
    runtime.baseScale.z * invRoot * secScaleBreath
  );

  // Procedural skeleton bone swing for rigged characters (Walk / Run / Jump / Punch / Wave)
  const limbAmp =
    cfg.actionCycle === 'run'
      ? 0.85 * exag
      : cfg.actionCycle === 'walk'
        ? 0.48 * exag
        : cfg.actionCycle === 'jump'
          ? 0.55 * exag
          : cfg.actionCycle === 'punch'
            ? 0.9 * exag
            : cfg.actionCycle === 'wave'
              ? 0.7 * exag
              : 0.08 * exag;

  target.traverse((obj) => {
    if ((obj as THREE.Bone).isBone) {
      const n = obj.name.toLowerCase();
      if (n.includes('leftupleg') || n.includes('thigh_l') || n.includes('l_thigh') || n.includes('leg_l')) {
        obj.rotation.x = Math.sin(angle) * limbAmp;
      } else if (n.includes('rightupleg') || n.includes('thigh_r') || n.includes('r_thigh') || n.includes('leg_r')) {
        obj.rotation.x = -Math.sin(angle) * limbAmp;
      } else if (n.includes('leftarm') || n.includes('upperarm_l') || n.includes('l_arm') || n.includes('arm_l')) {
        obj.rotation.x =
          cfg.actionCycle === 'wave'
            ? -2.2 + Math.sin(angle * 2) * 0.45
            : -Math.sin(angle) * limbAmp * 0.85;
      } else if (n.includes('rightarm') || n.includes('upperarm_r') || n.includes('r_arm') || n.includes('arm_r')) {
        obj.rotation.x =
          cfg.actionCycle === 'punch'
            ? -1.4 * Math.max(0, Math.sin(angle)) * exag
            : Math.sin(angle) * limbAmp * 0.85;
      } else if (n.includes('head') && cfg.secondaryAction === 'head_look') {
        obj.rotation.y = Math.sin(angle * 1.5) * 0.35 * exag;
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
