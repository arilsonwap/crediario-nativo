import React, { useEffect, useState, useMemo, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

import {
  getPaymentsByClient,
  deletePayment,
  getClientById,
  updateClient,
  Client,
  Payment,
} from "../database/db";

import { formatCurrency } from "../utils/formatCurrency";

// 📌 Formata: "2025-01-15T18:32:10.123Z" → "janeiro de 2025"
const formatMonth = (iso: string) => {
  const date = new Date(iso);
  const month = date.toLocaleDateString("pt-BR", { month: "long" });
  const year = date.getFullYear();
  return `${month} de ${year}`;
};

export default function PaymentHistoryScreen() {
  const { params }: any = useRoute();
  const navigation = useNavigation<any>();
  const { clientId } = params;

  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // 🎨 Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Histórico Financeiro",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  // 🔄 Carrega dados
  useEffect(() => {
    try {
      const c = getClientById(clientId);
      setClient(c);

      const list = getPaymentsByClient(clientId);
      // Ordenar por data DESC se vier bagunçado
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setPayments(list);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // 🧩 Agrupa por mês
  const grouped = useMemo(() => {
    const groups: Record<string, Payment[]> = {};

    payments.forEach((p) => {
      const key = formatMonth(p.created_at);
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    return Object.entries(groups).map(([month, items]) => ({ month, items }));
  }, [payments]);

  // 🗑️ Excluir registro
  const handleDelete = (payment: Payment) => {
    if (!client) return;

    Alert.alert(
      "Excluir Pagamento",
      `Deseja remover ${formatCurrency(payment.valor)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            try {
              deletePayment(payment.id!);

              const updated = {
                ...client,
                paid: (client.paid || 0) - payment.valor,
              };

              updateClient(updated);
              setClient(updated);

              setPayments((prev) => prev.filter((p) => p.id !== payment.id));
            } catch (e) {
              Alert.alert("Erro", "Não foi possível excluir.");
            }
          },
        },
      ]
    );
  };

  // 📌 Render individual da timeline
  const renderPaymentItem = (payment: Payment, index: number, total: number) => {
    const isLast = index === total - 1;

    const dateObj = new Date(payment.created_at);
    const day = dateObj.getDate().toString().padStart(2, "0");

    return (
      <View style={s.timelineRow} key={payment.id}>
        {/* Timeline */}
        <View style={s.timelineCol}>
          <View style={[s.line, isLast && s.lineHidden]} />
          <View style={s.dotContainer}>
            <View style={s.dot} />
          </View>
        </View>

        {/* Card */}
        <View style={s.cardContainer}>
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.amountText}>{formatCurrency(payment.valor)}</Text>
              <View style={s.dateRow}>
                <Icon
                  name="calendar-outline"
                  size={12}
                  color="#94A3B8"
                  style={{ marginRight: 4 }}
                />
                <Text style={s.dateText}>Dia {day}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleDelete(payment)}
              style={s.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (loading)
    return <ActivityIndicator size="large" color="#0056b3" style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />

      {/* Barra info */}
      <View style={s.infoBar}>
        <Text style={s.infoText}>
          Extrato de <Text style={{ fontWeight: "bold" }}>{client?.name}</Text>
        </Text>

        <View style={s.badge}>
          <Text style={s.badgeText}>{payments.length} lançamentos</Text>
        </View>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.month}
        contentContainerStyle={s.listContent}
        renderItem={({ item }) => (
          <View style={s.monthBlock}>
            <Text style={s.monthTitle}>{item.month.toUpperCase()}</Text>
            {item.items.map((p, i) => renderPaymentItem(p, i, item.items.length))}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.iconCircle}>
              <Icon name="wallet-outline" size={40} color="#94A3B8" />
            </View>

            <Text style={s.emptyTitle}>Nenhum pagamento</Text>
            <Text style={s.emptySub}>
              Os pagamentos registrados aparecerão aqui.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// 🎨 Estilos — MANTIDOS IGUAIS
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },

  infoBar: {
    backgroundColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  infoText: { color: "#475569", fontSize: 13 },
  badge: {
    backgroundColor: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#0056b3" },

  listContent: { padding: 20, paddingBottom: 40 },

  monthBlock: { marginBottom: 24 },
  monthTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 12,
    marginLeft: 8,
    letterSpacing: 0.5,
  },

  timelineRow: { flexDirection: "row", minHeight: 65 }, // ← reduzido!
  timelineCol: { width: 30, alignItems: "center" },

  line: {
    width: 2,
    backgroundColor: "#E2E8F0",
    position: "absolute",
    top: 14,
    bottom: -14,
    left: 14,
  },
  lineHidden: { display: "none" },

  dotContainer: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  cardContainer: { flex: 1, paddingBottom: 8, paddingLeft: 10 },

  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  amountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 4,
  },
  dateRow: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 13, color: "#94A3B8" },

  deleteBtn: {
    padding: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    elevation: 2,
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#475569", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#94A3B8" },
});
