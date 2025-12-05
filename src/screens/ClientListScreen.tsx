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
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getAllClients, getClientsPage, getClientsBySearch, Client } from "../database/db";
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

// ============================================================
// 🛠️ UTILITÁRIOS (extraídos para evitar recriação)
// ============================================================

// ✅ Constantes
const SKELETON_COUNT = 8;
const ITEM_HEIGHT = 130; // Altura aproximada do card (padding + conteúdo + margin)
const MIN_SECTIONS_COUNT = 100; // Mínimo de clientes para usar seções alfabéticas
const DEBOUNCE_DELAY = 120; // Delay do debounce em ms
const PAGE_SIZE = 20; // Tamanho da página para paginação

// ============================================================
// 🧩 COMPONENTES (extraídos para evitar recriação)
// ============================================================

/**
 * ✅ EmptyState - Componente para lista vazia (memoizado)
 * Evita recriação de JSX a cada render
 */
interface EmptyStateProps {
  hasSearch: boolean;
}

const EmptyState = React.memo<EmptyStateProps>(({ hasSearch }) => (
  <View style={styles.emptyContainer}>
    <View style={styles.iconCircle}>
      <Icon name="people-outline" size={40} color="#94A3B8" />
    </View>
    <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
    <Text style={styles.emptySub}>
      {hasSearch ? "Tente buscar por outro termo." : "Adicione clientes para começar."}
    </Text>
  </View>
));
EmptyState.displayName = "EmptyState";

/**
 * ✅ SectionHeader - Componente para cabeçalho de seção (memoizado)
 * Totalmente estável, evita recriação de wrapper
 */
interface SectionHeaderProps {
  title: string;
}

const SectionHeader = React.memo<SectionHeaderProps>(({ title }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionHeaderText}>{title}</Text>
  </View>
));
SectionHeader.displayName = "SectionHeader";

/**
 * ✅ Normaliza texto removendo acentos (função pura)
 * Trata null/undefined de forma segura
 */
const normalize = (text: string | null | undefined): string =>
  (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * 🚀 Helper para performance.now() - compatível com React Native
 * Retorna timestamp de alta precisão quando disponível
 */
const getPerformanceNow = (): number => {
  if (typeof global !== 'undefined' && global.performance?.now) {
    return global.performance.now();
  }
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  return Date.now();
};

/**
 * 🚀 Pré-calcula valores normalizados para cache (função pura)
 * Evita recalcular normalização a cada filtro
 */
const precomputeNormalizedFields = (clientList: Client[]): ClientWithCache[] => {
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
  // ✅ Estados para paginação
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  
  // ✅ Sincroniza ref com state
  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  
  // 📊 Refs para métricas de performance e controle
  const renderStartTime = useRef<number>(0);
  const filterStartTime = useRef<number>(0);
  const sectionListRef = useRef<SectionList>(null);

  // ✅ Ref para refreshing (evita dependência instável em loadClients)
  const refreshingRef = useRef(false);
  // ✅ Ref para controlar se componente está montado (evita race conditions)
  const isMountedRef = useRef(true);
  // ✅ AbortController para cancelar requisições pendentes
  const abortControllerRef = useRef<AbortController | null>(null);
  // ✅ Ref para página atual (evita stale closure)
  const pageRef = useRef(0);
  
  // 🔄 Carregar página de clientes (paginação incremental)
  // ✅ Protegido contra race conditions com AbortController e isMountedRef
  const loadClientsPage = useCallback(async (reset = false) => {
    // ✅ Cancela requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // ✅ Cria novo AbortController para esta requisição
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // ✅ Se reset, zera lista e começa do zero
    let currentPage = 0;
    if (reset) {
      setPage(0);
      pageRef.current = 0;
      setHasMore(true);
      if (isMountedRef.current) {
        setClients([]);
      }
    } else {
      // ✅ Usa ref para pegar valor atualizado (evita stale closure)
      currentPage = pageRef.current;
    }
    
    const offset = currentPage * PAGE_SIZE;
    
    const loadStartTime = getPerformanceNow();
    try {
      // ✅ Só mostra loadingMore se não for reset (evita conflito com loading inicial)
      if (!reset && isMountedRef.current) {
        setLoadingMore(true);
      }
      
      if (isMountedRef.current && reset) {
        setError(null);
      }
      
      const data = await getClientsPage(PAGE_SIZE, offset);
      
      // ✅ Verifica se requisição foi cancelada ou componente desmontado
      if (abortController.signal.aborted || !isMountedRef.current) {
        return;
      }
      
      // ✅ Se retornou lista vazia, não há mais páginas
      if (data.length === 0) {
        if (isMountedRef.current) {
          setHasMore(false);
        }
        return;
      }
      
      // 🚀 Pré-calcula valores normalizados uma vez (cache)
      const dataWithCache = precomputeNormalizedFields(data);
      const loadTime = getPerformanceNow() - loadStartTime;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`⏱️ [Performance] Carregamento página ${currentPage} (${data.length} clientes) em ${loadTime.toFixed(2)}ms`);
      }
      
      // ✅ Só atualiza state se ainda estiver montado
      if (isMountedRef.current) {
        if (reset) {
          setClients(dataWithCache);
        } else {
          // ✅ Acrescenta novos clientes ao array atual (evita duplicação)
          setClients(prev => {
            // ✅ Verifica duplicatas por ID antes de adicionar
            const existingIds = new Set(prev.map(c => c.id));
            const newClients = dataWithCache.filter(c => c.id && !existingIds.has(c.id));
            return [...prev, ...newClients];
          });
        }
        
        // ✅ Se retornou menos que PAGE_SIZE, não há mais páginas
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        } else {
          // ✅ Incrementa página para próxima requisição
          const nextPage = currentPage + 1;
          setPage(nextPage);
          pageRef.current = nextPage;
        }
      }
    } catch (err: any) {
      // ✅ Ignora erros de abort
      if (err?.name === 'AbortError' || abortController.signal.aborted) {
        return;
      }
      
      const loadTime = getPerformanceNow() - loadStartTime;
      console.error("❌ Erro ao carregar página de clientes:", err);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.log(`⏱️ [Performance] Erro após ${loadTime.toFixed(2)}ms`);
      }
      
      // ✅ Só atualiza error se ainda estiver montado e for reset
      if (isMountedRef.current && reset) {
        const errorMessage = err?.message?.includes('network') || err?.message?.includes('internet')
          ? "Sem conexão com a internet. Verifique sua conexão."
          : "Erro ao carregar os clientes. Tente novamente.";
        setError(errorMessage);
      }
    } finally {
      // ✅ Limpa AbortController se esta requisição ainda estiver ativa
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      
      // ✅ Desativa loadingMore
      if (isMountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, []);

  // 🔄 Carregar clientes do banco (mantido para compatibilidade, mas usa paginação)
  // ✅ Usa loadClientsPage com reset=true para carregamento inicial
  const loadClients = useCallback(async (showLoading = true) => {
    // ✅ Só mostra loading se não estiver fazendo refresh (evita lista desaparecer)
    if (showLoading && !refreshingRef.current && isMountedRef.current) {
      setLoading(true);
    }
    
    try {
      await loadClientsPage(true);
    } finally {
      // ✅ Só desativa loading se não estiver fazendo refresh e ainda estiver montado
      if (showLoading && !refreshingRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [loadClientsPage]);

  useFocusEffect(
    useCallback(() => {
      isMountedRef.current = true;
      loadClients();
      
      return () => {
        isMountedRef.current = false;
        // ✅ Cancela requisições pendentes ao sair da tela
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
        }
      };
    }, [loadClients])
  );

  // ⏱️ Debounce na busca para melhorar performance
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeout);
  }, [search]);

  // 🔍 Busca SQL quando houver texto na busca
  // ✅ Ignora paginação e busca diretamente no SQLite
  useEffect(() => {
    if (!isMountedRef.current) return;

    // ✅ Se há busca, faz busca SQL direta
    if (debouncedSearch.length > 0) {
      const performSearch = async () => {
        // ✅ Cancela requisição anterior se existir
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        
        const searchStartTime = getPerformanceNow();
        try {
          setLoading(true);
          setError(null);
          
          const results = await getClientsBySearch(debouncedSearch);
          
          // ✅ Verifica se requisição foi cancelada ou componente desmontado
          if (abortController.signal.aborted || !isMountedRef.current) {
            return;
          }
          
          // 🚀 Pré-calcula valores normalizados (mesmo cache usado na paginação)
          const withCache = precomputeNormalizedFields(results);
          
          const searchTime = getPerformanceNow() - searchStartTime;
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.log(`⏱️ [Performance] Busca SQL: ${results.length} resultados em ${searchTime.toFixed(2)}ms`);
          }
          
          // ✅ Atualiza lista com resultados da busca
          if (isMountedRef.current) {
            setClients(withCache);
            setHasMore(false); // ✅ Desativa infinite scroll durante busca
          }
        } catch (err: any) {
          // ✅ Ignora erros de abort
          if (err?.name === 'AbortError' || abortController.signal.aborted) {
            return;
          }
          
          console.error("❌ Erro ao buscar clientes:", err);
          if (isMountedRef.current) {
            const errorMessage = err?.message?.includes('network') || err?.message?.includes('internet')
              ? "Sem conexão com a internet. Verifique sua conexão."
              : "Erro ao buscar clientes. Tente novamente.";
            setError(errorMessage);
          }
        } finally {
          // ✅ Limpa AbortController se esta requisição ainda estiver ativa
          if (abortControllerRef.current === abortController) {
            abortControllerRef.current = null;
          }
          
          if (isMountedRef.current) {
            setLoading(false);
          }
        }
      };
      
      performSearch();
    } else {
      // ✅ Se busca foi apagada, volta para paginação normal
      setPage(0);
      pageRef.current = 0;
      setHasMore(true);
      loadClientsPage(true);
    }
  }, [debouncedSearch, loadClientsPage]);

  // 🔃 Pull to Refresh
  // ✅ Se houver busca, recarrega busca SQL. Caso contrário, reseta paginação
  const onRefresh = useCallback(async () => {
    refreshingRef.current = true;
    setRefreshing(true);
    
    if (debouncedSearch.length > 0) {
      // ✅ Recarrega busca SQL
      try {
        const results = await getClientsBySearch(debouncedSearch);
        const withCache = precomputeNormalizedFields(results);
        setClients(withCache);
      } catch (err: any) {
        console.error("❌ Erro ao recarregar busca:", err);
      }
    } else {
      // ✅ Reseta paginação e recarrega página 0
      await loadClientsPage(true);
    }
    
    refreshingRef.current = false;
    setRefreshing(false);
  }, [loadClientsPage, debouncedSearch]);

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

  // 🔍 Filtro simplificado
  // ✅ Quando há busca SQL, clients já vem filtrado do banco (não precisa filtrar novamente)
  // ✅ Quando não há busca, usa lista paginada normal (sem filtro adicional)
  const filteredClients = useMemo(() => {
    // ✅ Retorna clients diretamente (busca SQL já filtra no banco, paginação já vem ordenada)
    return clients;
  }, [clients]);

  // 📋 Agrupar clientes por letra inicial (para seções alfabéticas)
  // ✅ Otimizado: evita recriação se filteredClients não mudou (comparação por referência)
  const groupedSections = useMemo(() => {
    if (filteredClients.length < MIN_SECTIONS_COUNT) {
      // Menos de MIN_SECTIONS_COUNT clientes: não precisa de seções
      return null;
    }

    const startTime = getPerformanceNow();
    const sectionsMap = new Map<string, Client[]>();
    
    // Agrupa clientes por letra inicial (totalmente imutável)
    // 🚀 Usa cache de normalização quando disponível
    filteredClients.forEach((client) => {
      const normalizedName = client._normalizedName ?? normalize(client.name || "");
      const firstLetter = normalizedName.charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstLetter) ? firstLetter : "#";
      
      // ✅ Imutabilidade total: cria novo array ao invés de mutar
      if (!sectionsMap.has(letter)) {
        sectionsMap.set(letter, [client]);
      } else {
        sectionsMap.set(letter, [...sectionsMap.get(letter)!, client]);
      }
    });

    // ✅ Ordena e mapeia (cria novos objetos apenas quando necessário)
    const sections: SectionData[] = Array.from(sectionsMap.entries())
      .sort(([a], [b]) => {
        if (a === "#") return 1;
        if (b === "#") return -1;
        return a.localeCompare(b);
      })
      .map(([title, data]) => ({ 
        title, 
        data // ✅ Não precisa criar cópia - Map já cria novo array
      }));

    const groupingTime = getPerformanceNow() - startTime;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(`⏱️ [Performance] Agrupamento por letras em ${groupingTime.toFixed(2)}ms (${sections.length} seções)`);
    }

    return sections;
  }, [filteredClients]);

  // ✅ Handler estável - recebe cliente diretamente
  const handleClientPress = useCallback((client: ClientWithCache) => {
    navigation.navigate("ClientDetail", { client });
  }, [navigation]);

  // ✅ Cache de handlers por cliente ID (evita criar funções a cada render)
  const handlersCacheRef = useRef<Map<number, () => void>>(new Map());
  
  // ✅ Factory para criar handler estável por item (usa cache)
  const getItemPressHandler = useCallback((client: ClientWithCache) => {
    if (!client.id) {
      // Fallback para clientes sem ID
      return () => handleClientPress(client);
    }
    
    // ✅ Usa cache se já existe handler para este cliente
    if (!handlersCacheRef.current.has(client.id)) {
      handlersCacheRef.current.set(client.id, () => handleClientPress(client));
    }
    
    return handlersCacheRef.current.get(client.id)!;
  }, [handleClientPress]);

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
  // ✅ Usa componente memoizado para estabilidade total
  const renderSectionHeader = useCallback(({ section }: { section: SectionData }) => (
    <SectionHeader title={section.title} />
  ), []);

  // 📊 Render Item com métricas (memoizado para evitar re-renders)
  // ✅ Usa cache de handlers (evita criar funções a cada render)
  const renderItem = useCallback(({ item }: { item: ClientWithCache }) => {
    if (__DEV__) {
      renderStartTime.current = getPerformanceNow();
    }
    const component = (
      <ClientCard
        client={item}
        onPress={getItemPressHandler(item)}
      />
    );
    if (__DEV__) {
      const renderTime = getPerformanceNow() - renderStartTime.current;
      if (renderTime > 16) {
        // Log apenas se render demorar mais que 1 frame (16ms)
        console.log(`⏱️ [Performance] Render item ${item.id} em ${renderTime.toFixed(2)}ms`);
      }
    }
    return component;
  }, [getItemPressHandler]);

  // ✅ Handlers de scroll removidos - não são mais necessários
  // A lógica de render silo foi removida para evitar lista piscar/sumir

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

  // ✅ ListEmptyComponent usando componente separado (evita recriação de JSX)
  const listEmptyComponent = useMemo(() => (
    <EmptyState hasSearch={!!debouncedSearch} />
  ), [debouncedSearch]);

  // 🎨 Configuração do StatusBar (padrão Android/iOS)
  useEffect(() => {
    StatusBar.setBarStyle("light-content");
    if (Platform.OS === "android") {
      StatusBar.setBackgroundColor("#0056b3");
    }
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
        {/* ✅ Só mostra skeleton se estiver carregando E não estiver fazendo refresh E não houver clientes */}
        {loading && !refreshing && clients.length === 0 ? (
          <FlatList
            data={Array.from({ length: SKELETON_COUNT })}
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
                onEndReachedThreshold={0.2}
                onEndReached={() => {
                  if (!loadingMore && hasMore && !debouncedSearch) {
                    loadClientsPage();
                  }
                }}
                ListEmptyComponent={listEmptyComponent}
                ListFooterComponent={
                  loadingMore ? (
                    <ActivityIndicator size="small" color="#64748B" style={{ marginVertical: 20 }} />
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
                length: ITEM_HEIGHT,
                offset: ITEM_HEIGHT * index,
                index,
              })}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={21}
              onEndReachedThreshold={0.2}
              onEndReached={() => {
                if (!loadingMore && hasMore && !debouncedSearch) {
                  loadClientsPage();
                }
              }}
              renderItem={renderItem}
              ListEmptyComponent={listEmptyComponent}
              ListFooterComponent={
                loadingMore ? (
                  <ActivityIndicator size="small" color="#64748B" style={{ marginVertical: 20 }} />
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