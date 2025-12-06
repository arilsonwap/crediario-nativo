import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Client } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDateBR } from "../utils/formatDate";

type Props = {
  client: Client;
};

export default function ClientInfoCard({ client }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>📋 Informações do Cliente</Text>

      {/* 🏷️ Nome */}
      <InfoRow label="Nome" value={client.name} />

      {/* 💰 Valor */}
      <InfoRow
        label="Valor"
        value={formatCurrency(client.value || 0)}
        color="#007AFF"
      />

      {/* 📞 Telefone */}
      {client.telefone && (
        <InfoRow label="Telefone" value={client.telefone} />
      )}

      {/* 📍 Endereço */}
      {client.bairro && (
        <InfoRow
          label="Endereço"
          value={`${client.bairro}${client.numero ? `, Nº ${client.numero}` : ""}`}
        />
      )}

      {/* 🔖 Referência */}
      {client.referencia && (
        <InfoRow label="Referência" value={client.referencia} />
      )}

      {/* 📅 Próxima cobrança */}
      {client.next_charge && (
        <InfoRow
          label="Próxima Cobrança"
          value={formatDateBR(client.next_charge)}
          color="#FF9500"
        />
      )}
    </View>
  );
}

/* ========================= Componente interno ========================= */
type InfoRowProps = {
  label: string;
  value: string | number | null;
  color?: string;
};

function InfoRow({ label, value, color }: InfoRowProps) {
  if (value === null || value === undefined || value === "") return null;

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}:</Text>
      <Text style={[styles.value, color ? { color } : null]}>{value}</Text>
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
    // sombra cross-platform
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e5e7eb",
  },
  label: {
    fontSize: 14,
    color: "#555",
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111",
    flex: 1,
    textAlign: "right",
  },
});
