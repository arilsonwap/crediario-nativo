import { useRef, useCallback } from "react";
import { Animated, Easing } from "react-native";
import { createFadeAnims, resetAnimations as resetAnimationsUtil, REPORTS_ANIMATION_CONFIG } from "../utils/animations/reportsAnimations";

/**
 * ✅ Hook customizado para gerenciar animações dos cards de relatórios
 * Funde createFadeAnims, resetAnimationsUtil e runStaggerAnimation
 * Permite animação composta (slide-up + fade-in + escala) com easing exponencial
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

  // ✅ Ref para armazenar animações ativas e permitir cancelamento
  const activeAnimationsRef = useRef<Animated.CompositeAnimation[]>([]);

  // ✅ Helper para resetar todas as animações
  const resetAnimations = useCallback(() => {
    resetAnimationsUtil(fadeAnims);
    slideAnims.forEach((anim) => anim.setValue(20));
    scaleAnims.forEach((anim) => anim.setValue(1));
  }, [fadeAnims, slideAnims, scaleAnims]);

  // ✅ Helper para cancelar animações ativas
  const cancelAnimations = useCallback(() => {
    activeAnimationsRef.current.forEach((anim) => {
      anim.stop();
    });
    activeAnimationsRef.current = [];
  }, []);

  // ✅ Executa animação stagger com fade-in + slide-up, seguida de escala
  const runStaggerAnimation = useCallback(
    (onComplete?: () => void) => {
      // ✅ Cancela animações anteriores se houver
      cancelAnimations();

      const animations: Animated.CompositeAnimation[] = [];

      fadeAnims.forEach((fadeAnim, index) => {
        const slideAnim = slideAnims[index];
        const scaleAnim = scaleAnims[index];
        
        // ✅ Fase 1: Animação composta simultânea - fade-in + slide-up com easing exponencial
        const phase1 = Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: REPORTS_ANIMATION_CONFIG.duration,
            delay: index * REPORTS_ANIMATION_CONFIG.stagger,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: REPORTS_ANIMATION_CONFIG.duration,
            delay: index * REPORTS_ANIMATION_CONFIG.stagger,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
        ]);

        // ✅ Fase 2: Leve escala (1 → 1.02 → 1) no final
        const phase2 = Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.02,
            duration: 150,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 150,
            easing: Easing.in(Easing.exp),
            useNativeDriver: true,
          }),
        ]);

        // ✅ Sequência completa: fase 1, depois fase 2
        const sequence = Animated.sequence([phase1, phase2]);
        animations.push(sequence);
      });

      // ✅ Executa stagger com todas as sequências
      const staggerAnimation = Animated.stagger(REPORTS_ANIMATION_CONFIG.stagger, animations);
      
      // ✅ Armazena animação ativa para permitir cancelamento
      activeAnimationsRef.current = [staggerAnimation];
      
      staggerAnimation.start((finished) => {
        if (finished) {
          activeAnimationsRef.current = [];
          onComplete?.();
        }
      });
    },
    [fadeAnims, slideAnims, scaleAnims, cancelAnimations]
  );

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
    runStaggerAnimation,
    getCardAnimationStyle,
  };
};

