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
  ActivityIndicator,
  Share
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import type { Client } from "../database/types";
import { deleteClient, getClientById } from "../database/repositories/clientsRepo";
import { addPayment, marcarClienteAusente } from "../database/repositories/paymentsRepo";
import { formatDateIso } from "../database/utils";
import { imprimirReciboSimples, imprimirReciboDetalhado } from "../services/PrinterService";
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showProximaDataPicker, setShowProximaDataPicker] = useState(false);
  const [valorBaixa, setValorBaixa] = useState("");
  const [proximaDataBaixa, setProximaDataBaixa] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // ✅ Opções de impressão (quais campos incluir)
  const [printOptions, setPrintOptions] = useState({
    nome: true,
    telefone: true,
    id: true,
    valorTotal: true,
    valorPago: true,
    valorRestante: true,
    endereco: true,
    proximaCobranca: true,
  });
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
  const openPrintModal = () => setShowPrintModal(true);
  const closePrintModal = () => setShowPrintModal(false);
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

  const handlePrint = useCallback(async () => {
    if (!client || !client.id) return;

    const restante = (client.value || 0) - (client.paid || 0);
    
    // ✅ Função auxiliar para formatar valores sem emoji e compacto
    const formatValor = (valor: number): string => {
      return `R$ ${valor.toFixed(2).replace(".", ",")}`;
    };
    
    // ✅ Linha divisória curta (30 caracteres para 58mm)
    const divider = "------------------------------";
    
    // ✅ Monta o texto compacto para impressora térmica
    const lines: string[] = [];
    
    // Cabeçalho
    lines.push("CLIENTE");
    
    // Dados do Cliente (compacto)
    if (printOptions.nome) {
      const nome = client.name.length > 28 ? client.name.substring(0, 25) + "..." : client.name;
      lines.push(`Nome: ${nome}`);
    }
    if (printOptions.telefone) {
      const tel = (client.telefone || "N/A").length > 24 ? (client.telefone || "N/A").substring(0, 21) + "..." : (client.telefone || "N/A");
      lines.push(`Tel: ${tel}`);
    }
    if (printOptions.id) {
      lines.push(`ID: ${client.id}`);
    }
    
    // Divisória apenas se houver dados financeiros
    if (printOptions.valorTotal || printOptions.valorPago || printOptions.valorRestante) {
      lines.push(divider);
    }
    
    // Informações Financeiras (compacto)
    if (printOptions.valorTotal) {
      lines.push(`Total: ${formatValor(client.value || 0)}`);
    }
    if (printOptions.valorPago) {
      lines.push(`Pago: ${formatValor(client.paid || 0)}`);
    }
    if (printOptions.valorRestante) {
      lines.push(`Falta: ${formatValor(restante >= 0 ? restante : 0)}`);
    }
    
    // Endereço (compacto, uma linha se possível)
    if (printOptions.endereco) {
      const hasAddress = client.bairro || client.numero || client.referencia;
      if (hasAddress) {
        lines.push(divider);
        if (client.bairro) {
          const bairro = client.bairro.length > 26 ? client.bairro.substring(0, 23) + "..." : client.bairro;
          lines.push(`Bairro: ${bairro}`);
        }
        if (client.numero) {
          lines.push(`Num: ${client.numero}`);
        }
        if (client.referencia) {
          const ref = client.referencia.length > 24 ? client.referencia.substring(0, 21) + "..." : client.referencia;
          lines.push(`Ref: ${ref}`);
        }
      }
    }
    
    // Próxima Cobrança
    if (printOptions.proximaCobranca) {
      lines.push(divider);
      const data = client.next_charge ? formatDateBR(client.next_charge) : "Nao definida";
      lines.push(`Prox Cobranca: ${data}`);
    }
    
    // Rodapé (compacto)
    const now = new Date();
    const dataHora = `${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}`;
    lines.push(divider);
    lines.push(dataHora);
    
    // ✅ Junta tudo sem linhas vazias extras
    const printText = lines.join("\n");

    try {
      const result = await Share.share({
        message: printText,
        title: `Dados do Cliente - ${client.name}`,
      });

      if (result.action === Share.sharedAction) {
        showSuccess("📄 Dados compartilhados com sucesso!");
        closePrintModal();
      }
    } catch (error) {
      console.error("Erro ao compartilhar:", error);
      Alert.alert("Erro", "Não foi possível compartilhar os dados do cliente.");
    }
  }, [client, printOptions, showSuccess, closePrintModal]);

  const stopPropagation = (e: any) => e.stopPropagation();

  const handleChangeDate = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowPicker(false);
    if (event.type === "dismissed") return;

    if (event.type === "set" && selectedDate && client) {
      const formattedBR = formatDateBR(selectedDate);
      const formattedISO = formatDateIso(selectedDate); // ✅ Formato ISO para salvar no banco
      Alert.alert("Confirmar data", `Definir próxima cobrança para ${formattedBR}?`, [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            // ✅ Validação crítica: garante que client é válido antes de fazer spread
            if (!user?.uid || !client || !client.id || typeof client !== 'object') return;

            // ✅ Spread seguro - client já foi validado acima
            // ✅ Usa formato ISO (yyyy-mm-dd) para salvar no banco e Firestore
            const updated: Client = {
              ...client,
              next_charge: formattedISO
            };
            // ✅ Usa saveClient para sincronizar com Firestore
            await saveClient(user.uid, updated);
            // ✅ Recarrega do banco para garantir dados atualizados
            await refreshClient();
            showSuccess(`📅 Cobrança agendada: ${formattedBR}`);
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
            if (!client.id) return;
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

  // ✅ Marcar cliente como ausente
  const handleMarcarAusente = async () => {
    if (!client || !client.id) {
      Alert.alert("Erro", "Cliente inválido.");
      return;
    }

    Alert.alert(
      "Cliente Ausente",
      "Deseja marcar este cliente como ausente? A próxima cobrança será agendada para amanhã.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              setIsSaving(true);
              await marcarClienteAusente(client.id!);
              await refreshClient();
              const updatedClient = await getClientById(client.id!);
              if (updatedClient && user?.uid) {
                await saveClient(user.uid, updatedClient);
              }
              showSuccess("🚫 Cliente marcado como ausente. Próxima cobrança: amanhã.");
            } catch (error) {
              console.error("❌ Erro ao marcar cliente como ausente:", error);
              Alert.alert("Erro", "Não foi possível marcar cliente como ausente.");
            } finally {
              setIsSaving(false);
            }
          },
        },
      ]
    );
  };

  // ✅ Imprimir recibo
  const handleImprimir = async (tipo: "simples" | "detalhado") => {
    if (!client) {
      Alert.alert("Erro", "Cliente inválido.");
      return;
    }

    try {
      setIsSaving(true);
      if (tipo === "simples") {
        await imprimirReciboSimples(client);
      } else {
        await imprimirReciboDetalhado(client);
      }
      showSuccess("🖨️ Recibo enviado para impressão!");
    } catch (error) {
      console.error("❌ Erro ao imprimir:", error);
      Alert.alert(
        "Erro ao Imprimir",
        error instanceof Error ? error.message : "Não foi possível imprimir. Verifique se há uma impressora disponível."
      );
    } finally {
      setIsSaving(false);
      setShowPrintModal(false);
    }
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

    // ✅ VALIDAÇÃO V3: Se pagamento parcial, proximaData é OBRIGATÓRIA
    const valorPagoDepois = (client.paid || 0) + valor;
    const aindaRestante = (client.value || 0) - valorPagoDepois;
    
    if (aindaRestante > 0 && !proximaDataBaixa) {
      Alert.alert(
        "⚠️ Data Obrigatória",
        "Para pagamento parcial, é necessário informar a data da próxima cobrança.",
        [
          { text: "OK", onPress: () => setShowProximaDataPicker(true) }
        ]
      );
      // ✅ Vibrar o dispositivo (se disponível)
      if (Platform.OS === "android") {
        Vibration.vibrate(200);
      }
      return;
    }

    // ✅ Ativar loading
    setIsSaving(true);

    try {
      // ✅ 1. Adiciona pagamento no SQLite com proximaData se fornecida
      if (!client.id) throw new Error("ID do cliente inválido");
      
      const proximaDataISO = proximaDataBaixa ? formatDateIso(proximaDataBaixa) : null;
      await addPayment(client.id, valor, { proximaData: proximaDataISO });

      // ✅ 2. Recarrega cliente do banco para pegar o valor atualizado de paid
      await refreshClient();
      
      // ✅ 3. Pega o cliente atualizado (com paid correto do banco)
      const updatedClient = await getClientById(client.id);
      if (!updatedClient) {
        throw new Error("Cliente não encontrado após adicionar pagamento");
      }

      // ✅ 4. CRÍTICO: Sincroniza com Firestore usando dados atualizados do banco
      await saveClient(user.uid, updatedClient);

      setShowBaixaModal(false);
      setValorBaixa("");
      setProximaDataBaixa(null);
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
            {client.id && (
              <View style={s.rowCenter}>
                <Icon name="finger-print" size={12} color="#94A3B8" style={{marginRight: 4}}/>
                <Text style={s.clientId}>ID: {client.id}</Text>
              </View>
            )}
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
              <Text style={s.nextChargeValue}>
                {client.next_charge ? formatDateBR(client.next_charge) : "Não definida"}
              </Text>
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

            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: "#FEF3C7" }]}
              onPress={openPrintModal}
            >
              <Icon name="print-outline" size={28} color="#D97706" />
              <Text style={[s.actionText, { color: "#D97706" }]}>Imprimir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.actionCard, { backgroundColor: "#FEE2E2" }]}
              onPress={handleMarcarAusente}
            >
              <Icon name="close-circle-outline" size={28} color="#DC2626" />
              <Text style={[s.actionText, { color: "#DC2626" }]}>Ausente</Text>
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

                  {/* ✅ V3: Seletor de próxima data (obrigatório para pagamento parcial) */}
                  {(() => {
                    const valor = parseFloat(valorBaixa.replace(",", "."));
                    const valorPagoDepois = (client.paid || 0) + (isNaN(valor) ? 0 : valor);
                    const aindaRestante = (client.value || 0) - valorPagoDepois;
                    const isParcial = aindaRestante > 0;
                    
                    if (isParcial) {
                      return (
                        <>
                          <Text style={[s.modalLabel, { marginTop: 16, color: "#DC2626" }]}>
                            ⚠️ Data da Próxima Cobrança (Obrigatória)
                          </Text>
                          <TouchableOpacity
                            style={[s.dateButton, !proximaDataBaixa && { borderColor: "#DC2626", borderWidth: 2 }]}
                            onPress={() => setShowProximaDataPicker(true)}
                          >
                            <Icon name="calendar-outline" size={20} color="#0056b3" style={{ marginRight: 8 }} />
                            <Text style={[s.dateText, !proximaDataBaixa && { color: "#DC2626" }]}>
                              {proximaDataBaixa ? formatDateBR(formatDateIso(proximaDataBaixa)) : "Selecione a data"}
                            </Text>
                          </TouchableOpacity>
                        </>
                      );
                    }
                    return null;
                  })()}

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
          minimumDate={new Date()}
          onChange={handleChangeDate}
        />
      )}

      {/* Date Picker para Próxima Data (Modal de Pagamento) */}
      {showProximaDataPicker && (
        <DateTimePicker
          value={proximaDataBaixa || new Date()}
          mode="date"
          display="default"
          minimumDate={new Date()}
          onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
            if (Platform.OS === "android") setShowProximaDataPicker(false);
            if (event.type === "dismissed") {
              setShowProximaDataPicker(false);
              return;
            }
            if (event.type === "set" && selectedDate) {
              setProximaDataBaixa(selectedDate);
              if (Platform.OS === "ios") setShowProximaDataPicker(false);
            }
          }}
        />
      )}

      {/* MODAL DE IMPRESSÃO */}
      <Modal visible={showPrintModal} transparent animationType="slide">
        <TouchableWithoutFeedback onPress={closePrintModal}>
          <View style={s.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1, justifyContent: "flex-end", width: "100%" }}
            >
              <TouchableWithoutFeedback onPress={stopPropagation}>
                <View style={s.printModalContainer}>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>Opções de Impressão</Text>
                    <TouchableOpacity onPress={closePrintModal}>
                      <Icon name="close" size={24} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <Text style={s.modalSubtitle}>Selecione quais informações incluir:</Text>

                  <ScrollView style={s.printOptionsList} showsVerticalScrollIndicator={false}>
                    <PrintOption
                      label="Nome"
                      value={printOptions.nome}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, nome: !prev.nome }))}
                    />
                    <PrintOption
                      label="Telefone"
                      value={printOptions.telefone}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, telefone: !prev.telefone }))}
                    />
                    <PrintOption
                      label="ID"
                      value={printOptions.id}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, id: !prev.id }))}
                    />
                    <PrintOption
                      label="Valor Total"
                      value={printOptions.valorTotal}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, valorTotal: !prev.valorTotal }))}
                    />
                    <PrintOption
                      label="Valor Pago"
                      value={printOptions.valorPago}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, valorPago: !prev.valorPago }))}
                    />
                    <PrintOption
                      label="Valor Restante"
                      value={printOptions.valorRestante}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, valorRestante: !prev.valorRestante }))}
                    />
                    <PrintOption
                      label="Endereço"
                      value={printOptions.endereco}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, endereco: !prev.endereco }))}
                    />
                    <PrintOption
                      label="Próxima Cobrança"
                      value={printOptions.proximaCobranca}
                      onToggle={() => setPrintOptions(prev => ({ ...prev, proximaCobranca: !prev.proximaCobranca }))}
                    />
                  </ScrollView>

                  <View style={s.printModalButtons}>
                    <TouchableOpacity
                      style={[s.printButton, s.printButtonCancel]}
                      onPress={closePrintModal}
                    >
                      <Text style={s.printButtonTextCancel}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.printButton, s.printButtonConfirm, { marginRight: 8 }]}
                      onPress={() => handleImprimir("simples")}
                      disabled={isSaving}
                    >
                      <Icon name="print" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={s.printButtonTextConfirm}>Simples</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.printButton, s.printButtonConfirm]}
                      onPress={() => handleImprimir("detalhado")}
                      disabled={isSaving}
                    >
                      <Icon name="print" size={20} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={s.printButtonTextConfirm}>Detalhado</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

// ✅ Componente para opção de impressão
const PrintOption = React.memo(({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) => (
  <Pressable
    onPress={onToggle}
    style={({ pressed }) => [
      s.printOptionItem,
      pressed && { backgroundColor: '#F8FAFC' }
    ]}
  >
    <View style={s.printOptionContent}>
      <Text style={s.printOptionLabel}>{label}</Text>
      <View style={[s.checkbox, value && s.checkboxChecked]}>
        {value && <Icon name="checkmark" size={16} color="#FFF" />}
      </View>
    </View>
  </Pressable>
));

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
    paddingTop: 25,
    paddingBottom: 25,
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
  clientPhone: { fontSize: 14, color: "#BFDBFE", marginBottom: 4 },
  clientId: { fontSize: 12, color: "#94A3B8", fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
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

  // Modal de Impressão
  printModalContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    marginTop: 8,
  },
  printOptionsList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  printOptionItem: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  printOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  printOptionLabel: {
    fontSize: 16,
    color: "#334155",
    fontWeight: '500',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFF",
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: "#0056b3",
    borderColor: "#0056b3",
  },
  printModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  printButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  printButtonCancel: {
    backgroundColor: "#F1F5F9",
  },
  printButtonConfirm: {
    backgroundColor: "#0056b3",
  },
  printButtonTextCancel: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  printButtonTextConfirm: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});