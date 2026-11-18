import { create } from 'zustand';

export interface EditorCommand {
  id: string;
  label: string;
  undo: () => void;
  redo: () => void;
}

interface EditorStoreState {
  activeWorkspace: 'viewport' | 'animation';
  selectedMeshId: string | null;
  activeModal: 'none' | 'command_palette' | 'verification' | 'code_export' | 'drive';
  undoStack: EditorCommand[];
  redoStack: EditorCommand[];
  setActiveWorkspace: (ws: 'viewport' | 'animation') => void;
  setSelectedMeshId: (id: string | null) => void;
  setActiveModal: (modal: EditorStoreState['activeModal']) => void;
  pushCommand: (cmd: EditorCommand) => void;
  undoCommand: () => string | null;
  redoCommand: () => string | null;
}

export const useEditorStore = create<EditorStoreState>((set, get) => ({
  activeWorkspace: 'viewport',
  selectedMeshId: null,
  activeModal: 'none',
  undoStack: [],
  redoStack: [],

  setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
  setSelectedMeshId: (selectedMeshId) => set({ selectedMeshId }),
  setActiveModal: (activeModal) => set({ activeModal }),

  pushCommand: (cmd) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-49), cmd],
      redoStack: [],
    })),

  undoCommand: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length === 0) return null;
    const cmd = undoStack[undoStack.length - 1];
    cmd.undo();
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, cmd],
    });
    return cmd.label;
  },

  redoCommand: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const cmd = redoStack[redoStack.length - 1];
    cmd.redo();
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, cmd],
    });
    return cmd.label;
  },
}));
