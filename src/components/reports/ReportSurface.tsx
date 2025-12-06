import React from "react";
import { View, ViewStyle } from "react-native";
import { useReportTheme } from "../../theme/reportTheme";

type ReportSurfaceProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof ReturnType<typeof useReportTheme>["padding"];
  borderRadius?: keyof ReturnType<typeof useReportTheme>["radius"];
  backgroundColor?: string;
};

/**
 * ✅ Componente base simplificado para superfícies internas de cards
 * Ex: growthContainer, containers internos
 * Usa tokens do design system unificado
 */
export const ReportSurface = React.memo<ReportSurfaceProps>(
  ({ children, style, padding = "medium", borderRadius = "medium", backgroundColor }) => {
    const theme = useReportTheme();

    return (
      <View
        style={[
          {
            padding: theme.padding[padding],
            borderRadius: theme.radius[borderRadius],
            backgroundColor: backgroundColor || theme.color.growthContainerBg,
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
      prevProps.padding === nextProps.padding &&
      prevProps.borderRadius === nextProps.borderRadius &&
      prevProps.backgroundColor === nextProps.backgroundColor &&
      prevProps.style === nextProps.style
    );
  }
);

ReportSurface.displayName = "ReportSurface";



