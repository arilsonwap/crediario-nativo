/**
 * 🎨 Tema centralizado do aplicativo
 * Facilita manutenção e consistência visual
 */

export const THEME = {
  colors: {
    // Cores primárias
    primary: "#0056b3",
    primaryLight: "#E0F2FE",
    primaryDark: "#003d82",
    
    // Cores de fundo
    background: "#F1F5F9",
    cardBackground: "#FFFFFF",
    cardBackgroundEmpty: "transparent",
    
    // Cores de texto
    text: "#334155",
    textSecondary: "#64748B",
    textDisabled: "#94A3B8",
    textLight: "#CBD5E1",
    
    // Cores de estado
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
    
    // Cores de borda
    border: "#E2E8F0",
    borderLight: "#F1F5F9",
    borderPrimary: "#93C5FD",
    
    // Cores de badge
    badgeBackground: "#E2E8F0",
    badgeBackgroundToday: "#0056b3",
    badgeText: "#475569",
    badgeTextToday: "#FFFFFF",
    
    // Cores de timeline
    timelineDot: "#CBD5E1",
    timelineDotActive: "#334155",
    timelineLine: "#E2E8F0",
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 20,
    full: 9999,
  },
  
  typography: {
    fontSize: {
      xs: 9,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 18,
      xxl: 20,
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
  },
  
  shadows: {
    sm: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
    md: {
      shadowColor: "#64748B",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.08,
      shadowRadius: 5,
      elevation: 3,
    },
    lg: {
      shadowColor: "#0056b3",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
    },
  },
} as const;

export type Theme = typeof THEME;
