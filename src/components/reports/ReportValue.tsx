import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FONT_SCALING } from "../../utils/accessibility";
import { useReportTheme } from "../../theme/reportTheme";

type ReportValueProps = {
  label: string;
  value: string | number;
  valueStyle?: any;
  labelStyle?: any;
  containerStyle?: any;
};

/**
 * ✅ Componente padronizado para label + valor
 * Ex: "Recebido Hoje" + "R$ 1.234,56"
 * Memoizado para evitar re-renders desnecessários
 */
const ReportValueComponent = ({ label, value, valueStyle, labelStyle, containerStyle }: ReportValueProps) => {
  const theme = useReportTheme();
  
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label(theme), labelStyle]} {...FONT_SCALING.normal}>
        {label}
      </Text>
      <Text style={[styles.value(theme), valueStyle]} {...FONT_SCALING.large}>
        {value}
      </Text>
    </View>
  );
};

export const ReportValue = React.memo<ReportValueProps>(
  ReportValueComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.label === nextProps.label &&
      prevProps.value === nextProps.value &&
      prevProps.valueStyle === nextProps.valueStyle &&
      prevProps.labelStyle === nextProps.labelStyle &&
      prevProps.containerStyle === nextProps.containerStyle
    );
  }
);

ReportValue.displayName = "ReportValue";

const styles = {
  container: {
    flex: 1,
  },
  label: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 13,
    color: theme.color.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: "500",
  }),
  value: (theme: ReturnType<typeof useReportTheme>) => ({
    fontSize: 20,
    fontWeight: "700",
    color: theme.color.textPrimary,
    letterSpacing: -0.5,
  }),
};

