import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import type { Client } from "../database/types";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDateBR } from "../utils/formatDate";

// ✅ Componente Avatar reutilizável
const Avatar = ({ name }: { name: string }) => (
  <View style={styles.avatarContainer}>
    <Text style={styles.avatarText}>
      {name ? name.charAt(0).toUpperCase() : "?"}
    </Text>
  </View>
);

// ✅ Componente ClientCard extraído para melhorar manutenibilidade
interface ClientCardProps {
  client: Client;
  onPress: () => void;
}

const ClientCard: React.FC<ClientCardProps> = ({ client, onPress }) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed
      ]}
      onPress={onPress}
    >
      {/* Cabeçalho do Card */}
      <View style={styles.cardHeader}>
        <View style={styles.userInfo}>
          <Avatar name={client.name || ""} />
          <View style={{ flex: 1 }}>
            <Text style={styles.clientName} numberOfLines={1}>
              {client.name}
            </Text>
            <View style={styles.row}>
              <Icon name="call-outline" size={12} color="#64748B" />
              <Text style={styles.subText}> {client.telefone || "Sem telefone"}</Text>
            </View>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color="#CBD5E1" />
      </View>

      {/* Divisor */}
      <View style={styles.divider} />

      {/* Informações Inferiores */}
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.label}>Próx. Cobrança</Text>
          <View style={styles.row}>
            <Icon name="calendar-outline" size={14} color="#0056b3" />
            <Text style={styles.footerValue}>
              {client.next_charge ? formatDateBR(client.next_charge) : "—"}
            </Text>
          </View>
        </View>

        <View style={[styles.footerItem, { alignItems: 'flex-end' }]}>
          <Text style={styles.label}>Valor Restante</Text>
          <Text style={styles.priceValue}>
            {formatCurrency(Math.max(0, (client.value ?? 0) - (client.paid ?? 0)))}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    // Sombra estilo cartão
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E0F2FE", // Azul bem clarinho
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0284C7",
  },
  clientName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subText: {
    fontSize: 13,
    color: "#64748B",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerItem: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  footerValue: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "500",
  },
  priceValue: {
    fontSize: 16,
    color: "#16A34A", // Verde sucesso
    fontWeight: "bold",
  },
});

export default React.memo(ClientCard);

