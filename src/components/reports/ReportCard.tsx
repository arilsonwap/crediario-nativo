import React, { useMemo } from "react";
import { StyleSheet, Animated } from "react-native";
import { CardHeader } from "./CardHeader";
import { REPORTS_METRICS } from "./metrics";
import { THEME as APP_THEME } from "../../theme/theme";
import { useAppColorScheme } from "../../hooks/useAppColorScheme";
import { getReportsColors } from "../../theme/reportsColors";
type ReportCardProps = {
  title: string;
  icon: string;
  bg: string;
  color: string;
  children: React.ReactNode;
  index: number; // ✅ Index para animação interna
  marginBottom?: number;
  // ✅ Animações passadas como props do componente pai (compartilhadas)
  animationStyle?: Animated.AnimatedProps<any>["style"];
};

/**
 * ✅ Componente reutilizável para cards de relatórios
 * Gerencia animação e acessibilidade internamente
 * O ReportsScreen apenas passa children sem se preocupar com detalhes
 */
const ReportCardComponent = ({
  title,
  icon,
  bg,
  color,
  children,
  index,
  marginBottom = REPORTS_METRICS.margin.card,
  animationStyle,
}: ReportCardProps) => {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = useMemo(() => getReportsColors(isDark), [isDark]);

  // ✅ Combina estilos: base + animação + margin
  // animationStyle é passado como prop do componente pai (compartilhado)
  const combinedStyle = useMemo(
    () => [
      styles.card,
      { 
        marginBottom,
        backgroundColor: themeColors.surface,
        borderColor: themeColors.cardBorder,
      },
      animationStyle || { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] },
    ],
    [marginBottom, themeColors.surface, themeColors.cardBorder, animationStyle]
  );

  // ✅ Acessibilidade: gera label automaticamente se não fornecido
  const accessibilityLabel = useMemo(
    () => `${title} - Card de relatório financeiro`,
    [title]
  );

  return (
    <Animated.View
      style={combinedStyle}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="summary"
    >
      <CardHeader title={title} icon={icon} color={color} bg={bg} />
      {children}
    </Animated.View>
  );
};

// ✅ Memoização avançada com comparação customizada
export const ReportCard = React.memo<ReportCardProps>(
  ReportCardComponent,
  (prevProps, nextProps) => {
    // Compara apenas props que afetam renderização
    return (
      prevProps.title === nextProps.title &&
      prevProps.icon === nextProps.icon &&
      prevProps.bg === nextProps.bg &&
      prevProps.color === nextProps.color &&
      prevProps.index === nextProps.index &&
      prevProps.marginBottom === nextProps.marginBottom &&
      // animationStyle é passado como prop, compara por referência
      prevProps.animationStyle === nextProps.animationStyle &&
      // children é comparado por referência
      prevProps.children === nextProps.children
    );
  }
);

ReportCard.displayName = "ReportCard";

const styles = StyleSheet.create({
  card: {
    borderRadius: REPORTS_METRICS.radius.card,
    padding: REPORTS_METRICS.padding.card,
    // ✅ Sombra mais suave baseada no Metrics/Theme
    ...APP_THEME.shadows.md,
    borderWidth: 1,
  },
});
