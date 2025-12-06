import { Animated } from "react-native";

/**
 * ✅ Configuração central de animações para ReportsScreen
 */
export const REPORTS_ANIMATION_CONFIG = {
  duration: 400,
  stagger: 100,
} as const;

// ✅ Mantém compatibilidade com código antigo
export const ANIMATION_CONFIG = REPORTS_ANIMATION_CONFIG;

/**
 * Cria array de Animated.Value para fade-in dos cards
 * Agora é dinâmico baseado no número de cards
 */
export const createFadeAnims = (count: number): Animated.Value[] => {
  return Array.from({ length: count }, () => new Animated.Value(0));
};

/**
 * Helper para criar animação de fade-in usando configuração central
 */
export const createFadeInAnimation = (
  animValue: Animated.Value,
  delay: number = 0
): Animated.CompositeAnimation => {
  return Animated.timing(animValue, {
    toValue: 1,
    duration: ANIMATION_CONFIG.duration,
    delay,
    useNativeDriver: true,
  });
};

/**
 * Helper para resetar todas as animações
 */
export const resetAnimations = (fadeAnims: Animated.Value[]): void => {
  fadeAnims.forEach((anim) => anim.setValue(0));
};

/**
 * Cria array de animações para stagger effect
 * Usa configuração central para delay
 */
export const createStaggerAnimations = (
  fadeAnims: Animated.Value[],
  createAnimation: (anim: Animated.Value, delay: number) => Animated.CompositeAnimation
): Animated.CompositeAnimation[] => {
  return fadeAnims.map((anim, index) => 
    createAnimation(anim, index * ANIMATION_CONFIG.stagger)
  );
};

/**
 * Executa animação stagger com configuração central
 */
export const runStaggerAnimation = (
  fadeAnims: Animated.Value[],
  onComplete?: () => void
): void => {
  const animations = fadeAnims.map((anim, index) =>
    createFadeInAnimation(anim, index * ANIMATION_CONFIG.stagger)
  );
  
  Animated.stagger(ANIMATION_CONFIG.stagger, animations).start(onComplete);
};
