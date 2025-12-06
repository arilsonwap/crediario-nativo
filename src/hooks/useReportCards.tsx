import React, { useMemo } from "react";
import { ReportFinanceCard } from "../components/reports/ReportFinanceCard";
import { ReportPerformanceCard } from "../components/reports/ReportPerformanceCard";
import { ReportClientsCard } from "../components/reports/ReportClientsCard";
import { ReportGeoCard } from "../components/reports/ReportGeoCard";
import { REPORTS_CARDS_CONFIG } from "../constants/reportsCards";
import type { ReportsDashboardData } from "../services/reportsService";

type PerformanceData = {
  icon: "caret-up" | "caret-down";
  color: string;
  percentual: number;
  displayLabel: string;
};

type ReportTheme = {
  color: {
    success: string;
    danger: string;
  };
};

type UseReportCardsParams = {
  data: ReportsDashboardData;
  theme: ReportTheme;
  performance: PerformanceData;
};

/**
 * ✅ Hook para gerar array de cards configurados
 * Encapsula toda lógica de criação dos cards
 * Retorna JSX já configurado e pronto para renderização
 */
export const useReportCards = ({
  data,
  theme,
  performance,
}: UseReportCardsParams): React.ReactElement[] => {
  return useMemo(
    () => [
      // 📊 Card 1: Fluxo de Caixa
      <ReportFinanceCard
        key="finance"
        hoje={data.totalHoje}
        mesAtual={data.totalMesAtual}
        aReceber={data.totalAReceber}
        index={REPORTS_CARDS_CONFIG[0].index}
      />,

      // 📈 Card 2: Performance
      <ReportPerformanceCard
        key="performance"
        performance={performance}
        previous={data.totalMesAnterior}
        current={data.totalMesAtual}
        index={REPORTS_CARDS_CONFIG[1].index}
      />,

      // 🏆 Card 3: Top Clientes
      <ReportClientsCard
        key="clients"
        clientes={data.topClientes}
        index={REPORTS_CARDS_CONFIG[2].index}
      />,

      // 🏘️ Card 4: Geografia
      <ReportGeoCard
        key="geo"
        bairros={data.crediariosPorBairro}
        index={REPORTS_CARDS_CONFIG[3].index}
      />,
    ],
    [
      data.totalHoje,
      data.totalMesAtual,
      data.totalAReceber,
      data.totalMesAnterior,
      data.topClientes,
      data.crediariosPorBairro,
      performance.icon,
      performance.color,
      performance.percentual,
      performance.displayLabel,
      theme.color.success,
      theme.color.danger,
    ]
  );
};

