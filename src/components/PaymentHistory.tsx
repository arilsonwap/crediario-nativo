import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import type { Payment } from "../database/types";
import { formatCurrency } from "../utils/formatCurrency";

type Props = { payments: Payment[] };

export default function PaymentHistory({ payments }: Props) {
  if (!payments || payments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Nenhum pagamento registrado.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>📜 Histórico de Pagamentos</Text>
      <FlatList
        data={[...payments].reverse()}
        keyExtractor={(_, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.date}>Data: {item.data}</Text>
            <Text style={styles.value}>{formatCurrency(item.valor || 0)}</Text>
          </View>
        )}
      />
    </View>
  );
}

/* ========================= Styles ========================= */
const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  date: { fontSize: 14, color: "#666" },
  value: { fontSize: 15, fontWeight: "600", color: "#007AFF" },
  emptyContainer: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emptyText: { fontSize: 14, color: "#777" },
});
