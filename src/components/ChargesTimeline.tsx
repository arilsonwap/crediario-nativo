import React from "react";
import { StyleSheet } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import type { DaySummary } from "../types/charges";
import TimelineRow from "./TimelineRow";

interface ChargesTimelineProps {
  days: DaySummary[];
  onDayPress: (date: string) => void;
  fadeAnim: Animated.SharedValue<number>;
  slideAnim: Animated.SharedValue<number>;
}

/**
 * 🧩 Componente Timeline para exibir cobranças agendadas
 * Memoizado para evitar re-renders desnecessários
 * ✅ Otimizado com useAnimatedStyle do Reanimated para melhor performance
 */
const ChargesTimeline = React.memo<ChargesTimelineProps>(
  ({ days, onDayPress, fadeAnim, slideAnim }) => {
    // ✅ Usa useAnimatedStyle para transformações nativas mais leves
    const animatedStyle = useAnimatedStyle(() => ({
      opacity: fadeAnim.value,
      transform: [{ translateY: slideAnim.value }],
    }));

    return (
      <Animated.View style={[styles.container, animatedStyle]}>
        {days.map((day, index) => (
          <TimelineRow
            key={day.dateStr}
            day={day}
            isLast={index === days.length - 1}
            onDayPress={onDayPress}
          />
        ))}
      </Animated.View>
    );
  },
  (prevProps, nextProps) => {
    // ✅ Comparação customizada: só re-renderiza se dados relevantes mudarem
    if (prevProps.days.length !== nextProps.days.length) return false;
    
    return prevProps.days.every(
      (prevDay, index) =>
        prevDay.dateStr === nextProps.days[index]?.dateStr &&
        prevDay.count === nextProps.days[index]?.count &&
        prevDay.isToday === nextProps.days[index]?.isToday
    );
  }
);

ChargesTimeline.displayName = "ChargesTimeline";

const styles = StyleSheet.create({
  container: {
    // Container vazio - estilos aplicados via Animated.View
  },
});

export default ChargesTimeline;

