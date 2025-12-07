import React from "react";
import { ReportCard } from "./ReportCard";
import { RankingRow } from "./RankingRow";
import { EmptyState } from "./EmptyState";
import { REPORTS_CARDS_CONFIG } from "../../constants/reportsCards";
import { getReportEmptyState } from "../../hooks/useReportEmptyStates";
import type { TopCliente } from "../../database/types";

type ReportClientsCardProps = {
  clientes: TopCliente[];
  index: number;
};

/**
 * ✅ Componente específico para Card de Top Clientes
 * Encapsula toda UI e lógica do card de clientes
 */
export const ReportClientsCard = React.memo<ReportClientsCardProps>(
  ({ clientes, index }) => {
    const emptyStateConfig = getReportEmptyState("clientes");

    return (
      <ReportCard
        title={REPORTS_CARDS_CONFIG[2].title}
        icon={REPORTS_CARDS_CONFIG[2].icon}
        color={REPORTS_CARDS_CONFIG[2].color}
        bg={REPORTS_CARDS_CONFIG[2].bg}
        index={index}
      >
        {clientes.length === 0 ? (
          <EmptyState icon={emptyStateConfig.icon} message={emptyStateConfig.message} />
        ) : (
          clientes.map((cliente, idx) => (
            <RankingRow key={cliente.id} cliente={cliente} index={idx} />
          ))
        )}
      </ReportCard>
    );
  },
  (prevProps, nextProps) => {
    if (prevProps.clientes.length !== nextProps.clientes.length) return false;
    return prevProps.clientes.every(
      (cliente, index) =>
        cliente.id === nextProps.clientes[index]?.id &&
        cliente.name === nextProps.clientes[index]?.name &&
        cliente.totalPago === nextProps.clientes[index]?.totalPago
    ) && prevProps.index === nextProps.index;
  }
);

ReportClientsCard.displayName = "ReportClientsCard";

