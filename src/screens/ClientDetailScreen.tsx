import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
  Modal,
  TextInput,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  InteractionManager,
  ActivityIndicator
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  deleteClient,
  addPayment,
  Client,
} from "../database/db";
import { formatCurrency } from "../utils/formatCurrency";
import { formatDateBR } from "../utils/formatDate";
import { saveClient } from "../services/syncService";
import { useAuth } from "../contexts/AuthContext";
import { useClientLoader } from "../hooks/useClientLoader";

// ✅ Função para normalizar input de valor: remove caracteres inválidos e impede múltiplas vírgulas
const formatValor = (txt: string): string => {
  return txt
    .replace(/[^\d,]/g, "")   // remove tudo que não for número ou vírgula
    .replace(/,+/g, ",");     // impede duas vírgulas seguidas
};

export default function ClientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { user } = useAuth();

  // ✅ Hook personalizado para carregar cliente
  const { client, loading, refreshClient } = useClientLoader(
    route.params as { client?: Client; clientId?: number } | undefined
  );

  const [showPicker, setShowPicker] = useState(false);
  const [showBaixaModal, setShowBaixaModal] = useState(false);
  const [valorBaixa, setValorBaixa] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // ✅ Animated.Value deve usar useRef, não useState (evita recriação no re-render)
  const successMsg = useRef(new Animated.Value(0)).current;
  const [msgText, setMsgText] = useState("");
  const inputRef = useRef<TextInput>(null);

  // ✅ Focar no input quando o modal abrir - aguarda animação do modal terminar
  useEffect(() => {
    if (showBaixaModal) {
      // Usa InteractionManager para garantir que a animação do modal terminou
      const interaction = InteractionManager.runAfterInteractions(() => {
        // Pequeno delay adicional para garantir que o input está totalmente renderizado
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      });

      return () => {
        interaction.cancel();
      };
    }
  }, [showBaixaModal]);

  // Configurar Header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Detalhes do Cliente",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
    });
  }, [navigation]);

  // ✅ Detectar quando volta da tela de edição e mostrar toasty
  const previousClientRef = useRef<Client | null>(null);
  useFocusEffect(
    useCallback(() => {
      // Se voltou da edição e o cliente mudou, mostra toasty
      if (previousClientRef.current && client && previousClientRef.current.id === client.id) {
        const prev = previousClientRef.current;
        const curr = client;

        // Verifica se houve mudanças reais
        if (
          prev.name !== curr.name ||
          prev.value !== curr.value ||
          prev.telefone !== curr.telefone ||
          prev.bairro !== curr.bairro ||
          prev.numero !== curr.numero ||
          prev.referencia !== curr.referencia ||
          prev.next_charge !== curr.next_charge
        ) {
          showSuccess(`✏️ Cliente "${curr.name}" atualizado com sucesso!`);
        }
      }

      // Atualiza referência para próxima verificação
      previousClientRef.current = client;
    }, [client])
  );

  // ============================================================
  // ⚙️ Ações e Helpers
  // ============================================================
  const showSuccess = (text: string) => {
    setMsgText(text);
    Animated.sequence([
      Animated.timing(successMsg, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(successMsg, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  // ✅ Funções nomeadas para evitar inline functions (melhor performance)
  const openPicker = () => setShowPicker(true);
  const openBaixaModal = () => setShowBaixaModal(true);
  const closeBaixaModal = () => setShowBaixaModal(false);
  const handleGoBack = () => navigation.goBack();

  // ✅ Funções de navegação memoizadas para evitar re-renders desnecessários
  const navigateToPaymentHistory = useCallback(() => {
    if (client?.id) {
      navigation.navigate("PaymentHistory", { clientId: client.id });
    }
  }, [client?.id, navigation]);

  const navigateToClientLog = useCallback(() => {
    if (client?.id) {
      navigation.navigate("ClientLog", { clientId: client.id });
    }
  }, [client?.id, navigation]);

  const navigateToEditClient = useCallback(() => {
    if (client) {
      navigation.navigate("EditClient", { client });
    }
  }, [client, navigation]);

  const stopPropagation = (e: any) => e.stopPropagation();

  const handleChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "dismissed") return;

    if (event.type === "set" && selectedDate && client) {
      const formatted = formatDateBR(selectedDate);
      Alert.alert("Confirmar data", `Definir próxima cobrança para ${formatted}?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            // ✅ Validação crítica: garante que client é válido antes de fazer spread
            if (!user?.uid || !client || !client.id || typeof client !== 'object') return;

            // ✅ Spread seguro - client já foi validado acima
            const updated: Client = {
              ...client,
              next_charge: formatted
            };
            // ✅ Usa saveClient para sincronizar com Firestore
            await saveClient(user.uid, updated);
            // ✅ Recarrega do banco para garantir dados atualizados
            await refreshClient();
            showSuccess(`📅 Cobrança agendada: ${formatted}`);
          },
        },
      ]);
    }
  };

  const handleDelete = () => {
    // ✅ Validação crítica: garante que client é válido
    if (!client || !client.id || typeof client !== 'object' || !client.name) {
      Alert.alert("Erro", "Cliente inválido.");
      return;
    }

    Alert.alert(
      "Excluir cliente",
      `Tem certeza que deseja excluir "${client.name}"?\nTodos os pagamentos serão apagados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            deleteClient(client.id);
            showSuccess(`🗑️ Cliente "${client.name}" excluído com sucesso!`);
            // ✅ Pequeno delay para mostrar o toasty antes de navegar
            setTimeout(() => {
              navigation.goBack();
            }, 500);
          },
        },
      ]
    );
  };

  const confirmarBaixa = async () => {
    // ✅ Validação crítica: garante que client é válido antes de usar
    if (!client || !client.id || typeof client !== 'object') {
      Alert.alert("Erro", "Cliente inválido.");
      return;
    }

    if (!user?.uid) {
      Alert.alert("Erro", "Usuário não autenticado.");
      return;
    }

    const valor = parseFloat(valorBaixa.replace(",", "."));
    const restante = (client.value || 0) - (client.paid || 0);

    if (isNaN(valor) || valor <= 0) {
      Alert.alert("Erro", "Informe um valor válido.");
      return;
    }

    if (valor > restante) {
      Alert.alert("Atenção", `O valor informado (R$ ${valor.toFixed(2)}) é maior que o restante.`);
      return;
    }

    // ✅ Ativar loading
    setIsSaving(true);

    try {
      // ✅ 1. Adiciona pagamento no SQLite
      addPayment(client.id, valor);

      // ✅ 2. Atualiza cliente com novo valor pago
      const updated: Client = {
        ...client,
        paid: (client.paid || 0) + valor
      };

      // ✅ 3. CRÍTICO: Sincroniza com Firestore
      await saveClient(user.uid, updated);

      // ✅ Recarrega do banco para garantir dados atualizados
      await refreshClient();

      setShowBaixaModal(false);
      setValorBaixa("");
      showSuccess(`💰 Pagamento de R$ ${valor.toFixed(2)} registrado!`);
    } catch (error) {
      console.error("❌ Erro ao registrar pagamento:", error);
      Alert.alert("Erro", "Não foi possível registrar o pagamento.");
    } finally {
      // ✅ Desativar loading
      setIsSaving(false);
    }
  };

  // Componente Avatar Grande
  const BigAvatar = ({ name }: { name: string }) => (
    <View style={s.avatarContainer}>
      <Text style={s.avatarText}>{name ? name.charAt(0).toUpperCase() : "?"}</Text>
    </View>
  );

  // Loading / Erro
  if (loading) return <View style={s.center}><Text>Carregando...</Text></View>;
  if (!client) return (
    <View style={s.center}>
      <Icon name="alert-circle-outline" size={50} color="#FF3B30" />
      <Text style={s.error}>Cliente não encontrado.</Text>
      <TouchableOpacity onPress={handleGoBack} style={s.btnBack}>
        <Text style={s.btnTextBack}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );

  const restante = (client.value || 0) - (client.paid || 0);

  return (
    <View style={s.flex}>
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Fundo Gradiente Superior */}
        <LinearGradient colors={["#0056b3", "#004494"]} style={s.headerBackground}>
          <View style={s.headerContent}>
            <BigAvatar name={client.name || ""} />
            <Text style={s.clientName}>{client.name}</Text>
            <View style={s.rowCenter}>
              <Icon name="call" size={14} color="#BFDBFE" style={{marginRight: 4}}/>
              <Text style={s.clientPhone}>{client.telefone || "Sem telefone"}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Feedback Animado */}
        <Animated.View style={[s.successToast, { opacity: successMsg, transform: [{ scale: successMsg }] }]}>
          <Icon name="checkmark-circle" size={20} color="#FFF" />
          <Text style={s.successText}>{msgText}</Text>
        </Animated.View>

        <View style={s.bodyContainer}>

          {/* 📊 Card Financeiro Principal */}
          <View style={s.card}>
            <Text style={s.sectionTitle}>Resumo Financeiro</Text>
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statLabel}>Total</Text>
                <Text style={s.statValue}>{formatCurrency(client.value || 0)}</Text>
              </View>
              <View style={s.verticalDivider} />
              <View style={s.statItem}>
                <Text style={s.statLabel}>Pago</Text>
                <Text style={[s.statValue, { color: "#16A34A" }]}>{formatCurrency(client.paid || 0)}</Text>
              </View>
              <View style={s.verticalDivider} />
              <View style={s.statItem}>
                <Text style={s.statLabel}>Falta</Text>
                <Text style={[s.statValue, { color: restante > 0 ? "#EA580C" : "#94A3B8" }]}>
                  {formatCurrency(restante >= 0 ? restante : 0)}
                </Text>
              </View>
            </View>

            {/* Próxima Cobrança */}
            <View style={s.divider} />
            <View style={s.nextChargeRow}>
              <View style={s.rowCenter}>
                <Icon name="calendar-outline" size={18} color="#64748B" />
                <Text style={s.nextChargeLabel}> Próxima Cobrança:</Text>
              </View>
              <Text style={s.nextChargeValue}>{client.next_charge || "Não definida"}</Text>
            </View>
          </View>

          {/* ⚡ Ações Rápidas (Grid) */}
          <Text style={s.sectionLabel}>Ações Rápidas</Text>
          <View style={s.actionGrid}>
            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: "#EFF6FF" }]}
              onPress={openPicker}
            >
              <Icon name="calendar" size={28} color="#0056b3" />
              <Text style={[s.actionText, { color: "#0056b3" }]}>Agendar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: "#F0FDF4" }]}
              onPress={openBaixaModal}
            >
              <Icon name="cash" size={28} color="#16A34A" />
              <Text style={[s.actionText, { color: "#16A34A" }]}>Receber</Text>
            </TouchableOpacity>
          </View>

          {/* 📂 Menu de Gerenciamento (Lista) */}
          <Text style={s.sectionLabel}>Gerenciamento</Text>
          <View style={s.menuList}>
            <MenuButton
              icon="time-outline" label="Histórico de Pagamentos"
              onPress={navigateToPaymentHistory}
            />
            <View style={s.divider} />
            <MenuButton
              icon="document-text-outline" label="Log de Alterações"
              onPress={navigateToClientLog}
            />
            <View style={s.divider} />
            <MenuButton
              icon="create-outline" label="Editar Dados"
              onPress={navigateToEditClient}
            />
          </View>

          {/* 🗑️ Botão Excluir */}
          <TouchableOpacity onPress={handleDelete} style={s.deleteButton}>
            <Icon name="trash-outline" size={20} color="#EF4444" />
            <Text style={s.deleteText}>Excluir Cliente</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* MODAL DE BAIXA */}
      <Modal visible={showBaixaModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={closeBaixaModal}>
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1, justifyContent: "center", alignItems: "center", width: "100%" }}
            >
              <TouchableWithoutFeedback onPress={stopPropagation}>
                <View style={s.modalContainer}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>Registrar Pagamento</Text>
                    <TouchableOpacity onPress={closeBaixaModal}>
                      <Icon name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={s.modalLabel}>Valor a receber (Restante: {formatCurrency(restante)})</Text>
                  <View style={s.inputContainer}>
                    <Text style={s.currencyPrefix}>R$</Text>
                    <TextInput
                      ref={inputRef}
                      style={s.input}
                      placeholder="0,00"
                      keyboardType="number-pad"
                      value={valorBaixa}
                      onChangeText={(txt) => setValorBaixa(formatValor(txt))}
                      returnKeyType="done"
                    />
                  </View>

                  <TouchableOpacity
                    style={[s.confirmButton, isSaving && s.confirmButtonDisabled]}
                    onPress={confirmarBaixa}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={s.confirmButtonText}>Salvando...</Text>
                      </View>
                    ) : (
                      <Text style={s.confirmButtonText}>Confirmar Baixa</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker (Android/iOS Logic) */}
      {showPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handleChangeDate}
        />
      )}
    </View>
  );
}

// Componente auxiliar para item de menu
// ✅ Memoizado para evitar re-renders desnecessários
const MenuButton = React.memo(({ icon, label, onPress }: any) => (
  <Pressable
    onPress={onPress}
    style={({pressed}) => [s.menuItem, pressed && {backgroundColor: '#F8FAFC'}]}
  >
    <View style={s.rowCenter}>
      <Icon name={icon} size={22} color="#475569" />
      <Text style={s.menuText}>{label}</Text>
    </View>
    <Icon name="chevron-forward" size={18} color="#CBD5E1" />
  </Pressable>
));

// ============================================================
// 🎨 Estilos
// ============================================================
const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#F1F5F9" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  scrollContent: { paddingBottom: 40 },

  // Header
  headerBackground: {
    paddingTop: 20,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
  },
  headerContent: { alignItems: 'center' },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF33", // Transparente branco
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF66'
  },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "#FFF" },
  clientName: { fontSize: 22, fontWeight: "bold", color: "#FFF", marginBottom: 2 },
  clientPhone: { fontSize: 14, color: "#BFDBFE" },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },

  // Toast
  successToast: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    backgroundColor: "#16A34A",
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    zIndex: 100,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  successText: { color: "#FFF", fontWeight: "600", marginLeft: 8 },

  // Body
  bodyContainer: {
    paddingHorizontal: 20,
    paddingTop: 20, // ✅ Espaçamento normal sem marginTop negativo
  },

  // Card Financeiro
  card: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: "#64748B", marginBottom: 15, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 12, color: "#94A3B8", marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  verticalDivider: { width: 1, height: 30, backgroundColor: "#E2E8F0" },
  divider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 15 },
  nextChargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nextChargeLabel: { fontSize: 14, color: "#64748B" },
  nextChargeValue: { fontSize: 14, fontWeight: "600", color: "#0056b3" },

  // Ações
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#334155", marginBottom: 10, marginLeft: 4 },
  actionGrid: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  actionCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  actionText: { marginTop: 8, fontWeight: "700", fontSize: 14 },

  // Menu Lista
  menuList: { backgroundColor: "#FFF", borderRadius: 16, marginBottom: 25, elevation: 2 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  menuText: { fontSize: 16, color: "#334155", marginLeft: 12, fontWeight: '500' },

  // Delete
  deleteButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 30
  },
  deleteText: { color: "#EF4444", fontWeight: "700", marginLeft: 8 },

  // Modal Style
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContainer: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 480,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: "700", color: "#1E293B" },
  modalLabel: { fontSize: 15, color: "#64748B", marginBottom: 12 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: "#E2E8F0",
    marginBottom: 28,
    paddingBottom: 12
  },
  currencyPrefix: { fontSize: 28, color: "#94A3B8", fontWeight: '600', marginRight: 10 },
  input: { flex: 1, fontSize: 36, fontWeight: "700", color: "#1E293B", minHeight: 50 },
  confirmButton: { backgroundColor: "#16A34A", paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: "#FFF", fontSize: 17, fontWeight: "bold" },

  // Erros e Voltar
  error: { fontSize: 18, color: "#FF3B30", marginVertical: 10 },
  btnBack: { backgroundColor: "#0056b3", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  btnTextBack: { color: "#FFF", fontWeight: "bold" },
});