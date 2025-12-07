import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import Animated, { useSharedValue, withTiming, withSpring } from "react-native-reanimated";
import { getUpcomingCharges } from "../database/repositories/clientsRepo";
import { formatErrorForDisplay } from "../utils/errorHandler";
import { processChargesData } from "../utils/chargesProcessing";
import type { ChargesByDate } from "../types/charges";

interface UseChargesDataOptions {
  showAlert?: boolean;
  showLoading?: boolean;
}

interface UseChargesDataState {
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  chargesByDate: ChargesByDate;
}

interface UseChargesDataReturn extends UseChargesDataState {
  loadCharges: (options?: UseChargesDataOptions) => Promise<void>;
  hasInitialLoadCompleted: React.MutableRefObject<boolean>;
  fadeAnim: Animated.SharedValue<number>;
  slideAnim: Animated.SharedValue<number>;
}

/**
 * 🎣 Hook customizado para gerenciar lógica de carregamento de cobranças
 * Centraliza toda a lógica de estado e carregamento
 * ✅ Otimizado com Reanimated para melhor performance
 */
export const useChargesData = (): UseChargesDataReturn => {
  // ✅ Usa SharedValue do Reanimated para animações mais leves
  const fadeAnim = useSharedValue(0);
  const slideAnim = useSharedValue(20);
  const [state, setState] = useState<UseChargesDataState>({
    loading: true,
    refreshing: false,
    error: null,
    chargesByDate: {},
  });

  const hasInitialLoadCompleted = useRef(false);

  const loadCharges = useCallback(
    async (options: UseChargesDataOptions = { showAlert: false, showLoading: true }) => {
      const { showAlert = false, showLoading = true } = options;

      try {
        setState((prev) => ({ ...prev, error: null }));
        if (showLoading) {
          setState((prev) => ({ ...prev, loading: true }));
        }

        const clients = await getUpcomingCharges();
        // ✅ Usa função pura para processar dados (facilita testes)
        const grouped = processChargesData(clients);

        setState((prev) => ({ ...prev, chargesByDate: grouped }));

        // ✅ Anima apenas no primeiro carregamento bem-sucedido
        const isFirstLoad = !hasInitialLoadCompleted.current;

        if (isFirstLoad) {
          hasInitialLoadCompleted.current = true;
          // ✅ Primeiro carregamento: anima suavemente com Reanimated
          fadeAnim.value = withTiming(1, { duration: 500 });
          slideAnim.value = withSpring(0, { damping: 15, stiffness: 100 });
        } else {
          // ✅ Recarregamentos subsequentes: seta diretamente (sem animação)
          fadeAnim.value = 1;
          slideAnim.value = 0;
        }
      } catch (e) {
        console.error("❌ Erro ao carregar agenda:", {
          error: e,
          errorCode: (e as any)?.code,
          errorMessage: (e as any)?.message,
        });

        // ✅ Mensagem de erro amigável
        const errorMessage = formatErrorForDisplay(
          e,
          "Não foi possível carregar a agenda de cobranças."
        );
        setState((prev) => ({ ...prev, error: errorMessage }));

        if (showAlert) {
          Alert.alert(
            "❌ Erro ao Carregar",
            errorMessage,
            [
              {
                text: "Tentar Novamente",
                onPress: () => loadCharges({ showAlert: true, showLoading: true }),
                style: "default",
              },
              {
                text: "OK",
                style: "cancel",
              },
            ],
            { cancelable: true }
          );
        }
      } finally {
        // ✅ Sempre reseta o loading quando showLoading é true
        if (showLoading) {
          setState((prev) => ({ ...prev, loading: false }));
        }
      }
    },
    []
  );

  return {
    ...state,
    loadCharges,
    hasInitialLoadCompleted,
    fadeAnim,
    slideAnim,
  };
};

