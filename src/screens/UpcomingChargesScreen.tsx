import React, { useEffect, useMemo, useRef, useState, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Animated,
  Alert,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { getUpcomingCharges, type Client } from "../database/db";
import { formatErrorForDisplay } from "../utils/errorHandler";
import { formatDateBR } from "../utils/formatDate";

// ✅ Constantes globais
const DEFAULT_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

type ChargesByDate = Record<string, Client[]>;

type DaySummary = {
  date: Date;
  dateStr: string;
  weekday: string;
  count: number;
  isToday: boolean;
};

// 🔹 Helpers de data
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

// ============================================================
// 🧩 Componentes Memoizados
// ============================================================

interface DayCardProps {
  day: DaySummary;
  onPress: (date: string) => void;
}

const DayCard = React.memo<DayCardProps>(({ day, onPress }) => {
  const hasCharges = day.count > 0;
  const statusMessage = hasCharges 
    ? `${day.count} cliente${day.count > 1 ? 's' : ''} vence${day.count > 1 ? 'm' : ''} nesta data`
    : "Nenhuma cobrança agendada";

  return (
    <View style={styles.cardWrapper}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => hasCharges ? onPress(day.dateStr) : undefined}
        disabled={!hasCharges}
        hitSlop={hasCharges ? DEFAULT_HIT_SLOP : undefined}
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
            <Icon name="ellipse" size={8} color="#E2E8F0" />
          )}
        </View>

        {/* Mensagem de status */}
        <Text style={styles.statusMsg}>
          {statusMessage}
        </Text>
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

DayCard.displayName = 'DayCard';

interface TimelineRowProps {
  day: DaySummary;
  isLast: boolean;
  onDayPress: (date: string) => void;
}

const TimelineRow = React.memo<TimelineRowProps>(({ day, isLast, onDayPress }) => {
  const hasCharges = day.count > 0;

  return (
    <View style={styles.timelineRow}>
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

TimelineRow.displayName = 'TimelineRow';

export default function UpcomingChargesScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chargesByDate, setChargesByDate] = useState<ChargesByDate>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const hasInitialLoadCompleted = useRef(false);

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
  // 🔄 Função para carregar cobranças (reutilizável)
  // ============================================================
  const loadCharges = useCallback(async (showAlert = false, showLoading = true) => {
    try {
      setError(null);
      if (showLoading) {
        setLoading(true);
      }
      const clients = await getUpcomingCharges();
      const grouped: ChargesByDate = {};

      clients.forEach((c) => {
        if (!c.next_charge) return;
        
        // ✅ Converte data ISO (YYYY-MM-DD) para formato BR (DD/MM/YYYY)
        // O banco retorna no formato ISO, mas precisamos agrupar por formato BR
        let dateKey: string;
        if (c.next_charge.includes("-")) {
          // Formato ISO: YYYY-MM-DD
          const [year, month, day] = c.next_charge.split("-");
          dateKey = `${day}/${month}/${year}`;
        } else {
          // Já está no formato BR: DD/MM/YYYY
          dateKey = c.next_charge;
        }

        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(c);
      });

      setChargesByDate(grouped);
      
      // ✅ Anima apenas no primeiro carregamento bem-sucedido
      const isFirstLoad = !hasInitialLoadCompleted.current;
      
      if (isFirstLoad) {
        hasInitialLoadCompleted.current = true;
        // ✅ Primeiro carregamento: anima suavemente
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }),
        ]).start();
      } else {
        // ✅ Recarregamentos subsequentes: seta diretamente (sem animação)
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
      }
    } catch (e) {
      console.error("❌ Erro ao carregar agenda:", {
        error: e,
        errorCode: (e as any)?.code,
        errorMessage: (e as any)?.message,
      });
      
      // ✅ Mensagem de erro amigável
      const errorMessage = formatErrorForDisplay(e, "Não foi possível carregar a agenda de cobranças.");
      setError(errorMessage);
      
      if (showAlert) {
        Alert.alert(
          "❌ Erro ao Carregar",
          errorMessage,
          [
            {
              text: "Tentar Novamente",
              onPress: () => loadCharges(true, true),
              style: "default",
            },
            {
              text: "OK",
              style: "cancel",
            },
          ],
          { cancelable: true }
        );
      }
    } finally {
      // ✅ Sempre reseta o loading quando showLoading é true
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [fadeAnim, slideAnim]);

  // ============================================================
  // 🔄 Carrega cobranças na montagem
  // ============================================================
  useEffect(() => {
    loadCharges(true);
  }, [loadCharges]);

  // ✅ Recarrega quando a tela recebe foco (sem piscar)
  useFocusEffect(
    useCallback(() => {
      // ✅ Só recarrega se o carregamento inicial já foi concluído
      // Isso evita o "piscar" ao abrir a tela pela primeira vez
      if (hasInitialLoadCompleted.current && !loading && !refreshing) {
        // Recarrega silenciosamente (sem loading, sem alert)
        loadCharges(false, false);
      }
    }, [loadCharges, loading, refreshing])
  );

  // ✅ Pull-to-Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCharges(false, false); // Sem alert, sem loading (já tem refreshing)
    setRefreshing(false);
  }, [loadCharges]);

  // ============================================================
  // 📅 Próximos 7 dias (otimizado com cache de weekday)
  // ============================================================
  const next7: DaySummary[] = useMemo(() => {
    const arr: DaySummary[] = [];
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();

    for (let i = 0; i < 7; i++) {
      const d = new Date(todayYear, todayMonth, todayDate + i);
      const dateStr = formatDateBR(d);
      // ✅ weekday calculado uma vez e armazenado no objeto
      const weekday = weekAbbrev(d);
      // Busca pela string formatada
      const count = (chargesByDate[dateStr] || []).length;

      arr.push({
        date: d,
        dateStr,
        weekday, // ✅ Já calculado, não precisa recalcular
        count,
        isToday: i === 0, // Assume index 0 como hoje para simplificar visualização
      });
    }
    return arr;
  }, [chargesByDate]); // ✅ Só recalcula quando chargesByDate muda

  const totalCount = useMemo(
    () => Object.values(chargesByDate).reduce((a, b) => a + b.length, 0),
    [chargesByDate]
  );

  // ✅ useCallback para evitar recriação da função
  const handleDayPress = useCallback((date: string) => {
    navigation.navigate("ClientsByDate", { date });
  }, [navigation]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        <ActivityIndicator size="large" color="#0056b3" />
        <Text style={styles.loadingText}>Carregando agenda de cobranças...</Text>
      </View>
    );
  }

  // ✅ Estado de erro com opção de retry
  if (error && Object.keys(chargesByDate).length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Erro ao Carregar Agenda</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadCharges(true)}
            activeOpacity={0.7}
            hitSlop={DEFAULT_HIT_SLOP}
          >
            <Icon name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
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

      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0056b3"]}
            tintColor="#0056b3"
          />
        }
      >
        
        {/* Timeline Container */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {next7.map((day, index) => (
            <TimelineRow
              key={day.dateStr}
              day={day}
              isLast={index === next7.length - 1}
              onDayPress={handleDayPress}
            />
          ))}
        </Animated.View>

        {/* Empty State - Quando não há cobranças nos próximos 7 dias */}
        {totalCount === 0 && !loading && !error && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon name="calendar-outline" size={48} color="#CBD5E1" />
            </View>
            <Text style={styles.emptyTitle}>Nenhuma Cobrança Agendada</Text>
            <Text style={styles.emptyText}>
              Não há vencimentos nos próximos 7 dias.{"\n"}
              Sua agenda está em dia! 🎉
            </Text>
          </View>
        )}

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
  },

  // Error State
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: "#F1F5F9",
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0056b3",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#0056b3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});