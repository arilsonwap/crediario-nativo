import React, { useEffect, useMemo, useLayoutEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useChargesData } from "../hooks/useChargesData";
import type { DaySummary } from "../types/charges";
import ChargesTimelineSkeleton from "../components/ChargesTimelineSkeleton";
import ChargesErrorBoundary from "../components/ChargesErrorBoundary";
import TimelineRow from "../components/TimelineRow";
import { calculateNext7Days, calculateTotalCount } from "../utils/chargesCalculations";
import { useScreenAnalytics } from "../hooks/useAnalytics";

// ✅ Constantes globais
const DEFAULT_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

export default function UpcomingChargesScreen() {
  const navigation = useNavigation<any>();

  // ✅ Analytics de tela
  useScreenAnalytics("UpcomingCharges");

  // ✅ Hook customizado para lógica de carregamento
  const {
    loading,
    refreshing,
    error,
    chargesByDate,
    loadCharges,
    hasInitialLoadCompleted,
    fadeAnim,
    slideAnim,
  } = useChargesData();

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
  // 🔄 Carrega cobranças na montagem
  // ============================================================
  useEffect(() => {
    loadCharges({ showAlert: true, showLoading: true });
  }, [loadCharges]);

  // ✅ Recarrega quando a tela recebe foco (sem piscar)
  useFocusEffect(
    useCallback(() => {
      // ✅ Só recarrega se o carregamento inicial já foi concluído
      // Isso evita o "piscar" ao abrir a tela pela primeira vez
      if (hasInitialLoadCompleted.current && !loading && !refreshing) {
        // Recarrega silenciosamente (sem loading, sem alert)
        loadCharges({ showAlert: false, showLoading: false });
      }
    }, [loadCharges, loading, refreshing, hasInitialLoadCompleted])
  );

  // ✅ Pull-to-Refresh
  const onRefresh = useCallback(async () => {
    await loadCharges({ showAlert: false, showLoading: false });
  }, [loadCharges]);

  // ============================================================
  // 📅 Próximos 7 dias (otimizado com funções puras e memoização granular)
  // ============================================================
  const { next7, totalCount } = useMemo(() => {
    const days = calculateNext7Days(chargesByDate);
    const total = calculateTotalCount(chargesByDate);
    return { next7: days, totalCount: total };
  }, [chargesByDate]); // ✅ Só recalcula quando chargesByDate muda

  // ✅ useCallback para evitar recriação da função
  const handleDayPress = useCallback((date: string) => {
    navigation.navigate("ClientsByDate", { date });
  }, [navigation]);

  // ✅ Render item memoizado para FlatList
  const renderTimelineItem = useCallback(
    ({ item: day, index }: { item: DaySummary; index: number }) => (
      <TimelineRow
        day={day}
        isLast={index === next7.length - 1}
        onDayPress={handleDayPress}
      />
    ),
    [handleDayPress, next7.length]
  );

  // ✅ Key extractor estável
  const keyExtractor = useCallback((day: DaySummary) => day.dateStr, []);

  // ✅ Empty component
  const renderEmptyComponent = useCallback(
    () => (
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
    ),
    []
  );

  // ✅ Loading com Skeleton
  if (loading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        <ChargesTimelineSkeleton />
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
            onPress={() => loadCharges({ showAlert: true, showLoading: true })}
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
    <ChargesErrorBoundary onRetry={() => loadCharges({ showAlert: true, showLoading: true })}>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        
        {/* Resumo Superior */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            Próximos 7 dias: <Text style={{fontWeight: 'bold'}}>{totalCount} vencimentos</Text>
          </Text>
        </View>

        {/* ✅ FlatList para virtualização e melhor performance */}
        <FlatList
          data={next7}
          renderItem={renderTimelineItem}
          keyExtractor={keyExtractor}
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
          ListEmptyComponent={totalCount === 0 && !loading && !error ? renderEmptyComponent : null}
          // ✅ Otimizações de performance do FlatList
          initialNumToRender={7}
          maxToRenderPerBatch={7}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(_, index) => ({
            length: 90, // Altura aproximada de cada item
            offset: 90 * index,
            index,
          })}
        />
      </View>
    </ChargesErrorBoundary>
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