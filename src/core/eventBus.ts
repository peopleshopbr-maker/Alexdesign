import mitt from 'mitt';

export type EditorEvents = {
  'viewport:focusMesh': { meshId: string };
  'viewport:selectMesh': { meshId: string | null };
  'viewport:undo': void;
  'viewport:redo': void;
  'viewport:frameScene': void;
  'timeline:seek': { frame: number };
  'command:execute': { id: string; label: string };
};

export const editorEventBus = mitt<EditorEvents>();
