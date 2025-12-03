/* ================================================================
   🎨 TIPAGEM GLOBAL PARA THEME – Expo + TypeScript
================================================================ */

export type ColorHex = string;

/* Gradient compatível com Expo LinearGradient */
export type Gradient = readonly [ColorHex, ColorHex, ...ColorHex[]];

/* Sombra tipada */
export type Shadow = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

/* Colors do tema */
export interface ThemeColors {
  background: ColorHex;
  backgroundSecondary: ColorHex;
  backgroundTertiary: ColorHex;

  card: ColorHex;
  cardBorder: ColorHex;
  cardSecondary: ColorHex;

  primary: ColorHex;
  primaryDark: ColorHex;
  primaryLight: ColorHex;

  secondary: ColorHex;
  success: ColorHex;
  danger: ColorHex;
  dangerDark: ColorHex;
  warning: ColorHex;
  warningDark: ColorHex;
  info: ColorHex;

  text: ColorHex;
  textSecondary: ColorHex;
  textMuted: ColorHex;
  textDark: ColorHex;
  muted: ColorHex;
}

/* Gradientes tipados */
export interface ThemeGradients {
  background: Gradient;
  primary: Gradient;
  secondary: Gradient;
  danger: Gradient;
  warning: Gradient;
  success: Gradient;
  card: Gradient;
}

/* Espaçamentos */
export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

/* Bordas */
export interface ThemeRadius {
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  round: number;
}

/* Tipografia */
export interface ThemeFont {
  family: {
    regular: string;
    bold: string;
  };
  size: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    xxxl: number;
  };
  weight: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    extrabold: string;
    black: string;
  };
}

/* Estrutura de sombras */
export interface ThemeShadow {
  default: Shadow;
  glow: Shadow;
  large: Shadow;
  glowDanger: Shadow;
  glowWarning: Shadow;
}

/* ================================================================
   🎨 THEME FINAL – 100% TIPADO
================================================================ */

export interface Theme {
  colors: ThemeColors;
  gradients: ThemeGradients;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  font: ThemeFont;
  shadow: ThemeShadow;
  opacity: {
    light: number;
    medium: number;
    strong: number;
  };
}

export const theme: Theme = {
  colors: {
    background: "#0F2027",
    backgroundSecondary: "#203A43",
    backgroundTertiary: "#2C5364",

    card: "rgba(0, 212, 255, 0.12)",
    cardBorder: "rgba(0, 212, 255, 0.3)",
    cardSecondary: "rgba(255, 255, 255, 0.08)",

    primary: "#00D4FF",
    primaryDark: "#0077B6",
    primaryLight: "#00E5FF",

    secondary: "#00A8E8",
    success: "#4ECDC4",
    danger: "#FF416C",
    dangerDark: "#FF4B2B",
    warning: "#FFD60A",
    warningDark: "#FFC300",
    info: "#764BA2",

    text: "#FFFFFF",
    textSecondary: "rgba(255, 255, 255, 0.9)",
    textMuted: "rgba(255, 255, 255, 0.6)",
    textDark: "#1A1A1A",
    muted: "rgba(255, 255, 255, 0.5)",
  },

  gradients: {
    background: ["#0F2027", "#203A43", "#2C5364"] as Gradient,
    primary: ["#00D4FF", "#00A8E8", "#0077B6"] as Gradient,
    secondary: ["rgba(255,255,255,0.2)", "rgba(255,255,255,0.1)"] as Gradient,
    danger: ["#FF416C", "#FF4B2B"] as Gradient,
    warning: ["#FFD60A", "#FFC300"] as Gradient,
    success: ["#4ECDC4", "#44A08D"] as Gradient,
    card: ["rgba(0,212,255,0.12)", "rgba(0,168,232,0.08)"] as Gradient,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 999,
  },

  font: {
    family: {
      regular: "System",
      bold: "System",
    },
    size: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
    },
    weight: {
      regular: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
      black: "900",
    },
  },

  shadow: {
    default: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    glow: {
      shadowColor: "#00D4FF",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
      elevation: 8,
    },
    large: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
      elevation: 10,
    },
    glowDanger: {
      shadowColor: "#FF416C",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
    glowWarning: {
      shadowColor: "#FFD60A",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 12,
      elevation: 6,
    },
  },

  opacity: {
    light: 0.1,
    medium: 0.25,
    strong: 0.5,
  },
};

