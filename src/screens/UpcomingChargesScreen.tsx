import React, { useEffect, useMemo, useRef, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { getUpcomingCharges, type Client } from "../database/db";

type ChargesByDate = Record<string, Client[]>;

type DaySummary = {
  date: Date;
  dateStr: string;
  weekday: string;
  count: number;
  isToday: boolean;
};

// 🔹 Helpers de data
const pad = (n: number) => n.toString().padStart(2, "0");
const formatDateBR = (d: Date) =>
  `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const weekAbbrev = (d: Date) =>
  d.toLocaleDateString("pt-BR", { weekday: "long" })
    .split('-')[0] // Remove "-feira" se houver
    .replace(/^\w/, (c) => c.toUpperCase()); // Capitaliza

const isToday = (d: Date) => {
  const t = new Date();
  return (
    d.getDate() === t.getDate() &&
    d.getMonth() === t.getMonth() &&
    d.getFullYear() === t.getFullYear()
  );
};

export default function UpcomingChargesScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [chargesByDate, setChargesByDate] = useState<ChargesByDate>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Agenda de Cobranças",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  // ============================================================
  // 🔄 Carrega cobranças e agrupa
  // ============================================================
  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const clients = await getUpcomingCharges();
        const grouped: ChargesByDate = {};

        clients.forEach((c) => {
          if (!c.next_charge) return;
          // Normaliza data (assumindo formato DD/MM/YYYY do seu DB)
          // Se sua data for YYYY-MM-DD, ajuste aqui
          const key = c.next_charge; 

          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(c);
        });

        if (!isMounted) return;
        setChargesByDate(grouped);
      } catch (e) {
        console.error("Erro ao carregar agenda:", e);
      } finally {
        if (!isMounted) return;
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        ]).start();
      }
    })();

    return () => { isMounted = false; };
  }, [fadeAnim, slideAnim]);

  // ============================================================
  // 📅 Próximos 7 dias
  // ============================================================
  const next7: DaySummary[] = useMemo(() => {
    const arr: DaySummary[] = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const dateStr = formatDateBR(d);
      const weekday = weekAbbrev(d);
      // Busca pela string formatada
      const count = (chargesByDate[dateStr] || []).length;

      arr.push({
        date: d,
        dateStr,
        weekday,
        count,
        isToday: i === 0, // Assume index 0 como hoje para simplificar visualização
      });
    }
    return arr;
  }, [chargesByDate]);

  const totalCount = useMemo(
    () => Object.values(chargesByDate).reduce((a, b) => a + b.length, 0),
    [chargesByDate]
  );

  const handleDayPress = (date: string) => {
    navigation.navigate("ClientsByDate", { date });
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.loadingText}>Sincronizando agenda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      
      {/* Resumo Superior */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          Próximos 7 dias: <Text style={{fontWeight: 'bold'}}>{totalCount} vencimentos</Text>
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Timeline Container */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {next7.map((day, index) => {
            const hasCharges = day.count > 0;
            const isLast = index === next7.length - 1;

            return (
              <View key={day.dateStr} style={styles.timelineRow}>
                
                {/* Coluna da Linha (Esquerda) */}
                <View style={styles.timelineCol}>
                  <View style={[styles.line, isLast && styles.lineHidden]} />
                  <View style={[
                    styles.dot, 
                    day.isToday && styles.dotToday,
                    hasCharges && !day.isToday && styles.dotActive
                  ]}>
                    {day.isToday ? (
                      <View style={styles.innerDotToday} />
                    ) : null}
                  </View>
                </View>

                {/* Card do Dia (Direita) */}
                <View style={styles.cardWrapper}>
                  <TouchableOpacity
                    activeOpacity={hasCharges ? 0.7 : 1}
                    onPress={() => hasCharges ? handleDayPress(day.dateStr) : null}
                    style={[
                      styles.dayCard,
                      day.isToday && styles.dayCardToday,
                      !hasCharges && styles.dayCardEmpty
                    ]}
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <View style={{flexDirection: 'row', alignItems: 'center'}}>
                          <Text style={[
                            styles.weekday, 
                            day.isToday && { color: "#0056b3" },
                            !hasCharges && { color: "#94A3B8" }
                          ]}>
                            {day.weekday}
                          </Text>
                          {day.isToday && (
                            <View style={styles.todayBadge}>
                              <Text style={styles.todayText}>HOJE</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[
                          styles.dateStr,
                          !hasCharges && { color: "#CBD5E1" }
                        ]}>
                          {day.dateStr}
                        </Text>
                      </View>

                      {/* Contador / Status */}
                      {hasCharges ? (
                        <View style={[
                          styles.countBadge,
                          day.isToday ? { backgroundColor: "#0056b3" } : { backgroundColor: "#E2E8F0" }
                        ]}>
                          <Text style={[
                            styles.countText,
                            day.isToday ? { color: "#FFF" } : { color: "#475569" }
                          ]}>
                            {day.count}
                          </Text>
                        </View>
                      ) : (
                        <Ionicons name="ellipse" size={8} color="#E2E8F0" />
                      )}
                    </View>

                    {/* Mensagem de status */}
                    <Text style={styles.statusMsg}>
                      {hasCharges 
                        ? `${day.count} cliente${day.count > 1 ? 's' : ''} vence${day.count > 1 ? 'm' : ''} nesta data`
                        : "Nenhuma cobrança agendada"}
                    </Text>

                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </Animated.View>

      </ScrollView>
    </View>
  );
}

/* 🎨 Estilos Enterprise */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },

  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  loadingText: { color: "#64748B", marginTop: 12, fontWeight: "500" },

  // Barra de Resumo
  summaryBar: {
    backgroundColor: "#E0F2FE",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
    marginBottom: 10,
  },
  summaryText: { color: "#0056b3", fontSize: 13, textAlign: 'center' },

  container: { padding: 20, paddingBottom: 40 },

  // Timeline Structure
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
  lineHidden: { display: 'none' },
  
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#CBD5E1",
    zIndex: 1,
    marginTop: 4, // Alinha com o topo do card
    borderWidth: 2,
    borderColor: "#F1F5F9"
  },
  dotActive: { backgroundColor: "#334155" }, // Dia normal com cobrança
  dotToday: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderColor: "#0056b3",
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  innerDotToday: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0056b3"
  },

  // Cards
  cardWrapper: { flex: 1, paddingBottom: 16 },
  dayCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginLeft: 10,
    // Sombra
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  dayCardToday: {
    borderColor: "#93C5FD",
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 4,
    borderLeftColor: "#0056b3"
  },
  dayCardEmpty: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowOpacity: 0,
    elevation: 0,
    borderStyle: 'dashed'
  },

  // Card Content
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6
  },
  weekday: {
    fontSize: 16,
    fontWeight: "700",
    color: "#334155",
    textTransform: "capitalize"
  },
  dateStr: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2
  },
  
  // Badges
  todayBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: "#DBEAFE"
  },
  todayText: { fontSize: 9, fontWeight: "800", color: "#0056b3" },

  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6
  },
  countText: { fontSize: 13, fontWeight: "bold" },

  statusMsg: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  }
});