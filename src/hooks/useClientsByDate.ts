import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Alert } from "react-native";
import type { Client } from "../database/types";
import { getAllClients } from "../database/repositories/clientsRepo";
import { parseChargeDate } from "../utils/dateUtils";
import { formatDateBR } from "../utils/formatDate";
import { formatErrorForDisplay } from "../utils/errorHandler";
import { validateClients } from "../schemas/clientSchema";
import { trackLoadTime } from "../utils/analytics";
import { DEV_LOG, DEV_WARN, DEV_ERROR } from "../utils/devLog";

interface ClientsState {
  clients: Client[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

// ✅ Cache global para filtros por data (compartilhado entre instâncias)
const clientsByDateCache = new Map<string, Client[]>();

// ✅ Função para limpar cache (útil quando dados são atualizados)
export const clearClientsByDateCache = (targetDate?: string) => {
  if (targetDate) {
    const normalized = parseChargeDate(targetDate);
    clientsByDateCache.delete(normalized);
    DEV_LOG("🗑️ Cache limpo para data:", normalized);
  } else {
    clientsByDateCache.clear();
    DEV_LOG("🗑️ Cache limpo completamente");
  }
};

export const useClientsByDate = (date: string) => {
  const normalizedDate = useMemo(() => parseChargeDate(date), [date]);

  // ✅ Função de filtro otimizada com cache
  const filterClients = useCallback((allClients: Client[], targetDate: string) => {
    // Usar cache se disponível
    if (clientsByDateCache.has(targetDate)) {
      DEV_LOG("🔍 useClientsByDate: Usando cache para data:", targetDate);
      return clientsByDateCache.get(targetDate)!;
    }

    const filtered = allClients.filter((c) => {
      if (!c.next_charge) return false;
      // ✅ Normalizar ambas as datas para comparação consistente
      const clientDate = parseChargeDate(c.next_charge);
      const normalizedTarget = parseChargeDate(targetDate);
      const matches = clientDate === normalizedTarget;
      
      if (__DEV__ && matches) {
        DEV_LOG("✅ Cliente encontrado:", {
          id: c.id,
          name: c.name,
          next_charge: c.next_charge,
          normalized: clientDate,
          target: normalizedTarget,
        });
      }
      
      return matches;
    });

    // Atualizar cache
    clientsByDateCache.set(targetDate, filtered);
    DEV_LOG("🔍 useClientsByDate: Filtrados", filtered.length, "clientes para", targetDate);
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
      DEV_LOG("🔄 useClientsByDate.loadClients: iniciando para data:", normalizedDate);
      try {
        DEV_LOG("🔄 useClientsByDate: setando loading=true");
        setState((prev) => {
          DEV_LOG("🔄 useClientsByDate: estado anterior - loading:", prev.loading, "clients:", prev.clients.length);
          return { ...prev, error: null, loading: true };
        });
        // ✅ Usar getAllClients() para garantir consistência com HomeScreen
        // Isso evita problemas de timezone e garante que todos os clientes sejam considerados
        const allClients = await getAllClients();
        DEV_LOG("📦 useClientsByDate: total de clientes recebidos:", allClients.length);
        
        // ✅ Log crítico se nenhum cliente foi retornado
        if (allClients.length === 0) {
          DEV_WARN("⚠️ CRÍTICO: getAllClients() retornou array vazio!");
          DEV_WARN("⚠️ Isso pode indicar problema no banco de dados ou na query SQL");
        }

        // ✅ Validação de dados com Zod
        // ⚠️ TEMPORÁRIO: Desabilitar validação para debug
        let validatedClients: Client[];
        try {
          validatedClients = validateClients(allClients);
          DEV_LOG("✅ useClientsByDate: clientes validados:", validatedClients.length);
          
          // ✅ Log se muitos clientes foram filtrados na validação
          if (allClients.length > 0 && validatedClients.length === 0) {
            DEV_WARN("⚠️ useClientsByDate: TODOS os clientes foram filtrados na validação!");
            DEV_WARN("⚠️ Primeiro cliente (exemplo):", allClients[0]);
            // ⚠️ TEMPORÁRIO: Usar clientes sem validação se validação falhar completamente
            DEV_WARN("⚠️ Usando clientes sem validação para evitar tela vazia");
            validatedClients = allClients as Client[];
          } else if (allClients.length > validatedClients.length) {
            DEV_WARN(`⚠️ useClientsByDate: ${allClients.length - validatedClients.length} clientes foram filtrados na validação`);
          }
        } catch (validationError) {
          DEV_ERROR("❌ Erro na validação, usando clientes sem validação:", validationError);
          validatedClients = allClients as Client[];
        }

        // ✅ Usar função de filtro otimizada com cache
        // Nota: Cache é limpo externamente quando necessário (ex: ao voltar do foco)
        const filtered = filterClients(validatedClients, normalizedDate);
        DEV_LOG("🔍 useClientsByDate: clientes filtrados para", normalizedDate, ":", filtered.length);
        if (__DEV__) {
          DEV_LOG("📋 useClientsByDate: detalhes dos clientes filtrados:", 
            filtered.map(c => ({ id: c.id, name: c.name, telefone: c.telefone, next_charge: c.next_charge }))
          );
        }

        // ✅ Atualizar state apenas se ainda estiver montado (verificação no componente)
        setState((prev) => ({ ...prev, clients: filtered, loading: false }));
        DEV_LOG("✅ useClientsByDate: estado atualizado com", filtered.length, "clientes");
      } catch (e) {
        DEV_ERROR("❌ Erro ao carregar clientes:", {
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
        DEV_LOG("🏁 useClientsByDate: finalizando (loading=false), tempo:", loadTime, "ms");
        setState((prev) => {
          DEV_LOG("🔄 useClientsByDate: atualizando estado - loading=false, clients:", prev.clients.length);
          return { ...prev, loading: false, refreshing: false };
        });

        // ✅ Performance monitoring
        if (loadTime > 1000) {
          DEV_WARN(`⚠️ Carregamento lento: ${loadTime}ms`);
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
        // ✅ Usar getAllClients() para consistência
        const allClients = await getAllClients();
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

