import React, { useState, useLayoutEffect, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { backupLocal, backupFirebase } from "../utils/backup";
import { useAuth } from "../contexts/AuthContext";

type IoniconName = keyof typeof Ionicons.glyphMap;

type BackupEntry = {
  type: "local" | "cloud";
  timestamp: number;
};

export default function BackupScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [history, setHistory] = useState<BackupEntry[]>([]);
  const [lastBackup, setLastBackup] = useState<BackupEntry | null>(null);

  // 🎨 Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Segurança de Dados",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  // Salva histórico no storage
  const saveBackupHistory = async (entry: BackupEntry) => {
    try {
      const current = await AsyncStorage.getItem("backup_history");
      const list: BackupEntry[] = current ? JSON.parse(current) : [];
      const updated = [entry, ...list].slice(0, 10); // Mantém os últimos 10
      await AsyncStorage.setItem("backup_history", JSON.stringify(updated));
      setHistory(updated);
      setLastBackup(entry);
    } catch (e) {
      console.error(e);
    }
  };

  // Carrega histórico e último backup
  const loadBackupData = async () => {
    try {
      const json = await AsyncStorage.getItem("backup_history");
      const list: BackupEntry[] = json ? JSON.parse(json) : [];
      setHistory(list);
      if (list.length > 0) setLastBackup(list[0]);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadBackupData();
  }, []);

  const notify = (title: string, msg: string) => Alert.alert(title, msg);

  const handleBackupLocal = async () => {
    setLoading("local_bkp");
    try {
      await backupLocal();
      await saveBackupHistory({ type: "local", timestamp: Date.now() });
      notify("✅ Sucesso", "Backup local criado na pasta Downloads!");
    } catch (e) {
      notify("❌ Erro", "Falha ao criar backup local.");
    } finally {
      setLoading(null);
    }
  };

  const handleBackupNuvem = async () => {
    if (!user) {
      notify("❌ Erro", "Você precisa estar logado para fazer backup na nuvem.");
      return;
    }

    setLoading("cloud_bkp");
    try {
      await backupFirebase(user.uid);
      await saveBackupHistory({ type: "cloud", timestamp: Date.now() });
      notify("☁️ Sucesso", "Dados enviados para a nuvem!");
    } catch (e) {
      notify("❌ Erro", "Falha ao conectar com a nuvem.");
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = (type: string) => {
    notify("🚧 Em desenvolvimento", `A função de restaurar (${type}) virá na próxima atualização.`);
  };

  // Formatação de data amigável
  const formatDateTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* 🔹 Status do Sistema (Último Backup) */}
        <View style={[
          styles.statusCard, 
          lastBackup ? styles.statusSuccess : styles.statusWarning
        ]}>
          <View style={styles.statusIcon}>
            <Ionicons 
              name={lastBackup ? "checkmark-circle" : "alert-circle"} 
              size={32} 
              color={lastBackup ? "#166534" : "#CA8A04"} 
            />
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.statusTitle, { color: lastBackup ? "#166534" : "#CA8A04" }]}>
              {lastBackup ? "Backup Atualizado" : "Nenhum Backup Recente"}
            </Text>
            <Text style={styles.statusSub}>
              {lastBackup 
                ? `Último: ${lastBackup.type === 'local' ? 'Local' : 'Nuvem'} • ${formatDateTime(lastBackup.timestamp)}` 
                : "Recomendamos fazer um backup agora."}
            </Text>
          </View>
        </View>

        {/* 📱 Seção LOCAL */}
        <BackupSection
          title="Armazenamento Local"
          subtitle="Salvar arquivo no dispositivo"
          icon="phone-portrait-outline"
          iconColor="#0056b3"
          iconBg="#EFF6FF"
        >
          <ActionButton 
            label="Criar Backup" 
            icon="save-outline" 
            color="#0056b3" 
            loading={loading === "local_bkp"}
            onPress={handleBackupLocal}
          />
          <View style={{ width: 12 }} />
          <ActionButton 
            label="Restaurar" 
            icon="refresh-outline" 
            color="#EA580C" 
            loading={loading === "local_res"}
            onPress={() => handleRestore("Local")}
            outline
          />
        </BackupSection>

        {/* ☁️ Seção NUVEM */}
        <BackupSection
          title="Sincronização Nuvem"
          subtitle="Salvar no servidor seguro"
          icon="cloud-outline"
          iconColor="#7C3AED"
          iconBg="#F3E8FF"
        >
          <ActionButton 
            label="Enviar Dados" 
            icon="cloud-upload-outline" 
            color="#7C3AED" 
            loading={loading === "cloud_bkp"}
            onPress={handleBackupNuvem}
          />
          <View style={{ width: 12 }} />
          <ActionButton 
            label="Baixar Dados" 
            icon="cloud-download-outline" 
            color="#EA580C" 
            loading={loading === "cloud_res"}
            onPress={() => handleRestore("Nuvem")}
            outline
          />
        </BackupSection>

        {/* 📜 Histórico Recente */}
        <Text style={styles.sectionHeaderLabel}>HISTÓRICO RECENTE</Text>
        <View style={styles.historyCard}>
          {history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Ionicons name="time-outline" size={24} color="#CBD5E1" />
              <Text style={styles.emptyHistoryText}>Nenhum registro encontrado.</Text>
            </View>
          ) : (
            history.map((item, index) => (
              <View key={index}>
                <View style={styles.historyRow}>
                  <View style={[
                    styles.historyIcon, 
                    { backgroundColor: item.type === "local" ? "#EFF6FF" : "#F3E8FF" }
                  ]}>
                    <Ionicons 
                      name={item.type === "local" ? "save" : "cloud-upload"} 
                      size={16} 
                      color={item.type === "local" ? "#0056b3" : "#7C3AED"} 
                    />
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.historyType}>
                      {item.type === "local" ? "Backup Local" : "Backup na Nuvem"}
                    </Text>
                    <Text style={styles.historyDate}>{formatDateTime(item.timestamp)}</Text>
                  </View>
                  <Ionicons name="checkmark-done" size={18} color="#16A34A" />
                </View>
                {/* Divisor (exceto no último) */}
                {index < history.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>
        
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// 🧱 Componentes Auxiliares
const BackupSection = ({ title, subtitle, icon, iconColor, iconBg, children }: any) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
    </View>
    <View style={styles.actionRow}>{children}</View>
  </View>
);

const ActionButton = ({ label, icon, color, loading, onPress, outline }: any) => (
  <TouchableOpacity 
    style={[
      styles.button, 
      outline ? { borderWidth: 1, borderColor: color, backgroundColor: "#FFF" } : { backgroundColor: color }
    ]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color={outline ? color : "#FFF"} />
    ) : (
      <>
        <Ionicons name={icon} size={20} color={outline ? color : "#FFF"} style={{ marginRight: 8 }} />
        <Text style={[styles.btnText, outline && { color: color }]}>{label}</Text>
      </>
    )}
  </TouchableOpacity>
);

/* 🎨 Estilos Modernos */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  container: { padding: 20 },

  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  statusSuccess: { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" },
  statusWarning: { backgroundColor: "#FEF9C3", borderColor: "#FEF08A" },
  statusIcon: { marginRight: 12 },
  statusTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  statusSub: { fontSize: 12, color: "#475569" },

  // Cards Principais
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  cardSub: { fontSize: 13, color: "#64748B" },
  
  // Botões
  actionRow: { flexDirection: "row", justifyContent: "space-between" },
  button: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 10,
    height: 50,
  },
  btnText: { color: "#FFF", fontWeight: "600", fontSize: 14 },

  // Histórico
  sectionHeaderLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginBottom: 10,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  historyCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  historyType: { fontSize: 14, fontWeight: "600", color: "#334155" },
  historyDate: { fontSize: 12, color: "#94A3B8" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginLeft: 60 },
  
  // Empty State Histórico
  emptyHistory: { alignItems: 'center', padding: 20 },
  emptyHistoryText: { color: "#94A3B8", fontSize: 14, marginTop: 8 }
});