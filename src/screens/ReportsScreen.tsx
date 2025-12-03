import React, { useEffect, useState, useCallback, useLayoutEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  StatusBar,
  RefreshControl 
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getTotals } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import FinancialChart from "../components/FinancialChart"; // Certifique-se de ter criado este componente

export default function ReportsScreen() {
  const navigation = useNavigation();
  const [totalValue, setTotalValue] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalToReceive, setTotalToReceive] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Relatórios Financeiros",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  const loadData = useCallback(async () => {
    try {
      const totals = await getTotals(true); // força atualizar cache
      setTotalPaid(totals.totalPaid);
      setTotalToReceive(totals.totalToReceive);
      setTotalValue(totals.totalPaid + totals.totalToReceive);
    } catch (e) {
      console.error("Erro ao carregar totais:", e);
    }
  }, []);

  // Atualiza ao entrar na tela
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calcula porcentagem recebida
  const percentageReceived = totalValue > 0 ? (totalPaid / totalValue) * 100 : 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      
      <ScrollView 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0056b3"]} />
        }
      >
        {/* 📊 Seção do Gráfico */}
        <FinancialChart totalPaid={totalPaid} totalToReceive={totalToReceive} />

        {/* 📈 Barra de Progresso Geral */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progresso de Recebimento</Text>
            <Text style={styles.progressValue}>{percentageReceived.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${percentageReceived}%` }]} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>DETALHAMENTO</Text>

        {/* 💰 Cards de Métricas */}
        <StatCard 
          label="Valor Total Movimentado" 
          value={totalValue} 
          icon="wallet" 
          color="#475569" 
          bgColor="#F1F5F9"
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <StatCard 
              label="Total Recebido" 
              value={totalPaid} 
              icon="checkmark-circle" 
              color="#16A34A" 
              bgColor="#DCFCE7"
              compact
            />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <StatCard 
              label="A Receber" 
              value={totalToReceive} 
              icon="time" 
              color="#0056b3" 
              bgColor="#EFF6FF"
              compact
            />
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// 🧱 Componente de Card de Estatística
const StatCard = ({ label, value, icon, color, bgColor, compact }: any) => (
  <View style={[styles.card, styles.shadow]}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={compact ? 20 : 24} color={color} />
      </View>
      {!compact && <Ionicons name="ellipsis-horizontal" size={20} color="#CBD5E1" />}
    </View>
    
    <View style={styles.cardContent}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, { color: color }]}>{formatCurrency(value)}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  
  // Progress Bar
  progressCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressLabel: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  progressValue: { fontSize: 13, color: "#16A34A", fontWeight: "bold" },
  progressBarBg: { height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#16A34A", borderRadius: 4 },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 12,
    marginLeft: 4,
    letterSpacing: 0.5,
  },

  row: { flexDirection: "row" },

  // Card Styles
  card: {
    backgroundColor: "#FFF",
    padding: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  shadow: {
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  iconBox: {
    padding: 10,
    borderRadius: 12,
  },
  cardContent: {},
  cardLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: "bold",
  },
});