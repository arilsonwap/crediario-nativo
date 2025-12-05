import React from "react";
import { View, StyleSheet } from "react-native";
import type { DaySummary } from "../types/charges";
import DayCard from "./DayCard";

interface TimelineRowProps {
  day: DaySummary;
  isLast: boolean;
  onDayPress: (date: string) => void;
}

/**
 * 🧩 Componente de linha da timeline
 * Memoizado para evitar re-renders desnecessários
 */
const TimelineRow = React.memo<TimelineRowProps>(({ day, isLast, onDayPress }) => {
  return (
    <View style={styles.timelineRow}>
      {/* Coluna da Linha (Esquerda) */}
      <View style={styles.timelineCol}>
        <View style={[styles.line, isLast && styles.lineHidden]} />
        <View
          style={[
            styles.dot,
            day.isToday && styles.dotToday,
            day.count > 0 && !day.isToday && styles.dotActive,
          ]}
        >
          {day.isToday ? <View style={styles.innerDotToday} /> : null}
        </View>
      </View>

      {/* Card do Dia (Direita) */}
      <DayCard day={day} onPress={onDayPress} />
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Comparação customizada: só re-renderiza se dados relevantes mudarem
  return (
    prevProps.day.dateStr === nextProps.day.dateStr &&
    prevProps.day.count === nextProps.day.count &&
    prevProps.day.isToday === nextProps.day.isToday &&
    prevProps.isLast === nextProps.isLast
  );
});

TimelineRow.displayName = "TimelineRow";

const styles = StyleSheet.create({
  timelineRow: { flexDirection: "row", minHeight: 90 },
  timelineCol: {
    width: 40,
    alignItems: "center",
  },
  line: {
    position: "absolute",
    top: 18,
    bottom: -18,
    width: 2,
    backgroundColor: "#E2E8F0",
    left: 19,
    zIndex: 0,
  },
  lineHidden: { display: "none" },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#CBD5E1",
    zIndex: 1,
    marginTop: 4,
    borderWidth: 2,
    borderColor: "#F1F5F9",
  },
  dotActive: { backgroundColor: "#334155" },
  dotToday: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderColor: "#0056b3",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  innerDotToday: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0056b3",
  },
});

export default TimelineRow;



