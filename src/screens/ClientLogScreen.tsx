import React, { useEffect, useState, useCallback, useLayoutEffect, useRef } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect, RouteProp } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { getLogsByClient, getClientById, Log, Client } from "../database/db";

// ✅ Tipagem correta para route params
type RouteParams = {
  clientId: number;
};

// ✅ Tipo para logs válidos (garante campos obrigatórios)
type ValidLog = Log & {
  id: number;
  created_at: string;
  descricao: string;
};

type LogSection = {
  title: string;
  data: ValidLog[];
};

// ✅ Constantes extraídas
const MONTH_NAMES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
] as const;

// ✅ Funções utilitárias para eliminar lógica repetida
const isValidLog = (log: Log | null | undefined): log is ValidLog => {
  return !!(
    log &&
    typeof log.id === 'number' &&
    typeof log.created_at === 'string' &&
    log.created_at.length > 0 &&
    typeof log.descricao === 'string' &&
    log.descricao.length > 0
  );
};

// ✅ Fallback para logs sem created_at válido (proteção extra)
const getLogDate = (log: ValidLog): Date => {
  try {
    const date = new Date(log.created_at);
    // ✅ Verifica se a data é válida
    if (isNaN(date.getTime())) {
      console.warn(`Data inválida para log ${log.id}: ${log.created_at}`);
      return new Date(); // Fallback: data atual
    }
    return date;
  } catch {
    console.warn(`Erro ao parsear data do log ${log.id}: ${log.created_at}`);
    return new Date(); // Fallback: data atual
  }
};

const getLogMonthKey = (date: Date): string => {
  try {
    const month = date.getMonth();
    const year = date.getFullYear();
    // ✅ Validação de índice do mês
    if (month < 0 || month >= MONTH_NAMES.length) {
      return `${MONTH_NAMES[0]} ${year}`; // Fallback: Janeiro
    }
    return `${MONTH_NAMES[month]} ${year}`;
  } catch {
    const now = new Date();
    return `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;
  }
};

const sortLogsByDate = (logs: ValidLog[]): ValidLog[] => {
  return [...logs].sort((a, b) => {
    try {
      const dateA = getLogDate(a).getTime();
      const dateB = getLogDate(b).getTime();
      // ✅ Fallback: se alguma data for inválida, mantém ordem original
      if (isNaN(dateA) || isNaN(dateB)) {
        return 0; // Mantém ordem original
      }
      return dateB - dateA; // DESC (mais recente primeiro)
    } catch {
      // ✅ Fallback: em caso de erro, mantém ordem original
      return 0;
    }
  });
};

const groupLogsByMonth = (logs: ValidLog[]): LogSection[] => {
  const grouped: Record<string, ValidLog[]> = {};

  logs.forEach((log) => {
    const date = getLogDate(log);
    const key = getLogMonthKey(date);
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(log);
  });

  return Object.keys(grouped).map((month) => ({
    title: month,
    data: grouped[month],
  }));
};

// ✅ Função utilitária: protege contra bancos que retornem objeto em vez de array
// Blindagem máxima contra edge cases onde o banco retorna { id:1, descricao:"..." } em vez de [{ id:1, descricao:"..." }]
const safeArray = <T,>(value: any): T[] => {
  return Array.isArray(value) ? value : [];
};

const processLogs = (rawLogs: Log[] | null | undefined): LogSection[] => {
  // ✅ Proteção extra: garantir que rawLogs é um array (protege contra objeto isolado)
  const safeLogs = safeArray<Log>(rawLogs);

  // ✅ Retornar imediatamente se array estiver vazio
  // Evita CPU fazendo .filter() em arrays vazios
  if (safeLogs.length === 0) {
    return [];
  }

  // ✅ Filtrar e validar logs de uma vez
  const validLogs = safeLogs.filter(isValidLog);

  if (validLogs.length === 0) {
    return [];
  }

  // ✅ Ordenar e agrupar
  const sorted = sortLogsByDate(validLogs);
  return groupLogsByMonth(sorted);
};

// ✅ Extrair e validar clientId de forma segura
const getClientIdFromParams = (params: RouteParams | undefined): number => {
  if (params && typeof params.clientId === 'number' && params.clientId > 0) {
    return params.clientId;
  }
  return 0;
};

export default function ClientLogScreen() {
  // ✅ Tipagem corrigida: params pode ser undefined (render inicial, deep link, stack restore)
  const route = useRoute<RouteProp<{ ClientLog: RouteParams | undefined }, 'ClientLog'>>();
  const navigation = useNavigation<any>();
  // ✅ Resolver na raiz: validação segura do clientId (já trata undefined)
  const clientId = getClientIdFromParams(route.params);

  const [groupedLogs, setGroupedLogs] = useState<LogSection[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isMountedRef = useRef(true);

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Histórico de Atividades",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  const loadData = useCallback(async () => {
    // ✅ Validação inicial: se clientId inválido, não carrega
    if (!clientId || clientId <= 0) {
      if (isMountedRef.current) {
        setGroupedLogs([]);
        setLoading(false);
        setRefreshing(false);
      }
      return;
    }

    try {
      setLoading(true);

      // ✅ Carregar cliente e logs em paralelo (melhor performance)
      const [c, rawLogs] = await Promise.all([
        getClientById(clientId),
        getLogsByClient(clientId),
      ]);

      if (!isMountedRef.current) return;

      setClient(c);

      // ✅ Usar safeArray para blindagem máxima contra objetos isolados
      const safeLogs = safeArray<Log>(rawLogs);

      // ✅ Processar logs usando função utilitária (elimina lógica repetida)
      const processedLogs = processLogs(safeLogs);
      setGroupedLogs(processedLogs);
    } catch (error) {
      console.error("Erro ao carregar logs:", error);
      if (isMountedRef.current) {
        setGroupedLogs([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [clientId]);

  // ✅ Cleanup para prevenir memory leaks
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ✅ Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // 🔹 Componente memoizado para evitar re-renders desnecessários
  // ✅ React.memo previne re-render quando props não mudam
  const LogItem = React.memo<{ log: ValidLog; index: number; total: number }>(
    ({ log, index, total }) => {
      const isLast = index === total - 1;
      const dateObj = getLogDate(log);
      const timeString = dateObj.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
      const dateString = dateObj.toLocaleDateString("pt-BR");

      // 📝 Separar a descrição em linhas se houver múltiplas linhas
      const descLines = log.descricao.split('\n');
      const mainDesc = descLines[0];
      const details = descLines.slice(1).filter(line => line.trim());

      return (
        <View style={s.logRow}>
          {/* Coluna da Timeline (Esquerda) */}
          <View style={s.timelineCol}>
            <View style={[s.line, isLast && s.lineHidden]} />
            <View style={s.dotContainer}>
              <View style={s.dot} />
            </View>
          </View>

          {/* Card de Conteúdo (Direita) */}
          <View style={s.cardContainer}>
            <View style={s.card}>
              <Text style={s.desc}>{mainDesc}</Text>
              {details.length > 0 && (
                <View style={s.detailsContainer}>
                  {details.map((detail, idx) => (
                    <View key={idx} style={s.detailRow}>
                      <View style={s.detailBullet} />
                      <Text style={s.detailText}>{detail.trim()}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={s.footerRow}>
                <Icon name="time-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
                <Text style={s.dateText}>{dateString} às {timeString}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    },
    // ✅ Comparação customizada otimizada: compara apenas dados do log
    // ❌ NÃO compara index e total (mudam durante scroll, causando re-renders desnecessários)
    (prevProps, nextProps) => {
      return (
        prevProps.log.id === nextProps.log.id &&
        prevProps.log.created_at === nextProps.log.created_at &&
        prevProps.log.descricao === nextProps.log.descricao
      );
    }
  );

  // ✅ Wrapper memoizado para renderItem
  const renderLogItem = useCallback((log: ValidLog, index: number, total: number) => {
    return <LogItem log={log} index={index} total={total} />;
  }, []);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0056b3" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />

      {/* Cabeçalho Fixo Informativo */}
      <View style={s.infoBar}>
        <Text style={s.infoText}>
          Visualizando histórico de <Text style={{fontWeight: 'bold'}}>{client?.name}</Text>
        </Text>
      </View>

      <SectionList
        sections={groupedLogs}
        // ✅ keyExtractor seguro e estável - evita warnings e re-renders
        keyExtractor={(item, index) => {
          // ✅ Garante que sempre retorna uma string única e estável
          // Como ValidLog garante id e created_at, este caso é raro, mas protege contra edge cases
          if (item.id && item.created_at) {
            return `log-${item.id}-${item.created_at}`;
          }
          // ✅ Fallback estável usando index (não usa Date.now() para evitar mudanças)
          return `log-fallback-${index}`;
        }}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        // ✅ Otimizações de performance para listas grandes
        initialNumToRender={20}
        windowSize={10}
        maxToRenderPerBatch={20}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderSectionHeader={({ section }) => (
          <View style={s.monthBlock}>
            <View style={s.monthHeader}>
              <Text style={s.monthTitle}>{section.title}</Text>
            </View>
          </View>
        )}
        renderItem={({ item, index, section }) =>
          renderLogItem(item, index, section.data.length)
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.iconCircle}>
              <Icon name="document-text-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={s.emptyTitle}>Nenhum log encontrado</Text>
            <Text style={s.emptySub}>Nenhum log encontrado para este cliente.</Text>
          </View>
        }
      />
    </View>
  );
}

// 🎨 Estilos Enterprise
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F1F5F9" },

  infoBar: {
    backgroundColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  infoText: { color: "#475569", fontSize: 13 },

  listContent: { padding: 20, paddingBottom: 40 },

  // Blocos de Mês
  monthBlock: { marginBottom: 24 },
  monthHeader: { marginBottom: 12, paddingLeft: 8 },
  monthTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Timeline Row
  logRow: {
    flexDirection: "row",
    minHeight: 70, // Altura mínima para o card não ficar espremido
  },

  // Coluna da Linha e Bolinha
  timelineCol: {
    width: 30,
    alignItems: "center",
  },
  line: {
    width: 2,
    backgroundColor: "#E2E8F0",
    position: "absolute",
    top: 14, // Começa no meio da bolinha
    bottom: -14, // Vai até a próxima bolinha
    left: 14, // Centralizado no width 30
    zIndex: 0,
  },
  lineHidden: {
    display: 'none' // Esconde a linha no último item do mês
  },
  dotContainer: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Fica acima da linha
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFF",
    borderWidth: 2,
    borderColor: "#0056b3",
  },

  // Card Content
  cardContainer: {
    flex: 1,
    paddingBottom: 16,
    paddingLeft: 10,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  desc: {
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    lineHeight: 22,
  },
  detailsContainer: {
    marginTop: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  detailBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#0056b3",
    marginTop: 6,
    marginRight: 8,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
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
});