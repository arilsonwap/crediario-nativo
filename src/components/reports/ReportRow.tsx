import React from "react";
import { View, ViewStyle } from "react-native";
import { useReportTheme } from "../../theme/reportTheme";

type ReportRowProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  align?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
  justify?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
  gap?: keyof ReturnType<typeof useReportTheme>["spacing"];
  wrap?: boolean;
};

/**
 * ✅ Componente utilitário simplificado para View com flexDirection row
 * Usa tokens do design system unificado
 */
export const ReportRow = React.memo<ReportRowProps>(
  ({ children, style, align = "center", justify = "space-between", gap, wrap = false }) => {
    const theme = useReportTheme();

    return (
      <View
        style={[
          { flexDirection: "row" },
          {
            alignItems: align,
            justifyContent: justify,
            flexWrap: wrap ? "wrap" : "nowrap",
            ...(gap && { gap: theme.spacing[gap] }),
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.justify === nextProps.justify &&
      prevProps.align === nextProps.align &&
      prevProps.gap === nextProps.gap &&
      prevProps.wrap === nextProps.wrap &&
      prevProps.style === nextProps.style
    );
  }
);

ReportRow.displayName = "ReportRow";
