import React, { useEffect, useState, useMemo, useLayoutEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Alert,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

import {
  getPaymentsByClient,
  deletePayment,
  getClientById,
  Client,
  Payment,
} from "../database/db";

import { formatCurrency } from "../utils/formatCurrency";
import { formatDateBR } from "../utils/formatDate";
import { saveClient } from "../services/syncService";
import { useAuth } from "../contexts/AuthContext";

// 📌 Formata: "2025-01-15T18:32:10.123Z" → "janeiro de 2025"
const formatMonth = (iso: string) => {
  const date = new Date(iso);
  const month = date.toLocaleDateString("pt-BR", { month: "long" });
  const year = date.getFullYear();
  return `${month} de ${year}`;
};

// ✅ Tipagem correta dos params da rota
type RouteParams = {
  clientId: number;
};

export default function PaymentHistoryScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { clientId } = (route.params as RouteParams) || { clientId: 0 };
  const { user } = useAuth();

  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // ✅ Animações de fade out para itens sendo removidos
  const animatingItems = useRef<Map<number, Animated.Value>>(new Map());
  // ✅ Flag para prevenir race condition em exclusões simultâneas
  const deletingItems = useRef<Set<number>>(new Set());

  // 🎨 Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Histórico Financeiro",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  // 🔄 Função para carregar dados (extraída para reutilização)
  const loadData = useCallback(async () => {
    try {
      const c = await getClientById(clientId);
      setClient(c);

      // ✅ Garante que sempre retorna um array, mesmo se getPaymentsByClient retornar undefined/null
      const rawList = await getPaymentsByClient(clientId);
      const list = Array.isArray(rawList) ? rawList : [];

        // ✅ Ordenar por data DESC (faz cópia para não mutar o array original)
        // ✅ Valida created_at antes de ordenar
        const sortedList = list.length > 0
          ? [...list].sort((a, b) => {
              const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return dateB - dateA; // DESC
            })
          : [];

      setPayments(sortedList);
    } catch (error) {
      console.error("Erro ao carregar pagamentos:", error);
      // ✅ Em caso de erro, define array vazio para não quebrar a tela
      setPayments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  // 🔄 Carrega dados inicial
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      await loadData();
      if (!isMounted) {
        // Se desmontou durante o load, não atualiza estado
        return;
      }
    };

    load();

    // ✅ Cleanup: marca como desmontado para evitar setState após desmontagem
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // 🔄 Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // 🧩 Agrupa por mês - formato para SectionList
  const sections = useMemo(() => {
    // ✅ Garante que payments seja sempre um array válido
    const safePayments = Array.isArray(payments) ? payments : [];

    const groups: Record<string, Payment[]> = {};

    safePayments.forEach((p) => {
      // ✅ Verifica se o pagamento tem created_at antes de formatar
      if (p && p.created_at) {
        const key = formatMonth(p.created_at);
        if (!groups[key]) groups[key] = [];
        groups[key].push(p);
      }
    });

    // ✅ Formato para SectionList: array de objetos com title e data
    return Object.entries(groups).map(([month, items]) => ({
      title: month.toUpperCase(),
      data: items,
    }));
  }, [payments]);

  // 🗑️ Excluir registro - memoizado para evitar recriação
  const handleDelete = useCallback((payment: Payment) => {
    if (!client) return;

    // ✅ Validação segura do ID antes de prosseguir
    if (!payment.id) {
      Alert.alert("Erro", "ID do pagamento inválido.");
      return;
    }

    Alert.alert(
      "Excluir Pagamento",
      `Deseja remover ${formatCurrency(payment.valor)}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!user?.uid || !client || !client.id || !payment.id) return;

            // ✅ Previne race condition: verifica se já está sendo deletado
            if (deletingItems.current.has(payment.id)) {
              return; // Já está sendo processado, ignora
            }

            // ✅ Marca como sendo deletado
            deletingItems.current.add(payment.id);

            try {
              // ✅ 1. Obtém animação existente ou cria nova
              let fadeAnim = animatingItems.current.get(payment.id);
              if (!fadeAnim) {
                fadeAnim = new Animated.Value(1);
                animatingItems.current.set(payment.id, fadeAnim);
              }

              // ✅ 2. Anima fade out antes de deletar
              Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }).start(async () => {
                try {
                  // ✅ 3. Remove pagamento do banco (após animação)
                  await deletePayment(payment.id);

                  // ✅ 4. Atualiza cliente com novo valor pago
                  const updated = {
                    ...client,
                    paid: (client.paid || 0) - payment.valor,
                  };

                  // ✅ 5. Sincroniza com Firestore
                  await saveClient(user.uid, updated);

                  // ✅ 6. CRÍTICO: Recarrega do banco para garantir dados atualizados
                  const freshClient = await getClientById(client.id);
                  if (freshClient) {
                    setClient(freshClient);
                  }

                  // ✅ 7. Remove da lista local e limpa animação
                  setPayments((prev) => prev.filter((p) => p.id !== payment.id));
                  animatingItems.current.delete(payment.id);
                } catch (innerError) {
                  console.error("❌ Erro ao processar exclusão:", innerError);
                  Alert.alert("Erro", "Não foi possível excluir o pagamento.");
                } finally {
                  // ✅ Sempre remove da flag de exclusão
                  deletingItems.current.delete(payment.id);
                }
              });
            } catch (e) {
              console.error("❌ Erro ao excluir pagamento:", e);
              Alert.alert("Erro", "Não foi possível excluir.");
              // Limpa animação e flag em caso de erro
              if (payment.id) {
                animatingItems.current.delete(payment.id);
                deletingItems.current.delete(payment.id);
              }
            }
          },
        },
      ]
    );
  }, [client, user?.uid]);

  // ✅ Sincroniza animações com os payments (cria/remove conforme necessário)
  useEffect(() => {
    // ✅ Cria animações para novos payments
    payments.forEach((p) => {
      if (p.id && !animatingItems.current.has(p.id)) {
        animatingItems.current.set(p.id, new Animated.Value(1));
      }
    });

    // ✅ Remove animações de payments que não existem mais (excluídos por outras rotas/sincronizações)
    const currentIds = new Set(payments.map((p) => p.id).filter((id): id is number => id !== undefined));
    animatingItems.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        // ✅ Limpa animação que não está mais sendo usada
        animatingItems.current.delete(id);
      }
    });
  }, [payments]);

  // ✅ Cleanup: Limpa todas as animações e flags quando o componente desmonta
  useEffect(() => {
    return () => {
      // ✅ Limpa todas as referências de animações ao desmontar
      animatingItems.current.clear();
      // ✅ Limpa flags de exclusão
      deletingItems.current.clear();
    };
  }, []);

  // 📌 Render individual da timeline - memoizado para evitar re-renders desnecessários
  const renderPaymentItem = useCallback((payment: Payment, index: number, total: number) => {
    const isLast = index === total - 1;

    // ✅ Obtém animação do item (deve existir devido ao useEffect de sincronização)
    if (!payment.id) return null;

    const fadeAnim = animatingItems.current.get(payment.id);
    // ✅ Se animação não existir, retorna null (não deveria acontecer devido ao useEffect)
    if (!fadeAnim) return null;

    return (
      <Animated.View
        style={[
          s.timelineRow,
          { opacity: fadeAnim }
        ]}
      >
        {/* Timeline */}
        <View style={s.timelineCol}>
          <View style={[s.line, isLast && s.lineHidden]} />
          <View style={s.dotContainer}>
            <View style={s.dot} />
          </View>
        </View>

        {/* Card */}
        <View style={s.cardContainer}>
          <View style={s.card}>
            <View style={{ flex: 1 }}>
              <Text style={s.amountText}>{formatCurrency(payment.valor)}</Text>
              <View style={s.dateRow}>
                <Icon
                  name="calendar-outline"
                  size={12}
                  color="#94A3B8"
                  style={{ marginRight: 4 }}
                />
                <Text style={s.dateText}>{formatDateBR(payment.created_at)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => handleDelete(payment)}
              style={s.deleteBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    );
  }, [handleDelete]);

  if (loading)
    return <ActivityIndicator size="large" color="#0056b3" style={{ flex: 1 }} />;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />

      {/* Barra info */}
      <View style={s.infoBar}>
        <Text style={s.infoText}>
          Extrato de <Text style={{ fontWeight: "bold" }}>{client?.name}</Text>
        </Text>

        <View style={s.badge}>
          <Text style={s.badgeText}>{payments.length} lançamentos</Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id || index}-${item.created_at}`}
        contentContainerStyle={s.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        renderSectionHeader={({ section }) => (
          <View style={s.monthBlock}>
            <Text style={s.monthTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item, index, section }) =>
          renderPaymentItem(item, index, section.data.length)
        }
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.iconCircle}>
              <Icon name="wallet-outline" size={40} color="#94A3B8" />
            </View>

            <Text style={s.emptyTitle}>Nenhum pagamento</Text>
            <Text style={s.emptySub}>
              Os pagamentos registrados aparecerão aqui.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// 🎨 Estilos — MANTIDOS IGUAIS
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },

  infoBar: {
    backgroundColor: "#E2E8F0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  infoText: { color: "#475569", fontSize: 13 },
  badge: {
    backgroundColor: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#0056b3" },

  listContent: { padding: 20, paddingBottom: 40 },

  monthBlock: { marginBottom: 24 },
  monthTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 12,
    marginLeft: 8,
    letterSpacing: 0.5,
  },

  timelineRow: { flexDirection: "row", minHeight: 65 }, // ← reduzido!
  timelineCol: { width: 30, alignItems: "center" },

  line: {
    width: 2,
    backgroundColor: "#E2E8F0",
    position: "absolute",
    top: 14,
    bottom: -14,
    left: 14,
  },
  lineHidden: { display: "none" },

  dotContainer: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#16A34A",
    borderWidth: 2,
    borderColor: "#FFF",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  cardContainer: { flex: 1, paddingBottom: 8, paddingLeft: 10 },

  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  amountText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#16A34A",
    marginBottom: 4,
  },
  dateRow: { flexDirection: "row", alignItems: "center" },
  dateText: { fontSize: 13, color: "#94A3B8" },

  deleteBtn: {
    padding: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
  },
  iconCircle: {
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
  emptySub: { fontSize: 14, color: "#94A3B8" },
});
