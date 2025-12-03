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
import { getAllClients } from "../database/db";
import HomeContent from "../components/HomeContent";
import { useAuth } from "../contexts/AuthContext";
import { startRealtimeSync, initialMigrationToFirestore } from "../services/syncService";

// 🔹 Função central para transformar Date → DD/MM/YYYY
const formatDDMMYYYY = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;

export default function HomeScreen() {
  const navigation: any = useNavigation();
  const { user, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [todayCount, setTodayCount] = useState(0);

  // ✅ Ref para armazenar função de unsubscribe do listener
  const syncUnsubscribe = useRef<(() => void) | null>(null);

  // ✅ Ref para garantir que migração inicial rode apenas uma vez
  const migrationDone = useRef(false);

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
              migrationDone.current = false;
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
    if (!user) return;

    // 1️⃣ Carrega dados locais imediatamente
    loadData();

    // 2️⃣ Inicia sincronização automática em tempo real
    syncUnsubscribe.current = startRealtimeSync(user.uid, () => {
      // Callback executado quando há mudanças remotas
      loadData(); // Recarrega dados do SQLite
    });

    // 3️⃣ Migração inicial (APENAS UMA VEZ - REMOVER APÓS PRIMEIRA EXECUÇÃO)
    if (!migrationDone.current) {
      migrationDone.current = true;
      initialMigrationToFirestore(user.uid).catch((error) => {
        console.error("❌ Erro na migração inicial:", error);
      });
    }

    // 4️⃣ Cleanup: Para o listener ao desmontar componente
    return () => {
      if (syncUnsubscribe.current) {
        console.log("🛑 Parando sincronização automática...");
        syncUnsubscribe.current();
        syncUnsubscribe.current = null;
      }
    };
  }, [user]);

  // 🔄 Carrega dados do SQLite local
  const loadData = useCallback(async () => {
    try {
      const clients = await getAllClients();
      const todayStr = formatDDMMYYYY(new Date());

      // Normalização totalmente segura
      const fixed = clients.map((c) => {
        let raw = c.next_charge || "";
        let formatted = raw;

        // caso esteja em formato ISO (2025-01-09)
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
          const [y, m, d] = raw.split("-");
          formatted = `${d}/${m}/${y}`;
        }

        return { ...c, next_charge: formatted };
      });

      setTodayCount(fixed.filter((c) => c.next_charge === todayStr).length);
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
    const todayStr = formatDDMMYYYY(new Date());
    navigation.navigate("ClientsByDate", { date: todayStr });
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
    marginTop: 12,
    marginBottom: 25,
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