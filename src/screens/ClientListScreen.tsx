import React, { useState, useCallback, useMemo, useLayoutEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Alert,
  Pressable,
  StyleSheet,
  StatusBar,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/Ionicons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getAllClients, Client } from "../database/db";
import ClientCard from "../components/ClientCard";

const ClientListScreen = ({ navigation }: any) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");

  const nav = useNavigation<any>();

  // 🔄 Carregar clientes do banco
  const loadClients = useCallback(async () => {
    try {
      // Simulando delay para ver loading se necessário, ou chamada direta
      const data = await getAllClients(); 
      setClients(data);
    } catch (error) {
      console.error("❌ Erro ao carregar clientes:", error);
      Alert.alert("Erro", "Não foi possível carregar os clientes");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadClients();
    }, [loadClients])
  );

  // 🎨 Configuração do Header
  useLayoutEffect(() => {
    nav.setOptions({
      headerTitle: "Meus Clientes",
      headerStyle: { 
        backgroundColor: "#0056b3", // Azul um pouco mais sóbrio
        elevation: 0, // Remove sombra no Android para fundir com gradiente se quiser
        shadowOpacity: 0 // Remove sombra no iOS
      }, 
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700", fontSize: 18 },
      headerRight: () => (
        <View style={{ paddingRight: 15 }}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', opacity: 0.8 }}>
            {clients.length}
          </Text>
        </View>
      )
    });
  }, [nav, clients.length]);

  // ✅ Função para normalizar texto (remove acentos)
  const normalize = (text: string) =>
    (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 🔍 Filtro Otimizado com normalização de acentos
  const filteredClients = useMemo(() => {
    const text = normalize(search);
    return clients.filter((c) => 
      normalize(c.name || "").includes(text) ||
      normalize(c.bairro || "").includes(text) ||
      normalize(c.numero || "").includes(text) ||
      normalize(c.referencia || "").includes(text) ||
      normalize(c.telefone || "").includes(text)
    );
  }, [search, clients]);

  const handleClientPress = useCallback((client: Client) => {
    navigation.navigate("ClientDetail", { client });
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
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

        {/* 📋 Lista */}
        <FlatList
          data={filteredClients}
          keyExtractor={(item) => item.id?.toString() ?? `client-${item.name}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          // ✅ Otimizações de performance para listas grandes
          getItemLayout={(_, index) => ({
            length: 130, // Altura aproximada do card (padding + conteúdo + margin)
            offset: 130 * index,
            index,
          })}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={21}
          renderItem={({ item }) => (
            <ClientCard
              client={item}
              onPress={() => handleClientPress(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.iconCircle}>
                <Icon name="people-outline" size={40} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Nenhum cliente encontrado</Text>
              <Text style={styles.emptySub}>
                {search ? "Tente buscar por outro termo." : "Adicione clientes para começar."}
              </Text>
            </View>
          }
        />
      </LinearGradient>
    </View>
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
});

export default ClientListScreen;