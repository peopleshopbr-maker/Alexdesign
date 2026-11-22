import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface StudioStats {
  meshes: number;
  triangles: number;
  materials: number;
  bones: number;
  hasUvs: boolean;
  activeAssetName: string;
}

interface StudioIntelligenceContextValue {
  stats: StudioStats;
  updateStats: (patch: Partial<StudioStats>) => void;
  lastActionNote: string | null;
  notifyAction: (note: string) => void;
}

const DEFAULT_STATS: StudioStats = {
  meshes: 10,
  triangles: 0,
  materials: 4,
  bones: 0,
  hasUvs: true,
  activeAssetName: 'Modelo_Studio_AlexDesign',
};

const StudioIntelligenceContext = createContext<StudioIntelligenceContextValue>({
  stats: DEFAULT_STATS,
  updateStats: () => {},
  lastActionNote: null,
  notifyAction: () => {},
});

export const StudioIntelligenceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stats, setStats] = useState<StudioStats>(DEFAULT_STATS);
  const [lastActionNote, setLastActionNote] = useState<string | null>(null);

  const updateStats = useCallback((patch: Partial<StudioStats>) => {
    setStats((prev) => {
      const next = { ...prev, ...patch };
      if (
        next.meshes === prev.meshes &&
        next.triangles === prev.triangles &&
        next.materials === prev.materials &&
        next.bones === prev.bones &&
        next.hasUvs === prev.hasUvs &&
        next.activeAssetName === prev.activeAssetName
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const notifyAction = useCallback((note: string) => {
    setLastActionNote((prev) => (prev === note ? prev : note));
  }, []);

  const value = useMemo(
    () => ({ stats, updateStats, lastActionNote, notifyAction }),
    [stats, updateStats, lastActionNote, notifyAction]
  );

  return (
    <StudioIntelligenceContext.Provider value={value}>
      {children}
    </StudioIntelligenceContext.Provider>
  );
};

export function useStudioIntelligence(): StudioIntelligenceContextValue {
  return useContext(StudioIntelligenceContext);
}
