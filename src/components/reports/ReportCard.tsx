import React, { useMemo } from "react";
import { StyleSheet, Animated } from "react-native";
import { CardHeader } from "./CardHeader";
import { THEME as APP_THEME } from "../../theme/theme";
import { useReportTheme } from "../../theme/reportTheme";
import { useCardAnimation } from "../../hooks/useCardAnimation";

type ReportCardProps = {
  title: string;
  icon: string;
  bg: string;
  color: string;
  children: React.ReactNode;
  index: number; // ✅ Index para animação interna - ReportCard calcula tudo
  marginBottom?: number;
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
  marginBottom,
}: ReportCardProps) => {
  const theme = useReportTheme();
  const margin = marginBottom ?? theme.margin.card;

  // ✅ Sistema centralizado de animações - apenas chama o hook
  const { animatedStyle } = useCardAnimation(index);

  // ✅ Combina estilos: base + animação + margin
  // animationStyle é calculado internamente
  const combinedStyle = useMemo(
    () => [
      {
        borderRadius: theme.radius.card,
        padding: theme.padding.card,
        ...APP_THEME.shadows.md,
        borderWidth: 1,
        marginBottom: margin,
        backgroundColor: theme.color.surface,
        borderColor: theme.color.cardBorder,
      },
      animatedStyle,
    ],
    [margin, theme, animatedStyle]
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
      // animationStyle é calculado internamente, não precisa comparar
      // children é comparado por referência
      prevProps.children === nextProps.children
    );
  }
);

ReportCard.displayName = "ReportCard";

// Estilos movidos inline para usar theme dinamicamente
