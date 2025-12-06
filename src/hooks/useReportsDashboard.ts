import { useState, useCallback, useEffect } from "react";
import { getReportsDashboard } from "../services/reportsService";
import type { ReportsDashboardData } from "../services/reportsService";
import { ERROR_MESSAGES } from "../constants/messages";

/**
 * ✅ Hook dedicado para gerenciar dados do dashboard de relatórios
 * Encapsula toda a lógica de carregamento, estados e refresh
 * Deixa a tela apenas responsável pela apresentação UI
 */
export const useReportsDashboard = () => {
  const [data, setData] = useState<ReportsDashboardData>({
    totalHoje: 0,
    totalMesAtual: 0,
    totalMesAnterior: 0,
    totalAReceber: 0,
    topClientes: [],
    crediariosPorBairro: [],
    crescimento: { percentual: 0, cresceu: false },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Carrega dados usando o service (100% desacoplado da camada de banco)
  const loadData = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const dashboardData = await getReportsDashboard();
      setData(dashboardData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : ERROR_MESSAGES.carregarRelatorio;
      console.error(`❌ [useReportsDashboard] ${ERROR_MESSAGES.erroCritico}:`, errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Carrega dados automaticamente no mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ✅ Função de refresh (pode ser chamada manualmente)
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    error,
    loading,
    refresh,
    // ✅ Expõe loadData também para uso em useFocusEffect
    loadData,
  };
};



