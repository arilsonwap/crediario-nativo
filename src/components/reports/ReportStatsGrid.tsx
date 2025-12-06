import React, { useMemo } from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { useReportTheme } from "../../theme/reportTheme";
import { ReportText } from "./ReportText";
import { ReportDivider } from "./ReportDivider";

type ReportStatsGridItem = {
  label: string;
  value: string | number;
};

type ReportStatsGridProps = {
  items: ReportStatsGridItem[];
  columns?: 1 | 2 | 3;
  showDividers?: boolean;
  style?: ViewStyle;
};

/**
 * ✅ Componente estruturado para grid de estatísticas
 * Layout adaptável com suporte a 1, 2 ou 3 colunas
 * Usa tokens do design system
 */
export const ReportStatsGrid = React.memo<ReportStatsGridProps>(
  ({ items, columns = 2, showDividers = true, style }) => {
    const theme = useReportTheme();

    // ✅ Calcula largura dos itens baseado no número de colunas
    const itemWidth = useMemo(() => {
      const totalGaps = (columns - 1) * theme.spacing.lg;
      return `${(100 - totalGaps) / columns}%`;
    }, [columns, theme.spacing.lg]);

    // ✅ Agrupa itens em linhas
    const rows = useMemo(() => {
      const result: ReportStatsGridItem[][] = [];
      for (let i = 0; i < items.length; i += columns) {
        result.push(items.slice(i, i + columns));
      }
      return result;
    }, [items, columns]);

    return (
      <View style={[styles.container, style]}>
        {rows.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            <View style={styles.row}>
              {row.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  <View style={[styles.item, { width: itemWidth }]}>
                    <ReportText size="sm" color="secondary" style={styles.label}>
                      {item.label}
                    </ReportText>
                    <ReportText size="xl" weight="bold" style={styles.value}>
                      {item.value}
                    </ReportText>
                  </View>
                  {showDividers && itemIndex < row.length - 1 && (
                    <ReportDivider orientation="vertical" />
                  )}
                </React.Fragment>
              ))}
            </View>
            {showDividers && rowIndex < rows.length - 1 && (
              <ReportDivider orientation="horizontal" style={styles.rowDivider} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.items.length === nextProps.items.length &&
      prevProps.items.every((item, index) => 
        item.label === nextProps.items[index]?.label &&
        item.value === nextProps.items[index]?.value
      ) &&
      prevProps.columns === nextProps.columns &&
      prevProps.showDividers === nextProps.showDividers &&
      prevProps.style === nextProps.style
    );
  }
);

ReportStatsGrid.displayName = "ReportStatsGrid";

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  item: {
    flex: 1,
    alignItems: "center",
  },
  label: {
    marginBottom: 4,
  },
  value: {
    // Valor já tem estilo via ReportText
  },
  rowDivider: {
    marginVertical: 12,
  },
});

