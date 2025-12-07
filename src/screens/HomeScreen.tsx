import React, { useState, useCallback, useLayoutEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Text,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getAllClients } from "../database/repositories/clientsRepo";
import { formatDateBR } from "../utils/formatDate";
import HomeContent from "../components/HomeContent";
import { useAuth } from "../contexts/AuthContext";
import { startRealtimeSync } from "../services/syncService";

export default function HomeScreen() {
  const navigation: any = useNavigation();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [totalClients, setTotalClients] = useState(0);

  // ✅ Ref para armazenar função de unsubscribe do listener
  const syncUnsubscribe = useRef<(() => void) | null>(null);
  // ✅ Ref para impedir chamadas duplicadas de sincronização
  const syncRunning = useRef(false);
  // ✅ Ref para rastrear o último UID usado (evita reiniciar sync com mesmo usuário)
  const lastSyncUserId = useRef<string | null>(null);

  // Data formatada estilo "Terça, 12 de Janeiro"
  const formattedDate = new Date()
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/^\w/, (c) => c.toUpperCase());

  // 🚪 Logout
  const handleLogout = () => {
    Alert.alert(
      "Sair",
      "Deseja realmente sair da conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              // ✅ Para o listener antes de fazer logout
              if (syncUnsubscribe.current) {
                syncUnsubscribe.current();
                syncUnsubscribe.current = null;
              }
              await logout();
            } catch (error) {
              Alert.alert("Erro", "Falha ao fazer logout");
            }
          },
        },
      ]
    );
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  // ✅ Inicialização: Carrega dados + Inicia listener automático
  React.useEffect(() => {
    const currentUid = user?.uid || null;
    
    // ✅ Se não há usuário, para sincronização se estiver ativa
    if (!user) {
      // ✅ Só parar se realmente havia um usuário antes (mudança de uid → null)
      if (lastSyncUserId.current !== null && syncUnsubscribe.current) {
        console.log("🛑 Parando sincronização automática (usuário deslogado)...");
        syncUnsubscribe.current();
        syncUnsubscribe.current = null;
        syncRunning.current = false;
        lastSyncUserId.current = null;
      }
      return;
    }

    // ✅ Ignorar se o UID não mudou (evita reiniciar sync sem necessidade)
    if (currentUid === lastSyncUserId.current) {
      console.log("⚠️ UID não mudou, mantendo sincronização ativa.");
      return;
    }

    // ✅ Se o UID mudou (de null → uid ou de uid1 → uid2), reiniciar sync
    // Primeiro, parar sync anterior se existir
    if (syncUnsubscribe.current && lastSyncUserId.current !== null) {
      console.log("🛑 Parando sincronização anterior (mudança de usuário)...");
      syncUnsubscribe.current();
      syncUnsubscribe.current = null;
      syncRunning.current = false;
    }

    // ✅ Atualizar último UID antes de iniciar nova sync
    lastSyncUserId.current = currentUid;

    // ✅ Garantir que a sincronização é iniciada apenas uma vez para este UID
    if (!syncRunning.current) {
      // 1️⃣ Carrega dados locais imediatamente
      loadData();

      // 2️⃣ Inicia sincronização automática em tempo real
      // ✅ A função startRealtimeSync já tem proteção interna contra duplicatas
      console.log("🚀 Iniciando sincronização automática...");
      syncUnsubscribe.current = startRealtimeSync(user.uid, () => {
        // Callback executado quando há mudanças remotas
        loadData(); // Recarrega dados do SQLite
      });

      syncRunning.current = true;
    }

    // 3️⃣ Cleanup: Para o listener apenas ao desmontar componente
    // ✅ NÃO parar sync no cleanup se o UID não mudou (evita parar sync desnecessariamente)
    // O cleanup do React executa quando:
    // - Componente desmonta (aí sim precisa parar)
    // - Dependências mudam (mas já tratamos isso acima com verificação de UID)
    return () => {
      // ✅ Cleanup: só parar se componente está desmontando (user será null/undefined)
      // Se user ainda existe, não parar (pode ser apenas re-render)
      // A verificação de UID acima já previne reiniciar sync desnecessariamente
      if (syncUnsubscribe.current && !user) {
        console.log("🛑 Parando sincronização automática (componente desmontando)...");
        syncUnsubscribe.current();
        syncUnsubscribe.current = null;
        syncRunning.current = false;
        lastSyncUserId.current = null;
      }
    };
  }, [user]);

  // 🔄 Carrega dados do SQLite local
  const loadData = useCallback(async () => {
    try {
      const clients = await getAllClients();

      // ✅ Filtra clientes com data de hoje (comparando formato ISO do banco)
      // O banco armazena em ISO (yyyy-mm-dd), então comparamos diretamente
      const todayISO = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
      const todayCount = clients.filter((c) => {
        if (!c.next_charge) return false;
        // ✅ Compara formato ISO (banco armazena assim)
        return c.next_charge === todayISO;
      }).length;

      setTodayCount(todayCount);
      setTotalClients(clients.length);
    } catch (error) {
      console.error("Erro ao carregar home:", error);
    }
  }, []);

  // 🔁 Recarrega ao focar (sem necessidade de verificar sync inicial)
  useFocusEffect(
    useCallback(() => {
      loadData();
      return () => {};
    }, [loadData])
  );

  // 🔃 Pull to Refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Abrir lista do dia
  const handleOpenTodayCharges = () => {
    // ✅ Converte ISO para pt-BR apenas para navegação (a tela ClientsByDate espera pt-BR)
    const todayISO = new Date().toISOString().slice(0, 10);
    const todayBR = formatDateBR(todayISO);
    navigation.navigate("ClientsByDate", { date: todayBR });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />

      <View style={styles.headerExtension} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0056b3"]}
            tintColor="#0056b3"
            progressViewOffset={60}
          />
        }
      >
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Olá, {user?.email?.split("@")[0] || "Usuário"} 👋
          </Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        <View style={styles.mainCard}>
          <HomeContent
            navigation={navigation}
            todayCount={todayCount}
            totalClients={totalClients}
            onPressHoje={handleOpenTodayCharges}
            onLogout={handleLogout}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },

  headerExtension: {
    height: 90,
    backgroundColor: "#0056b3",
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    zIndex: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  welcomeContainer: {
    marginTop: 8,
    marginBottom: 35,
    zIndex: 1,
  },

  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFF",
  },

  dateText: {
    fontSize: 14,
    color: "#BFDBFE",
    marginTop: 4,
  },

  mainCard: {
    flex: 1,
  },
});