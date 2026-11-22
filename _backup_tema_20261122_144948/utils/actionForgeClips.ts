import * as THREE from 'three';
import { RigPreset } from '../types/studioConfig';

export type ActionForgeCategory =
  | 'all'
  | 'interaction'
  | 'locomotion'
  | 'idle'
  | 'combat'
  | 'weapon'
  | 'zombie';

export interface ActionForgeClipDef {
  id: string;
  label: string;
  category: Exclude<ActionForgeCategory, 'all'>;
  duration: number;
  loop: boolean;
  hasTransitionArrow?: boolean;
}

export interface TimelineStripItem {
  uid: string;
  clipId: string;
  label: string;
  startTime: number;
  duration: number;
  speed: number;
  mirror: boolean;
}

export const ACTIONFORGE_CATEGORY_TABS: { id: ActionForgeCategory; label: string }[] = [
  { id: 'all', label: 'Todos (84)' },
  { id: 'interaction', label: 'Interação & Farm' },
  { id: 'locomotion', label: 'Locomoção' },
  { id: 'idle', label: 'Idle & Social' },
  { id: 'combat', label: 'Combate' },
  { id: 'weapon', label: 'Espada / Arma / Magia' },
  { id: 'zombie', label: 'Zumbi' },
];

export const ACTIONFORGE_CLIPS: ActionForgeClipDef[] = [
  { id: 'chest_open', label: 'Chest Open', category: 'interaction', duration: 2.6, loop: false, hasTransitionArrow: true },
  { id: 'climbup_1m', label: 'Climbup 1m', category: 'locomotion', duration: 2.2, loop: false },
  { id: 'consume', label: 'Consume', category: 'interaction', duration: 2.0, loop: false, hasTransitionArrow: true },
  { id: 'crouch_fwd_loop', label: 'Crouch Fwd Loop', category: 'locomotion', duration: 1.8, loop: true },
  { id: 'crouch_idle_loop', label: 'Crouch Idle Loop', category: 'idle', duration: 2.2, loop: true },
  { id: 'dance_loop', label: 'Dance Loop', category: 'idle', duration: 2.4, loop: true, hasTransitionArrow: true },
  { id: 'death01', label: 'Death01', category: 'combat', duration: 2.1, loop: false },
  { id: 'driving_loop', label: 'Driving Loop', category: 'interaction', duration: 2.0, loop: true },
  { id: 'farm_harvest', label: 'Farm Harvest', category: 'interaction', duration: 2.3, loop: false },
  { id: 'farm_plantseed', label: 'Farm Plantseed', category: 'interaction', duration: 2.2, loop: false },
  { id: 'farm_watering', label: 'Farm Watering', category: 'interaction', duration: 2.4, loop: false },
  { id: 'fixing_kneeling', label: 'Fixing Kneeling', category: 'interaction', duration: 2.4, loop: true },
  { id: 'fps_test', label: 'Fps Test', category: 'weapon', duration: 2.0, loop: true },
  { id: 'hit_chest', label: 'Hit Chest', category: 'combat', duration: 1.0, loop: false },
  { id: 'hit_head', label: 'Hit Head', category: 'combat', duration: 1.0, loop: false, hasTransitionArrow: true },
  { id: 'hit_knockback', label: 'Hit Knockback', category: 'combat', duration: 1.5, loop: false },
  { id: 'idle_foldarms_loop', label: 'Idle Foldarms Loop', category: 'idle', duration: 2.6, loop: true },
  { id: 'idle_lantern_loop', label: 'Idle Lantern Loop', category: 'idle', duration: 2.5, loop: true },
  { id: 'idle_loop', label: 'Idle Loop', category: 'idle', duration: 2.5, loop: true },
  { id: 'idle_no_loop', label: 'Idle No Loop', category: 'idle', duration: 1.8, loop: false },
  { id: 'idle_rail_call', label: 'Idle Rail Call', category: 'idle', duration: 2.2, loop: false },
  { id: 'idle_rail_loop', label: 'Idle Rail Loop', category: 'idle', duration: 2.4, loop: true },
  { id: 'idle_shield_break', label: 'Idle Shield Break', category: 'combat', duration: 1.6, loop: false },
  { id: 'idle_shield_loop', label: 'Idle Shield Loop', category: 'weapon', duration: 2.2, loop: true },
  { id: 'idle_talking_loop', label: 'Idle Talking Loop', category: 'idle', duration: 2.4, loop: true },
  { id: 'idle_talkingphone_loop', label: 'Idle Talkingphone Loop', category: 'idle', duration: 2.4, loop: true },
  { id: 'idle_torch_loop', label: 'Idle Torch Loop', category: 'idle', duration: 2.5, loop: true },
  { id: 'interact', label: 'Interact', category: 'interaction', duration: 1.8, loop: false, hasTransitionArrow: true },
  { id: 'jog_fwd_loop', label: 'Jog Fwd Loop', category: 'locomotion', duration: 1.5, loop: true },
  { id: 'jump_land', label: 'Jump Land', category: 'locomotion', duration: 1.0, loop: false },
  { id: 'jump_loop', label: 'Jump Loop', category: 'locomotion', duration: 1.4, loop: true },
  { id: 'jump_start', label: 'Jump Start', category: 'locomotion', duration: 0.9, loop: false },
  { id: 'laytoidle', label: 'Laytoidle', category: 'locomotion', duration: 2.2, loop: false, hasTransitionArrow: true },
  { id: 'melee_hook', label: 'Melee Hook', category: 'combat', duration: 1.2, loop: false },
  { id: 'melee_hook_rec', label: 'Melee Hook Rec', category: 'combat', duration: 1.0, loop: false },
  { id: 'ninjajump_idle_loop', label: 'Ninjajump Idle Loop', category: 'locomotion', duration: 1.6, loop: true },
  { id: 'ninjajump_land', label: 'Ninjajump Land', category: 'locomotion', duration: 1.1, loop: false },
  { id: 'ninjajump_start', label: 'Ninjajump Start', category: 'locomotion', duration: 1.0, loop: false },
  { id: 'overhandthrow', label: 'Overhandthrow', category: 'combat', duration: 1.4, loop: false },
  { id: 'pickup_table', label: 'Pickup Table', category: 'interaction', duration: 1.9, loop: false },
  { id: 'pistol_aim_down', label: 'Pistol Aim Down', category: 'weapon', duration: 1.4, loop: true },
  { id: 'pistol_aim_neutral', label: 'Pistol Aim Neutral', category: 'weapon', duration: 1.4, loop: true },
  { id: 'pistol_aim_up', label: 'Pistol Aim Up', category: 'weapon', duration: 1.4, loop: true },
  { id: 'pistol_idle_loop', label: 'Pistol Idle Loop', category: 'weapon', duration: 2.2, loop: true },
  { id: 'pistol_reload', label: 'Pistol Reload', category: 'weapon', duration: 1.8, loop: false },
  { id: 'pistol_shoot', label: 'Pistol Shoot', category: 'weapon', duration: 0.9, loop: false },
  { id: 'punch_cross', label: 'Punch Cross', category: 'combat', duration: 1.1, loop: false },
  { id: 'punch_jab', label: 'Punch Jab', category: 'combat', duration: 0.95, loop: false, hasTransitionArrow: true },
  { id: 'push_loop', label: 'Push Loop', category: 'interaction', duration: 1.8, loop: true, hasTransitionArrow: true },
  { id: 'roll', label: 'Roll', category: 'locomotion', duration: 1.4, loop: false, hasTransitionArrow: true },
  { id: 'shield_dash', label: 'Shield Dash', category: 'combat', duration: 1.4, loop: false },
  { id: 'shield_oneshot', label: 'Shield Oneshot', category: 'combat', duration: 1.1, loop: false },
  { id: 'sitting_enter', label: 'Sitting Enter', category: 'idle', duration: 1.6, loop: false },
  { id: 'sitting_exit', label: 'Sitting Exit', category: 'idle', duration: 1.6, loop: false },
  { id: 'sitting_idle_loop', label: 'Sitting Idle Loop', category: 'idle', duration: 2.5, loop: true },
  { id: 'sitting_talking_loop', label: 'Sitting Talking Loop', category: 'idle', duration: 2.4, loop: true, hasTransitionArrow: true },
  { id: 'slide_exit', label: 'Slide Exit', category: 'locomotion', duration: 1.2, loop: false },
  { id: 'slide_loop', label: 'Slide Loop', category: 'locomotion', duration: 1.5, loop: true },
  { id: 'slide_start', label: 'Slide Start', category: 'locomotion', duration: 1.1, loop: false },
  { id: 'spell_simple_enter', label: 'Spell Simple Enter', category: 'weapon', duration: 1.2, loop: false },
  { id: 'spell_simple_exit', label: 'Spell Simple Exit', category: 'weapon', duration: 1.2, loop: false },
  { id: 'spell_simple_idle_loop', label: 'Spell Simple Idle Loop', category: 'weapon', duration: 2.2, loop: true },
  { id: 'spell_simple_shoot', label: 'Spell Simple Shoot', category: 'weapon', duration: 1.3, loop: false, hasTransitionArrow: true },
  { id: 'sprint_loop', label: 'Sprint Loop', category: 'locomotion', duration: 1.1, loop: true, hasTransitionArrow: true },
  { id: 'swim_fwd_loop', label: 'Swim Fwd Loop', category: 'locomotion', duration: 2.0, loop: true },
  { id: 'swim_idle_loop', label: 'Swim Idle Loop', category: 'locomotion', duration: 2.4, loop: true, hasTransitionArrow: true },
  { id: 'sword_attack', label: 'Sword Attack', category: 'weapon', duration: 1.3, loop: false },
  { id: 'sword_block', label: 'Sword Block', category: 'weapon', duration: 1.6, loop: true, hasTransitionArrow: true },
  { id: 'sword_dash', label: 'Sword Dash', category: 'weapon', duration: 1.3, loop: false, hasTransitionArrow: true },
  { id: 'sword_heavy_combo', label: 'Sword Heavy Combo', category: 'weapon', duration: 2.4, loop: false },
  { id: 'sword_idle', label: 'Sword Idle', category: 'weapon', duration: 2.2, loop: true, hasTransitionArrow: true },
  { id: 'sword_regular_a', label: 'Sword Regular A', category: 'weapon', duration: 1.1, loop: false, hasTransitionArrow: true },
  { id: 'sword_regular_a_rec', label: 'Sword Regular A Rec', category: 'weapon', duration: 0.9, loop: false, hasTransitionArrow: true },
  { id: 'sword_regular_b', label: 'Sword Regular B', category: 'weapon', duration: 1.1, loop: false, hasTransitionArrow: true },
  { id: 'sword_regular_b_rec', label: 'Sword Regular B Rec', category: 'weapon', duration: 0.9, loop: false, hasTransitionArrow: true },
  { id: 'sword_regular_c', label: 'Sword Regular C', category: 'weapon', duration: 1.2, loop: false, hasTransitionArrow: true },
  { id: 'sword_regular_combo', label: 'Sword Regular Combo', category: 'weapon', duration: 2.5, loop: false },
  { id: 'treechopping_loop', label: 'Treechopping Loop', category: 'interaction', duration: 1.9, loop: true, hasTransitionArrow: true },
  { id: 'walk_carry_loop', label: 'Walk Carry Loop', category: 'locomotion', duration: 2.2, loop: true, hasTransitionArrow: true },
  { id: 'walk_formal_loop', label: 'Walk Formal Loop', category: 'locomotion', duration: 2.3, loop: true, hasTransitionArrow: true },
  { id: 'walk_loop', label: 'Walk Loop', category: 'locomotion', duration: 2.2, loop: true },
  { id: 'yes', label: 'Yes', category: 'idle', duration: 1.6, loop: false },
  { id: 'zombie_idle_loop', label: 'Zombie Idle Loop', category: 'zombie', duration: 2.6, loop: true },
  { id: 'zombie_scratch', label: 'Zombie Scratch', category: 'zombie', duration: 1.6, loop: false, hasTransitionArrow: true },
  { id: 'zombie_walk_fwd_loop', label: 'Zombie Walk Fwd Loop', category: 'zombie', duration: 2.4, loop: true },
];

type PoseVec = [number, number, number];
interface KeyPoseFrame {
  t: number; // normalized [0..1]
  pelvisPos?: PoseVec;
  pelvisRot?: PoseVec;
  spine?: PoseVec;
  chest?: PoseVec;
  neck?: PoseVec;
  head?: PoseVec;
  armL?: PoseVec;
  forearmL?: PoseVec;
  armR?: PoseVec;
  forearmR?: PoseVec;
  thighL?: PoseVec;
  shinL?: PoseVec;
  thighR?: PoseVec;
  shinR?: PoseVec;
}

function getPoseScript(id: string): KeyPoseFrame[] {
  switch (id) {
    case 'chest_open':
      return [
        { t: 0, pelvisPos: [0, 0, 0], armL: [0.05, 0, -0.15], armR: [0.05, 0, 0.15] },
        { t: 0.22, pelvisPos: [0, -0.12, 0.06], spine: [0.36, 0, 0], chest: [0.22, 0, 0], head: [0.16, 0, 0], armL: [-0.95, 0.25, -0.15], forearmL: [-0.45, 0, 0], armR: [-0.95, -0.25, 0.15], forearmR: [-0.45, 0, 0], thighL: [-0.55, 0, -0.05], shinL: [0.88, 0, 0], thighR: [-0.46, 0, 0.05], shinR: [0.76, 0, 0] },
        { t: 0.48, pelvisPos: [0, -0.14, 0.09], spine: [0.42, 0, 0], chest: [0.18, 0, 0], head: [0.14, 0, 0], armL: [-1.08, 0.22, -0.12], forearmL: [-0.62, 0, 0], armR: [-1.08, -0.22, 0.12], forearmR: [-0.62, 0, 0], thighL: [-0.62, 0, -0.05], shinL: [0.98, 0, 0], thighR: [-0.52, 0, 0.05], shinR: [0.85, 0, 0] },
        { t: 0.72, pelvisPos: [0, -0.03, 0.05], spine: [0.1, 0, 0], chest: [-0.1, 0, 0], head: [0.18, 0.09, 0], armL: [-1.42, 0.18, -0.22], forearmL: [-0.65, 0, 0], armR: [-1.42, -0.18, 0.22], forearmR: [-0.65, 0, 0], thighL: [-0.18, 0, -0.04], shinL: [0.32, 0, 0], thighR: [-0.14, 0, 0.04], shinR: [0.24, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0, 0], armL: [0.05, 0, -0.15], armR: [0.05, 0, 0.15] },
      ];
    case 'climbup_1m':
      return [
        { t: 0, pelvisPos: [0, 0, 0], armL: [0.04, 0, -0.15], armR: [0.04, 0, 0.15] },
        { t: 0.25, pelvisPos: [0, 0.06, 0.04], spine: [0.15, 0, 0], armL: [-2.1, 0.1, -0.15], forearmL: [-0.4, 0, 0], armR: [-2.1, -0.1, 0.15], forearmR: [-0.4, 0, 0], thighL: [-0.65, 0, 0], shinL: [0.95, 0, 0] },
        { t: 0.55, pelvisPos: [0, 0.26, 0.12], spine: [0.35, 0, 0], armL: [-0.45, 0, -0.25], forearmL: [-1.2, 0, 0], armR: [-0.45, 0, 0.25], forearmR: [-1.2, 0, 0], thighL: [-0.9, 0, 0], shinL: [1.35, 0, 0], thighR: [0.15, 0, 0], shinR: [0.55, 0, 0] },
        { t: 0.82, pelvisPos: [0, 0.34, 0.18], spine: [0.12, 0, 0], armL: [0.2, 0, -0.2], armR: [0.2, 0, 0.2], thighL: [-0.2, 0, 0], shinL: [0.3, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0, 0], armL: [0.04, 0, -0.15], armR: [0.04, 0, 0.15] },
      ];
    case 'consume':
      return [
        { t: 0, armL: [0.04, 0, -0.15], armR: [0.04, 0, 0.15] },
        { t: 0.3, head: [0.12, 0, 0], armR: [-0.85, -0.35, 0.2], forearmR: [-1.35, 0, 0], armL: [0.1, 0, -0.18] },
        { t: 0.55, head: [-0.28, 0, 0], chest: [-0.08, 0, 0], armR: [-1.15, -0.4, 0.15], forearmR: [-1.45, 0, 0] },
        { t: 0.8, head: [-0.15, 0.06, 0], armR: [-0.65, -0.2, 0.2], forearmR: [-0.95, 0, 0] },
        { t: 1.0, armL: [0.04, 0, -0.15], armR: [0.04, 0, 0.15] },
      ];
    case 'crouch_fwd_loop':
      return [
        { t: 0, pelvisPos: [0, -0.22, 0], spine: [0.34, -0.06, 0], thighL: [-0.82, 0, 0], shinL: [1.15, 0, 0], thighR: [-0.22, 0, 0], shinR: [0.82, 0, 0], armL: [0.25, 0, -0.22], forearmL: [-0.7, 0, 0], armR: [-0.35, 0, 0.22], forearmR: [-0.7, 0, 0] },
        { t: 0.5, pelvisPos: [0, -0.2, 0], spine: [0.34, 0.06, 0], thighL: [-0.22, 0, 0], shinL: [0.82, 0, 0], thighR: [-0.82, 0, 0], shinR: [1.15, 0, 0], armL: [-0.35, 0, -0.22], forearmL: [-0.7, 0, 0], armR: [0.25, 0, 0.22], forearmR: [-0.7, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.22, 0], spine: [0.34, -0.06, 0], thighL: [-0.82, 0, 0], shinL: [1.15, 0, 0], thighR: [-0.22, 0, 0], shinR: [0.82, 0, 0], armL: [0.25, 0, -0.22], forearmL: [-0.7, 0, 0], armR: [-0.35, 0, 0.22], forearmR: [-0.7, 0, 0] },
      ];
    case 'crouch_idle_loop':
      return [
        { t: 0, pelvisPos: [0, -0.24, 0], spine: [0.32, 0, 0], thighL: [-0.65, 0, -0.08], shinL: [1.1, 0, 0], thighR: [-0.55, 0, 0.08], shinR: [1.0, 0, 0], armL: [-0.2, 0.2, -0.22], forearmL: [-0.85, 0, 0], armR: [-0.2, -0.2, 0.22], forearmR: [-0.85, 0, 0] },
        { t: 0.5, pelvisPos: [0, -0.22, 0], spine: [0.28, 0.05, 0], head: [0, 0.12, 0], thighL: [-0.62, 0, -0.08], shinL: [1.05, 0, 0], thighR: [-0.52, 0, 0.08], shinR: [0.95, 0, 0], armL: [-0.24, 0.2, -0.2], forearmL: [-0.8, 0, 0], armR: [-0.24, -0.2, 0.2], forearmR: [-0.8, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.24, 0], spine: [0.32, 0, 0], thighL: [-0.65, 0, -0.08], shinL: [1.1, 0, 0], thighR: [-0.55, 0, 0.08], shinR: [1.0, 0, 0], armL: [-0.2, 0.2, -0.22], forearmL: [-0.85, 0, 0], armR: [-0.2, -0.2, 0.22], forearmR: [-0.85, 0, 0] },
      ];
    case 'dance_loop':
      return [
        { t: 0, pelvisPos: [0, -0.04, 0], pelvisRot: [0, 0, -0.08], chest: [0, 0.15, 0.08], armL: [-0.45, 0, -0.95], forearmL: [-0.95, 0, 0], armR: [0.15, 0, 0.55], forearmR: [-0.7, 0, 0], thighL: [-0.22, 0, -0.08], shinL: [0.38, 0, 0] },
        { t: 0.25, pelvisPos: [0, 0.03, 0], pelvisRot: [0, 0, 0], chest: [-0.06, 0, 0], head: [0.08, 0, 0.06], armL: [-0.25, 0, -0.55], forearmL: [-0.6, 0, 0], armR: [-0.25, 0, 0.55], forearmR: [-0.6, 0, 0] },
        { t: 0.5, pelvisPos: [0, -0.04, 0], pelvisRot: [0, 0, 0.08], chest: [0, -0.15, -0.08], armL: [0.15, 0, -0.55], forearmL: [-0.7, 0, 0], armR: [-0.45, 0, 0.95], forearmR: [-0.95, 0, 0], thighR: [-0.22, 0, 0.08], shinR: [0.38, 0, 0] },
        { t: 0.75, pelvisPos: [0, 0.03, 0], pelvisRot: [0, 0, 0], chest: [-0.06, 0, 0], head: [0.08, 0, -0.06], armL: [-0.3, 0, -0.7], forearmL: [-0.75, 0, 0], armR: [-0.3, 0, 0.7], forearmR: [-0.75, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.04, 0], pelvisRot: [0, 0, -0.08], chest: [0, 0.15, 0.08], armL: [-0.45, 0, -0.95], forearmL: [-0.95, 0, 0], armR: [0.15, 0, 0.55], forearmR: [-0.7, 0, 0], thighL: [-0.22, 0, -0.08], shinL: [0.38, 0, 0] },
      ];
    case 'death01':
      return [
        { t: 0, pelvisPos: [0, 0, 0] },
        { t: 0.3, pelvisPos: [0, -0.15, -0.05], pelvisRot: [-0.25, 0, 0.1], chest: [-0.35, 0.18, 0], head: [-0.3, 0, 0], armL: [-0.5, 0, -0.65], armR: [-0.5, 0, 0.65], thighL: [0.18, 0, 0], shinL: [0.45, 0, 0] },
        { t: 0.65, pelvisPos: [0, -0.55, -0.25], pelvisRot: [-1.1, 0, 0.12], chest: [-0.25, 0, 0], armL: [-0.2, 0, -0.85], armR: [-0.2, 0, 0.85], thighL: [0.15, 0, -0.1], thighR: [0.1, 0, 0.1] },
        { t: 1.0, pelvisPos: [0, -0.78, -0.45], pelvisRot: [-1.52, 0, 0.15], chest: [0, 0, 0], armL: [0.15, 0, -1.05], armR: [0.25, 0, 0.95], thighL: [0.05, 0, -0.15], thighR: [-0.05, 0, 0.12] },
      ];
    case 'driving_loop':
      return [
        { t: 0, pelvisPos: [0, -0.32, 0], spine: [0.1, 0, 0], thighL: [-1.35, 0, -0.08], shinL: [1.35, 0, 0], thighR: [-1.35, 0, 0.08], shinR: [1.35, 0, 0], armL: [-0.95, 0.25, -0.1], forearmL: [-0.55, 0, 0], armR: [-0.95, -0.25, 0.1], forearmR: [-0.55, 0, 0] },
        { t: 0.33, pelvisPos: [0, -0.32, 0], chest: [0, 0, 0.04], armL: [-0.88, 0.25, -0.18], forearmL: [-0.55, 0, 0], armR: [-1.02, -0.25, 0.05], forearmR: [-0.55, 0, 0], thighL: [-1.35, 0, -0.08], shinL: [1.35, 0, 0], thighR: [-1.35, 0, 0.08], shinR: [1.35, 0, 0] },
        { t: 0.66, pelvisPos: [0, -0.32, 0], chest: [0, 0, -0.04], armL: [-1.02, 0.25, -0.05], forearmL: [-0.55, 0, 0], armR: [-0.88, -0.25, 0.18], forearmR: [-0.55, 0, 0], thighL: [-1.35, 0, -0.08], shinL: [1.35, 0, 0], thighR: [-1.35, 0, 0.08], shinR: [1.35, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.32, 0], spine: [0.1, 0, 0], thighL: [-1.35, 0, -0.08], shinL: [1.35, 0, 0], thighR: [-1.35, 0, 0.08], shinR: [1.35, 0, 0], armL: [-0.95, 0.25, -0.1], forearmL: [-0.55, 0, 0], armR: [-0.95, -0.25, 0.1], forearmR: [-0.55, 0, 0] },
      ];
    case 'farm_harvest':
    case 'farm_plantseed':
      return [
        { t: 0, pelvisPos: [0, 0, 0] },
        { t: 0.3, pelvisPos: [0, -0.18, 0.04], spine: [0.48, 0, 0], chest: [0.22, 0, 0], thighL: [-0.65, 0, 0], shinL: [1.05, 0, 0], thighR: [-0.55, 0, 0], shinR: [0.95, 0, 0], armL: [-0.85, 0.15, -0.12], forearmL: [-0.35, 0, 0], armR: [-0.95, -0.15, 0.12], forearmR: [-0.3, 0, 0] },
        { t: 0.65, pelvisPos: [0, -0.16, 0.04], spine: [0.42, 0.12, 0], chest: [0.15, -0.12, 0], thighL: [-0.62, 0, 0], shinL: [1.0, 0, 0], thighR: [-0.52, 0, 0], shinR: [0.9, 0, 0], armL: [-0.7, 0.2, -0.2], armR: [-1.15, -0.2, 0.1] },
        { t: 1.0, pelvisPos: [0, 0, 0] },
      ];
    case 'farm_watering':
      return [
        { t: 0, pelvisPos: [0, 0, 0] },
        { t: 0.25, spine: [0.16, -0.12, 0], armR: [-0.65, -0.15, 0.25], forearmR: [-0.75, 0, 0], armL: [0.1, 0, -0.2] },
        { t: 0.55, spine: [0.2, 0.18, 0], armR: [-0.78, 0.15, 0.35], forearmR: [-0.65, 0, 0.2], armL: [0.1, 0, -0.22] },
        { t: 1.0, pelvisPos: [0, 0, 0] },
      ];
    case 'fixing_kneeling':
      return [
        { t: 0, pelvisPos: [0, -0.34, 0], spine: [0.35, 0, 0], thighL: [-1.1, 0, -0.06], shinL: [1.75, 0, 0], thighR: [-0.45, 0, 0.06], shinR: [1.45, 0, 0], armL: [-0.85, 0.2, -0.12], forearmL: [-0.65, 0, 0], armR: [-0.95, -0.2, 0.12], forearmR: [-0.55, 0, 0] },
        { t: 0.5, pelvisPos: [0, -0.34, 0], spine: [0.38, 0.08, 0], armL: [-0.9, 0.2, -0.12], forearmL: [-0.45, 0, 0], armR: [-0.75, -0.2, 0.12], forearmR: [-0.95, 0, 0], thighL: [-1.1, 0, -0.06], shinL: [1.75, 0, 0], thighR: [-0.45, 0, 0.06], shinR: [1.45, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.34, 0], spine: [0.35, 0, 0], thighL: [-1.1, 0, -0.06], shinL: [1.75, 0, 0], thighR: [-0.45, 0, 0.06], shinR: [1.45, 0, 0], armL: [-0.85, 0.2, -0.12], forearmL: [-0.65, 0, 0], armR: [-0.95, -0.2, 0.12], forearmR: [-0.55, 0, 0] },
      ];
    case 'hit_chest':
    case 'hit_knockback':
      return [
        { t: 0, pelvisPos: [0, 0, 0] },
        { t: 0.25, pelvisPos: [0, -0.05, -0.09], spine: [-0.35, 0.12, 0], chest: [-0.28, 0, 0], head: [-0.35, 0, 0], armL: [-0.45, 0, -0.55], armR: [-0.45, 0, 0.55], thighL: [-0.18, 0, 0], thighR: [0.22, 0, 0] },
        { t: 0.65, pelvisPos: [0, -0.02, -0.04], spine: [-0.12, 0, 0], armL: [-0.1, 0, -0.3], armR: [-0.1, 0, 0.3] },
        { t: 1.0, pelvisPos: [0, 0, 0] },
      ];
    case 'hit_head':
      return [
        { t: 0, head: [0, 0, 0] },
        { t: 0.22, spine: [-0.18, -0.15, 0], head: [-0.55, -0.35, 0.15], armR: [-0.65, 0, 0.45], forearmR: [-1.1, 0, 0] },
        { t: 0.65, head: [-0.18, -0.1, 0.05], armR: [-0.25, 0, 0.25] },
        { t: 1.0, head: [0, 0, 0] },
      ];
    case 'idle_foldarms_loop':
      return [
        { t: 0, armL: [-0.42, 0.55, -0.15], forearmL: [-1.35, 0, -0.35], armR: [-0.42, -0.55, 0.15], forearmR: [-1.35, 0, 0.35], chest: [0.02, 0, 0] },
        { t: 0.5, armL: [-0.45, 0.55, -0.15], forearmL: [-1.35, 0, -0.35], armR: [-0.45, -0.55, 0.15], forearmR: [-1.35, 0, 0.35], head: [0.04, 0.12, 0], chest: [-0.03, 0, 0] },
        { t: 1.0, armL: [-0.42, 0.55, -0.15], forearmL: [-1.35, 0, -0.35], armR: [-0.42, -0.55, 0.15], forearmR: [-1.35, 0, 0.35], chest: [0.02, 0, 0] },
      ];
    case 'idle_lantern_loop':
    case 'idle_torch_loop':
      return [
        { t: 0, armR: [-0.75, -0.1, 0.22], forearmR: [-0.95, 0, 0], armL: [0.05, 0, -0.18], head: [0.02, 0.1, 0] },
        { t: 0.5, armR: [-0.82, 0.08, 0.28], forearmR: [-0.88, 0, 0], armL: [0.05, 0, -0.18], head: [0.04, -0.14, 0], chest: [0.03, -0.06, 0] },
        { t: 1.0, armR: [-0.75, -0.1, 0.22], forearmR: [-0.95, 0, 0], armL: [0.05, 0, -0.18], head: [0.02, 0.1, 0] },
      ];
    case 'idle_talking_loop':
    case 'idle_talkingphone_loop':
      return [
        { t: 0, head: [0.04, 0.08, 0.04], armR: id === 'idle_talkingphone_loop' ? [-0.85, -0.35, 0.35] : [-0.45, 0, 0.3], forearmR: id === 'idle_talkingphone_loop' ? [-1.65, 0, 0] : [-0.95, 0, 0], armL: [-0.2, 0, -0.25], forearmL: [-0.7, 0, 0] },
        { t: 0.5, head: [-0.05, -0.1, -0.04], chest: [0.03, 0.08, 0], armR: id === 'idle_talkingphone_loop' ? [-0.88, -0.35, 0.35] : [-0.65, 0.15, 0.4], forearmR: id === 'idle_talkingphone_loop' ? [-1.68, 0, 0] : [-1.15, 0, 0], armL: [-0.45, -0.1, -0.32], forearmL: [-0.95, 0, 0] },
        { t: 1.0, head: [0.04, 0.08, 0.04], armR: id === 'idle_talkingphone_loop' ? [-0.85, -0.35, 0.35] : [-0.45, 0, 0.3], forearmR: id === 'idle_talkingphone_loop' ? [-1.65, 0, 0] : [-0.95, 0, 0], armL: [-0.2, 0, -0.25], forearmL: [-0.7, 0, 0] },
      ];
    case 'idle_rail_call':
    case 'idle_rail_loop':
      return [
        { t: 0, spine: [0.14, 0, 0], armL: [-0.75, 0.15, -0.15], forearmL: [-0.45, 0, 0], armR: [-0.75, -0.15, 0.15], forearmR: [-0.45, 0, 0] },
        { t: 0.5, spine: [0.16, 0.05, 0], head: [0, 0.15, 0], armL: [-0.78, 0.15, -0.15], forearmL: [-0.45, 0, 0], armR: id === 'idle_rail_call' ? [-1.45, 0, 0.65] : [-0.78, -0.15, 0.15], forearmR: [-0.45, 0, 0] },
        { t: 1.0, spine: [0.14, 0, 0], armL: [-0.75, 0.15, -0.15], forearmL: [-0.45, 0, 0], armR: [-0.75, -0.15, 0.15], forearmR: [-0.45, 0, 0] },
      ];
    case 'idle_no_loop':
      return [
        { t: 0, head: [0, 0, 0] },
        { t: 0.25, head: [0, -0.38, 0] },
        { t: 0.5, head: [0, 0.38, 0] },
        { t: 0.75, head: [0, -0.25, 0] },
        { t: 1.0, head: [0, 0, 0] },
      ];
    case 'yes':
      return [
        { t: 0, head: [0, 0, 0] },
        { t: 0.25, head: [0.35, 0, 0] },
        { t: 0.5, head: [-0.1, 0, 0] },
        { t: 0.75, head: [0.3, 0, 0] },
        { t: 1.0, head: [0, 0, 0] },
      ];
    case 'interact':
    case 'pickup_table':
      return [
        { t: 0, armR: [0.05, 0, 0.15] },
        { t: 0.4, spine: [0.18, -0.1, 0], armR: [-1.1, -0.15, 0.15], forearmR: [-0.35, 0, 0] },
        { t: 0.7, spine: [0.08, 0, 0], armR: [-0.75, -0.25, 0.2], forearmR: [-0.95, 0, 0] },
        { t: 1.0, armR: [0.05, 0, 0.15] },
      ];
    case 'jog_fwd_loop':
    case 'walk_loop':
    case 'walk_formal_loop':
    case 'walk_carry_loop': {
      const carry = id === 'walk_carry_loop';
      const jog = id === 'jog_fwd_loop';
      const formal = id === 'walk_formal_loop';
      const armSwing = carry ? 0.08 : jog ? 0.55 : formal ? 0.16 : 0.36;
      const legSwing = jog ? 0.52 : 0.34;
      const kneeBend = jog ? 0.75 : 0.42;
      const bob = jog ? 0.05 : 0.024;
      return [
        {
          t: 0,
          pelvisPos: [0, 0, 0],
          spine: [jog ? 0.12 : 0.03, -0.07, 0],
          armL: carry ? [-0.85, 0.25, -0.15] : [armSwing, 0, -0.18],
          forearmL: carry ? [-0.95, 0, 0] : [jog ? -0.8 : -0.25, 0, 0],
          armR: carry ? [-0.85, -0.25, 0.15] : [-armSwing, 0, 0.18],
          forearmR: carry ? [-0.95, 0, 0] : [jog ? -0.8 : -0.2, 0, 0],
          thighL: [-legSwing, 0, 0],
          shinL: [0.15, 0, 0],
          thighR: [legSwing, 0, 0],
          shinR: [0.08, 0, 0],
        },
        {
          t: 0.25,
          pelvisPos: [0, bob, 0],
          spine: [jog ? 0.14 : 0.03, 0, 0],
          armL: carry ? [-0.85, 0.25, -0.15] : [0, 0, -0.18],
          forearmL: carry ? [-0.95, 0, 0] : [jog ? -0.9 : -0.4, 0, 0],
          armR: carry ? [-0.85, -0.25, 0.15] : [0, 0, 0.18],
          forearmR: carry ? [-0.95, 0, 0] : [jog ? -0.9 : -0.4, 0, 0],
          thighL: [0, 0, 0],
          shinL: [kneeBend, 0, 0],
          thighR: [0, 0, 0],
          shinR: [0.2, 0, 0],
        },
        {
          t: 0.5,
          pelvisPos: [0, 0, 0],
          spine: [jog ? 0.12 : 0.03, 0.07, 0],
          armL: carry ? [-0.85, 0.25, -0.15] : [-armSwing, 0, -0.18],
          forearmL: carry ? [-0.95, 0, 0] : [jog ? -0.8 : -0.2, 0, 0],
          armR: carry ? [-0.85, -0.25, 0.15] : [armSwing, 0, 0.18],
          forearmR: carry ? [-0.95, 0, 0] : [jog ? -0.8 : -0.25, 0, 0],
          thighL: [legSwing, 0, 0],
          shinL: [0.08, 0, 0],
          thighR: [-legSwing, 0, 0],
          shinR: [0.15, 0, 0],
        },
        {
          t: 0.75,
          pelvisPos: [0, bob, 0],
          spine: [jog ? 0.14 : 0.03, 0, 0],
          armL: carry ? [-0.85, 0.25, -0.15] : [0, 0, -0.18],
          forearmL: carry ? [-0.95, 0, 0] : [jog ? -0.9 : -0.4, 0, 0],
          armR: carry ? [-0.85, -0.25, 0.15] : [0, 0, 0.18],
          forearmR: carry ? [-0.95, 0, 0] : [jog ? -0.9 : -0.4, 0, 0],
          thighL: [0, 0, 0],
          shinL: [0.2, 0, 0],
          thighR: [0, 0, 0],
          shinR: [kneeBend, 0, 0],
        },
        {
          t: 1.0,
          pelvisPos: [0, 0, 0],
          spine: [jog ? 0.12 : 0.03, -0.07, 0],
          armL: carry ? [-0.85, 0.25, -0.15] : [armSwing, 0, -0.18],
          forearmL: carry ? [-0.95, 0, 0] : [jog ? -0.8 : -0.25, 0, 0],
          armR: carry ? [-0.85, -0.25, 0.15] : [-armSwing, 0, 0.18],
          forearmR: carry ? [-0.95, 0, 0] : [jog ? -0.8 : -0.2, 0, 0],
          thighL: [-legSwing, 0, 0],
          shinL: [0.15, 0, 0],
          thighR: [legSwing, 0, 0],
          shinR: [0.08, 0, 0],
        },
      ];
    }
    case 'sprint_loop':
      return [
        { t: 0, pelvisPos: [0, -0.03, 0], spine: [0.25, -0.14, 0], armL: [0.78, 0, -0.22], forearmL: [-1.05, 0, 0], armR: [-0.75, 0, 0.22], forearmR: [-1.05, 0, 0], thighL: [-0.72, 0, 0], shinL: [0.28, 0, 0], thighR: [0.68, 0, 0], shinR: [0.95, 0, 0] },
        { t: 0.5, pelvisPos: [0, 0.07, 0], spine: [0.25, 0.14, 0], armL: [-0.75, 0, -0.22], forearmL: [-1.05, 0, 0], armR: [0.78, 0, 0.22], forearmR: [-1.05, 0, 0], thighL: [0.68, 0, 0], shinL: [0.95, 0, 0], thighR: [-0.72, 0, 0], shinR: [0.28, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.03, 0], spine: [0.25, -0.14, 0], armL: [0.78, 0, -0.22], forearmL: [-1.05, 0, 0], armR: [-0.75, 0, 0.22], forearmR: [-1.05, 0, 0], thighL: [-0.72, 0, 0], shinL: [0.28, 0, 0], thighR: [0.68, 0, 0], shinR: [0.95, 0, 0] },
      ];
    case 'jump_start':
    case 'ninjajump_start':
      return [
        { t: 0, pelvisPos: [0, 0, 0] },
        { t: 0.4, pelvisPos: [0, -0.18, 0], spine: [0.28, 0, 0], armL: [0.65, 0, -0.25], armR: [0.65, 0, 0.25], thighL: [-0.65, 0, 0], shinL: [1.05, 0, 0], thighR: [-0.65, 0, 0], shinR: [1.05, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0.26, 0.04], spine: [id === 'ninjajump_start' ? 0.35 : -0.08, 0, 0], armL: [-1.4, 0, -0.45], armR: [-1.4, 0, 0.45], thighL: [-0.45, 0, 0], shinL: [0.85, 0, 0], thighR: [0.15, 0, 0], shinR: [0.3, 0, 0] },
      ];
    case 'jump_loop':
    case 'ninjajump_idle_loop': {
      const ninja = id === 'ninjajump_idle_loop';
      return [
        { t: 0, pelvisPos: [0, 0.24, 0], spine: [ninja ? 0.35 : 0.05, 0, 0], armL: ninja ? [0.65, 0, -0.65] : [-1.15, 0, -0.5], armR: ninja ? [0.65, 0, 0.65] : [-1.15, 0, 0.5], thighL: [-0.65, 0, 0], shinL: [1.1, 0, 0], thighR: [-0.25, 0, 0], shinR: [0.6, 0, 0] },
        { t: 0.5, pelvisPos: [0, 0.28, 0], spine: [ninja ? 0.38 : 0.08, 0, 0], armL: ninja ? [0.7, 0, -0.7] : [-1.25, 0, -0.58], armR: ninja ? [0.7, 0, 0.7] : [-1.25, 0, 0.58], thighL: [-0.6, 0, 0], shinL: [1.0, 0, 0], thighR: [-0.3, 0, 0], shinR: [0.65, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0.24, 0], spine: [ninja ? 0.35 : 0.05, 0, 0], armL: ninja ? [0.65, 0, -0.65] : [-1.15, 0, -0.5], armR: ninja ? [0.65, 0, 0.65] : [-1.15, 0, 0.5], thighL: [-0.65, 0, 0], shinL: [1.1, 0, 0], thighR: [-0.25, 0, 0], shinR: [0.6, 0, 0] },
      ];
    }
    case 'jump_land':
    case 'ninjajump_land':
      return [
        { t: 0, pelvisPos: [0, 0.14, 0], thighL: [-0.35, 0, 0], shinL: [0.55, 0, 0] },
        { t: 0.4, pelvisPos: [0, -0.22, 0.04], spine: [0.38, 0, 0], armL: [0.35, 0, -0.45], armR: [-0.75, 0, 0.25], thighL: [-0.78, 0, -0.06], shinL: [1.25, 0, 0], thighR: [-0.72, 0, 0.06], shinR: [1.18, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0, 0] },
      ];
    case 'laytoidle':
      return [
        { t: 0, pelvisPos: [0, -0.75, -0.3], pelvisRot: [-1.48, 0, 0] },
        { t: 0.45, pelvisPos: [0, -0.45, -0.1], pelvisRot: [-0.65, 0, 0], spine: [0.45, 0, 0], armL: [-0.85, 0, -0.2], armR: [-0.85, 0, 0.2], thighL: [-0.85, 0, 0], shinL: [1.2, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0, 0], pelvisRot: [0, 0, 0] },
      ];
    case 'melee_hook':
    case 'melee_hook_rec':
    case 'punch_cross':
    case 'punch_jab': {
      const isLeft = id === 'punch_jab';
      const isHook = id.startsWith('melee_hook');
      return [
        { t: 0, spine: [0.08, 0, 0], armL: [-0.65, 0.35, -0.2], forearmL: [-1.35, 0, 0], armR: [-0.65, -0.35, 0.2], forearmR: [-1.35, 0, 0] },
        {
          t: 0.38,
          pelvisPos: [0, -0.04, 0.06],
          spine: [0.14, isLeft ? 0.38 : -0.45, 0],
          armL: isLeft ? [-1.45, 0.1, -0.1] : [-0.55, 0.35, -0.22],
          forearmL: isLeft ? [-0.12, 0, 0] : [-1.45, 0, 0],
          armR: isLeft ? [-0.55, -0.35, 0.22] : [-1.45, isHook ? -0.55 : 0.1, isHook ? 0.55 : 0.1],
          forearmR: isLeft ? [-1.45, 0, 0] : [isHook ? -1.15 : -0.12, 0, 0],
        },
        { t: 1.0, spine: [0.08, 0, 0], armL: [-0.65, 0.35, -0.2], forearmL: [-1.35, 0, 0], armR: [-0.65, -0.35, 0.2], forearmR: [-1.35, 0, 0] },
      ];
    }
    case 'overhandthrow':
      return [
        { t: 0, armR: [0.05, 0, 0.15] },
        { t: 0.35, spine: [-0.15, -0.45, 0], armR: [-2.4, 0, 0.45], forearmR: [-0.75, 0, 0], thighL: [-0.25, 0, 0] },
        { t: 0.65, spine: [0.25, 0.48, 0], armR: [-0.55, 0.3, 0.15], forearmR: [-0.15, 0, 0], thighL: [-0.4, 0, 0], shinL: [0.55, 0, 0] },
        { t: 1.0, armR: [0.05, 0, 0.15] },
      ];
    case 'pistol_aim_down':
    case 'pistol_aim_neutral':
    case 'pistol_aim_up':
    case 'pistol_idle_loop':
    case 'pistol_reload':
    case 'pistol_shoot':
    case 'fps_test': {
      const pitch = id === 'pistol_aim_up' ? -0.48 : id === 'pistol_aim_down' ? 0.45 : 0;
      const recoil = id === 'pistol_shoot' ? -0.28 : 0;
      if (id === 'pistol_reload') {
        return [
          { t: 0, armR: [-1.25, -0.18, 0.15], forearmR: [-0.25, 0, 0], armL: [-0.95, 0.35, -0.15], forearmL: [-0.7, 0, 0] },
          { t: 0.45, spine: [0.08, 0.12, 0], armR: [-0.85, -0.25, 0.2], forearmR: [-0.95, 0, 0], armL: [-0.45, 0.35, -0.15], forearmL: [-1.15, 0, 0] },
          { t: 1.0, armR: [-1.25, -0.18, 0.15], forearmR: [-0.25, 0, 0], armL: [-0.95, 0.35, -0.15], forearmL: [-0.7, 0, 0] },
        ];
      }
      return [
        { t: 0, spine: [0.05, -0.22, 0], armR: [-1.3 + pitch, -0.15, 0.12], forearmR: [-0.2, 0, 0], armL: [-1.1 + pitch, 0.42, -0.1], forearmL: [-0.55, 0, 0] },
        { t: 0.45, spine: [0.05, -0.22, 0], armR: [-1.3 + pitch + recoil, -0.15, 0.12], forearmR: [-0.2, 0, 0], armL: [-1.1 + pitch + recoil * 0.7, 0.42, -0.1], forearmL: [-0.55, 0, 0] },
        { t: 1.0, spine: [0.05, -0.22, 0], armR: [-1.3 + pitch, -0.15, 0.12], forearmR: [-0.2, 0, 0], armL: [-1.1 + pitch, 0.42, -0.1], forearmL: [-0.55, 0, 0] },
      ];
    }
    case 'push_loop':
      return [
        { t: 0, pelvisPos: [0, -0.06, 0], spine: [0.34, 0, 0], armL: [-1.18, 0.1, -0.1], armR: [-1.18, -0.1, 0.1], thighL: [-0.45, 0, 0], shinL: [0.65, 0, 0], thighR: [0.32, 0, 0], shinR: [0.15, 0, 0] },
        { t: 0.5, pelvisPos: [0, -0.08, 0.03], spine: [0.38, 0.05, 0], armL: [-1.24, 0.1, -0.1], armR: [-1.24, -0.1, 0.1], thighL: [0.32, 0, 0], shinL: [0.15, 0, 0], thighR: [-0.45, 0, 0], shinR: [0.65, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.06, 0], spine: [0.34, 0, 0], armL: [-1.18, 0.1, -0.1], armR: [-1.18, -0.1, 0.1], thighL: [-0.45, 0, 0], shinL: [0.65, 0, 0], thighR: [0.32, 0, 0], shinR: [0.15, 0, 0] },
      ];
    case 'roll':
      return [
        { t: 0, pelvisPos: [0, 0, 0] },
        { t: 0.28, pelvisPos: [0, -0.26, 0.12], pelvisRot: [0.95, 0, 0], spine: [0.65, 0, 0], armL: [-0.9, 0.3, -0.15], armR: [-0.9, -0.3, 0.15], thighL: [-0.95, 0, 0], shinL: [1.45, 0, 0] },
        { t: 0.65, pelvisPos: [0, -0.22, 0.22], pelvisRot: [2.2, 0, 0], spine: [0.65, 0, 0], thighL: [-0.95, 0, 0], shinL: [1.45, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0, 0], pelvisRot: [0, 0, 0] },
      ];
    case 'idle_shield_loop':
    case 'idle_shield_break':
    case 'shield_dash':
    case 'shield_oneshot':
      return [
        { t: 0, pelvisPos: [0, -0.06, 0], spine: [0.12, 0.2, 0], armL: [-0.88, 0.62, -0.25], forearmL: [-1.15, 0, 0.28], armR: [0.22, -0.15, 0.25], thighL: [-0.35, 0, 0], shinL: [0.52, 0, 0] },
        {
          t: 0.45,
          pelvisPos: [0, -0.08, id === 'shield_dash' ? 0.16 : -0.04],
          spine: [id === 'idle_shield_break' ? -0.32 : 0.22, id === 'idle_shield_break' ? -0.35 : 0.24, 0],
          armL: id === 'idle_shield_break' ? [-0.3, -0.4, -0.85] : [-1.05, 0.55, -0.2],
          forearmL: id === 'idle_shield_break' ? [-0.3, 0, 0] : [-1.2, 0, 0.25],
          armR: [0.28, -0.15, 0.3],
          thighL: [-0.45, 0, 0],
          shinL: [0.65, 0, 0],
        },
        { t: 1.0, pelvisPos: [0, -0.06, 0], spine: [0.12, 0.2, 0], armL: [-0.88, 0.62, -0.25], forearmL: [-1.15, 0, 0.28], armR: [0.22, -0.15, 0.25], thighL: [-0.35, 0, 0], shinL: [0.52, 0, 0] },
      ];
    case 'sitting_enter':
    case 'sitting_exit':
    case 'sitting_idle_loop':
    case 'sitting_talking_loop': {
      const seated: KeyPoseFrame = {
        t: 0.5,
        pelvisPos: [0, -0.34, -0.04],
        spine: [0.06, 0, 0],
        thighL: [-1.45, 0, -0.06],
        shinL: [1.45, 0, 0],
        thighR: [-1.45, 0, 0.06],
        shinR: [1.45, 0, 0],
        armL: [-0.25, 0.1, -0.14],
        forearmL: [-0.75, 0, 0],
        armR: [-0.25, -0.1, 0.14],
        forearmR: [-0.75, 0, 0],
      };
      if (id === 'sitting_enter') return [{ t: 0 }, { ...seated, t: 1.0 }];
      if (id === 'sitting_exit') return [{ ...seated, t: 0 }, { t: 1.0 }];
      const talk = id === 'sitting_talking_loop';
      return [
        { ...seated, t: 0, head: [0.03, 0.08, 0] },
        { ...seated, t: 0.5, head: [-0.04, -0.1, 0], armR: talk ? [-0.65, 0.15, 0.32] : seated.armR, forearmR: talk ? [-1.05, 0, 0] : seated.forearmR },
        { ...seated, t: 1.0, head: [0.03, 0.08, 0] },
      ];
    }
    case 'slide_start':
    case 'slide_loop':
    case 'slide_exit':
      return [
        { t: 0, pelvisPos: [0, -0.28, 0], pelvisRot: [-0.45, 0, 0], spine: [-0.15, 0, 0], thighL: [-1.1, 0, -0.1], shinL: [0.25, 0, 0], thighR: [-0.2, 0, 0.1], shinR: [1.2, 0, 0], armL: [0.2, 0, -0.55], armR: [-0.45, 0, 0.55] },
        { t: 0.5, pelvisPos: [0, -0.32, 0.08], pelvisRot: [-0.52, 0, 0], spine: [-0.18, 0.08, 0], thighL: [-1.15, 0, -0.1], shinL: [0.22, 0, 0], thighR: [-0.25, 0, 0.1], shinR: [1.25, 0, 0], armL: [0.25, 0, -0.65], armR: [-0.55, 0, 0.65] },
        { t: 1.0, pelvisPos: id === 'slide_exit' ? [0, 0, 0] : [0, -0.28, 0], pelvisRot: id === 'slide_exit' ? [0, 0, 0] : [-0.45, 0, 0] },
      ];
    case 'spell_simple_enter':
    case 'spell_simple_exit':
    case 'spell_simple_idle_loop':
    case 'spell_simple_shoot':
      return [
        { t: 0, pelvisPos: [0, -0.04, 0], armL: [-0.85, 0.25, -0.35], forearmL: [-0.55, 0, 0], armR: [-0.85, -0.25, 0.35], forearmR: [-0.55, 0, 0] },
        { t: 0.45, pelvisPos: [0, 0.02, 0], chest: [id === 'spell_simple_shoot' ? 0.18 : -0.08, 0, 0], armL: [-1.35, 0.15, -0.25], forearmL: [-0.2, 0, 0], armR: [-1.35, -0.15, 0.25], forearmR: [-0.2, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.04, 0], armL: [-0.85, 0.25, -0.35], forearmL: [-0.55, 0, 0], armR: [-0.85, -0.25, 0.35], forearmR: [-0.55, 0, 0] },
      ];
    case 'swim_fwd_loop':
    case 'swim_idle_loop': {
      const fwd = id === 'swim_fwd_loop';
      return [
        { t: 0, pelvisPos: [0, 0.15, 0], pelvisRot: [fwd ? 1.25 : 0.25, 0, 0], armL: [-1.9, 0, -0.35], armR: [0.35, 0, 0.35], thighL: [-0.25, 0, 0], thighR: [0.28, 0, 0] },
        { t: 0.5, pelvisPos: [0, 0.18, 0], pelvisRot: [fwd ? 1.25 : 0.25, 0, 0], armL: [0.35, 0, -0.35], armR: [-1.9, 0, 0.35], thighL: [0.28, 0, 0], thighR: [-0.25, 0, 0] },
        { t: 1.0, pelvisPos: [0, 0.15, 0], pelvisRot: [fwd ? 1.25 : 0.25, 0, 0], armL: [-1.9, 0, -0.35], armR: [0.35, 0, 0.35], thighL: [-0.25, 0, 0], thighR: [0.28, 0, 0] },
      ];
    }
    case 'sword_idle':
    case 'sword_block':
    case 'sword_attack':
    case 'sword_dash':
    case 'sword_heavy_combo':
    case 'sword_regular_a':
    case 'sword_regular_a_rec':
    case 'sword_regular_b':
    case 'sword_regular_b_rec':
    case 'sword_regular_c':
    case 'sword_regular_combo': {
      if (id === 'sword_idle') {
        return [
          { t: 0, pelvisPos: [0, -0.04, 0], spine: [0.06, -0.18, 0], armR: [-0.45, -0.25, 0.35], forearmR: [-0.85, 0, 0], armL: [-0.3, 0.2, -0.28], forearmL: [-0.65, 0, 0], thighL: [-0.2, 0, 0], thighR: [0.16, 0, 0] },
          { t: 0.5, pelvisPos: [0, -0.02, 0], spine: [0.04, -0.14, 0], armR: [-0.48, -0.25, 0.35], forearmR: [-0.8, 0, 0] },
          { t: 1.0, pelvisPos: [0, -0.04, 0], spine: [0.06, -0.18, 0], armR: [-0.45, -0.25, 0.35], forearmR: [-0.85, 0, 0], armL: [-0.3, 0.2, -0.28], forearmL: [-0.65, 0, 0], thighL: [-0.2, 0, 0], thighR: [0.16, 0, 0] },
        ];
      }
      if (id === 'sword_block') {
        return [
          { t: 0, pelvisPos: [0, -0.07, 0], spine: [0.1, 0.2, 0], armR: [-1.15, 0.55, 0.35], forearmR: [-1.25, 0, 0], armL: [-0.55, 0.3, -0.25], forearmL: [-0.95, 0, 0] },
          { t: 0.5, pelvisPos: [0, -0.08, 0], spine: [0.12, 0.22, 0], armR: [-1.2, 0.58, 0.35], forearmR: [-1.25, 0, 0] },
          { t: 1.0, pelvisPos: [0, -0.07, 0], spine: [0.1, 0.2, 0], armR: [-1.15, 0.55, 0.35], forearmR: [-1.25, 0, 0], armL: [-0.55, 0.3, -0.25], forearmL: [-0.95, 0, 0] },
        ];
      }
      const combo = id === 'sword_heavy_combo' || id === 'sword_regular_combo';
      return [
        { t: 0, pelvisPos: [0, -0.03, 0], spine: [0.08, -0.2, 0], armR: [-0.45, -0.25, 0.35], forearmR: [-0.85, 0, 0] },
        { t: 0.25, pelvisPos: [0, -0.05, -0.02], spine: [0.05, -0.55, 0.08], armR: [-1.55, -0.35, 1.15], forearmR: [-0.55, 0, 0], armL: [-0.4, 0.2, -0.45] },
        { t: 0.5, pelvisPos: [0, -0.08, 0.1], spine: [0.24, 0.58, -0.12], armR: [-0.55, 0.78, 0.22], forearmR: [-0.15, 0, 0], thighL: [-0.42, 0, 0], shinL: [0.55, 0, 0] },
        ...(combo
          ? [
              { t: 0.75, pelvisPos: [0, -0.08, 0.14] as PoseVec, spine: [0.22, -0.62, 0.1] as PoseVec, armR: [-1.45, 0.25, 0.6] as PoseVec, forearmR: [-0.25, 0, 0] as PoseVec },
            ]
          : []),
        { t: 1.0, pelvisPos: [0, -0.03, 0], spine: [0.08, -0.2, 0], armR: [-0.45, -0.25, 0.35], forearmR: [-0.85, 0, 0] },
      ];
    }
    case 'treechopping_loop':
      return [
        { t: 0, spine: [0.08, -0.45, 0], armR: [-1.05, -0.15, 0.55], forearmR: [-0.95, 0, 0], armL: [-0.95, 0.35, 0.25], forearmL: [-0.85, 0, 0] },
        { t: 0.45, pelvisPos: [0, -0.06, 0.04], spine: [0.24, 0.48, 0], armR: [-0.85, 0.55, 0.15], forearmR: [-0.35, 0, 0], armL: [-0.85, 0.55, -0.15], forearmL: [-0.35, 0, 0] },
        { t: 1.0, spine: [0.08, -0.45, 0], armR: [-1.05, -0.15, 0.55], forearmR: [-0.95, 0, 0], armL: [-0.95, 0.35, 0.25], forearmL: [-0.85, 0, 0] },
      ];
    case 'zombie_idle_loop':
    case 'zombie_scratch':
    case 'zombie_walk_fwd_loop': {
      const walk = id === 'zombie_walk_fwd_loop';
      const scratch = id === 'zombie_scratch';
      return [
        { t: 0, pelvisPos: [0, -0.04, 0], spine: [0.22, -0.06, 0.12], head: [0.18, 0.15, -0.22], armL: [-1.25, 0.1, -0.12], forearmL: [-0.35, 0, 0], armR: [-1.25, -0.1, 0.12], forearmR: [-0.35, 0, 0], thighL: walk ? [-0.28, 0, 0] : [0, 0, 0], thighR: walk ? [0.28, 0, 0] : [0, 0, 0] },
        { t: 0.5, pelvisPos: [0, -0.02, 0], spine: [0.25, 0.08, -0.14], head: [0.12, -0.22, 0.18], armL: scratch ? [-1.55, 0.2, -0.25] : [-1.18, 0.1, -0.15], armR: scratch ? [-0.65, -0.35, 0.3] : [-1.32, -0.1, 0.15], thighL: walk ? [0.28, 0, 0] : [0, 0, 0], thighR: walk ? [-0.28, 0, 0] : [0, 0, 0] },
        { t: 1.0, pelvisPos: [0, -0.04, 0], spine: [0.22, -0.06, 0.12], head: [0.18, 0.15, -0.22], armL: [-1.25, 0.1, -0.12], forearmL: [-0.35, 0, 0], armR: [-1.25, -0.1, 0.12], forearmR: [-0.35, 0, 0], thighL: walk ? [-0.28, 0, 0] : [0, 0, 0], thighR: walk ? [0.28, 0, 0] : [0, 0, 0] },
      ];
    }
    case 'idle_loop':
    default:
      return [
        { t: 0, pelvisPos: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], armL: [0.05, 0, -0.15], armR: [0.05, 0, 0.15] },
        { t: 0.5, pelvisPos: [0, 0.015, 0], chest: [0.04, 0, 0], head: [0.04, 0.14, 0], armL: [0.08, 0, -0.12], armR: [0.02, 0, 0.17] },
        { t: 1.0, pelvisPos: [0, 0, 0], chest: [0, 0, 0], head: [0, 0, 0], armL: [0.05, 0, -0.15], armR: [0.05, 0, 0.15] },
      ];
  }
}

export function buildSingleActionForgeClip(
  def: ActionForgeClipDef,
  preset: RigPreset,
  bonesByName: Map<string, THREE.Bone>
): THREE.AnimationClip {
  const euler = new THREE.Euler();
  const q = new THREE.Quaternion();

  if (preset === 'QUADRUPEDE') {
    const t5 = [0, 0.25, 0.5, 0.75, 1].map((u) => u * def.duration);
    const isMoving =
      def.id.includes('walk') ||
      def.id.includes('jog') ||
      def.id.includes('sprint') ||
      def.id.includes('dash') ||
      def.id.includes('swim');
    const isAction = def.id === 'chest_open' || def.id.includes('attack') || def.id.includes('jump');

    const quat = (bName: string, eulers: PoseVec[]) => {
      const bone = bonesByName.get(bName);
      if (!bone) return null;
      const baseQ = bone.quaternion.clone();
      const values: number[] = [];
      for (const [rx, ry, rz] of eulers) {
        euler.set(rx, ry, rz, 'XYZ');
        q.setFromEuler(euler);
        const c = baseQ.clone().multiply(q);
        values.push(c.x, c.y, c.z, c.w);
      }
      return new THREE.QuaternionKeyframeTrack(`${bName}.quaternion`, t5, values);
    };
    const pos = (bName: string, offsets: PoseVec[]) => {
      const bone = bonesByName.get(bName);
      if (!bone) return null;
      const baseP = bone.position.clone();
      const values: number[] = [];
      for (const [dx, dy, dz] of offsets) values.push(baseP.x + dx, baseP.y + dy, baseP.z + dz);
      return new THREE.VectorKeyframeTrack(`${bName}.position`, t5, values);
    };
    const tracks = [
      pos('pelvis', isAction ? [[0, 0, 0], [0, -0.05, 0.03], [0, 0.09, 0.04], [0, 0.02, 0.02], [0, 0, 0]] : [[0, 0, 0], [0, 0.03, 0], [0, 0, 0], [0, 0.03, 0], [0, 0, 0]]),
      quat('neck', isAction ? [[0, 0, 0], [0.2, 0, 0], [-0.25, 0.14, 0], [-0.15, -0.1, 0], [0, 0, 0]] : [[0, 0, 0], [0.06, 0.08, 0], [0, 0, 0], [-0.04, -0.08, 0], [0, 0, 0]]),
      quat('front_thigh_L', isMoving ? [[0.38, 0, 0], [0, 0, 0], [-0.38, 0, 0], [0, 0, 0], [0.38, 0, 0]] : isAction ? [[0, 0, 0], [0.4, 0, 0], [-0.65, 0, 0], [-0.3, 0, 0], [0, 0, 0]] : [[0, 0, 0], [0.05, 0, 0], [0, 0, 0], [-0.05, 0, 0], [0, 0, 0]]),
      quat('front_thigh_R', isMoving ? [[-0.38, 0, 0], [0, 0, 0], [0.38, 0, 0], [0, 0, 0], [-0.38, 0, 0]] : isAction ? [[0, 0, 0], [0.4, 0, 0], [-0.65, 0, 0], [-0.3, 0, 0], [0, 0, 0]] : [[0, 0, 0], [-0.05, 0, 0], [0, 0, 0], [0.05, 0, 0], [0, 0, 0]]),
      quat('hind_thigh_L', isMoving ? [[-0.35, 0, 0], [0, 0, 0], [0.35, 0, 0], [0, 0, 0], [-0.35, 0, 0]] : [[0, 0, 0], [0.04, 0, 0], [0, 0, 0], [0.04, 0, 0], [0, 0, 0]]),
      quat('hind_thigh_R', isMoving ? [[0.35, 0, 0], [0, 0, 0], [-0.35, 0, 0], [0, 0, 0], [0.35, 0, 0]] : [[0, 0, 0], [0.04, 0, 0], [0, 0, 0], [0.04, 0, 0], [0, 0, 0]]),
      quat('tail_01', [[0, -0.3, 0], [0, 0.3, 0], [0, -0.3, 0], [0, 0.3, 0], [0, -0.3, 0]]),
    ].filter((t): t is THREE.KeyframeTrack => t !== null);
    return new THREE.AnimationClip(def.id, def.duration, tracks);
  }

  const frames = getPoseScript(def.id);
  const times = frames.map((f) => f.t * def.duration);
  const spineBone = bonesByName.has('spine_01') ? 'spine_01' : 'spine';
  const chestBone = bonesByName.has('chest') ? 'chest' : spineBone;

  const quatTrack = (boneName: string, selector: (f: KeyPoseFrame) => PoseVec | undefined) => {
    const bone = bonesByName.get(boneName);
    if (!bone) return null;
    const anyDefined = frames.some((f) => selector(f) !== undefined);
    if (!anyDefined) return null;
    const baseQ = bone.quaternion.clone();
    const values: number[] = [];
    for (const f of frames) {
      const [rx, ry, rz] = selector(f) ?? [0, 0, 0];
      euler.set(rx, ry, rz, 'XYZ');
      q.setFromEuler(euler);
      const combined = baseQ.clone().multiply(q);
      values.push(combined.x, combined.y, combined.z, combined.w);
    }
    return new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, times, values);
  };

  const posTrack = (boneName: string, selector: (f: KeyPoseFrame) => PoseVec | undefined) => {
    const bone = bonesByName.get(boneName);
    if (!bone) return null;
    const anyDefined = frames.some((f) => selector(f) !== undefined);
    if (!anyDefined) return null;
    const baseP = bone.position.clone();
    const values: number[] = [];
    for (const f of frames) {
      const [dx, dy, dz] = selector(f) ?? [0, 0, 0];
      values.push(baseP.x + dx, baseP.y + dy, baseP.z + dz);
    }
    return new THREE.VectorKeyframeTrack(`${boneName}.position`, times, values);
  };

  const tracks = [
    posTrack('pelvis', (f) => f.pelvisPos),
    quatTrack('pelvis', (f) => f.pelvisRot),
    quatTrack(spineBone, (f) => f.spine),
    quatTrack(chestBone, (f) => f.chest),
    quatTrack('neck', (f) => f.neck),
    quatTrack('head', (f) => f.head),
    quatTrack('upper_arm_L', (f) => f.armL),
    quatTrack('forearm_L', (f) => f.forearmL),
    quatTrack('upper_arm_R', (f) => f.armR),
    quatTrack('forearm_R', (f) => f.forearmR),
    quatTrack('thigh_L', (f) => f.thighL),
    quatTrack('shin_L', (f) => f.shinL),
    quatTrack('thigh_R', (f) => f.thighR),
    quatTrack('shin_R', (f) => f.shinR),
  ].filter((t): t is THREE.KeyframeTrack => t !== null);

  // VFX practice: ensure hemisphere continuity across quaternion keys (prevents 360-deg flip) and smooth tangents
  for (const track of tracks) {
    if (track.ValueTypeName === 'quaternion') {
      const v = track.values;
      for (let i = 4; i < v.length; i += 4) {
        const dot = v[i - 4] * v[i] + v[i - 3] * v[i + 1] + v[i - 2] * v[i + 2] + v[i - 1] * v[i + 3];
        if (dot < 0) {
          v[i] = -v[i];
          v[i + 1] = -v[i + 1];
          v[i + 2] = -v[i + 2];
          v[i + 3] = -v[i + 3];
        }
      }
    } else if (track instanceof THREE.VectorKeyframeTrack) {
      track.setInterpolation(THREE.InterpolateSmooth);
    }
  }

  return new THREE.AnimationClip(def.id, def.duration, tracks);
}

export function buildActionForgeClipLibrary(
  preset: RigPreset,
  bonesByName: Map<string, THREE.Bone>
): THREE.AnimationClip[] {
  return ACTIONFORGE_CLIPS.map((def) => buildSingleActionForgeClip(def, preset, bonesByName));
}

/**
 * Compiles ordered NLA strips on the Base track into a single sequential AnimationClip
 * with VFX quaternion hemisphere continuity across clip boundaries.
 */
export function compileTimelineStripsToClip(
  strips: TimelineStripItem[],
  clipPool: Map<string, THREE.AnimationClip>,
  mirrorFn: (c: THREE.AnimationClip) => THREE.AnimationClip
): THREE.AnimationClip | null {
  if (strips.length === 0) return null;
  if (strips.length === 1 && !strips[0].mirror && strips[0].speed === 1) {
    return clipPool.get(strips[0].clipId) ?? null;
  }

  let cursor = 0;
  const trackMap = new Map<string, { times: number[]; values: number[]; type: 'vec' | 'quat' }>();

  for (const strip of strips) {
    let src = clipPool.get(strip.clipId);
    if (!src) continue;
    if (strip.mirror) src = mirrorFn(src);

    const speed = Math.max(0.2, strip.speed || 1);
    const clipLen = strip.duration / speed;

    for (const track of src.tracks) {
      const isQuat = track.ValueTypeName === 'quaternion';
      const stride = isQuat ? 4 : 3;
      let entry = trackMap.get(track.name);
      if (!entry) {
        entry = { times: [], values: [], type: isQuat ? 'quat' : 'vec' };
        trackMap.set(track.name, entry);
      }

      for (let i = 0; i < track.times.length; i++) {
        const localT = (track.times[i] / Math.max(src.duration, 0.01)) * clipLen;
        const absT = cursor + localT;
        if (entry.times.length > 0 && absT <= entry.times[entry.times.length - 1] + 1e-4) {
          continue;
        }
        entry.times.push(absT);
        const offset = i * stride;
        if (isQuat && entry.values.length >= 4) {
          const prevIdx = entry.values.length - 4;
          const qx = track.values[offset];
          const qy = track.values[offset + 1];
          const qz = track.values[offset + 2];
          const qw = track.values[offset + 3];
          const dot =
            entry.values[prevIdx] * qx +
            entry.values[prevIdx + 1] * qy +
            entry.values[prevIdx + 2] * qz +
            entry.values[prevIdx + 3] * qw;
          const sign = dot < 0 ? -1 : 1;
          entry.values.push(qx * sign, qy * sign, qz * sign, qw * sign);
        } else {
          for (let k = 0; k < stride; k++) {
            entry.values.push(track.values[offset + k]);
          }
        }
      }
    }
    cursor += clipLen;
  }

  const outTracks: THREE.KeyframeTrack[] = [];
  for (const [name, data] of trackMap.entries()) {
    if (data.times.length === 0) continue;
    if (data.type === 'quat') {
      outTracks.push(new THREE.QuaternionKeyframeTrack(name, data.times, data.values));
    } else {
      const vt = new THREE.VectorKeyframeTrack(name, data.times, data.values);
      vt.setInterpolation(THREE.InterpolateSmooth);
      outTracks.push(vt);
    }
  }
  return new THREE.AnimationClip('Sequencia_ActionForge', Math.max(0.2, cursor), outTracks);
}

/**
 * Reverses all keyframe times across every track (`t -> duration - t`) so playback,
 * scrubbing, Graph curves, and Blender export all stay deterministic.
 */
export function reverseAnimationClip(clip: THREE.AnimationClip): THREE.AnimationClip {
  const cloned = clip.clone();
  const dur = Math.max(0.01, cloned.duration);
  for (const track of cloned.tracks) {
    const stride = track.getValueSize();
    const count = track.times.length;
    if (count < 2) continue;

    const revTimes = new Float32Array(count);
    const revValues = new Float32Array(count * stride);
    for (let i = 0; i < count; i++) {
      const srcIdx = count - 1 - i;
      revTimes[i] = Math.max(0, dur - track.times[srcIdx]);
      for (let k = 0; k < stride; k++) {
        revValues[i * stride + k] = track.values[srcIdx * stride + k];
      }
    }
    if (track.ValueTypeName === 'quaternion') {
      for (let i = 1; i < count; i++) {
        const o = i * 4;
        const p = (i - 1) * 4;
        const dot =
          revValues[p] * revValues[o] +
          revValues[p + 1] * revValues[o + 1] +
          revValues[p + 2] * revValues[o + 2] +
          revValues[p + 3] * revValues[o + 3];
        if (dot < 0) {
          revValues[o] = -revValues[o];
          revValues[o + 1] = -revValues[o + 1];
          revValues[o + 2] = -revValues[o + 2];
          revValues[o + 3] = -revValues[o + 3];
        }
      }
    }
    track.times = revTimes;
    track.values = revValues;
  }
  return cloned;
}

/**
 * Locks horizontal root motion (X/Z) on pelvis/root position tracks while preserving
 * vertical bounce (Y) for jumps, kneels, and tumbles.
 */
export function lockClipInPlace(
  clip: THREE.AnimationClip,
  restPelvisPos?: THREE.Vector3
): THREE.AnimationClip {
  const cloned = clip.clone();
  for (const track of cloned.tracks) {
    if (track.name === 'pelvis.position' && track.ValueTypeName === 'vector') {
      const baseX = restPelvisPos ? restPelvisPos.x : track.values[0] ?? 0;
      const baseZ = restPelvisPos ? restPelvisPos.z : track.values[2] ?? 0;
      for (let i = 0; i + 2 < track.values.length; i += 3) {
        track.values[i] = baseX;
        track.values[i + 2] = baseZ;
      }
    }
  }
  return cloned;
}

