import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { Client } from "../database/types";

type Props = {
  client: Client;
  onBack?: () => void;
  onEdit?: () => void;
};

export default function ClientHeader({ client, onBack, onEdit }: Props) {
  return (
    <View style={styles.container}>
      {/* 🔙 Botão voltar */}
      {onBack && (
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Icon name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
      )}

      {/* 🧍 Nome do cliente */}
      <View style={styles.info}>
        <Text style={styles.name}>{client.name}</Text>
        {client.telefone && (
          <Text style={styles.phone}>{client.telefone}</Text>
        )}
      </View>

      {/* ✏️ Botão editar */}
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.iconButton}>
          <Icon name="create-outline" size={22} color="#007AFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

/* ========================= Styles ========================= */
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    // sombra leve cross-platform
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
  },
  info: {
    flex: 1,
    alignItems: "center",
  },
  name: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  phone: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
});
