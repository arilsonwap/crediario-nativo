import { useAppColorScheme } from "../hooks/useAppColorScheme";

/**
 * ✅ Design System Unificado para Relatórios
 * Tokens centralizados para cores, espaçamento, tipografia, elevação e métricas
 * Suporta dark mode automaticamente
 * ÚNICA FONTE DE VERDADE para todos os tokens de relatórios
 */

// ✅ Tokens de Cores
const colorTokens = {
  light: {
    background: "#F1F5F9", // Slate 100
    surface: "#FFFFFF",
    surfaceMuted: "#F8FAFC", // Slate 50
    surfaceCard: "#FFFFFF",
    border: "#E2E8F0", // Slate 200
    textPrimary: "#1E293B", // Slate 800
    textSecondary: "#64748B", // Slate 500
    textMuted: "#94A3B8", // Slate 400
    textTitle: "#1E293B", // Slate 800 (alias para compatibilidade)
    textBody: "#64748B", // Slate 500 (alias para compatibilidade)
    primary: "#0056b3", // Azul Corporativo
    success: "#16A34A", // Green 600
    warning: "#F59E0B", // Amber 500
    danger: "#EF4444", // Red 500
    headerText: "#FFFFFF",
    // Cores adicionais de reportsColors.ts
    iconBgBlue: "#DBEAFE", // Pastel Blue
    iconBgGreen: "#DCFCE7", // Pastel Green
    iconBgOrange: "#FFEDD5", // Pastel Orange
    iconBgPurple: "#F3E8FF", // Pastel Purple
    errorBg: "#FEF2F2",
    errorBorder: "#FEE2E2",
    growthContainerBg: "#F8FAFC", // Fundo sutil interno do growth container
    cardBorder: "rgba(255,255,255,0.5)", // Brilho sutil na borda do card
  },
  dark: {
    background: "#0F172A", // Slate 900
    surface: "#1E293B", // Slate 800
    surfaceMuted: "#334155", // Slate 700
    surfaceCard: "#1E293B",
    border: "#334155", // Slate 700
    textPrimary: "#F1F5F9", // Slate 100
    textSecondary: "#94A3B8", // Slate 400
    textMuted: "#64748B", // Slate 500
    textTitle: "#F1F5F9", // Slate 100 (alias para compatibilidade)
    textBody: "#94A3B8", // Slate 400 (alias para compatibilidade)
    primary: "#3B82F6", // Blue 500
    success: "#22C55E", // Green 500
    warning: "#FBBF24", // Amber 400
    danger: "#F87171", // Red 400
    headerText: "#FFFFFF",
    // Cores adicionais de reportsColors.ts
    iconBgBlue: "#1E3A8A", // Blue 900
    iconBgGreen: "#14532D", // Green 900
    iconBgOrange: "#7C2D12", // Orange 900
    iconBgPurple: "#581C87", // Purple 900
    errorBg: "#7F1D1D", // Red 900
    errorBorder: "#991B1B", // Red 800
    growthContainerBg: "#1E293B", // Fundo sutil interno do growth container
    cardBorder: "rgba(255,255,255,0.1)", // Brilho sutil na borda do card
  },
} as const;

// ✅ Tokens de Espaçamento (consolidado de metrics.ts)
export const spacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 30,
} as const;

// ✅ Tokens de Raio (consolidado de metrics.ts)
export const radiusTokens = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  card: 20, // De metrics.ts
  small: 8, // De metrics.ts
  medium: 12, // De metrics.ts
  large: 16, // De metrics.ts
} as const;

// ✅ Tokens de Padding (consolidado de metrics.ts)
export const paddingTokens = {
  card: 20,
  container: 20,
  small: 8,
  medium: 12,
  large: 16,
} as const;

// ✅ Tokens de Margin (consolidado de metrics.ts)
export const marginTokens = {
  card: 20,
  section: 30,
} as const;

// ✅ Tokens de Elevação (sombras)
export const elevationTokens = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  surface: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

// ✅ Tokens de Tipografia
export const typographyTokens = {
  sizes: {
    sm: 12,
    md: 13,
    lg: 15,
    xl: 18,
    "2xl": 20,
  },
  weights: {
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },
  lineHeights: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
  },
} as const;

/**
 * ✅ Hook para obter tokens do tema baseado no color scheme
 */
export const useReportTheme = () => {
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === "dark";

  return {
    color: colorTokens[isDark ? "dark" : "light"],
    spacing: spacingTokens,
    radius: radiusTokens,
    padding: paddingTokens,
    margin: marginTokens,
    elevation: elevationTokens,
    typography: typographyTokens,
    isDark,
  };
};

/**
 * ✅ Função helper para obter tokens sem hook (para uso em componentes não-React)
 */
export const getReportTheme = (isDark: boolean = false) => {
  return {
    color: colorTokens[isDark ? "dark" : "light"],
    spacing: spacingTokens,
    radius: radiusTokens,
    padding: paddingTokens,
    margin: marginTokens,
    elevation: elevationTokens,
    typography: typographyTokens,
    isDark,
  };
};

/**
 * ✅ Helper para obter cores (compatibilidade com reportsColors.ts)
 * @deprecated Use getReportTheme() ou useReportTheme() em vez disso
 */
export const getReportsColors = (isDark: boolean = false) => {
  return colorTokens[isDark ? "dark" : "light"];
};

/**
 * ✅ Métricas consolidadas (compatibilidade com metrics.ts)
 * @deprecated Use useReportTheme() ou getReportTheme() em vez disso
 */
export const REPORTS_METRICS = {
  radius: radiusTokens,
  padding: paddingTokens,
  spacing: spacingTokens,
  margin: marginTokens,
} as const;

// ✅ Exportar tipos
export type ReportTheme = ReturnType<typeof useReportTheme>;
export type ColorToken = keyof typeof colorTokens.light;
export type SpacingToken = keyof typeof spacingTokens;
export type RadiusToken = keyof typeof radiusTokens;
export type TypographySize = keyof typeof typographyTokens.sizes;
export type TypographyWeight = keyof typeof typographyTokens.weights;

