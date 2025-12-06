import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";

type Props = {
  navigation: any;
  todayCount: number;
  totalClients?: number; // Nova prop para o total de clientes
  onPressHoje: () => void;
  onLogout?: () => void;
};

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 15) / 2; // Largura responsiva para 2 colunas

export default function HomeContent({ navigation, todayCount, totalClients, onPressHoje, onLogout }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 🔹 Animação do contador
  useEffect(() => {
    if (todayCount > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [todayCount, pulseAnim]);

  return (
    <View style={styles.container}>

      {/* 🚨 HERO CARD: Cobranças Hoje */}
      <TouchableOpacity activeOpacity={0.9} onPress={onPressHoje} style={styles.heroWrapper}>
        <LinearGradient
          colors={todayCount > 0 ? ["#FFF7ED", "#FFEDD5"] : ["#F0FDF4", "#DCFCE7"]}
          style={[styles.heroCard, styles.shadow]}
        >
          <View style={styles.heroContent}>
            <View style={[
              styles.iconCircle,
              { backgroundColor: todayCount > 0 ? "#FDBA74" : "#86EFAC" }
            ]}>
              <Icon
                name={todayCount > 0 ? "alert-outline" : "checkmark-circle-outline"}
                size={32}
                color={todayCount > 0 ? "#C2410C" : "#15803D"}
              />
            </View>

            <View style={styles.heroTextContainer}>
              <Text style={[styles.heroTitle, { color: todayCount > 0 ? "#9A3412" : "#166534" }]}>
                Cobranças de Hoje
              </Text>
              <Text style={styles.heroSubtitle}>
                {todayCount === 0 ? "Tudo em dia!" : `${todayCount} cliente(s) para cobrar.`}
              </Text>
            </View>

            {todayCount > 0 && (
              <Animated.View style={[styles.badge, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.badgeText}>{todayCount}</Text>
              </Animated.View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* 📌 Título: Acesso Rápido */}
      <Text style={styles.sectionTitle}>MENU PRINCIPAL</Text>

      {/* 🔲 GRID DE AÇÕES (4 Itens) */}
      <View style={styles.gridContainer}>
        <MenuCard
          title="Novo Cliente" icon="person-add"
          color="#2563EB" bgColor="#EFF6FF"
          onPress={() => navigation.navigate("AddClient")}
        />
        <MenuCard
          title="Ver Clientes" icon="people"
          color="#059669" bgColor="#ECFDF5"
          onPress={() => navigation.navigate("ClientList")}
          count={totalClients} // Passando o contador de clientes
        />
        <MenuCard
          title="Próx. Cobranças" icon="calendar"
          color="#EA580C" bgColor="#FFF7ED"
          onPress={() => navigation.navigate("UpcomingCharges")}
        />
        <MenuCard
          title="Relatórios" icon="bar-chart"
          color="#7C3AED" bgColor="#F5F3FF"
          onPress={() => navigation.navigate("Reports")}
        />
      </View>

      {/* 📌 Título: Sistema */}
      <View style={styles.dividerBox}>
        <Text style={styles.sectionTitle}>SISTEMA & DADOS</Text>
      </View>

      {/* 📋 LISTA DE SISTEMA (2 Itens - Estilo Unificado) */}
      <View style={styles.systemList}>

        {/* Backup */}
        <SystemCard
          title="Gerenciar Backups"
          subtitle="Backup local e restauração"
          icon="shield-checkmark"
          color="#7C3AED" // Roxo
          bgColor="#F5F3FF"
          onPress={() => navigation.navigate("Backup")}
        />

        {/* Logout */}
        {onLogout && (
          <SystemCard
            title="Sair da Conta"
            subtitle="Fazer logout seguro"
            icon="log-out"
            color="#DC2626" // Vermelho
            bgColor="#FEF2F2"
            onPress={onLogout}
            isDestructive
          />
        )}
      </View>

    </View>
  );
}

// 🧱 Componente: Card do Grid (Quadrado) - MODIFICADO para aceitar contador
const MenuCard = ({ title, icon, color, bgColor, onPress, count }: any) => (
  <TouchableOpacity 
    style={[styles.menuCard, styles.shadow]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIconContainer, { backgroundColor: bgColor }]}>
      <Icon name={icon} size={28} color={color} />
      {/* Badge do contador de clientes */}
      {count !== undefined && (
        <View style={styles.clientCountBadge}>
          <Text style={styles.clientCountText}>{count}</Text>
        </View>
      )}
    </View>
    <Text style={styles.menuTitle}>{title}</Text>
  </TouchableOpacity>
);

// 🧱 Componente: Card de Sistema (Horizontal)
// Agora padronizado com o mesmo raio de borda e sombra do grid
const SystemCard = ({ title, subtitle, icon, color, bgColor, onPress, disabled, isDestructive }: any) => (
  <TouchableOpacity
    style={[styles.systemCard, styles.shadow, disabled && { opacity: 0.7 }]}
    onPress={onPress}
    disabled={disabled}
    activeOpacity={0.7}
  >
    <View style={[styles.miniIcon, { backgroundColor: bgColor }]}>
      <Icon name={icon} size={22} color={color} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.systemTitle, isDestructive && { color: color }]}>{title}</Text>
      <Text style={styles.systemSubtitle}>{subtitle}</Text>
    </View>
    <Icon name="chevron-forward" size={18} color="#CBD5E1" />
  </TouchableOpacity>
);

/* 🎨 Estilos Modernos */
const styles = StyleSheet.create({
  container: { 
    width: "100%",
    paddingBottom: 40
  },

  // Sombra unificada para todos os cards
  shadow: {
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    backgroundColor: "#FFF", // Importante para sombra no Android
  },

  // Hero Card
  heroWrapper: { marginBottom: 24 },
  heroCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)"
  },
  heroContent: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center", marginRight: 16
  },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: 16, fontWeight: "800", marginBottom: 2 },
  heroSubtitle: { fontSize: 13, color: "#64748B" },
  badge: {
    backgroundColor: "#EF4444", width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF"
  },
  badgeText: { color: "#FFF", fontWeight: "bold", fontSize: 12 },

  // Títulos de Seção
  sectionTitle: {
    fontSize: 12, fontWeight: "700", color: "#94A3B8",
    marginBottom: 12, marginLeft: 4, letterSpacing: 0.8, textTransform: "uppercase"
  },
  dividerBox: { marginTop: 10 },

  // GRID (2 colunas)
  gridContainer: {
    flexDirection: "row", flexWrap: "wrap",
    justifyContent: "space-between", gap: 15, marginBottom: 10
  },
  menuCard: {
    width: CARD_WIDTH,
    paddingVertical: 20, paddingHorizontal: 16,
    borderRadius: 20, // 🟡 Raio igual ao do sistema
    alignItems: "center", justifyContent: "center",
    marginBottom: 15,
    position: 'relative',
  },
  menuIconContainer: {
    width: 50, height: 50, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginBottom: 10,
    position: 'relative',
  },
  menuTitle: { fontSize: 14, fontWeight: "600", color: "#334155" },
  
  // Badge para contador de clientes
  clientCountBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  clientCountText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // LISTA SISTEMA (Vertical)
  systemList: { gap: 12 }, // Espaçamento uniforme
  systemCard: {
    width: "100%",
    flexDirection: "row", alignItems: "center",
    padding: 16,
    borderRadius: 20, // 🟡 Raio igual ao do grid para consistência
  },
  miniIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginRight: 14
  },
  systemTitle: { fontSize: 15, color: "#334155", fontWeight: "600" },
  systemSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
});