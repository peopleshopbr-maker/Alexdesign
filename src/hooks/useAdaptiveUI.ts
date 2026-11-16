import { useState, useEffect, useCallback, useMemo } from 'react';

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop';

export interface AdaptiveActionItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'accent';
  disabled?: boolean;
}

const STORAGE_KEY = 'alexdesign_ui_usage_v1';

export function useAdaptiveUI(actions: AdaptiveActionItem[], enableDynamicOrder = true) {
  // 1. Deteccao adaptativa de dispositivo (Celular, Tablet, Computador)
  const [device, setDevice] = useState<DeviceCategory>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w < 640) return 'mobile';
    if (w < 1024) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) setDevice('mobile');
      else if (w < 1024) setDevice('tablet');
      else setDevice('desktop');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Memoria de comportamento do usuario (contagem de cliques por botao)
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const trackAction = useCallback((id: string) => {
    setUsageCounts((prev) => {
      const updated = { ...prev, [id]: (prev[id] || 0) + 1 };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignora erro de cota do storage
      }
      return updated;
    });
  }, []);

  // 3. Reordenacao dinamica baseada nos cliques mais frequentes
  const orderedActions = useMemo(() => {
    if (!enableDynamicOrder) return actions;
    return [...actions].sort((a, b) => {
      const countA = usageCounts[a.id] || 0;
      const countB = usageCounts[b.id] || 0;
      return countB - countA;
    });
  }, [actions, usageCounts, enableDynamicOrder]);

  // Identifica o ID mais clicado para aplicar destaque visual
  const mostUsedId = useMemo(() => {
    let topId: string | null = null;
    let maxClicks = 0;
    for (const [id, count] of Object.entries(usageCounts)) {
      if (count > maxClicks && count >= 2) {
        maxClicks = count;
        topId = id;
      }
    }
    return topId;
  }, [usageCounts]);

  return {
    device,
    orderedActions,
    mostUsedId,
    usageCounts,
    trackAction,
  };
}
