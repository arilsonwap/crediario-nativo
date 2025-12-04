import React, { useState, useLayoutEffect, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  BackHandler,
  Modal,
  ActivityIndicator,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { formatDateIso } from "../database/db";
import { parseInteger, maskInteger, maskPhone } from "../utils/formatCurrency";
import { saveClient } from "../services/syncService";
import { useAuth } from "../contexts/AuthContext";
import InputItem from "../components/InputItem";
import CardSection from "../components/CardSection";
import { generateRandomClient } from "../utils/generateRandomClient";
import { formatErrorForDisplay } from "../utils/errorHandler";

// Formata apenas para exibir na UI
function formatDateBR(date: Date | null) {
  if (!date) return "";
  return date.toLocaleDateString("pt-BR");
}

// Normaliza strings vazias para null (evita armazenar strings vazias no Firestore/SQLite)
const normalize = (v: string): string | null => {
  return v.trim() === "" ? null : v.trim();
};

type FormData = {
  name: string;
  value: string;
  bairro: string;
  numero: string;
  referencia: string;
  telefone: string;
  nextChargeDate: Date | null;
};

export default function AddClientScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Estado unificado do formulário
  const [formData, setFormData] = useState<FormData>({
    name: "",
    value: "",
    bairro: "",
    numero: "",
    referencia: "",
    telefone: "",
    nextChargeDate: null,
  });

  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    name: false,
    value: false,
    bairro: false,
    numero: false,
    referencia: false,
    telefone: false,
    nextChargeDate: false,
  });
  const initialFormDataRef = useRef<FormData>(formData);

  // Refs para navegação automática entre campos
  const nameInputRef = useRef<TextInput>(null);
  const telefoneInputRef = useRef<TextInput>(null);
  const valueInputRef = useRef<TextInput>(null);
  const bairroInputRef = useRef<TextInput>(null);
  const numeroInputRef = useRef<TextInput>(null);
  const referenciaInputRef = useRef<TextInput>(null);

  // Função para atualizar qualquer campo do formulário
  const updateFormData = useCallback((key: keyof FormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      // Detecta alterações comparando campos individualmente (evita problema com Date no JSON.stringify)
      const hasChanges = 
        updated.name !== initialFormDataRef.current.name ||
        updated.value !== initialFormDataRef.current.value ||
        updated.bairro !== initialFormDataRef.current.bairro ||
        updated.numero !== initialFormDataRef.current.numero ||
        updated.referencia !== initialFormDataRef.current.referencia ||
        updated.telefone !== initialFormDataRef.current.telefone ||
        (updated.nextChargeDate?.getTime() !== initialFormDataRef.current.nextChargeDate?.getTime());
      setHasUnsavedChanges(hasChanges);
      return updated;
    });
  }, []);

  // 🎨 Configuração do Header com bloqueio de navegação
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: "Novo Cliente",
      headerStyle: { backgroundColor: "#0056b3", elevation: 0, shadowOpacity: 0 },
      headerTintColor: "#fff",
      headerTitleStyle: { fontWeight: "700" },
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            if (hasUnsavedChanges) {
              Alert.alert(
                "Alterações não salvas",
                "Você tem alterações não salvas. Deseja realmente sair?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sair",
                    style: "destructive",
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
          style={{ marginLeft: 10 }}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, hasUnsavedChanges]);

  // Bloquear botão físico de voltar no Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (hasUnsavedChanges) {
        Alert.alert(
          "Alterações não salvas",
          "Você tem alterações não salvas. Deseja realmente sair?",
          [
            { text: "Cancelar", style: "cancel" },
            {
              text: "Sair",
              style: "destructive",
              onPress: () => navigation.goBack(),
            },
          ]
        );
        return true; // Previne o comportamento padrão
      }
      return false; // Permite o comportamento padrão
    });

    return () => backHandler.remove();
  }, [hasUnsavedChanges, navigation]);

  // ✅ Validações em tempo real usando useMemo
  const validationErrors = useMemo(() => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    // Nome obrigatório (mínimo 3 caracteres, sem múltiplos espaços)
    if (!formData.name.trim()) {
      errors.name = "Nome é obrigatório";
    } else if (formData.name.trim().length < 3) {
      errors.name = "Nome deve ter pelo menos 3 caracteres";
    } else if (/\s{2,}/.test(formData.name)) {
      errors.name = "Nome não pode ter espaços múltiplos";
    }

    // Valor inteiro obrigatório (> 0)
    if (!formData.value.trim()) {
      errors.value = "Valor é obrigatório";
    } else {
      const numericValue = parseInteger(formData.value);
      if (isNaN(numericValue) || numericValue <= 0) {
        errors.value = "Valor deve ser um número inteiro maior que zero";
      }
    }

    // Telefone válido (>= 10 dígitos) - opcional mas se preenchido deve ser válido
    if (formData.telefone.trim()) {
      const phoneDigits = formData.telefone.replace(/\D/g, "");
      if (phoneDigits.length < 10) {
        errors.telefone = "Telefone deve ter pelo menos 10 dígitos (com DDD)";
      }
    }

    // Bairro, número e referência são opcionais - sem validação

    // Data obrigatória caso preenchida - não precisa validar, é opcional

    return errors;
  }, [formData]);

  // Verifica se o formulário é válido
  const isFormValid = useMemo(() => {
    return Object.keys(validationErrors).length === 0;
  }, [validationErrors]);

  // Função para marcar campo como tocado
  const markFieldTouched = useCallback((field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  // Funções de navegação entre campos
  const focusNextField = useCallback((field: "telefone" | "value" | "bairro" | "numero" | "referencia") => {
    const refs = {
      telefone: telefoneInputRef,
      value: valueInputRef,
      bairro: bairroInputRef,
      numero: numeroInputRef,
      referencia: referenciaInputRef,
    };
    refs[field].current?.focus();
  }, []);

  const handleSave = useCallback(async () => {
    // ✅ Previne salvamento duplicado
    if (saving) return;

    // Marca todos os campos como tocados para mostrar erros
    setTouched({
      name: true,
      value: true,
      bairro: true,
      numero: true,
      referencia: true,
      telefone: true,
      nextChargeDate: true,
    });

    // Valida se o formulário é válido
    if (!isFormValid) {
      Alert.alert("Atenção", "Por favor, corrija os erros no formulário antes de salvar.");
      return;
    }

    if (!user?.uid) {
      Alert.alert(
        "⚠️ Autenticação Necessária",
        "Você precisa estar autenticado para adicionar clientes. Por favor, faça login novamente.",
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    // ✅ Validação robusta de valor
    const numericValue = parseInteger(formData.value);

    setSaving(true);

    try {
      // ✅ Usa saveClient que salva no SQLite imediatamente (não bloqueia)
      // A sincronização com Firestore acontece em background automaticamente
      await saveClient(user.uid, {
        name: formData.name.trim(),
        value: numericValue,
        bairro: normalize(formData.bairro),
        numero: normalize(formData.numero),
        referencia: normalize(formData.referencia),
        telefone: normalize(formData.telefone),
        next_charge: formData.nextChargeDate ? formatDateIso(formData.nextChargeDate) : null,
      });

      // ✅ Sucesso imediato - cliente salvo localmente
      // Sincronização com nuvem acontece em background
      setHasUnsavedChanges(false);
      Alert.alert("✅ Sucesso", "Cliente adicionado com sucesso!");
      navigation.goBack();
    } catch (error) {
      // ✅ Log detalhado para debug (apenas no console)
      console.error("❌ Erro ao adicionar cliente:", {
        error,
        errorCode: (error as any)?.code,
        errorMessage: (error as any)?.message,
        formData: {
          name: formData.name,
          value: formData.value,
          telefone: formData.telefone,
        },
      });
      
      // ✅ Mensagem de erro específica e amigável para o usuário
      const errorMessage = formatErrorForDisplay(error, "Não foi possível adicionar o cliente.");
      
      Alert.alert(
        "❌ Erro ao Salvar",
        errorMessage,
        [
          {
            text: "OK",
            style: "default",
          },
        ],
        { cancelable: true }
      );
    } finally {
      setSaving(false);
    }
  }, [formData, user?.uid, saving, navigation, isFormValid]);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    // Android: fecha automaticamente ao selecionar
    if (Platform.OS !== "ios") {
      setShowPicker(false);
    }

    // iOS: apenas atualiza a data, não fecha (fecha só pelo botão OK)
    if (selectedDate && Platform.OS === "ios") {
      updateFormData("nextChargeDate", selectedDate);
    } else if (selectedDate) {
      updateFormData("nextChargeDate", selectedDate);
    }
  };

  const handleDatePickerCancel = useCallback(() => {
    setShowPicker(false);
  }, []);

  const handleDatePickerConfirm = useCallback(() => {
    setShowPicker(false);
    markFieldTouched("nextChargeDate");
  }, [markFieldTouched]);

  const handleGenerateRandomClient = useCallback(() => {
    const randomClient = generateRandomClient();
    
    setFormData({
      name: randomClient.name,
      value: randomClient.value,
      bairro: randomClient.bairro,
      numero: randomClient.numero,
      referencia: randomClient.referencia,
      telefone: randomClient.telefone,
      nextChargeDate: randomClient.nextChargeDate,
    });
    setHasUnsavedChanges(true);
  }, []);

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: "#F1F5F9" }} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0056b3" />
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Seção 1: Dados Pessoais */}
        <CardSection title="DADOS PESSOAIS">
          <InputItem 
            ref={nameInputRef}
            icon="person-outline" 
            placeholder="Nome do cliente *" 
            value={formData.name} 
            onChangeText={(t) => {
              updateFormData("name", t.replace(/\s{2,}/g, " ").trimStart());
              markFieldTouched("name");
            }}
            onBlur={() => markFieldTouched("name")}
            onSubmitEditing={() => focusNextField("telefone")}
            autoCapitalize="words"
            returnKeyType="next"
            maxLength={100}
            error={touched.name ? validationErrors.name : undefined}
          />
          <View style={styles.divider} />
          <InputItem 
            ref={telefoneInputRef}
            icon="call-outline" 
            placeholder="Telefone / WhatsApp" 
            value={formData.telefone} 
            onChangeText={(t) => {
              updateFormData("telefone", maskPhone(t));
              markFieldTouched("telefone");
            }}
            onBlur={() => markFieldTouched("telefone")}
            onSubmitEditing={() => focusNextField("value")}
            keyboardType="phone-pad"
            returnKeyType="next"
            maxLength={15}
            error={touched.telefone ? validationErrors.telefone : undefined}
          />
        </CardSection>

        {/* Seção 2: Financeiro */}
        <CardSection title="FINANCEIRO">
          <InputItem 
            ref={valueInputRef}
            icon="cash-outline" 
            placeholder="Valor Total (Inteiro) *" 
            value={formData.value} 
            onChangeText={(txt) => {
              updateFormData("value", maskInteger(txt));
              markFieldTouched("value");
            }}
            onBlur={() => markFieldTouched("value")}
            onSubmitEditing={() => focusNextField("bairro")}
            keyboardType="number-pad"
            returnKeyType="next"
            maxLength={15}
            error={touched.value ? validationErrors.value : undefined}
          />
          <View style={styles.divider} />
          
          {/* Date Picker Customizado */}
          <TouchableOpacity 
            onPress={() => setShowPicker(true)} 
            style={styles.dateTouchable}
            activeOpacity={0.7}
          >
            <View style={styles.rowCenter}>
              <Icon name="calendar-outline" size={20} color="#0056b3" />
              <Text style={[styles.dateText, !formData.nextChargeDate && styles.placeholderText]}>
                {formData.nextChargeDate ? formatDateBR(formData.nextChargeDate) : "Data da próxima cobrança"}
              </Text>
            </View>
            <Icon name="chevron-down" size={16} color="#CBD5E1" />
          </TouchableOpacity>
        </CardSection>

        {/* Seção 3: Endereço */}
        <CardSection title="ENDEREÇO">
          <View style={styles.rowInput}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <InputItem 
                ref={bairroInputRef}
                icon="map-outline" 
                placeholder="Bairro" 
                value={formData.bairro} 
                onChangeText={(t) => updateFormData("bairro", t.trimStart())}
                onSubmitEditing={() => focusNextField("numero")}
                autoCapitalize="words"
                returnKeyType="next"
                maxLength={50}
              />
            </View>
            <View style={{ width: 100 }}>
              <InputItem 
                ref={numeroInputRef}
                icon="home-outline" 
                placeholder="Nº" 
                value={formData.numero} 
                onChangeText={(t) => updateFormData("numero", t.replace(/\D/g, "").slice(0, 6))} 
                onSubmitEditing={() => focusNextField("referencia")}
                keyboardType="number-pad"
                returnKeyType="next"
                maxLength={6}
              />
            </View>
          </View>
          <View style={styles.divider} />
          <InputItem 
            ref={referenciaInputRef}
            icon="location-outline" 
            placeholder="Ponto de Referência" 
            value={formData.referencia} 
            onChangeText={(t) => updateFormData("referencia", t.trimStart())}
            autoCapitalize="words"
            returnKeyType="done"
            maxLength={100}
          />
        </CardSection>

        {/* Botões */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.saveButton, 
              (saving || !isFormValid) && styles.saveButtonDisabled
            ]} 
            activeOpacity={0.7} 
            onPress={handleSave}
            disabled={saving || !isFormValid}
          >
            <Text style={styles.saveText}>
              {saving ? "Salvando..." : "Salvar Cliente"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.generateButton} 
            activeOpacity={0.7} 
            onPress={handleGenerateRandomClient}
          >
            <Icon name="dice-outline" size={18} color="#EA580C" style={{ marginRight: 6 }} />
            <Text style={styles.generateText}>Preencher com dados aleatórios</Text>
          </TouchableOpacity>
        </View>

        {/* Componente de Data - Android (fecha automaticamente) */}
        {showPicker && Platform.OS === "android" && (
          <DateTimePicker
            value={formData.nextChargeDate ?? new Date()}
            mode="date"
            display="default"
            onChange={onChangeDate}
            minimumDate={new Date()}
          />
        )}

        {/* Componente de Data - iOS (Modal customizado com spinner) */}
        <Modal
          visible={showPicker && Platform.OS === "ios"}
          transparent={true}
          animationType="slide"
          onRequestClose={handleDatePickerCancel}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.iosDatePickerModal}>
              <View style={styles.iosDatePickerHeader}>
                <TouchableOpacity 
                  onPress={handleDatePickerCancel}
                  style={styles.iosDatePickerHeaderButton}
                >
                  <Text style={styles.iosDatePickerCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.iosDatePickerTitle}>Selecionar Data</Text>
                <TouchableOpacity 
                  onPress={handleDatePickerConfirm}
                  style={styles.iosDatePickerHeaderButton}
                >
                  <Text style={styles.iosDatePickerConfirmText}>OK</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={formData.nextChargeDate ?? new Date()}
                mode="date"
                display="spinner"
                onChange={onChangeDate}
                minimumDate={new Date()}
                style={styles.iosDatePickerSpinner}
              />
            </View>
          </View>
        </Modal>

        {/* Overlay de Loading */}
        {saving && (
          <Modal
            visible={saving}
            transparent={true}
            animationType="fade"
          >
            <View style={styles.loadingOverlay}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0056b3" />
                <Text style={styles.loadingText}>Salvando cliente...</Text>
              </View>
            </View>
          </Modal>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 🎨 Estilos
const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  rowInput: {
    flexDirection: 'row',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  // Date Picker Style
  dateTouchable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  dateText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#0056b3",
    fontWeight: "500",
  },
  placeholderText: {
    color: "#94A3B8",
    fontWeight: "400",
  },

  // Buttons
  footer: {
    marginTop: 10,
  },
  saveButton: {
    backgroundColor: "#0056b3",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#0056b3",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.6,
  },
  saveText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  generateButton: {
    flexDirection: 'row',
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#FDBA74", // Laranja claro
    borderRadius: 12,
    backgroundColor: "#FFF7ED",
  },
  generateText: {
    color: "#EA580C", // Laranja escuro
    fontSize: 14,
    fontWeight: "600",
  },

  // iOS Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  iosDatePickerModal: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  iosDatePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  iosDatePickerHeaderButton: {
    minWidth: 80,
  },
  iosDatePickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
  },
  iosDatePickerCancelText: {
    color: "#64748B",
    fontSize: 16,
    fontWeight: "600",
  },
  iosDatePickerConfirmText: {
    color: "#0056b3",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
  },
  iosDatePickerSpinner: {
    height: 200,
  },

  // Loading Overlay
  loadingOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#1E293B",
    fontWeight: "600",
  },
});