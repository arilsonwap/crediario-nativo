import { useMemo, useContext, createContext } from "react";
import { Animated } from "react-native";

// ✅ Context para compartilhar animações entre todos os cards
type AnimationContextType = {
  getAnimatedStyle: (index: number) => {
    opacity: Animated.Value;
    transform: Array<{ translateY: Animated.Value } | { scale: Animated.Value }>;
  };
};

const AnimationContext = createContext<AnimationContextType | null>(null);

export const AnimationProvider = AnimationContext.Provider;

/**
 * ✅ Hook unificado para animações de cards individuais
 * Sistema centralizado que gerencia fadeIn, fadeOut, slideUp, stagger
 * ReportCard apenas chama: const { animatedStyle } = useCardAnimation(index);
 * 
 * IMPORTANTE: Requer que ReportsScreen forneça o contexto via AnimationProvider
 */
export const useCardAnimation = (index: number) => {
  const context = useContext(AnimationContext);

  if (!context) {
    // ✅ Fallback: retorna estilo estático se contexto não estiver disponível
    // Isso evita quebra quando usado fora do contexto
    const fallbackOpacity = new Animated.Value(1);
    const fallbackTranslateY = new Animated.Value(0);
    const fallbackScale = new Animated.Value(1);
    
    return {
      animatedStyle: {
        opacity: fallbackOpacity,
        transform: [
          { translateY: fallbackTranslateY },
          { scale: fallbackScale },
        ],
      },
    };
  }

  // ✅ Retorna estilo animado para o card específico
  const animatedStyle = useMemo(() => context.getAnimatedStyle(index), [context, index]);

  return { animatedStyle };
};
