import React, { useMemo } from "react";
import { Text, StyleSheet, TextStyle } from "react-native";
import { applyFontScaling } from "../../utils/accessibilityHelpers";
import { useReportTheme, TypographySize, TypographyWeight } from "../../theme/reportTheme";

type TextColor = "primary" | "secondary" | "muted" | "success" | "warning" | "danger" | string;
type TextAlign = "left" | "center" | "right";

type ReportTextProps = {
  children: React.ReactNode;
  size?: TypographySize;
  weight?: TypographyWeight;
  color?: TextColor;
  align?: TextAlign;
  style?: TextStyle;
  numberOfLines?: number;
};

/**
 * ✅ Sistema tipográfico unificado para relatórios
 * Substitui ReportLabel, ReportValueText e qualquer Text manual
 * Usa tokens do design system
 */
export const ReportText = React.memo<ReportTextProps>(
  ({ 
    children, 
    size = "md", 
    weight, 
    color, 
    align = "left",
    style,
    numberOfLines,
  }) => {
    const theme = useReportTheme();

    // ✅ Mapeia tamanho para estilo
    const sizeStyle = useMemo(() => {
      const fontSize = theme.typography.sizes[size];
      const lineHeight = theme.typography.lineHeights[size === "sm" ? "sm" : size === "md" ? "md" : size === "lg" ? "lg" : "xl"];
      
      return {
        fontSize,
        lineHeight,
      };
    }, [size, theme.typography]);

    // ✅ Mapeia cor para token ou usa cor customizada
    const textColor = useMemo(() => {
      if (!color) return theme.color.textPrimary;
      
      const colorMap: Record<string, string> = {
        primary: theme.color.textPrimary,
        secondary: theme.color.textSecondary,
        muted: theme.color.textMuted,
        success: theme.color.success,
        warning: theme.color.warning,
        danger: theme.color.danger,
      };

      return colorMap[color] || color;
    }, [color, theme.color]);

    // ✅ Mapeia weight para token
    const fontWeight = weight 
      ? theme.typography.weights[weight] 
      : size === "sm" || size === "md" 
        ? theme.typography.weights.medium 
        : theme.typography.weights.semibold;

    // ✅ Determina se deve aplicar font scaling (apenas para tamanhos grandes)
    const shouldScale = size === "xl" || size === "2xl";

    return (
      <Text
        style={[
          styles.base,
          sizeStyle,
          { 
            color: textColor, 
            fontWeight,
            textAlign: align,
          },
          style,
        ]}
        numberOfLines={numberOfLines}
        {...(shouldScale ? applyFontScaling("large") : applyFontScaling("normal"))}
      >
        {children}
      </Text>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.size === nextProps.size &&
      prevProps.weight === nextProps.weight &&
      prevProps.color === nextProps.color &&
      prevProps.align === nextProps.align &&
      prevProps.style === nextProps.style &&
      prevProps.numberOfLines === nextProps.numberOfLines
    );
  }
);

ReportText.displayName = "ReportText";

const styles = StyleSheet.create({
  base: {
    // Estilos base aplicados via props
  },
});
