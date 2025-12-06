import React from "react";
import { View } from "react-native";
import { useReportTheme } from "../../theme/reportTheme";

type ReportDividerProps = {
  orientation: "horizontal" | "vertical";
  color?: string;
};

/**
 * ✅ Componente simplificado para divisores (horizontal ou vertical)
 * Usa tokens do design system unificado
 */
export const ReportDivider = React.memo<ReportDividerProps>(
  ({ orientation, color }) => {
    const theme = useReportTheme();

    return (
      <View
        style={
          orientation === "horizontal"
            ? {
                height: 1,
                marginVertical: theme.spacing.lg,
                backgroundColor: color || theme.color.border,
              }
            : {
                width: 1,
                height: 30,
                marginHorizontal: theme.spacing.lg,
                backgroundColor: color || theme.color.border,
              }
        }
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.orientation === nextProps.orientation &&
      prevProps.color === nextProps.color
    );
  }
);

ReportDivider.displayName = "ReportDivider";
