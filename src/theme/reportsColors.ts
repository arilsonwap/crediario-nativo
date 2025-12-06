/**
 * ✅ Tema de cores para ReportsScreen
 * Preparado para modo escuro (dark mode)
 * Futuramente usar com useColorScheme() do React Native
 */

export const reportsLight = {
  background: "#F1F5F9", // Slate 100
  surface: "#FFFFFF",
  primary: "#0056b3", // Azul Corporativo
  textTitle: "#1E293B", // Slate 800
  textBody: "#64748B", // Slate 500
  border: "#E2E8F0",
  success: "#16A34A",
  danger: "#EF4444",
  warning: "#F59E0B",
  iconBgBlue: "#DBEAFE", // Pastel Blue
  iconBgGreen: "#DCFCE7", // Pastel Green
  iconBgOrange: "#FFEDD5", // Pastel Orange
  iconBgPurple: "#F3E8FF", // Pastel Purple
  errorBg: "#FEF2F2",
  errorBorder: "#FEE2E2",
  // ✅ Cores adicionais para substituir hardcoded
  headerText: "#FFFFFF", // Texto do header (branco)
  growthContainerBg: "#F8FAFC", // Fundo sutil interno do growth container
  cardBorder: "rgba(255,255,255,0.5)", // Brilho sutil na borda do card
} as const;

export const reportsDark = {
  background: "#0F172A", // Slate 900
  surface: "#1E293B", // Slate 800
  primary: "#3B82F6", // Blue 500 (mais claro para dark mode)
  textTitle: "#F1F5F9", // Slate 100
  textBody: "#94A3B8", // Slate 400
  border: "#334155", // Slate 700
  success: "#22C55E", // Green 500
  danger: "#F87171", // Red 400
  warning: "#FBBF24", // Amber 400
  iconBgBlue: "#1E3A8A", // Blue 900
  iconBgGreen: "#14532D", // Green 900
  iconBgOrange: "#7C2D12", // Orange 900
  iconBgPurple: "#581C87", // Purple 900
  errorBg: "#7F1D1D", // Red 900
  errorBorder: "#991B1B", // Red 800
  // ✅ Cores adicionais para substituir hardcoded
  headerText: "#FFFFFF", // Texto do header (branco)
  growthContainerBg: "#1E293B", // Fundo sutil interno do growth container (Slate 800)
  cardBorder: "rgba(255,255,255,0.1)", // Brilho sutil na borda do card (mais sutil no dark)
} as const;

/**
 * Hook helper para obter tema baseado no color scheme
 * Futuramente usar: const isDark = useColorScheme() === 'dark';
 * 
 * @example
 * const colors = useReportsColors();
 * // ou
 * const colors = getReportsColors(isDark);
 */
export const getReportsColors = (isDark: boolean = false) => {
  return isDark ? reportsDark : reportsLight;
};

