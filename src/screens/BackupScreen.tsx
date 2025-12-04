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
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import DocumentPicker from "react-native-document-picker";
import RNFS from "react-native-fs";
import { backupLocal, backupFirebase, restoreLocal, restoreFirebase, BackupResult, RestoreResult } from "../utils/backup";
import { formatDateTime } from "../utils/formatDate";
import { useAuth } from "../contexts/AuthContext";
import { useBackupHistory } from "../hooks/useBackupHistory";
import HistorySkeleton from "../components/HistorySkeleton";

type IoniconName = keyof typeof Icon.glyphMap;

// 🔥 Tipo para estados de loading - evita erros de string
type LoadingKey = "local_bkp" | "cloud_bkp" | "local_res" | "cloud_res" | null;

export default function BackupScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState<LoadingKey>(null);
  
  // 🎣 Hook para gerenciar histórico de backups
  const {
    history,
    lastBackup,
    loading: historyLoading,
    error: historyError,
    saveBackupHistory,
    loadBackupHistory,
  } = useBackupHistory();

  // 🎨 Animações do Status Card
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.95);
  const iconScale = useSharedValue(1);
  const shimmerOpacity = useSharedValue(0.3);

  // Fade-in do card na montagem
  useEffect(() => {
    cardOpacity.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
    cardScale.value = withTiming(1, {
      duration: 600,
      easing: Easing.out(Easing.ease),
    });
  }, []);

  // Pulso do ícone quando há backup
  useEffect(() => {
    if (lastBackup) {
      iconScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      iconScale.value = 1;
    }
  }, [lastBackup]);

  // Shimmer no texto - só anima quando não tem backup
  useEffect(() => {
    if (!lastBackup) {
      // Anima shimmer quando não há backup
      shimmerOpacity.value = withRepeat(
        withTiming(1, {
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      // Para a animação e mantém opacidade estável quando há backup
      shimmerOpacity.value = withTiming(0.8, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [lastBackup]);

  // Estilos animados
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      shimmerOpacity.value,
      [0.3, 1],
      [0.4, 0.8]
    );
    return {
      opacity,
    };
  });

  // 🎨 Header
  // ✅ navigation nunca muda, então não precisa estar nas dependências
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Segurança de Dados",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, []);

  // 💡 Notificação: Usando Alert.alert do React Native (perfeito para MVP)
  // 🚀 Para evoluir: considere usar react-native-toast-message ou componente Toast customizado
  //    - Mais bonito visualmente
  //    - Não bloqueia a interação do usuário
  //    - Melhor UX em apps grandes
  const notify = (title: string, msg: string) => Alert.alert(title, msg);

  const handleBackupLocal = async () => {
    setLoading("local_bkp");
    try {
      // ✅ Tipado com BackupResult - TypeScript valida automaticamente
      const result: BackupResult = await backupLocal();

      if (result.success && result.path) {
        await saveBackupHistory({ type: "local", timestamp: Date.now() });
        notify("✅ Sucesso", `Backup salvo na pasta Downloads!`);
      } else {
        notify("❌ Erro", "Falha ao criar backup local.");
      }
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

  const handleRestoreLocal = async () => {
    // ⚠️ Confirmação antes de restaurar (operação destrutiva)
    Alert.alert(
      "⚠️ Restaurar Backup",
      "Esta ação irá substituir todos os dados atuais pelo backup selecionado.\n\n" +
      "Um backup de segurança será criado automaticamente antes da restauração.\n\n" +
      "Deseja continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Continuar",
          style: "destructive",
          onPress: async () => {
            setLoading("local_res");
            try {
              // Seleciona arquivo de backup
              const res = await DocumentPicker.pick({
                type: [DocumentPicker.types.allFiles],
                copyTo: "cachesDirectory", // Copia para cache para garantir acesso
              });

              if (!res || res.length === 0) {
                setLoading(null);
                return;
              }

              const pickedFile = res[0];
              
              // Verifica se é arquivo .db
              if (!pickedFile.name?.endsWith(".db")) {
                notify(
                  "❌ Arquivo Inválido",
                  "Por favor, selecione um arquivo de backup (.db) válido."
                );
                setLoading(null);
                return;
              }

              // Usa o URI do arquivo selecionado
              let backupPath = pickedFile.uri;
              
              // Se o arquivo foi copiado para cache, usa o caminho do cache
              if (pickedFile.fileCopyUri) {
                backupPath = pickedFile.fileCopyUri;
              }

              // Remove prefixo "file://" se necessário
              backupPath = backupPath.replace(/^file:\/\//, "");

              // Restaura o backup
              const result: RestoreResult = await restoreLocal(backupPath);
              
              if (result.success) {
                Alert.alert(
                  "✅ Sucesso",
                  result.message || "Backup restaurado com sucesso!\n\n" +
                  "⚠️ IMPORTANTE: Reinicie o aplicativo para aplicar as mudanças.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Recarrega histórico após restauração
                        loadBackupHistory();
                      },
                    },
                  ]
                );
              } else {
                notify("❌ Erro", result.message || "Falha ao restaurar backup local.");
              }
            } catch (e: any) {
              // Ignora erro de cancelamento do DocumentPicker
              if (DocumentPicker.isCancel(e)) {
                // Usuário cancelou a seleção
              } else {
                console.error("Erro ao restaurar backup local:", e);
                notify(
                  "❌ Erro",
                  e?.message || "Falha ao restaurar backup local. Verifique se o arquivo é válido."
                );
              }
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRestoreCloud = async () => {
    if (!user) {
      notify("❌ Erro", "Você precisa estar logado para restaurar backup da nuvem.");
      return;
    }

    // ⚠️ Confirmação antes de restaurar (operação destrutiva)
    Alert.alert(
      "⚠️ Restaurar Backup da Nuvem",
      "Esta ação irá substituir todos os dados atuais pelo backup mais recente da nuvem.\n\n" +
      "Um backup de segurança será criado automaticamente antes da restauração.\n\n" +
      "Deseja continuar?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Continuar",
          style: "destructive",
          onPress: async () => {
            setLoading("cloud_res");
            try {
              // Restaura o backup mais recente da nuvem
              const result: RestoreResult = await restoreFirebase(user.uid);
              
              if (result.success) {
                Alert.alert(
                  "✅ Sucesso",
                  result.message || "Backup da nuvem restaurado com sucesso!\n\n" +
                  "⚠️ IMPORTANTE: Reinicie o aplicativo para aplicar as mudanças.",
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        // Recarrega histórico após restauração
                        loadBackupHistory();
                      },
                    },
                  ]
                );
              } else {
                notify("❌ Erro", result.message || "Falha ao restaurar backup da nuvem.");
              }
            } catch (e: any) {
              console.error("Erro ao restaurar backup da nuvem:", e);
              notify(
                "❌ Erro",
                e?.message || "Falha ao restaurar backup da nuvem. Verifique sua conexão."
              );
            } finally {
              setLoading(null);
            }
          },
        },
      ]
    );
  };


  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" animated />
      
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
      >
        
        {/* 🔹 Status do Sistema (Último Backup) */}
        <Animated.View 
          style={[
            styles.statusCard, 
            lastBackup ? styles.statusSuccess : styles.statusWarning,
            cardAnimatedStyle
          ]}
        >
          <Animated.View style={[styles.statusIcon, iconAnimatedStyle]}>
            <Icon 
              name={lastBackup ? "checkmark-circle" : "alert-circle"} 
              size={32} 
              color={lastBackup ? "#166534" : "#CA8A04"} 
            />
          </Animated.View>
          <View style={{flex: 1}}>
            <Animated.Text 
              style={[
                styles.statusTitle, 
                { color: lastBackup ? "#166534" : "#CA8A04" },
                shimmerAnimatedStyle
              ]}
            >
              {lastBackup ? "Backup Atualizado" : "Nenhum Backup Recente"}
            </Animated.Text>
            <Animated.Text 
              style={[styles.statusSub, shimmerAnimatedStyle]}
            >
              {lastBackup 
                ? `Último: ${lastBackup.type === 'local' ? 'Local' : 'Nuvem'} • ${formatDateTime(lastBackup.timestamp)}` 
                : "Recomendamos fazer um backup agora."}
            </Animated.Text>
          </View>
        </Animated.View>

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
            testID="backup-create-local"
          />
          <View style={{ width: 12 }} />
          <ActionButton 
            label="Restaurar" 
            icon="refresh-outline" 
            color="#EA580C" 
            loading={loading === "local_res"}
            onPress={handleRestoreLocal}
            outline
            testID="backup-restore-local"
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
            testID="backup-create-cloud"
          />
          <View style={{ width: 12 }} />
          <ActionButton 
            label="Baixar Dados" 
            icon="cloud-download-outline" 
            color="#EA580C" 
            loading={loading === "cloud_res"}
            onPress={handleRestoreCloud}
            outline
            testID="backup-restore-cloud"
          />
        </BackupSection>

        {/* 📜 Histórico Recente */}
        <Text style={styles.sectionHeaderLabel}>HISTÓRICO RECENTE</Text>
        <View style={styles.historyCard}>
          {historyLoading ? (
            <HistorySkeleton />
          ) : historyError ? (
            <View style={styles.emptyHistory}>
              <Icon name="alert-circle-outline" size={24} color="#EF4444" />
              <Text style={[styles.emptyHistoryText, { color: "#EF4444", marginTop: 8 }]}>
                Erro ao carregar histórico
              </Text>
              <TouchableOpacity 
                onPress={loadBackupHistory}
                style={styles.retryButton}
              >
                <Icon name="refresh" size={16} color="#0056b3" />
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyHistory}>
              <Icon name="time-outline" size={24} color="#CBD5E1" />
              <Text style={styles.emptyHistoryText}>Nenhum registro encontrado.</Text>
            </View>
          ) : (
            history.map((item, index: number) => (
              <View key={index}>
                <View style={styles.historyRow}>
                  <View style={[
                    styles.historyIcon, 
                    { backgroundColor: item.type === "local" ? "#EFF6FF" : "#F3E8FF" }
                  ]}>
                    <Icon 
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
                  <Icon name="checkmark-done" size={18} color="#16A34A" />
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
interface BackupSectionProps {
  title: string;
  subtitle: string;
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
  children: React.ReactNode;
}

// ✅ Memoizado para evitar re-renders desnecessários
const BackupSection = React.memo<BackupSectionProps>(({ title, subtitle, icon, iconColor, iconBg, children }) => (
  <View style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon name={icon} size={24} color={iconColor} />
      </View>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
    </View>
    <View style={styles.actionRow}>{children}</View>
  </View>
));

BackupSection.displayName = 'BackupSection';

interface ActionButtonProps {
  label: string;
  icon: IoniconName;
  color: string;
  loading: boolean;
  onPress: () => void;
  outline?: boolean;
  testID?: string;
}

// ✅ Memoizado para evitar re-renders desnecessários
const ActionButton = React.memo<ActionButtonProps>(({ label, icon, color, loading, onPress, outline, testID }) => (
  <TouchableOpacity 
    style={[
      styles.button, 
      outline ? { borderWidth: 1, borderColor: color, backgroundColor: "#FFF" } : { backgroundColor: color }
    ]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
    testID={testID}
  >
    {loading ? (
      <ActivityIndicator color={outline ? color : "#FFF"} />
    ) : (
      <>
        <Icon name={icon} size={20} color={outline ? color : "#FFF"} style={{ marginRight: 8 }} />
        <Text style={[styles.btnText, outline && { color: color }]}>{label}</Text>
      </>
    )}
  </TouchableOpacity>
));

ActionButton.displayName = 'ActionButton';

/* 🎨 Estilos Modernos */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },
  container: { padding: 20, paddingBottom: 60 },

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
  emptyHistoryText: { color: "#94A3B8", fontSize: 14, marginTop: 8 },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  retryButtonText: {
    color: "#0056b3",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
});