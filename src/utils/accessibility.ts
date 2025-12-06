/**
 * ✅ Presets de acessibilidade reutilizáveis
 * Unifica allowFontScaling e maxFontSizeMultiplier
 */

export const FONT_SCALING = {
  normal: { allowFontScaling: true, maxFontSizeMultiplier: 1.3 },
  large: { allowFontScaling: true, maxFontSizeMultiplier: 1.2 },
  small: { allowFontScaling: true, maxFontSizeMultiplier: 1.4 },
} as const;

/**
 * ✅ Preset de hitSlop para áreas tocáveis maiores
 * Garante mínimo de 44x44px conforme guidelines de acessibilidade
 */
export const HIT_SLOP = {
  small: { top: 8, bottom: 8, left: 8, right: 8 },
  medium: { top: 10, bottom: 10, left: 10, right: 10 },
  large: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;



