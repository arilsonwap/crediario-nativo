import React, { useState, useCallback, useLayoutEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getUpcomingCharges } from "../database/db";
import HomeContent from "../components/HomeContent";
import { useAuth } from "../contexts/AuthContext";
import { fullSync } from "../services/syncService";

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
  const [syncing, setSyncing] = useState(false);

  // Data formatada estilo "Terça, 12 de Janeiro"
  const formattedDate = new Date()
    .toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
    .replace(/^\w/, (c) => c.toUpperCase());

  // 🔄 Sincronização com Firebase
  const handleSync = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      await fullSync(user.uid);
      Alert.alert("Sucesso", "Dados sincronizados com sucesso!");
    } catch (error: any) {
      Alert.alert("Erro", "Falha ao sincronizar dados: " + error.message);
    } finally {
      setSyncing(false);
    }
  };

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

  // 🔄 Carrega dados
  const loadData = useCallback(async () => {
    try {
      const clients = await getUpcomingCharges();
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

  // 🔁 Recarrega ao focar
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
            onSync={handleSync}
            syncing={syncing}
            onLogout={handleLogout}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // 🔵 Container principal da tela
  root: {
    flex: 1,                    // Ocupa toda a tela disponível
    backgroundColor: "#F1F5F9", // Cor de fundo cinza claro
  },

  // 🔵 Faixa azul decorativa no topo da tela
  //    Esta é a parte azul atrás do cabeçalho e texto de boas-vindas
  headerExtension: {
    height: 115,                // ALTURA DA FAIXA AZUL (ajustável)
    backgroundColor: "#0056b3", // Cor azul primária
    position: "absolute",       // Posicionamento fixo independente do scroll
    left: 0,                    // Começa na borda esquerda da tela
    right: 0,                   // Estende até a borda direita
    top: 0,                     // Colado no topo da tela
    zIndex: 0,                  // Fica ATRÁS do conteúdo (camada inferior)
    borderBottomLeftRadius: 24, // Arredonda canto inferior esquerdo
    borderBottomRightRadius: 24,// Arredonda canto inferior direito
  },

  // 🔵 Conteúdo rolável da página
  scrollContent: {
    flexGrow: 1,                // Permite expandir para conteúdo maior que a tela
    paddingHorizontal: 20,      // Espaço lateral de 20px
    paddingTop: 10,             // Espaço acima do conteúdo (não afeta a faixa azul)
  },

  // 🔵 Container do texto "Olá, Usuário 👋" e data
  //    Fica posicionado DENTRO da área azul
  welcomeContainer: {
    marginTop: 40,              // DISTÂNCIA DO TOPO DA TELA até o texto
    marginBottom: 25,           // ESPAÇO entre o texto e o card branco abaixo
    zIndex: 1,                  // Fica NA FRENTE da faixa azul (camada superior)
  },

  // 🔵 Texto principal de boas-vindas
  welcomeText: {
    fontSize: 22,               // Tamanho grande para destaque
    fontWeight: "bold",         // Negrito
    color: "#FFF",              // Branco para contraste com fundo azul
  },

  // 🔵 Texto da data abaixo da boas-vindas
  dateText: {
    fontSize: 14,               // Tamanho menor que o título
    color: "#BFDBFE",           // Azul claro para contraste sutil
    marginTop: 4,               // Pequeno espaço acima da data
  },

  // 🔵 Container do conteúdo principal (onde fica HomeContent)
  mainCard: {
    flex: 1,                    // Ocupa o espaço restante da tela
  },
});
