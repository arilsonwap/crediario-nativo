import React from "react";
import { View, StyleSheet } from "react-native";
import { REPORTS_METRICS } from "./metrics";

type ReportDividerProps = {
  orientation?: "horizontal" | "vertical";
  color?: string;
  margin?: number;
};

/**
 * ✅ Componente reutilizável para divisores
 * Substitui divisores verticais e horizontais
 */
export const ReportDivider = React.memo<ReportDividerProps>(
  ({
    orientation = "horizontal",
    color = "#E2E8F0",
    margin = REPORTS_METRICS.spacing.lg,
  }) => {
    const isHorizontal = orientation === "horizontal";

    return (
      <View
        style={[
          isHorizontal ? styles.horizontal : styles.vertical,
          {
            backgroundColor: color,
            [isHorizontal ? "marginVertical" : "marginHorizontal"]: margin,
          },
        ]}
      />
    );
  }
);

ReportDivider.displayName = "ReportDivider";

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
  },
  vertical: {
    width: 1,
    height: 30,
  },
});

