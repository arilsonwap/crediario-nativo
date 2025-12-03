import React, { useEffect, useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getUpcomingCharges, type Client } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { useFocusEffect } from "@react-navigation/native";

export default function ClientsByDateScreen({ route, navigation }: any) {
  const { date } = route.params;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    // Formata data para o título (ex: 12/10/2025)
    navigation.setOptions({
      headerTitle: `Vencimentos: ${date}`,
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [date, navigation]);

  // Carrega e filtra os clientes
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const allClients = await getUpcomingCharges();
      // Filtra exatamente pela string da data passada (ex: "12/10/2025")
      const filtered = allClients.filter((c) => c.next_charge === date);
      setClients(filtered);
    } catch (error) {
      console.error("Erro ao carregar clientes:", error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  const handleClientPress = (client: Client) => {
    navigation.navigate("ClientDetail", { client });
  };

  const handleWhatsapp = (client: Client) => {
    if (!client.telefone) {
      Alert.alert("Ops", "Cliente sem telefone cadastrado.");
      return;
    }
    const phone = client.telefone.replace(/\D/g, "");
    const msg = `Olá ${client.name}, estou passando para lembrar do vencimento hoje (${date}) no valor de ${formatCurrency(client.value || 0)}.`;
    Linking.openURL(`whatsapp://send?phone=55${phone}&text=${encodeURIComponent(msg)}`);
  };

  // Cálculos
  const totalAmount = clients.reduce((sum, client) => sum + (client.value || 0), 0);

  // Renderiza Item da Lista
  const renderItem = ({ item }: { item: Client }) => (
    <View style={styles.card}>
      <TouchableOpacity 
        style={styles.cardContent} 
        onPress={() => handleClientPress(item)}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.clientName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.clientPhone}>{item.telefone || "Sem telefone"}</Text>
        </View>

        <Text style={styles.clientValue}>{formatCurrency(item.value || 0)}</Text>
      </TouchableOpacity>

      {/* Botão de Ação Lateral (WhatsApp) */}
      <View style={styles.separatorVertical} />
      <TouchableOpacity style={styles.actionButton} onPress={() => handleWhatsapp(item)}>
        <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />

      {/* 📊 Barra de Estatísticas */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="people" size={20} color="#0056b3" />
          </View>
          <View>
            <Text style={styles.statLabel}>Qtd. Clientes</Text>
            <Text style={styles.statValue}>{clients.length}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <View style={[styles.iconCircle, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="cash" size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={styles.statLabel}>Valor Total</Text>
            <Text style={[styles.statValue, { color: "#16A34A" }]}>
              {formatCurrency(totalAmount)}
            </Text>
          </View>
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={clients}
        keyExtractor={(item) => String(item.id)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Dia Livre!</Text>
              <Text style={styles.emptyText}>Nenhuma cobrança agendada para esta data.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },

  // Stats Bar
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    // Sombra
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: "#E2E8F0",
    marginHorizontal: 15,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statLabel: { fontSize: 11, color: "#64748B", fontWeight: "600", textTransform: "uppercase" },
  statValue: { fontSize: 16, color: "#1E293B", fontWeight: "800" },

  // Lista
  listContent: { padding: 20 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginBottom: 12,
    alignItems: "center",
    // Sombra
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#BAE6FD"
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0284C7",
  },
  infoContainer: { flex: 1 },
  clientName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  clientPhone: { fontSize: 13, color: "#64748B" },
  
  clientValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0056b3",
  },

  // Ação Lateral
  separatorVertical: {
    width: 1,
    height: "60%",
    backgroundColor: "#F1F5F9",
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty State
  emptyContainer: { alignItems: "center", justifyContent: "center", marginTop: 60 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2
  },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: "#475569", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#94A3B8" },
});