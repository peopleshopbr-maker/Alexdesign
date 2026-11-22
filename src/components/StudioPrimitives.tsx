import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/* ── 1. Tooltip with 0.4s delay showing Name + Keyboard Shortcut ── */
interface ShortcutTooltipProps {
  label: string;
  shortcut?: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom';
}

export const ShortcutTooltip: React.FC<ShortcutTooltipProps> = ({
  label,
  shortcut,
  children,
  placement = 'bottom',
}) => {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleEnter = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setVisible(true), 400);
  };

  const handleLeave = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 px-2 py-1 rounded-md bg-[#090C12] border border-slate-700 shadow-xl text-[10px] text-[#231F1D] whitespace-nowrap flex items-center gap-1.5 ${
            placement === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          <span>{label}</span>
          {shortcut && (
            <kbd className="px-1 py-0.5 rounded bg-[#FAF8F5] border border-slate-700 font-mono text-[9px] text-orange-300">
              {shortcut}
            </kbd>
          )}
        </div>
      )}
    </div>
  );
};

/* ── 2. Draggable Number Scrubber with XYZ Axis Colors + Shift Fine Precision ── */
export type AxisCode = 'X' | 'Y' | 'Z';

const AXIS_STYLE: Record<AxisCode, { bar: string; text: string }> = {
  X: { bar: 'bg-[#EF4444]', text: 'text-[#EF4444]' },
  Y: { bar: 'bg-[#22C55E]', text: 'text-[#22C55E]' },
  Z: { bar: 'bg-[#3B82F6]', text: 'text-[#3B82F6]' },
};

interface NumberScrubberProps {
  axis?: AxisCode;
  label?: string;
  value: number;
  step?: number;
  min?: number;
  max?: number;
  defaultValue?: number;
  unit?: string;
  decimals?: number;
  onChange: (nextValue: number) => void;
}

export const NumberScrubber: React.FC<NumberScrubberProps> = ({
  axis,
  label,
  value,
  step = 0.05,
  min,
  max,
  defaultValue,
  unit = '',
  decimals = 2,
  onChange,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const clamp = (v: number) => {
    let out = v;
    if (min !== undefined) out = Math.max(min, out);
    if (max !== undefined) out = Math.min(max, out);
    return Number(out.toFixed(decimals));
  };

  const commitDraft = () => {
    const parsed = parseFloat(draft.replace(',', '.'));
    if (Number.isFinite(parsed)) {
      onChange(clamp(parsed));
    }
    setEditing(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (editing || e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startVal = value;
    let moved = false;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      if (Math.abs(dx) > 3) {
        moved = true;
        setDragging(true);
      }
      if (!moved) return;
      const sensitivity = ev.shiftKey ? 0.01 : step;
      const delta = (dx / 6) * sensitivity;
      onChange(clamp(startVal + delta));
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!moved) {
        setDraft(value.toFixed(decimals));
        setEditing(true);
        window.setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.select();
        }, 10);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (editing) {
    return (
      <div className="flex items-center rounded bg-[#090C12] border border-orange-500 overflow-hidden h-7">
        {axis && (
          <span className={`w-1 h-full shrink-0 ${AXIS_STYLE[axis].bar}`} aria-hidden="true" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label={label || (axis ? `Eixo ${axis}` : 'Valor numérico')}
          className="w-full px-1.5 bg-transparent text-[11px] font-mono text-[#231F1D] focus:outline-none tabular-nums"
        />
      </div>
    );
  }

  return (
    <div
      onPointerDown={handlePointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (defaultValue !== undefined) onChange(clamp(defaultValue));
      }}
      title="Arraste para ajustar (Shift = fino 0.01) · Clique para digitar · Duplo clique reseta"
      className={`group flex items-center justify-between gap-1 rounded h-7 bg-[#0D1017] border transition-colors select-none cursor-ew-resize overflow-hidden pr-1.5 ${
        dragging
          ? 'border-orange-500 bg-orange-500/10'
          : 'border-[#231F1D]/15 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center gap-1 h-full min-w-0">
        {axis ? (
          <>
            <span className={`w-1 h-full shrink-0 ${AXIS_STYLE[axis].bar}`} aria-hidden="true" />
            <span className={`text-[10px] font-bold font-mono pl-1 ${AXIS_STYLE[axis].text}`}>
              {axis}
            </span>
          </>
        ) : label ? (
          <span className="text-[10px] text-[#635B54] pl-1.5 truncate">{label}</span>
        ) : null}
      </div>
      <span className="text-[11px] font-mono text-[#231F1D] tabular-nums truncate">
        {value.toFixed(decimals)}
        {unit}
      </span>
    </div>
  );
};

/* ── 3. PBR Filled Slider with Double-Click Reset ── */
interface PbrSliderProps {
  label: string;
  blenderSocket?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  decimals?: number;
  accentHex?: string;
  onChange: (v: number) => void;
}

export const PbrSlider: React.FC<PbrSliderProps> = ({
  label,
  blenderSocket,
  value,
  min,
  max,
  step = 0.01,
  defaultValue,
  decimals = 2,
  accentHex = '#f97316',
  onChange,
}) => {
  const pct = THREE.MathUtils.clamp(((value - min) / Math.max(1e-5, max - min)) * 100, 0, 100);

  return (
    <div
      className="flex flex-col gap-1 select-none"
      onDoubleClick={() => onChange(defaultValue)}
      title={`Duplo clique para restaurar padrão (${defaultValue.toFixed(decimals)})${
        blenderSocket ? ` · Blender: ${blenderSocket}` : ''
      }`}
    >
      <div className="flex items-center justify-between text-[10px] text-[#635B54]">
        <span className="truncate">{label}</span>
        <span className="font-mono text-slate-200 tabular-nums">{value.toFixed(decimals)}</span>
      </div>
      <div className="relative h-2 rounded-full bg-[#090C12] border border-[#231F1D]/15 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full pointer-events-none"
          style={{ width: `${pct}%`, backgroundColor: accentHex }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
        />
      </div>
    </div>
  );
};

/* ── 4. Blender-style Interactive 3D Axis Gizmo ── */
export type CameraSnapDirection = 'q34' | 'front' | 'back' | 'side' | 'left' | 'top' | 'bottom';

interface AxisGizmo3DProps {
  quaternionRef: React.MutableRefObject<THREE.Quaternion>;
  onSnapView: (dir: CameraSnapDirection) => void;
}

interface AxisHandleNode {
  id: CameraSnapDirection;
  label: string;
  vec: THREE.Vector3;
  color: string;
  positive: boolean;
}

const AXIS_HANDLES: AxisHandleNode[] = [
  { id: 'side', label: 'X', vec: new THREE.Vector3(1, 0, 0), color: '#EF4444', positive: true },
  { id: 'left', label: '-X', vec: new THREE.Vector3(-1, 0, 0), color: '#991B1B', positive: false },
  { id: 'top', label: 'Y', vec: new THREE.Vector3(0, 1, 0), color: '#22C55E', positive: true },
  { id: 'bottom', label: '-Y', vec: new THREE.Vector3(0, -1, 0), color: '#166534', positive: false },
  { id: 'front', label: 'Z', vec: new THREE.Vector3(0, 0, 1), color: '#3B82F6', positive: true },
  { id: 'back', label: '-Z', vec: new THREE.Vector3(0, 0, -1), color: '#1E40AF', positive: false },
];

export const AxisGizmo3D: React.FC<AxisGizmo3DProps> = ({ quaternionRef, onSnapView }) => {
  const [projected, setProjected] = useState<
    { id: CameraSnapDirection; label: string; x: number; y: number; z: number; color: string; positive: boolean }[]
  >([]);

  useEffect(() => {
    let raf = 0;
    const invQ = new THREE.Quaternion();
    const vTmp = new THREE.Vector3();
    let lastHash = '';

    const tick = () => {
      raf = requestAnimationFrame(tick);
      invQ.copy(quaternionRef.current).invert();
      const next = AXIS_HANDLES.map((h) => {
        vTmp.copy(h.vec).applyQuaternion(invQ);
        return {
          id: h.id,
          label: h.label,
          x: 38 + vTmp.x * 24,
          y: 38 - vTmp.y * 24,
          z: vTmp.z,
          color: h.color,
          positive: h.positive,
        };
      }).sort((a, b) => a.z - b.z);

      const hKey = next.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('|');
      if (hKey !== lastHash) {
        lastHash = hKey;
        setProjected(next);
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [quaternionRef]);

  return (
    <div
      className="relative w-[76px] h-[76px] rounded-full bg-[#0D1017]/65 border border-[#231F1D]/15 backdrop-blur-sm select-none"
      title="Gizmo 3D de Eixos — clique em X (Lado), Y (Topo), Z (Frente) ou no centro (3/4)"
    >
      <svg viewBox="0 0 76 76" className="w-full h-full">
        {/* Center 3/4 Reset Sphere */}
        <circle
          cx="38"
          cy="38"
          r="6"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.2"
          className="cursor-pointer hover:stroke-orange-400"
          onClick={() => onSnapView('q34')}
        />
        {/* Axis lines & clickable spheres sorted back-to-front */}
        {projected.map((node) => (
          <g
            key={node.id}
            className="cursor-pointer"
            onClick={() => onSnapView(node.id)}
          >
            {node.positive && (
              <line
                x1="38"
                y1="38"
                x2={node.x}
                y2={node.y}
                stroke={node.color}
                strokeWidth="2"
                strokeOpacity={0.85}
              />
            )}
            <circle
              cx={node.x}
              cy={node.y}
              r={node.positive ? 7.5 : 5}
              fill={node.color}
              fillOpacity={node.z >= 0 ? 1 : 0.65}
              stroke="#090C12"
              strokeWidth="1"
            />
            {node.positive && (
              <text
                x={node.x}
                y={node.y + 3}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="700"
                fill="#ffffff"
                style={{ pointerEvents: 'none' }}
              >
                {node.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
};

