import React from "react";
import { View, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { formatCurrency } from "../../utils/formatCurrency";
import { REPORTS_LABELS } from "../../constants/reportsAccessibility";
import { useReportTheme } from "../../theme/reportTheme";
import { ReportText } from "./ReportText";

type ReportComparisonProps = {
  previous: number;
  current: number;
  previousLabel?: string;
  currentLabel?: string;
};

/**
 * ✅ Componente utilitário para comparação de valores
 * Encapsula toda a UI comparativa (mês anterior vs mês atual)
 * Recebe valores e já formata e exibe com ícone de seta
 */
export const ReportComparison = React.memo<ReportComparisonProps>(
  ({ previous, current, previousLabel, currentLabel }) => {
    const theme = useReportTheme();

    return (
      <View style={styles.comparisonRow}>
        <View style={styles.comparisonItem}>
          <ReportText size="sm" color="secondary" align="center">
            {previousLabel || REPORTS_LABELS.mesAnterior}
          </ReportText>
          <ReportText size="lg" weight="semibold" align="center">
            {formatCurrency(previous)}
          </ReportText>
        </View>
        <Icon
          name="arrow-forward"
          size={16}
          color={theme.color.textSecondary}
          style={styles.arrowIcon}
        />
        <View style={styles.comparisonItem}>
          <ReportText size="sm" color="secondary" align="center">
            {currentLabel || REPORTS_LABELS.mesAtual}
          </ReportText>
          <ReportText size="lg" weight="semibold" color="primary" align="center">
            {formatCurrency(current)}
          </ReportText>
        </View>
      </View>
    );
  }
);

ReportComparison.displayName = "ReportComparison";

const styles = StyleSheet.create({
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  comparisonItem: {
    alignItems: "center",
  },
  arrowIcon: {
    opacity: 0.5,
  },
});



