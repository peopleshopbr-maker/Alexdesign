import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

export interface RigJointSpec {
  id: string;
  label: string;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  side: 'center' | 'left' | 'right';
  matchTerms: string[];
}

export const HUMANOID_BODY_JOINTS: RigJointSpec[] = [
  { id: 'head', label: 'Cabeça', x: 50, y: 14, side: 'center', matchTerms: ['head'] },
  { id: 'neck', label: 'Pescoço', x: 50, y: 22, side: 'center', matchTerms: ['neck'] },
  { id: 'chest', label: 'Peito', x: 50, y: 31, side: 'center', matchTerms: ['chest', 'spine2', 'upperchest'] },
  { id: 'spine', label: 'Coluna', x: 50, y: 41, side: 'center', matchTerms: ['spine1', 'spine'] },
  { id: 'hips', label: 'Quadril (Root)', x: 50, y: 51, side: 'center', matchTerms: ['hips', 'pelvis', 'root'] },

  { id: 'l_shoulder', label: 'Ombro Esq.', x: 40, y: 26, side: 'left', matchTerms: ['leftshoulder', 'shoulder_l', 'clavicle_l'] },
  { id: 'l_arm', label: 'Braço Esq.', x: 30, y: 28, side: 'left', matchTerms: ['leftarm', 'upperarm_l', 'l_upperarm', 'arm_l'] },
  { id: 'l_forearm', label: 'Antebraço Esq.', x: 20, y: 28, side: 'left', matchTerms: ['leftforearm', 'forearm_l', 'lowerarm_l', 'elbow_l'] },
  { id: 'l_hand', label: 'Mão Esq.', x: 11, y: 28, side: 'left', matchTerms: ['lefthand', 'hand_l', 'wrist_l'] },

  { id: 'r_shoulder', label: 'Ombro Dir.', x: 60, y: 26, side: 'right', matchTerms: ['rightshoulder', 'shoulder_r', 'clavicle_r'] },
  { id: 'r_arm', label: 'Braço Dir.', x: 70, y: 28, side: 'right', matchTerms: ['rightarm', 'upperarm_r', 'r_upperarm', 'arm_r'] },
  { id: 'r_forearm', label: 'Antebraço Dir.', x: 80, y: 28, side: 'right', matchTerms: ['rightforearm', 'forearm_r', 'lowerarm_r', 'elbow_r'] },
  { id: 'r_hand', label: 'Mão Dir.', x: 89, y: 28, side: 'right', matchTerms: ['righthand', 'hand_r', 'wrist_r'] },

  { id: 'l_thigh', label: 'Coxa Esq.', x: 43, y: 61, side: 'left', matchTerms: ['leftupleg', 'thigh_l', 'l_thigh', 'upperleg_l'] },
  { id: 'l_knee', label: 'Joelho Esq.', x: 43, y: 74, side: 'left', matchTerms: ['leftleg', 'shin_l', 'calf_l', 'lowerleg_l', 'knee_l'] },
  { id: 'l_foot', label: 'Pé Esq.', x: 43, y: 88, side: 'left', matchTerms: ['leftfoot', 'foot_l', 'ankle_l'] },

  { id: 'r_thigh', label: 'Coxa Dir.', x: 57, y: 61, side: 'right', matchTerms: ['rightupleg', 'thigh_r', 'r_thigh', 'upperleg_r'] },
  { id: 'r_knee', label: 'Joelho Dir.', x: 57, y: 74, side: 'right', matchTerms: ['rightleg', 'shin_r', 'calf_r', 'lowerleg_r', 'knee_r'] },
  { id: 'r_foot', label: 'Pé Dir.', x: 57, y: 88, side: 'right', matchTerms: ['rightfoot', 'foot_r', 'ankle_r'] },
];

interface RigBonePickerProps {
  selectedJointId: string | null;
  onSelectJoint: (joint: RigJointSpec) => void;
  onRotateJoint: (joint: RigJointSpec, axis: 'x' | 'y' | 'z', deg: number) => void;
  onResetPose: () => void;
}

export const RigBonePicker: React.FC<RigBonePickerProps> = ({
  selectedJointId,
  onSelectJoint,
  onRotateJoint,
  onResetPose,
}) => {
  const [rotDeg, setRotDeg] = useState<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });
  const [visibleGroups, setVisibleGroups] = useState({
    torso: true,
    armL: true,
    armR: true,
    legL: true,
    legR: true,
  });
  const activeJoint = HUMANOID_BODY_JOINTS.find((j) => j.id === selectedJointId) ?? HUMANOID_BODY_JOINTS[4];

  const isJointVisible = (j: RigJointSpec) => {
    if (j.side === 'center') return visibleGroups.torso;
    if (j.id.startsWith('l_arm') || j.id.startsWith('l_shoulder') || j.id.startsWith('l_forearm') || j.id.startsWith('l_hand')) {
      return visibleGroups.armL;
    }
    if (j.id.startsWith('r_arm') || j.id.startsWith('r_shoulder') || j.id.startsWith('r_forearm') || j.id.startsWith('r_hand')) {
      return visibleGroups.armR;
    }
    if (j.id.startsWith('l_')) return visibleGroups.legL;
    return visibleGroups.legR;
  };

  const handlePick = (joint: RigJointSpec) => {
    setRotDeg({ x: 0, y: 0, z: 0 });
    onSelectJoint(joint);
  };

  const handleAxisChange = (axis: 'x' | 'y' | 'z', val: number) => {
    setRotDeg((prev) => ({ ...prev, [axis]: val }));
    onRotateJoint(activeJoint, axis, val);
  };

  return (
    <div className="rounded-lg bg-[#0D1017] border border-amber-500/30 p-2.5 flex flex-col gap-2 text-[10px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-amber-300 tracking-wide uppercase">
          Seletor Visual de Articulações (Picker)
        </span>
        <button
          type="button"
          onClick={() => {
            setRotDeg({ x: 0, y: 0, z: 0 });
            onResetPose();
          }}
          title="Resetar pose dos ossos"
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* ActionForge-style Rig Group Show/Mask Toggles */}
      <div className="grid grid-cols-5 gap-1">
        {(
          [
            { key: 'torso', label: 'Torso' },
            { key: 'armL', label: 'Braço E' },
            { key: 'armR', label: 'Braço D' },
            { key: 'legL', label: 'Perna E' },
            { key: 'legR', label: 'Perna D' },
          ] as const
        ).map((g) => {
          const active = visibleGroups[g.key];
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => setVisibleGroups((prev) => ({ ...prev, [g.key]: !prev[g.key] }))}
              className={`px-1 py-1 rounded border text-[9px] font-semibold transition-colors cursor-pointer ${
                active
                  ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200'
                  : 'bg-[#121621] border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {g.label}
            </button>
          );
        })}
      </div>

      {/* 2D Silhouette + Clickable Joint Nodes */}
      <div className="relative w-full h-56 rounded-lg bg-[#090C12] border border-slate-800/90 overflow-hidden select-none">
        <svg viewBox="0 0 100 100" className="w-full h-full opacity-35 pointer-events-none">
          {/* Torso & Limbs Guide Lines */}
          <line x1="50" y1="14" x2="50" y2="51" stroke="#facc15" strokeWidth="1.6" />
          <line x1="11" y1="28" x2="89" y2="28" stroke="#94a3b8" strokeWidth="1.4" />
          <line x1="50" y1="51" x2="43" y2="61" stroke="#38bdf8" strokeWidth="1.4" />
          <line x1="43" y1="61" x2="43" y2="88" stroke="#38bdf8" strokeWidth="1.4" />
          <line x1="50" y1="51" x2="57" y2="61" stroke="#f43f5e" strokeWidth="1.4" />
          <line x1="57" y1="61" x2="57" y2="88" stroke="#f43f5e" strokeWidth="1.4" />
          <circle cx="50" cy="12" r="5" fill="none" stroke="#facc15" strokeWidth="1.2" />
        </svg>

        {HUMANOID_BODY_JOINTS.filter(isJointVisible).map((joint) => {
          const isSelected = activeJoint.id === joint.id;
          const ringColor =
            joint.side === 'left'
              ? 'border-sky-400 bg-sky-500/20'
              : joint.side === 'right'
                ? 'border-rose-400 bg-rose-500/20'
                : 'border-amber-400 bg-amber-500/20';
          return (
            <button
              key={joint.id}
              type="button"
              title={joint.label}
              onClick={() => handlePick(joint)}
              style={{ left: `${joint.x}%`, top: `${joint.y}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-sm border transition-transform cursor-pointer ${
                isSelected
                  ? 'scale-125 bg-orange-500 border-white shadow-[0_0_10px_rgba(249,115,22,0.85)] z-10'
                  : `${ringColor} hover:scale-125`
              }`}
            />
          );
        })}
      </div>

      {/* Selected Joint Live Rotation Controls */}
      <div className="rounded-md bg-[#121621] border border-slate-800 p-2 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200">{activeJoint.label}</span>
          <span className="font-mono text-[9px] text-amber-300">
            X:{rotDeg.x}° Y:{rotDeg.y}° Z:{rotDeg.z}°
          </span>
        </div>
        {(['x', 'y', 'z'] as const).map((axis) => (
          <label key={axis} className="flex items-center gap-2">
            <span className="w-3 font-mono uppercase text-slate-400">{axis}</span>
            <input
              type="range"
              min={-120}
              max={120}
              step={1}
              value={rotDeg[axis]}
              onChange={(e) => handleAxisChange(axis, Number(e.target.value))}
              className="flex-1"
            />
          </label>
        ))}
      </div>
    </div>
  );
};
