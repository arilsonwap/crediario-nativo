import React from "react";
import { ReportCard } from "./ReportCard";
import { BairroListItem } from "./BairroListItem";
import { EmptyState } from "./EmptyState";
import { REPORTS_CARDS_CONFIG } from "../../constants/reportsCards";
import { getReportEmptyState } from "../../hooks/useReportEmptyStates";
import type { CrediarioPorBairro } from "../../database/types";

type ReportGeoCardProps = {
  bairros: CrediarioPorBairro[];
  index: number;
};

/**
 * ✅ Componente específico para Card de Geografia
 * Encapsula toda UI e lógica do card de bairros
 */
export const ReportGeoCard = React.memo<ReportGeoCardProps>(
  ({ bairros, index }) => {
    const emptyStateConfig = getReportEmptyState("bairros");

    return (
      <ReportCard
        title={REPORTS_CARDS_CONFIG[3].title}
        icon={REPORTS_CARDS_CONFIG[3].icon}
        color={REPORTS_CARDS_CONFIG[3].color}
        bg={REPORTS_CARDS_CONFIG[3].bg}
        index={index}
      >
        {bairros.length === 0 ? (
          <EmptyState icon={emptyStateConfig.icon} message={emptyStateConfig.message} />
        ) : (
          bairros.map((item, idx) => <BairroListItem key={idx} item={item} />)
        )}
      </ReportCard>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.bairros.length !== nextProps.bairros.length) return false;
    return prevProps.bairros.every(
      (item, index) =>
        item.bairro === nextProps.bairros[index]?.bairro &&
        item.quantidade === nextProps.bairros[index]?.quantidade
    ) && prevProps.index === nextProps.index;
  }
);

ReportGeoCard.displayName = "ReportGeoCard";

