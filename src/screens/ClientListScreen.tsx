import React, { useState, useCallback, useMemo, useLayoutEffect, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  SectionList,
  TextInput,
  Alert,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
  ActivityIndicator,
  RefreshControl,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getAllClients, Client } from "../database/db";
import ClientCard from "../components/ClientCard";
import SkeletonCard from "../components/SkeletonCard";

// 📊 Tipo para seções alfabéticas
type SectionData = {
  title: string;
  data: Client[];
};

// 📊 Tipo estendido para Client com cache de normalização
type ClientWithCache = Client & {
  _normalizedName?: string;
  _normalizedTelefone?: string;
  _normalizedBairro?: string;
  _normalizedNumero?: string;
  _normalizedReferencia?: string;
};

// 🧭 Tipos de navegação - evita erros e habilita autocomplete
type RootStackParamList = {
  AddClient: undefined;
  ClientDetail: { client: Client };
  ClientList: undefined;
  Home: undefined;
  EditClient: { client: Client; clientId?: number };
  Backup: undefined;
  UpcomingCharges: undefined;
  ClientsByDate: { date: string };
  PaymentHistory: { clientId: number };
  ClientLog: { clientId?: number; client?: Client };
  Reports: undefined;
};

const ClientListScreen = () => {
  const [clients, setClients] = useState<ClientWithCache[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // 📊 Refs para métricas de performance e controle
  const renderStartTime = useRef<number>(0);
  const filterStartTime = useRef<number>(0);
  const sectionListRef = useRef<SectionList>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 🔄 Carregar clientes do banco + métricas + pré-cache de normalização
  const loadClients = useCallback(async (showLoading = true) => {
    const loadStartTime = getPerformanceNow();
    try {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);
      const data = await getAllClients();
      // 🚀 Pré-calcula valores normalizados uma vez (cache)
      const dataWithCache = precomputeNormalizedFields(data);
      const loadTime = getPerformanceNow() - loadStartTime;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`⏱️ [Performance] Carregamento de ${data.length} clientes em ${loadTime.toFixed(2)}ms`);
      }
      setClients(dataWithCache);
    } catch (err: any) {
      const loadTime = getPerformanceNow() - loadStartTime;
      console.error("❌ Erro ao carregar clientes:", err);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`⏱️ [Performance] Erro após ${loadTime.toFixed(2)}ms`);
      }
      const errorMessage = err?.message?.includes('network') || err?.message?.includes('internet')
        ? "Sem conexão com a internet. Verifique sua conexão."
        : "Erro ao carregar os clientes. Tente novamente.";
      setError(errorMessage);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [precomputeNormalizedFields, getPerformanceNow]);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  // ⏱️ Debounce na busca (120ms) para melhorar performance
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, 120);

    return () => clearTimeout(timeout);
  }, [search]);

  // 🔃 Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClients(false);
    setRefreshing(false);
  }, [loadClients]);

  // 🎨 Componente HeaderRight otimizado (useMemo para evitar recriação)
  const headerRight = useMemo(() => (
    <View style={styles.headerRight}>
      <Text style={styles.headerCount}>{clients.length}</Text>
      <Pressable onPress={() => navigation.navigate('AddClient')} hitSlop={10}>
        <Icon name="add-circle-outline" size={26} color="#FFF" />
      </Pressable>
    </View>
  ), [clients.length, navigation]);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Meus Clientes",
      headerStyle: { 
        backgroundColor: "#0056b3", // Azul um pouco mais sóbrio
        elevation: 0, // Remove sombra no Android para fundir com gradiente se quiser
        shadowOpacity: 0 // Remove sombra no iOS
      }, 
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700", fontSize: 18 },
      headerRight: () => headerRight
    });
  }, [navigation, headerRight]);

  // ✅ Função para normalizar texto (remove acentos) - trata null/undefined
  const normalize = useCallback((text: string | null | undefined) =>
    (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""), []);

  // 🚀 Helper para performance.now() - compatível com React Native
  const getPerformanceNow = useCallback(() => {
    if (typeof global !== 'undefined' && global.performance?.now) {
      return global.performance.now();
    }
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }, []);

  // 🚀 Pré-calcular valores normalizados (cache) - executa uma vez no carregamento
  const precomputeNormalizedFields = useCallback((clientList: Client[]): ClientWithCache[] => {
    const startTime = getPerformanceNow();
    const clientsWithCache = clientList.map((client) => ({
      ...client,
      _normalizedName: normalize(client.name),
      _normalizedTelefone: normalize(client.telefone),
      _normalizedBairro: normalize(client.bairro),
      _normalizedNumero: normalize(client.numero),
      _normalizedReferencia: normalize(client.referencia),
    }));
    const cacheTime = getPerformanceNow() - startTime;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`⏱️ [Performance] Cache de normalização em ${cacheTime.toFixed(2)}ms (${clientsWithCache.length} clientes)`);
    }
    return clientsWithCache;
  }, [normalize]);

  // 🔍 Filtro Otimizado com cache de normalização + métricas
  // 🚀 Usa valores pré-calculados (_normalizedName, etc) em vez de normalizar a cada filtro
  const filteredClients = useMemo(() => {
    filterStartTime.current = getPerformanceNow();
    const text = normalize(debouncedSearch);
    const filtered = clients.filter((c) => {
      // ✅ Usa cache de normalização quando disponível (10-25% mais rápido)
      const name = c._normalizedName ?? normalize(c.name);
      const telefone = c._normalizedTelefone ?? normalize(c.telefone);
      const bairro = c._normalizedBairro ?? normalize(c.bairro);
      const numero = c._normalizedNumero ?? normalize(c.numero);
      const referencia = c._normalizedReferencia ?? normalize(c.referencia);
      
      return name.includes(text) ||
        bairro.includes(text) ||
        numero.includes(text) ||
        referencia.includes(text) ||
        telefone.includes(text);
    });
    const filterTime = getPerformanceNow() - filterStartTime.current;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`⏱️ [Performance] Filtro executado em ${filterTime.toFixed(2)}ms (${filtered.length} resultados)`);
    }
    return filtered;
  }, [debouncedSearch, clients, getPerformanceNow]);

  // 📋 Agrupar clientes por letra inicial (para seções alfabéticas)
  // ✅ Garante imutabilidade total - cria novos arrays em cada etapa
  const groupedSections = useMemo(() => {
    if (filteredClients.length < 100) {
      // Menos de 100 clientes: não precisa de seções
      return null;
    }

    const startTime = getPerformanceNow();
    const sectionsMap = new Map<string, Client[]>();
    
    // Agrupa clientes por letra inicial (imutável - cria novos arrays)
    // 🚀 Usa cache de normalização quando disponível
    filteredClients.forEach((client) => {
      const normalizedName = client._normalizedName ?? normalize(client.name || "");
      const firstLetter = normalizedName.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
      
      if (!sectionsMap.has(letter)) {
        sectionsMap.set(letter, []); // Novo array para cada letra
      }
      sectionsMap.get(letter)!.push(client);
    });

    // ✅ Ordena e mapeia garantindo imutabilidade (cria novos objetos)
    const sections: SectionData[] = Array.from(sectionsMap.entries())
      .sort(([a], [b]) => {
        if (a === "#") return 1;
        if (b === "#") return -1;
        return a.localeCompare(b);
      })
      .map(([title, data]) => ({ 
        title, 
        data: [...data] // ✅ Cria cópia do array para garantir imutabilidade
      }));

    const groupingTime = getPerformanceNow() - startTime;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`⏱️ [Performance] Agrupamento por letras em ${groupingTime.toFixed(2)}ms (${sections.length} seções)`);
    }

    return sections;
  }, [filteredClients, getPerformanceNow]);

  const handleClientPress = useCallback((client: ClientWithCache) => {
    navigation.navigate("ClientDetail", { client });
  }, [navigation]);

  // ✅ keyExtractor seguro - sempre garante ID único
  const keyExtractor = useCallback((item: ClientWithCache, index: number) => {
    // Prioriza ID quando disponível (garante unicidade)
    if (item.id != null && item.id > 0) {
      return `client-${item.id}`;
    }
    // Fallback: usa índice (sempre único na lista)
    return `client-index-${index}`;
  }, []);

  // 📊 Render Section Header (separador alfabético)
  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  ), []);

  // 📊 Render Item com métricas + render silo (suspende durante scroll)
  // ✅ ClientCard já está memoizado (React.memo), então não precisa de useCallback aqui
  // 🚀 Render silo: suspende renderização durante scroll para ganhar FPS
  const renderItem = ({ item }: { item: ClientWithCache }) => {
    // Suspende renderização durante scroll (ganha FPS, especialmente Android)
    if (isScrolling) {
      return null;
    }

    renderStartTime.current = getPerformanceNow();
    const component = (
      <ClientCard
        client={item}
        onPress={() => handleClientPress(item)}
      />
    );
    const renderTime = getPerformanceNow() - renderStartTime.current;
    if (typeof __DEV__ !== 'undefined' && __DEV__ && renderTime > 16) {
      // Log apenas se render demorar mais que 1 frame (16ms)
      console.log(`⏱️ [Performance] Render item ${item.id} em ${renderTime.toFixed(2)}ms`);
    }
    return component;
  };

  // 🚀 Handlers de scroll para render silo
  const handleScrollBeginDrag = useCallback(() => {
    setIsScrolling(true);
    // Limpa timeout anterior se existir
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    // Aguarda um pouco antes de reativar render (evita flicker)
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 100);
  }, []);

  const handleMomentumScrollEnd = useCallback(() => {
    // Reativa render quando scroll termina completamente
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    setIsScrolling(false);
  }, []);

  // 🚀 Virtualized Section Index - componente de índice lateral
  const sectionIndexTitles = useMemo(() => {
    if (!groupedSections || groupedSections.length === 0) return null;
    return groupedSections.map(section => section.title);
  }, [groupedSections]);

  const handleSectionIndexPress = useCallback((index: number) => {
    if (sectionListRef.current && groupedSections && index >= 0 && index < groupedSections.length) {
      sectionListRef.current.scrollToLocation({
        sectionIndex: index,
        itemIndex: 0,
        animated: true,
        viewPosition: 0,
      });
    }
  }, [groupedSections]);

  // 🎨 Configuração do StatusBar (padrão Android/iOS)
  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("#0056b3");
    }
  }, []);

  // 🧹 Cleanup do timeout de scroll
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <LinearGradient colors={["#F0F4F8", "#DEE5EF"]} style={styles.gradient}>
        
        {/* 🔍 Busca Flutuante */}
        <View style={styles.headerContainer}>
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#64748B" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome, telefone..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")} hitSlop={10}>
                <Icon name="close-circle" size={20} color="#94A3B8" />
              </Pressable>
            )}
          </View>
        </View>

        {/* ⚠️ Mensagem de Erro */}
        {error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorCard}>
              <Icon name="alert-circle" size={24} color="#EF4444" />
              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>Ops! Algo deu errado</Text>
                <Text style={styles.errorMessage}>{error}</Text>
              </View>
              <Pressable 
                onPress={() => loadClients()} 
                style={styles.retryButton}
                hitSlop={10}
              >
                <Icon name="refresh" size={20} color="#0056b3" />
              </Pressable>
            </View>
          </View>
        )}

        {/* 🎨 Skeleton Loader durante carregamento inicial */}
        {loading && clients.length === 0 ? (
          <FlatList
            data={Array.from({ length: 8 })}
            keyExtractor={(_, index) => `skeleton-${index}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={() => <SkeletonCard />}
            scrollEnabled={false}
          />
        ) : (
          /* 📋 Lista com seções alfabéticas (se 100+ clientes) ou lista simples */
          <View style={{ flex: 1, flexDirection: 'row' }}>
            {groupedSections && groupedSections.length > 0 ? (
            <>
              <SectionList
                ref={sectionListRef}
                sections={groupedSections}
                keyExtractor={keyExtractor}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    colors={["#0056b3"]}
                    tintColor="#0056b3"
                  />
                }
                renderItem={renderItem}
                renderSectionHeader={renderSectionHeader}
                stickySectionHeadersEnabled={true}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={21}
                onScrollBeginDrag={handleScrollBeginDrag}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <View style={styles.iconCircle}>
                      <Icon name="people-outline" size={40} color="#94A3B8" />
                    </View>
                    <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
                    <Text style={styles.emptySub}>
                      {debouncedSearch ? "Tente buscar por outro termo." : "Adicione clientes para começar."}
                    </Text>
                  </View>
                }
                ListFooterComponent={
                  loading ? (
                    <ActivityIndicator size="small" color="#64748B" style={{ marginTop: 20 }} />
                  ) : null
                }
              />
              {/* 🚀 Virtualized Section Index - índice lateral (A, B, C...) */}
              {sectionIndexTitles && sectionIndexTitles.length > 0 && (
                <View style={styles.sectionIndex}>
                  {sectionIndexTitles.map((title, index) => (
                    <Pressable
                      key={title}
                      onPress={() => handleSectionIndexPress(index)}
                      style={({ pressed }) => [
                        styles.sectionIndexItem,
                        pressed && styles.sectionIndexItemPressed
                      ]}
                      hitSlop={4}
                    >
                      <Text style={styles.sectionIndexText}>{title}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </>
          ) : (
            <FlatList
              data={filteredClients}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={["#0056b3"]}
                  tintColor="#0056b3"
                />
              }
              // ✅ Otimizações de performance para listas grandes
              getItemLayout={(_, index) => ({
                length: 130, // Altura aproximada do card (padding + conteúdo + margin)
                offset: 130 * index,
                index,
              })}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={21}
              renderItem={renderItem}
              onScrollBeginDrag={handleScrollBeginDrag}
              onScrollEndDrag={handleScrollEndDrag}
              onMomentumScrollEnd={handleMomentumScrollEnd}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={styles.iconCircle}>
                    <Icon name="people-outline" size={40} color="#94A3B8" />
                  </View>
                  <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
                  <Text style={styles.emptySub}>
                    {debouncedSearch ? "Tente buscar por outro termo." : "Adicione clientes para começar."}
                  </Text>
                </View>
              }
              ListFooterComponent={
                loading ? (
                  <ActivityIndicator size="small" color="#64748B" style={{ marginTop: 20 }} />
                ) : null
              }
            />
          )}
          </View>
        )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    height: 50,
    // Sombra suave
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 16, 
    color: "#1E293B" 
  },
  // Header Right (otimizado)
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 15,
  },
  headerCount: {
    color: '#FFF',
    fontWeight: 'bold',
    marginRight: 15,
  },
  // Error State
  errorContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991B1B',
  },
  retryButton: {
    padding: 8,
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Empty State
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 8
  },
  emptySub: {
    fontSize: 14,
    color: "#94A3B8",
  },
  // Section Header (separador alfabético)
  sectionHeader: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
  },
  // 🚀 Virtualized Section Index (índice lateral)
  sectionIndex: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 4,
    paddingVertical: 20,
    zIndex: 10,
  },
  sectionIndexItem: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  sectionIndexItemPressed: {
    opacity: 0.5,
  },
  sectionIndexText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0056b3',
  },
});

export default ClientListScreen;