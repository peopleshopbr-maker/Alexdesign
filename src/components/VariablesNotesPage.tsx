import React, { useEffect, useState } from 'react';
import { Box, Check, MessageSquare, MousePointerClick, Plus, Sliders, Trash2 } from 'lucide-react';
import {
  VariableBindingRule,
  VariableBindingSource,
  VariableBindingTarget,
} from '../utils/reactiveShaders';

export interface SceneVariablesState {
  rotationSpeed: number;
  globalScale: number;
  showGrid: boolean;
  wireframe: boolean;
  highlightColor: string;
}

interface ReviewNote {
  id: string;
  author: string;
  text: string;
  resolved: boolean;
  createdAt: string;
}

interface VariablesNotesPageProps {
  assetName: string;
  variables: SceneVariablesState;
  bindings: VariableBindingRule[];
  onUpdateVariables: (patch: Partial<SceneVariablesState>) => void;
  onUpdateBindings: (next: VariableBindingRule[]) => void;
  onApplyAccentToScene: (colorHex: string) => void;
  onOpenViewport: () => void;
}

const NOTES_STORAGE_KEY = 'alexdesign_scene_notes_v1';

const SOURCE_LABELS: Record<VariableBindingSource, string> = {
  mouse_x: 'Mouse X (Posição Horizontal)',
  mouse_y: 'Mouse Y (Posição Vertical)',
  scroll: 'Scroll (Roda do Mouse)',
  click: 'Clique na Cena',
};

const TARGET_LABELS: Record<VariableBindingTarget, string> = {
  fresnel: 'Shader Fresnel (Brilho Borda)',
  dissolve: 'Shader Dissolve (Ruído)',
  distortion: 'Shader Distorção (Ondas)',
  particleRate: 'Taxa de Partículas VFX',
  animSpeed: 'Velocidade da Animação',
  exposure: 'Exposição HDR (EV)',
};

export const VariablesNotesPage: React.FC<VariablesNotesPageProps> = ({
  assetName,
  variables,
  bindings,
  onUpdateVariables,
  onUpdateBindings,
  onApplyAccentToScene,
  onOpenViewport,
}) => {
  const [notes, setNotes] = useState<ReviewNote[]>(() => {
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [
      {
        id: 'note_1',
        author: 'Design',
        text: 'Conferir suavidade de Fresnel e normais da malha antes de exportar .GLB.',
        resolved: false,
        createdAt: 'Hoje',
      },
    ];
  });
  const [authorName, setAuthorName] = useState('Equipe');
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
    } catch {
      // ignore
    }
  }, [notes]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setNotes((prev) => [
      {
        id: `note_${Date.now()}`,
        author: authorName.trim() || 'Equipe',
        text: trimmed,
        resolved: false,
        createdAt: `${hh}:${mm}`,
      },
      ...prev,
    ]);
    setNoteInput('');
  };

  const handleAddBinding = () => {
    const nextRule: VariableBindingRule = {
      id: `bind_${Date.now()}`,
      enabled: true,
      source: 'mouse_x',
      target: 'fresnel',
      strength: 1.0,
    };
    onUpdateBindings([...bindings, nextRule]);
  };

  return (
    <div className="max-w-[1440px] mx-auto p-3.5 sm:p-4 space-y-4">
      <div className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <h1 className="text-base font-bold text-[#231F1D]">
            Variáveis Customizadas (Blender IDProperty) & Vínculos Web Interativos
          </h1>
          <p className="text-xs text-[#635B54]">
            Vincule eventos reais (Mouse, Scroll, Clique) a Shaders/VFX e exporte tudo como{' '}
            <span className="font-mono text-sky-300">IDProperty</span> para{' '}
            <span className="font-mono text-slate-200">{assetName}</span>.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenViewport}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer whitespace-nowrap"
        >
          <Box className="w-3.5 h-3.5" />
          <span>Estúdio 3D</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Left: Live Scene Variables + Interactive Bindings */}
        <section className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-semibold text-[#231F1D]">Variáveis Reativas da Cena (IDProperty)</h2>
          </div>

          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-sky-300">animacaoVelocidade</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {variables.rotationSpeed.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.25}
                max={2.5}
                step={0.05}
                value={variables.rotationSpeed}
                onChange={(e) => onUpdateVariables({ rotationSpeed: Number(e.target.value) })}
                className="w-full accent-orange-500"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-sky-300">escalaRaiz</span>
                <span className="font-mono text-slate-200 tabular-nums">
                  {variables.globalScale.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={0.4}
                max={2.0}
                step={0.05}
                value={variables.globalScale}
                onChange={(e) => onUpdateVariables({ globalScale: Number(e.target.value) })}
                className="w-full accent-orange-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 flex items-center justify-between gap-2 text-xs cursor-pointer">
                <span className="font-mono text-slate-200">exibirGrade</span>
                <input
                  type="checkbox"
                  checked={variables.showGrid}
                  onChange={(e) => onUpdateVariables({ showGrid: e.target.checked })}
                  className="accent-orange-500"
                />
              </label>

              <label className="p-3 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 flex items-center justify-between gap-2 text-xs cursor-pointer">
                <span className="font-mono text-slate-200">modoWireframe</span>
                <input
                  type="checkbox"
                  checked={variables.wireframe}
                  onChange={(e) => onUpdateVariables({ wireframe: e.target.checked })}
                  className="accent-orange-500"
                />
              </label>
            </div>

            <div className="p-3 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <input
                  type="color"
                  value={variables.highlightColor}
                  onChange={(e) => onUpdateVariables({ highlightColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-700 bg-transparent cursor-pointer"
                />
                <div>
                  <div className="text-xs font-mono text-sky-300">corDestaque</div>
                  <div className="text-[11px] font-mono text-[#635B54]">
                    {variables.highlightColor.toUpperCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onApplyAccentToScene(variables.highlightColor)}
                className="px-3 py-1.5 rounded-lg bg-[#FAF8F5] hover:bg-slate-700 text-xs font-medium text-[#231F1D] cursor-pointer"
              >
                Aplicar na Malha Ativa
              </button>
            </div>

            {/* Web Interactivity Bindings (Mouse / Scroll / Click -> VFX/Anim/Shader) */}
            <div className="p-3.5 rounded-xl bg-[#0D1017] border border-[#231F1D]/15 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#231F1D]">
                  <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Gatilhos Interativos (Mouse / Scroll / Clique)</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBinding}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded bg-cyan-600/20 border border-cyan-500/50 hover:bg-cyan-600/30 text-[11px] text-cyan-200 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Vínculo</span>
                </button>
              </div>

              <div className="space-y-2">
                {bindings.map((rule) => (
                  <div
                    key={rule.id}
                    className="p-2.5 rounded-lg bg-[#141923] border border-[#231F1D]/15 space-y-2 text-[11px]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-1.5 text-slate-200 font-medium cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) =>
                            onUpdateBindings(
                              bindings.map((b) =>
                                b.id === rule.id ? { ...b, enabled: e.target.checked } : b
                              )
                            )
                          }
                          className="accent-cyan-500"
                        />
                        <span>{rule.enabled ? 'Ativo no Viewport' : 'Desativado'}</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => onUpdateBindings(bindings.filter((b) => b.id !== rule.id))}
                        className="text-[#635B54] hover:text-red-400 cursor-pointer"
                        title="Remover vínculo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      <select
                        value={rule.source}
                        onChange={(e) =>
                          onUpdateBindings(
                            bindings.map((b) =>
                              b.id === rule.id
                                ? { ...b, source: e.target.value as VariableBindingSource }
                                : b
                            )
                          )
                        }
                        className="px-2 py-1 rounded bg-[#090C12] border border-slate-700 text-slate-200"
                      >
                        {(Object.keys(SOURCE_LABELS) as VariableBindingSource[]).map((s) => (
                          <option key={s} value={s}>
                            {SOURCE_LABELS[s]}
                          </option>
                        ))}
                      </select>

                      <select
                        value={rule.target}
                        onChange={(e) =>
                          onUpdateBindings(
                            bindings.map((b) =>
                              b.id === rule.id
                                ? { ...b, target: e.target.value as VariableBindingTarget }
                                : b
                            )
                          )
                        }
                        className="px-2 py-1 rounded bg-[#090C12] border border-slate-700 text-slate-200"
                      >
                        {(Object.keys(TARGET_LABELS) as VariableBindingTarget[]).map((t) => (
                          <option key={t} value={t}>
                            {TARGET_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 text-[10px] text-[#635B54]">
                      <span>Ganho</span>
                      <input
                        type="range"
                        min={0.1}
                        max={2}
                        step={0.1}
                        value={rule.strength}
                        onChange={(e) =>
                          onUpdateBindings(
                            bindings.map((b) =>
                              b.id === rule.id ? { ...b, strength: Number(e.target.value) } : b
                            )
                          )
                        }
                        className="flex-1 accent-cyan-400"
                      />
                      <span className="font-mono text-cyan-300 tabular-nums w-8 text-right">
                        {rule.strength.toFixed(1)}x
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right: Design Notes & Checklist */}
        <section className="rounded-xl bg-[#141923] border border-[#231F1D]/15 p-4 space-y-3.5">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-orange-400" />
            <h2 className="text-sm font-semibold text-[#231F1D]">Comentários & Notas da Cena</h2>
          </div>

          <form onSubmit={handleAddNote} className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="Autor"
                className="px-2.5 py-2 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 text-xs text-[#231F1D] focus:outline-none focus:border-orange-500"
              />
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Adicionar anotação de ajuste ou revisão..."
                className="px-3 py-2 rounded-lg bg-[#0D1017] border border-[#231F1D]/15 text-xs text-[#231F1D] focus:outline-none focus:border-orange-500"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold text-[#231F1D] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Anotação</span>
            </button>
          </form>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-[#231F1D]/15 rounded-xl">
                Nenhuma anotação registrada nesta cena.
              </div>
            ) : (
              notes.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    n.resolved
                      ? 'bg-[#0D1017]/60 border-[#231F1D]/15 opacity-70'
                      : 'bg-[#0D1017] border-[#231F1D]/15'
                  }`}
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-[#635B54]">
                      <span className="font-semibold text-slate-200">{n.author}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">{n.createdAt}</span>
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${
                        n.resolved ? 'line-through text-slate-500' : 'text-slate-200'
                      }`}
                    >
                      {n.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        setNotes((prev) =>
                          prev.map((x) => (x.id === n.id ? { ...x, resolved: !x.resolved } : x))
                        )
                      }
                      title={n.resolved ? 'Reabrir nota' : 'Marcar como concluída'}
                      className={`w-7 h-7 rounded-md flex items-center justify-center cursor-pointer ${
                        n.resolved
                          ? 'bg-emerald-600 text-[#231F1D]'
                          : 'bg-[#FAF8F5] text-slate-300 hover:text-emerald-400'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotes((prev) => prev.filter((x) => x.id !== n.id))}
                      title="Excluir anotação"
                      className="w-7 h-7 rounded-md bg-[#FAF8F5] text-[#635B54] hover:text-red-400 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

