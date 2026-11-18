import {
  Bone,
  Camera,
  Check,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Film,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Sword,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import type {
  AnimationActionCycle,
  AnimationAppeal,
  AnimationSettings,
  AutoRigPreset,
  EasingCurveType,
  IkLimbId,
  PropSocketType,
  RigExportProfile,
  SecondaryAction,
  StagingMode,
} from '../types/graphics';

interface AnimationSidebarProps {
  animation: AnimationSettings;
  loadedModelName?: string | null;
  loadedClips?: string[];
  boneCount?: number;
  jointMarkersActive: boolean;
  jointMarkerSymmetry: boolean;
  onAutoRigLoaded?: (rigType: AutoRigPreset) => void;
  onStartJointMarkers: () => void;
  onCommitJointMarkers: () => void;
  onCancelJointMarkers: () => void;
  onToggleJointMarkerSymmetry: () => void;
  onExportGlb: (profile?: RigExportProfile) => void;
  exportingFramesLabel?: string | null;
  onCaptureFrame?: (transparentOverride?: boolean) => void;
  onExportFramesZip?: (step?: number, transparentOverride?: boolean) => void;
  onInsertRiggedHumanoid?: () => void;
  onUpdateAnimation: (patch: Partial<AnimationSettings>) => void;
  onResetAnimation: () => void;
  onClose: () => void;
}

const ACTION_CYCLES: Array<{ id: AnimationActionCycle; label: string; spanFull?: boolean }> = [
  { id: 'walk', label: 'Caminhar' },
  { id: 'run', label: 'Correr' },
  { id: 'jump', label: 'Pular' },
  { id: 'punch', label: 'Soco' },
  { id: 'slash', label: 'Espada' },
  { id: 'aim', label: 'Mira' },
  { id: 'wave', label: 'Acenar' },
  { id: 'dance', label: 'Dançar' },
  { id: 'idle', label: 'Idle' },
  { id: 'arc_leap', label: 'Salto / Arco Parabólico', spanFull: true },
];

const UPPER_COMPOSE_ACTIONS: Array<{ id: AnimationActionCycle | 'none'; label: string }> = [
  { id: 'none', label: 'Automático (Base)' },
  { id: 'wave', label: 'Acenar (Superior)' },
  { id: 'punch', label: 'Soco (Superior)' },
  { id: 'slash', label: 'Corte Espada (Superior)' },
  { id: 'aim', label: 'Mira / Guarda (Superior)' },
  { id: 'dance', label: 'Ritmo (Superior)' },
];

const PROP_SOCKETS: Array<{ id: PropSocketType; label: string }> = [
  { id: 'none', label: 'Nenhum' },
  { id: 'sword', label: 'Espada' },
  { id: 'shield', label: 'Escudo' },
  { id: 'staff', label: 'Bastão' },
];

const EXPORT_PROFILES: Array<{ id: RigExportProfile; label: string }> = [
  { id: 'standard', label: 'Padrão' },
  { id: 'mixamo', label: 'Mixamo' },
  { id: 'ue5', label: 'Unreal UE5' },
  { id: 'unity', label: 'Unity' },
  { id: 'godot', label: 'Godot' },
];

const FK_BONES: Array<{ role: string; label: string }> = [
  { role: 'hips', label: 'Pelvis / Quadril' },
  { role: 'spine', label: 'Spine / Coluna' },
  { role: 'chest', label: 'Chest / Tórax' },
  { role: 'neck', label: 'Neck / Pescoço' },
  { role: 'head', label: 'Head / Cabeça' },
  { role: 'leftUpperArm', label: 'Braço Esq. (UpperArm_L)' },
  { role: 'leftForeArm', label: 'Antebraço Esq. (ForeArm_L)' },
  { role: 'leftHand', label: 'Mão Esq. (Hand_L)' },
  { role: 'rightUpperArm', label: 'Braço Dir. (UpperArm_R)' },
  { role: 'rightForeArm', label: 'Antebraço Dir. (ForeArm_R)' },
  { role: 'rightHand', label: 'Mão Dir. (Hand_R)' },
  { role: 'leftThigh', label: 'Coxa Esq. (Thigh_L)' },
  { role: 'leftShin', label: 'Canela Esq. (Shin_L)' },
  { role: 'leftFoot', label: 'Pé Esq. (Foot_L)' },
  { role: 'rightThigh', label: 'Coxa Dir. (Thigh_R)' },
  { role: 'rightShin', label: 'Canela Dir. (Shin_R)' },
  { role: 'rightFoot', label: 'Pé Dir. (Foot_R)' },
];

const IK_LIMBS: Array<{ id: IkLimbId; label: string }> = [
  { id: 'rightHand', label: 'IK Mão Direita' },
  { id: 'leftHand', label: 'IK Mão Esquerda' },
  { id: 'rightFoot', label: 'IK Pé Direito' },
  { id: 'leftFoot', label: 'IK Pé Esquerdo' },
];

const APPEALS: Array<{ id: AnimationAppeal; label: string }> = [
  { id: 'neutral', label: 'Neutro' },
  { id: 'heroic', label: 'Heroico' },
  { id: 'cartoon', label: 'Cartoon' },
  { id: 'villain', label: 'Vilão' },
];

const STAGING_MODES: Array<{ id: StagingMode; label: string }> = [
  { id: 'default', label: 'Padrão' },
  { id: 'silhouette', label: 'Silhueta' },
  { id: 'rim', label: 'Foco Rim' },
];

const EASING_TYPES: Array<{ id: EasingCurveType; label: string }> = [
  { id: 'linear', label: 'Linear' },
  { id: 'slow_in_out', label: 'Slow In/Out' },
  { id: 'snap_out', label: 'Snap Out' },
  { id: 'elastic', label: 'Elástico' },
];

const SECONDARY_ACTIONS: Array<{ id: SecondaryAction; label: string }> = [
  { id: 'none', label: 'Nenhuma' },
  { id: 'breathing', label: 'Respiração' },
  { id: 'look_around', label: 'Olhar ao Redor' },
  { id: 'sway', label: 'Gesto / Balanço' },
];

function getEasingSvgPath(easing: EasingCurveType): string {
  if (easing === 'linear') return 'M 4 36 L 76 6';
  if (easing === 'slow_in_out') return 'M 4 36 C 28 36, 52 6, 76 6';
  if (easing === 'snap_out') return 'M 4 36 C 14 8, 36 6, 76 6';
  return 'M 4 36 C 18 36, 26 2, 40 12 C 50 18, 60 4, 76 6';
}

export function AnimationSidebar({
  animation,
  loadedModelName,
  loadedClips = [],
  boneCount = 0,
  jointMarkersActive,
  jointMarkerSymmetry,
  onAutoRigLoaded,
  onStartJointMarkers,
  onCommitJointMarkers,
  onCancelJointMarkers,
  onToggleJointMarkerSymmetry,
  onExportGlb,
  exportingFramesLabel,
  onCaptureFrame,
  onExportFramesZip,
  onInsertRiggedHumanoid,
  onUpdateAnimation,
  onResetAnimation,
  onClose,
}: AnimationSidebarProps) {
  const [activeTab, setActiveTab] = useState<'actions' | 'pose_ik' | 'rig_export'>('actions');
  const [selectedFkBone, setSelectedFkBone] = useState<string>('rightUpperArm');
  const [selectedIkLimb, setSelectedIkLimb] = useState<IkLimbId>('rightHand');

  const hasCurrentKeyframe = animation.keyframes.includes(animation.currentFrame);
  const currentFkDeg = animation.poseOverrides[selectedFkBone] ?? [0, 0, 0];
  const currentIk = animation.ikTargets[selectedIkLimb];

  const updateFkAxis = (axisIdx: 0 | 1 | 2, deg: number) => {
    const next: [number, number, number] = [...currentFkDeg];
    next[axisIdx] = deg;
    onUpdateAnimation({
      poseSource: 'procedural',
      poseOverrides: {
        ...animation.poseOverrides,
        [selectedFkBone]: next,
      },
    });
  };

  const updateIkOffset = (axisIdx: 0 | 1 | 2, val: number) => {
    const nextOffset: [number, number, number] = [...currentIk.offset];
    nextOffset[axisIdx] = val;
    onUpdateAnimation({
      poseSource: 'procedural',
      ikTargets: {
        ...animation.ikTargets,
        [selectedIkLimb]: {
          ...currentIk,
          enabled: true,
          offset: nextOffset,
        },
      },
    });
  };

  return (
    <aside
      aria-label="Controles de Animação 3D e Rigging"
      className="fixed top-20 left-[68px] bottom-20 z-20 w-[344px] max-w-[calc(100vw-5rem)] overflow-y-auto bg-[#101521]/95 border border-white/12 rounded-2xl p-4 shadow-2xl flex flex-col gap-3.5"
    >
      {/* Cabeçalho */}
      <div className="flex items-start gap-3 border-b border-white/10 pb-3">
        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center shrink-0">
          <Video className="w-4 h-4 text-sky-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold tracking-wide text-white uppercase">
              Rig &amp; Animação 3D
            </h2>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] font-mono tabular-nums text-sky-300 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-md">
                {animation.cycleMode === 'static' ? '1f' : '60f'}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Fechar painel"
                title="Recolher painel"
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Fluxo ActionForge: Auto-Rig, Camadas, Live IK, Pose FK e Props.
          </p>
        </div>
      </div>

      {/* Painel de Timeline & Reprodução (FIXADO NA PARTE SUPERIOR) */}
      <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
        <div
          role="group"
          aria-label="Modo de edição ou reprodução"
          className="grid grid-cols-2 gap-1 bg-[#05070b] p-1 rounded-xl border border-white/10"
        >
          <button
            type="button"
            aria-pressed={!animation.playing}
            onClick={() => onUpdateAnimation({ playing: false })}
            className={`h-8 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              !animation.playing
                ? 'bg-[#1e293b] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Editar</span>
          </button>
          <button
            type="button"
            aria-pressed={animation.playing}
            onClick={() =>
              onUpdateAnimation({
                playing: true,
                enabled: true,
                cycleMode: 'full_cycle',
              })
            }
            className={`h-8 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 cursor-pointer ${
              animation.playing
                ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/35'
                : 'text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Play</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            aria-pressed={animation.cycleMode === 'static'}
            onClick={() => onUpdateAnimation({ cycleMode: 'static', playing: false })}
            className={`h-8 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-center ${
              animation.cycleMode === 'static'
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                : 'bg-[#121826] text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            Pose Estática (1f)
          </button>
          <button
            type="button"
            aria-pressed={animation.cycleMode === 'full_cycle'}
            onClick={() =>
              onUpdateAnimation({ cycleMode: 'full_cycle', playing: true, enabled: true })
            }
            className={`h-8 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-center ${
              animation.cycleMode === 'full_cycle'
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                : 'bg-[#121826] text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            Ciclo Completo (60f)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() =>
              onUpdateAnimation({
                rotationMode: animation.rotationMode === 'quaternion' ? 'euler' : 'quaternion',
              })
            }
            className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 cursor-pointer flex items-center justify-center whitespace-nowrap"
          >
            Rotação: {animation.rotationMode === 'quaternion' ? 'Quaternion' : 'Euler'}
          </button>
          <button
            type="button"
            onClick={() => {
              const f = animation.currentFrame;
              const nextKf = hasCurrentKeyframe
                ? animation.keyframes.length > 1
                  ? animation.keyframes.filter((k) => k !== f)
                  : animation.keyframes
                : [...animation.keyframes, f].sort((a, b) => a - b);
              onUpdateAnimation({ keyframes: nextKf });
            }}
            className={`h-8 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-center whitespace-nowrap ${
              hasCurrentKeyframe
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-400/40'
                : 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border-sky-400/40'
            }`}
          >
            {hasCurrentKeyframe
              ? `Remover Key (${animation.currentFrame}f)`
              : `+ Keyframe (${animation.currentFrame}f)`}
          </button>
        </div>

        {/* Marcadores de Keyframes clicáveis */}
        <div className="flex flex-wrap items-center gap-1.5">
          {animation.keyframes.map((kf) => {
            const active = animation.currentFrame === kf;
            return (
              <div
                key={kf}
                className={`inline-flex items-center rounded-md border overflow-hidden ${
                  active
                    ? 'bg-sky-500/25 text-sky-100 border-sky-400/55'
                    : 'bg-[#121826] text-slate-300 border-white/12'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onUpdateAnimation({ currentFrame: kf, playing: false })}
                  className="h-7 px-2 text-[11px] font-mono tabular-nums hover:text-white cursor-pointer flex items-center"
                >
                  ◆ {kf}f
                </button>
                {animation.keyframes.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remover keyframe ${kf}f`}
                    onClick={() =>
                      onUpdateAnimation({
                        keyframes: animation.keyframes.filter((k) => k !== kf),
                      })
                    }
                    className="h-7 px-1.5 text-slate-400 hover:text-rose-300 hover:bg-white/5 cursor-pointer flex items-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            aria-pressed={animation.physicsEnabled}
            onClick={() => onUpdateAnimation({ physicsEnabled: !animation.physicsEnabled })}
            className={`h-8 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-center ${
              animation.physicsEnabled
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
            }`}
          >
            Física Sec.: {animation.physicsEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            aria-pressed={animation.inPlace}
            onClick={() => onUpdateAnimation({ inPlace: !animation.inPlace })}
            className={`h-8 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-center ${
              animation.inPlace
                ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
            }`}
          >
            No Lugar: {animation.inPlace ? 'In-Place' : 'Raiz'}
          </button>
        </div>

        {/* Barra de Scrub & Botão Animar */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            aria-pressed={animation.playing}
            onClick={() =>
              onUpdateAnimation({
                playing: !animation.playing,
                enabled: true,
                cycleMode: 'full_cycle',
              })
            }
            className={`h-9 px-3.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 shrink-0 cursor-pointer ${
              animation.playing
                ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50'
                : 'bg-sky-400 hover:bg-sky-300 text-slate-950 border-transparent'
            }`}
          >
            {animation.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{animation.playing ? 'Pausar' : 'Animar'}</span>
          </button>

          <input
            type="range"
            aria-label="Frame da animação"
            min={1}
            max={60}
            step={1}
            value={animation.currentFrame}
            onChange={(e) =>
              onUpdateAnimation({
                currentFrame: Number(e.target.value),
                playing: false,
                cycleMode: 'full_cycle',
              })
            }
            className="studio-slider flex-1"
          />

          <span className="text-xs font-mono tabular-nums text-slate-200 w-8 text-right shrink-0">
            {animation.currentFrame}f
          </span>
        </div>
      </div>

      {/* Cartão do Modelo & Ossos */}
      {loadedModelName ? (
        <div className="rounded-xl bg-[#090c13] border border-sky-400/25 p-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-sky-300 truncate">
              {loadedModelName}
            </span>
            <span
              className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded border shrink-0 ${
                boneCount > 0
                  ? 'text-emerald-300 bg-emerald-500/15 border-emerald-400/30'
                  : 'text-amber-300 bg-amber-500/15 border-amber-400/30'
              }`}
            >
              {boneCount > 0 ? `${boneCount} ossos` : 'Sem ossos'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-pressed={animation.showBones}
              onClick={() => onUpdateAnimation({ showBones: !animation.showBones })}
              disabled={boneCount === 0}
              className={`h-7 px-2 text-[11px] font-medium rounded-lg border flex items-center justify-center gap-1 ${
                boneCount === 0
                  ? 'bg-[#0b0f17] text-slate-600 border-white/5 cursor-not-allowed'
                  : animation.showBones
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/55 cursor-pointer'
                    : 'bg-[#121826] text-slate-300 border-white/10 hover:text-white cursor-pointer'
              }`}
            >
              {animation.showBones ? (
                <Eye className="w-3 h-3 shrink-0" />
              ) : (
                <EyeOff className="w-3 h-3 shrink-0" />
              )}
              <span>{animation.showBones ? 'Ocultar Ossos' : 'Mostrar Ossos'}</span>
            </button>

            {onAutoRigLoaded && (
              <button
                type="button"
                onClick={() => onAutoRigLoaded('biped')}
                className="h-7 px-2 text-[11px] font-medium rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-200 border border-sky-400/40 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Wand2 className="w-3 h-3 shrink-0" />
                <span>{boneCount > 0 ? 'Re-Rig Bípede' : 'Auto-Rig Ossos'}</span>
              </button>
            )}
          </div>

          {loadedClips.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1 border-t border-white/8">
              <div className="grid grid-cols-2 gap-1 bg-[#05070b] p-0.5 rounded-lg border border-white/10">
                <button
                  type="button"
                  aria-pressed={animation.poseSource === 'procedural'}
                  onClick={() => onUpdateAnimation({ poseSource: 'procedural', enabled: true })}
                  className={`h-7 text-[11px] font-medium rounded-md cursor-pointer ${
                    animation.poseSource === 'procedural'
                      ? 'bg-sky-500/25 text-sky-100'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Comandos 3D
                </button>
                <button
                  type="button"
                  aria-pressed={animation.poseSource === 'clip'}
                  onClick={() => onUpdateAnimation({ poseSource: 'clip', enabled: true })}
                  className={`h-7 text-[11px] font-medium rounded-md cursor-pointer ${
                    animation.poseSource === 'clip'
                      ? 'bg-emerald-500/25 text-emerald-100'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Clipe GLB ({loadedClips.length})
                </button>
              </div>

              {animation.poseSource === 'clip' && (
                <div className="flex flex-wrap gap-1.5">
                  {loadedClips.map((clipName, idx) => {
                    const active = animation.activeClipIndex === idx;
                    return (
                      <button
                        key={`${clipName}-${idx}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          onUpdateAnimation({
                            poseSource: 'clip',
                            activeClipIndex: idx,
                            playing: true,
                            enabled: true,
                            cycleMode: 'full_cycle',
                          })
                        }
                        className={`h-7 px-2.5 text-[11px] font-medium rounded-lg border cursor-pointer truncate max-w-full ${
                          active
                            ? 'bg-emerald-500/25 text-emerald-100 border-emerald-400/55'
                            : 'bg-[#121826] text-slate-300 border-white/10 hover:text-white'
                        }`}
                      >
                        {clipName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        onInsertRiggedHumanoid && (
          <button
            type="button"
            onClick={onInsertRiggedHumanoid}
            className="w-full h-9 px-3 text-xs font-medium rounded-xl bg-[#090c13] hover:bg-[#121826] text-sky-200 border border-sky-400/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Bone className="w-3.5 h-3.5 text-sky-400" />
            <span>Inserir Personagem com Ossos (19 Ossos)</span>
          </button>
        )
      )}

      {/* Abas ActionForge: Ações & Camadas | Pose FK & IK | Rig & Exportar */}
      <div className="grid grid-cols-3 gap-1 bg-[#05070b] p-1 rounded-xl border border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab('actions')}
          className={`h-8 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'actions'
              ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Sparkles className="w-3 h-3" />
          <span>Ações</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pose_ik')}
          className={`h-8 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'pose_ik'
              ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Sliders className="w-3 h-3" />
          <span>FK &amp; IK</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('rig_export')}
          className={`h-8 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'rig_export'
              ? 'bg-sky-500/20 text-sky-200 border border-sky-400/40'
              : 'text-slate-400 hover:text-white border border-transparent'
          }`}
        >
          <Bone className="w-3 h-3" />
          <span>Rig &amp; GLB</span>
        </button>
      </div>

      {activeTab === 'actions' && (
        <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-xs font-semibold text-slate-200">
                Ações &amp; 12 Princípios
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onResetAnimation}
                title="Restaurar padrões"
                aria-label="Restaurar padrões de animação"
                className="w-8 h-8 rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-300 border border-white/10 flex items-center justify-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-pressed={animation.enabled}
                onClick={() => onUpdateAnimation({ enabled: !animation.enabled })}
                className={`h-8 px-3 text-[11px] font-semibold rounded-lg border cursor-pointer flex items-center ${
                  animation.enabled
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/50'
                    : 'bg-[#121826] text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                {animation.enabled ? 'Ativo' : 'Pausado'}
              </button>
            </div>
          </div>

          {/* Ciclo de Ação */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              Ciclo de Ação (Base / Corpo Inferior)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {ACTION_CYCLES.map((act) => {
                const active =
                  animation.action === act.id &&
                  (!loadedModelName || animation.poseSource === 'procedural');
                return (
                  <button
                    key={act.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onUpdateAnimation({
                        action: act.id,
                        poseSource: 'procedural',
                        enabled: true,
                        playing: true,
                        cycleMode: 'full_cycle',
                      })
                    }
                    className={`h-8 px-2 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                      act.spanFull ? 'col-span-3' : ''
                    } ${
                      active
                        ? 'bg-sky-500/20 text-sky-200 border-sky-400/55 shadow-sm'
                        : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                    }`}
                  >
                    {act.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camadas / Compose (ActionForge Layering) */}
          <div className="rounded-lg bg-[#05070b] border border-white/10 p-2.5 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Compose (Camada Superior)</span>
              </span>
              <button
                type="button"
                aria-pressed={animation.composeEnabled}
                onClick={() =>
                  onUpdateAnimation({
                    composeEnabled: !animation.composeEnabled,
                    upperBodyAction:
                      !animation.composeEnabled && animation.upperBodyAction === 'none'
                        ? 'wave'
                        : animation.upperBodyAction,
                    poseSource: 'procedural',
                  })
                }
                className={`h-6 px-2 text-[10px] font-mono rounded border cursor-pointer ${
                  animation.composeEnabled
                    ? 'bg-sky-500/25 text-sky-200 border-sky-400/50'
                    : 'bg-[#121826] text-slate-400 border-white/10'
                }`}
              >
                {animation.composeEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
            {animation.composeEnabled && (
              <select
                aria-label="Ação do tronco e braços"
                value={animation.upperBodyAction}
                onChange={(e) =>
                  onUpdateAnimation({
                    upperBodyAction: e.target.value as AnimationActionCycle | 'none',
                    poseSource: 'procedural',
                  })
                }
                className="w-full h-8 px-2 text-[11px] rounded-lg bg-[#121826] text-slate-100 border border-white/12 outline-none"
              >
                {UPPER_COMPOSE_ACTIONS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Prop Sockets (Acessório na Mão) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Sword className="w-3.5 h-3.5 text-sky-400" />
              <span>Prop Socket (Acessório na Mão)</span>
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {PROP_SOCKETS.map((pr) => (
                <button
                  key={pr.id}
                  type="button"
                  aria-pressed={animation.propType === pr.id}
                  onClick={() => onUpdateAnimation({ propType: pr.id })}
                  className={`h-8 px-1.5 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                    animation.propType === pr.id
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                      : 'bg-[#121826] text-slate-300 border-white/10 hover:text-white'
                  }`}
                >
                  {pr.label}
                </button>
              ))}
            </div>
          </div>

          {/* 12. Apelo */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              12. Apelo (Personalidade)
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {APPEALS.map((ap) => {
                const active = animation.appeal === ap.id;
                return (
                  <button
                    key={ap.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdateAnimation({ appeal: ap.id, poseSource: 'procedural' })}
                    className={`h-8 px-1.5 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                      active
                        ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                        : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                    }`}
                  >
                    {ap.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Squash/Stretch & 2. Antecipação */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 truncate">1. Squash/Stretch</span>
                <span className="font-mono tabular-nums text-sky-300">
                  {animation.squashStretch}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={animation.squashStretch}
                onChange={(e) => onUpdateAnimation({ squashStretch: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 truncate">2. Antecipação</span>
                <span className="font-mono tabular-nums text-sky-300">
                  {animation.anticipation}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={animation.anticipation}
                onChange={(e) => onUpdateAnimation({ anticipation: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
          </div>

          {/* 3. Encenação (Staging) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              <span>3. Encenação (Staging &amp; Silhueta)</span>
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {STAGING_MODES.map((st) => {
                const active = animation.staging === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdateAnimation({ staging: st.id })}
                    className={`h-8 px-2 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                      active
                        ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                        : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Método */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              4. Método (Pose vs Direta)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                aria-pressed={animation.method === 'pose_to_pose'}
                onClick={() => onUpdateAnimation({ method: 'pose_to_pose' })}
                className={`h-9 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-center text-center leading-tight ${
                  animation.method === 'pose_to_pose'
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                    : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                }`}
              >
                Pose a Pose
              </button>
              <button
                type="button"
                aria-pressed={animation.method === 'straight_ahead'}
                onClick={() => onUpdateAnimation({ method: 'straight_ahead' })}
                className={`h-9 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-center text-center leading-tight ${
                  animation.method === 'straight_ahead'
                    ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                    : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                }`}
              >
                Direta (Orgânica)
              </button>
            </div>
          </div>

          {/* 5. Sobreposição & 10. Exagero */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 truncate">5. Sobreposição</span>
                <span className="font-mono tabular-nums text-sky-300">
                  {animation.followThrough}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={animation.followThrough}
                onChange={(e) => onUpdateAnimation({ followThrough: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 truncate">10. Exagero</span>
                <span className="font-mono tabular-nums text-sky-300">
                  {animation.exaggeration.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={2.0}
                step={0.1}
                value={animation.exaggeration}
                onChange={(e) => onUpdateAnimation({ exaggeration: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
          </div>

          {/* 6. Graph Editor (Easing) */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">
              6. Aceleração / Desaceleração (Easing)
            </span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-[68px] rounded-lg bg-[#05070b] border border-white/10 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 80 42" className="w-full h-full">
                  <path
                    d={getEasingSvgPath(animation.easing)}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="grid grid-cols-2 gap-1.5 flex-1">
                {EASING_TYPES.map((es) => {
                  const active = animation.easing === es.id;
                  return (
                    <button
                      key={es.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onUpdateAnimation({ easing: es.id })}
                      className={`h-8 px-2 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                        active
                          ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                          : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                      }`}
                    >
                      {es.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 7. Arcos + Motion Trail */}
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1.5 text-[11px] flex-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">7. Arcos (Trajetória)</span>
                <span className="font-mono tabular-nums text-sky-300">{animation.arcs}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={animation.arcs}
                onChange={(e) => onUpdateAnimation({ arcs: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
            <button
              type="button"
              aria-pressed={animation.motionTrail}
              onClick={() => onUpdateAnimation({ motionTrail: !animation.motionTrail })}
              className={`h-8 px-3 text-[11px] font-medium rounded-lg border whitespace-nowrap shrink-0 cursor-pointer flex items-center ${
                animation.motionTrail
                  ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                  : 'bg-[#121826] text-slate-400 border-white/10 hover:bg-[#192235] hover:text-white'
              }`}
            >
              Motion Trail
            </button>
          </div>

          {/* 8. Ação Secundária */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">8. Ação Secundária</span>
            <div className="grid grid-cols-2 gap-1.5">
              {SECONDARY_ACTIONS.map((sa) => {
                const active = animation.secondaryAction === sa.id;
                return (
                  <button
                    key={sa.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdateAnimation({ secondaryAction: sa.id })}
                    className={`h-8 px-2 text-[11px] font-medium rounded-lg border whitespace-nowrap cursor-pointer flex items-center justify-center ${
                      active
                        ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                        : 'bg-[#121826] text-slate-300 border-white/10 hover:bg-[#192235] hover:text-white'
                    }`}
                  >
                    {sa.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 9. Temporização & 11. Desenho Sólido */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 truncate">9. Temporização</span>
                <span className="font-mono tabular-nums text-sky-300">
                  {animation.timing.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.25}
                max={2.0}
                step={0.05}
                value={animation.timing}
                onChange={(e) => onUpdateAnimation({ timing: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-[11px]">
              <div className="flex items-center justify-between gap-1">
                <span className="text-slate-400 truncate">11. Desenho Sólido</span>
                <span className="font-mono tabular-nums text-sky-300">
                  {animation.solidDrawing}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={animation.solidDrawing}
                onChange={(e) => onUpdateAnimation({ solidDrawing: Number(e.target.value) })}
                className="studio-slider w-full"
              />
            </label>
          </div>

          {/* Cadência (FPS) */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/8">
            <span className="text-[11px] font-medium text-slate-400">Cadência (FPS)</span>
            <div className="flex items-center gap-1.5">
              {([12, 24, 60] as const).map((fps) => (
                <button
                  key={fps}
                  type="button"
                  aria-pressed={animation.fpsCadence === fps}
                  onClick={() => onUpdateAnimation({ fpsCadence: fps })}
                  className={`h-7 px-2.5 text-[11px] font-mono tabular-nums rounded-lg border cursor-pointer flex items-center justify-center ${
                    animation.fpsCadence === fps
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/55'
                      : 'bg-[#121826] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {fps}fps
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pose_ik' && (
        <div className="flex flex-col gap-3">
          {/* Live IK (ActionForge 2-Bone Analytical IK) */}
          <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                Live IK (Membros 2-Ossos)
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateAnimation({
                    ikTargets: {
                      leftHand: { enabled: false, offset: [0, 0, 0] },
                      rightHand: { enabled: false, offset: [0, 0, 0] },
                      leftFoot: { enabled: false, offset: [0, 0, 0] },
                      rightFoot: { enabled: false, offset: [0, 0, 0] },
                    },
                  })
                }
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
              >
                Zerar IK
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {IK_LIMBS.map((limb) => {
                const st = animation.ikTargets[limb.id];
                const isSel = selectedIkLimb === limb.id;
                return (
                  <button
                    key={limb.id}
                    type="button"
                    onClick={() => {
                      setSelectedIkLimb(limb.id);
                      if (!st.enabled) {
                        onUpdateAnimation({
                          poseSource: 'procedural',
                          ikTargets: {
                            ...animation.ikTargets,
                            [limb.id]: { ...st, enabled: true },
                          },
                        });
                      }
                    }}
                    className={`h-8 px-2 text-[11px] font-medium rounded-lg border cursor-pointer flex items-center justify-between ${
                      isSel && st.enabled
                        ? 'bg-sky-500/20 text-sky-100 border-sky-400/55'
                        : st.enabled
                          ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40'
                          : 'bg-[#121826] text-slate-300 border-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{limb.label}</span>
                    <span className="font-mono text-[9px]">{st.enabled ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-400">
                Alvo Ativo ({IK_LIMBS.find((l) => l.id === selectedIkLimb)?.label})
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateAnimation({
                    ikTargets: {
                      ...animation.ikTargets,
                      [selectedIkLimb]: {
                        ...currentIk,
                        enabled: !currentIk.enabled,
                      },
                    },
                  })
                }
                className={`h-6 px-2 text-[10px] font-mono rounded border cursor-pointer ${
                  currentIk.enabled
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/45'
                    : 'bg-[#121826] text-slate-400 border-white/10'
                }`}
              >
                {currentIk.enabled ? 'Ativado' : 'Desativado'}
              </button>
            </div>

            {(['X (Lado)', 'Y (Altura)', 'Z (Frente)'] as const).map((axisLabel, idx) => (
              <label key={axisLabel} className="flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{axisLabel}</span>
                  <span className="font-mono tabular-nums text-sky-300">
                    {currentIk.offset[idx].toFixed(2)}m
                  </span>
                </div>
                <input
                  type="range"
                  min={-0.8}
                  max={0.8}
                  step={0.02}
                  value={currentIk.offset[idx]}
                  onChange={(e) => updateIkOffset(idx as 0 | 1 | 2, Number(e.target.value))}
                  className="studio-slider w-full"
                />
              </label>
            ))}
          </div>

          {/* Pose Mode FK Individual por Osso */}
          <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-white">
                Pose Mode FK (Por Osso)
              </span>
              <button
                type="button"
                onClick={() => onUpdateAnimation({ poseOverrides: {} })}
                className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
              >
                Resetar Todos
              </button>
            </div>

            <select
              aria-label="Selecionar osso FK"
              value={selectedFkBone}
              onChange={(e) => setSelectedFkBone(e.target.value)}
              className="w-full h-8 px-2 text-[11px] rounded-lg bg-[#121826] text-slate-100 border border-white/12 outline-none"
            >
              {FK_BONES.map((b) => (
                <option key={b.role} value={b.role}>
                  {b.label}
                </option>
              ))}
            </select>

            {(['Rotação X', 'Rotação Y', 'Rotação Z'] as const).map((axisLabel, idx) => (
              <label key={axisLabel} className="flex flex-col gap-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{axisLabel}</span>
                  <span className="font-mono tabular-nums text-sky-300">
                    {currentFkDeg[idx]}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-135}
                  max={135}
                  step={1}
                  value={currentFkDeg[idx]}
                  onChange={(e) => updateFkAxis(idx as 0 | 1 | 2, Number(e.target.value))}
                  className="studio-slider w-full"
                />
              </label>
            ))}

            <button
              type="button"
              onClick={() => {
                const next = { ...animation.poseOverrides };
                delete next[selectedFkBone];
                onUpdateAnimation({ poseOverrides: next });
              }}
              className="h-7 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-300 border border-white/10 cursor-pointer"
            >
              Zerar Osso Selecionado
            </button>
          </div>
        </div>
      )}

      {activeTab === 'rig_export' && (
        <div className="flex flex-col gap-3">
          {/* Marcadores de Rigging (ActionForge Auto-Rigging) */}
          <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-white">
              Marcadores 3D &amp; Auto-Rigging
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Ajuste os marcadores anatômicos na malha importada (estilo ActionForge) antes de gerar o esqueleto e skinning.
            </p>

            {jointMarkersActive ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  aria-pressed={jointMarkerSymmetry}
                  onClick={onToggleJointMarkerSymmetry}
                  className={`h-8 px-2.5 text-[11px] font-medium rounded-lg border flex items-center justify-between cursor-pointer ${
                    jointMarkerSymmetry
                      ? 'bg-sky-500/20 text-sky-100 border-sky-400/45'
                      : 'bg-[#121826] text-slate-300 border-white/10'
                  }`}
                >
                  <span>Simetria E/D Automática</span>
                  <span className="font-mono text-[10px]">{jointMarkerSymmetry ? 'ON' : 'OFF'}</span>
                </button>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={onCommitJointMarkers}
                    className="h-9 px-2 text-xs font-semibold rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Gerar Skeleton</span>
                  </button>
                  <button
                    type="button"
                    onClick={onCancelJointMarkers}
                    className="h-9 px-2 text-xs font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-300 border border-white/10 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={!loadedModelName}
                  onClick={onStartJointMarkers}
                  className={`h-9 px-3 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 ${
                    loadedModelName
                      ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-100 border-sky-400/45 cursor-pointer'
                      : 'bg-[#0b0f17] text-slate-600 border-white/5 cursor-not-allowed'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Posicionar Marcadores 3D na Malha</span>
                </button>
                {onAutoRigLoaded && loadedModelName && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAutoRigLoaded('biped')}
                      className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 cursor-pointer"
                    >
                      Auto-Rig Bípede (19)
                    </button>
                    <button
                      type="button"
                      onClick={() => onAutoRigLoaded('flex_spine')}
                      className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 cursor-pointer"
                    >
                      Espinha Flex (5)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Exportação para Engines (UE5 / Unity / Godot / Mixamo) */}
          <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
            <span className="text-xs font-semibold text-white">
              Exportar Skeleton .GLB (Game Engines)
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {EXPORT_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onUpdateAnimation({ exportProfile: p.id })}
                  className={`h-8 px-2 text-[11px] font-medium rounded-lg border cursor-pointer ${
                    animation.exportProfile === p.id
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400/50'
                      : 'bg-[#121826] text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onExportGlb(animation.exportProfile)}
              className="w-full h-9 px-3 text-xs font-semibold rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar .GLB ({EXPORT_PROFILES.find((p) => p.id === animation.exportProfile)?.label})</span>
            </button>
          </div>

          {/* Exportar PNG & Quadro a Quadro (Fundo Transparente) */}
          {(onCaptureFrame || onExportFramesZip) && (
            <div className="rounded-xl bg-[#090c13] border border-white/10 p-3 flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-white">
                Exportar PNG &amp; Quadro a Quadro
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Gere PNG do quadro atual ou exporte toda a animação quadro a quadro com fundo transparente.
              </p>
              {onCaptureFrame && (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onCaptureFrame(true)}
                    className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-sky-200 border border-sky-400/35 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>PNG Transp.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onCaptureFrame(false)}
                    className="h-8 px-2 text-[11px] font-medium rounded-lg bg-[#121826] hover:bg-[#192235] text-slate-200 border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                    <span>PNG Fundo</span>
                  </button>
                </div>
              )}
              {onExportFramesZip && (
                <button
                  type="button"
                  disabled={Boolean(exportingFramesLabel)}
                  onClick={() => onExportFramesZip(1, true)}
                  className="w-full h-9 px-3 text-xs font-semibold rounded-lg bg-emerald-400 hover:bg-emerald-300 disabled:opacity-60 text-slate-950 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>
                    {exportingFramesLabel ?? 'Quadro a Quadro (.ZIP PNG Transp.)'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
