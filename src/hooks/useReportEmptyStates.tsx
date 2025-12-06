import { REPORTS_LABELS } from "../constants/reportsAccessibility";

type EmptyStateType = "clientes" | "bairros" | "pagamentos";

type EmptyStateConfig = {
  icon: string;
  message: string;
};

/**
 * ✅ Helper function para obter configuração de empty state
 * Não é hook - retorna apenas dados, não JSX
 */
export const getReportEmptyState = (type: EmptyStateType): EmptyStateConfig => {
  switch (type) {
    case "clientes":
      return {
        icon: "trophy-outline",
        message: REPORTS_LABELS.nenhumPagamentoMes,
      };
    case "bairros":
      return {
        icon: "map-outline",
        message: REPORTS_LABELS.nenhumBairroCadastrado,
      };
    case "pagamentos":
      return {
        icon: "cash-outline",
        message: REPORTS_LABELS.nenhumPagamentoMes,
      };
    default:
      return {
        icon: "information-circle-outline",
        message: "Nenhum dado disponível",
      };
  }
};

