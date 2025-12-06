import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { FONT_SCALING } from "../../utils/accessibility";
import { REPORTS_METRICS } from "./metrics";

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
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, labelStyle]} {...FONT_SCALING.normal}>
        {label}
      </Text>
      <Text style={[styles.value, valueStyle]} {...FONT_SCALING.large}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: REPORTS_METRICS.spacing.xs,
    fontWeight: "500",
  },
  value: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    letterSpacing: -0.5,
  },
});

