import { useRef, useCallback, useEffect, useMemo } from "react";
import { Animated, Easing } from "react-native";

type AnimationConfig = {
  count: number;
  durationFade?: number;
  durationSlide?: number;
  stagger?: number;
};

type AnimationOrchestrator = {
  fadeIn: (onComplete?: () => void) => void;
  fadeOut: (onComplete?: () => void) => void;
  slideUp: (onComplete?: () => void) => void;
  stagger: (onComplete?: () => void) => void;
  cancelAnimations: () => void;
  resetAnimations: () => void;
  getAnimatedStyle: (index: number) => {
    opacity: Animated.AnimatedAddition;
    transform: Array<{ translateY: Animated.Value } | { scale: Animated.Value }>;
  };
};

/**
 * ✅ Animation Orchestrator unificado para relatórios
 * Gerencia fadeIn, fadeOut, slideUp e stagger de forma centralizada
 * Configurável via props para máxima flexibilidade
 */
export const useReportAnimations = ({
  count,
  durationFade = 120,
  durationSlide = 220,
  stagger: staggerDelay = 80,
}: AnimationConfig): AnimationOrchestrator => {
  // ✅ Animações de fade-in, slide-up e escala para os cards
  // IMPORTANTE: Começam com opacity 1 para evitar tela branca
  // A animação será executada quando stagger() for chamado
  const fadeAnims = useRef(
    Array.from({ length: count }, () => new Animated.Value(1))
  ).current;
  const slideAnims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;
  const scaleAnims = useRef(
    Array.from({ length: count }, () => new Animated.Value(1))
  ).current;

  // ✅ Refs para armazenar TODAS as animações individuais (para cancelamento real)
  const activeTimingAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const activeStaggerAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // ✅ Helper para resetar todas as animações
  const resetAnimations = useCallback(() => {
    fadeAnims.forEach((anim) => anim.setValue(1)); // Mantém visível
    slideAnims.forEach((anim) => anim.setValue(0)); // Sem offset
    scaleAnims.forEach((anim) => anim.setValue(1));
  }, [fadeAnims, slideAnims, scaleAnims]);

  // ✅ Helper para cancelar TODAS as animações ativas (cancelamento real)
  const cancelAnimations = useCallback(() => {
    // Cancela animações de timing individuais
    activeTimingAnimationsRef.current.forEach((anim) => {
      anim.stop();
    });
    activeTimingAnimationsRef.current = [];

    // Cancela animação de stagger principal
    if (activeStaggerAnimationRef.current) {
      activeStaggerAnimationRef.current.stop();
      activeStaggerAnimationRef.current = null;
    }
  }, []);

  // ✅ Fade-in: anima opacidade de 0 para 1
  const fadeIn = useCallback(
    (onComplete?: () => void) => {
      cancelAnimations();

      const animations = fadeAnims.map((fadeAnim) => {
        const anim = Animated.timing(fadeAnim, {
          toValue: 1,
          duration: durationFade,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        });
        activeTimingAnimationsRef.current.push(anim);
        return anim;
      });

      Animated.parallel(animations).start((finished) => {
        if (finished) {
          activeTimingAnimationsRef.current = [];
          onComplete?.();
        }
      });
    },
    [fadeAnims, durationFade, cancelAnimations]
  );

  // ✅ Fade-out: anima opacidade de 1 para 0
  const fadeOut = useCallback(
    (onComplete?: () => void) => {
      cancelAnimations();

      const animations = fadeAnims.map((fadeAnim) => {
        const anim = Animated.timing(fadeAnim, {
          toValue: 0,
          duration: durationFade,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        });
        activeTimingAnimationsRef.current.push(anim);
        return anim;
      });

      Animated.parallel(animations).start((finished) => {
        if (finished) {
          activeTimingAnimationsRef.current = [];
          onComplete?.();
        }
      });
    },
    [fadeAnims, durationFade, cancelAnimations]
  );

  // ✅ Slide-up: anima translateY de 20 para 0
  const slideUp = useCallback(
    (onComplete?: () => void) => {
      cancelAnimations();

      const animations = slideAnims.map((slideAnim) => {
        const anim = Animated.timing(slideAnim, {
          toValue: 0,
          duration: durationSlide,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        });
        activeTimingAnimationsRef.current.push(anim);
        return anim;
      });

      Animated.parallel(animations).start((finished) => {
        if (finished) {
          activeTimingAnimationsRef.current = [];
          onComplete?.();
        }
      });
    },
    [slideAnims, durationSlide, cancelAnimations]
  );

  // ✅ Stagger: animação combinada (fade-in + slide-up + escala) com delay escalonado
  const stagger = useCallback(
    (onComplete?: () => void) => {
      cancelAnimations();

      const animations: Animated.CompositeAnimation[] = [];

      fadeAnims.forEach((fadeAnim, index) => {
        const slideAnim = slideAnims[index];
        const scaleAnim = scaleAnims[index];

        // ✅ Fase 1: Fade-in + slide-up simultâneos
        const fadeInAnim = Animated.timing(fadeAnim, {
          toValue: 1,
          duration: durationFade,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        });

        const slideUpAnim = Animated.timing(slideAnim, {
          toValue: 0,
          duration: durationSlide,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        });

        const phase1 = Animated.parallel([fadeInAnim, slideUpAnim]);
        activeTimingAnimationsRef.current.push(fadeInAnim, slideUpAnim);

        // ✅ Fase 2: Leve escala (1 → 1.02 → 1)
        const scaleUpAnim = Animated.timing(scaleAnim, {
          toValue: 1.02,
          duration: 150,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        });

        const scaleDownAnim = Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        });

        activeTimingAnimationsRef.current.push(scaleUpAnim, scaleDownAnim);
        const phase2 = Animated.sequence([scaleUpAnim, scaleDownAnim]);

        // ✅ Sequência completa: fase 1, depois fase 2
        const sequence = Animated.sequence([phase1, phase2]);
        animations.push(sequence);
      });

      // ✅ Executa stagger com todas as sequências
      const staggerAnimation = Animated.stagger(staggerDelay, animations);
      activeStaggerAnimationRef.current = staggerAnimation;

      staggerAnimation.start((finished) => {
        if (finished) {
          activeTimingAnimationsRef.current = [];
          activeStaggerAnimationRef.current = null;
          onComplete?.();
        }
      });
    },
    [fadeAnims, slideAnims, scaleAnims, durationFade, durationSlide, staggerDelay, cancelAnimations]
  );

  // ✅ Retorna estilo animado para um card específico
  const getAnimatedStyle = useCallback(
    (index: number) => ({
      opacity: fadeAnims[index],
      transform: [
        { translateY: slideAnims[index] },
        { scale: scaleAnims[index] },
      ],
    }),
    [fadeAnims, slideAnims, scaleAnims]
  );

  // ✅ Cleanup: cancela animações ao desmontar componente
  useEffect(() => {
    return () => {
      cancelAnimations();
    };
  }, [cancelAnimations]);

  // ✅ Retorna objeto estável usando useMemo para evitar mudanças de referência
  return useMemo(
    () => ({
      fadeIn,
      fadeOut,
      slideUp,
      stagger,
      cancelAnimations,
      resetAnimations,
      getAnimatedStyle,
    }),
    [fadeIn, fadeOut, slideUp, stagger, cancelAnimations, resetAnimations, getAnimatedStyle]
  );
};

