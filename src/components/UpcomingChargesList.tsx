import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Client } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { theme } from "../theme/theme";

type Props = {
  clients: Client[];
  onClientPress?: (client: Client) => void;
};

export default function UpcomingChargesList({ clients, onClientPress }: Props) {
  // Calcula dias até o vencimento
  const getDaysUntilDue = (dateStr: string) => {
    const [day, month, year] = dateStr.split('/').map(Number);
    const dueDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Retorna cor baseada na urgência
  const getUrgencyColor = (days: number) => {
    if (days === 0) return theme.gradients.danger;
    if (days <= 3) return theme.gradients.warning;
    return theme.gradients.primary;
  };

  // Retorna texto da urgência
  const getUrgencyText = (days: number) => {
    if (days === 0) return "HOJE";
    if (days === 1) return "AMANHÃ";
    if (days < 0) return `${Math.abs(days)}d ATRASADO`;
    return `${days} dias`;
  };

  if (!clients || clients.length === 0) {
    return (
      <View style={styles.emptyWrapper}>
        <LinearGradient
          colors={theme.gradients.card as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyContainer}
        >
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIcon}>📭</Text>
          </View>
          <Text style={styles.emptyTitle}>Tudo em Dia!</Text>
          <Text style={styles.emptyText}>
            Não há cobranças próximas no momento
          </Text>
        </LinearGradient>
      </View>
    );
  }

  // Ordena por data mais próxima
  const sortedClients = [...clients].sort((a, b) => {
    if (!a.next_charge || !b.next_charge) return 0;
    return getDaysUntilDue(a.next_charge) - getDaysUntilDue(b.next_charge);
  });

  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={theme.gradients.card as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Header com contador */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBadge}>
              <Text style={styles.icon}>📅</Text>
            </View>
            <View>
              <Text style={styles.title}>Próximas Cobranças</Text>
              <Text style={styles.subtitle}>{clients.length} {clients.length === 1 ? 'cliente' : 'clientes'}</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={sortedClients}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item, index }) => {
            const daysUntil = item.next_charge ? getDaysUntilDue(item.next_charge) : null;
            const urgencyColors = daysUntil !== null ? getUrgencyColor(daysUntil) : theme.gradients.primary;
            const urgencyText = daysUntil !== null ? getUrgencyText(daysUntil) : '';

            return (
              <TouchableOpacity
                style={styles.itemWrapper}
                onPress={() => onClientPress?.(item)}
                activeOpacity={0.7}
              >
                <View style={styles.item}>
                  {/* Linha lateral colorida indicadora */}
                  <LinearGradient
                    colors={urgencyColors as [string, string, ...string[]]}
                    style={styles.itemIndicator}
                  />

                  {/* Avatar com inicial */}
                  <View style={styles.avatarContainer}>
                    <LinearGradient
                      colors={urgencyColors as [string, string, ...string[]]}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>
                        {item.name.charAt(0).toUpperCase()}
                      </Text>
                    </LinearGradient>
                  </View>

                  {/* Info do cliente */}
                  <View style={styles.left}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.next_charge && (
                      <View style={styles.dateRow}>
                        <Text style={styles.dateIcon}>📆</Text>
                        <Text style={styles.date}>{item.next_charge}</Text>
                      </View>
                    )}
                  </View>

                  {/* Valor e urgência */}
                  <View style={styles.right}>
                    <Text style={styles.value}>
                      {formatCurrency(item.value || 0)}
                    </Text>
                    {daysUntil !== null && (
                      <View style={styles.urgencyBadge}>
                        <LinearGradient
                          colors={urgencyColors as [string, string, ...string[]]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.urgencyGradient}
                        >
                          <Text style={styles.urgencyText}>{urgencyText}</Text>
                        </LinearGradient>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </LinearGradient>
    </View>
  );
}

/* ========================= Styles ========================= */
const styles = StyleSheet.create({
  // Card wrapper
  cardWrapper: {
    borderRadius: theme.radius.xxl,
    overflow: "hidden",
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    ...theme.shadow.glow,
  },
  card: {
    padding: theme.spacing.lg,
  },
  
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "rgba(0, 212, 255, 0.2)",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(0, 212, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: theme.font.size.lg,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  
  // Item da lista
  itemWrapper: {
    marginBottom: theme.spacing.xs,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.md,
    backgroundColor: "rgba(0, 212, 255, 0.05)",
    position: "relative",
    overflow: "hidden",
  },
  itemIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  
  // Avatar
  avatarContainer: {
    marginLeft: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.text,
  },
  
  // Info
  left: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  name: {
    fontSize: theme.font.size.md,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateIcon: {
    fontSize: 12,
  },
  date: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  
  // Right side
  right: {
    alignItems: "flex-end",
    gap: 6,
  },
  value: {
    fontSize: theme.font.size.lg,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.3,
  },
  urgencyBadge: {
    borderRadius: theme.radius.sm,
    overflow: "hidden",
    ...theme.shadow.default,
  },
  urgencyGradient: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: "900",
    color: theme.colors.text,
    letterSpacing: 0.5,
  },
  
  // Separator
  separator: {
    height: theme.spacing.xs,
  },
  
  // Empty state
  emptyWrapper: {
    borderRadius: theme.radius.xxl,
    overflow: "hidden",
    marginBottom: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.cardBorder,
    ...theme.shadow.default,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 212, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.md,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: theme.font.size.xl,
    fontWeight: "900",
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  emptyText: {
    fontSize: theme.font.size.md,
    color: theme.colors.textMuted,
    textAlign: "center",
    fontWeight: "500",
  },
});