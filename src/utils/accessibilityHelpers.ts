import { FONT_SCALING } from "./accessibility";

/**
 * ✅ Helper que aplica allowFontScaling + maxFontSizeMultiplier automaticamente
 * Simplifica uso em componentes Text
 */
export const applyFontScaling = (preset: keyof typeof FONT_SCALING = "normal") => {
  return FONT_SCALING[preset];
};

/**
 * ✅ Helper para criar props de acessibilidade padronizadas
 */
export const createAccessibilityProps = (label: string, role?: string) => {
  return {
    accessibilityLabel: label,
    ...(role && { accessibilityRole: role as any }),
  };
};



