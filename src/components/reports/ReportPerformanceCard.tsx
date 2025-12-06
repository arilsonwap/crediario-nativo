import React from "react";
import Icon from "react-native-vector-icons/Ionicons";
import { ReportCard } from "./ReportCard";
import { ReportSurface } from "./ReportSurface";
import { ReportRow } from "./ReportRow";
import { ReportText } from "./ReportText";
import { ReportComparison } from "./ReportComparison";
import { REPORTS_CARDS_CONFIG } from "../../constants/reportsCards";
import { REPORTS_LABELS } from "../../constants/reportsAccessibility";
import { useReportTheme } from "../../theme/reportTheme";

type PerformanceData = {
  icon: "caret-up" | "caret-down";
  color: string;
  percentual: number;
  displayLabel: string;
};

type ReportPerformanceCardProps = {
  performance: PerformanceData;
  previous: number;
  current: number;
  index: number;
};

/**
 * ✅ Componente específico para Card de Performance
 * Encapsula toda UI e lógica do card de performance
 */
export const ReportPerformanceCard = React.memo<ReportPerformanceCardProps>(
  ({ performance, previous, current, index }) => {
    const theme = useReportTheme();

    return (
      <ReportCard
        title={REPORTS_CARDS_CONFIG[1].title}
        icon={REPORTS_CARDS_CONFIG[1].icon}
        color={REPORTS_CARDS_CONFIG[1].color}
        bg={REPORTS_CARDS_CONFIG[1].bg}
        index={index}
      >
        <ReportSurface>
          <ReportRow align="center" gap="xs">
            <Icon name={performance.icon} size={20} color={performance.color} />
            <ReportText size="2xl" weight="bold" color={performance.color}>
              {performance.percentual}%
            </ReportText>
          </ReportRow>
          <ReportText size="md" color="secondary" style={{ marginTop: theme.spacing.xs }}>
            {performance.displayLabel} {REPORTS_LABELS.emRelacaoMesAnterior}
          </ReportText>
        </ReportSurface>

        <ReportComparison previous={previous} current={current} />
      </ReportCard>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.performance.icon === nextProps.performance.icon &&
      prevProps.performance.color === nextProps.performance.color &&
      prevProps.performance.percentual === nextProps.performance.percentual &&
      prevProps.performance.displayLabel === nextProps.performance.displayLabel &&
      prevProps.previous === nextProps.previous &&
      prevProps.current === nextProps.current &&
      prevProps.index === nextProps.index
    );
  }
);

ReportPerformanceCard.displayName = "ReportPerformanceCard";

