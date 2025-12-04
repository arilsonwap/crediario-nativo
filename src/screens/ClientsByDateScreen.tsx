import React, { useState, useCallback, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { getUpcomingCharges, type Client } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { useFocusEffect } from "@react-navigation/native";
import { parseChargeDate } from "../utils/dateUtils";
import { formatErrorForDisplay } from "../utils/errorHandler";
import SkeletonCard from "../components/SkeletonCard";

// ✅ Constantes globais
const DEFAULT_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };
const SKELETON_DATA = Array.from({ length: 5 });
const CARD_HEIGHT = 80; // Altura fixa do card (42 avatar + 14*2 padding + 12 margin)

// ✅ Componente ClientListItem extraído (evita recriação)
interface ClientListItemProps {
  client: Client;
  onPress: () => void;
  onWhatsapp: () => void;
}

const ClientListItem = React.memo<ClientListItemProps>(
  ({ client, onPress, onWhatsapp }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={onPress}
        activeOpacity={0.7}
        hitSlop={DEFAULT_HIT_SLOP}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{client.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.clientName} numberOfLines={1}>
            {client.name}
          </Text>
          <Text style={styles.clientPhone}>{client.telefone || "Sem telefone"}</Text>
        </View>

        <Text style={styles.clientValue}>{formatCurrency(client.value || 0)}</Text>
      </TouchableOpacity>

      <View style={styles.separatorVertical} />
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onWhatsapp}
        activeOpacity={0.7}
        hitSlop={DEFAULT_HIT_SLOP}
      >
        <Icon name="logo-whatsapp" size={22} color="#16A34A" />
      </TouchableOpacity>
    </View>
  ),
  (prevProps, nextProps) => prevProps.client.id === nextProps.client.id
);

ClientListItem.displayName = "ClientListItem";

// ✅ Componente StatsBar memoizado
interface StatsBarProps {
  count: number;
  total: number;
}

const StatsBar = React.memo<StatsBarProps>(({ count, total }) => (
  <View style={styles.statsContainer}>
    <View style={styles.statItem}>
      <View style={[styles.iconCircle, { backgroundColor: "#EFF6FF" }]}>
        <Icon name="people" size={20} color="#0056b3" />
      </View>
      <View>
        <Text style={styles.statLabel}>Qtd. Clientes</Text>
        <Text style={styles.statValue}>{count}</Text>
      </View>
    </View>

    <View style={styles.divider} />

    <View style={styles.statItem}>
      <View style={[styles.iconCircle, { backgroundColor: "#F0FDF4" }]}>
        <Icon name="cash" size={20} color="#16A34A" />
      </View>
      <View>
        <Text style={styles.statLabel}>Valor Total</Text>
        <Text style={[styles.statValue, { color: "#16A34A" }]}>
          {formatCurrency(total)}
        </Text>
      </View>
    </View>
  </View>
));

StatsBar.displayName = "StatsBar";

export default function ClientsByDateScreen({ route, navigation }: any) {
  const { date } = route.params;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // ✅ Normaliza a data uma vez (memoizado)
  const normalizedDate = useMemo(() => parseChargeDate(date), [date]);

  // ✅ Carrega e filtra os clientes (otimizado com useCallback)
  const loadClients = useCallback(async (showAlert = false) => {
    try {
      setError(null);
      setLoading(true);
      const allClients = await getUpcomingCharges();
      
      // ✅ Filtra normalizando ambos os lados (next_charge pode estar em ISO ou BR)
      const filtered = allClients.filter((c) => {
        if (!c.next_charge) return false;
        return parseChargeDate(c.next_charge) === normalizedDate;
      });
      
      setClients(filtered);
    } catch (e) {
      console.error("❌ Erro ao carregar clientes:", {
        error: e,
        errorCode: (e as any)?.code,
        errorMessage: (e as any)?.message,
      });
      
      // ✅ Mensagem de erro amigável
      const errorMessage = formatErrorForDisplay(
        e,
        "Não foi possível carregar os clientes desta data."
      );
      setError(errorMessage);
      
      if (showAlert) {
        Alert.alert(
          "❌ Erro ao Carregar",
          errorMessage,
          [
            {
              text: "Tentar Novamente",
              onPress: () => loadClients(true),
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
      setLoading(false);
      setRefreshing(false);
    }
  }, [normalizedDate]);

  // ✅ Carrega na primeira montagem
  React.useEffect(() => {
    loadClients(true);
  }, [loadClients]);

  // ✅ Recarrega quando a tela recebe foco
  useFocusEffect(
    useCallback(() => {
      loadClients(false);
    }, [loadClients])
  );

  // ✅ Pull-to-Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClients(false);
  }, [loadClients]);

  // ✅ Função memoizada para construir mensagem WhatsApp
  const buildMessage = useCallback(
    (clientName: string, clientValue: number) => {
      return `Olá ${clientName}, estou passando para lembrar do vencimento hoje (${date}) no valor de ${formatCurrency(clientValue || 0)}.`;
    },
    [date]
  );

  // ✅ Handlers memoizados
  const handleClientPress = useCallback((client: Client) => {
    navigation.navigate("ClientDetail", { client });
  }, []);

  const handleWhatsapp = useCallback(
    (client: Client) => {
      if (!client.telefone) {
        Alert.alert("Ops", "Cliente sem telefone cadastrado.");
        return;
      }
      const phone = client.telefone.replace(/\D/g, "");
      const msg = buildMessage(client.name, client.value || 0);
      Linking.openURL(`whatsapp://send?phone=55${phone}&text=${encodeURIComponent(msg)}`);
    },
    [buildMessage]
  );

  // ✅ Cálculos memoizados
  const totalAmount = useMemo(
    () => clients.reduce((sum, client) => sum + (client.value || 0), 0),
    [clients]
  );


  // ✅ Render item memoizado
  const renderItem = useCallback(
    ({ item }: { item: Client }) => (
      <ClientListItem
        client={item}
        onPress={() => handleClientPress(item)}
        onWhatsapp={() => handleWhatsapp(item)}
      />
    ),
    [handleClientPress, handleWhatsapp]
  );

  // ✅ Key extractor estável
  const keyExtractor = useCallback((item: Client) => String(item.id), []);

  // ✅ Empty component
  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Icon name="calendar-outline" size={40} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>Dia Livre!</Text>
        <Text style={styles.emptyText}>Nenhuma cobrança agendada para esta data.</Text>
      </View>
    ),
    []
  );

  // ✅ Error component
  const renderErrorComponent = useCallback(
    () => (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Erro ao Carregar</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadClients(true)}
          activeOpacity={0.7}
          hitSlop={DEFAULT_HIT_SLOP}
        >
          <Icon name="refresh" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    ),
    [error, loadClients]
  );

  // ✅ Loading state
  if (loading && clients.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        <FlatList
          data={SKELETON_DATA}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={() => <SkeletonCard />}
          scrollEnabled={false}
        />
      </View>
    );
  }

  // ✅ Error state
  if (error && clients.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        {renderErrorComponent()}
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />

      {/* 📊 Barra de Estatísticas */}
      <StatsBar count={clients.length} total={totalAmount} />

      {/* Lista */}
      <FlatList
        data={clients}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0056b3"]}
            tintColor="#0056b3"
          />
        }
        ListEmptyComponent={!loading && !error ? renderEmptyComponent : null}
        // ✅ Otimizações de performance do FlatList
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        getItemLayout={(_, index) => ({
          length: CARD_HEIGHT,
          offset: CARD_HEIGHT * index,
          index,
        })}
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    paddingVertical: 40,
  },
  emptyIconCircle: {
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
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center" },

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
});