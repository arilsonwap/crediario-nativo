import React, { useState, useCallback, useLayoutEffect, useMemo, useRef, useEffect } from "react";
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
  TextInput,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { debounce } from "lodash";
import Icon from "react-native-vector-icons/Ionicons";
import { type Client } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { useFocusEffect } from "@react-navigation/native";
import { useClientsByDate } from "../hooks/useClientsByDate";
import { Colors } from "../theme/colors";
import { Metrics } from "../theme/metrics";
import ShimmerCard from "../components/ShimmerCard";
import ErrorBoundary from "../components/ErrorBoundary";
import { trackScreenView } from "../utils/analytics";

// ✅ Constantes globais
const SKELETON_DATA = Array.from({ length: 5 });

// ✅ Componente ClientListItem extraído (evita recriação)
interface ClientListItemProps {
  client: Client;
  onPress: () => void;
  onWhatsapp: () => void;
}

// ✅ Função memoizada para cores do avatar
const getAvatarColor = (() => {
  const colors = ["#E0F2FE", "#FEF3C7", "#DCFCE7", "#F3E8FF"];
  return (char: string) => {
    const index = char.charCodeAt(0) % colors.length;
    return colors[index];
  };
})();

const ClientListItem = React.memo<ClientListItemProps>(
  ({ client, onPress, onWhatsapp }) => {
    const avatarColor = getAvatarColor(client.name.charAt(0));
    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={onPress}
          activeOpacity={0.7}
          hitSlop={Metrics.hitSlop}
          accessibilityLabel={`Cliente ${client.name}`}
          accessibilityRole="button"
        >
          <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
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
        hitSlop={Metrics.hitSlop}
        accessibilityLabel={`Enviar WhatsApp para ${client.name}`}
        accessibilityRole="button"
      >
        <Icon name="logo-whatsapp" size={22} color="#16A34A" />
      </TouchableOpacity>
    </View>
    );
  },
  (prevProps, nextProps) =>
    prevProps.client.id === nextProps.client.id &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onWhatsapp === nextProps.onWhatsapp
);

ClientListItem.displayName = "ClientListItem";

// ✅ Componente StatsBar memoizado
interface StatsBarProps {
  count: number;
  total: number;
}

const StatsBar = React.memo<StatsBarProps>(
  ({ count, total }) => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
            <Icon name="people" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.statLabel}>Qtd. Clientes</Text>
            <Text style={styles.statValue}>{count}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statItem}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.successLight }]}>
            <Icon name="cash" size={20} color={Colors.success} />
          </View>
          <View>
            <Text style={styles.statLabel}>Valor Total</Text>
            <Text style={[styles.statValue, { color: Colors.success }]}>
              {formatCurrency(total)}
            </Text>
          </View>
      </View>
    </View>
  ),
  (prevProps, nextProps) =>
    prevProps.count === nextProps.count && prevProps.total === nextProps.total
);

StatsBar.displayName = "StatsBar";

export default function ClientsByDateScreen({ route, navigation }: any) {
  const { date } = route.params;
  const { clients, loading, refreshing, error, loadClients } = useClientsByDate(date);

  // ✅ Refs para controle de scroll e comparação
  const flatListRef = useRef<FlatList<Client>>(null);
  const prevClientsLengthRef = useRef(0);

  // ✅ Estados para busca, filtro e seleção
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "value">("name");
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set());

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `Vencimentos: ${date}`,
      headerStyle: { backgroundColor: Colors.primary, elevation: 0, shadowOpacity: 0 },
      headerTintColor: Colors.white,
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [date, navigation]);

  // ✅ Analytics - Registra visualização de tela
  React.useEffect(() => {
    trackScreenView("ClientsByDate");
  }, []);

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
  const onRefresh = useCallback(() => {
    loadClients(false);
  }, [loadClients]);

  // ✅ Função memoizada para construir mensagem WhatsApp
  const buildMessage = useCallback(
    (clientName: string, clientValue: number) => {
      return `Olá ${clientName}, estou passando para lembrar do vencimento hoje (${date}) no valor de ${formatCurrency(clientValue || 0)}.`;
    },
    [date]
  );

  // ✅ Handlers memoizados (navigation é estável do React Navigation)
  const handleClientPress = useCallback((client: Client) => {
    (navigation as any).navigate("ClientDetail", { client });
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

  // ✅ Busca e filtro local memoizado
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients];

    // Filtro por busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.telefone?.toLowerCase().includes(query)
      );
    }

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      return (b.value || 0) - (a.value || 0);
    });

    return result;
  }, [clients, searchQuery, sortBy]);

  // ✅ Cálculos memoizados (baseado nos clientes filtrados)
  const totalAmount = useMemo(
    () => filteredAndSortedClients.reduce((sum, client) => sum + (client.value || 0), 0),
    [filteredAndSortedClients]
  );

  // ✅ Seleção múltipla
  const toggleSelection = useCallback((clientId: number) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedClients(new Set());
  }, []);

  // ✅ Scroll automático quando número de clientes muda
  useEffect(() => {
    if (clients.length !== prevClientsLengthRef.current) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    prevClientsLengthRef.current = clients.length;
  }, [clients.length]);

  // ✅ Estrutura para debounce de buscas futuras
  const searchClients = useCallback(
    debounce((text: string) => {
      // lógica de filtro futura
    }, 300),
    [clients]
  );


  // ✅ Render item memoizado com animação de entrada
  const renderItem = useCallback(
    ({ item, index }: { item: Client; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <ClientListItem
          client={item}
          onPress={() => handleClientPress(item)}
          onWhatsapp={() => handleWhatsapp(item)}
        />
      </Animated.View>
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
        <Icon name="alert-circle-outline" size={64} color={Colors.error} />
        <Text style={styles.errorTitle}>Erro ao Carregar</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => loadClients(true)}
          activeOpacity={0.7}
          hitSlop={Metrics.hitSlop}
          accessibilityLabel="Tentar carregar novamente"
          accessibilityRole="button"
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
          keyExtractor={(_: any, index: number) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={() => <ShimmerCard />}
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
    <ErrorBoundary>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        {/* 📊 Barra de Estatísticas */}
        <StatsBar count={filteredAndSortedClients.length} total={totalAmount} />

        {/* 🔍 Barra de Busca */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color={Colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome ou telefone..."
              placeholderTextColor={Colors.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                activeOpacity={0.7}
                hitSlop={Metrics.hitSlop}
                accessibilityLabel="Limpar busca"
                accessibilityRole="button"
              >
                <Icon name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.sortContainer}>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === "name" && styles.sortButtonActive]}
              onPress={() => setSortBy("name")}
              activeOpacity={0.7}
              hitSlop={Metrics.hitSlop}
            >
              <Icon
                name="text"
                size={16}
                color={sortBy === "name" ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === "name" && styles.sortButtonTextActive,
                ]}
              >
                Nome
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortBy === "value" && styles.sortButtonActive]}
              onPress={() => setSortBy("value")}
              activeOpacity={0.7}
              hitSlop={Metrics.hitSlop}
            >
              <Icon
                name="cash"
                size={16}
                color={sortBy === "value" ? Colors.primary : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.sortButtonText,
                  sortBy === "value" && styles.sortButtonTextActive,
                ]}
              >
                Valor
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Lista */}
        <ErrorBoundary>
          <FlatList
            ref={flatListRef}
            data={filteredAndSortedClients}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={!loading && !error ? renderEmptyComponent : null}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            getItemLayout={(_, index) => ({
              length: Metrics.cardHeight,
              offset: Metrics.cardHeight * index,
              index,
            })}
          />
        </ErrorBoundary>
      </View>
    </ErrorBoundary>
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
    backgroundColor: Colors.card,
    borderRadius: Metrics.cardRadius,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardSelected: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primaryLight,
  },
  selectButton: {
    padding: Metrics.spacing.s,
    marginLeft: Metrics.spacing.s,
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
          backgroundColor: Colors.primary,
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
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },

  // Search
  searchContainer: {
    backgroundColor: Colors.card,
    padding: Metrics.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: Metrics.cardRadius / 2,
    paddingHorizontal: Metrics.spacing.m,
    marginBottom: Metrics.spacing.s,
  },
  searchIcon: {
    marginRight: Metrics.spacing.s,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: Metrics.spacing.s,
  },
  sortContainer: {
    flexDirection: "row",
    gap: Metrics.spacing.s,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Metrics.spacing.m,
    paddingVertical: Metrics.spacing.s,
    borderRadius: Metrics.cardRadius / 2,
    backgroundColor: Colors.background,
    gap: Metrics.spacing.xs,
  },
  sortButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  sortButtonTextActive: {
    color: Colors.primary,
  },
  clearSelectionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error,
    paddingHorizontal: Metrics.spacing.m,
    paddingVertical: Metrics.spacing.s,
    borderRadius: Metrics.cardRadius / 2,
    marginTop: Metrics.spacing.s,
    gap: Metrics.spacing.xs,
  },
  clearSelectionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
});