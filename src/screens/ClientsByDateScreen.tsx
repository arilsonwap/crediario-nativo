import React, { useState, useCallback, useLayoutEffect, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Linking,
  Alert,
  RefreshControl,
  TextInput,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import Animated, { FadeInDown } from "react-native-reanimated";
import { debounce } from "lodash";
import Icon from "react-native-vector-icons/Ionicons";
import { type Client } from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { buildWhatsAppMessage } from "../utils/whatsappMessage";
import { useFocusEffect } from "@react-navigation/native";
import { useClientsByDate } from "../hooks/useClientsByDate";
import { Colors } from "../theme/colors";
import { Metrics } from "../theme/metrics";
import ShimmerCard from "../components/ShimmerCard";
import ErrorBoundary from "../components/ErrorBoundary";
import { trackScreenView } from "../utils/analytics";
import { DEV_LOG, DEV_WARN, DEV_ERROR } from "../utils/devLog";

// ✅ Constantes globais
const SKELETON_DATA = Array.from({ length: 5 });

// ✅ Componente AnimatedCard isolado (evita recriação de animação)
const AnimatedCard = React.memo<{ children: React.ReactNode }>(({ children }) => (
  <Animated.View entering={FadeInDown.duration(300)}>
    {children}
  </Animated.View>
));
AnimatedCard.displayName = "AnimatedCard";

// ✅ Componente ClientListItem extraído (evita recriação)
interface ClientListItemProps {
  client: Client;
  onPress: (clientId: number) => void;
  onWhatsapp: (client: Client) => void;
}

// ✅ Função memoizada para cores do avatar (normaliza caracteres acentuados)
const getAvatarColor = (() => {
  const colors = ["#E0F2FE", "#FEF3C7", "#DCFCE7", "#F3E8FF"];
  return (char: string) => {
    // ✅ Normaliza caracteres acentuados para consistência
    const normalized = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const index = normalized.charCodeAt(0) % colors.length;
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
          onPress={() => onPress(client.id || 0)}
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
        onPress={() => onWhatsapp(client)}
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
    prevProps.client.name === nextProps.client.name &&
    prevProps.client.telefone === nextProps.client.telefone &&
    prevProps.client.value === nextProps.client.value &&
    prevProps.onPress === nextProps.onPress &&
    prevProps.onWhatsapp === nextProps.onWhatsapp
);

ClientListItem.displayName = "ClientListItem";

// ✅ Componente StatsBar memoizado
interface StatsBarProps {
  count: number;
  total: number;
  filteredCount?: number;
  showFiltered?: boolean;
}

const StatsBar = React.memo<StatsBarProps>(
  ({ count, total, filteredCount, showFiltered }) => (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
            <Icon name="people" size={20} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.statLabel}>
              {showFiltered && filteredCount !== undefined
                ? `Mostrando ${filteredCount} de ${count}`
                : "Qtd. Clientes"}
            </Text>
            <Text style={styles.statValue}>
              {showFiltered && filteredCount !== undefined ? filteredCount : count}
            </Text>
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
    prevProps.count === nextProps.count &&
    prevProps.total === nextProps.total &&
    prevProps.filteredCount === nextProps.filteredCount &&
    prevProps.showFiltered === nextProps.showFiltered
);

StatsBar.displayName = "StatsBar";

// ✅ Componente SortBar memoizado (evita re-render desnecessário)
interface SortBarProps {
  sortBy: "name" | "value";
  onSortChange: (sort: "name" | "value") => void;
}

const SortBar = React.memo<SortBarProps>(
  ({ sortBy, onSortChange }) => (
    <View style={styles.sortContainer}>
      <TouchableOpacity
        style={[styles.sortButton, sortBy === "name" && styles.sortButtonActive]}
        onPress={() => onSortChange("name")}
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
        style={[styles.sortButton, styles.sortButtonLast, sortBy === "value" && styles.sortButtonActive]}
        onPress={() => onSortChange("value")}
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
  ),
  (prevProps, nextProps) =>
    prevProps.sortBy === nextProps.sortBy && prevProps.onSortChange === nextProps.onSortChange
);

SortBar.displayName = "SortBar";

export default function ClientsByDateScreen({ route, navigation }: any) {
  const { date } = route.params;
  const { clients, loading, refreshing, error, loadClients } = useClientsByDate(date);
  
  // ✅ Refs para controle de scroll e comparação
  const flatListRef = useRef<FlashList<Client>>(null);
  const prevClientsLengthRef = useRef(0);

  // ✅ Estados para busca e filtro
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "value">("name");

  // ✅ Debounce para busca (melhora UX em listas grandes)
  const debouncedSearch = useMemo(
    () => debounce((text: string) => {
      if (isMountedRef.current) {
        setDebouncedSearchQuery(text);
      }
    }, 200),
    []
  );

  // ✅ Atualiza busca debounced quando searchQuery muda
  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: `Vencimentos: ${date}`,
      headerStyle: { backgroundColor: Colors.primary, elevation: 0, shadowOpacity: 0 },
      headerTintColor: Colors.white,
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [date, navigation]);

  // ✅ Ref para controlar se o componente está montado
  const isMountedRef = useRef(true);

  // ✅ Ref para controlar requisições ativas (evita race conditions)
  const activeRequestRef = useRef(true);

  // ✅ Wrapper para loadClients que evita race conditions
  const loadClientsSafe = useCallback(
    async (showAlert = false) => {
      if (!isMountedRef.current) {
        DEV_LOG("⚠️ loadClientsSafe: componente não montado, ignorando");
        return;
      }
      
      activeRequestRef.current = true;
      DEV_LOG("🔄 loadClientsSafe: iniciando carregamento para data:", date);
      
      try {
        await loadClients(showAlert);
        // ✅ Verifica se ainda está ativo após carregamento
        if (!isMountedRef.current || !activeRequestRef.current) {
          DEV_LOG("⚠️ loadClientsSafe: requisição cancelada (componente desmontado ou nova requisição)");
          return;
        }
        DEV_LOG("✅ loadClientsSafe: carregamento concluído");
      } catch (error) {
        DEV_ERROR("❌ loadClientsSafe: erro ao carregar", error);
        // ✅ Só propaga erro se ainda estiver montado e ativo
        if (isMountedRef.current && activeRequestRef.current) {
          throw error;
        }
      }
    },
    [loadClients, date]
  );

  // ✅ Carrega e registra analytics quando a tela recebe foco (com cleanup)
  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      
      trackScreenView("ClientsByDate");
      loadClientsSafe(true);

      return () => {
        isMountedRef.current = false;
        activeRequestRef.current = false;
        // ✅ Cancela debounce ao sair da tela (evita memory leak)
        debouncedSearch.cancel();
      };
    }, [loadClientsSafe, debouncedSearch])
  );

  // ✅ Pull-to-Refresh
  const onRefresh = useCallback(() => {
    loadClientsSafe(false);
  }, [loadClientsSafe]);

  // ✅ Handlers memoizados (otimizados para evitar funções inline)
  const handleClientPressById = useCallback(
    (clientId: number) => {
      // ✅ Passa apenas clientId para evitar inconsistências com dados atualizados
      (navigation as any).navigate("ClientDetail", { clientId });
    },
    [navigation]
  );

  const handleSortChange = useCallback((sort: "name" | "value") => {
    setSortBy(sort);
  }, []);

  const handleWhatsappByClient = useCallback(
    (client: Client) => {
      if (!client.telefone) {
        Alert.alert("Ops", "Cliente sem telefone cadastrado.");
        return;
      }
      const phone = client.telefone.replace(/\D/g, "");
      const msg = buildWhatsAppMessage(client.name, client.value || 0, date);
      Linking.openURL(`whatsapp://send?phone=55${phone}&text=${encodeURIComponent(msg)}`);
    },
    [date]
  );

  // ✅ Busca e filtro separados (melhor performance)
  const filteredClients = useMemo(() => {
    if (!debouncedSearchQuery) return clients;
    
    const query = debouncedSearchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.telefone?.toLowerCase().includes(query)
    );
  }, [clients, debouncedSearchQuery]);

  const filteredAndSortedClients = useMemo(() => {
    const result = [...filteredClients];
    
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      return (b.value || 0) - (a.value || 0);
    });

    return result;
  }, [filteredClients, sortBy]);

  // ✅ Cálculos memoizados (baseado nos clientes originais - StatsBar não re-renderiza com busca)
  const totalAmount = useMemo(
    () => clients.reduce((sum, client) => sum + (client.value || 0), 0),
    [clients]
  );


  // ✅ Debug: log dos dados recebidos (apenas em desenvolvimento)
  if (__DEV__) {
    useEffect(() => {
      DEV_LOG("📊 ClientsByDateScreen - Estado atual:", {
        date,
        clientsCount: clients.length,
        filteredClientsCount: filteredClients.length,
        filteredAndSortedCount: filteredAndSortedClients.length,
        loading,
        refreshing,
        error: error ? error.substring(0, 50) : null,
        debouncedSearchQuery: debouncedSearchQuery || "(vazio)",
      });
    }, [date, clients.length, filteredClients.length, filteredAndSortedClients.length, loading, refreshing, error, debouncedSearchQuery]);
  }

  // ✅ Scroll automático quando número de clientes muda
  useEffect(() => {
    if (clients.length !== prevClientsLengthRef.current) {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }
    prevClientsLengthRef.current = clients.length;
  }, [clients.length]);



  // ✅ Render item memoizado (anima apenas os primeiros 10 itens)
  const renderItem = useCallback(
    ({ item, index }: { item: Client; index: number }) => {
      DEV_LOG("🎨 renderItem chamado:", {
        index,
        clientId: item.id,
        clientName: item.name,
        clientPhone: item.telefone,
        clientValue: item.value,
        nextCharge: item.next_charge,
      });
      const content = (
        <ClientListItem
          client={item}
          onPress={handleClientPressById}
          onWhatsapp={handleWhatsappByClient}
        />
      );
      // ✅ Anima apenas os primeiros 10 itens (evita replay em scroll)
      return index < 10 ? <AnimatedCard>{content}</AnimatedCard> : content;
    },
    [handleClientPressById, handleWhatsappByClient]
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

  // ✅ Debug: log de renderização (apenas em desenvolvimento)
  if (__DEV__) {
    DEV_LOG("🎨 Renderizando ClientsByDateScreen:", {
      loading,
      clientsLength: clients.length,
      filteredLength: filteredAndSortedClients.length,
      error: !!error,
      shouldShowSkeleton: loading && clients.length === 0 && !error,
    });
  }

  // ✅ Loading state (apenas na primeira carga)
  if (loading && clients.length === 0 && !error) {
    DEV_LOG("⏳ Renderizando skeleton (loading=true, clients=0, error=null)");
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
        <FlashList
          data={SKELETON_DATA}
          keyExtractor={(_: any, index: number) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={() => <ShimmerCard />}
          estimatedItemSize={Metrics.cardHeight + 20}
          removeClippedSubviews={true}
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
        <StatsBar
          count={clients.length}
          total={totalAmount}
          filteredCount={debouncedSearchQuery ? filteredAndSortedClients.length : undefined}
          showFiltered={!!debouncedSearchQuery}
        />

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
          <SortBar sortBy={sortBy} onSortChange={handleSortChange} />
        </View>

        {/* Lista */}
        <View style={{ flex: 1 }}>
          <FlashList
            ref={flatListRef}
            data={filteredAndSortedClients}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            estimatedItemSize={Metrics.cardHeight + 20}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
            ListEmptyComponent={
              !loading && !error && filteredAndSortedClients.length === 0
                ? renderEmptyComponent
                : null
            }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
        </View>
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
    marginBottom: Metrics.cardMarginBottom,
    alignItems: "center",
    minHeight: Metrics.cardHeight, // ✅ Garante altura mínima consistente
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
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
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Metrics.spacing.m,
    paddingVertical: Metrics.spacing.s,
    borderRadius: Metrics.cardRadius / 2,
    backgroundColor: Colors.background,
    marginRight: Metrics.spacing.s,
  },
  sortButtonLast: {
    marginRight: 0,
  },
  sortButtonActive: {
    backgroundColor: Colors.primaryLight,
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginLeft: Metrics.spacing.xs,
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
  },
  clearSelectionIcon: {
    marginRight: Metrics.spacing.xs,
  },
  clearSelectionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
});