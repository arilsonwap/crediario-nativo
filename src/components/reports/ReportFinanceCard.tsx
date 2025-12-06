import React from "react";
import { ReportCard } from "./ReportCard";
import { ReportStatsGrid } from "./ReportStatsGrid";
import { ReportDivider } from "./ReportDivider";
import { ReportRow } from "./ReportRow";
import { ReportText } from "./ReportText";
import { REPORTS_CARDS_CONFIG } from "../../constants/reportsCards";
import { REPORTS_LABELS } from "../../constants/reportsAccessibility";
import { formatCurrency } from "../../utils/formatCurrency";

type ReportFinanceCardProps = {
  hoje: number;
  mesAtual: number;
  aReceber: number;
  index: number;
};

/**
 * ✅ Componente específico para Card de Fluxo de Caixa
 * Encapsula toda UI e lógica do card financeiro
 */
export const ReportFinanceCard = React.memo<ReportFinanceCardProps>(
  ({ hoje, mesAtual, aReceber, index }) => {
    return (
      <ReportCard
        title={REPORTS_CARDS_CONFIG[0].title}
        icon={REPORTS_CARDS_CONFIG[0].icon}
        color={REPORTS_CARDS_CONFIG[0].color}
        bg={REPORTS_CARDS_CONFIG[0].bg}
        index={index}
      >
        <ReportStatsGrid
          items={[
            { label: REPORTS_LABELS.recebidoHoje, value: formatCurrency(hoje) },
            { label: REPORTS_LABELS.totalMesAtual, value: formatCurrency(mesAtual) },
          ]}
        />

        <ReportDivider orientation="horizontal" />

        <ReportRow justify="space-between">
          <ReportText size="md" color="secondary">
            {REPORTS_LABELS.totalPendenteReceber}
          </ReportText>
          <ReportText size="xl" weight="bold" color="warning">
            {formatCurrency(aReceber)}
          </ReportText>
        </ReportRow>
      </ReportCard>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.hoje === nextProps.hoje &&
      prevProps.mesAtual === nextProps.mesAtual &&
      prevProps.aReceber === nextProps.aReceber &&
      prevProps.index === nextProps.index
    );
  }
);

ReportFinanceCard.displayName = "ReportFinanceCard";

