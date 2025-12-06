import { useRef, useCallback, useEffect } from "react";
import { Animated, Easing } from "react-native";
import { createFadeAnims, resetAnimations as resetAnimationsUtil, REPORTS_ANIMATION_CONFIG } from "../utils/animations/reportsAnimations";

/**
 * ✅ Hook customizado para gerenciar animações dos cards de relatórios
 * Funde createFadeAnims, resetAnimationsUtil e runStaggerAnimation
 * Permite animação composta (slide-up + fade-in + escala) com easing exponencial
 * ✅ Implementa cancelamento real e fade-out antes do refresh
 */
export const useReportCardAnimations = (cardCount: number) => {
  // ✅ Animações de fade-in, slide-up e escala para os cards
  const fadeAnims = useRef(createFadeAnims(cardCount)).current;
  const slideAnims = useRef(
    Array.from({ length: cardCount }, () => new Animated.Value(20))
  ).current;
  const scaleAnims = useRef(
    Array.from({ length: cardCount }, () => new Animated.Value(1))
  ).current;

  // ✅ Refs para armazenar TODAS as animações individuais (para cancelamento real)
  const activeTimingAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const activeStaggerAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

  // ✅ Helper para resetar todas as animações
  const resetAnimations = useCallback(() => {
    resetAnimationsUtil(fadeAnims);
    slideAnims.forEach((anim) => anim.setValue(20));
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

  // ✅ Fade-out suave antes do refresh (100ms)
  const fadeOut = useCallback(
    (onComplete?: () => void) => {
      // Cancela animações em andamento
      cancelAnimations();

      // Cria animações de fade-out para todos os cards simultaneamente
      const fadeOutAnimations = fadeAnims.map((fadeAnim) => {
        const anim = Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          easing: Easing.in(Easing.exp),
          useNativeDriver: true,
        });
        activeTimingAnimationsRef.current.push(anim);
        return anim;
      });

      // Executa todas as animações de fade-out em paralelo
      Animated.parallel(fadeOutAnimations).start((finished) => {
        if (finished) {
          activeTimingAnimationsRef.current = [];
          onComplete?.();
        }
      });
    },
    [fadeAnims, cancelAnimations]
  );

  // ✅ Executa animação stagger com fade-in + slide-up, seguida de escala
  const runStaggerAnimation = useCallback(
    (onComplete?: () => void) => {
      // ✅ Cancela animações anteriores se houver
      cancelAnimations();

      const animations: Animated.CompositeAnimation[] = [];

      fadeAnims.forEach((fadeAnim, index) => {
        const slideAnim = slideAnims[index];
        const scaleAnim = scaleAnims[index];
        
        // ✅ Cria animações individuais e armazena para cancelamento
        const fadeInAnim = Animated.timing(fadeAnim, {
          toValue: 1,
          duration: REPORTS_ANIMATION_CONFIG.duration,
          delay: index * REPORTS_ANIMATION_CONFIG.stagger,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        });

        const slideUpAnim = Animated.timing(slideAnim, {
          toValue: 0,
          duration: REPORTS_ANIMATION_CONFIG.duration,
          delay: index * REPORTS_ANIMATION_CONFIG.stagger,
          easing: Easing.out(Easing.exp),
          useNativeDriver: true,
        });

        // ✅ Fase 1: Animação composta simultânea - fade-in + slide-up com easing exponencial
        const phase1 = Animated.parallel([fadeInAnim, slideUpAnim]);
        
        // ✅ Armazena animações individuais para cancelamento
        activeTimingAnimationsRef.current.push(fadeInAnim, slideUpAnim);

        // ✅ Fase 2: Leve escala (1 → 1.02 → 1) no final
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

        // ✅ Armazena animações de escala também
        activeTimingAnimationsRef.current.push(scaleUpAnim, scaleDownAnim);

        const phase2 = Animated.sequence([scaleUpAnim, scaleDownAnim]);

        // ✅ Sequência completa: fase 1, depois fase 2
        const sequence = Animated.sequence([phase1, phase2]);
        animations.push(sequence);
      });

      // ✅ Executa stagger com todas as sequências
      const staggerAnimation = Animated.stagger(REPORTS_ANIMATION_CONFIG.stagger, animations);
      
      // ✅ Armazena animação de stagger principal para permitir cancelamento
      activeStaggerAnimationRef.current = staggerAnimation;
      
      staggerAnimation.start((finished) => {
        if (finished) {
          activeTimingAnimationsRef.current = [];
          activeStaggerAnimationRef.current = null;
          onComplete?.();
        }
      });
    },
    [fadeAnims, slideAnims, scaleAnims, cancelAnimations]
  );

  // ✅ Cleanup: cancela animações ao desmontar componente
  useEffect(() => {
    return () => {
      cancelAnimations();
    };
  }, [cancelAnimations]);

  // ✅ Retorna objetos de estilo animados para cada card (inclui escala)
  const getCardAnimationStyle = useCallback(
    (index: number) => ({
      opacity: fadeAnims[index],
      transform: [
        { translateY: slideAnims[index] },
        { scale: scaleAnims[index] },
      ],
    }),
    [fadeAnims, slideAnims, scaleAnims]
  );

  return {
    fadeAnims,
    slideAnims,
    scaleAnims,
    resetAnimations,
    cancelAnimations,
    fadeOut,
    runStaggerAnimation,
    getCardAnimationStyle,
  };
};

