import { useState, useCallback } from "react";

type FadeOutFn = (onComplete?: () => void) => void;

/**
 * ✅ Hook dedicado para gerenciar refresh do dashboard
 * Gerencia refreshing, fadeOut, fadeIn, delays
 * Encapsula toda lógica de refresh com animações
 */
export const useDashboardRefresh = (
  refreshFn: () => Promise<void>,
  fadeOut: FadeOutFn
) => {
  const [refreshing, setRefreshing] = useState(false);

  // ✅ Refresh com fade-out suave antes de recarregar
  const onRefresh = useCallback(async () => {
    // ✅ Fluxo ideal: fade-out → recarregar dados → fade-in com stagger
    setRefreshing(true);

    // ✅ Fase 1: Fade-out suave (100ms) antes de recarregar
    await new Promise<void>((resolve) => {
      fadeOut(() => {
        resolve();
      });
    });

    // ✅ Fase 2: Recarrega dados
    await refreshFn();

    // ✅ Fase 3: Fade-in com stagger (será acionado pelo useEffect no ReportsScreen)
    setRefreshing(false);
  }, [refreshFn, fadeOut]);

  return {
    refreshing,
    onRefresh,
  };
};

