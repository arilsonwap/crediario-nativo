import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getClientById, Client } from "../database/db";

interface RouteParams {
  client?: Client;
  clientId?: number;
}

/**
 * ✅ Hook personalizado para carregar cliente do banco
 * Sempre prioriza o banco de dados, nunca usa params.client diretamente
 */
export function useClientLoader(routeParams: RouteParams | undefined) {
  const navigation = useNavigation();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const hasInitialLoadCompleted = useRef(false);

  /**
   * ✅ Valida e extrai ID dos params de forma segura
   * Protege contra objetos vazios {} ou inválidos
   */
  const getClientIdFromParams = useCallback((): number | null => {
    try {
      const params = routeParams;
      
      // ✅ Valida se params existe e não é um objeto vazio
      if (!params || typeof params !== 'object' || Array.isArray(params)) {
        return null;
      }
      
      // ✅ Verifica se params não é um objeto vazio {} (tem pelo menos uma propriedade)
      const hasProperties = Object.keys(params).length > 0;
      if (!hasProperties) {
        return null;
      }
      
      // ✅ Prioriza clientId direto
      if (params.clientId && typeof params.clientId === 'number' && params.clientId > 0) {
        return params.clientId;
      }
      
      // ✅ Valida params.client antes de acessar .id
      if (params.client && typeof params.client === 'object' && !Array.isArray(params.client)) {
        // ✅ Verifica se não é um objeto vazio {} (tem pelo menos uma propriedade)
        const clientHasProperties = Object.keys(params.client).length > 0;
        if (!clientHasProperties) {
          return null;
        }
        
        // ✅ Verifica se tem ID válido
        const hasValidId = 'id' in params.client && 
                          typeof params.client.id === 'number' && 
                          params.client.id > 0;
        
        if (hasValidId) {
          return params.client.id;
        }
      }
      
      return null;
    } catch (error) {
      console.error("❌ Erro ao extrair ID dos params:", error);
      return null;
    }
  }, [routeParams]);
  
  /**
   * ✅ Carrega cliente do banco usando o ID
   * Esta é a única fonte de verdade - sempre do banco
   */
  const loadClientFromDB = useCallback(async (clientId: number) => {
    if (!clientId || clientId <= 0) {
      console.warn("⚠️ ID de cliente inválido:", clientId);
      return;
    }
    
    try {
      setLoading(true);
      const c = await getClientById(clientId);
      if (c && c.id && c.name) {
        setClient(c);
        hasInitialLoadCompleted.current = true;
      } else {
        console.warn("⚠️ Cliente não encontrado no banco:", clientId);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar cliente:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * ✅ Função para recarregar o cliente manualmente
   */
  const refreshClient = useCallback(async () => {
    if (client?.id) {
      await loadClientFromDB(client.id);
    } else {
      const clientId = getClientIdFromParams();
      if (clientId) {
        await loadClientFromDB(clientId);
      }
    }
  }, [client?.id, loadClientFromDB, getClientIdFromParams]);

  // ✅ Carregamento inicial - sempre do banco
  useEffect(() => {
    const clientId = getClientIdFromParams();
    
    if (clientId) {
      loadClientFromDB(clientId);
    } else {
      setLoading(false);
      hasInitialLoadCompleted.current = true;
    }
  }, [getClientIdFromParams, loadClientFromDB]);

  // ✅ Recarregamento quando a tela ganha foco (volta da edição)
  // ⚠️ IMPORTANTE: Só roda após o primeiro load terminar
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      // ✅ CRÍTICO: Não executa se o primeiro load ainda não terminou
      if (!hasInitialLoadCompleted.current) {
        return;
      }
      
      // Prioridade 1: ID do cliente atual (se já carregado e válido)
      if (client?.id && typeof client.id === 'number' && client.id > 0) {
        await loadClientFromDB(client.id);
        return;
      }
      
      // Prioridade 2: ID dos params (caso ainda não tenha carregado)
      const clientId = getClientIdFromParams();
      if (clientId) {
        await loadClientFromDB(clientId);
      }
    });
    return unsubscribe;
  }, [navigation, client?.id, loadClientFromDB, getClientIdFromParams]);

  return { client, loading, refreshClient };
}

