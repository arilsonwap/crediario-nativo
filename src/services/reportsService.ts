import {
  getTotalHoje,
  getTotalMesAtual,
  getTotalMesAnterior,
  getTopClientesMes,
  getCrediariosPorBairro,
  getCrescimentoPercentual,
  getTotals,
  TopCliente,
  CrediarioPorBairro,
} from "../database/db";
import { safe } from "../utils/safeAsync";

/**
 * ✅ Tipos para o dashboard de relatórios
 */
export type ReportsDashboardData = {
  totalHoje: number;
  totalMesAtual: number;
  totalMesAnterior: number;
  totalAReceber: number;
  topClientes: TopCliente[];
  crediariosPorBairro: CrediarioPorBairro[];
  crescimento: {
    percentual: number;
    cresceu: boolean;
  };
};

/**
 * ✅ Service para obter todos os dados do dashboard de relatórios
 * Centraliza todas as chamadas ao banco de dados
 * 
 * @returns Promise<ReportsDashboardData>
 */
export async function getReportsDashboard(): Promise<ReportsDashboardData> {
  // ✅ Usa safe() para todas as chamadas - evita crash do Promise.all
  // Padroniza logs com prefixo [DB]
  const [hoje, mesAtual, mesAnterior, totals, top, bairros, crescimentoData] = await Promise.all([
    safe(() => getTotalHoje(), 0, { errorLabel: "getTotalHoje", logPrefix: "DB" }),
    safe(() => getTotalMesAtual(), 0, { errorLabel: "getTotalMesAtual", logPrefix: "DB" }),
    safe(() => getTotalMesAnterior(), 0, { errorLabel: "getTotalMesAnterior", logPrefix: "DB" }),
    safe(() => getTotals(true), { totalPaid: 0, totalToReceive: 0 }, { errorLabel: "getTotals", logPrefix: "DB" }),
    safe(() => getTopClientesMes(), [], { errorLabel: "getTopClientesMes", logPrefix: "DB" }),
    safe(() => getCrediariosPorBairro(), [], { errorLabel: "getCrediariosPorBairro", logPrefix: "DB" }),
    safe(() => getCrescimentoPercentual(), { percentual: 0, cresceu: false }, { errorLabel: "getCrescimentoPercentual", logPrefix: "DB" }),
  ]);

  return {
    totalHoje: hoje,
    totalMesAtual: mesAtual,
    totalMesAnterior: mesAnterior,
    totalAReceber: totals.totalToReceive,
    topClientes: top,
    crediariosPorBairro: bairros,
    crescimento: crescimentoData,
  };
}

/**
 * ✅ Service para obter dados de performance (crescimento)
 * 
 * @returns Promise com dados de crescimento mensal
 */
export async function getReportsPerformance() {
  const [mesAtual, mesAnterior, crescimento] = await Promise.all([
    safe(() => getTotalMesAtual(), 0, { errorLabel: "getTotalMesAtual", logPrefix: "DB" }),
    safe(() => getTotalMesAnterior(), 0, { errorLabel: "getTotalMesAnterior", logPrefix: "DB" }),
    safe(() => getCrescimentoPercentual(), { percentual: 0, cresceu: false }, { errorLabel: "getCrescimentoPercentual", logPrefix: "DB" }),
  ]);

  return {
    totalMesAtual: mesAtual,
    totalMesAnterior: mesAnterior,
    crescimento,
  };
}

/**
 * ✅ Service para obter top clientes do mês
 * 
 * @returns Promise<TopCliente[]>
 */
export async function getReportsTopClients(): Promise<TopCliente[]> {
  return safe(() => getTopClientesMes(), [], { errorLabel: "getTopClientesMes", logPrefix: "DB" });
}

/**
 * ✅ Service para obter distribuição por bairros
 * 
 * @returns Promise<CrediarioPorBairro[]>
 */
export async function getReportsNeighborhoods(): Promise<CrediarioPorBairro[]> {
  return safe(() => getCrediariosPorBairro(), [], { errorLabel: "getCrediariosPorBairro", logPrefix: "DB" });
}



