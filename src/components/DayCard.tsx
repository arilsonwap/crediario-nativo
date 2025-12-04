import React, { useMemo, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { DaySummary } from "../types/charges";
import { THEME } from "../theme/theme";

const DEFAULT_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

interface DayCardProps {
  day: DaySummary;
  onPress: (date: string) => void;
}

/**
 * 🧩 Componente de card do dia
 * Memoizado e otimizado com useMemo e useCallback
 */
const DayCard = React.memo<DayCardProps>(({ day, onPress }) => {
  const hasCharges = day.count > 0;
  
  // ✅ Pré-calcular mensagem de status
  const statusMessage = useMemo(
    () =>
      hasCharges
        ? `${day.count} cliente${day.count > 1 ? "s" : ""} vence${day.count > 1 ? "m" : ""} nesta data`
        : "Nenhuma cobrança agendada",
    [hasCharges, day.count]
  );

  // ✅ Evitar criar nova função no render
  const handlePress = useCallback(() => {
    if (hasCharges) {
      onPress(day.dateStr);
    }
  }, [hasCharges, day.dateStr, onPress]);

  // ✅ Pré-calcular estilos do card
  const cardStyle = useMemo(
    () => [
      styles.dayCard,
      day.isToday && styles.dayCardToday,
      !hasCharges && styles.dayCardEmpty,
    ],
    [day.isToday, hasCharges]
  );

  // ✅ Pré-calcular estilo do weekday
  const weekdayStyle = useMemo(
    () => ({
      color: !hasCharges
        ? THEME.colors.textDisabled
        : day.isToday
        ? THEME.colors.primary
        : THEME.colors.text,
    }),
    [day.isToday, hasCharges]
  );

  // ✅ Pré-calcular estilo da data
  const dateStrStyle = useMemo(
    () => ({
      color: !hasCharges ? THEME.colors.textLight : THEME.colors.textSecondary,
    }),
    [hasCharges]
  );

  // ✅ Pré-calcular estilo do badge de contagem
  const countBadgeStyle = useMemo(
    () => [
      styles.countBadge,
      day.isToday
        ? { backgroundColor: THEME.colors.badgeBackgroundToday }
        : { backgroundColor: THEME.colors.badgeBackground },
    ],
    [day.isToday]
  );

  // ✅ Pré-calcular estilo do texto do badge
  const countTextStyle = useMemo(
    () => [
      styles.countText,
      day.isToday
        ? { color: THEME.colors.badgeTextToday }
        : { color: THEME.colors.badgeText },
    ],
    [day.isToday]
  );

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        activeOpacity={hasCharges ? 0.7 : 1}
        onPress={handlePress}
        disabled={!hasCharges}
        hitSlop={hasCharges ? DEFAULT_HIT_SLOP : undefined}
        style={cardStyle}
      >
        <View style={styles.cardHeader}>
          <View>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={[styles.weekday, weekdayStyle]}>
                {day.weekday}
              </Text>
              {day.isToday && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayText}>HOJE</Text>
                </View>
              )}
            </View>
            <Text style={[styles.dateStr, dateStrStyle]}>
              {day.dateStr}
            </Text>
          </View>

          {/* Contador / Status */}
          {hasCharges ? (
            <View style={countBadgeStyle}>
              <Text style={countTextStyle}>
                {day.count}
              </Text>
            </View>
          ) : (
            <Icon name="ellipse" size={8} color={THEME.colors.border} />
          )}
        </View>

        {/* Mensagem de status */}
        <Text style={styles.statusMsg}>{statusMessage}</Text>
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  // ✅ Comparação customizada: só re-renderiza se dados relevantes mudarem
  return (
    prevProps.day.dateStr === nextProps.day.dateStr &&
    prevProps.day.count === nextProps.day.count &&
    prevProps.day.isToday === nextProps.day.isToday &&
    prevProps.day.weekday === nextProps.day.weekday
  );
});

DayCard.displayName = "DayCard";

const styles = StyleSheet.create({
  cardWrapper: { 
    flex: 1, 
    paddingBottom: 16 
  },
  dayCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginLeft: 8,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  dayCardToday: {
    borderColor: "#93C5FD",
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderLeftColor: "#0056b3",
  },
  dayCardEmpty: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
    borderStyle: "dashed",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  weekday: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    textTransform: "capitalize",
  },
  dateStr: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  todayBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#E0F2FE",
  },
  todayText: { 
    fontSize: 9, 
    fontWeight: "800", 
    color: "#0056b3" 
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countText: { 
    fontSize: 14, 
    fontWeight: "bold" 
  },
  statusMsg: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
});

export default DayCard;

