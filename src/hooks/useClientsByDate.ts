import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Alert } from "react-native";
import { getUpcomingCharges, type Client } from "../database/db";
import { parseChargeDate } from "../utils/dateUtils";
import { formatDateBR } from "../utils/formatDate";
import { formatErrorForDisplay } from "../utils/errorHandler";
import { validateClients } from "../schemas/clientSchema";
import { trackLoadTime } from "../utils/analytics";

interface ClientsState {
  clients: Client[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

// ✅ Cache global para filtros por data (compartilhado entre instâncias)
const clientsByDateCache = new Map<string, Client[]>();

export const useClientsByDate = (date: string) => {
  const normalizedDate = useMemo(() => parseChargeDate(date), [date]);

  // ✅ Função de filtro otimizada com cache
  const filterClients = useCallback((allClients: Client[], targetDate: string) => {
    // Usar cache se disponível
    if (clientsByDateCache.has(targetDate)) {
      return clientsByDateCache.get(targetDate)!;
    }

    const filtered = allClients.filter((c) => {
      if (!c.next_charge) return false;
      return parseChargeDate(c.next_charge) === targetDate;
    });

    // Atualizar cache
    clientsByDateCache.set(targetDate, filtered);
    return filtered;
  }, []);

  const [state, setState] = useState<ClientsState>({
    clients: [],
    loading: true,
    refreshing: false,
    error: null,
  });

  const loadClients = useCallback(
    async (showAlert = false) => {
      const startTime = Date.now();
      try {
        setState((prev) => ({ ...prev, error: null, loading: true }));
        const allClients = await getUpcomingCharges();

        // ✅ Validação de dados com Zod
        const validatedClients = validateClients(allClients);

        // ✅ Usar função de filtro otimizada com cache
        const filtered = filterClients(validatedClients, normalizedDate);

        // ✅ Atualizar state apenas se ainda estiver montado (verificação no componente)
        setState((prev) => ({ ...prev, clients: filtered }));
      } catch (e) {
        console.error("❌ Erro ao carregar clientes:", {
          error: e,
          errorCode: (e as any)?.code,
          errorMessage: (e as any)?.message,
        });

        const errorMessage = formatErrorForDisplay(
          e,
          "Não foi possível carregar os clientes desta data."
        );

        setState((prev) => ({ ...prev, error: errorMessage }));

        if (showAlert) {
          Alert.alert(
            "❌ Erro ao Carregar",
            errorMessage,
            [
              {
                text: "Tentar Novamente",
                onPress: () => loadClients(true),
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
        const loadTime = Date.now() - startTime;
        setState((prev) => ({ ...prev, loading: false, refreshing: false }));

        // ✅ Performance monitoring
        if (loadTime > 1000) {
          console.warn(`⚠️ Carregamento lento: ${loadTime}ms`);
        }

        // ✅ Analytics de tempo de carregamento
        trackLoadTime("ClientsByDate", loadTime).catch(() => {
          // Ignora erros de analytics
        });
      }
    },
    [normalizedDate, filterClients]
  );

  // ✅ Prefetch de dados para próximas datas
  useEffect(() => {
    const prefetchNextDates = async () => {
      try {
        const allClients = await getUpcomingCharges();
        const validatedClients = validateClients(allClients);

        // Pré-carregar próximos 3 dias
        for (let i = 1; i <= 3; i++) {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + i);
          const nextDateStr = formatDateBR(nextDate);

          // Pré-filtrar e cachear
          if (!clientsByDateCache.has(nextDateStr)) {
            filterClients(validatedClients, nextDateStr);
          }
        }
      } catch (error) {
        // Ignora erros de prefetch (não crítico)
        console.debug("Prefetch falhou (não crítico):", error);
      }
    };

    // Executar prefetch após carregamento inicial
    if (!state.loading && state.clients.length > 0) {
      prefetchNextDates();
    }
  }, [state.loading, state.clients.length, filterClients]);

  return { ...state, loadClients };
};

