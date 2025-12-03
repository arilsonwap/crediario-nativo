import React, { useEffect, useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { useRoute, useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getLogsByClient, getClientById, Log, Client } from "../database/db";

export default function ClientLogScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { clientId } = route.params as { clientId: number };

  const [groupedLogs, setGroupedLogs] = useState<any[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const monthNames = [
    "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
    "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"
  ];

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Histórico de Atividades",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  const loadData = useCallback(() => {
    try {
      setLoading(true);
      const c = getClientById(clientId);
      const logs = getLogsByClient(clientId);

      setClient(c);

      // 🔄 Ordenar: mais recente primeiro
      const sorted = [...logs].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // 📌 Agrupar por Mês/Ano
      const grouped: any = {};
      sorted.forEach((log) => {
        const d = new Date(log.created_at);
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(log);
      });

      const finalList = Object.keys(grouped).map((month) => ({
        month,
        data: grouped[month],
      }));

      setGroupedLogs(finalList);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // 🔹 Renderiza um item individual da timeline
  const renderLogItem = (log: Log, index: number, total: number) => {
    const isLast = index === total - 1;
    const dateObj = new Date(log.created_at);
    const timeString = dateObj.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' });
    const dateString = dateObj.toLocaleDateString("pt-BR");

    return (
      <View style={s.logRow} key={log.id}>
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
            <Text style={s.desc}>{log.descricao}</Text>
            <View style={s.footerRow}>
              <Ionicons name="time-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={s.dateText}>{dateString} às {timeString}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

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

      <FlatList
        data={groupedLogs}
        keyExtractor={(item) => item.month}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={s.monthBlock}>
            <View style={s.monthHeader}>
              <Text style={s.monthTitle}>{item.month}</Text>
            </View>
            {item.data.map((log: Log, index: number) => 
              renderLogItem(log, index, item.data.length)
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={s.emptyContainer}>
            <View style={s.iconCircle}>
              <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
            </View>
            <Text style={s.emptyTitle}>Nenhum registro</Text>
            <Text style={s.emptySub}>As alterações neste cliente aparecerão aqui.</Text>
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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